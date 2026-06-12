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
