---
phase: 14
phase_name: media-infrastructure
status: issues_found
review_depth: standard
files_reviewed: 13
files_reviewed_list:
  - app/(portal)/actions/content.ts
  - app/(portal)/actions/media.ts
  - app/(portal)/content/departments/DepartmentsClient.tsx
  - app/(portal)/content/doctors/DoctorsClient.tsx
  - app/(portal)/content/facilities/FacilitiesClient.tsx
  - app/(portal)/media/MediaClient.tsx
  - app/(portal)/media/page.tsx
  - app/[locale]/(public)/page.tsx
  - components/public/DepartmentCard.tsx
  - components/public/DoctorCard.tsx
  - components/public/FacilityCard.tsx
  - lib/db/facilities.ts
  - lib/db/hospital-info.ts
  - lib/portal/roles.ts
findings:
  critical: 4
  warning: 6
  info: 3
  total: 13
---

# Phase 14: Code Review Report

**Reviewed:** 2026-06-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Reviewed media infrastructure (upload/delete actions), content CRUD actions, public card
components, portal client components, and DB helpers. Auth gating is solid — `requireCmsRole()`
is the first call in all write paths and uses `getUser()` (server-validated). The file upload
pipeline has a correct MIME allowlist and size cap.

Four critical issues were found:

1. MIME type validation relies on the client-supplied `file.type` field, which is trivially
   spoofable — a user can upload a PHP/HTML file by faking the MIME header.
2. `updateHospitalInfoAction` and `updateFacilityAction` spread the raw `input` object directly
   into the Supabase `.update()` call, bypassing the field-whitelisting pattern used for every
   other entity.
3. `deleteImageAction` accepts a caller-supplied `storedUrl` and uses it to derive a Storage
   object path. A malicious authenticated admin can delete arbitrary objects from the `media`
   bucket by crafting the URL.
4. `media/page.tsx` passes an empty-string `hospitalInfoId` when `info` is null, causing
   `uploadImageAction` to write with `.eq('id', '')` — silently matching no rows while still
   uploading the file to Storage, leaving an orphaned blob.

---

## Critical Issues

### CR-001 — MIME type validation relies on client-supplied `file.type` (spoofable)

**Severity:** Critical
**File:** `app/(portal)/actions/media.ts:134`
**Issue:** The MIME allowlist check (`ALLOWED_TYPES.includes(file.type)`) uses the `type`
property of the browser `File` object, which is derived from the filename extension and HTTP
`Content-Type` header — both fully controlled by the client. An authenticated admin can rename
`exploit.html` to `exploit.jpg`, set `Content-Type: image/jpeg`, and the server will accept,
upload, and serve it. Because the Supabase Storage bucket is public (per phase notes), the
uploaded HTML file is publicly accessible and could be used for phishing or credential
harvesting attacks served from the hospital's own domain.

**Fix:** Read the first few bytes of the file buffer and validate the magic bytes before
accepting upload:

```typescript
// Step 2b — magic-byte validation (replaces sole reliance on file.type)
const headerBytes = new Uint8Array(bytes.slice(0, 12));
const isJpeg = headerBytes[0] === 0xFF && headerBytes[1] === 0xD8;
const isPng  = headerBytes[0] === 0x89 && headerBytes[1] === 0x50;
const isWebp = String.fromCharCode(...headerBytes.slice(0, 4)) === 'RIFF' &&
               String.fromCharCode(...headerBytes.slice(8, 12)) === 'WEBP';

if (!isJpeg && !isPng && !isWebp) {
  return { error: 'File content does not match an allowed image format.' };
}
```

This check must happen after `file.arrayBuffer()` (Step 5) and before the Storage upload
(Step 6).

---

### CR-002 — `updateHospitalInfoAction` spreads raw `input` without field whitelisting

**Severity:** Critical
**File:** `app/(portal)/actions/content.ts:579`
**Issue:** `updateHospitalInfoAction` calls:
```typescript
.update({ ...input, updated_at: new Date().toISOString() })
```
The `input` parameter is typed as `Partial<{...}>` but TypeScript types are erased at runtime.
A caller can pass extra fields (e.g. `{ id: '...', role: 'super_admin' }`) which will be
spread into the Supabase update payload. Because the admin client bypasses RLS, any column on
the `hospital_info` row can be overwritten — including the primary key. This is a privilege
escalation / data corruption vector for any code path that reaches this action with untrusted
input. The same pattern was already fixed for departments, doctors (using `ALLOWED_FIELDS`
filtering) but was missed here and in `updateFacilityAction` (line 276).

