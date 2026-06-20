'use server';
// app/(portal)/actions/content.ts
// Server Actions for Content Management (Departments CRUD).
// T-05-03 mitigation: requireCmsRole() checks profile.role before any DB write.
// T-05-05 mitigation: requireCmsRole() calls getUser() (server-side re-validation) and redirects if no session.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { StaffRole } from '@/lib/portal/roles';

// ---------------------------------------------------------------------------
// Validation schemas (CR-001)
// ---------------------------------------------------------------------------

const testimonialSchema = z.object({
  patient_name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  quote: z.string().min(10, 'Quote must be at least 10 characters').max(1000, 'Quote must be at most 1000 characters'),
  designation: z.string().max(100, 'Designation must be at most 100 characters').optional(),
  sort_order: z.coerce.number().int().min(0).max(999),
});

const CMS_ROLES: StaffRole[] = ['super_admin', 'admin'];

const departmentCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  image_url: z.string().max(500).optional(),
});

const doctorCreateSchema = z.object({
  full_name:         z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  specialization:    z.string().min(1, 'Specialization is required').max(100, 'Specialization must be at most 100 characters'),
  qualification:     z.string().min(1, 'Qualification is required').max(200, 'Qualification must be at most 200 characters'),
  photo_url:         z.string().url('Photo URL must be a valid URL').max(500).optional(),
  bio:               z.string().max(1000, 'Bio must be at most 1000 characters').optional(),
  availability_days: z.array(z.string().max(20)).max(7).optional(),
  is_active:         z.boolean().optional(),
});


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

    const parsed = departmentCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const { error } = await createAdminClient().from('departments').insert({
      name: parsed.data.name,
      description: parsed.data.description || '',
      image_url: parsed.data.image_url || null,
    });

    if (error) throw new Error(error.message);

    revalidateDepartments();
    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

const DEPARTMENT_ALLOWED_FIELDS = ['name', 'description', 'image_url'] as const;

// Required fields must not be empty strings; optional fields allow empty strings
// so admins can intentionally clear them (WR-002).
const DEPARTMENT_REQUIRED_FIELDS: ReadonlyArray<string> = ['name'];

