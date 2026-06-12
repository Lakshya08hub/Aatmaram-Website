'use server';
// app/(portal)/actions/content.ts
// Server Actions for Content Management (Departments CRUD).
// T-05-03 mitigation: requireCmsRole() checks profile.role before any DB write.
// T-05-05 mitigation: requireCmsRole() calls getUser() (server-side re-validation) and redirects if no session.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StaffRole } from '@/lib/portal/roles';

const CMS_ROLES: StaffRole[] = ['super_admin', 'admin'];

/**
 * Revalidates the public departments pages for all locales so changes
 * are reflected on the public site immediately (CMS-04).
 */
function revalidateDepartments(): void {
  revalidatePath('/en/departments');
  revalidatePath('/hi/departments');
}

/**
 * Verifies the current session has a CMS-capable role before any write.
 * Returns the authenticated Supabase client for subsequent queries.
 * Redirects to /login if no valid session; throws Error('Forbidden') if role is insufficient.
 */
async function requireCmsRole() {
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

  if (error || !profile || !CMS_ROLES.includes(profile.role as StaffRole)) {
    throw new Error('Forbidden');
  }

  return supabase;
}

// ---------------------------------------------------------------------------
// Department actions
// ---------------------------------------------------------------------------

export async function createDepartmentAction(input: {
  name: string;
  description: string;
  image_url?: string;
}): Promise<{ error?: string }> {
  try {
    const supabase = await requireCmsRole();

    const { error } = await supabase.from('departments').insert({
      name: input.name,
      description: input.description,
      image_url: input.image_url || null,
    });

    if (error) throw new Error(error.message);

    revalidateDepartments();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateDepartmentAction(
  id: string,
  input: Partial<{ name: string; description: string; image_url: string }>
): Promise<{ error?: string }> {
  try {
    const supabase = await requireCmsRole();

    const { error } = await supabase
      .from('departments')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);

    revalidateDepartments();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function deleteDepartmentAction(
  id: string
): Promise<{ error?: string }> {
  try {
    const supabase = await requireCmsRole();

    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    revalidateDepartments();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
