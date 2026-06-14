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
  is_featured: boolean;
  featured_order: number;
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

/**
 * Returns featured facilities for the homepage.
 * Single query ordered by is_featured DESC, featured_order ASC, created_at ASC.
 * If any row has is_featured = true, only those rows are returned (homepage curation).
 * Otherwise returns all facilities (fallback so the homepage section is never empty).
 */
export async function getFeaturedFacilities(): Promise<Facility[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('facilities')
    .select('*')
    .order('is_featured', { ascending: false })
    .order('featured_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = data as Facility[];
  const hasFeatured = rows.some((row) => row.is_featured);
  return hasFeatured ? rows.filter((row) => row.is_featured) : rows;
}
