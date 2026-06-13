---
phase: 08-patient-records
verified: 2026-06-13T00:00:00Z
status: human_needed
score: 11/11 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Log in as receptionist, navigate to /patients, click Add Patient, fill in all fields, submit"
    expected: "Record appears in table immediately after sheet closes; toast shows 'Patient record added'"
    why_human: "Cannot invoke live Supabase insert from static grep; form submit + router.refresh() cycle is UI behavior"
  - test: "Log in as doctor whose staff_user_id is set, navigate to /patients"
    expected: "Only records where assigned_doctor_id matches this doctor's doctors.id are visible; 'Add Patient' button is absent"
    why_human: "Role-filtered DB query result must be verified against live Supabase rows; server-side filtering cannot be exercised by static analysis"
  - test: "As doctor, click pencil icon on any visible record, edit clinical_notes textarea, submit"
    expected: "Sheet closes, toast shows 'Notes saved', clinical_notes column updated in DB; other fields (name/age/phone/reason/date) are rendered as read-only text"
    why_human: "updateClinicalNotesAction ownership check and DB write require live auth session and live DB row"
  - test: "Log in as Admin, navigate to /patients"
    expected: "All records across all doctors visible; 'Add Patient' button present"
    why_human: "Admin sees all records path in getPatientRecords — needs live data to confirm no accidental doctor-filter applied"
  - test: "Confirm /patients link is reachable from portal sidebar navigation"
    expected: "Sidebar shows a 'Patients' or 'Patient Records' link navigating to /patients"
    why_human: "Sidebar component (components/portal/Sidebar.tsx) contains no 'patients' reference — portal users cannot discover this page from the sidebar without knowing the URL. Needs human to confirm if this is intentional or a gap."
---

# Phase 8: Patient Records Verification Report

**Phase Goal:** Lightweight EMR — receptionists create visit records, doctors add clinical notes, each role sees only what their access level permits.
**Verified:** 2026-06-13
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | patient_records table DDL exists with correct columns and FK | VERIFIED | `supabase/migrations/20260613_patient_records.sql` — CREATE TABLE IF NOT EXISTS with all 10 columns |
| 2 | assigned_doctor_id FK uses ON DELETE SET NULL | VERIFIED | Line 11: `REFERENCES doctors(id) ON DELETE SET NULL` |
| 3 | getPatientRecords returns all records for admin/receptionist | VERIFIED | `lib/db/patient_records.ts` lines 64-73 — no filter for non-doctor roles |
| 4 | getPatientRecords for doctor filters by assigned_doctor_id matching calling doctor's doctors.id | VERIFIED | Lines 37-62 — resolves `staff_user_id = authUserId` then filters `.eq('assigned_doctor_id', doctorId)` |
| 5 | createPatientAction creates row; updateClinicalNotesAction updates only clinical_notes | VERIFIED | `actions/patients.ts` lines 102-134, 184-236 — create inserts all fields except clinical_notes; notes action updates only `{ clinical_notes }` |
| 6 | Doctor identity resolved via doctors.staff_user_id = auth user.id | VERIFIED | Both `lib/db/patient_records.ts` line 42 and `actions/patients.ts` line 197 use `.eq('staff_user_id', user.id)` |
| 7 | Receptionist sees all patient records, can add/edit all fields except clinical_notes | VERIFIED | `PatientClient.tsx` ReceptionistSheetForm renders name/age/phone/reason/date/doctor; clinical_notes field absent from form; `requirePatientWriteRole()` allows receptionist |
| 8 | Doctor sees only assigned patients, can edit clinical_notes only (all other fields read-only) | VERIFIED | `PatientClient.tsx` DoctorSheetForm lines 303-364 — ReadOnlyField components for all fields, Textarea only for clinical_notes; data filtered server-side |
| 9 | Admin and Super Admin see all records | VERIFIED | `getPatientRecords` non-doctor branch returns all records; `requirePatientWriteRole()` allows admin/super_admin |
| 10 | Client-side search filters by patient_name or phone | VERIFIED | `PatientClient.tsx` lines 387-391 — case-insensitive filter on both fields |
| 11 | updateClinicalNotesAction verifies record ownership before writing | VERIFIED | `actions/patients.ts` lines 197-214 — resolves doctorId, fetches record, checks `record.assigned_doctor_id !== doctorId` before update |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260613_patient_records.sql` | DDL for patient_records table | VERIFIED | Exists, substantive, 51 lines — CREATE TABLE + trigger |
| `lib/db/patient_records.ts` | PatientRecord type + getPatientRecords() + getActiveDoctorsForDropdown() | VERIFIED | Exports all three; role-filtered query logic fully implemented |
| `app/(portal)/actions/patients.ts` | createPatientAction, updatePatientAction, updateClinicalNotesAction | VERIFIED | All three exported with 'use server'; Zod validation; role gates |
| `components/portal/PatientClient.tsx` | Full patient list + Sheet add/edit UI with role-aware field rendering | VERIFIED | 565 lines; ReceptionistSheetForm and DoctorSheetForm both implemented; table, search, empty states |
| `app/(portal)/patients/page.tsx` | Server Component that fetches records + role, passes to PatientClient | VERIFIED | Fetches role, calls getPatientRecords + getActiveDoctorsForDropdown in parallel, passes typed props |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/(portal)/patients/page.tsx` | `getPatientRecords()` | server-side fetch, prop pass | WIRED | Line 36: `getPatientRecords(role, user.id)` in Promise.all; prop `records` passed to PatientClient |
| `PatientClient.tsx (doctor sheet)` | `updateClinicalNotesAction` | useActionState | WIRED | `DoctorSheetForm` line 286: `.bind(null, editingRecord.id)` + `useActionState(boundAction, {})` |
| `PatientClient.tsx (receptionist sheet)` | `createPatientAction / updatePatientAction` | useActionState | WIRED | `ReceptionistSheetForm` lines 111-114: conditional bind on `isEdit`, useActionState |
| `getPatientRecords (doctor branch)` | `doctors.staff_user_id` | SELECT id FROM doctors WHERE staff_user_id = authUserId | WIRED | `lib/db/patient_records.ts` line 42: `.eq('staff_user_id', authUserId)` |
| `updateClinicalNotesAction` | `patient_records.clinical_notes` | .update({ clinical_notes }) | WIRED | `actions/patients.ts` line 229: `.update({ clinical_notes: validation.data.clinical_notes })` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `PatientClient.tsx` | `records` prop | `getPatientRecords()` → adminClient query on `patient_records` table | Yes — SELECT with JOIN from live DB | FLOWING |
| `PatientClient.tsx` | `doctors` prop | `getActiveDoctorsForDropdown()` → adminClient query on `doctors` table | Yes — SELECT from live DB | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — portal requires live Supabase auth session; no runnable entry point available without a running server and seeded DB.

