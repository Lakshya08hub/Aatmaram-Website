---
phase: 16
phase_name: portal-ux-upgrade
status: issues_found
review_depth: deep
files_reviewed: 19
files_reviewed_list:
  - app/(portal)/actions/appointments.ts
  - app/(portal)/actions/patients.ts
  - app/(portal)/appointments/page.tsx
  - app/(portal)/content/departments/DepartmentsClient.tsx
  - app/(portal)/content/doctors/DoctorsClient.tsx
  - app/(portal)/content/testimonials/TestimonialsClient.tsx
  - app/(portal)/dashboard/page.tsx
  - app/(portal)/staff/StaffClient.tsx
  - app/globals.css
  - components/portal/DashboardCharts.tsx
  - components/portal/InlineEditCell.tsx
  - components/portal/KanbanBoard.tsx
  - components/portal/KanbanCard.tsx
  - components/portal/KanbanColumn.tsx
  - components/portal/PatientClient.tsx
  - components/portal/Sidebar.tsx
  - components/ui/chart.tsx
  - components/ui/tooltip.tsx
  - lib/portal/roles.ts
findings:
  critical: 6
  warning: 7
  info: 3
  total: 16
---

# Phase 16: Portal UX Upgrade — Code Review Report

**Reviewed:** 2026-06-19
**Depth:** deep
**Files Reviewed:** 19
**Status:** issues_found

## Summary

The portal has a solid auth foundation: the layout RSC gates every route with `getUser()` (not `getSession()`), server actions re-verify role from the `profiles` table, and PHI fields are server-validated before writes. However, six critical issues remain: a broken role gate on the appointments page allows any authenticated staff (including doctors) to see all patient appointment data; `updatePatientInlineAction` allows receptionist-role users to write `clinical_notes` despite the stated policy that only doctors may do so; the `AppointmentsPage` RSC has no role enforcement of its own; the portal layout does not enforce section-level access (hide-not-lock is the stated policy, but the URL is still reachable by any authenticated role); the dashboard queries run against the wrong table name (`patients` instead of `patient_records`); and the `KanbanBoard` passes `'completed'` as a status to `updateAppointmentStatusAction` which only accepts the four DB-valid values, causing a silent type mismatch. Several warnings around input validation gaps, inline-edit double-save races, and stale-closure risks in `InlineEditCell` are also documented.

---

## Critical Issues

### CR-001 — Appointments page has no role gate; doctors and receptionists can see all appointments

**Severity:** Critical
**File:** `app/(portal)/appointments/page.tsx:6`
**Issue:** `AppointmentsPage` is a plain RSC that calls `getAppointmentRequests()` without checking the caller's role. The portal layout only verifies the user is authenticated and active — it does not enforce section-level access. `ROLE_SECTIONS` maps `doctor` to `['dashboard', 'patients']` (no `appointments`), but because the URL `/appointments` is reachable by any logged-in user, a doctor can visit it directly and receive the full list of patient names, phone numbers, and appointment details.

`getAppointmentRequests()` itself uses the user-scoped Supabase client (`createClient`) with a bare `.select('*')`, so the result set is gated only by RLS. If RLS on `appointment_requests` is permissive (as is common in portals that rely on application-level gates), all rows are returned.

**Fix:**
```ts
// app/(portal)/appointments/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ROLE_SECTIONS } from '@/lib/portal/roles'

export default async function AppointmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!profile || !ROLE_SECTIONS[profile.role]?.includes('appointments')) {
    redirect('/dashboard')
  }
  // ... rest of page
}
```
Apply the same pattern to every other portal page RSC.

---

### CR-002 — `updatePatientInlineAction` allows receptionists to write `clinical_notes`

**Severity:** Critical
**File:** `app/(portal)/actions/patients.ts:255-280`
**Issue:** The inline action's field whitelist is `'patient_name' | 'phone' | 'clinical_notes'`. The function calls `requirePatientWriteRole()` which permits `super_admin`, `admin`, and `receptionist`. This means a receptionist can call `updatePatientInlineAction(id, 'clinical_notes', '...')` from the browser dev console (Server Actions are directly invokable) and overwrite clinical notes — violating the documented policy that "doctors set it via `updateClinicalNotesAction`" and that receptionists have read-only access to clinical notes.

