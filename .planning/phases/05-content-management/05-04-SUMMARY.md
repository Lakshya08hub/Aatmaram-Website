---
phase: 05-content-management
plan: "04"
subsystem: portal-cms
tags: [facilities, hospital-info, server-actions, crud, revalidate]
dependency_graph:
  requires: [05-01, 05-02, 05-03]
  provides: [facilities-crud, hospital-info-form]
  affects: [public-services-pages, public-contact-pages]
tech_stack:
  added: []
  patterns: [server-component-client-split, zod-react-hook-form, server-actions, revalidatePath]
key_files:
  created:
    - lib/db/facilities.ts
    - lib/db/hospital-info.ts
    - app/(portal)/content/facilities/page.tsx
    - app/(portal)/content/facilities/FacilitiesClient.tsx
    - app/(portal)/content/hospital-info/page.tsx
    - app/(portal)/content/hospital-info/HospitalInfoClient.tsx
  modified:
    - app/(portal)/actions/content.ts
decisions:
  - "getHospitalInfo() returns null on error (no throw) — page delegates to client error banner"
  - "FacilitiesClient uses react-hook-form watch() + setValue() to bridge shadcn Select with zod schema"
  - "Pre-existing DoctorsClient TS errors (from 05-03) excluded from scope — zero new errors introduced"
metrics:
  duration: "~25 minutes"
  completed: "2026-06-12T09:37:03Z"
  tasks_completed: 2
  files_created: 6
  files_modified: 1
---

# Phase 05 Plan 04: Facilities + Hospital Info CMS Summary

Facilities CRUD portal pages and Hospital Info single-record form with Server Actions wired to revalidate public pages on mutation.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | lib/db utilities + Server Actions | 8a82374 | lib/db/facilities.ts, lib/db/hospital-info.ts, app/(portal)/actions/content.ts |
| 2 | Portal pages (Facilities + HospitalInfo) | d98c229 | 4 new page + client files |

## What Was Built

**lib/db/facilities.ts** — `Facility` type with `FacilityCategory` enum, `getFacilities()` ordered by creation time.

**lib/db/hospital-info.ts** — `HospitalInfo` type with all 8 fields, `getHospitalInfo()` returning null on error.

**content.ts additions** — `createFacilityAction`, `updateFacilityAction`, `deleteFacilityAction` (all call `revalidateFacilities()` → `/en/services` + `/hi/services`); `updateHospitalInfoAction` (calls `revalidateHospitalInfo()` → `/en/contact` + `/hi/contact`). All five new actions enforce `requireCmsRole()` (T-05-09 mitigation).

**FacilitiesClient.tsx** — Table with Name/Description(truncated)/Category(Badge)/Actions columns. Dialog for Add/Edit with shadcn Select for OPD/ICU/Diagnostics/Surgery/Other. AlertDialog for delete with "Remove facility?" title. All icon-only buttons have `aria-label`.

**HospitalInfoClient.tsx** — Null-guard renders error banner when `initialData` is null. Full-page form with 7 ordered fields pre-filled from DB. Zod `max(1200)` on `about_text` (T-05-11 mitigation). Single "Save Changes" button. `router.refresh()` after successful save.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Compliance

| Threat | Mitigation | Status |
|--------|-----------|--------|
| T-05-09 Elevation of Privilege | requireCmsRole() in all 5 new actions | Done |
| T-05-10 maps_embed_url injection | Zod .url() validation in HospitalInfoClient schema | Done |
| T-05-11 about_text DoS | Zod max(1200) enforced in HospitalInfoClient | Done |

## Known Stubs

None — all data is wired to Supabase DB reads and Server Action writes.

## Self-Check: PASSED

- lib/db/facilities.ts: exists
- lib/db/hospital-info.ts: exists
- app/(portal)/content/facilities/page.tsx: exists
- app/(portal)/content/facilities/FacilitiesClient.tsx: exists
- app/(portal)/content/hospital-info/page.tsx: exists
- app/(portal)/content/hospital-info/HospitalInfoClient.tsx: exists
- revalidatePath('/en/services') count in content.ts: 1
- revalidatePath('/en/contact') count in content.ts: 1
- No TypeScript errors in 05-04 files
