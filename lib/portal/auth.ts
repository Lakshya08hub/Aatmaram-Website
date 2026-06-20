// lib/portal/auth.ts
// Shared auth helper for portal server actions.
// Centralises the repetitive createClient → getUser → profile-fetch → role-check pattern.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { StaffRole } from '@/lib/portal/roles';

/**
 * Verifies the caller is authenticated and has one of the allowed roles.
 *
 * - Redirects to /login if the session has no user.
 * - Throws Error('Forbidden') if the profile row is missing or the role is not in allowedRoles.
 * - Returns { user, role, supabase } on success.
 */
export async function requireRole(allowedRoles: StaffRole[]) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    // Log for observability; still redirect to login safely
    console.error('[auth] getUser error:', authError.message);
  }
  if (!user) redirect('/login');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (error || !profile || !allowedRoles.includes(profile.role as StaffRole)) {
    throw new Error('Forbidden');
  }

  return { user, role: profile.role as StaffRole, supabase };
}
