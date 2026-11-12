---
phase: 5
phase_name: content-management
status: issues_found
review_depth: standard
files_reviewed: 22
files_reviewed_list:
  - supabase/migrations/20260612_cms_tables.sql
  - lib/supabase/admin.ts
  - app/(portal)/content/layout.tsx
  - lib/portal/roles.ts
  - lib/db/departments.ts
  - lib/db/doctors.ts
  - lib/db/facilities.ts
  - lib/db/hospital-info.ts
  - app/(portal)/actions/content.ts
  - app/(portal)/content/departments/page.tsx
  - app/(portal)/content/departments/DepartmentsClient.tsx
  - app/(portal)/content/doctors/page.tsx
  - app/(portal)/content/doctors/DoctorsClient.tsx
  - app/(portal)/content/facilities/page.tsx
  - app/(portal)/content/facilities/FacilitiesClient.tsx
  - app/(portal)/content/hospital-info/page.tsx
  - app/(portal)/content/hospital-info/HospitalInfoClient.tsx
  - app/[locale]/(public)/departments/page.tsx
  - app/[locale]/(public)/doctors/page.tsx
  - app/[locale]/(public)/services/page.tsx
  - app/[locale]/(public)/contact/page.tsx
  - lib/portal/roles.ts
findings:
  critical: 4
  warning: 6
  info: 2
  total: 12
---

# Phase 5: Code Review Report

**Reviewed:** 2026-06-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 22
**Status:** issues_found

## Summary

Phase 5 implements a full CMS for the hospital portal: four DB tables with RLS, a service-role admin client, role-gated content layout, typed DB query modules, server actions with field whitelisting, and updated public pages. The overall structure is sound — `isRedirectError` is re-thrown in every catch block, field whitelists are applied, and the layout guard properly re-validates with the Auth server rather than trusting the JWT. However, four critical issues were found that can cause silent data loss, iframe injection on the public site, schema–type mismatches that will crash at runtime, and unauthenticated callers receiving misleading success responses from `requireCmsRole` when redirect exceptions are not propagated to outer callers.

---

## Critical Issues

### CR-01: `maps_embed_url` rendered in `<iframe src>` with no origin allowlist — iframe injection

**File:** `app/[locale]/(public)/contact/page.tsx:107`

**Issue:** `mapsEmbedUrl` from the database is passed directly as the `src` attribute of an `<iframe>`. Zod's `.url()` check in `HospitalInfoClient.tsx` validates only that the string is a syntactically valid URL. It does not restrict the scheme or origin. An admin (or an attacker who compromises an admin account) can store any URL — including `javascript:` URIs, `data:` URLs, or arbitrary third-party origins. The browser will load whatever URL is stored. This bypasses the intent of a "Google Maps embed only" field and creates a stored XSS / clickjacking vector visible to every public visitor.

**Fix:** Add a server-side origin allowlist in `updateHospitalInfoAction` before writing to the database:

```typescript
// In content.ts, before writing maps_embed_url:
const MAPS_ALLOWED_ORIGINS = [
  'https://www.google.com/maps/',
  'https://maps.google.com/',
];

function isAllowedMapsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      MAPS_ALLOWED_ORIGINS.some((o) => url.startsWith(o))
    );
  } catch {
    return false;
  }
}

// In the cleaned object assembly:
if (cleaned.maps_embed_url && !isAllowedMapsUrl(cleaned.maps_embed_url)) {
  return { error: 'Maps URL must be a Google Maps embed URL.' };
}
```

Also add `sandbox="allow-scripts allow-same-origin"` to the `<iframe>` element as a defence-in-depth measure, and consider adding a CSP `frame-src` directive limited to `https://www.google.com`.

---

### CR-02: `createDoctorAction` bypasses Zod for `full_name`, `specialization`, `qualification`, `photo_url`, `availability_days`, `is_active`

**File:** `app/(portal)/actions/content.ts:199-207`

