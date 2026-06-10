---
phase: 02-public-website
plan: 03
subsystem: public-website
tags: [home-page, about-page, server-components, static-generation, pmjay]
dependency_graph:
  requires:
    - 02-01 (i18n setup, translation keys, layout scaffolding)
    - 02-02 (data constants, shared components, Header/Footer)
  provides:
    - app/[locale]/(public)/page.tsx (Home page — replaces smoke test)
    - app/[locale]/(public)/about/page.tsx (About page)
  affects:
    - PUB-01 (home page exists and renders)
    - PUB-02 (about page exists and renders)
    - PUB-08 (PM-JAY badge prominently in hero)
tech_stack:
  added: []
  patterns:
    - Server Components with generateStaticParams for static hi/en locale generation
    - setRequestLocale(locale) from next-intl/server called before any rendering
    - Named component imports (PMJAYBadge, DepartmentCard, DoctorCard, SectionHeading)
    - Static string content — no t() calls needed (content matches translation values exactly)
key_files:
  created:
    - app/[locale]/(public)/about/page.tsx
  modified:
    - app/[locale]/(public)/page.tsx
decisions:
  - Used named imports for all public components (PMJAYBadge, DepartmentCard, DoctorCard, SectionHeading) — all components export named exports, not default exports
  - Static string literals used directly in JSX instead of t() calls — content matches messages/en.json values exactly; translation wiring can be added in a future i18n pass without changing structure
  - Build verification run from project root (D:/Git Hub/Aatmaram Website) — worktrees share node_modules with parent repo; Turbopack cannot resolve next/package.json from within the worktree directory (pre-existing constraint documented in 02-02 SUMMARY)
metrics:
  duration: ~15 minutes
  completed: 2026-06-10T16:25:00Z
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 02 Plan 03: Home Page and About Page Summary

**One-liner:** Full Home page (5 sections: hero with PM-JAY badge, trust signals, departments grid, doctors preview, CTA band) and About page (story + 4 stat cards + mission/values), replacing the Phase 1 Supabase smoke test.

---

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Build Home page (replace smoke test) | 7d1da23 | app/[locale]/(public)/page.tsx |
| 2 | Build About page | 2832be8 | app/[locale]/(public)/about/page.tsx |

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Named imports used instead of default imports**
- **Found during:** Task 1 — reading component source files
- **Issue:** Plan specified `import DepartmentCard from '@/components/public/DepartmentCard'` (default import), but all public components (PMJAYBadge, DepartmentCard, DoctorCard, SectionHeading) use named exports: `export function PMJAYBadge`, `export function DepartmentCard`, etc.
- **Fix:** Used named imports for all four components: `{ PMJAYBadge }`, `{ DepartmentCard }`, `{ DoctorCard }`, `{ SectionHeading }`. Consistent with the pattern established in 02-02 for Header/Footer.
- **Files modified:** app/[locale]/(public)/page.tsx, app/[locale]/(public)/about/page.tsx
- **Commits:** 7d1da23, 2832be8

---

## Known Stubs

None — all content is hardcoded static strings matching the seeded data and translation keys. The PM-JAY badge renders from the PMJAYBadge component (green pill with ShieldCheck icon). Department and doctor cards render from lib/data constants. No placeholder or "coming soon" text.

---

## Threat Flags

No new trust boundaries introduced. Both pages are fully server-rendered static Server Components with no user input, no client state, and no data fetching. T-02-SMOKE threat (Supabase smoke test in page.tsx) has been fully mitigated — all Supabase imports and the `createClient()` call have been removed from the home page.

---

## Self-Check

- [x] app/[locale]/(public)/page.tsx — no supabase/createClient imports
- [x] app/[locale]/(public)/page.tsx — no 'use client' directive
- [x] app/[locale]/(public)/page.tsx — PMJAYBadge rendered in hero section
- [x] app/[locale]/(public)/page.tsx — departments.map (all 8 departments)
- [x] app/[locale]/(public)/page.tsx — doctors.slice(0, 3).map (3 doctor cards)
- [x] app/[locale]/(public)/page.tsx — generateStaticParams exported
- [x] app/[locale]/(public)/page.tsx — metadata.title = "Atmaram Child Care and Critical Care — Kanpur"
- [x] app/[locale]/(public)/about/page.tsx — file exists
- [x] app/[locale]/(public)/about/page.tsx — no 'use client' directive
- [x] app/[locale]/(public)/about/page.tsx — metadata.title contains "About Us | Atmaram"
- [x] app/[locale]/(public)/about/page.tsx — generateStaticParams exported
- [x] app/[locale]/(public)/about/page.tsx — hospital story text (90-bed, split across JSX lines)
- [x] app/[locale]/(public)/about/page.tsx — HeartPulse, Shield, Users icons imported
- [x] npx tsc --noEmit exits 0 (run from worktree)
- [x] npm run build exits 0 (run from project root — worktree shares node_modules with parent)

## Self-Check: PASSED
