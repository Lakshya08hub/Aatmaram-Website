// lib/db/staff.ts
// Staff list query utility for Phase 6 Staff Management.
// Uses adminClient to list Auth users (email access) merged with profiles rows.

import { createAdminClient } from '@/lib/supabase/admin';
import { StaffRole } from '@/lib/portal/roles';

export interface StaffMember {
  id: string;
  user_id: string;
  role: StaffRole;
  is_active: boolean;
  full_name: string | null;
  phone: string | null;
  salary: number | null;
  join_date: string | null;
  created_at: string;
  /** Email sourced from Supabase Auth — merged by user_id. */
  email: string;
}

/**
 * Returns all staff profiles joined with their Auth email.
 * Admin client is required to access auth.admin.listUsers().
 * Sorted by created_at ascending (oldest accounts first).
 */
export async function getStaffList(): Promise<StaffMember[]> {
  const adminClient = createAdminClient();

  // Fetch all Auth users (provides email)
  const { data: authData, error: authError } = await adminClient.auth.admin.listUsers({
    perPage: 1000,
  });
  if (authError) {
    throw new Error(`Failed to list Auth users: ${authError.message}`);
  }

  // Build a lookup map: user_id → email
  const emailMap = new Map<string, string>(
    authData.users.map((u) => [u.id, u.email ?? ''])
  );

  // Fetch all profiles via admin client (bypasses RLS "own read" policy)
  const { data: profiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('id, user_id, role, is_active, full_name, phone, salary, join_date, created_at')
    .order('created_at', { ascending: true });

  if (profilesError) {
    throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
  }

  // Merge email into each profile row
  return (profiles ?? []).map((p) => ({
    id: p.id as string,
    user_id: p.user_id as string,
    role: p.role as StaffRole,
    is_active: p.is_active as boolean,
    full_name: p.full_name as string | null,
    phone: p.phone as string | null,
    salary: p.salary as number | null,
    join_date: p.join_date as string | null,
    created_at: p.created_at as string,
    email: emailMap.get(p.user_id as string) ?? '',
  }));
}
