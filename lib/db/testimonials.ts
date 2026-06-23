// lib/db/testimonials.ts
// Typed Supabase queries for the testimonials table.
// Used by Server Components and Server Actions to read testimonial data.

import { createClient } from '@/lib/supabase/server';

export interface Testimonial {
  id: string;
  patient_name: string;
  patient_name_hi: string | null;
  quote: string;
  quote_hi: string | null;
  designation: string | null;
  designation_hi: string | null;
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
    .select('id, patient_name, patient_name_hi, quote, quote_hi, designation, designation_hi, is_active, sort_order, created_at, updated_at')
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
    .select('id, patient_name, patient_name_hi, quote, quote_hi, designation, designation_hi, is_active, sort_order, created_at, updated_at')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Testimonial[];
}
