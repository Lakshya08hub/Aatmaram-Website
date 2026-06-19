// app/(portal)/staff/page.tsx
// Server Component — fetches staff list and doctors in parallel, passes to StaffClient.
// Auth + section-level role guard enforced here (CR-005).

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StaffRole, canAccessSection } from '@/lib/portal/roles';
import { getStaffList, StaffMember } from '@/lib/db/staff';
import { getDoctors, Doctor } from '@/lib/db/doctors';
import StaffClient from './StaffClient';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || !canAccessSection(profile.role as StaffRole, 'staff')) {
    redirect('/dashboard');
  }

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
