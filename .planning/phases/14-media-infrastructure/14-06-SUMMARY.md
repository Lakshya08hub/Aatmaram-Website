---
phase: 14-media-infrastructure
plan: "06"
subsystem: public-site
tags: [next/image, rendering, DoctorCard, DepartmentCard, FacilityCard, hero]
dependency_graph:
  requires: [14-03, 14-01]
  provides: [image-rendering-layer]
  affects: [components/public/DoctorCard.tsx, components/public/DepartmentCard.tsx, components/public/FacilityCard.tsx, app/[locale]/(public)/page.tsx]
tech_stack:
  added: []
  patterns: [next/image with fill + conditional rendering, decorative alt=""]
key_files:
  modified:
    - components/public/DoctorCard.tsx
    - components/public/DepartmentCard.tsx
    - components/public/FacilityCard.tsx
    - app/[locale]/(public)/page.tsx
decisions:
  - "Used conditional ternary for DoctorCard avatar (photo replaces initials) vs additive pattern for DepartmentCard/FacilityCard (image header added above icon, icon preserved)"
  - "Hero section duplicated into two branches (image vs plain) to avoid runtime conditional className switching"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-17"
  tasks_completed: 2
  files_modified: 4
---

# Phase 14 Plan 06: next/image Rendering Layer Summary

Public card components and homepage hero updated to render uploaded images via next/image with all existing fallbacks preserved.

## What Was Built

**Task 1 — Card components updated (f2076b0)**

- `DoctorCard.tsx`: Added `photoUrl?: string | null` prop and `import Image from 'next/image'`. When `photoUrl` is a non-empty string, renders a 80x80 circular `<Image fill sizes="80px" className="object-cover" />` container; otherwise renders the existing initials div unchanged.
- `DepartmentCard.tsx`: Added `imageUrl?: string | null` prop and Image import. When `imageUrl` is set, renders a `relative w-full h-40 rounded-t-xl overflow-hidden` div with fill Image above the CardHeader; icon circle is preserved unconditionally.
- `FacilityCard.tsx`: Same pattern as DepartmentCard. Prop renamed from `image_url` (unused stub) to `imageUrl`. Icon fallback preserved.

**Task 2 — Homepage wired (2bb4bb7)**

- Added `import { getHospitalInfo } from '@/lib/db/hospital-info'` and `import Image from 'next/image'`.
- `getHospitalInfo()` added to the existing `Promise.all`; `heroImageUrl = info?.hero_image_url ?? null` extracted.
- Hero section (Section 1) replaced with a ternary: when `heroImageUrl` is set, renders `<section className="relative ... overflow-hidden">` containing a fill Image (`alt=""`, `priority`, `-z-10`) plus a `bg-white/70 -z-10` overlay and the existing hero content with `relative` added; when null renders the original `bg-white` section unchanged.
- `photoUrl={doctor.photo_url}` passed to DoctorCard.
- `imageUrl={dept.image_url}` passed to DepartmentCard.
- `imageUrl={facility.image_url}` passed to FacilityCard.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit` — no errors across all four files
- `npm run build` — succeeded, all routes compiled

## Known Stubs

None. All image props are wired from real DB columns (photo_url, image_url, hero_image_url). Fallbacks render when values are null.

## Threat Flags

None — no new network endpoints or auth paths introduced. next/image src values from DB are guarded by remotePatterns in next.config.ts (T-14-12, accepted in plan threat model).

## Self-Check: PASSED

- `components/public/DoctorCard.tsx` — exists, contains photoUrl and Image import
- `components/public/DepartmentCard.tsx` — exists, contains imageUrl and Image import
- `components/public/FacilityCard.tsx` — exists, contains imageUrl and Image import
- `app/[locale]/(public)/page.tsx` — exists, contains heroImageUrl, photoUrl, imageUrl props
- Commits f2076b0 and 2bb4bb7 confirmed in git log
