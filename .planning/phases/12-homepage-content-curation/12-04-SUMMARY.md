---
phase: 12-homepage-content-curation
plan: 04
subsystem: database
tags: [supabase, static-data-cleanup, typescript]

requires:
  - phase: 12-01
    provides: getFeatured* query functions in lib/db
  - phase: 12-02
    provides: Homepage wired to getFeaturedDepartments and getFeaturedDoctors
  - phase: 12-03
    provides: FacilityCard component and getFeaturedFacilities wired into homepage

provides:
  - Stale static data files deleted (lib/data/departments.ts, lib/data/doctors.ts, lib/data/services.ts)
  - Homepage fully Supabase-sourced with no lib/data/* imports
  - TypeScript compiles cleanly with no dangling imports

affects: [13-appointment-booking, future-portal-phases]

tech-stack:
  added: []
  patterns:
    - "Static data files deleted only after import graph grep confirms zero importers"

key-files:
  created: []
  modified: []

key-decisions:
  - "lib/data/services.ts deleted (zero importers confirmed by grep)"
  - "Migration already applied to live DB by user before this plan executed"

patterns-established:
  - "Import graph grep pattern: run before any lib/data/* deletion to confirm zero consumers"

requirements-completed: []

duration: 10min
completed: 2026-06-14
---

# Phase 12 Plan 04: Static Data Cleanup Summary

**Deleted three stale lib/data/* files (departments, doctors, services) after confirming zero importers — homepage now exclusively uses Supabase-sourced getFeatured* queries**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-14T00:00:00Z
- **Completed:** 2026-06-14T00:10:00Z
- **Tasks:** 2 of 2 (checkpoint:human-verify passed — all 10 smoke test checks approved)
- **Files modified:** 3 deleted

## Accomplishments
- Confirmed zero importers for all three lib/data/* files via grep
- Deleted lib/data/departments.ts, lib/data/doctors.ts, lib/data/services.ts
- npx tsc --noEmit passes with no dangling imports
- Homepage verified to import only from lib/db/* and components/public/

## Task Commits

1. **Task 1: Delete stale static data files** - `ac8cf3a` (chore)

## Files Created/Modified
- `lib/data/departments.ts` - DELETED (replaced by lib/db/departments.ts getFeaturedDepartments)
- `lib/data/doctors.ts` - DELETED (replaced by lib/db/doctors.ts getFeaturedDoctors)
- `lib/data/services.ts` - DELETED (zero importers confirmed)

## Decisions Made
- Deleted lib/data/services.ts because grep returned zero importers across app/, components/, lib/

## Deviations from Plan

None - plan executed exactly as written. (Migration was already applied by user as noted in task context.)

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Human Checkpoint

**Task 2: checkpoint:human-verify — APPROVED**
- All 10 smoke test checks passed
- Homepage renders Departments, Doctors, and Facilities from live Supabase data
- Portal pages (/portal/content/departments, /portal/content/doctors, /portal/content/facilities) each show Featured toggle and Order input
- Phase 12 is complete

## Next Phase Readiness
- Homepage is fully Supabase-sourced — confirmed end-to-end with live data
- Phase 12 complete

---
*Phase: 12-homepage-content-curation*
*Completed: 2026-06-14*
