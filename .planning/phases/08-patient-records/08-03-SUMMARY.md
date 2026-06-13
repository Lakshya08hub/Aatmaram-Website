---
phase: 08-patient-records
plan: "03"
subsystem: patient-records-ui
tags: [patient-records, portal-ui, role-aware, shadcn, server-component]
dependency_graph:
  requires: [08-02]
  provides: [PatientClient, patients-page]
  affects: []
tech_stack:
  added: []
  patterns: [server-component-client-handoff, useActionState-form-pattern, role-aware-ui, client-side-search]
key_files:
  created:
    - app/(portal)/patients/page.tsx
    - components/portal/PatientClient.tsx
  modified: []
decisions:
  - "Used useActionState with submitted flag to detect success (no error after non-pending transition)"
  - "Select onValueChange typed as (val: string | null) => void per Radix UI version — handled with val ?? '' fallback"
  - "fetchError prop passed from server to client for inline error banner rather than throw"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-13"
  tasks_completed: 2
  files_created: 2
---

# Phase 08 Plan 03: Patient Records UI Summary

Role-aware Patient Records portal page — receptionist/admin sees all records and can add/edit (no clinical_notes); doctor sees only assigned records with read-only fields and editable clinical_notes Textarea.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Server Component page — fetch + role resolution | 85d0f86 | app/(portal)/patients/page.tsx |
| 2 | PatientClient — table + Sheet + role-aware fields | 006e2f7 | components/portal/PatientClient.tsx |

## What Was Built

### app/(portal)/patients/page.tsx

- Async Server Component; calls `createClient()` + `supabase.auth.getUser()`, redirects to `/login` if no user
- Resolves `role` from `profiles` table for the authenticated user
- Calls `getPatientRecords(role, user.id)` and `getActiveDoctorsForDropdown()` in parallel
- Passes `records`, `doctors`, `role`, `currentUserId`, `fetchError` to `PatientClient`
- `export const dynamic = 'force-dynamic'` and metadata title set

### components/portal/PatientClient.tsx

- `'use client'` component with `PatientClientProps` interface
- Client-side search: filters `filteredRecords` by `patient_name` (case-insensitive) or `phone`
- **Table columns:** Patient Name, Age (Badge), Phone, Reason (truncated 40 chars), Doctor, Visit Date, Notes badge ("Added" / "—"), Actions (Pencil icon)
- **Role-gated "Add Patient" button:** visible for receptionist/admin/super_admin; hidden for doctor
- **Sheet (single, driven by `sheetOpen` state):**
  - Receptionist/Admin: full form (patient_name, age, phone, reason, assigned_doctor_id Select, visit_date); no clinical_notes field; `createPatientAction` (Add) or `updatePatientAction` (Edit) via `useActionState`
  - Doctor: read-only patient info panel (`space-y-3 rounded-md border bg-slate-50`) + editable `Textarea` for clinical_notes; `updateClinicalNotesAction` via `useActionState`
- **Sheet titles:** "Add Patient Record" / "Edit Patient Record" (receptionist) / "Add Clinical Notes" (doctor)
- **Footer buttons per UI-SPEC:** Discard / Add Patient (add flow), Discard Changes / Save Changes (edit flow), Close / Save Notes (doctor flow)
- **Empty states:** doctor: "No patients assigned to you yet."; others: "No patient records yet."; search miss: "No records match your search."
- **Toast messages:** "Patient record added", "Record updated", "Notes saved", or error passthrough
- `router.refresh()` via `useTransition` after successful action

## Threat Model Compliance

| Threat | Mitigation |
|--------|-----------|
| T-08-05: Information Disclosure via records prop | Server Component passes only role-filtered records; doctor never receives other patients' data |
| T-08-06: Elevation of Privilege — Add Patient button | Button conditionally hidden when `role === 'doctor'`; server action independently rejects doctor role |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Radix Select onValueChange types `string | null`**
- **Found during:** Task 2 TypeScript check
- **Issue:** `onValueChange` callback in this version of Radix UI Select passes `string | null` not `string`; the plain `(val) => setAssignedDoctor(val)` call failed type check
- **Fix:** Changed to `(val) => setAssignedDoctor(val ?? '')` to coerce null to empty string
- **Files modified:** components/portal/PatientClient.tsx
- **Commit:** 006e2f7

## Known Stubs

None — all data paths are wired to real server actions and database queries.

## Threat Flags

None — no new network endpoints or auth paths beyond what was planned.

## Self-Check: PASSED

- app/(portal)/patients/page.tsx: FOUND
- components/portal/PatientClient.tsx: FOUND
- Commit 85d0f86: FOUND (feat(08-03): add patients Server Component page...)
- Commit 006e2f7: FOUND (feat(08-03): add PatientClient...)
- npx tsc --noEmit: PASSED (no output = no errors)
- npm run build: PASSED (/patients route listed as dynamic)
