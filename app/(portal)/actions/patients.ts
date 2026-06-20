'use server';
// app/(portal)/actions/patients.ts
// Server Actions for Patient Records (Phase 8).
// Role gates:
//   requirePatientWriteRole() — super_admin, admin, receptionist only (doctors cannot create/update records)
//   requireDoctorRole()       — doctor only (can update clinical_notes on assigned records)

import { z } from 'zod';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/portal/auth';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const receptionistPatientSchema = z.object({
  patient_name: z.string().min(2),
  age: z.coerce.number().int().min(0).max(150),
  phone: z.string().min(7).regex(/^[+\d\s\-()]{7,20}$/, 'Invalid phone number'),
  reason: z.string().min(3),
  assigned_doctor_id: z.string().uuid().nullable().optional(),
  visit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').refine(
    (v) => !isNaN(Date.parse(v)),
    'Invalid date'
  ),
  clinical_notes: z.string().optional(),
});

const doctorNotesSchema = z.object({
  clinical_notes: z.string(),
});

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/**
 * Verifies the caller has a write role (not doctor).
 * Redirects to /login if unauthenticated; throws Error('Forbidden') if role is 'doctor'.
 */
async function requirePatientWriteRole() {
  return requireRole(['super_admin', 'admin', 'receptionist']);
}

/**
 * Verifies the caller is a doctor.
 * Redirects to /login if unauthenticated; throws Error('Forbidden') if role is not 'doctor'.
 */
async function requireDoctorRole() {
  return requireRole(['doctor']);
}

// ---------------------------------------------------------------------------
// Patient record actions
// ---------------------------------------------------------------------------

/**
 * Creates a new patient record row.
 * Available to: super_admin, admin, receptionist.
 * clinical_notes is NOT inserted here — doctors set it via updateClinicalNotesAction.
 */
export async function createPatientAction(
  prevState: unknown,
  formData: FormData
): Promise<{ error?: string }> {
  try {
    await requirePatientWriteRole();

    const validation = receptionistPatientSchema.safeParse(
      Object.fromEntries(formData)
    );

    if (!validation.success) {
      return { error: validation.error.issues[0].message };
    }

    const adminClient = createAdminClient();

    const { error } = await adminClient.from('patient_records').insert({
      patient_name: validation.data.patient_name,
      age: validation.data.age,
      phone: validation.data.phone,
      reason: validation.data.reason,
      assigned_doctor_id: validation.data.assigned_doctor_id ?? null,
      visit_date: validation.data.visit_date,
    });

    if (error) return { error: error.message };

    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Updates patient record fields (excluding clinical_notes).
 * Available to: super_admin, admin, receptionist.
 */
export async function updatePatientAction(
  id: string,
  prevState: unknown,
  formData: FormData
): Promise<{ error?: string }> {
  try {
    const { role } = await requirePatientWriteRole();

    const validation = receptionistPatientSchema.safeParse(
      Object.fromEntries(formData)
    );

    if (!validation.success) {
      return { error: validation.error.issues[0].message };
    }

    const adminClient = createAdminClient();

    const isAdmin = role === 'super_admin' || role === 'admin';

    const { error } = await adminClient
      .from('patient_records')
      .update({
        patient_name: validation.data.patient_name,
        age: validation.data.age,
        phone: validation.data.phone,
        reason: validation.data.reason,
        assigned_doctor_id: validation.data.assigned_doctor_id ?? null,
        visit_date: validation.data.visit_date,
        ...(isAdmin && { clinical_notes: validation.data.clinical_notes ?? null }),
      })
      .eq('id', id);

    if (error) return { error: error.message };

    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Updates ONLY the clinical_notes field on a patient record.
 * Available to: doctor only.
 * Security: combines ownership check and write into a single conditional update
 * to prevent TOCTOU race between SELECT and UPDATE (WR-03).
 */
export async function updateClinicalNotesAction(
  id: string,
  prevState: unknown,
  formData: FormData
): Promise<{ error?: string }> {
  try {
    const { user } = await requireDoctorRole();

    const adminClient = createAdminClient();

    // doctors.staff_user_id references profiles(id) — resolve auth UID → profiles.id first
    const { data: profileRow } = await adminClient
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profileRow) return { error: 'Forbidden' };

    const { data: doctorRow } = await adminClient
      .from('doctors')
      .select('id')
      .eq('staff_user_id', profileRow.id)
      .single();

    if (!doctorRow) {
      return { error: 'Forbidden' };
    }

    const doctorId = doctorRow.id as string;

    // Validate clinical notes input
    const validation = doctorNotesSchema.safeParse(Object.fromEntries(formData));

    if (!validation.success) {
      return { error: validation.error.issues[0].message };
    }

    // Atomic ownership check + write: single query prevents TOCTOU race (WR-03).
    // If the record was reassigned to another doctor between auth and this write,
    // the .eq('assigned_doctor_id', doctorId) filter returns no rows and data is null.
    const { data, error } = await adminClient
      .from('patient_records')
      .update({ clinical_notes: validation.data.clinical_notes })
      .eq('id', id)
      .eq('assigned_doctor_id', doctorId)
      .select('id')
      .single();

    if (error || !data) return { error: 'Forbidden' };

    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Field length limits for inline edits (CR-006)
const FIELD_MAX: Record<string, number> = {
  patient_name: 120,
  phone: 20,
};

/**
 * Inline-edit action: update a single patient field directly from a table cell.
 * Available to: super_admin, admin, receptionist.
 * Security: requirePatientWriteRole() enforced; only whitelisted fields accepted.
 * clinical_notes is excluded from this action — use updateClinicalNotesAction instead,
 * which enforces doctor ownership. This prevents future role-widening from silently
 * collapsing the clinical-notes ownership model (CR-03).
 */
export async function updatePatientInlineAction(
  id: string,
  field: 'patient_name' | 'phone',
  value: string
): Promise<{ error?: string }> {
  try {
    await requirePatientWriteRole();

    // Validate field lengths before writing to DB
    if (FIELD_MAX[field] && value.length > FIELD_MAX[field]) {
      return { error: `${field} is too long` };
    }

    const adminClient = createAdminClient();

    // Validate non-empty for required fields (T-16-09)
    if ((field === 'patient_name' || field === 'phone') && value.trim() === '') {
      return { error: 'Field cannot be empty' };
    }

    const { error } = await adminClient
      .from('patient_records')
      .update({ [field]: value })
      .eq('id', id);

    if (error) return { error: error.message };

    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
