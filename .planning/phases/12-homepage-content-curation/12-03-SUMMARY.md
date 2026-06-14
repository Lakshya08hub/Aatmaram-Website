---
phase: 12-homepage-content-curation
plan: "03"
subsystem: portal-cms
tags: [featured-curation, server-actions, portal-ui]
dependency_graph:
  requires: [12-01]
  provides: [toggleFeatured-server-action, setFeaturedOrder-server-action, featured-column-ui]
  affects: [homepage-en, homepage-hi, portal-departments, portal-doctors, portal-facilities]
tech_stack:
  added: []
  patterns: [optimistic-local-state, server-action-mutation, revalidatePath-cascade]
key_files:
  modified:
    - app/(portal)/actions/content.ts
    - app/(portal)/content/departments/DepartmentsClient.tsx
    - app/(portal)/content/doctors/DoctorsClient.tsx
    - app/(portal)/content/facilities/FacilitiesClient.tsx
decisions:
  - "Used optimistic useState per-component (not useOptimistic) to match the existing is_active pattern in DoctorsClient — no new patterns introduced"
  - "toggleFeatured and setFeaturedOrder share a single FeaturedTable union type for clean type safety"
  - "Cap enforcement runs a count query before insert (not a DB constraint) — consistent with existing pattern"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-14"
  tasks_completed: 2
  files_modified: 4
---

# Phase 12 Plan 03: Featured Curation UI Summary

Server Actions for featured toggling and order sorting added to content.ts; all three portal content list pages now show inline Featured Switch and order input backed by those actions.

## What Was Built

**Task 1 — Server Actions in `app/(portal)/actions/content.ts`:**
- `toggleFeatured(table, id, value)` — SET is_featured, enforces max-3 doctors / max-8 departments cap, revalidates portal page + `/en` + `/hi`
- `setFeaturedOrder(table, id, order)` — SET featured_order, guards NaN/negative (T-12-06), same revalidation
- Both call `requireCmsRole()` before any DB write (T-12-05 mitigated)

**Task 2 — Client Component updates:**
- `DepartmentsClient.tsx` — Featured Switch + Order input columns; "X of 8 featured" count label above table
- `DoctorsClient.tsx` — Featured Switch + Order input columns; "X of 3 featured" count label above table
- `FacilitiesClient.tsx` — Featured Switch + Order input columns; "X featured" count label (no cap)
- All three use optimistic `useState` pattern: toggle updates local state immediately, calls Server Action async, reverts on error with `toast.error`
- Switch wrapped in `min-h-[44px]` div for 44px touch target
- Order input uses `onBlur` (not `onChange`) to avoid re-render on every keystroke

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria met:
- `toggleFeatured` and `setFeaturedOrder` exported from content.ts
- Both call `requireCmsRole()` first
- Both revalidate `/en` AND `/hi`
- Max cap enforced at Server Action level (3 doctors, 8 departments)
- All three Client Components import and use both actions
- Switch uses `onCheckedChange`, input uses `onBlur`
- TypeScript: `npx tsc --noEmit` passes with zero errors

## Threat Mitigations Applied

| Threat | Mitigation |
|--------|------------|
| T-12-05 Elevation of Privilege | `requireCmsRole()` called at top of both Server Actions |
| T-12-06 Tampering (order input) | `if (isNaN(order) || order < 0) return {}` guard before DB write |

## Self-Check: PASSED

Files verified present:
- `app/(portal)/actions/content.ts` — modified with 2 new exports
- `app/(portal)/content/departments/DepartmentsClient.tsx` — modified
- `app/(portal)/content/doctors/DoctorsClient.tsx` — modified
- `app/(portal)/content/facilities/FacilitiesClient.tsx` — modified

Pattern counts confirmed via Grep:
- content.ts: 2 matches (export declarations)
- All 3 Client Components: 4 matches each (import + 2 call sites each)
