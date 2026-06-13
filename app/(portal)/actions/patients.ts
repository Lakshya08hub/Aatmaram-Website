'use server';
// app/(portal)/actions/patients.ts
// Server Actions for Patient Records (Phase 8).
// Role gates:
//   requirePatientWriteRole() — super_admin, admin, receptionist only (doctors cannot create/update records)
//   requireDoctorRole()       — doctor only (can update clinical_notes on assigned records)

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { StaffRole } from '@/lib/portal/roles';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const receptionistPatientSchema = z.object({
  patient_name: z.string().min(2),
  age: z.coerce.number().int().min(0).max(150),
  phone: z.string().min(7),
  reason: z.string().min(3),
  assigned_doctor_id: z.string().uuid().nullable().optional(),
  visit_date: z.string(),
  clinical_notes: z.string().optional(),
});

const doctorNotesSchema = z.object({
  clinical_notes: z.string(),
});

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

const PATIENT_WRITE_ROLES: StaffRole[] = ['super_admin', 'admin', 'receptionist'];

/**
 * Verifies the caller has a write role (not doctor).
 * Redirects to /login if unauthenticated; throws Error('Forbidden') if role is 'doctor'.
 */
async function requirePatientWriteRole() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (error || !profile || !PATIENT_WRITE_ROLES.includes(profile.role as StaffRole)) {
    throw new Error('Forbidden');
  }

  return { user, role: profile.role as StaffRole, supabase };
}

/**
 * Verifies the caller is a doctor.
 * Redirects to /login if unauthenticated; throws Error('Forbidden') if role is not 'doctor'.
 */
async function requireDoctorRole() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (error || !profile || (profile.role as StaffRole) !== 'doctor') {
    throw new Error('Forbidden');
  }

  return { user, role: profile.role as StaffRole };
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
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Updates ONLY the clinical_notes field on a patient record.
 * Available to: doctor only.
 * Security: verifies the record's assigned_doctor_id matches the calling doctor's doctors.id
 * before writing — prevents doctors from updating records assigned to other doctors.
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

    // Ownership check: the record must be assigned to this doctor
    const { data: record } = await adminClient
      .from('patient_records')
      .select('assigned_doctor_id')
      .eq('id', id)
      .single();

    if (!record || record.assigned_doctor_id !== doctorId) {
      return { error: 'Forbidden' };
    }

    // Validate clinical notes input
    const validation = doctorNotesSchema.safeParse(Object.fromEntries(formData));

    if (!validation.success) {
      return { error: validation.error.issues[0].message };
    }

    const { error } = await adminClient
      .from('patient_records')
      .update({ clinical_notes: validation.data.clinical_notes })
      .eq('id', id);

    if (error) return { error: error.message };

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
