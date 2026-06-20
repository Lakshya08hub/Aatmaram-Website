import { isRedirectError } from 'next/dist/client/components/redirect';
import { getPatientRecords, getActiveDoctorsForDropdown, PatientRecord } from '@/lib/db/patient_records';
import PatientClient from '@/components/portal/PatientClient';
import { requireRole } from '@/lib/portal/auth';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Patient Records | Atmaram Portal' };

export default async function PatientsPage() {
  // requireRole redirects to /login if unauthenticated, throws Forbidden if role not allowed.
  // Replaces manual createClient + getUser + profiles query pattern (WR-01).
  // Missing profiles row now throws Forbidden instead of silently defaulting to receptionist (WR-02).
  let user: Awaited<ReturnType<typeof requireRole>>['user'];
  let role: Awaited<ReturnType<typeof requireRole>>['role'];
  try {
    ({ user, role } = await requireRole(['super_admin', 'admin', 'receptionist', 'doctor']));
  } catch (err) {
    if (isRedirectError(err)) throw err;
    throw err; // Forbidden or unexpected — propagate
  }

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
