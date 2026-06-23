// lib/db/departments.ts
// Typed Supabase queries for the departments table.
// Used by Server Components and Server Actions to read department data.

import { createClient } from '@/lib/supabase/server';

export interface Department {
  id: string;
  name: string;
  name_hi: string | null;
  description: string;
  description_hi: string | null;
  image_url: string | null;
  is_featured: boolean;
  featured_order: number;
  created_at: string;
  updated_at: string;
}

// WR-004: explicit column list — excludes any future sensitive columns added to the table.
const DEPARTMENT_COLUMNS =
  'id, name, name_hi, description, description_hi, image_url, is_featured, featured_order, created_at, updated_at';

// WR-001: cap for the fallback path so the entire table is never sent to the homepage.
const FEATURED_DEPARTMENTS_LIMIT = 8;

/**
 * Fetches all departments ordered by creation time (ascending).
 * Throws on Supabase error.
 */
export async function getDepartments(): Promise<Department[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('departments')
    .select(DEPARTMENT_COLUMNS)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as Department[];
}

/**
 * Returns featured departments for the homepage.
 * Step 1: fetch featured-only rows (is_featured = true).
 * Step 2: if none exist, fall back to top N by featured_order (WR-001: row cap).
 */
export async function getFeaturedDepartments(): Promise<Department[]> {
  const supabase = await createClient();

  const { data: featured, error: featuredErr } = await supabase
    .from('departments')
    .select(DEPARTMENT_COLUMNS)
    .eq('is_featured', true)
    .order('featured_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(FEATURED_DEPARTMENTS_LIMIT);

  if (featuredErr) throw new Error(featuredErr.message);
  if (featured && featured.length > 0) return featured as Department[];

  // WR-001: add limit to fallback so the entire table is never dumped to the homepage.
  const { data: all, error: allErr } = await supabase
    .from('departments')
    .select(DEPARTMENT_COLUMNS)
    .order('created_at', { ascending: true })
    .limit(FEATURED_DEPARTMENTS_LIMIT);

  if (allErr) throw new Error(allErr.message);
  return (all ?? []) as Department[];
}