**Fix:** Add an allowlist, mirroring the pattern from `updateDepartmentAction`:

```typescript
const HOSPITAL_INFO_ALLOWED_FIELDS = [
  'about_text', 'opd_timings', 'emergency_number',
  'address_line1', 'address_line2', 'city', 'maps_embed_url',
] as const;

// In updateHospitalInfoAction:
const cleaned = Object.fromEntries(
  Object.entries(input).filter(
    ([k]) => HOSPITAL_INFO_ALLOWED_FIELDS.includes(k as typeof HOSPITAL_INFO_ALLOWED_FIELDS[number])
  )
);
// Then: .update({ ...cleaned, updated_at: new Date().toISOString() })
```

Apply the same fix to `updateFacilityAction` at line 276:

```typescript
const FACILITY_ALLOWED_FIELDS = ['name', 'description', 'category', 'image_url'] as const;
const cleaned = Object.fromEntries(
  Object.entries(input).filter(
    ([k]) => FACILITY_ALLOWED_FIELDS.includes(k as typeof FACILITY_ALLOWED_FIELDS[number])
  )
);
```

---

### CR-003 — `deleteImageAction` allows deletion of arbitrary Storage objects via crafted URL

**Severity:** Critical
**File:** `app/(portal)/actions/media.ts:210-222`
**Issue:** `deleteImageAction` accepts `storedUrl: string` from the caller and parses it to
derive the Storage object path:
```typescript
const marker = '/object/public/media/';
const idx = urlObj.pathname.indexOf(marker);
if (idx !== -1) {
  storagePath = urlObj.pathname.slice(idx + marker.length);
}
```
The derived `storagePath` is then passed directly to `admin.storage.from('media').remove()`.
An authenticated admin can pass a crafted `storedUrl` such as:
`https://supabase.co/object/public/media/doctors/some-other-doctors-photo.jpg`
to delete any file in the `media` bucket regardless of which entity they are editing. This is
an object-level authorization bypass — the action verifies the caller's role but never verifies
that the `entityId` actually owns the URL being deleted.

**Fix:** Look up the current URL value from the DB using `entityId` and `column` instead of
trusting the caller-supplied `storedUrl`:

```typescript
// Replace caller-supplied storedUrl with a server-side DB lookup
const { data: row } = await admin
  .from(table)
  .select(column)
  .eq('id', entityId)
  .single();
const storedUrl: string | null = row?.[column] ?? null;
if (!storedUrl) return {}; // nothing to delete
```

Then proceed with the existing path extraction logic using the DB-sourced URL.

---

### CR-004 — `media/page.tsx` passes empty `hospitalInfoId` when record is missing

**Severity:** Critical
**File:** `app/(portal)/media/page.tsx:17`
**Issue:**
```typescript
hospitalInfoId={info?.id ?? ''}
```
When `getHospitalInfo()` returns `null` (DB error or missing row), `hospitalInfoId` is `''`.
In `uploadImageAction`, the DB update step becomes:
```typescript
.update({ [column]: publicUrl }).eq('id', '')
```
This matches zero rows (silently succeeds with Supabase). The file has already been uploaded to
Storage at this point (Step 6 completed before Step 8). The result is an orphaned Storage
object with no DB reference — storage leak on every upload attempt when hospital_info is not
seeded. Additionally, `heroImageUrl` is `null`, so the upload button is shown but upload
silently fails to persist.

**Fix:** Render an error state instead of rendering `MediaClient` when `info` is null:

```typescript
export default async function MediaPage() {
  const info = await getHospitalInfo();

  if (!info) {
    return (
      <div className="p-6">
        <p className="text-destructive text-sm">
          Hospital info record not found. Please seed the database before managing media.
        </p>
      </div>
    );
  }

  return <MediaClient heroImageUrl={info.hero_image_url} hospitalInfoId={info.id} />;
}
```

---

## Warnings

### WR-001 — `updateDoctorAction` filter incorrectly drops `false` and `0` values

