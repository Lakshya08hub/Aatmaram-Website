// app/(portal)/content/doctors/page.tsx
// Server Component — fetches doctors from Supabase and passes to DoctorsClient.
// Auth + section-level role guard enforced here (CR-005).

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StaffRole, canAccessSection } from '@/lib/portal/roles';
import { getDoctors, Doctor } from '@/lib/db/doctors';
import DoctorsClient from './DoctorsClient';

export default async function DoctorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || !canAccessSection(profile.role as StaffRole, 'content')) {
    redirect('/dashboard');
  }

  let doctors: Doctor[] = [];
  let fetchError = false;

  try {
    doctors = await getDoctors();
  } catch {
    fetchError = true;
  }

  return (
    <DoctorsClient initialData={doctors} fetchError={fetchError} />
  );
}
