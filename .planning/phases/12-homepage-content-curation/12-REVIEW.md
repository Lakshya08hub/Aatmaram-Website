---
phase: 12
phase_name: homepage-content-curation
status: issues_found
review_depth: standard
files_reviewed: 9
files_reviewed_list:
  - app/(portal)/actions/content.ts
  - app/(portal)/content/departments/DepartmentsClient.tsx
  - app/(portal)/content/doctors/DoctorsClient.tsx
  - app/(portal)/content/facilities/FacilitiesClient.tsx
  - app/[locale]/(public)/page.tsx
  - components/public/FacilityCard.tsx
  - lib/db/departments.ts
  - lib/db/doctors.ts
  - lib/db/facilities.ts
findings:
  critical: 3
  warning: 7
  info: 4
  total: 14
---

# Phase 12: Code Review Report

**Reviewed:** 2026-06-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

This phase implements homepage content curation: featured toggles, sort ordering, and public-facing display cards for departments, doctors, and facilities. The auth/role gating in server actions is solid. The core failures are: (1) the `toggleFeatured` action swallows the `Forbidden` error thrown by `requireCmsRole()` and returns it as an `error` string — callers cannot distinguish auth failures from business errors, and the redirect inside `requireCmsRole()` will never fire if the caller catches first; (2) `getFeaturedFacilities` applies `.limit()` before filtering out non-featured rows in JS, which silently truncates the featured set when the table has exactly 8 rows interleaved; (3) `getFeaturedDepartments` and `getFeaturedDoctors` have no row cap on the fallback path and will dump the entire table to the public homepage; (4) `createDepartmentAction` and `createDoctorAction` accept raw user input without Zod validation while `createTestimonialAction` does validate — inconsistent and leaves name/description fields unvalidated server-side.

---

## Critical Issues

### CR-001 — `requireCmsRole` redirect is swallowed by the surrounding try/catch in every action

**Severity:** Critical
**File:** `app/(portal)/actions/content.ts:86-88` (and every other action catch block)

**Issue:** `requireCmsRole()` calls `redirect('/login')` when there is no session, but Next.js `redirect()` works by throwing a special error internally. Every action wraps `requireCmsRole()` in a `try/catch` that returns `{ error: err.message }`. This means the redirect exception is caught and converted to `{ error: 'NEXT_REDIRECT' }` instead of actually redirecting the user. An unauthenticated caller receives `{ error: 'NEXT_REDIRECT' }` in the response rather than being sent to /login. The `Forbidden` throw is also swallowed the same way, meaning auth failures silently become normal error returns indistinguishable from DB errors.

**Fix:** Re-throw Next.js navigation errors before the generic catch handles them. The pattern recommended by Next.js docs:

```typescript
import { isRedirectError } from 'next/dist/client/components/redirect';

// inside every action's catch block:
} catch (err) {
  if (isRedirectError(err)) throw err; // let Next.js handle the redirect
  return { error: err instanceof Error ? err.message : 'Unknown error' };
}
```

Apply this to every action that calls `requireCmsRole()`.

---

### CR-002 — `getFeaturedFacilities` limit applied before JS filter, silently truncating featured set

**Severity:** Critical
**File:** `lib/db/facilities.ts:64-77`

**Issue:** The query fetches rows ordered `is_featured DESC, featured_order ASC` and applies `.limit(FEATURED_FACILITIES_LIMIT)` (8) at the DB level. It then filters in JS: if any row `is_featured`, return only those. If the facilities table has ≥ 8 rows where some unfeatured rows sort before featured ones (e.g. `featured_order` column is 0 for all), the DB will return 8 rows that may not include all featured ones. The is_featured DESC ordering mitigates this partially but does not eliminate it when featured rows have higher `featured_order` values than unfeatured rows. More concretely: if there are 8 unfeatured facilities with `featured_order = 0` and 2 featured facilities with `featured_order = 5`, the featured rows never reach the JS filter. The public homepage silently falls back to the 8 unfeatured rows.

**Fix:** Run two separate queries (as `getFeaturedDepartments` does): first query only featured rows; if none, run a capped fallback.

```typescript
export async function getFeaturedFacilities(): Promise<Facility[]> {
  const supabase = await createClient();

  const { data: featured, error: featuredErr } = await supabase
    .from('facilities')
    .select(FACILITY_PUBLIC_COLUMNS)
    .eq('is_featured', true)
    .order('featured_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (featuredErr) throw new Error(featuredErr.message);
  if (featured && featured.length > 0) return featured as Facility[];

  const { data: fallback, error: fallbackErr } = await supabase
    .from('facilities')
    .select(FACILITY_PUBLIC_COLUMNS)
    .order('created_at', { ascending: true })
    .limit(FEATURED_FACILITIES_LIMIT);

  if (fallbackErr) throw new Error(fallbackErr.message);
  return (fallback ?? []) as Facility[];
}
```

---

### CR-003 — `createDepartmentAction` and `createDoctorAction` have no server-side input validation

**Severity:** Critical
**File:** `app/(portal)/actions/content.ts:69-89` (departments), `150-178` (doctors)

