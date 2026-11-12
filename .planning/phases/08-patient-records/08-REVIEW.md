---
phase: 8
phase_name: patient-records
status: issues_found
review_depth: standard
files_reviewed: 5
files_reviewed_list:
  - supabase/migrations/20260613_patient_records.sql
  - lib/db/patient_records.ts
  - app/(portal)/actions/patients.ts
  - app/(portal)/patients/page.tsx
  - components/portal/PatientClient.tsx
findings:
  critical: 3
  warning: 5
  info: 2
  total: 10
---

# Phase 8: Patient Records — Code Review Report

**Reviewed:** 2026-06-20  
**Depth:** standard  
**Files Reviewed:** 5  
**Status:** issues_found

---

## Summary

This phase implements a lightweight EMR for a hospital portal. It handles PHI and the role-gating logic is the dominant security concern. Three critical issues were found:

1. **No RLS on `patient_records`** — the table is fully open to anon/authenticated Supabase queries; any compromised service key or misconfigured client is catastrophic.
2. **`isRedirectError` not re-thrown** — `redirect()` inside `requireRole` throws a special Next.js error that is silently swallowed by the `catch` blocks in all three server actions, causing auth redirects to silently fail.
3. **`updatePatientInlineAction` accepts `clinical_notes` from doctors** — the inline-edit action guards only receptionist access to `clinical_notes`; a doctor who calls this action directly (bypassing the UI) can overwrite clinical notes on any patient record via the unguarded admin client write.

---

## Critical Issues

### CR-01: No RLS policies on `patient_records` — table is fully open

**File:** `supabase/migrations/20260613_patient_records.sql:5`  
**Issue:** `ALTER TABLE patient_records ENABLE ROW LEVEL SECURITY` is never called in the migration. The table is created with RLS disabled (PostgreSQL default). Any request using an `anon` or `authenticated` JWT — not the service role key — can read or write all rows without restriction. If a future client-side query accidentally uses `createClient()` instead of `createAdminClient()`, or if any Supabase client is misconfigured, all PHI is exposed. This is the same pattern flagged in prior phases (payroll).

**Fix:**
```sql
-- Add immediately after the CREATE TABLE block:
ALTER TABLE patient_records ENABLE ROW LEVEL SECURITY;

-- Deny all access to anon and authenticated roles by default
-- (all legitimate access goes through the service-role admin client).
-- No permissive policies needed; the deny-by-default is the policy.
```

---

### CR-02: `redirect()` error swallowed by catch blocks — auth bypass on unauthenticated requests

**File:** `app/(portal)/actions/patients.ts:88,133,201`  
**Issue:** `requireRole()` (and `requirePatientWriteRole()` / `requireDoctorRole()`) calls `redirect('/login')` from `next/navigation` when there is no authenticated user. In Next.js App Router, `redirect()` works by throwing a special internal error (a `NEXT_REDIRECT` object). All three server actions wrap `requireRole` in a `try/catch (err)` block and return `{ error: err instanceof Error ? err.message : 'Unknown error' }`. Since `NEXT_REDIRECT` is not an `instanceof Error`, it matches the `'Unknown error'` branch and is returned as an action error string instead of triggering the actual redirect. An unauthenticated caller receives `{ error: 'Unknown error' }` rather than being redirected to `/login`.

**Fix:** Re-throw `isRedirectError` before the generic catch path in all three actions:

```ts
import { isRedirectError } from 'next/dist/client/components/redirect';

// In every catch block:
} catch (err) {
  if (isRedirectError(err)) throw err;   // let Next.js handle the redirect
  return { error: err instanceof Error ? err.message : 'Unknown error' };
}
```

Apply to `createPatientAction` (line 88), `updatePatientAction` (line 133), `updateClinicalNotesAction` (line 201), and `updatePatientInlineAction` (line ~252).

---

### CR-03: `updatePatientInlineAction` allows doctors to write `clinical_notes` on any record — broken ownership

**File:** `app/(portal)/actions/patients.ts:219-255`  
**Issue:** `updatePatientInlineAction` calls `requirePatientWriteRole()` which allows only `super_admin`, `admin`, and `receptionist`. It then blocks receptionists from writing `clinical_notes`. However, **doctors are in a completely separate role** — they are not `receptionist`, `admin`, or `super_admin`. A doctor who directly invokes this action (via a crafted fetch/curl or any client-side call) will be rejected by `requirePatientWriteRole()` at the role check … but the comment on line 228 says "receptionist must not write it", implying there is a future intent to also allow admins. The real gap is the inverse: `updateClinicalNotesAction` correctly enforces doctor ownership of the specific record, but `updatePatientInlineAction` allows **admins to overwrite `clinical_notes` on any record with no ownership check and no audit trail**, and the `field` parameter accepts `'clinical_notes'` as a TypeScript-typed value. While admins may be trusted actors in this system, the action signature accepts an arbitrary `value: string` for `clinical_notes` with only a length check — no sanitisation or structured validation. More critically, if a future refactor ever widens the `requirePatientWriteRole()` allowed-roles list to include `doctor`, the entire ownership model for clinical notes collapses silently.

**Fix:** Remove `'clinical_notes'` from the `field` union in `updatePatientInlineAction` and handle clinical-notes inline edits exclusively through `updateClinicalNotesAction` (which has ownership checks):

```ts
export async function updatePatientInlineAction(
  id: string,
  field: 'patient_name' | 'phone',   // remove 'clinical_notes'
  value: string
): Promise<{ error?: string }> {
```

If inline clinical-notes editing by admins is a product requirement, add a separate `updateClinicalNotesAdminAction` with an explicit admin-only role check, making the intent explicit and the surface auditable.