**Severity:** Warning
**File:** `app/(portal)/actions/content.ts:197-200`
**Issue:** The field filter uses `v !== ''` as the guard condition:
```typescript
Object.entries(input).filter(
  ([k, v]) => DOCTOR_ALLOWED_FIELDS.includes(...) && v !== ''
)
```
When `is_active` is `false` or `availability_days` is `[]`, the value `false` and `[]`
pass the `!== ''` check — that is fine. However, if `is_active` is explicitly set to
`false`, it survives. The real problem is `[]` (empty array): `[] !== ''` is true so an
empty availability array is included. This is likely intended, but the filter also silently
drops numeric `0` values (if `featured_order` were ever added here) since `0 !== ''` is
true but `null !== ''` is also true, meaning explicit `null` clears would pass through.
The larger bug: if a caller wants to clear `bio` by sending `bio: ''`, the filter drops it
(because `'' !== ''` is false), so the empty string can never be saved. A user cannot erase
a doctor's bio once it is set.

**Fix:** Use explicit allowlist membership as the only guard, and handle clearing separately:

```typescript
const cleaned = Object.fromEntries(
  Object.entries(input).filter(
    ([k]) => DOCTOR_ALLOWED_FIELDS.includes(k as typeof DOCTOR_ALLOWED_FIELDS[number])
  )
);
```

The same bug exists in `updateDepartmentAction` (line 100) — description or name cannot be
cleared to an empty string either (though for name/description empty string is rightly invalid;
the client-side schema already enforces min(1), so this is lower risk there).

---

### WR-002 — Stale `featuredState` after new department/doctor is added via dialog

**Severity:** Warning
**File:** `app/(portal)/content/departments/DepartmentsClient.tsx:85-90`
**Issue:** `featuredState` is initialized once in `useState` from `initialData` at mount time.
When a new department is created and `router.refresh()` re-fetches server data, React re-renders
with the updated `initialData` prop, but `useState` only uses the initializer on the first
render. The new department's ID is absent from `featuredState`. Line 236 falls back to:
```typescript
const fs = featuredState[dept.id] ?? { isFeatured: false, order: 0 }
```
So the featured Switch will always display as OFF for a newly added department even if it was
featured at DB level. The same pattern exists in `DoctorsClient.tsx` (line 92) and
`FacilitiesClient.tsx` (line 95).

**Fix:** Derive featured state from `initialData` on every render instead of storing it in
`useState`, or add a `useEffect` that resets `featuredState` when `initialData` changes:

```typescript
// Replace useState with useMemo so it recalculates on initialData change:
const featuredState = useMemo(
  () => Object.fromEntries(
    initialData.map((d) => [d.id, { isFeatured: d.is_featured ?? false, order: d.featured_order ?? 0 }])
  ),
  [initialData]
);
```

Note: with `useMemo`, optimistic updates to `featuredState` need a separate override state
layered on top, or the optimistic pattern needs restructuring.

---

### WR-003 — `FacilitiesClient` silently swallows `setFeaturedOrder` errors

**Severity:** Warning
**File:** `app/(portal)/content/facilities/FacilitiesClient.tsx:305`
**Issue:** The `onBlur` handler for the order input in `FacilitiesClient` calls:
```typescript
await setFeaturedOrder('facilities', facility.id, val);
```
without checking `result.error` and without showing a toast on failure. In contrast,
`DepartmentsClient` (line 295) and `DoctorsClient` (line 344) both check
`if (result?.error) toast.error(...)`. Silent failures leave the user with no feedback and a
stale UI value.

**Fix:**
```typescript
onBlur={async (e) => {
  if (e.target.value === '') return;
  const val = Number(e.target.value);
  if (isNaN(val) || val === (facility.featured_order ?? 0)) return;
  const result = await setFeaturedOrder('facilities', facility.id, val);
  if (result?.error) toast.error('Could not save order');
}}
```

---

### WR-004 — `getFeaturedFacilities` fetches all rows then filters in JS

**Severity:** Warning
**File:** `lib/db/facilities.ts:49-62`
**Issue:** `getFeaturedFacilities` fetches all facilities rows unconditionally, then applies
`rows.filter((row) => row.is_featured)` in JavaScript. As the facilities table grows this
transfers all rows over the network even though only a few featured rows are needed. More
critically: the fallback "return all rows" path has no limit, so if no facilities are featured
the public homepage will render every facility record regardless of count — potentially hundreds
of rows on a card grid with no pagination, which is a rendering correctness issue.

**Fix:** Use two separate queries or add a DB-level filter + limit:
```typescript
// Primary: try to get featured rows
const { data: featured } = await supabase
  .from('facilities')
  .select('id, name, description, category, image_url, is_featured, featured_order, created_at, updated_at')
  .eq('is_featured', true)
  .order('featured_order', { ascending: true })
  .order('created_at', { ascending: true })
  .limit(6);

if (featured && featured.length > 0) return featured as Facility[];

// Fallback: return up to 6 unfeatured rows
const { data: all } = await supabase
  .from('facilities')
  .select('id, name, description, category, image_url, is_featured, featured_order, created_at, updated_at')
  .order('created_at', { ascending: true })
  .limit(6);
return (all ?? []) as Facility[];
```

