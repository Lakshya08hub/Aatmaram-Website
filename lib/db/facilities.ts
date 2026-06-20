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
  image_url: string | null;
  is_featured: boolean;
  featured_order: number;
  created_at: string;
  updated_at: string;
}

// WR-005: single explicit column list used for both portal admin and public homepage.
// All columns are non-sensitive for the facilities table (no staff_user_id etc).
const FACILITY_COLUMNS =
  'id, name, description, category, image_url, is_featured, featured_order, created_at, updated_at';

// CR-002/WR-004: max facilities returned by any single query so the entire table
// is never dumped to the public homepage.
const FEATURED_FACILITIES_LIMIT = 8;

/**
 * Fetches all facilities ordered by creation time (ascending).
 * Used by the portal admin CRUD page.
 * Throws on Supabase error.
 */
export async function getFacilities(): Promise<Facility[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('facilities')
    .select(FACILITY_COLUMNS)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as Facility[];
}

/**
 * Returns featured facilities for the homepage.
 * CR-002: uses two-query pattern (matching getFeaturedDepartments) so unfeatured
 * content is never silently shown when fewer than LIMIT rows have is_featured = true.
 * Step 1: fetch featured-only rows.
 * Step 2: if none exist, fall back to top N by featured_order (WR-004: row cap).
 */
export async function getFeaturedFacilities(): Promise<Facility[]> {
  const supabase = await createClient();

  // Step 1: try featured-only query
  const { data: featured, error: featuredErr } = await supabase
    .from('facilities')
    .select(FACILITY_COLUMNS)
    .eq('is_featured', true)
    .order('featured_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(FEATURED_FACILITIES_LIMIT);

  if (featuredErr) throw new Error(featuredErr.message);
  if (featured && featured.length > 0) return featured as Facility[];

  // Step 2: fallback — top N by featured_order (WR-001: cap prevents full table dump)
  const { data: fallback, error: fallbackErr } = await supabase
    .from('facilities')
    .select(FACILITY_COLUMNS)
    .order('featured_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(FEATURED_FACILITIES_LIMIT);

  if (fallbackErr) throw new Error(fallbackErr.message);
  return (fallback ?? []) as Facility[];
}