**Issue:** `createTestimonialAction` (line 467) validates input with a Zod schema before inserting. `createDepartmentAction` and `createDoctorAction` insert `input.name`, `input.description`, `input.full_name`, `input.specialization`, `input.qualification` directly with no server-side length or content validation. A CMS user (or a request crafted to bypass the client form) can insert strings of arbitrary length (megabytes), exceeding DB column constraints and causing unhandled DB errors, or inserting empty strings that bypass the client's Zod `min(1)` guard. The client-side Zod schema is not a security boundary.

**Fix:** Add Zod schemas and validate in the action before insert, matching the pattern already used in `createTestimonialAction`:

```typescript
const departmentCreateSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(500),
  image_url: z.string().url().optional().or(z.literal('')),
});

export async function createDepartmentAction(input: { ... }) {
  try {
    await requireCmsRole();
    const parsed = departmentCreateSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    // use parsed.data for insert
  }
}
```

Apply the same pattern for `createDoctorAction` and `updateDepartmentAction`/`updateDoctorAction`.

---

## Warnings

### WR-001 — `getFeaturedDepartments` and `getFeaturedDoctors` have no fallback row cap

**Severity:** Warning
**File:** `lib/db/departments.ts:56-62`, `lib/db/doctors.ts:47-59`

**Issue:** When no rows are featured, both functions return the entire table to the public homepage with no `.limit()`. A hospital with 50 departments and 30 doctors will transfer all rows to every public homepage render. `getFeaturedFacilities` explicitly documents `FEATURED_FACILITIES_LIMIT` for this reason; the other two helpers lack it.

**Fix:** Add a cap on the fallback query in both helpers:

```typescript
// departments.ts fallback path
.select('*')
.order('created_at', { ascending: true })
.limit(8); // mirror the featured cap

// doctors.ts — getFeaturedDoctors fallback is inline filter;
// apply limit before returning `rows` when hasFeatured is false
return hasFeatured ? rows.filter((r) => r.is_featured) : rows.slice(0, 3);
```

---

### WR-002 — `updateDepartmentAction` silently drops empty string values from partial update

**Severity:** Warning
**File:** `app/(portal)/actions/content.ts:100-102`

**Issue:** The department update filter excludes entries where `v === ''`. This means an admin cannot intentionally clear `image_url` by sending an empty string — the field is silently ignored, which is inconsistent with what the comment in `updateDoctorAction` line 183 says about optional fields allowing empty strings to be cleared. The facility update (line 290) correctly uses `v !== undefined` to allow empty string clears.

**Fix:** Change the filter condition for `updateDepartmentAction` to match the facility pattern:

```typescript
Object.entries(input).filter(
  ([k, v]) =>
    DEPARTMENT_ALLOWED_FIELDS.includes(k as ...) &&
    v !== undefined   // allow '' to clear optional fields
)
```

---

### WR-003 — `setFeaturedOrder` does not update `updated_at`

**Severity:** Warning
**File:** `app/(portal)/actions/content.ts:427-429`

**Issue:** `toggleFeatured` similarly does not set `updated_at` (line 396). All other update actions (`updateDepartmentAction`, `updateFacilityAction`, etc.) set `updated_at: new Date().toISOString()`. Featured toggle and order changes leave the `updated_at` column stale, making audit trail/cache invalidation based on that column unreliable.

**Fix:**

```typescript
const { error } = await createAdminClient()
  .from(table)
  .update({ featured_order: order, updated_at: new Date().toISOString() })
  .eq('id', id);
```

Apply the same to `toggleFeatured` (line 396).

---

### WR-004 — `getDepartments` and `getDoctors` use `select('*')` in portal CMS queries

**Severity:** Warning
**File:** `lib/db/departments.ts:26`, `lib/db/doctors.ts:29`

**Issue:** The portal admin queries use `select('*')` which over-fetches all columns. For `doctors`, this includes `staff_user_id` which is a join key to the staff profiles table. While the portal is internal-only, over-fetching sensitive join columns is unnecessary and could leak data through unintended serialization (e.g. if the data were ever forwarded to a client component via `initialData` prop). `getFacilities()` already uses the explicit `FACILITY_COLUMNS` constant as an example of the correct pattern.

**Fix:** Define explicit column lists as constants and use them in the portal queries, mirroring the pattern in `lib/db/facilities.ts:22-23`.

---

### WR-005 — `FACILITY_PUBLIC_COLUMNS` is identical to `FACILITY_COLUMNS` — no columns are actually excluded

**Severity:** Warning
**File:** `lib/db/facilities.ts:22-27`

**Issue:** Lines 22-27 define two separate constants (`FACILITY_COLUMNS` and `FACILITY_PUBLIC_COLUMNS`) with a comment saying the public path returns "only display fields needed." But both strings are identical — all 9 columns including `is_featured`, `featured_order`, `created_at`, `updated_at` are returned to the public homepage. This is misleading and the stated intent (limiting public exposure) is not achieved.

**Fix:** Reduce `FACILITY_PUBLIC_COLUMNS` to only what `FacilityCard` needs:

```typescript
const FACILITY_PUBLIC_COLUMNS = 'id, name, description, category, image_url';
```

