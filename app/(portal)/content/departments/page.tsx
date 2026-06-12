// app/(portal)/content/departments/page.tsx
// Server Component — fetches departments from Supabase and passes to DepartmentsClient.
// Auth + role guard is enforced by the parent portal layout.

import { getDepartments, Department } from '@/lib/db/departments';
import DepartmentsClient from './DepartmentsClient';

export default async function DepartmentsPage() {
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
