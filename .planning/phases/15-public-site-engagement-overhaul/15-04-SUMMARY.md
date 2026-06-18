---
phase: "15"
plan: "04"
subsystem: public-site
tags: [homepage, pmjay, testimonials, motion, framer-motion]
dependency_graph:
  requires: ["15-03"]
  provides: ["PUBUI-02", "PUBUI-05"]
  affects: ["app/[locale]/(public)/page.tsx"]
tech_stack:
  added: []
  patterns: ["server-component-props-pattern", "conditional-render-strip", "horizontal-scroll-grid"]
key_files:
  created:
    - components/public/PMJAYExplainer.tsx
  modified:
    - app/[locale]/(public)/page.tsx
decisions:
  - "PMJAYExplainer receives translated strings as individual props (not t function) — consistent with SectionHeading pattern and avoids passing opaque function to server components"
  - "FadeIn wraps PM-JAY section outer and testimonials inner div, matching trust band pattern (inner wrap not outer section)"
metrics:
  duration: "~15 min"
  completed: "2026-06-18"
  tasks: 2
  files: 2
---

# Phase 15 Plan 04: PM-JAY Explainer + Testimonials Strip Summary

**One-liner:** PM-JAY explainer with 3 fact cards and CTA, testimonials horizontal-scroll strip, and FadeIn/HoverLift motion wrappers integrated into the homepage.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create PMJAYExplainer component | d31b916 | components/public/PMJAYExplainer.tsx |
| 2 | Integrate PM-JAY, testimonials, motion into homepage | f45027f | app/[locale]/(public)/page.tsx |

## What Was Built

**PMJAYExplainer.tsx** — Pure presentational server component (no `use client`). Receives translated strings as individual props from page.tsx. Renders a `bg-green-50` section with SectionHeading, a 3-column fact card grid (white cards with `border-green-100`), and a `bg-green-600` CTA Link to `/appointment`. No FadeIn inside — applied by parent per D-10 architecture.

**page.tsx updates:**
- New imports: `PMJAYExplainer`, `HoverLift`, `Card`, `CardContent`, `getActiveTestimonials`
- `getActiveTestimonials()` added as 5th entry in `Promise.all`
- `tPmjay` and `tTestimonials` translation objects fetched
- Section 2.5: `<FadeIn><PMJAYExplainer .../></FadeIn>` inserted between trust band and departments
- Section 5.5: Conditional `{testimonials.length > 0 && ...}` testimonials strip with `flex overflow-x-auto` on mobile, `md:grid md:grid-cols-3` on desktop; each card wrapped in `HoverLift`; strip content wrapped in `FadeIn`
- Section 6 inner `div.max-w-4xl` wrapped in `FadeIn` (outer `<section>` unchanged)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All sections are data-driven (pmjay from i18n, testimonials from DB).

## Threat Flags

None. All testimonial data rendered via React JSX (auto-escaped). No `dangerouslySetInnerHTML` used (T-15-06 mitigated by construction).

## Self-Check: PASSED

- components/public/PMJAYExplainer.tsx: FOUND
- app/[locale]/(public)/page.tsx: FOUND (modified)
- Commit d31b916: FOUND
- Commit f45027f: FOUND
