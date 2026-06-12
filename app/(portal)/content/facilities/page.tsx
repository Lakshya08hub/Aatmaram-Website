// app/(portal)/content/facilities/page.tsx
// Server Component — fetches facilities from Supabase and passes to FacilitiesClient.
// Auth + role guard is enforced by the parent portal layout.

import { getFacilities, Facility } from '@/lib/db/facilities';
import FacilitiesClient from './FacilitiesClient';

export default async function FacilitiesPage() {
  let facilities: Facility[] = [];
  let fetchError = false;

  try {
    facilities = await getFacilities();
  } catch {
    fetchError = true;
  }

  return (
    <FacilitiesClient initialData={facilities} fetchError={fetchError} />
  );
}
