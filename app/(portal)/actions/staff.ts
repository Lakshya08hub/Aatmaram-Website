'use server';
// app/(portal)/actions/staff.ts
// Server Actions for Staff Management (Phase 6).
// requireAdminRole() guard applied to every action — mirrors requireCmsRole() pattern.

import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { StaffRole } from '@/lib/portal/roles';

const ADMIN_ROLES: StaffRole[] = ['super_admin', 'admin'];

/**
 * Shared self-lockout guard: blocks an admin from deactivating their own
 * account through any mutation path (would lock out the only active admin).
 */
function assertNotSelfDeactivation(
  targetId: string,
  callerProfileId: string,
  isDeactivating: boolean
): { error: string } | null {
  if (isDeactivating && targetId === callerProfileId) {
    return { error: 'Cannot deactivate your own account' };
  }
  return null;
}

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
    .select('id, role, is_active')
    .eq('user_id', user.id)
    .single();

  if (
    error ||
    !profile ||
    !profile.is_active ||
    !ADMIN_ROLES.includes(profile.role as StaffRole)
  ) {
    throw new Error('Forbidden');
  }

  return { supabase, callerProfileId: profile.id as string, callerRole: profile.role as StaffRole };
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

    // Step 2: Insert profile row using adminClient (consistent with other admin writes;
    // avoids session-client RLS fragility if the caller's JWT expires between steps).
    const { error: profileError } = await adminClient.from('profiles').insert({
      user_id: authData.user.id,
      role: input.role,
      is_active: false,
      full_name: input.full_name,
      phone: input.phone ?? null,
      salary: input.salary ?? null,
      join_date: input.join_date ?? null,
    });

    if (profileError) {
      // Rollback: attempt to remove the Auth account so no orphaned user remains.
      // Check the rollback result — a failed rollback leaves a loginable user with no profile.
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(authData.user.id);
      const rollbackNote = deleteError
        ? ` (CRITICAL: Auth user ${authData.user.id} not deleted — manual cleanup required: ${deleteError.message})`
        : '';
      return { error: profileError.message + rollbackNote };
    }

    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
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
    const { callerRole, callerProfileId } = await requireAdminRole();
    const adminClient = createAdminClient();

    // Prevent role escalation: fetch the target's current role before updating.
    const { data: target } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', id)
      .single();

    if (target?.role === 'super_admin' && callerRole !== 'super_admin') {
      return { error: 'Cannot modify a super_admin account' };
    }
    if (input.role === 'super_admin' && callerRole !== 'super_admin') {
      return { error: 'Cannot promote to super_admin' };
    }

    const selfErr = assertNotSelfDeactivation(id, callerProfileId, input.is_active === false);
    if (selfErr) return selfErr;

    const { error } = await adminClient
      .from('profiles')
      .update(input)
      .eq('id', id);

    if (error) throw new Error(error.message);

    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
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
    const { callerProfileId, callerRole } = await requireAdminRole();
    const adminClient = createAdminClient();

    // Prevent self-deactivation (would lock out the only active admin).
    const selfErr = assertNotSelfDeactivation(id, callerProfileId, is_active === false);
    if (selfErr) return selfErr;

    // Only super_admin may deactivate another super_admin.
    const { data: target } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', id)
      .single();

    if (target?.role === 'super_admin' && callerRole !== 'super_admin') {
      return { error: 'Cannot deactivate a super_admin account' };
    }

    const { error } = await adminClient
      .from('profiles')
      .update({ is_active })
      .eq('id', id);

    if (error) throw new Error(error.message);

    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
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

    // Validate the doctor row exists before running the update.
    // Supabase returns no error for a zero-row update, so we check explicitly.
    const { data: doctor, error: fetchErr } = await adminClient
      .from('doctors')
      .select('id')
      .eq('id', doctorId)
      .single();

    if (fetchErr || !doctor) {
      return { error: 'Doctor record not found' };
    }

    const { error } = await adminClient
      .from('doctors')
      .update({ staff_user_id: profileUserId })
      .eq('id', doctorId);

    if (error) throw new Error(error.message);

    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
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

    // Delete Auth user FIRST — a failed Auth delete leaves the profile intact (no zombie login).
    // If profile delete then fails, the user is already locked out; log for manual cleanup.
    const { error: authError } = await adminClient.auth.admin.deleteUser(user_id);

    if (authError) throw new Error(authError.message);

    // Remove profile row after Auth deletion succeeds
    const { error: profileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) {
      // Auth user is gone; profile is orphaned — log for manual DB cleanup.
      console.error(`Orphaned profile ${id} after Auth delete — manual DB cleanup required`);
      throw new Error(profileError.message);
    }

    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
