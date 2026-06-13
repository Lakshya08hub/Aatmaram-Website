---
phase: 08-patient-records
plan: "02"
subsystem: patient-records-data-layer
tags: [patient-records, server-actions, role-gating, supabase, typescript]
dependency_graph:
  requires: [08-01]
  provides: [PatientRecord, getPatientRecords, getActiveDoctorsForDropdown, createPatientAction, updatePatientAction, updateClinicalNotesAction]
  affects: [08-03]
tech_stack:
  added: []
  patterns: [adminClient-for-all-writes, requireRole-helpers, Zod-server-action-validation, doctor-ownership-check]
key_files:
  created:
    - lib/db/patient_records.ts
    - app/(portal)/actions/patients.ts
  modified: []
decisions:
  - "Used adminClient for all patient_records queries (D-07: bypasses RLS; role enforced in application code)"
  - "Doctor identity resolved via doctors.staff_user_id = auth user.id (not profiles join)"
  - "updateClinicalNotesAction performs ownership check before update (T-08-03 mitigation)"
  - "receptionistPatientSchema excludes clinical_notes field entirely to prevent accidental writes"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-13"
  tasks_completed: 2
  files_created: 2
---

# Phase 08 Plan 02: Patient Records Data Layer Summary

Data layer for patient records: typed DB queries and role-gated server actions using adminClient + Zod validation, with doctor ownership enforcement on clinical notes updates.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | PatientRecord type + query utilities | d825619 | lib/db/patient_records.ts |
| 2 | Server actions — create, update, clinical notes | 44b7eda | app/(portal)/actions/patients.ts |

## What Was Built

### lib/db/patient_records.ts

- `PatientRecord` interface: all `patient_records` columns plus `assigned_doctor_name` (populated from joined `doctors` table)
- `getPatientRecords(role, authUserId)`: role-branched query — admin/receptionist/super_admin gets all records; doctor role first resolves `doctors.id` via `staff_user_id = authUserId`, then filters by `assigned_doctor_id`; returns `[]` if no linked doctors row
- `getActiveDoctorsForDropdown()`: active doctors id + full_name, alphabetically ordered for form select
- All queries via `createAdminClient()` (bypasses RLS; portal security enforced at action level)

### app/(portal)/actions/patients.ts

- `receptionistPatientSchema`: Zod object with `patient_name`, `age` (coerced int 0–150), `phone`, `reason`, `assigned_doctor_id` (nullable uuid), `visit_date` — no `clinical_notes` field
- `doctorNotesSchema`: Zod object with `clinical_notes` string
- `requirePatientWriteRole()`: allows `super_admin|admin|receptionist`, throws Forbidden for `doctor`
- `requireDoctorRole()`: allows `doctor` only, throws Forbidden otherwise
- `createPatientAction(prevState, formData)`: inserts record without clinical_notes
- `updatePatientAction(id, prevState, formData)`: updates record fields without clinical_notes
- `updateClinicalNotesAction(id, prevState, formData)`: doctor-only; resolves doctorId via `staff_user_id`, verifies `record.assigned_doctor_id === doctorId` before writing (T-08-03 ownership check)

## Threat Model Compliance

| Threat | Mitigation |
|--------|-----------|
| T-08-02: Elevation of Privilege on requirePatientWriteRole | requirePatientWriteRole() throws Forbidden for doctor role; all non-clinical writes go through this gate |
| T-08-03: Tampering via updateClinicalNotesAction | Ownership check: fetches record and verifies assigned_doctor_id === doctorId before any update |
| T-08-04: FormData tampering | Zod validation on both schemas; age coerced and bounded (0–150); min lengths on text fields |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — this is a data/action layer with no UI rendering.

## Threat Flags

None — no new network endpoints or auth paths beyond what was planned.

## Self-Check: PASSED

- lib/db/patient_records.ts: FOUND
- app/(portal)/actions/patients.ts: FOUND
- Commit d825619: FOUND (feat(08-02): add PatientRecord type...)
- Commit 44b7eda: FOUND (feat(08-02): add createPatientAction...)
- npx tsc --noEmit: PASSED (no output = no errors)
