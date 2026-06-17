---
phase: 14-media-infrastructure
plan: 05
subsystem: portal-media
tags: [portal, media, hero-image, upload, supabase-storage]
dependency_graph:
  requires: [14-03]
  provides: [portal-media-page]
  affects: [portal-nav, hospital-info-type]
tech_stack:
  added: []
  patterns: [server-component-shell, client-upload-with-preview, inline-confirm]
key_files:
  created:
    - app/(portal)/media/page.tsx
    - app/(portal)/media/MediaClient.tsx
  modified:
    - lib/db/hospital-info.ts
    - lib/portal/roles.ts
decisions:
  - Added media section to ALL_SECTIONS/ROLE_SECTIONS for super_admin and admin
  - Inline confirmRemove boolean state used (no Dialog/modal) per plan spec
  - select('*') already covers hero_image_url; only interface type update needed
metrics:
  duration: 15m
  completed: 2026-06-17
  tasks_completed: 2
  tasks_total: 2
---

# Phase 14 Plan 05: Portal Media Page Summary

Portal Media page at /portal/media with hero image upload, 16:9 preview, and inline-confirm remove wired to uploadImageAction/deleteImageAction from Plan 03.

## What Was Built

### Task 1 — Update HospitalInfo interface
- Added `hero_image_url: string | null` to the `HospitalInfo` TypeScript interface in `lib/db/hospital-info.ts`
- The query already uses `select('*')` so no column list change was needed

### Task 2 — Portal Media page
- `app/(portal)/media/page.tsx` — Server Component that calls `getHospitalInfo()` and passes `heroImageUrl` + `hospitalInfoId` to `MediaClient`
- `app/(portal)/media/MediaClient.tsx` — Client Component with:
  - 16:9 aspect-ratio preview via `next/image` with `fill` + `sizes="100vw"` when hero is set
  - `EmptyState` with `ImagePlus` icon when no hero is set
  - File input with client-side validation (5 MB cap, MIME allowlist) before calling Server Action
  - `uploadImageAction(fd, 'site', hospitalInfoId, 'hospital_info', 'hero_image_url')` on change
  - Loader2 spinner shown while uploading; file input disabled during upload
  - Inline `confirmRemove` boolean state (no Dialog) — first click shows warning + confirm/cancel buttons
  - `deleteImageAction` on confirmed remove
- `lib/portal/roles.ts` — Added `media` key to `ALL_SECTIONS` and to `super_admin` + `admin` in `ROLE_SECTIONS`

## Deviations from Plan

### Auto-added: Media nav item in roles.ts
- **Found during:** Task 2
- **Issue:** Plan 05 creates /portal/media but the sidebar nav section was not in the plan's task list; without adding to ALL_SECTIONS the route would be unreachable from the sidebar
- **Fix:** Added `{ key: 'media', label: 'Media', href: '/media' }` to ALL_SECTIONS and granted access to super_admin + admin in ROLE_SECTIONS
- **Files modified:** lib/portal/roles.ts
- **Commit:** 59fed5d

## Commits

| Hash | Message |
|------|---------|
| 7921959 | feat(14-05): add hero_image_url to HospitalInfo interface |
| 59fed5d | feat(14-05): add portal Media page with hero image upload/remove |

## Self-Check: PASSED

- app/(portal)/media/page.tsx — created
- app/(portal)/media/MediaClient.tsx — created
- lib/db/hospital-info.ts — hero_image_url in interface
- lib/portal/roles.ts — media nav item added
- Both commits verified in git log
