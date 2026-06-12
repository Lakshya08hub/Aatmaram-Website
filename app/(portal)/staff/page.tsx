// app/(portal)/staff/page.tsx
// Server Component — fetches staff list and doctors in parallel, passes to StaffClient.
// Auth + role guard enforced by the parent StaffLayout.

import { getStaffList, StaffMember } from '@/lib/db/staff';
import { getDoctors, Doctor } from '@/lib/db/doctors';
import StaffClient from './StaffClient';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  let staff: StaffMember[] = [];
  let doctors: Doctor[] = [];
  let fetchError = false;

  try {
    [staff, doctors] = await Promise.all([getStaffList(), getDoctors()]);
  } catch {
    fetchError = true;
  }

  return (
    <StaffClient initialStaff={staff} doctors={doctors} fetchError={fetchError} />
  );
}
