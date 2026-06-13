'use server';
// app/(portal)/actions/staff.ts
// Server Actions for Staff Management (Phase 6).
// requireAdminRole() guard applied to every action — mirrors requireCmsRole() pattern.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { StaffRole } from '@/lib/portal/roles';

const ADMIN_ROLES: StaffRole[] = ['super_admin', 'admin'];

/**
 * Verifies the current session has an admin-capable role before any write.
 * Returns the authenticated Supabase client for subsequent queries.
 * Redirects to /login if no valid session; throws Error('Forbidden') if role is insufficient.
 */
async function requireAdminRole() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (error || !profile || !ADMIN_ROLES.includes(profile.role as StaffRole)) {
    throw new Error('Forbidden');
  }

  return supabase;
}

// ---------------------------------------------------------------------------
// Staff CRUD actions
// ---------------------------------------------------------------------------

/**
 * Creates a new staff Auth account and inserts a matching profile row.
 * New accounts start as is_active: false (pending state — admin activates separately).
 * Rolls back the Auth user if profile insert fails.
 */
export async function createStaffAction(input: {
  email: string;
  temp_password: string;
  role: StaffRole;
  full_name: string;
  phone?: string;
  salary?: number;
  join_date?: string;
}): Promise<{ error?: string }> {
  try {
    await requireAdminRole();

    const adminClient = createAdminClient();

    // Step 1: Create Auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: input.email,
      password: input.temp_password,
      email_confirm: true,
    });

    if (authError) {
      return { error: authError.message };
    }

    const supabase = await createClient();

    // Step 2: Insert profile row (is_active: false — pending state)
    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: authData.user.id,
      role: input.role,
      is_active: false,
      full_name: input.full_name,
      phone: input.phone ?? null,
      salary: input.salary ?? null,
      join_date: input.join_date ?? null,
    });

    if (profileError) {
      // Rollback: remove the Auth account so no orphaned user remains
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return { error: profileError.message };
    }

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Updates staff profile fields. Caller supplies only the fields to change.
 */
export async function updateStaffAction(
  id: string,
  input: Partial<{
    role: StaffRole;
    full_name: string;
    phone: string;
    salary: number;
    join_date: string;
    is_active: boolean;
  }>
): Promise<{ error?: string }> {
  try {
    await requireAdminRole();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('profiles')
      .update(input)
      .eq('id', id);

    if (error) throw new Error(error.message);

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Toggles the is_active flag on a staff profile (activate / deactivate).
 */
export async function toggleActiveAction(
  id: string,
  is_active: boolean
): Promise<{ error?: string }> {
  try {
    await requireAdminRole();
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('profiles')
      .update({ is_active })
      .eq('id', id);

    if (error) throw new Error(error.message);

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Links (or unlinks) a doctor record to a staff profile user.
 * Sets doctors.staff_user_id = profileUserId where doctors.id = doctorId.
 * Pass null for profileUserId to unlink (STAFF-05).
 */
export async function updateDoctorStaffLinkAction(
  doctorId: string | null,
  profileUserId: string | null
): Promise<{ error?: string }> {
  try {
    await requireAdminRole();

    if (!doctorId) {
      // Nothing to link/unlink — no-op
      return {};
    }

    // Must use adminClient — doctors table RLS blocks session-role writes
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('doctors')
      .update({ staff_user_id: profileUserId })
      .eq('id', doctorId);

    if (error) throw new Error(error.message);

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Deletes a staff member: removes the profiles row first, then the Auth user.
 * Both must succeed for the staff record to be fully removed.
 */
export async function deleteStaffAction(
  id: string,
  user_id: string
): Promise<{ error?: string }> {
  try {
    await requireAdminRole();
    const adminClient = createAdminClient();

    // Delete profile row first (FK constraints cascade from Auth, but explicit is safer)
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) throw new Error(profileError.message);

    // Remove Auth account — prevents orphaned credentials
    const { error: authError } = await adminClient.auth.admin.deleteUser(user_id);

    if (authError) throw new Error(authError.message);

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