**Issue:** `doctorCreateSchema` validates only `full_name`, `specialization`, `bio`, and `qualification`. After `safeParse`, the action inserts values from the **raw `input` object** — not from `parsed.data` — for every field except `bio`:

```typescript
const { error } = await createAdminClient().from('doctors').insert({
  full_name: input.full_name,           // <-- raw input, not parsed.data
  specialization: input.specialization, // <-- raw input
  qualification: input.qualification,   // <-- raw input
  photo_url: input.photo_url || null,   // <-- raw input, no length/URL check
  bio: parsed.data.bio || null,         // only bio uses parsed.data
  availability_days: input.availability_days ?? null,  // raw, no element validation
  is_active: input.is_active ?? true,   // raw boolean, no coercion
});
```

This means:
- `full_name` up to unlimited length can bypass the schema's `max(100)` (the schema validates it but the insert ignores the coerced value — if the caller sends a 10,000-character name, `safeParse` will catch it, but only because `full_name` happens to be in the schema; `photo_url` is not in the schema at all).
- `photo_url` has no validation at all — an attacker can store arbitrary strings (XSS in `<img src>`, very long strings for DoS).
- `availability_days` array elements are never validated — arbitrary strings can be injected per element.

**Fix:** Add all inserted fields to `doctorCreateSchema` and insert only `parsed.data`:

```typescript
const doctorCreateSchema = z.object({
  full_name:         z.string().min(2).max(100),
  specialization:    z.string().min(1).max(100),
  qualification:     z.string().min(1).max(200),
  photo_url:         z.string().url().max(500).optional(),
  bio:               z.string().max(1000).optional(),
  availability_days: z.array(z.string().max(20)).max(7).optional(),
  is_active:         z.boolean().optional(),
});

// Then insert from parsed.data only:
await createAdminClient().from('doctors').insert({
  full_name:         parsed.data.full_name,
  specialization:    parsed.data.specialization,
  qualification:     parsed.data.qualification,
  photo_url:         parsed.data.photo_url ?? null,
  bio:               parsed.data.bio ?? null,
  availability_days: parsed.data.availability_days ?? null,
  is_active:         parsed.data.is_active ?? true,
});
```

---

### CR-03: `createFacilityAction` has no Zod validation at all

**File:** `app/(portal)/actions/content.ts:303-318`

**Issue:** Unlike department and doctor create actions, `createFacilityAction` calls `requireCmsRole()` and then immediately inserts raw `input` fields without any Zod schema validation:

```typescript
export async function createFacilityAction(input: {
  name: string;
  description: string;
  category: FacilityCategory;
  image_url?: string;
}): Promise<{ error?: string }> {
  try {
    await requireCmsRole();
    const { error } = await createAdminClient().from('facilities').insert({
      name: input.name,          // no max length check
      description: input.description, // no max length check
      category: input.category,  // TypeScript type only — bypassed at runtime
      image_url: input.image_url || null, // no URL validation
    });
```

TypeScript types are erased at runtime. A caller can pass `name: 'A'.repeat(100000)` or `category: 'INVALID'` (the DB enum will reject the latter, but at DB cost rather than action cost). The `image_url` field accepts any string with no URL check.

**Fix:** Add and apply a facility schema before inserting:

```typescript
const facilityCreateSchema = z.object({
  name:        z.string().min(2).max(100),
  description: z.string().max(500),
  category:    z.enum(['OPD', 'ICU', 'Diagnostics', 'Surgery', 'Other']),
  image_url:   z.string().url().max(500).optional(),
});
```

---

### CR-04: `HospitalInfo` type declares `hero_image_url` but the migration does not add this column — silent null cast masks a schema mismatch

**File:** `lib/db/hospital-info.ts:16` / `supabase/migrations/20260612_cms_tables.sql`