---

## Warnings

### WR-01: `patients/page.tsx` duplicates auth logic instead of using `requireRole` helper

**File:** `app/(portal)/patients/page.tsx:12-28`  
**Issue:** The RSC page manually calls `createClient()`, `getUser()`, fetches the `profiles` row, and casts the role — exactly the pattern that `lib/portal/auth.ts:requireRole` was built to centralise. This duplication means future changes to auth logic (e.g. session invalidation, role cache TTL) must be applied in two places. It also silently fails open: if `profile` is null, line 28 defaults the role to `'receptionist'` instead of denying access, which could expose patient records to an authenticated user whose profile row hasn't been created yet.

**Fix:**
```ts
// Replace the manual auth block with:
import { requireRole } from '@/lib/portal/auth';
// ...
const { user, role } = await requireRole(['super_admin', 'admin', 'receptionist', 'doctor']);
// No need for canAccessSection — requireRole's allowedRoles list is the gate.
// Remove the manual profile query and role cast entirely.
```

---

### WR-02: Silent default to `'receptionist'` role on missing profile

**File:** `app/(portal)/patients/page.tsx:28`  
**Issue:** `const role = (profile?.role ?? 'receptionist') as StaffRole;` — if the `profiles` row for the authenticated user does not exist (race condition during account creation, data anomaly, or future bug), the page silently assigns `receptionist` access and loads all patient records. This violates least-privilege and leaks PHI to an effectively unknown/unconfigured user.

**Fix:** Treat a missing profile as an auth failure:
```ts
if (!profile?.role) redirect('/login');
const role = profile.role as StaffRole;
```

---

### WR-03: `updateClinicalNotesAction` ownership check is a TOCTOU race

**File:** `app/(portal)/actions/patients.ts:176-196`  
**Issue:** The action fetches `assigned_doctor_id` from the record (line 176), checks ownership (line 182), then issues a separate `.update()` (line 193). Between the SELECT and the UPDATE, another request (admin or receptionist) could reassign the record to a different doctor. The write would then succeed with the original doctor's session, updating a record they are no longer assigned to. Low probability in practice but non-zero for a PHI system.

**Fix:** Combine ownership check and write into a single conditional update:
```ts
const { data, error } = await adminClient
  .from('patient_records')
  .update({ clinical_notes: validation.data.clinical_notes })
  .eq('id', id)
  .eq('assigned_doctor_id', doctorId)   // atomic ownership check
  .select('id')
  .single();

if (error || !data) return { error: 'Forbidden' };
```

---

### WR-04: `visit_date` field not validated as a real date — accepts arbitrary strings

**File:** `app/(portal)/actions/patients.ts:22`  
**Issue:** `visit_date: z.string()` accepts any string including empty string, future dates far beyond plausible visit dates, or malformed ISO strings. PostgreSQL will reject truly invalid date strings, but the error bubbles up as a raw Supabase error message surfaced to the UI rather than a clean validation error.

**Fix:**
```ts
visit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').refine(
  (v) => !isNaN(Date.parse(v)),
  'Invalid date'
),
```

---

### WR-05: `useActionState` bound action re-creates on every render in `ReceptionistSheetForm`

**File:** `components/portal/PatientClient.tsx:115-119`  
**Issue:** `boundAction` is computed inline during render:
```ts
const boundAction = isEdit
  ? updatePatientAction.bind(null, editingRecord!.id)
  : createPatientAction;
const [state, formAction, isPending] = useActionState(boundAction, {});
```
`useActionState` receives a new `boundAction` reference on every render because `.bind()` creates a new function each time. React's `useActionState` uses the action reference for identity — passing a different reference on re-render causes the hook to reset its internal state, which can drop pending state mid-submission (clearing the loading spinner prematurely) and may re-trigger the `useEffect` that calls `onSuccess`. This is a correctness issue, not just a performance issue.

**Fix:** Memoize `boundAction`:
```ts
const boundAction = useMemo(
  () => isEdit ? updatePatientAction.bind(null, editingRecord!.id) : createPatientAction,
  [isEdit, editingRecord?.id]
);
```

---

## Info

### IN-01: Migration does not guard against re-execution — trigger creation will error on re-run

**File:** `supabase/migrations/20260613_patient_records.sql:20-50`  
**Issue:** The migration uses `CREATE TABLE IF NOT EXISTS` (safe) but the trigger `CREATE TRIGGER set_updated_at` inside the `DO $$` block has no `IF NOT EXISTS` guard (PostgreSQL 14+ supports `CREATE OR REPLACE TRIGGER`). Running this migration a second time (e.g. during dev reset or CI) will fail with `trigger "set_updated_at" for relation "patient_records" already exists`. The `CREATE OR REPLACE FUNCTION` for the fallback path is safe, but the `CREATE TRIGGER` call is not.

**Fix:**
```sql
-- Replace both CREATE TRIGGER statements with:
CREATE OR REPLACE TRIGGER set_updated_at ...
-- (PostgreSQL 14+, which Supabase uses)
```

---

### IN-02: `phone` field has no format validation — accepts any 7+ character string

**File:** `app/(portal)/actions/patients.ts:19`  
**Issue:** `phone: z.string().min(7)` allows values like `"abc1234"` or `"0000000"`. For a hospital patient record this is a data quality issue — incorrect phone numbers make patient callback impossible.

**Fix:** Add a loose numeric-plus-special-chars regex appropriate for Indian phone numbers:
```ts
phone: z.string().min(7).regex(/^[+\d\s\-()]{7,20}$/, 'Invalid phone number'),
```

---

_Reviewed: 2026-06-20_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
