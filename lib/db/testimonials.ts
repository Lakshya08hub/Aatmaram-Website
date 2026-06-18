// lib/db/testimonials.ts
// Typed Supabase queries for the testimonials table.
// Used by Server Components and Server Actions to read testimonial data.

import { createClient } from '@/lib/supabase/server';

export interface Testimonial {
  id: string;
  patient_name: string;
  quote: string;
  designation: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches all testimonials ordered by sort_order ascending, then created_at ascending.
 * Throws on Supabase error.
 */
export async function getTestimonials(): Promise<Testimonial[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data as Testimonial[];
}

/**
 * Returns only active testimonials for the homepage strip.
 * Filters to is_active = true, ordered by sort_order ascending.
 */
export async function getActiveTestimonials(): Promise<Testimonial[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Testimonial[];
}