**Fix:**
```ts
export async function updatePatientInlineAction(
  id: string,
  field: 'patient_name' | 'phone' | 'clinical_notes',
  value: string
): Promise<{ error?: string }> {
  try {
    const { role } = await requirePatientWriteRole()

    // clinical_notes is admin-only via inline edit; doctors use updateClinicalNotesAction
    if (field === 'clinical_notes' && role === 'receptionist') {
      return { error: 'Forbidden' }
    }
    // ... rest unchanged
  }
}
```

---

### CR-003 — `KanbanBoard` passes `'completed'` to an action that rejects it, silently corrupting status

**Severity:** Critical
**File:** `components/portal/KanbanBoard.tsx:26-29`
**Issue:** `ADVANCE_MAP` in `KanbanCard` maps `confirmed → completed`. `KanbanBoard.handleAdvance` receives `nextStatus: AppointmentStatus` (which includes `'completed'`) and casts it:

```ts
nextStatus as 'pending' | 'contacted' | 'confirmed' | 'cancelled'
```

`updateAppointmentStatusAction` accepts only those four values — the DB column type likely constrains this too. When a user clicks "Mark Completed" on a confirmed appointment, the action either silently stores the string `'completed'` in the DB (if no DB constraint exists) or it throws and returns an unhandled error. Either outcome corrupts data: the appointment stays in `confirmed` on the Kanban but may flip to an unknown status in the DB.

Additionally, `KanbanBoard` filters `completed` appointments into the `cancelled` column:
```ts
const cancelled = appointments.filter(
  (a) => a.status === 'cancelled' || (a.status as string) === 'completed'
)
```
This means completed appointments vanish into the Cancelled column with no visual distinction.

**Fix:** Either add `'completed'` to the DB enum and the `AppointmentStatus` type in `appointments.ts`, or remove the `completed` state from `ADVANCE_MAP` and keep `confirmed` as the terminal success state.

---

### CR-004 — Dashboard queries wrong table; patient admission data is always zero

**Severity:** Critical
**File:** `app/(portal)/dashboard/page.tsx:29-35`
**Issue:** The dashboard queries `.from('patients')` but the patient records table is `patient_records` (as used in every patients server action). The query will either silently return an empty array (if `patients` does not exist but RLS hides the error) or throw (caught and swallowed). Either way, "Patient Admissions" always shows zero. This is a data-loss-equivalent defect for the dashboard reporting function of a hospital portal.

**Fix:**
```ts
const { data } = await supabase
  .from('patient_records')   // was 'patients'
  .select('created_at')
  .gte('created_at', thirtyDaysAgo)
```

---

### CR-005 — Portal layout performs no section-level authorization; all URLs reachable by any role

**Severity:** Critical
**File:** `app/(portal)/layout.tsx:17-60`
**Issue:** The layout checks authentication and `is_active` status but does not enforce the `ROLE_SECTIONS` access matrix for the current URL. A doctor who knows the URL `/staff`, `/payroll`, or `/analytics` can navigate directly and the layout renders the page without objection. The comment "hide-not-lock" documents this as a deliberate UI choice, but "lock" (server-side enforcement) is required for a system handling PHI and payroll data. Hiding nav links is not access control.

**Fix:** Add a section-key-from-pathname check in the layout, or add a dedicated `requireSection(sectionKey)` helper called at the top of each page RSC. The page RSC approach (per CR-001) is cleaner and avoids layout complexity. At minimum, the Staff, Payroll, Analytics, and Settings pages must each verify the caller's role before rendering or fetching any data.

---

### CR-006 — `updatePatientInlineAction` accepts unsanitized `value` string with no length or format validation

**Severity:** Critical
**File:** `app/(portal)/actions/patients.ts:255-280`
**Issue:** The inline action validates only that `patient_name` and `phone` are non-empty. No maximum-length check, no phone format validation, and no SQL-injection concern (Supabase parameterizes) — but `value` for `patient_name` can be an arbitrary-length string written directly to the DB. A malicious staff member (or session-hijacking scenario) can store multi-megabyte strings in patient name fields. The `receptionistPatientSchema` enforces `min(2)` on name but this action bypasses that schema entirely.

