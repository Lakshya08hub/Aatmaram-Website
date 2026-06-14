---
phase: 12-homepage-content-curation
plan: "02"
subsystem: public-homepage
tags: [homepage, supabase, facility-card, force-dynamic, server-component]
dependency_graph:
  requires: [12-01]
  provides: [homepage-live-data, facility-card-component]
  affects: [app/[locale]/(public)/page.tsx]
tech_stack:
  added: []
  patterns: [force-dynamic server component, Promise.all parallel data fetch, presentational card component]
key_files:
  created:
    - components/public/FacilityCard.tsx
  modified:
    - app/[locale]/(public)/page.tsx
decisions:
  - "Promise.all used for parallel fetch of three getFeatured* queries — avoids waterfall latency"
  - "image_url accepted but unused in FacilityCard v1 — prefixed with _ to suppress TS unused var warning"
  - "generateStaticParams removed from homepage — conflicts with force-dynamic; locales not pre-rendered"
  - "Facilities section uses string literal 'Our Facilities' with TODO comment for future i18n key"
metrics:
  duration: "15 minutes"
  completed: "2026-06-14"
  tasks_completed: 2
  files_changed: 2
---

# Phase 12 Plan 02: Homepage Content Wiring Summary

FacilityCard component added and homepage converted from hardcoded static data to Supabase-backed getFeatured* queries with a new Facilities section inserted between Doctors and Appointment CTA.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Create FacilityCard presentational component | 542ed1a |
| 2 | Wire homepage to Supabase with force-dynamic and Facilities section | 4bbe655 |

## What Was Built

**FacilityCard (`components/public/FacilityCard.tsx`):**
- Mirrors DepartmentCard exactly — same Card wrapper, CardHeader, CardContent, icon circle, text-xl heading, leading-relaxed description
- Building2 icon always rendered (no icon prop, no conditional)
- Props: `name: string`, `description: string`, `image_url?: string` (accepted, unused v1 — `_image_url` to silence TS)
- description uses `line-clamp-3` and `text-slate-600`

**Homepage (`app/[locale]/(public)/page.tsx`):**
- Removed `import { departments } from '@/lib/data/departments'` and `import { doctors } from '@/lib/data/doctors'`
- Removed `import { routing } from '@/i18n/routing'` (was only used by removed generateStaticParams)
- Removed `generateStaticParams()` function
- Added `export const dynamic = 'force-dynamic'`
- Added `FacilityCard` import from `@/components/public/FacilityCard`
- Added `getFeaturedDepartments`, `getFeaturedDoctors`, `getFeaturedFacilities` imports
- Parallel fetch via `Promise.all([...])` at top of component body
- Departments section maps `dept.name` + `dept.description` directly (no translation key lookup)
- Doctors section maps `doctor.full_name` + initials computed inline + `doctor.specialization`
- New Facilities section (Section 5) with `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6` grid
- Appointment CTA renumbered to Section 6 (comment only)

## Deviations from Plan

### Auto-handled Observations

**1. [Plan clarification] tDept and tDoc translations still in use**
- `tDept('pageSubtitle')` used in Departments SectionHeading subtitle — kept
- `tDoc('bookAppointment')` used as bookLabel in DoctorCard — kept
- These were NOT removed even though the per-item translation lookup was removed

**2. [Minor] image_url prop destructured with underscore prefix**
- Plan said "accept but don't render" — destructured as `_image_url` to satisfy TypeScript no-unused-vars rule

No architectural deviations. No new packages installed.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `title="Our Facilities"` string literal | `app/[locale]/(public)/page.tsx:155` | Translation key `home.facilities.heading` not yet added to messages files — TODO comment added inline |

## Threat Surface Scan

No new network endpoints, auth paths, or trust boundary crossings introduced. Facilities section uses the same Supabase server-side read pattern as Departments and Doctors — within the existing T-12-03/T-12-04 threat register entries.

## Self-Check: PASSED

- `components/public/FacilityCard.tsx` — FOUND
- `app/[locale]/(public)/page.tsx` — FOUND, verified via Read
- Commit 542ed1a — FOUND
- Commit 4bbe655 — FOUND
- No `lib/data/` imports in page.tsx — CONFIRMED (0 grep matches)
- `force-dynamic` present — CONFIRMED (1 grep match)
- `FacilityCard` and `getFeaturedFacilities` present — CONFIRMED (4 grep matches)
- TypeScript `npx tsc --noEmit` — PASSED (no output = no errors)