---

### Probe Execution

No probe scripts declared or found for phase 8.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| PAT-01 | 08-01, 08-02, 08-03 | Receptionist can create a patient record with name, age, phone, reason, assigned doctor, and date | SATISFIED | `createPatientAction` + `ReceptionistSheetForm` with all fields; `requirePatientWriteRole()` permits receptionist |
| PAT-02 | 08-02, 08-03 | Doctor can view only the patients assigned to them | SATISFIED | `getPatientRecords` doctor branch filters by `assigned_doctor_id`; server-side only filtered data reaches PatientClient |
| PAT-03 | 08-02, 08-03 | Doctor can add clinical notes to their assigned patients | SATISFIED | `updateClinicalNotesAction` with ownership check + `DoctorSheetForm` with editable Textarea |
| PAT-04 | 08-02, 08-03 | Admin and Super Admin can view all patient records | SATISFIED | Non-doctor branch of `getPatientRecords` returns all records; `requirePatientWriteRole` permits admin/super_admin |
| PAT-05 | 08-02, 08-03 | Receptionist can view all patient records for check-in purposes | SATISFIED | Same non-doctor branch; `getPatientRecords` with role='receptionist' returns all records |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `components/portal/Sidebar.tsx` | — | No `/patients` navigation link | WARNING | Portal users cannot discover the Patient Records page from the sidebar; page is reachable only by direct URL `/patients`. Not a code debt marker; no TBD/FIXME/XXX found. |

No TBD, FIXME, or XXX markers found in any phase 8 files.

---

### Human Verification Required

#### 1. Receptionist Create Flow

**Test:** Log in as receptionist, navigate to `/patients`, click "Add Patient", fill all fields, submit.
**Expected:** Record appears in table after sheet closes; toast shows "Patient record added".
**Why human:** Live Supabase insert + router.refresh() cycle cannot be verified by static analysis.

#### 2. Doctor Role-Filtered View

**Test:** Log in as doctor with `staff_user_id` configured, navigate to `/patients`.
**Expected:** Only records where `assigned_doctor_id` matches this doctor's `doctors.id` are shown; "Add Patient" button absent.
**Why human:** Server-side filtered query result must be confirmed against live DB rows.

#### 3. Doctor Clinical Notes Edit

**Test:** As doctor, click pencil on a visible record, edit the clinical notes textarea, submit.
**Expected:** Sheet closes, toast shows "Notes saved", other fields remain read-only text.
**Why human:** `updateClinicalNotesAction` ownership check requires live auth session and real DB row.

#### 4. Admin Full-Access View

**Test:** Log in as Admin, navigate to `/patients`.
**Expected:** All records across all doctors visible; "Add Patient" button present.
**Why human:** Admin all-records path needs live data to confirm no accidental filter applied.

#### 5. Sidebar Navigation Link

**Test:** Check the portal sidebar for a "Patients" or "Patient Records" link.
**Expected:** A navigation link to `/patients` exists in the sidebar so users can reach the page without knowing the URL.
**Why human:** `components/portal/Sidebar.tsx` contains no reference to `patients` — this requires a human to confirm whether the omission is intentional (link to be added in a later phase) or a gap that should be fixed now.

---

### Gaps Summary

No automated-verifiable gaps found. All 11 must-have truths verified. All 5 PAT requirements have substantive, wired, data-flowing implementations.

One WARNING item: the portal sidebar has no navigation entry for `/patients`. The page is fully functional and reachable, but a staff user logging in cannot see the link in the navigation. Whether this is an intentional deferral (to be added when sidebar is revisited) or an oversight requires human judgment.

---

_Verified: 2026-06-13_
_Verifier: Claude (gsd-verifier)_