export async function updateDepartmentAction(
  id: string,
  input: Partial<{ name: string; description: string; image_url: string }>
): Promise<{ error?: string }> {
  try {
    await requireCmsRole();

    const parsed = departmentCreateSchema.partial().safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const cleaned = Object.fromEntries(
      Object.entries(parsed.data).filter(([k, v]) => {
        if (!DEPARTMENT_ALLOWED_FIELDS.includes(k as typeof DEPARTMENT_ALLOWED_FIELDS[number])) return false;
        if (v === undefined) return false;
        // Required fields reject empty strings; optional fields (image_url, description) allow them.
        if (DEPARTMENT_REQUIRED_FIELDS.includes(k) && v === '') return false;
        return true;
      })
    );
    const { error } = await createAdminClient()
      .from('departments')
      .update({ ...cleaned, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);

    revalidateDepartments();
    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
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
    if (isRedirectError(err)) throw err;
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

    const parsed = doctorCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const { error } = await createAdminClient().from('doctors').insert({
      full_name:         parsed.data.full_name,
      specialization:    parsed.data.specialization,
      qualification:     parsed.data.qualification,
      photo_url:         parsed.data.photo_url ?? null,
      bio:               parsed.data.bio ?? null,
      availability_days: parsed.data.availability_days ?? null,
      is_active:         parsed.data.is_active ?? true,
    });

    if (error) throw new Error(error.message);

    revalidateDoctors();
    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

const DOCTOR_ALLOWED_FIELDS = ['full_name', 'specialization', 'qualification', 'photo_url', 'bio', 'availability_days', 'is_active'] as const;

// Required fields must not be empty strings; optional fields allow empty strings
// so admins can intentionally clear them (WR-001).
const DOCTOR_REQUIRED_FIELDS: ReadonlyArray<string> = ['full_name', 'specialization', 'qualification'];

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

    const parsedUpdate = doctorCreateSchema.partial().safeParse(input);
    if (!parsedUpdate.success) {
      return { error: parsedUpdate.error.issues[0].message };
    }

    const cleaned = Object.fromEntries(
      Object.entries(parsedUpdate.data).filter(([k, v]) => {
        if (!DOCTOR_ALLOWED_FIELDS.includes(k as typeof DOCTOR_ALLOWED_FIELDS[number])) return false;
        if (v === undefined) return false;
        // Required fields: reject empty strings; optional fields: allow empty strings
        // so they can be intentionally cleared.
        if (DOCTOR_REQUIRED_FIELDS.includes(k) && v === '') return false;
        return true;
      })
    );
    const { error } = await createAdminClient()
      .from('doctors')
      .update({ ...cleaned, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);

    revalidateDoctors();
    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
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
    if (isRedirectError(err)) throw err;
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Facility actions (CMS-02)
// ---------------------------------------------------------------------------

type FacilityCategory = 'OPD' | 'ICU' | 'Diagnostics' | 'Surgery' | 'Other';

const facilityCreateSchema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters'),
  category:    z.enum(['OPD', 'ICU', 'Diagnostics', 'Surgery', 'Other'], { errorMap: () => ({ message: 'Invalid category' }) }),
  image_url:   z.string().url('Image URL must be a valid URL').max(500).optional(),
});

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
  image_url?: string;
}): Promise<{ error?: string }> {
  try {
    await requireCmsRole();

    const parsed = facilityCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const { error } = await createAdminClient().from('facilities').insert({
      name:        parsed.data.name,
      description: parsed.data.description,
      category:    parsed.data.category,
      image_url:   parsed.data.image_url ?? null,
    });

    if (error) throw new Error(error.message);

    revalidateFacilities();
    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

const FACILITY_ALLOWED_FIELDS = ['name', 'description', 'category', 'image_url'] as const;

export async function updateFacilityAction(
  id: string,
  input: Partial<{ name: string; description: string; category: FacilityCategory; image_url: string }>
): Promise<{ error?: string }> {
  try {
    await requireCmsRole();
    // CR-002: whitelist allowed fields to prevent id/created_at/updated_at injection.
    const cleaned = Object.fromEntries(
      Object.entries(input).filter(
        ([k, v]) => FACILITY_ALLOWED_FIELDS.includes(k as typeof FACILITY_ALLOWED_FIELDS[number]) && v !== undefined
      )
    );
    const { error } = await createAdminClient()
      .from('facilities')
      .update({ ...cleaned, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);

    revalidateFacilities();
    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
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
    if (isRedirectError(err)) throw err;
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
 *
 * NOTE (WR-006): The featured-count cap check below is non-atomic. A race
 * condition exists where two concurrent requests can both read a count below
 * the cap and both succeed, exceeding the limit. For v1 (single-hospital,
 * low-traffic portal) this is acceptable. To fix properly, replace the
 * read-check-write pattern with a Postgres function or a DB-level constraint
 * (e.g. a partial unique index or a CHECK trigger).
 * TODO: make atomic with a DB function or trigger before multi-tenant use.
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

    const { error } = await admin.from(table).update({ is_featured: value, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw new Error(error.message);

    revalidatePath('/portal/content/' + table);
    revalidateHomepages();
    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
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

    if (isNaN(order) || order < 0) return { error: 'Invalid order value' };

    const { error } = await createAdminClient()
      .from(table)
      .update({ featured_order: order, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);

    revalidatePath('/portal/content/' + table);
    revalidateHomepages();
    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
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

// ---------------------------------------------------------------------------
// Testimonial actions (Phase 15, Plan 03)
// ---------------------------------------------------------------------------

/**
 * Revalidates both locale homepages so testimonial changes appear on the
 * homepage strip immediately.
 */
function revalidateTestimonials(): void {
  revalidatePath('/en');
  revalidatePath('/hi');
}

export async function createTestimonialAction(input: {
  patient_name: string;
  quote: string;
  designation?: string;
  is_active: boolean;
  sort_order: number;
}): Promise<{ error?: string }> {
  try {
    await requireCmsRole();

    const parsed = testimonialSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    // WR-006: use parsed.data (not raw input) so Zod-coerced values are written to DB.
    const { error } = await createAdminClient().from('testimonials').insert({
      patient_name: parsed.data.patient_name,
      quote: parsed.data.quote,
      designation: parsed.data.designation || null,
      is_active: input.is_active,
      sort_order: parsed.data.sort_order,
    });

    if (error) throw new Error(error.message);

    revalidateTestimonials();
    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateTestimonialAction(
  id: string,
  input: {
    patient_name: string;
    quote: string;
    designation?: string;
    is_active: boolean;
    sort_order: number;
  }
): Promise<{ error?: string }> {
  try {
    await requireCmsRole();

    const parsed = testimonialSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    // WR-006: use parsed.data (not raw input) so Zod-coerced values are written to DB.
    const { error } = await createAdminClient()
      .from('testimonials')
      .update({
        patient_name: parsed.data.patient_name,
        quote: parsed.data.quote,
        designation: parsed.data.designation || null,
        is_active: input.is_active,
        sort_order: parsed.data.sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw new Error(error.message);

    revalidateTestimonials();
    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function deleteTestimonialAction(
  id: string
): Promise<{ error?: string }> {
  try {
    await requireCmsRole();
    const { error } = await createAdminClient()
      .from('testimonials')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    revalidateTestimonials();
    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function toggleTestimonialActiveAction(
  id: string,
  is_active: boolean
): Promise<{ error?: string }> {
  try {
    await requireCmsRole();
    const { error } = await createAdminClient()
      .from('testimonials')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);

    revalidateTestimonials();
    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// Hospital Info actions (CMS-03)
// ---------------------------------------------------------------------------

const HOSPITAL_INFO_ALLOWED_FIELDS = [
  'about_text',
  'opd_timings',
  'emergency_number',
  'address_line1',
  'address_line2',
  'city',
  'maps_embed_url',
] as const;

const hospitalInfoUpdateSchema = z.object({
  about_text:       z.string().max(1200, 'About text must be at most 1200 characters').optional(),
  opd_timings:      z.string().max(200, 'OPD timings must be at most 200 characters').optional(),
  emergency_number: z.string().max(30, 'Emergency number must be at most 30 characters').optional(),
  address_line1:    z.string().max(200, 'Address line 1 must be at most 200 characters').optional(),
  address_line2:    z.string().max(200, 'Address line 2 must be at most 200 characters').optional(),
  city:             z.string().max(100, 'City must be at most 100 characters').optional(),
  maps_embed_url:   z.string().url('Maps URL must be a valid URL').max(500).or(z.literal('')).optional(),
});

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

    const parsed = hospitalInfoUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    // CR-002: whitelist allowed fields to prevent id/created_at/hero_image_url injection.
    const cleaned = Object.fromEntries(
      Object.entries(parsed.data).filter(
        ([k, v]) =>
          HOSPITAL_INFO_ALLOWED_FIELDS.includes(k as typeof HOSPITAL_INFO_ALLOWED_FIELDS[number]) &&
          v !== undefined
      )
    );
    const { error } = await createAdminClient()
      .from('hospital_info')
      .update({ ...cleaned, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);

    revalidateHospitalInfo();
    return {};
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
