---
phase: "15"
plan: "03"
subsystem: "portal-cms"
tags: ["testimonials", "crud", "portal", "server-actions", "db-module"]
dependency_graph:
  requires: ["15-02"]
  provides: ["getTestimonials", "getActiveTestimonials", "TestimonialsClient", "createTestimonialAction"]
  affects: ["homepage-testimonials-strip", "portal-content-nav"]
tech_stack:
  added: []
  patterns: ["server-component-shell-pattern", "dialog-crud-pattern", "react-hook-form-zod", "optimistic-toggle"]
key_files:
  created:
    - lib/db/testimonials.ts
    - app/(portal)/content/testimonials/page.tsx
    - app/(portal)/content/testimonials/TestimonialsClient.tsx
  modified:
    - app/(portal)/actions/content.ts
    - app/(portal)/content/layout.tsx
decisions:
  - "Used z.number() + valueAsNumber: true in register() instead of z.coerce.number() to avoid react-hook-form TFieldValues type mismatch"
  - "revalidatePath('/en') and /hi (not /en/testimonials) because testimonials appear on the homepage root"
  - "Optimistic Switch toggle with rollback on server action error — consistent with DepartmentsClient pattern"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-18"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 5
---

# Phase 15 Plan 03: Testimonials Data Layer and Portal CRUD Summary

**One-liner:** Testimonials DB module with getActiveTestimonials() for homepage and full Dialog-based portal CRUD (add/edit/delete/toggle) with four server actions gated by requireCmsRole().

## What Was Built

### Task 1 — lib/db/testimonials.ts + server actions (commit: 30b21e3)

`lib/db/testimonials.ts` exports the `Testimonial` interface and two async functions:
- `getTestimonials()` — all rows ordered by sort_order ASC, created_at ASC
- `getActiveTestimonials()` — filtered to is_active = true, ordered by sort_order ASC; returns `data ?? []` (never null)

`app/(portal)/actions/content.ts` has four new exports appended after the hospital-info actions:
- `createTestimonialAction` — insert row, revalidate /en and /hi
- `updateTestimonialAction` — update by id with updated_at timestamp
- `deleteTestimonialAction` — delete by id
- `toggleTestimonialActiveAction` — flip is_active field

All four call `requireCmsRole()` first (T-15-03 mitigation) and use `createAdminClient()` for writes.

### Task 2 — Portal CRUD page and sub-nav (commit: 38233ea)

`app/(portal)/content/testimonials/page.tsx` — Server Component fetching `getTestimonials()`, passes to client. Error state sets `fetchError = true`.

`app/(portal)/content/testimonials/TestimonialsClient.tsx` — Client Component with:
- Zod schema: patient_name (max 100), quote (max 600, T-15-04), designation (optional), is_active (boolean), sort_order (integer 0–999, T-15-05)
- Table with columns: patient, quote (truncated at 60 chars), designation, active Switch, order, actions
- Dialog for add/edit (not Sheet — confirmed 0 sheet imports)
- AlertDialog for delete confirmation
- Optimistic active toggle with rollback on error
- sonner toast.success / toast.error feedback + router.refresh()

`app/(portal)/content/layout.tsx` — Testimonials tab added as the fifth content sub-nav entry.

## Decisions Made

1. **`z.number()` + `valueAsNumber`** instead of `z.coerce.number()` — `z.coerce.number()` causes a TFieldValues type mismatch in react-hook-form's `Resolver` generic; using `z.number()` with `register('sort_order', { valueAsNumber: true })` produces a clean `number` type throughout.

2. **revalidatePath('/en') and revalidatePath('/hi')** — testimonials appear on the homepage strip, not a dedicated /testimonials route. Revalidating the locale roots ensures the homepage cache busts on any CMS change.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error with z.coerce.number() and react-hook-form**
- **Found during:** Task 2 verification (tsc --noEmit)
- **Issue:** `z.coerce.number()` produces an input type of `string | number` in the Zod schema, causing Resolver generic type mismatch TS2322 in useForm
- **Fix:** Changed to `z.number()` with `{ valueAsNumber: true }` option on the register call for sort_order — HTML number input delivers numeric value, Zod validates it as `z.number().int().min(0).max(999)`
- **Files modified:** app/(portal)/content/testimonials/TestimonialsClient.tsx
- **Commit:** 38233ea (included in task commit)

## Threat Flags

None — no new network endpoints or auth paths introduced beyond those covered by the plan's threat model.

## Known Stubs

None — the DB module and CRUD are fully wired. `getActiveTestimonials()` is ready for homepage consumption (Plan 04 or subsequent plan will call it from the homepage server component).

## Self-Check: PASSED

- lib/db/testimonials.ts: FOUND (created)
- app/(portal)/content/testimonials/page.tsx: FOUND (created)
- app/(portal)/content/testimonials/TestimonialsClient.tsx: FOUND (created)
- app/(portal)/actions/content.ts: FOUND (modified)
- app/(portal)/content/layout.tsx: FOUND (modified)
- Commit 30b21e3: FOUND
- Commit 38233ea: FOUND
- TypeScript: 0 errors in testimonials files
- Sheet imports in TestimonialsClient: 0 matches
