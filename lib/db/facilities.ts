// lib/db/facilities.ts
// Typed Supabase queries for the facilities table.
// Used by Server Components and Server Actions to read facility data.

import { createClient } from '@/lib/supabase/server';

export type FacilityCategory = 'OPD' | 'ICU' | 'Diagnostics' | 'Surgery' | 'Other';

export interface Facility {
  id: string;
  name: string;
  description: string;
  category: FacilityCategory;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches all facilities ordered by creation time (ascending).
 * Throws on Supabase error.
 */
export async function getFacilities(): Promise<Facility[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('facilities')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as Facility[];
}