---

### WR-006 — `FacilitiesClient` missing `overflow-x-auto` wrapper on table

**Severity:** Warning
**File:** `app/(portal)/content/facilities/FacilitiesClient.tsx:250`

**Issue:** `DepartmentsClient` (line 235) and `DoctorsClient` (line 275) both wrap the `<Table>` in a `<div className="overflow-x-auto">`. `FacilitiesClient` renders `<Table>` directly inside the card `<div>` at line 250 without the overflow wrapper. On narrow viewports the facilities table will overflow its container and cause horizontal scroll on the page rather than within the card.

**Fix:**

```tsx
<div className="overflow-x-auto">
  <Table>
    {/* ... */}
  </Table>
</div>
```

---

### WR-007 — `toggleFeatured` does not revert optimistic state on network/unexpected error in all three client components

**Severity:** Warning
**File:** `app/(portal)/content/departments/DepartmentsClient.tsx:271-283`, `DoctorsClient.tsx:319-332`, `FacilitiesClient.tsx:279-292`

**Issue:** The optimistic toggle in all three clients correctly reverts state when `result.error` is truthy. However, if `toggleFeatured` throws an unhandled exception (network failure, Next.js runtime error), the `await toggleFeatured(...)` call will throw and the `onCheckedChange` callback has no try/catch. The optimistic state is never reverted — the UI shows the switch in the new position permanently even though the DB write failed.

**Fix:** Wrap the `onCheckedChange` async body in try/catch and revert on exception:

```tsx
onCheckedChange={async (checked) => {
  setFeaturedState((prev) => ({ ...prev, [dept.id]: { ...prev[dept.id], isFeatured: checked } }));
  try {
    const result = await toggleFeatured('departments', dept.id, checked);
    if (result.error) {
      toast.error(result.error);
      setFeaturedState((prev) => ({ ...prev, [dept.id]: { ...prev[dept.id], isFeatured: !checked } }));
    }
  } catch {
    toast.error('Could not update featured status');
    setFeaturedState((prev) => ({ ...prev, [dept.id]: { ...prev[dept.id], isFeatured: !checked } }));
  }
}}
```

---

## Info

### IN-001 — `MAX_FEATURED_DEPARTMENTS` / `MAX_FEATURED_DOCTORS` constants declared before module comment

**Severity:** Info
**File:** `app/(portal)/content/departments/DepartmentsClient.tsx:3`, `DoctorsClient.tsx:3`

**Issue:** The `const MAX_FEATURED_DEPARTMENTS = 8` and `const MAX_FEATURED_DOCTORS = 3` declarations appear on line 3, before the file-header comment on line 4. This is an unusual ordering that will confuse editors showing file outlines. More importantly, these client-side caps are not sourced from the same place as the server-side caps in `actions/content.ts` (lines 385, 378). If the cap is changed server-side, the client counter display will silently show the wrong limit.

**Fix:** Move the constants after the module comment. Extract the cap values into a shared constants file (e.g. `lib/portal/content-limits.ts`) and import from both the server action and the client component.

---

### IN-002 — `homepage` `metadata` export is a static object but page is `force-dynamic`

**Severity:** Info
**File:** `app/[locale]/(public)/page.tsx:29-33`

**Issue:** The page exports `export const dynamic = 'force-dynamic'` (line 23) and a static `metadata` object (line 29). The static `metadata` will always render the same English title and description regardless of locale (`'Atmaram Child Care and Critical Care — Kanpur'`). For the Hindi locale (`/hi`) the page title and description should be in Hindi. The page should use `generateMetadata` instead to return locale-appropriate strings via `getTranslations`.

**Fix:** Replace the static `metadata` export with:

```typescript
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'home' });
  return {
    title: t('meta.title'),
    description: t('meta.description'),
  };
}
```

---

### IN-003 — Hero image `alt` is empty string in page.tsx

**Severity:** Info
**File:** `app/[locale]/(public)/page.tsx:65`

**Issue:** The hero `<Image>` uses `alt=""`, which is correct for a decorative background image and acceptable per WCAG (presentational images should have empty alt). However the hero text content is layered over the image using absolute positioning; screen readers will skip the image. This is actually fine — just noting it is intentional, not an oversight, so it should be documented with a comment.

**Fix:** Add an inline comment:

```tsx
{/* alt="" is intentional — this is a decorative background image; content is in the text overlay */}
<Image src={heroImageUrl} alt="" fill ... />
```

---

### IN-004 — `FACILITY_PUBLIC_COLUMNS` constant is unused in its current form

**Severity:** Info
**File:** `lib/db/facilities.ts:26-27`

**Issue:** Because `FACILITY_PUBLIC_COLUMNS` is identical to `FACILITY_COLUMNS`, maintaining two identically-valued constants adds dead weight. Until WR-005 is fixed (making them actually differ), consider collapsing to one constant to avoid the false sense of column restriction.

**Fix:** Either fix WR-005 (preferred) or remove `FACILITY_PUBLIC_COLUMNS` and use `FACILITY_COLUMNS` in `getFeaturedFacilities` until the distinction is meaningful.

---

_Reviewed: 2026-06-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
