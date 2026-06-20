// lib/db/hospital-info.ts
// Typed Supabase queries for the hospital_info table (single record).
// Used by Server Components and Server Actions to read hospital info.

import { createClient } from '@/lib/supabase/server';

export interface HospitalInfo {
  id: string;
  about_text: string;
  opd_timings: string;
  emergency_number: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  maps_embed_url: string | null;
  hero_image_url: string | null;
  updated_at: string;
}

/**
 * Fetches the single hospital_info record.
 * Returns null on error — callers should handle gracefully (no throw).
 */
export async function getHospitalInfo(): Promise<HospitalInfo | null> {
  const supabase = await createClient();

  // WR-005: explicit column list instead of select('*') to avoid pulling
  // unexpected columns if the schema evolves.
  const { data, error } = await supabase
    .from('hospital_info')
    .select(
      'id, about_text, opd_timings, emergency_number, address_line1, address_line2, city, maps_embed_url, hero_image_url, updated_at'
    )
    .single();

  if (error) {
    return null;
  }

  return data as HospitalInfo;
}
