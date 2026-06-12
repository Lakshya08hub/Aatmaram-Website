---
phase: 06-staff-management
plan: "02"
subsystem: portal/staff
tags: [staff-management, crud, role-guard, server-actions, doctor-linkage]
dependency_graph:
  requires: [06-01]
  provides: [staff-management-ui, doctor-profile-linkage]
  affects: [public-doctors-page]
tech_stack:
  added: [shadcn-tabs]
  patterns: [server-component-client-component-split, role-guard-layout, tabs-crud-ui]
key_files:
  created:
    - app/(portal)/staff/layout.tsx
    - app/(portal)/staff/page.tsx
    - app/(portal)/staff/StaffClient.tsx
    - components/ui/tabs.tsx
  modified:
    - app/(portal)/actions/staff.ts
decisions:
  - "Used z.preprocess instead of z.coerce.number to avoid zodResolver generic type mismatch"
  - "Installed shadcn Tabs component (was missing from project, needed for Active/Pending split view)"
  - "updateDoctorStaffLinkAction accepts null doctorId as a no-op (unlink is handled by passing null profileUserId with valid doctorId)"
metrics:
  duration: "25m"
  completed: "2026-06-12"
---

# Phase 6 Plan 02: Staff Management UI Summary

Full staff management CRUD portal page built on top of Phase 6 Plan 01 server actions.

## What Was Built

**Staff Management portal page** — role-guarded full CRUD UI mirroring the Departments page pattern.

- `app/(portal)/staff/layout.tsx` — Server Component role guard: only `super_admin` and `admin` may enter; deactivated users redirected to `/login`; lesser roles redirected to `/dashboard`
- `app/(portal)/staff/page.tsx` — Server Component: fetches `getStaffList()` + `getDoctors()` in parallel via `Promise.all`, passes to `StaffClient`
- `app/(portal)/staff/StaffClient.tsx` — Client Component: full CRUD UI with Active/Pending tabs, Add Dialog, Edit Sheet, toggle and delete controls
- `app/(portal)/actions/staff.ts` — Extended with `updateDoctorStaffLinkAction` for STAFF-05 doctor-profile linkage

## Requirements Covered

| Requirement | Feature | Status |
|-------------|---------|--------|
| STAFF-01 | Add Staff dialog with full_name, email, temp_password, role, phone, salary, join_date | Done |
| STAFF-02 | Edit Staff sheet (no email/password re-entry, all other fields editable) | Done |
| STAFF-03 | Deactivate/Delete buttons per row; AlertDialog confirmation on delete | Done |
| STAFF-04 | Pending tab shows is_active=false accounts; Activate button in Pending tab | Done |
| STAFF-05 | Doctor Profile Select in Edit Sheet for doctor-role staff; writes doctors.staff_user_id | Done |

## Commits

| Hash | Task | Description |
|------|------|-------------|
| fd75e53 | T-06-02-01 | staff layout role guard |
| 39b4130 | T-06-02-02 | Server Component page (replaces stub) |
| cdb1da5 | T-06-02-03 | StaffClient full CRUD UI |
| 1f1a77f | T-06-02-04 | updateDoctorStaffLinkAction |
| 64a68a9 | T-06-02-05 | TypeScript fix + Tabs component install |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Tabs component missing from project**
- **Found during:** T-06-02-05 TypeScript check
- **Issue:** `@/components/ui/tabs` did not exist; Tabs was not installed in the project
- **Fix:** Ran `npx shadcn@latest add tabs` to install the component
- **Files modified:** `components/ui/tabs.tsx` (created)
- **Commit:** 64a68a9

**2. [Rule 1 - Bug] z.coerce.number() incompatible with zodResolver generic typing**
- **Found during:** T-06-02-05 TypeScript check
- **Issue:** `z.coerce.number()` produces `unknown` output type in zod schema inference, causing `Resolver<>` generic mismatch in react-hook-form
- **Fix:** Replaced with `z.preprocess(...)` which preserves `number | undefined` type; added explicit generic types to `useForm<T, unknown, T>`
- **Files modified:** `app/(portal)/staff/StaffClient.tsx`
- **Commit:** 64a68a9

## Known Stubs

None — all CRUD operations are wired to server actions from Plan 06-01.

## Threat Flags

None — no new network endpoints introduced. All staff mutations are guarded by `requireAdminRole()`. Layout provides server-side role enforcement.

## Self-Check

- [x] `app/(portal)/staff/layout.tsx` exists
- [x] `app/(portal)/staff/page.tsx` uses `Promise.all` + `export const dynamic`
- [x] `app/(portal)/staff/StaffClient.tsx` starts with `'use client'`
- [x] `app/(portal)/actions/staff.ts` exports `updateDoctorStaffLinkAction`
- [x] `npx tsc --noEmit` exits 0
- [x] All 5 commits present in git log