**Fix:**
```ts
const FIELD_VALIDATORS: Record<string, (v: string) => string | null> = {
  patient_name: (v) => v.length > 120 ? 'Name too long' : null,
  phone: (v) => v.length > 20 ? 'Phone too long' : null,
  clinical_notes: (v) => v.length > 5000 ? 'Notes too long' : null,
}

const fieldError = FIELD_VALIDATORS[field]?.(value)
if (fieldError) return { error: fieldError }
```

---

## Warnings

### WR-001 — `InlineEditCell` `onBlur` fires `handleSave` while save is already in flight, causing double-writes

**Severity:** Warning
**File:** `components/portal/InlineEditCell.tsx:85`
**Issue:** When a user presses Enter (which calls `handleSave`) and then the input loses focus (firing `onBlur` → `handleSave` again), two concurrent saves can be dispatched. The first `await onSave(localValue)` has not returned yet when the second call fires. `ringState === 'saving'` blocks the input but `onBlur` is not gated by `ringState`. The result is two concurrent Server Action calls for the same field.

**Fix:**
```ts
onBlur={ringState !== 'saving' ? handleSave : undefined}
```
Or early-return in `handleSave` if already saving:
```ts
async function handleSave() {
  if (ringState === 'saving') return
  // ...
}
```

---

### WR-002 — `ReceptionistSheetForm` `useActionState` bound action does not update when `editingRecord` prop changes

**Severity:** Warning
**File:** `components/portal/PatientClient.tsx:115-119`
**Issue:** `boundAction` is computed from `editingRecord` once at render time, then passed to `useActionState`. If the sheet is re-opened with a different record without unmounting the component, `boundAction` captured in the initial render is stale and the wrong record ID will be sent in the update call. React's `useActionState` does not re-bind when the action reference changes between renders.

This is mitigated somewhat by `key`-ing the form, but no `key` prop is applied to `ReceptionistSheetForm` — it is conditionally rendered but not explicitly re-keyed on `editingRecord?.id`.

**Fix:** Add `key={editingRecord?.id ?? 'new'}` to `<ReceptionistSheetForm>` in the Sheet render section (line ~594).

---

### WR-003 — `AppointmentsPage` swallows all fetch errors and renders an empty board with no role context

**Severity:** Warning
**File:** `app/(portal)/appointments/page.tsx:10-14`
**Issue:** The `catch` block sets `fetchError = true` but the error is never logged server-side. In production, silently discarding the error makes debugging fetch failures impossible — especially relevant because `getAppointmentRequests` throws a constructed error with the Supabase error message that would help diagnose RLS or schema issues.

**Fix:** Add `console.error(e)` in the catch block (or use a structured server logger if one exists).

---

### WR-004 — `updateAppointmentStatusAction` uses `createAdminClient` without re-checking which user is writing

**Severity:** Warning
**File:** `app/(portal)/actions/appointments.ts:42-48`
**Issue:** `requireAppointmentRole()` returns the user-scoped `supabase` client but the actual DB write uses `createAdminClient()`, which bypasses RLS entirely. This is fine when the action ID is server-sourced, but the `id` parameter comes from the client. A valid staff member (receptionist) could supply any appointment ID — including appointments not visible to their branch — and update it. If the intention is that receptionists should only manage their own branch's appointments, the admin client removes that constraint. At minimum, a comment should document why admin client is intentionally used here.

This is not immediately exploitable given the single-hospital setup but is an architectural smell: mixing per-user-client auth checks with admin-client writes creates a pattern that breaks if multi-tenancy is ever added.

---

### WR-005 — `StaffClient` inline name edit calls `updateStaffAction` which may allow role escalation

