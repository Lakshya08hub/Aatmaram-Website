// app/(portal)/content/departments/page.tsx
// Server Component — fetches departments from Supabase and passes to DepartmentsClient.
// Auth + section-level role guard enforced here (CR-005).

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StaffRole, canAccessSection } from '@/lib/portal/roles';
import { getDepartments, Department } from '@/lib/db/departments';
import DepartmentsClient from './DepartmentsClient';

export default async function DepartmentsPage() {
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

  let departments: Department[] = [];
  let fetchError = false;

  try {
    departments = await getDepartments();
  } catch {
    fetchError = true;
  }

  return (
    <DepartmentsClient initialData={departments} fetchError={fetchError} />
  );
}