---

### WR-005 — `select('*')` on `facilities` and `hospital_info` over-fetches columns

**Severity:** Warning
**File:** `lib/db/facilities.ts:30`, `lib/db/hospital-info.ts:28`
**Issue:** Both DB helpers use `.select('*')` which fetches every column including internal
timestamps and future columns. If the schema grows (audit logs, soft-delete flags, sensitive
fields), this data will be transmitted to the public homepage server component automatically.
The `Facility` interface already documents the expected fields — selecting them explicitly
also enables PostgREST to optimize the query plan and prevents type drift.

**Fix:** Replace `select('*')` with explicit column lists matching the interface:

```typescript
// facilities.ts
.select('id, name, description, category, image_url, is_featured, featured_order, created_at, updated_at')

// hospital-info.ts
.select('id, about_text, opd_timings, emergency_number, address_line1, address_line2, city, maps_embed_url, hero_image_url, updated_at')
```

---

### WR-006 — `createTestimonialAction` inserts `input` fields directly instead of `parsed.data`

**Severity:** Warning
**File:** `app/(portal)/actions/content.ts:465-471`
**Issue:** After Zod validates the input:
```typescript
const parsed = testimonialSchema.safeParse(input);
if (!parsed.success) { return { error: ... }; }
```
the insert uses the original `input` object:
```typescript
patient_name: input.patient_name,
quote: input.quote,
...
is_active: input.is_active,
sort_order: input.sort_order,
```
rather than `parsed.data`. The schema coerces `sort_order` with `z.coerce.number()`, so if a
string like `"5"` arrives, `input.sort_order` is still a string but `parsed.data.sort_order`
is the coerced number `5`. Inserting the raw `input.sort_order` string into a numeric column
may fail silently or cause a Supabase type error at runtime. `updateTestimonialAction`
(line 500) has the same pattern.

**Fix:** Use `parsed.data` for all insert/update fields:
```typescript
const { error } = await createAdminClient().from('testimonials').insert({
  patient_name: parsed.data.patient_name,
  quote: parsed.data.quote,
  designation: parsed.data.designation ?? null,
  is_active: input.is_active,       // not in schema — kept from input
  sort_order: parsed.data.sort_order,
});
```
Add `is_active` to `testimonialSchema` so all fields flow through `parsed.data`.

---

## Info

### IN-001 — `requireCmsRole` is duplicated verbatim across two modules

**Severity:** Info
**File:** `app/(portal)/actions/media.ts:22-44`, `app/(portal)/actions/content.ts:41-63`
**Issue:** The function body is identical. The comment on line 21 of `media.ts` says "Copied
verbatim from content.ts." Two copies means any future security change (e.g. adding MFA check,
changing the role list) must be made in two places.

**Fix:** Extract to `lib/portal/auth.ts` and import in both action files:
```typescript
// lib/portal/auth.ts
export async function requireCmsRole() { ... }
```

---

### IN-002 — `revalidateByFolder` and `revalidateByTable` in `media.ts` are near-identical

**Severity:** Info
**File:** `app/(portal)/actions/media.ts:50-98`
**Issue:** Both functions switch on entity type and revalidate the same route sets. The only
difference is the `hospital_info` case. This is duplicated logic that could be a single
function.

**Fix:** Merge into one helper or pass an array of paths to revalidate.

---

### IN-003 — `MediaClient` hero image uses `alt=""` (decorative) but is the primary visual element

**Severity:** Info
**File:** `app/(portal)/media/MediaClient.tsx:123`
**Issue:** The preview `<Image>` renders with `alt=""`, which marks it as decorative and hides
it from screen readers. This is the portal admin preview — sighted-admin-only context where
seeing the image is the purpose. An empty `alt` is technically acceptable here as it is a
management preview, not primary content. However the public homepage hero at
`app/[locale]/(public)/page.tsx:65` also uses `alt=""` for the hero background image, which
may be flagged by accessibility audits. If it serves as a meaningful visual for sighted
visitors (brand, context), a short description like `alt="Hospital exterior"` is preferable.

**Fix (public page):**
```tsx
<Image src={heroImageUrl} alt="Atmaram hospital" fill ... />
```

---

_Reviewed: 2026-06-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