**Issue:** The `HospitalInfo` TypeScript interface includes `hero_image_url: string | null`, and `getHospitalInfo` explicitly selects `hero_image_url` from the database. The migration, however, does not define a `hero_image_url` column on `hospital_info`. When the migration runs, Supabase will return an error or null for that column, and the `as HospitalInfo` cast will silently hide it. Any code that subsequently reads `hospitalInfo.hero_image_url` expecting a string will get `undefined` — typed as `string | null` — which can cause runtime crashes if passed to APIs expecting a non-null string.

This also means the `updateHospitalInfoAction` whitelist comment references `hero_image_url` as a field being blocked (`// CR-002: whitelist … to prevent id/created_at/hero_image_url injection`) — indicating `hero_image_url` is a known column elsewhere in the schema but was omitted from this migration. This is a schema–type drift bug.

**Fix:** Either add the missing column to the migration:

```sql
ALTER TABLE hospital_info ADD COLUMN hero_image_url text;
```

Or remove `hero_image_url` from the `HospitalInfo` interface and the `getHospitalInfo` select string until the column is intentionally added.

---

## Warnings

### WR-01: `requireCmsRole` throws `Error('Forbidden')` — callers that only check `result.error` will silently succeed on auth failure

**File:** `app/(portal)/actions/content.ts:73-75`

**Issue:** When the role check fails, `requireCmsRole` throws `new Error('Forbidden')`. The outer `catch` blocks in every action re-package thrown errors into `{ error: string }`. This means auth failures become `{ error: 'Forbidden' }` in the return value — which is reasonable. However, the `redirect('/login')` call in `requireCmsRole` (line 63) throws a redirect error. The `isRedirectError` check re-throws it correctly. But because the redirect `throw` from `requireCmsRole` must propagate through the action's `catch` block, if any future developer adds a `catch` inside `requireCmsRole` itself that doesn't re-throw redirect errors, the redirect will be silently swallowed. The current design is fragile — `requireCmsRole` both redirects (throws a non-Error) and throws a regular Error, creating two distinct control flow paths in every caller's catch block.

**Fix:** Consider having `requireCmsRole` return `null | supabase-client` and returning early with `{ error: 'Forbidden' }` in callers (removing `redirect` from inside it), or document this pattern explicitly as a convention so future maintainers know to re-throw redirect errors in any catch that wraps `requireCmsRole`.

---

### WR-02: `updateDepartmentAction` and `updateDoctorAction` do not validate field values against Zod schemas before writing

**File:** `app/(portal)/actions/content.ts:119-147, 225-261`

**Issue:** The update actions use a field whitelist to filter keys, but never run the values through Zod. A caller can pass `{ name: 'A'.repeat(10000) }` to `updateDepartmentAction` and it will bypass the whitelist check (the key `name` is allowed) and write directly to the DB with no length validation. The create actions have Zod schemas defined; the update actions should apply the same schemas to the supplied subset of fields.

**Fix:** Apply the existing `departmentCreateSchema.partial()` / `doctorCreateSchema.partial()` to the incoming `input` before the whitelist filter in update actions.

---

### WR-03: `updateHospitalInfoAction` applies no Zod validation to any field

**File:** `app/(portal)/actions/content.ts:643-678`

**Issue:** `updateHospitalInfoAction` whitelists fields but performs no length or format validation. Fields like `emergency_number`, `opd_timings`, `city`, `address_line1`, and `about_text` can be set to arbitrarily long strings (the client-side schema in `HospitalInfoClient.tsx` caps `about_text` at 1200 chars, but this is bypassed if the action is called directly). The `maps_embed_url` field gets no format validation on the server side at all.

**Fix:** Define and apply a server-side Zod schema in the action:

```typescript
const hospitalInfoUpdateSchema = z.object({
  about_text:       z.string().max(1200).optional(),
  opd_timings:      z.string().max(200).optional(),
  emergency_number: z.string().max(30).optional(),
  address_line1:    z.string().max(200).optional(),
  address_line2:    z.string().max(200).optional(),
  city:             z.string().max(100).optional(),
  maps_embed_url:   z.string().url().max(500).or(z.literal('')).optional(),
});
```

