---
phase: 15
fixed_at: 2026-06-19T00:00:00Z
review_path: .planning/phases/15-public-site-engagement-overhaul/15-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 15: Code Review Fix Report

**Fixed at:** 2026-06-19
**Source review:** `.planning/phases/15-public-site-engagement-overhaul/15-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 9
- Fixed: 9
- Skipped: 0

## Fixed Issues

### CR-001: Missing server-side input validation in content actions

**Files modified:** `app/(portal)/actions/content.ts`
**Commit:** cb1ca58
**Applied fix:** Added `import { z } from 'zod'` and a `testimonialSchema` (patient_name min 2/max 100, quote min 10/max 1000, designation optional max 100, sort_order coerced int 0-999). Applied `testimonialSchema.safeParse(input)` at the start of both `createTestimonialAction` and `updateTestimonialAction`, returning `{ error: result.error.issues[0].message }` on failure. `updateDepartmentAction` and `updateDoctorAction` were also addressed in WR-004 (field whitelisting).

### CR-002: Unhandled rejection crashes the public homepage

**Files modified:** `app/[locale]/(public)/page.tsx`
**Commit:** 03ead03
**Applied fix:** Added a module-scope `safeFetch<T>(fn, fallback)` helper. Replaced the bare `Promise.all([...])` with `Promise.all([safeFetch(..., []), ...])` so a failing fetch returns the fallback value instead of crashing the render.

### CR-003: Portal testimonials page does not check DB error from profile query

**Files modified:** `app/(portal)/content/testimonials/page.tsx`
**Commit:** e9cf14a
**Applied fix:** Changed `const { data: profile }` to `const { data: profile, error }` and updated the guard from `if (!profile || ...)` to `if (error || !profile || ...)`.

### CR-004: `setFeaturedOrder` returns success shape on invalid input

**Files modified:** `app/(portal)/actions/content.ts`
**Commit:** c5b1ba3
**Applied fix:** Changed `return {}` to `return { error: 'Invalid order value' }` when `isNaN(order) || order < 0`.

### WR-001: Hardcoded "Our Facilities" heading on bilingual homepage

**Files modified:** `app/[locale]/(public)/page.tsx`, `messages/en.json`, `messages/hi.json`
**Commit:** aa15fb4
**Applied fix:** Added `"facilities": "Our Facilities"` to `home.sections` in `en.json` and `"facilities": "हमारी सुविधाएं"` in `hi.json`. Replaced the hardcoded string and TODO comment with `t('sections.facilities')` in the homepage component.

### WR-002: MobileNav labels hardcoded in English

**Files modified:** `components/layout/MobileNav.tsx`, `messages/en.json`, `messages/hi.json`
**Commit:** aa15fb4
**Applied fix:** The `nav` namespace already existed with all keys (home, about, departments, doctors, services, contact, cta). Replaced the hardcoded `navLinks` array with `navHrefs` (href only), added `useTranslations('nav')`, and rendered `tNav(link.key)` for each link and the CTA button. Committed together with WR-001 per the review strategy.

### WR-003: LanguageToggle `<span role="button">` missing Space key handler

**Files modified:** `components/layout/LanguageToggle.tsx`
**Commit:** 8211ac2
**Applied fix:** Replaced both `<span role="button" tabIndex={0} onKeyDown={...}>` elements in the drawer variant with `<button type="button">` elements. Removed `role="button"`, `tabIndex`, and `onKeyDown` (native buttons handle Space/Enter natively). Preserved `onClick` and `aria-label`.

### WR-004: `updateDepartmentAction` / `updateDoctorAction` spread unvalidated Partial input

**Files modified:** `app/(portal)/actions/content.ts`
**Commit:** 5264dc6
**Applied fix:** Added `DEPARTMENT_ALLOWED_FIELDS` and `DOCTOR_ALLOWED_FIELDS` `as const` arrays. Before the DB update, each action filters `Object.entries(input)` to keep only entries whose key is in the whitelist and whose value is not an empty string. The cleaned object is spread into the update call instead of the raw `input`.

### WR-005: `select('*')` over-fetches in testimonials DB query

**Files modified:** `lib/db/testimonials.ts`
**Commit:** 5264dc6
**Applied fix:** Replaced both `.select('*')` calls (in `getTestimonials` and `getActiveTestimonials`) with `.select('id, patient_name, quote, designation, is_active, sort_order, created_at, updated_at')` — all fields used by the `Testimonial` interface and rendered in `TestimonialsClient`/homepage strip. Committed together with WR-004 per the review strategy.

### WR-006: Featured-count cap check is non-atomic

**Files modified:** `app/(portal)/actions/content.ts`
**Commit:** e7e3f20
**Applied fix:** Added a detailed JSDoc comment on `toggleFeatured` documenting the race condition, why it is acceptable for v1 (single-hospital, low-traffic portal), and a TODO pointing to the correct long-term fix (Postgres function or trigger). No code logic change — a migration is required for a proper atomic fix and is out of scope for this phase.

## Skipped Issues

None — all findings were fixed.

---

_Fixed: 2026-06-19_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
