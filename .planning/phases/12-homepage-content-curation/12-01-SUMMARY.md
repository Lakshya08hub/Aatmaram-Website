---
phase: 12-homepage-content-curation
plan: "01"
subsystem: data-layer
tags: [migration, supabase, db-queries, featured-content, homepage]
dependency_graph:
  requires: []
  provides:
    - getFeaturedDepartments
    - getFeaturedDoctors
    - getFeaturedFacilities
    - supabase/migrations/20260614_featured_columns.sql
  affects:
    - lib/db/departments.ts
    - lib/db/doctors.ts
    - lib/db/facilities.ts
tech_stack:
  added: []
  patterns:
    - single-query-with-app-level-slice-fallback
key_files:
  created:
    - supabase/migrations/20260614_featured_columns.sql
  modified:
    - lib/db/departments.ts
    - lib/db/doctors.ts
    - lib/db/facilities.ts
decisions:
  - Updated Department, Doctor, Facility interfaces to include is_featured and featured_order — avoids type casting and keeps TypeScript strict
metrics:
  duration: "~10 minutes"
  completed: "2026-06-14T08:06:19Z"
---

# Phase 12 Plan 01: Featured Content Data Layer Summary

Added `is_featured` / `featured_order` columns via idempotent migration and three `getFeatured*` query functions with single-query + app-level-slice fallback pattern.

## What Was Built

**Migration** (`supabase/migrations/20260614_featured_columns.sql`): Six `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements — two columns (`is_featured BOOLEAN NOT NULL DEFAULT false`, `featured_order INTEGER NOT NULL DEFAULT 0`) on each of `departments`, `doctors`, `facilities`. Safe to re-run; no destructive statements.

**Query functions** (three lib/db modules):
- `getFeaturedDepartments()` — orders by `is_featured DESC, featured_order ASC, created_at ASC`, returns only featured rows if any exist, else all rows
- `getFeaturedDoctors()` — same pattern but always filters `is_active = true` in the DB query before the app-level slice
- `getFeaturedFacilities()` — identical pattern to departments

All three interfaces (`Department`, `Doctor`, `Facility`) were updated to include the new columns so the slice logic uses typed field access with no `any`.

## Verification Results

- Migration: `Select-String ... ADD COLUMN IF NOT EXISTS | Measure-Object Count` = **6** (pass)
- Exports: `Select-String ... export.*getFeatured | Measure-Object Count` = **3** (pass)
- TypeScript: `npx tsc --noEmit` = **no errors** (pass)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | a936d99 | feat(12-01): migration SQL — is_featured + featured_order on 3 tables |
| Task 2 | f3df2f7 | feat(12-01): getFeatured* query functions in lib/db modules |

## Deviations from Plan

**1. [Rule 2 - Missing critical functionality] Updated typed interfaces to include new columns**
- **Found during:** Task 2
- **Issue:** The existing `Department`, `Doctor`, `Facility` interfaces did not include `is_featured` or `featured_order`. Without adding these, the app-level slice logic would require unsafe type casting to access the fields.
- **Fix:** Added `is_featured: boolean` and `featured_order: number` to all three interfaces.
- **Files modified:** `lib/db/departments.ts`, `lib/db/doctors.ts`, `lib/db/facilities.ts`
- **Commit:** f3df2f7

## Known Stubs

None — this plan is purely a data layer; no UI components introduced.

## Threat Flags

None — the new columns contain only curation metadata (booleans and integers). No PII, no new trust boundaries introduced.

## Self-Check: PASSED

- `supabase/migrations/20260614_featured_columns.sql` — FOUND
- `lib/db/departments.ts` exports `getFeaturedDepartments` — FOUND
- `lib/db/doctors.ts` exports `getFeaturedDoctors` — FOUND
- `lib/db/facilities.ts` exports `getFeaturedFacilities` — FOUND
- Commit a936d99 — FOUND
- Commit f3df2f7 — FOUND
