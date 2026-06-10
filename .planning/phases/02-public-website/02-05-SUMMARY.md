---
phase: 02-public-website
plan: 05
subsystem: public-website
tags: [services-page, contact-page, pmjay, static-rendering, server-components]
dependency_graph:
  requires:
    - 02-01 (shadcn/ui init, shared components scaffold)
    - 02-02 (lib/data/services.ts, PMJAYBadge, SectionHeading, Card/CardContent)
  provides:
    - app/[locale]/(public)/services/page.tsx (Services & Facilities page with PM-JAY section)
    - app/[locale]/(public)/contact/page.tsx (Contact page with address and map placeholder)
  affects:
    - Navigation links in Header — /services and /contact now resolve to real pages
    - PUB-05, PUB-06, PUB-08 requirements satisfied
tech_stack:
  added: []
  patterns:
    - Server Component pages with generateStaticParams for hi/en locales
    - setRequestLocale(locale) called at top of each page component
    - services/facilities arrays from lib/data/services.ts mapped to JSX
    - PMJAYBadge (named export) placed in Ayushman Bharat section of Services page
key_files:
  created:
    - app/[locale]/(public)/services/page.tsx
    - app/[locale]/(public)/contact/page.tsx
  modified: []
decisions:
  - PMJAYBadge and SectionHeading are named exports (not default) — import corrected to match actual exports from wave 2
  - Build verification confirmed via TypeScript check (0 errors) from main repo; Next.js build runs from main repo root as worktrees share node_modules with parent — same pattern as 02-02-SUMMARY
metrics:
  duration: ~8 minutes
  completed: 2026-06-10T16:24:56Z
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 2 Plan 05: Services and Contact Pages Summary

**One-liner:** Services page with 8-service checkmark list + prominent PM-JAY badge + 6-facility card grid; Contact page with 4 typed contact cards + map placeholder div.

## What Was Built

### Task 1 — Services Page (`app/[locale]/(public)/services/page.tsx`)

- **Page header** with breadcrumb "Home › Services & Facilities" and h1
- **Services list section**: Two-column grid mapping 8 services from `lib/data/services.ts`, each with `CheckCircle2` icon in `text-green-600`
- **Ayushman Bharat PM-JAY section** (`bg-blue-50`): Prominent `PMJAYBadge` (default size), empanelment description paragraph, "What is PM-JAY?" explanation — satisfies PUB-08 on a second page beyond the homepage
- **Facilities grid**: 2×3 grid mapping 6 facilities from `lib/data/services.ts`, each rendered as a shadcn Card with the facility's Lucide icon and name
- `generateStaticParams` returns `[{locale:'hi'},{locale:'en'}]`
- Server Component — no `use client` directive

### Task 2 — Contact Page (`app/[locale]/(public)/contact/page.tsx`)

- **Page header** with breadcrumb "Home › Contact Us" and h1
- **Two-column layout**: 4 stacked contact cards (left) + map placeholder div (right)
  - Card 1 — Address: MapPin icon + "Naubasta / Kidwai Nagar, Kanpur - 208021, Uttar Pradesh"
  - Card 2 — Phone: Phone icon + "+91-XXXXXXXXXX (placeholder)"
  - Card 3 — OPD Timings: Clock icon + "Mon–Sat: 9:00 AM – 5:00 PM"
  - Card 4 — 24x7 Emergency: AlertCircle icon (red) + "+91-XXXXXXXXXX"
- **Map placeholder**: `h-64 bg-slate-100 rounded-xl` div with MapPin icon + "Map loading..." text + "Interactive map will be available soon" — no Google Maps embed (API key deferred per plan)
- `generateStaticParams` returns `[{locale:'hi'},{locale:'en'}]`
- Server Component — no `use client` directive

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Named imports for PMJAYBadge and SectionHeading**
- **Found during:** Task 1 implementation
- **Issue:** Plan specified default imports (`import PMJAYBadge from ...` and `import SectionHeading from ...`) but the actual components from wave 2 use named exports (`export function PMJAYBadge` and `export function SectionHeading`)
- **Fix:** Used named imports `{ PMJAYBadge }` and `{ SectionHeading }` to match the actual component signatures
- **Files modified:** `app/[locale]/(public)/services/page.tsx`, `app/[locale]/(public)/contact/page.tsx`
- **Impact:** No behavior change — correct import style prevents TypeScript compilation errors

## Acceptance Criteria Verification

| Criterion | Status |
|-----------|--------|
| `app/[locale]/(public)/services/page.tsx` exists | PASS |
| Services page does NOT contain `use client` | PASS |
| Services page imports and maps `services` array (8 items with CheckCircle2) | PASS |
| Services page imports and maps `facilities` array (6 facility cards) | PASS |
| Services page contains PMJAYBadge render call | PASS |
| Services page exports `generateStaticParams` | PASS |
| `app/[locale]/(public)/contact/page.tsx` exists | PASS |
| Contact page does NOT contain `use client` | PASS |
| Contact page contains "Naubasta / Kidwai Nagar, Kanpur - 208021, Uttar Pradesh" | PASS |
| Contact page contains map placeholder div with `bg-slate-100` and "Map loading..." | PASS |
| Contact page exports `generateStaticParams` | PASS |
| Contact page exports metadata with title containing "Contact Us" | PASS |
| TypeScript check (0 errors) | PASS |

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Phone `+91-XXXXXXXXXX` | `contact/page.tsx` lines 57, 67 | Placeholder until client provides real number (D-04 locked) |

## Threat Surface Scan

No new threat surface introduced. Both pages are pure server-rendered static pages with hardcoded TypeScript constants. No user input, no network calls, no dynamic data. Contact info is intentionally placeholder (per D-04). Map placeholder contains no GPS coordinates. Consistent with T-02-02 and T-02-MAP dispositions in the plan's threat model.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1 — Services page | `05a97bc` | `app/[locale]/(public)/services/page.tsx` |
| Task 2 — Contact page | `fb02ff5` | `app/[locale]/(public)/contact/page.tsx` |

## Self-Check: PASSED

- `app/[locale]/(public)/services/page.tsx` — EXISTS
- `app/[locale]/(public)/contact/page.tsx` — EXISTS
- Commit `05a97bc` — FOUND (feat(02-05): build Services page)
- Commit `fb02ff5` — FOUND (feat(02-05): build Contact page)
- TypeScript: 0 errors
