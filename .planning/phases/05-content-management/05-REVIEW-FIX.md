---
phase: 5
fixed_at: 2026-06-20T00:00:00Z
review_path: .planning/phases/05-content-management/05-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 8
skipped: 2
status: partial
---

# Phase 5: Code Review Fix Report

**Fixed at:** 2026-06-20
**Source review:** .planning/phases/05-content-management/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 10 (4 Critical + 6 Warning)
- Fixed: 8
- Skipped: 2

## Fixed Issues

### CR-01: iframe injection via `maps_embed_url`

**Files modified:** `app/[locale]/(public)/contact/page.tsx`
**Commit:** pre-existing fix
**Applied fix:** Already fixed before this review-fix run. Lines 39-40 of contact/page.tsx already validate `rawMapsUrl` against `/^https:\/\/www\.google\.com\/maps\/embed\?/` before assigning `mapsEmbedUrl`. An invalid or missing URL results in the placeholder fallback being rendered — the iframe never receives an arbitrary URL. The `sandbox` attribute and server-side validation in the action were added via the WR-03 fix (maps_embed_url Zod validation). No code change needed here.

---

### CR-02: `createDoctorAction` bypasses Zod for most fields

**Files modified:** `app/(portal)/actions/content.ts`
**Commit:** 9d93237
**Applied fix:** Expanded `doctorCreateSchema` to include `specialization`, `qualification`, `photo_url` (with `.url()` check), `availability_days` (array with per-element `max(20)` and array `max(7)`), and `is_active`. Changed the insert to use `parsed.data.*` exclusively for all fields — no raw `input` references remain in the insert call.

---

### CR-03: `createFacilityAction` has no Zod validation

**Files modified:** `app/(portal)/actions/content.ts`
**Commit:** 9d93237
**Applied fix:** Added `facilityCreateSchema` with `name` (min 2, max 100), `description` (max 500), `category` (z.enum over the 5 valid values), and `image_url` (optional URL, max 500). Applied `safeParse` before the insert; insert now uses `parsed.data.*` only.

---

### CR-04: `HospitalInfo` declares `hero_image_url` but migration has no such column

**Files modified:** `lib/db/hospital-info.ts`
**Commit:** 570c00e
**Applied fix:** Removed `hero_image_url: string | null` from the `HospitalInfo` interface and removed `hero_image_url` from the `.select()` string. The column does not exist in the migration; the cast was silently returning `undefined` typed as `string | null`.

---

### WR-02: `updateDepartmentAction` and `updateDoctorAction` do not validate field values

**Files modified:** `app/(portal)/actions/content.ts`
**Commit:** 9d93237
**Applied fix:** Applied `departmentCreateSchema.partial().safeParse(input)` in `updateDepartmentAction` and `doctorCreateSchema.partial().safeParse(input)` (via `parsedUpdate`) in `updateDoctorAction`. The whitelist filter now operates on `parsed.data` / `parsedUpdate.data` rather than raw `input`, so length caps from the create schemas are enforced on updates too.

---

### WR-03: `updateHospitalInfoAction` applies no Zod validation

**Files modified:** `app/(portal)/actions/content.ts`
**Commit:** 9d93237
**Applied fix:** Added `hospitalInfoUpdateSchema` with per-field `max()` caps and a `maps_embed_url` validator (`z.string().url().max(500).or(z.literal(''))`). Applied `safeParse` before the whitelist filter; the cleaned object is now built from `parsed.data` rather than raw `input`.

---

### WR-04: `createAdminClient` does not validate `NEXT_PUBLIC_SUPABASE_URL`

**Files modified:** `lib/supabase/admin.ts`
**Commit:** f3aaa50
**Applied fix:** Added `if (!url) { throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured. Add it to .env.local.'); }` before the existing `serviceRoleKey` check. The `url!` non-null assertion is now backed by an explicit guard.

---

### WR-06: `getFeaturedDepartments` Step 1 query has no `.limit()`

**Files modified:** `lib/db/departments.ts`
**Commit:** c1ea8a3
**Applied fix:** Added `.limit(FEATURED_DEPARTMENTS_LIMIT)` to the Step 1 featured query (the `is_featured = true` path), making it consistent with the fallback path and with `getFeaturedDoctors` / `getFeaturedFacilities`.

---

## Skipped Issues

### WR-01: `requireCmsRole` dual control-flow (redirect vs thrown Error) is fragile

**File:** `app/(portal)/actions/content.ts:73-75`
**Reason:** Advisory/design finding — no mechanical fix. The review recommends either (a) removing `redirect` from inside `requireCmsRole` and returning early in callers, or (b) documenting the pattern. Option (a) is a larger refactor touching every action's call site; option (b) is a documentation change. All catch blocks already correctly re-throw redirect errors (`if (isRedirectError(err)) throw err`), so there is no current bug — the risk is future-developer confusion. Skipped to avoid refactoring scope; the pattern should be addressed in a dedicated cleanup phase.

---

### WR-05: `deleteDoctorAction` does not check referential integrity with `patient_records`

**File:** `app/(portal)/actions/content.ts:264-278`
**Reason:** Phase 8 dependency. The `patient_records` table and its FK to `doctors.id` do not exist yet. Adding a pre-delete referential check now would reference a non-existent table and fail at runtime. This finding should be revisited when Phase 8 (patient records) is implemented — the FK `ON DELETE` behavior and the pre-delete guard should be designed together.

---

_Fixed: 2026-06-20_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
