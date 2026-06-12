---
phase: 05-content-management
plan: "05"
subsystem: public-site
tags: [dynamic-rendering, supabase, public-pages, content-management]
dependency_graph:
  requires: [05-02, 05-03, 05-04]
  provides: [DYN-01, DYN-02, DYN-03, DYN-04]
  affects: [app/[locale]/(public)/departments, app/[locale]/(public)/doctors, app/[locale]/(public)/services, app/[locale]/(public)/contact]
tech_stack:
  added: []
  patterns: [force-dynamic server components, try/catch silent fail, DB-direct rendering]
key_files:
  created: []
  modified:
    - app/[locale]/(public)/departments/page.tsx
    - app/[locale]/(public)/doctors/page.tsx
    - app/[locale]/(public)/services/page.tsx
    - app/[locale]/(public)/contact/page.tsx
    - components/public/DepartmentCard.tsx
decisions:
  - DepartmentCard icon made optional with Building2 fallback — DB rows have no icon field
  - Doctor initials computed from full_name (first 2 words, first char each) — DB has no initials field
  - Services checkmark list replaced with facilities from DB (no separate services table exists)
  - Contact page shows Google Maps iframe when maps_embed_url present; placeholder otherwise
  - Contact page falls back to translation strings when DB returns null (silent fail pattern)
metrics:
  duration: "15 minutes"
  completed: "2026-06-12T09:48:44Z"
  tasks_completed: 2
  files_modified: 5
---

# Phase 05 Plan 05: Dynamic Public Pages Summary

All four public pages converted from static TypeScript constants to Supabase DB reads. Content now flows from portal to public site without any rebuild.

## What Was Built

Four public pages now render Supabase data server-side on every request:

- `/[locale]/departments` — reads `departments` table via `getDepartments()`
- `/[locale]/doctors` — reads `doctors` table via `getActiveDoctors()` (active only)
- `/[locale]/services` — reads `facilities` table via `getFacilities()`
- `/[locale]/contact` — reads `hospital_info` row via `getHospitalInfo()`

All pages export `const dynamic = 'force-dynamic'` and have no `generateStaticParams`. All DB reads are wrapped in try/catch — on failure the page renders with empty arrays or null values, no error page shown to visitors.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | b959ba9 | feat(05-05): convert departments + doctors pages to Supabase DB reads |
| Task 2 | b8d7707 | feat(05-05): convert services + contact pages to Supabase DB reads |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing prop adaptation] DepartmentCard required LucideIcon but DB has none**
- **Found during:** Task 1
- **Issue:** `DepartmentCard` had `icon: LucideIcon` as required prop; DB `Department` type has no icon field
- **Fix:** Made `icon` optional in `DepartmentCardProps`; added `Building2` as fallback default
- **Files modified:** `components/public/DepartmentCard.tsx`
- **Commit:** b959ba9

**2. [Rule 2 - Missing prop adaptation] DoctorCard required `initials` but DB has none**
- **Found during:** Task 1
- **Issue:** `DoctorCard` expected pre-computed `initials: string`; DB `Doctor` type has only `full_name`
- **Fix:** Added `getInitials(fullName)` helper in doctors page — splits on spaces, takes first two words, uppercases first char each
- **Files modified:** `app/[locale]/(public)/doctors/page.tsx`
- **Commit:** b959ba9

**3. [Rule 1 - Structural] Services page had two separate static arrays (services + facilities)**
- **Found during:** Task 2
- **Issue:** Static `services` array (checkmark list) and static `facilities` array (icon cards) had separate translation keys. DB only has one `facilities` table — no separate services concept.
- **Fix:** Used `getFacilities()` for both the checkmark list section and the card grid section. Removed icon from facility cards (DB has no icon); shows `name` + `description` in card.
- **Files modified:** `app/[locale]/(public)/services/page.tsx`
- **Commit:** b8d7707

## Known Stubs

None — all data flows from DB. When DB returns empty/null, pages show empty states (correct silent-fail behavior per plan spec).

## Self-Check: PASSED

- `app/[locale]/(public)/departments/page.tsx` — exists, exports `dynamic = 'force-dynamic'`, imports `getDepartments`
- `app/[locale]/(public)/doctors/page.tsx` — exists, exports `dynamic = 'force-dynamic'`, imports `getActiveDoctors`
- `app/[locale]/(public)/services/page.tsx` — exists, exports `dynamic = 'force-dynamic'`, imports `getFacilities`
- `app/[locale]/(public)/contact/page.tsx` — exists, exports `dynamic = 'force-dynamic'`, imports `getHospitalInfo`
- `npx tsc --noEmit` — no errors
- `npx next build` — exits 0, all four pages shown as `ƒ (Dynamic)`
