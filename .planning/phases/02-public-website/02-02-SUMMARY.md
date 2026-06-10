---
phase: 02-public-website
plan: 02
subsystem: public-website
tags: [components, layout, data-constants, header, footer, shadcn]
dependency_graph:
  requires:
    - 02-01 (shadcn/ui init, globals.css tokens, base layout scaffolding)
  provides:
    - lib/data/departments.ts (8 departments, Phase 5 Supabase migration point)
    - lib/data/doctors.ts (6 doctors, Phase 5 Supabase migration point)
    - lib/data/services.ts (8 services + 6 facilities, Phase 5 Supabase migration point)
    - components/layout/Header.tsx (sticky nav, all public pages)
    - components/layout/Footer.tsx (3-column footer, all public pages)
    - components/layout/MobileNav.tsx (mobile Sheet drawer)
    - components/public/DepartmentCard.tsx
    - components/public/DoctorCard.tsx
    - components/public/PMJAYBadge.tsx
    - components/public/SectionHeading.tsx
  affects:
    - app/[locale]/(public)/layout.tsx (imports Header and Footer)
    - Plans 03-07 (import lib/data and public components)
tech_stack:
  added:
    - base-ui render prop pattern for polymorphic button/link rendering (replaces Radix asChild)
  patterns:
    - lib/data/ typed constants with LucideIcon references (Phase 5 migration pattern)
    - Server Components for all layout and card components
    - Client Component isolation (MobileNav.tsx only)
    - buttonVariants() for styling Link elements as buttons
key_files:
  created:
    - lib/data/departments.ts
    - lib/data/doctors.ts
    - lib/data/services.ts
    - components/layout/MobileNav.tsx
    - components/public/DepartmentCard.tsx
    - components/public/DoctorCard.tsx
    - components/public/PMJAYBadge.tsx
    - components/public/SectionHeading.tsx
  modified:
    - components/layout/Header.tsx (replaced placeholder)
    - components/layout/Footer.tsx (replaced placeholder)
decisions:
  - Used buttonVariants() + Link for CTA buttons instead of Button asChild — base-ui Button does not support asChild prop (uses render prop instead); buttonVariants gives identical styling
  - MobileNav uses base-ui render prop for SheetTrigger and SheetClose to render custom elements
  - Build verification runs from project root since worktrees share node_modules with parent
metrics:
  duration: ~25 minutes
  completed: 2026-06-10T16:17:31Z
  tasks_completed: 3
  tasks_total: 3
  files_created: 10
  files_modified: 2
---

# Phase 02 Plan 02: Seeded Data Constants and Shared Components Summary

**One-liner:** Typed lib/data/ constants (8 departments, 6 doctors, 8 services, 6 facilities), full Header/Footer with base-ui-compatible mobile Sheet drawer, and 4 reusable public components (DepartmentCard, DoctorCard, PMJAYBadge, SectionHeading).

---

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Seeded data constants in lib/data/ | caf0a22 | departments.ts, doctors.ts, services.ts |
| 2 | Header and Footer layout components | 7c9957d | Header.tsx, Footer.tsx, MobileNav.tsx |
| 3 | Shared public components | fc91afb | DepartmentCard.tsx, DoctorCard.tsx, PMJAYBadge.tsx, SectionHeading.tsx |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] base-ui Button has no asChild prop — uses render prop instead**
- **Found during:** Task 2 (Header.tsx) — TypeScript error: Property 'asChild' does not exist on ButtonProps
- **Issue:** The shadcn/ui components in this project are built on `@base-ui/react` (not Radix UI). base-ui uses a `render` prop for polymorphic rendering, not the Radix `asChild` pattern. `Button`, `SheetTrigger`, and `SheetClose` all lack `asChild`.
- **Fix:**
  - For Header CTA and DoctorCard "Book Appointment": used `buttonVariants()` class utility on a `<Link>` element directly — identical visual output, zero JavaScript overhead.
  - For MobileNav SheetTrigger and SheetClose: used `render={<Button .../>}` and `render={<Link .../>}` pattern per base-ui API.
- **Files modified:** Header.tsx, MobileNav.tsx, DoctorCard.tsx
- **Commits:** 7c9957d, fc91afb

---

## Known Stubs

None — all data arrays are fully seeded with real department/doctor/service names. No placeholder text used. No TODO stubs in component rendering paths.

---

## Threat Flags

No new trust boundaries introduced. All components are Server Components with static data. MobileNav is a Client Component for UI state only (no data access). No threat flags beyond those documented in the plan's STRIDE register.

---

## Self-Check

- [x] lib/data/departments.ts exists — 8 departments with LucideIcon types
- [x] lib/data/doctors.ts exists — 6 doctors with initials
- [x] lib/data/services.ts exists — 8 services + 6 facilities
- [x] components/layout/Header.tsx — data-testid="header", className includes "bg-[#1E3A5F]", Server Component
- [x] components/layout/MobileNav.tsx — 'use client', aria-label="Open navigation menu" on trigger
- [x] components/layout/Footer.tsx — data-testid="footer", 3-column grid, PMJAYBadge small, copyright line
- [x] components/public/DepartmentCard.tsx — imports Department, hover:shadow-md transition-shadow
- [x] components/public/DoctorCard.tsx — aria-label="Doctor avatar for {name}", Book Appointment link
- [x] components/public/PMJAYBadge.tsx — role="img" aria-label="Ayushman Bharat PM-JAY Empanelled", bg-green-600
- [x] components/public/SectionHeading.tsx — h2 text-xl font-semibold, bg-blue-800 underline div
- [x] npx tsc --noEmit exits 0
- [x] npm run build exits 0 (run from project root)

## Self-Check: PASSED
