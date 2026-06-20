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

// WR-005: explicit column list for portal admin (all columns needed for CRUD).
const FACILITY_COLUMNS =
  'id, name, description, category, image_url, is_featured, featured_order, created_at, updated_at';

// WR-005: explicit column list for the public homepage (only display fields needed).
const FACILITY_PUBLIC_COLUMNS =
  'id, name, description, category, image_url, is_featured, featured_order, created_at, updated_at';

// WR-004: max facilities returned by the fallback path so the entire table
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
 * Single query ordered by is_featured DESC, featured_order ASC, created_at ASC.
 * If any row has is_featured = true, only those rows are returned (homepage curation).
 * Otherwise returns up to FEATURED_FACILITIES_LIMIT rows (WR-004: fallback cap).
 */
export async function getFeaturedFacilities(): Promise<Facility[]> {
  const supabase = await createClient();

  // WR-004: limit the query so the entire table is never returned to the homepage.
  const { data, error } = await supabase
    .from('facilities')
    .select(FACILITY_PUBLIC_COLUMNS)
    .order('is_featured', { ascending: false })
    .order('featured_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(FEATURED_FACILITIES_LIMIT);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data as Facility[];
  const hasFeatured = rows.some((row) => row.is_featured);
  return hasFeatured ? rows.filter((row) => row.is_featured) : rows;
}
