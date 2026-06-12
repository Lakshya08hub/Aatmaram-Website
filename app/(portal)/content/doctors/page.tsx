// app/(portal)/content/doctors/page.tsx
// Server Component — fetches doctors from Supabase and passes to DoctorsClient.
// Auth + role guard is enforced by the parent portal layout.

import { getDoctors, Doctor } from '@/lib/db/doctors';
import DoctorsClient from './DoctorsClient';

export default async function DoctorsPage() {
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
