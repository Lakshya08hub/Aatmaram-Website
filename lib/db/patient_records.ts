// lib/db/patient_records.ts
// Typed DB queries for the patient_records table.
// Uses adminClient for all queries (bypasses RLS — portal reads are role-gated in actions).

import { createAdminClient } from '@/lib/supabase/admin';
import { StaffRole } from '@/lib/portal/roles';

export interface PatientRecord {
  id: string;
  patient_name: string;
  age: number;
  phone: string;
  reason: string;
  assigned_doctor_id: string | null;
  visit_date: string;
  clinical_notes: string | null;
  created_at: string;
  updated_at: string;
  /** Populated when joining doctors table via assigned_doctor_id FK. */
  assigned_doctor_name: string | null;
}

/**
 * Returns patient records filtered by role.
 * - super_admin, admin, receptionist: all records, newest visit first.
 * - doctor: only records assigned to this doctor (resolved via staff_user_id).
 *
 * @param role      The authenticated user's portal role.
 * @param authUserId  The Supabase auth user.id (profiles.id === auth UID per Supabase convention).
 */
export async function getPatientRecords(
  role: StaffRole,
  authUserId: string
): Promise<PatientRecord[]> {
  const adminClient = createAdminClient();

  if (role === 'doctor') {
    // doctors.staff_user_id references profiles(id) — resolve auth UID → profiles.id first
    const { data: profileRow } = await adminClient
      .from('profiles')
      .select('id')
      .eq('user_id', authUserId)
      .single();

    if (!profileRow) return [];

    const { data: doctorRow } = await adminClient
      .from('doctors')
      .select('id')
      .eq('staff_user_id', profileRow.id)
      .single();

    if (!doctorRow) {
      // No linked doctors row — this doctor has no records to view
      return [];
    }

    const doctorId = doctorRow.id as string;

    const { data, error } = await adminClient
      .from('patient_records')
      .select('*, doctors(full_name)')
      .eq('assigned_doctor_id', doctorId)
      .order('visit_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return mapRecords(data ?? []);
  }

  // All other roles: return all records
  const { data, error } = await adminClient
    .from('patient_records')
    .select('*, doctors(full_name)')
    .order('visit_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return mapRecords(data ?? []);
}

/**
 * Returns id + full_name for all active doctors, ordered alphabetically.
 * Used to populate the assigned doctor dropdown in the patient form.
 */
export async function getActiveDoctorsForDropdown(): Promise<
  { id: string; full_name: string }[]
> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('doctors')
    .select('id, full_name')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as { id: string; full_name: string }[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type RawRecord = Record<string, unknown> & {
  doctors?: { full_name?: string } | null;
};

function mapRecords(rows: RawRecord[]): PatientRecord[] {
  return rows.map((r) => ({
    id: r.id as string,
    patient_name: r.patient_name as string,
    age: r.age as number,
    phone: r.phone as string,
    reason: r.reason as string,
    assigned_doctor_id: (r.assigned_doctor_id as string | null) ?? null,
    visit_date: r.visit_date as string,
    clinical_notes: (r.clinical_notes as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
    assigned_doctor_name: r.doctors?.full_name ?? null,
  }));
}
