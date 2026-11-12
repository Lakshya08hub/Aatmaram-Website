---
phase: 16
fixed_at: 2026-06-19T00:00:00.000Z
review_path: .planning/phases/16-portal-ux-upgrade/16-REVIEW.md
iteration: 1
findings_in_scope: 13
fixed: 13
skipped: 0
status: all_fixed
---

# Phase 16: Portal UX Upgrade — Code Review Fix Report

**Fixed at:** 2026-06-19
**Source review:** .planning/phases/16-portal-ux-upgrade/16-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 13 (6 Critical + 7 Warning; IN-001/002/003 excluded per instructions)
- Fixed: 13
- Skipped: 0

## Fixed Issues

### CR-001: Appointments page has no role gate

**Files modified:** `app/(portal)/appointments/page.tsx`
**Commit:** 675db65
**Applied fix:** Added `createClient` + `getUser()` auth check at top of `AppointmentsPage`, then fetched `profile.role` from `profiles` table and redirected to `/dashboard` if the role is not in `ROLE_SECTIONS[role].includes('appointments')`. This blocks doctors and any other role not listed for the appointments section. Combined with WR-003 fix in same commit.

---

### CR-002: `updatePatientInlineAction` allows receptionists to write `clinical_notes`

**Files modified:** `app/(portal)/actions/patients.ts`
**Commit:** d053739
**Applied fix:** Changed `await requirePatientWriteRole()` to `const { role } = await requirePatientWriteRole()` (the function already returned `role`), then added an early return `{ error: 'Forbidden' }` when `field === 'clinical_notes' && role === 'receptionist'`. Combined with CR-006 in same commit.

---

### CR-003: KanbanBoard passes `'completed'` to action that rejects it

**Files modified:** `components/portal/KanbanCard.tsx`, `components/portal/KanbanBoard.tsx`
**Commit:** 46de125
**Applied fix:** In `KanbanCard.tsx`: removed `'completed'` from the `AppointmentStatus` type, set `confirmed: null` in `ADVANCE_MAP` (making confirmed the terminal state with no advance button), and removed the `completed` entry from `STATUS_BADGE_CONFIG`. In `KanbanBoard.tsx`: removed `'completed'` from `AppointmentStatus` type, simplified the cancelled filter to `a.status === 'cancelled'` only, and removed the type cast on `handleAdvance` since types now align.

---

### CR-004: Dashboard queries wrong table `patients` instead of `patient_records`

**Files modified:** `app/(portal)/dashboard/page.tsx`
**Commit:** da829fe
**Applied fix:** Changed `.from('patients')` to `.from('patient_records')` in the patient admissions query.

---

### CR-005: Portal layout performs no section-level authorization

**Files modified:** `lib/portal/roles.ts`, `app/(portal)/staff/page.tsx`, `app/(portal)/content/departments/page.tsx`, `app/(portal)/content/doctors/page.tsx`, `app/(portal)/content/testimonials/page.tsx`, `app/(portal)/patients/page.tsx`
**Commit:** 8cc836a
**Applied fix:** Added `canAccessSection(role, sectionKey)` helper to `lib/portal/roles.ts`. Added full auth + section-gate blocks to `staff/page.tsx` (gates on `'staff'`), `content/departments/page.tsx`, `content/doctors/page.tsx`, and `content/testimonials/page.tsx` (all gate on `'content'`), and a section gate to `patients/page.tsx` (which already had auth but not a section check). `appointments/page.tsx` was covered by CR-001.

---

### CR-006: `updatePatientInlineAction` has no length/format validation

**Files modified:** `app/(portal)/actions/patients.ts`
**Commit:** d053739
**Applied fix:** Added `FIELD_MAX` record with limits (`patient_name: 120`, `phone: 20`, `clinical_notes: 5000`) and a length check before the DB write that returns `{ error: '${field} is too long' }` if exceeded. Combined with CR-002 in same commit.

---

### WR-001: InlineEditCell double-save on blur+enter

**Files modified:** `components/portal/InlineEditCell.tsx`
**Commit:** 8664c4f
**Applied fix:** Added `if (ringState === 'saving') return` as the first line of `handleSave()`, preventing concurrent saves when both Enter key and onBlur fire in rapid succession.

---

### WR-002: ReceptionistSheetForm stale bound action

**Files modified:** `components/portal/PatientClient.tsx`
**Commit:** 8664c4f
**Applied fix:** Added `key={editingRecord?.id ?? 'new'}` to the `<ReceptionistSheetForm>` JSX element so React remounts the component (and its `useActionState`) when the editing record changes.

---

### WR-003: AppointmentsPage swallows fetch errors with no server logging

**Files modified:** `app/(portal)/appointments/page.tsx`
**Commit:** 675db65
**Applied fix:** Changed bare `catch {}` to `catch (e) { console.error('[AppointmentsPage] Failed to load appointment requests:', e) }` so errors are visible in server logs. Combined with CR-001 in same commit.

---

### WR-004: Comment on admin client usage in appointments action

**Files modified:** `app/(portal)/actions/appointments.ts`
**Commit:** ef390cf
**Applied fix:** Added a 3-line comment above `createAdminClient()` in `updateAppointmentStatusAction` explaining that RLS bypass is intentional for the single-hospital v1 setup, and noting the action required if multi-tenancy is added.

---

### WR-006: DepartmentsClient and DoctorsClient silent error on featured-order save

**Files modified:** `app/(portal)/content/departments/DepartmentsClient.tsx`, `app/(portal)/content/doctors/DoctorsClient.tsx`
**Commit:** d040ce6
**Applied fix:** Captured the return value of `setFeaturedOrder(...)` in both `onBlur` handlers and added `if (result?.error) toast.error('Could not save order')`. Both files already imported `toast` from `sonner`.

---

### WR-007: PatientClient `currentUserId` prop unused — doctor scoping verification

**Files modified:** `components/portal/PatientClient.tsx`
**Commit:** 35bcc77
**Applied fix:** Verified that `getPatientRecords()` in `lib/db/patient_records.ts` already filters records by `assigned_doctor_id` when `role === 'doctor'` (resolves auth UID → profiles.id → doctors.id → filter). The server-side scoping is complete. Added a clarifying comment on the `_currentUserId` destructuring to document why the prop is accepted but not used client-side.

---

_Fixed: 2026-06-19_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
