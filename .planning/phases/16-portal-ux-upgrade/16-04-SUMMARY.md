---
phase: 16-portal-ux-upgrade
plan: "04"
subsystem: portal-tables
tags: [inline-edit, ux, portal, content-management]
dependency_graph:
  requires: [16-01]
  provides: [InlineEditCell, updatePatientInlineAction]
  affects:
    - components/portal/InlineEditCell.tsx
    - app/(portal)/content/departments/DepartmentsClient.tsx
    - app/(portal)/content/testimonials/TestimonialsClient.tsx
    - app/(portal)/content/doctors/DoctorsClient.tsx
    - app/(portal)/staff/StaffClient.tsx
    - components/portal/PatientClient.tsx
    - app/(portal)/actions/patients.ts
tech_stack:
  added: []
  patterns:
    - InlineEditCell controlled-input with ring-state machine
    - onSave callback pattern — parent owns router.refresh
key_files:
  created:
    - components/portal/InlineEditCell.tsx
  modified:
    - app/(portal)/content/departments/DepartmentsClient.tsx
    - app/(portal)/content/testimonials/TestimonialsClient.tsx
    - app/(portal)/content/doctors/DoctorsClient.tsx
    - app/(portal)/staff/StaffClient.tsx
    - components/portal/PatientClient.tsx
    - app/(portal)/actions/patients.ts
decisions:
  - "updatePatientInlineAction added to patients.ts — existing updatePatientAction uses FormData/useActionState and cannot be called directly from onSave"
  - "updateTestimonialAction requires full object (not Partial) — inline onSave passes full testimonial fields with only patient_name changed"
  - "PatientClient inline edits restricted to non-doctor roles; doctors retain read-only view"
metrics:
  duration: 15
  completed_date: "2026-06-19"
  tasks_completed: 2
  files_changed: 7
---

# Phase 16 Plan 04: InlineEditCell Integration Summary

**One-liner:** Reusable InlineEditCell component with blue/green/red ring state machine integrated into departments, testimonials, doctors, staff, and patient table cells for friction-free inline editing.

## What Was Built

**Task 1 — InlineEditCell component (`components/portal/InlineEditCell.tsx`)**

A `'use client'` component that renders a read-mode span (with hover pencil icon) that transitions to a controlled `<Input>` on click. Ring state machine:

- `idle`: no ring
- saving: `ring-2 ring-blue-500` + `opacity-70`
- success: `ring-2 ring-green-500` for 600ms then back to idle
- error: `ring-2 ring-red-500` + `toast.error`

Enter saves, Escape reverts. No-op if value unchanged. Parent owns `router.refresh()` via the `onSave` callback.

Also added `updatePatientInlineAction` server action — a new plain-object action (not FormData) that whitelists `patient_name | phone | clinical_notes` fields with server-side `requirePatientWriteRole()` guard (T-16-09).

**Task 2 — Integration into 5 client components**

| Component | Field(s) Made Inline-Editable |
|-----------|-------------------------------|
| DepartmentsClient | `name` |
| TestimonialsClient | `patient_name` |
| DoctorsClient | `full_name` |
| StaffClient | `full_name` |
| PatientClient | `patient_name`, `phone` (non-doctor roles only) |

All existing Dialogs/Sheets for full CRUD remain intact. Inline edit is purely additive to table cells.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Adaptation] updatePatientAction signature incompatible with InlineEditCell**
- **Found during:** Task 2 implementation
- **Issue:** `updatePatientAction` uses `useActionState` FormData pattern and requires all fields. Cannot be called directly from `onSave: (v: string) => Promise<{error?:string}>`.
- **Fix:** Added `updatePatientInlineAction` to `patients.ts` — a dedicated plain-object action that accepts a single whitelisted field name and value with the same `requirePatientWriteRole()` guard.
- **Files modified:** `app/(portal)/actions/patients.ts`
- **Commit:** 42c438c

**2. [Rule 1 - Adaptation] updateTestimonialAction requires full object**
- **Found during:** Task 2
- **Issue:** `updateTestimonialAction` accepts a required full input object, not `Partial`. Calling with only `patient_name` would cause TypeScript errors.
- **Fix:** Inline `onSave` passes full testimonial object with only `patient_name` swapped — preserves all other fields from the existing record.
- **Files modified:** `app/(portal)/content/testimonials/TestimonialsClient.tsx`

## Security Notes

All threat mitigations from the plan's STRIDE register are implemented:
- **T-16-07:** Every `onSave` calls a Server Action that enforces `requireCmsRole()` or `requirePatientWriteRole()` — no client bypass possible
- **T-16-08:** React `<Input>` (controlled) used — not contentEditable; all values escaped by React
- **T-16-09:** Client-side empty guard in `onSave` callbacks; server-side non-empty validation in `updatePatientInlineAction`

## Known Stubs

None.

## Threat Flags

None — no new network endpoints or trust boundaries introduced beyond those in the plan's threat model.

## Self-Check: PASSED

- `components/portal/InlineEditCell.tsx` — exists
- `app/(portal)/actions/patients.ts` — `updatePatientInlineAction` added
- Commits: 42c438c (Task 1), 58106a5 (Task 2)
- `npx tsc --noEmit` — passed
- `npx next build` — passed