---

### WR-04: `lib/supabase/admin.ts` does not validate `NEXT_PUBLIC_SUPABASE_URL` — `createClient` called with `undefined!`

**File:** `lib/supabase/admin.ts:22`

**Issue:** The function checks `serviceRoleKey` for undefined and throws a helpful error. It does not check `url`. If `NEXT_PUBLIC_SUPABASE_URL` is missing from the environment, `createClient(undefined!, ...)` is called. The Supabase JS client will silently accept this and all subsequent DB calls will fail with cryptic network errors rather than a clear configuration error message.

**Fix:**
```typescript
if (!url) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL is not configured. ' +
    'Add it to .env.local.'
  );
}
```

---

### WR-05: `deleteDoctorAction` does not check for referential integrity with `patient_records.assigned_doctor_id`

**File:** `app/(portal)/actions/content.ts:264-278`

**Issue:** The `doctors` table has no `ON DELETE` constraint referenced from `patient_records` (that relationship is noted as Phase 8). If `patient_records` is introduced with a `REFERENCES doctors(id)` FK without `ON DELETE SET NULL` or `ON DELETE CASCADE`, deleting a doctor will fail at the DB level with a foreign key violation — which the action returns as a generic `'Unknown error'`. Even if the FK uses `ON DELETE SET NULL`, the action gives no warning that deleting a doctor will affect existing patient records.

**Fix:** Before deleting, query whether the doctor has any linked patient records and return a descriptive error if so, or document the expected FK behaviour in the migration for Phase 8 to prevent silent data corruption.

---

### WR-06: `getFeaturedDepartments` Step 1 query has no `.limit()` — full table can be returned

**File:** `lib/db/departments.ts:54-57`

**Issue:** The Step 1 featured query (which filters `is_featured = true`) has no `.limit()` call. If all departments are marked featured, the entire table is returned with no cap. The comment in WR-001 notes the fallback has a cap, but the primary path does not. For a small hospital this is unlikely to matter, but it's inconsistent with the stated intent of the cap.

**Fix:** Add `.limit(FEATURED_DEPARTMENTS_LIMIT)` to the Step 1 query, matching the pattern used in `getFeaturedDoctors` and `getFeaturedFacilities`.

---

## Info

### IN-01: `DOCTOR_CMS_COLUMNS` and `DOCTOR_PUBLIC_COLUMNS` are identical strings — dead constant

**File:** `lib/db/doctors.ts:25-31`

**Issue:** Both `DOCTOR_CMS_COLUMNS` and `DOCTOR_PUBLIC_COLUMNS` are defined with the same string value. The comment says they differ, but they don't. One of them is dead code. This is a maintenance trap — a future developer who edits one may not notice the other exists.

**Fix:** Remove `DOCTOR_PUBLIC_COLUMNS` and use `DOCTOR_CMS_COLUMNS` in `getFeaturedDoctors` and `getActiveDoctors`, or actually differentiate the column lists as the comment intends.

---

### IN-02: `MAX_FEATURED_DOCTORS` constant declared before the file-level `'use client'` directive pragma comment

**File:** `app/(portal)/content/doctors/DoctorsClient.tsx:3`

**Issue:** The file opens with `const MAX_FEATURED_DOCTORS = 3` on line 3, above the module comment and imports. While this compiles, the constant appears before any imports and is disconnected from the cap enforced in `content.ts` (which hard-codes `>= 3`). If the cap changes, it must be updated in two places.

**Fix:** Move the constant below the imports, and consider importing a shared `FEATURED_DOCTORS_CAP` constant from a shared location (e.g., `lib/portal/cms-constants.ts`) to keep client UI and server action in sync.

---

_Reviewed: 2026-06-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
