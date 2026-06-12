---
phase: 05-content-management
plan: "02"
subsystem: portal-cms
tags: [departments, crud, server-actions, shadcn, revalidatepath]
dependency_graph:
  requires: [05-01]
  provides: [departments-crud-page]
  affects: [public-departments-pages]
tech_stack:
  added: []
  patterns: [server-component-client-component-split, server-actions-with-role-guard, revalidatepath-bilingual]
key_files:
  created:
    - lib/db/departments.ts
    - app/(portal)/actions/content.ts
    - app/(portal)/content/departments/page.tsx
    - app/(portal)/content/departments/DepartmentsClient.tsx
  modified: []
decisions:
  - "Department type annotation added explicitly to page.tsx to satisfy strict TS inference (auto-fix)"
  - "Empty image_url string coerced to undefined before passing to Server Actions to avoid URL validation rejection on empty optional field"
metrics:
  duration: "~30 min (resumed session)"
  completed: "2026-06-12"
requirements: [CMS-01, CMS-04]
---

# Phase 05 Plan 02: Departments CRUD Page Summary

**One-liner:** Portal departments management page with Server Actions, role-gated writes, and bilingual revalidatePath for immediate public site reflection.

## What Was Built

Full Departments CRUD at `/portal/content/departments`:

- **lib/db/departments.ts** — `Department` type + `getDepartments()` server utility querying Supabase ordered by `created_at`
- **app/(portal)/actions/content.ts** — `createDepartmentAction`, `updateDepartmentAction`, `deleteDepartmentAction` with `requireCmsRole()` guard (super_admin/admin only), revalidates `/en/departments` and `/hi/departments` after every mutation
- **page.tsx** — Server Component that fetches data and passes `initialData`/`fetchError` to client
- **DepartmentsClient.tsx** — Client Component with shadcn Table, Dialog (add/edit with zod schema), AlertDialog (delete confirmation), Sonner toasts, `router.refresh()` after every success

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DB utility + Server Actions | 1e5bc61 | lib/db/departments.ts, app/(portal)/actions/content.ts |
| 2 | Portal Departments page (Server + Client) | adb89a6 | page.tsx, DepartmentsClient.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Implicit `any[]` type on `departments` variable in page.tsx**
- **Found during:** TypeScript check after Task 2
- **Issue:** `let departments = []` inferred as `any[]` causing TS2307 errors
- **Fix:** Typed explicitly as `Department[]` and added `Department` to imports
- **Files modified:** app/(portal)/content/departments/page.tsx
- **Commit:** adb89a6

## Known Stubs

None — DepartmentsClient renders live Supabase data passed from the Server Component. No hardcoded placeholder data.

## Threat Surface Scan

No new network endpoints or trust boundaries beyond those documented in the plan's threat model (T-05-03, T-05-05 mitigated via `requireCmsRole()`).

## Self-Check: PASSED

- lib/db/departments.ts: exists (committed 1e5bc61)
- app/(portal)/actions/content.ts: exists (committed 1e5bc61)
- app/(portal)/content/departments/page.tsx: exists (committed adb89a6)
- app/(portal)/content/departments/DepartmentsClient.tsx: exists (committed adb89a6)
- TypeScript: `npx tsc --noEmit` exits 0
- revalidatePath('/en/departments') present in content.ts
- revalidatePath('/hi/departments') present in content.ts
