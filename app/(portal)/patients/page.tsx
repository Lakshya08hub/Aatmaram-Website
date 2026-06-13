import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getPatientRecords, getActiveDoctorsForDropdown, PatientRecord } from '@/lib/db/patient_records';
import PatientClient from '@/components/portal/PatientClient';
import { StaffRole } from '@/lib/portal/roles';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Patient Records | Atmaram Portal' };

export default async function PatientsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const role = (profile?.role ?? 'receptionist') as StaffRole;

  let records: PatientRecord[] = [];
  let doctors: { id: string; full_name: string }[] = [];
  let fetchError = false;

  try {
    [records, doctors] = await Promise.all([
      getPatientRecords(role, user.id),
      getActiveDoctorsForDropdown(),
    ]);
  } catch {
    fetchError = true;
  }

  return (
    <PatientClient
      records={records}
      doctors={doctors}
      role={role}
      currentUserId={user.id}
      fetchError={fetchError}
    />
  );
}