**Severity:** Warning
**File:** `app/(portal)/staff/StaffClient.tsx:352-356`
**Issue:** The `InlineEditCell` in `StaffRow` calls `updateStaffAction(staff.id, { full_name: v })`. If `updateStaffAction` is implemented permissively (allowing any authenticated admin to update any profile row by ID), and if the action does not whitelist fields, an admin could craft a call that updates more than just `full_name`. This needs to be confirmed by reviewing `updateStaffAction` in `actions/staff.ts` — which is outside the reviewed file set. The risk is flagged here as a cross-module concern.

**Fix:** Verify that `updateStaffAction` uses a field whitelist or separate endpoints for sensitive field updates (role, salary) vs. non-sensitive (full_name, phone).

---

### WR-006 — `DepartmentsClient` featured-order `onBlur` never shows an error to the user

**Severity:** Warning
**File:** `app/(portal)/content/departments/DepartmentsClient.tsx:291-296`
**Issue:** `setFeaturedOrder(...)` is awaited in the `onBlur` handler but its return value is not checked. If the server action returns `{ error: '...' }`, the error is silently swallowed — the UI optimistic state stays at the new value, but the DB was not updated. The user has no feedback that the order was not saved. Same pattern in `DoctorsClient.tsx:339-344`.

**Fix:**
```ts
onBlur={async (e) => {
  if (e.target.value === '') return
  const val = Number(e.target.value)
  if (isNaN(val) || val === (dept.featured_order ?? 0)) return
  const result = await setFeaturedOrder('departments', dept.id, val)
  if (result?.error) toast.error('Could not save order')
}}
```

---

### WR-007 — `PatientClient` passes `currentUserId` prop but immediately prefixes it with `_`; doctor-scoping is never enforced client-side

**Severity:** Warning
**File:** `components/portal/PatientClient.tsx:385`
**Issue:** `currentUserId: _currentUserId` — the prop is accepted and immediately ignored with an underscore prefix. The comment says "own patients only — enforced in Phase 8" but `PatientClient` receives the full `records` array from the RSC with no client-side filter. If the RSC that calls `PatientClient` does not pre-filter by `assigned_doctor_id`, a doctor sees all records — the `_currentUserId` prop being passed but unused suggests the client-side scoping was planned but never completed.

This is a PHI exposure concern: if the RSC passes all patient records (not filtered to the doctor's assigned patients), the doctor sees every patient in the hospital.

**Fix:** Verify the patients RSC filters records by the doctor's `doctor.id` when `role === 'doctor'`. If it does, document why `currentUserId` is passed. If it does not, add the filter in the RSC before passing `records`.

---

## Info

### IN-001 — `KanbanCard` `completed` status uses same red color config as `cancelled`

**Severity:** Info
**File:** `components/portal/KanbanCard.tsx:40`
**Issue:** `STATUS_BADGE_CONFIG.completed` is identical to `cancelled` (red colors, visually indistinguishable). Since `completed` appointments are also bucketed into the "Cancelled" column (see CR-003), a completed appointment looks exactly like a cancelled one. This is a UX defect that could cause staff to re-contact completed patients.

**Fix:** Give `completed` its own distinct color (e.g., `bg-purple-100 text-purple-800`) and separate it into its own column or label.

---

### IN-002 — `dashboard/page.tsx` does not validate that the staff count query uses a role-specific filter

**Severity:** Info
**File:** `app/(portal)/dashboard/page.tsx:40-44`
**Issue:** `staffCount` counts all profiles with `is_active = true` regardless of role. This includes `super_admin` accounts, which are not "staff on duty." The label "Staff On Duty" implies clinical/reception staff but the count includes admin accounts. Minor labeling/data accuracy issue.

---

### IN-003 — `Sidebar.tsx` sign-out button is hidden when sidebar is collapsed; user cannot sign out without expanding

**Severity:** Info
**File:** `components/portal/Sidebar.tsx:82-91`
**Issue:** The sign-out form is wrapped in `{!collapsed && (...)}`, so when the sidebar is collapsed there is no way to sign out without first expanding it. On small screens where the sidebar might default or be toggled to collapsed, this creates a session management friction point.

**Fix:** In collapsed mode, render the sign-out button as an icon-only button (similar to how nav items show tooltips in collapsed state).

---

_Reviewed: 2026-06-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
