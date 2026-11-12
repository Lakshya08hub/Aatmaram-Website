---
phase: 14
fixed_at: 2026-06-20T06:53:35.601Z
review_path: .planning/phases/14-media-infrastructure/14-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 14: Code Review Fix Report

**Fixed at:** 2026-06-20T06:53:35.601Z
**Source review:** .planning/phases/14-media-infrastructure/14-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 9
- Fixed: 9
- Skipped: 0

## Fixed Issues

### CR-001: MIME type spoofable via client-supplied `file.type`

**Files modified:** `app/(portal)/actions/media.ts`
**Commit:** 354b7fd
**Applied fix:** Added `ALLOWED_SIGNATURES` map and `validateMagicBytes()` helper. After `file.arrayBuffer()`, the first 8 bytes are checked against known magic bytes for jpeg/png/webp. Returns `{ error: 'File content does not match the declared file type.' }` on mismatch, before any Storage upload occurs.

### CR-002: Raw `input` spread in `updateHospitalInfoAction` and `updateFacilityAction`

**Files modified:** `app/(portal)/actions/content.ts`
**Commit:** e081ba0
**Applied fix:** Added `FACILITY_ALLOWED_FIELDS` constant and whitelist filter (same pattern as `updateDepartmentAction`) to `updateFacilityAction`. Added `HOSPITAL_INFO_ALLOWED_FIELDS` array and whitelist filter to `updateHospitalInfoAction`. Both now use `Object.fromEntries` filter before the `.update()` call, blocking injection of `id`, `created_at`, `hero_image_url`, and other non-settable columns.

### CR-003: Arbitrary Storage deletion via crafted URL

**Files modified:** `app/(portal)/actions/media.ts`
**Commit:** 354b7fd
**Applied fix:** `deleteImageAction` now fetches the canonical URL from the DB using `entityId` and `column` before deriving the Storage path. Added URL-mismatch check: if the caller-supplied `storedUrl` differs from the DB record, the action returns an error without deleting anything. The Storage path is derived from the DB-sourced URL, not the caller-supplied value.

### CR-004: Empty `hospitalInfoId` causes orphaned Storage uploads

**Files modified:** `app/(portal)/media/page.tsx`
**Commit:** 1e6004a
**Applied fix:** Added an early-return guard in `MediaPage`: when `getHospitalInfo()` returns null, renders an error message ("Hospital information not configured. Please set up hospital info first.") and does not render `<MediaClient>`. The `info.id` passed to MediaClient is now the direct value (not `?? ''`).

### WR-001: `updateDoctorAction` filter blocks clearing `bio` to empty string

**Files modified:** `app/(portal)/actions/content.ts`
**Commit:** 9dc77ab
**Applied fix:** Replaced the single `v !== ''` filter with a two-tier check: required fields (`full_name`, `specialization`, `qualification`) still reject empty strings; optional fields (`bio`, `photo_url`, `availability_days`, `is_active`) allow empty/falsy values so admins can intentionally clear them. The `DOCTOR_REQUIRED_FIELDS` constant documents the distinction.

### WR-002: `featuredState` stale after new records added

**Files modified:** `app/(portal)/content/departments/DepartmentsClient.tsx`, `app/(portal)/content/doctors/DoctorsClient.tsx`, `app/(portal)/content/facilities/FacilitiesClient.tsx`
**Commit:** 76d6577
**Applied fix:** Extracted a `buildFeaturedMap()` helper function in each file (using the same logic as the original `useState` initialiser). Changed `useState` to use the helper. Added a `useEffect(() => { setFeaturedState(buildFeaturedMap(initialData)); }, [initialData])` to each component so state re-syncs whenever the prop changes (e.g. after `router.refresh()`). Added `useEffect` to the React import in all three files.

### WR-003: `FacilitiesClient` swallows `setFeaturedOrder` errors silently

**Files modified:** `app/(portal)/content/facilities/FacilitiesClient.tsx`
**Commit:** d37fb6b
**Applied fix:** Changed the `onBlur` handler to capture the return value of `setFeaturedOrder` and call `toast.error('Could not save order')` when `result?.error` is truthy. `toast` was already imported from `sonner`.

### WR-004: `getFeaturedFacilities` no row limit on fallback path

**Files modified:** `lib/db/facilities.ts`
**Commit:** d37fb6b
**Applied fix:** Added `.limit(FEATURED_FACILITIES_LIMIT)` (constant: 8) to the Supabase query in `getFeaturedFacilities`. The limit applies to the initial query so neither the featured-only path nor the fallback path can return the full facilities table.

### WR-005: `select('*')` in DB helpers

**Files modified:** `lib/db/facilities.ts`, `lib/db/hospital-info.ts`
**Commit:** d37fb6b
**Applied fix:** Replaced `.select('*')` with explicit column lists in both files. `getFacilities()` and `getFeaturedFacilities()` in facilities.ts use a named constant (`FACILITY_COLUMNS` / `FACILITY_PUBLIC_COLUMNS`) listing all columns consumed by callers. `getHospitalInfo()` in hospital-info.ts uses an inline string matching the `HospitalInfo` interface fields.

### WR-006: Testimonial actions insert raw `input` instead of `parsed.data`

**Files modified:** `app/(portal)/actions/content.ts`
**Commit:** 71ca1e8
**Applied fix:** In both `createTestimonialAction` and `updateTestimonialAction`, replaced `input.patient_name`, `input.quote`, `input.designation`, `input.sort_order` with `parsed.data.*` equivalents in the DB insert/update call. `is_active` (not in the Zod schema) continues to come from `input`. This ensures Zod coercions (e.g. `sort_order` coerced to `number`) apply to the values actually written to the DB.

---

_Fixed: 2026-06-20T06:53:35.601Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
