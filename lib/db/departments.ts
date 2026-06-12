// lib/db/departments.ts
// Typed Supabase queries for the departments table.
// Used by Server Components and Server Actions to read department data.

import { createClient } from '@/lib/supabase/server';

export interface Department {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
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
