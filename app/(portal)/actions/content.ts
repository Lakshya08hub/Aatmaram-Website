'use server';
// app/(portal)/actions/content.ts
// Server Actions for Content Management (Departments CRUD).
// T-05-03 mitigation: requireCmsRole() checks profile.role before any DB write.
// T-05-05 mitigation: requireCmsRole() calls getUser() (server-side re-validation) and redirects if no session.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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
    await requireCmsRole();
    const { error } = await createAdminClient().from('departments').insert({
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
    await requireCmsRole();
    const { error } = await createAdminClient()
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
    await requireCmsRole();
    const { error } = await createAdminClient()
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

// ---------------------------------------------------------------------------
// Doctor actions
// ---------------------------------------------------------------------------

/**
 * Revalidates the public doctors pages for all locales so changes
 * are reflected on the public site immediately.
 */
function revalidateDoctors(): void {
  revalidatePath('/en/doctors');
  revalidatePath('/hi/doctors');
}

export async function createDoctorAction(input: {
  full_name: string;
  specialization: string;
  qualification: string;
  photo_url?: string;
  bio?: string;
  availability_days?: string[];
  is_active?: boolean;
}): Promise<{ error?: string }> {
  try {
    await requireCmsRole();
    const { error } = await createAdminClient().from('doctors').insert({
      full_name: input.full_name,
      specialization: input.specialization,
      qualification: input.qualification,
      photo_url: input.photo_url || null,
      bio: input.bio || null,
      availability_days: input.availability_days ?? null,
      is_active: input.is_active ?? true,
    });

    if (error) throw new Error(error.message);

    revalidateDoctors();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateDoctorAction(
  id: string,
  input: Partial<{
    full_name: string;
    specialization: string;
    qualification: string;
    photo_url: string;
    bio: string;
    availability_days: string[];
    is_active: boolean;
  }>
): Promise<{ error?: string }> {
  try {
    await requireCmsRole();
    const { error } = await createAdminClient()
      .from('doctors')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);

    revalidateDoctors();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function deleteDoctorAction(
  id: string
): Promise<{ error?: string }> {
  try {
    await requireCmsRole();
    const { error } = await createAdminClient().from('doctors').delete().eq('id', id);

    if (error) throw new Error(error.message);

    revalidateDoctors();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Facility actions (CMS-02)
// ---------------------------------------------------------------------------

type FacilityCategory = 'OPD' | 'ICU' | 'Diagnostics' | 'Surgery' | 'Other';

/**
 * Revalidates the public services pages for all locales so facility changes
 * are reflected on the public site immediately (CMS-04).
 */
function revalidateFacilities(): void {
  revalidatePath('/en/services');
  revalidatePath('/hi/services');
}

export async function createFacilityAction(input: {
  name: string;
  description: string;
  category: FacilityCategory;
}): Promise<{ error?: string }> {
  try {
    await requireCmsRole();
    const { error } = await createAdminClient().from('facilities').insert({
      name: input.name,
      description: input.description,
      category: input.category,
    });

    if (error) throw new Error(error.message);

    revalidateFacilities();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateFacilityAction(
  id: string,
  input: Partial<{ name: string; description: string; category: FacilityCategory }>
): Promise<{ error?: string }> {
  try {
    await requireCmsRole();
    const { error } = await createAdminClient()
      .from('facilities')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);

    revalidateFacilities();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function deleteFacilityAction(
  id: string
): Promise<{ error?: string }> {
  try {
    await requireCmsRole();
    const { error } = await createAdminClient()
      .from('facilities')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    revalidateFacilities();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Featured curation actions (Phase 12)
// ---------------------------------------------------------------------------

type FeaturedTable = 'departments' | 'doctors' | 'facilities';

const ALLOWED_FEATURED_TABLES: readonly FeaturedTable[] = ['departments', 'doctors', 'facilities'];

function assertAllowedTable(table: string): asserts table is FeaturedTable {
  if (!ALLOWED_FEATURED_TABLES.includes(table as FeaturedTable)) {
    throw new Error('Invalid table');
  }
}

/**
 * Revalidates both locale homepages so featured changes appear immediately.
 */
function revalidateHomepages(): void {
  revalidatePath('/en');
  revalidatePath('/hi');
}

/**
 * Toggle is_featured for a record in departments, doctors, or facilities.
 * Enforces max caps: departments <= 8, doctors <= 3.
 * T-12-05: requireCmsRole() guards all writes.
 */
export async function toggleFeatured(
  table: FeaturedTable,
  id: string,
  value: boolean
): Promise<{ error?: string }> {
  try {
    assertAllowedTable(table);
    await requireCmsRole();
    const admin = createAdminClient();

    if (value) {
      if (table === 'doctors') {
        const { count, error: countErr } = await admin
          .from('doctors')
          .select('id', { count: 'exact', head: true })
          .eq('is_featured', true);
        if (countErr) throw new Error(countErr.message);
        if ((count ?? 0) >= 3) throw new Error('Maximum 3 featured doctors allowed');
      } else if (table === 'departments') {
        const { count, error: countErr } = await admin
          .from('departments')
          .select('id', { count: 'exact', head: true })
          .eq('is_featured', true);
        if (countErr) throw new Error(countErr.message);
        if ((count ?? 0) >= 8) throw new Error('Maximum 8 featured departments allowed');
      } else if (table === 'facilities') {
        const { count, error: countErr } = await admin
          .from('facilities')
          .select('id', { count: 'exact', head: true })
          .eq('is_featured', true);
        if (countErr) throw new Error(countErr.message);
        if ((count ?? 0) >= 6) throw new Error('Maximum 6 featured facilities allowed');
      }
    }

    const { error } = await admin.from(table).update({ is_featured: value }).eq('id', id);
    if (error) throw new Error(error.message);

    revalidatePath('/portal/content/' + table);
    revalidateHomepages();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Update featured_order for a record in departments, doctors, or facilities.
 * Security fix: requireCmsRole() is called first — unauthenticated callers are
 * rejected before any input validation runs. This prevents unauthenticated
 * behavioral probing of the early-return path (SEC-01).
 * T-12-06: NaN and negative order values are still rejected after auth check.
 */
export async function setFeaturedOrder(
  table: FeaturedTable,
  id: string,
  order: number
): Promise<{ error?: string }> {
  try {
    // Auth check first — never allow unauthenticated callers to observe
    // the success path even when input is rejected (SEC-01).
    assertAllowedTable(table);
    await requireCmsRole();

    if (isNaN(order) || order < 0) return {};

    const { error } = await createAdminClient()
      .from(table)
      .update({ featured_order: order })
      .eq('id', id);
    if (error) throw new Error(error.message);

    revalidatePath('/portal/content/' + table);
    revalidateHomepages();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Hospital Info actions (CMS-03)
// ---------------------------------------------------------------------------

/**
 * Revalidates the public contact pages for all locales so hospital info changes
 * are reflected on the public site immediately (CMS-04).
 */
function revalidateHospitalInfo(): void {
  revalidatePath('/en/contact');
  revalidatePath('/hi/contact');
}

export async function updateHospitalInfoAction(
  id: string,
  input: Partial<{
    about_text: string;
    opd_timings: string;
    emergency_number: string;
    address_line1: string;
    address_line2: string;
    city: string;
    maps_embed_url: string;
  }>
): Promise<{ error?: string }> {
  try {
    await requireCmsRole();
    const { error } = await createAdminClient()
      .from('hospital_info')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);

    revalidateHospitalInfo();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
