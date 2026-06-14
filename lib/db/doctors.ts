// lib/db/doctors.ts
// Typed DB queries for the doctors table.
// Used by portal Server Components (read) and public-site pages.

import { createClient } from '@/lib/supabase/server';

export interface Doctor {
  id: string;
  full_name: string;
  specialization: string;
  qualification: string;
  photo_url: string | null;
  bio: string | null;
  availability_days: string[] | null;
  is_active: boolean;
  is_featured: boolean;
  featured_order: number;
  staff_user_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Returns all doctors ordered by creation date (ascending).
 * Throws on Supabase error.
 */
export async function getDoctors(): Promise<Doctor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data as Doctor[];
}

/**
 * Returns featured active doctors for the homepage.
 * Fetches all active doctors ordered by is_featured DESC, featured_order ASC, created_at ASC.
 * If any row has is_featured = true, only those rows are returned (homepage curation).
 * Otherwise returns all active doctors (fallback so the homepage section is never empty).
 */
export async function getFeaturedDoctors(): Promise<Doctor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('featured_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const rows = data as Doctor[];
  const hasFeatured = rows.some((row) => row.is_featured);
  return hasFeatured ? rows.filter((row) => row.is_featured) : rows;
}

/**
 * Returns only active doctors (is_active = true), ordered by creation date.
 * Used by the public site /[locale]/doctors page.
 * Throws on Supabase error.
 */
export async function getActiveDoctors(): Promise<Doctor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data as Doctor[];
}
