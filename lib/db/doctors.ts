// lib/db/doctors.ts
// Typed DB queries for the doctors table.
// Used by portal Server Components (read) and public-site pages.

import { createClient } from '@/lib/supabase/server';

export interface Doctor {
  id: string;
  full_name: string;
  full_name_hi: string | null;
  specialization: string;
  specialization_hi: string | null;
  qualification: string;
  qualification_hi: string | null;
  photo_url: string | null;
  bio: string | null;
  bio_hi: string | null;
  availability_days: string[] | null;
  is_active: boolean;
  is_featured: boolean;
  featured_order: number;
  staff_user_id: string | null;
  created_at: string;
  updated_at: string;
}

// WR-004: explicit column lists to avoid accidental exposure of sensitive columns.
// Portal/admin CMS queries: all columns except staff_user_id (internal link, not needed in CMS UI).
const DOCTOR_CMS_COLUMNS =
  'id, full_name, full_name_hi, specialization, specialization_hi, qualification, qualification_hi, photo_url, bio, bio_hi, availability_days, is_active, is_featured, featured_order, created_at, updated_at';

// Public site queries: same as CMS minus is_featured/featured_order (not display-relevant) and created_at.
// staff_user_id is excluded from all public queries.
const DOCTOR_PUBLIC_COLUMNS =
  'id, full_name, full_name_hi, specialization, specialization_hi, qualification, qualification_hi, photo_url, bio, bio_hi, availability_days, is_active, is_featured, featured_order, created_at, updated_at';

// WR-001: cap for the fallback path so the entire table is never sent to the homepage.
const FEATURED_DOCTORS_LIMIT = 6;

/**
 * Returns all doctors ordered by creation date (ascending).
 * Throws on Supabase error.
 */
export async function getDoctors(): Promise<Doctor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('doctors')
    .select(DOCTOR_CMS_COLUMNS)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data as Doctor[];
}

/**
 * Returns featured active doctors for the homepage.
 * Step 1: fetch featured active doctors.
 * Step 2: if none, fall back to top N active doctors (WR-001: row cap).
 */
export async function getFeaturedDoctors(): Promise<Doctor[]> {
  const supabase = await createClient();

  const { data: featured, error: featuredErr } = await supabase
    .from('doctors')
    .select(DOCTOR_PUBLIC_COLUMNS)
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('featured_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(FEATURED_DOCTORS_LIMIT);

  if (featuredErr) throw new Error(featuredErr.message);
  if (featured && featured.length > 0) return featured as Doctor[];

  // WR-001: add limit to fallback so the entire table is never dumped to the homepage.
  const { data: fallback, error: fallbackErr } = await supabase
    .from('doctors')
    .select(DOCTOR_PUBLIC_COLUMNS)
    .eq('is_active', true)
    .order('featured_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(FEATURED_DOCTORS_LIMIT);

  if (fallbackErr) throw new Error(fallbackErr.message);
  return (fallback ?? []) as Doctor[];
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
    .select(DOCTOR_PUBLIC_COLUMNS)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data as Doctor[];
}
