// lib/db/departments.ts
// Typed Supabase queries for the departments table.
// Used by Server Components and Server Actions to read department data.

import { createClient } from '@/lib/supabase/server';

export interface Department {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  featured_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches all departments ordered by creation time (ascending).
 * Throws on Supabase error.
 */
export async function getDepartments(): Promise<Department[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as Department[];
}

/**
 * Returns featured departments for the homepage.
 * Single query ordered by is_featured DESC, featured_order ASC, created_at ASC.
 * If any row has is_featured = true, only those rows are returned (homepage curation).
 * Otherwise returns all departments (fallback so the homepage section is never empty).
 */
export async function getFeaturedDepartments(): Promise<Department[]> {
  const supabase = await createClient();

  const { data: featured, error: featuredErr } = await supabase
    .from('departments')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('featured_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (featuredErr) throw new Error(featuredErr.message);
  if (featured && featured.length > 0) return featured as Department[];

  const { data: all, error: allErr } = await supabase
    .from('departments')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (allErr) throw new Error(allErr.message);
  return (all ?? []) as Department[];
}
