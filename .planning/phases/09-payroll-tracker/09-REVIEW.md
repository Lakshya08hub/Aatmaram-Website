---
phase: 9
phase_name: payroll-tracker
status: issues_found
review_depth: standard
files_reviewed: 5
files_reviewed_list:
  - supabase/migrations/20260613_payroll_payments.sql
  - lib/db/payroll.ts
  - app/(portal)/actions/payroll.ts
  - app/(portal)/payroll/page.tsx
  - app/(portal)/payroll/PayrollClient.tsx
findings:
  critical: 4
  warning: 4
  info: 3
  total: 11
---

# Phase 9: Payroll Tracker — Code Review Report

**Reviewed:** 2026-06-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Five new files implement a payroll tracker for the hospital portal. The core logic is sound and
the double-submit guard (`pendingIds` Set) works correctly. However there are four critical issues:
RLS is enabled on `payroll_payments` with zero policies (table is effectively inaccessible to
the Supabase JS client entirely, including the service-role admin path which bypasses RLS but
the bug surfaces for any direct client access); the RSC page fetches sensitive payroll data
with no auth/role gate whatsoever; `redirect()` in Next.js throws a special internal error
that must be re-thrown from catch blocks or it is silently swallowed; and the `month` string
passed to DB functions is never validated, allowing arbitrary SQL filter injection via `.or()`
and `.eq()` calls.

---

## Structural Findings (fallow)

No structural pre-pass was provided for this phase.

---

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: `payroll_payments` has RLS enabled but zero policies — table is locked out

**File:** `supabase/migrations/20260613_payroll_payments.sql:14`

**Issue:** `ALTER TABLE payroll_payments ENABLE ROW LEVEL SECURITY;` is executed with no
`CREATE POLICY` statements. With RLS on and no policies, PostgreSQL's default-deny applies:
every query through the anon or authenticated role returns zero rows (for SELECT) or is
silently blocked (for INSERT/UPDATE/DELETE). The `createAdminClient` in `lib/db/payroll.ts`
uses the service role key which bypasses RLS, so read/write in `lib/db/payroll.ts` works
today — but any future direct-client access or Supabase Studio inspection will silently return
nothing. More importantly, there are no policies to fall back on if the admin client is ever
swapped out. The migration is incomplete and should define explicit policies.

**Fix:**
```sql
-- Add after ENABLE ROW LEVEL SECURITY

-- Service-role (admin client) bypasses RLS, so these policies cover direct-client access
-- and provide an explicit security contract.

-- Only super_admin / admin may read payroll records
CREATE POLICY "admin_select_payroll"
  ON payroll_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin')
        AND profiles.is_active = TRUE
    )
  );

-- Only super_admin / admin may insert
CREATE POLICY "admin_insert_payroll"
  ON payroll_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role IN ('super_admin', 'admin')
        AND profiles.is_active = TRUE
    )
  );
```

---

### CR-02: RSC page fetches payroll data with no authentication or role check

**File:** `app/(portal)/payroll/page.tsx:10-16`

**Issue:** `PayrollPage` calls `getActiveStaffWithPaymentStatus` and `getMonthlyPayrollTotal`
directly from `lib/db/payroll.ts` (which uses the service-role admin client) without any
call to `requireRole()` or any session check. An unauthenticated user who navigates directly
to `/payroll` will receive the full payroll page with all staff salaries rendered in HTML.
Middleware or layout guards may provide a partial safety net, but the data is fetched before
any gate fires within this component.

**Fix:**
```typescript
import { requireRole } from '@/lib/portal/auth';
import { getActiveStaffWithPaymentStatus, getMonthlyPayrollTotal } from '@/lib/db/payroll';
import PayrollClient from './PayrollClient';

function toFirstOfMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

export default async function PayrollPage() {
  // Gate first — throws Forbidden or redirects to /login before any data fetch
  await requireRole(['super_admin', 'admin']);

  const currentMonth = toFirstOfMonth(new Date());
  const [staff, total] = await Promise.all([
    getActiveStaffWithPaymentStatus(currentMonth),
    getMonthlyPayrollTotal(currentMonth),
  ]);

  return <PayrollClient initialStaff={staff} initialTotal={total} initialMonth={currentMonth} />;
}
```

---

### CR-03: `redirect()` internal error swallowed in both server actions

**File:** `app/(portal)/actions/payroll.ts:84-89` and `app/(portal)/actions/payroll.ts:104-113`

**Issue:** Next.js `redirect()` (used inside `requireAdminRole()` → `redirect('/login')`)
works by throwing a special `NEXT_REDIRECT` error. Both `markAsPaidAction` and
`getPayrollDataAction` wrap `requireAdminRole()` in a `try/catch`. The catch block only
re-throws when `err.message === 'Forbidden'`; it does NOT re-throw redirect errors. The
`NEXT_REDIRECT` exception is caught, checked, fails the `'Forbidden'` test, and falls through
to return `{ error: 'Something went wrong.' }` — the redirect never fires. An unauthenticated
caller receives an error string instead of being sent to `/login`.

**Fix:**
```typescript
import { isRedirectError } from 'next/dist/client/components/redirect';

// In both catch blocks:
} catch (err) {
  if (isRedirectError(err)) throw err;          // must re-throw redirect
  if (err instanceof Error && err.message === 'Forbidden') throw err;
  return { error: err instanceof Error ? err.message : 'Something went wrong. Please try again.' };
}
```

---

### CR-04: `month` parameter is never validated — arbitrary string injected into DB queries

**File:** `lib/db/payroll.ts:32` and `lib/db/payroll.ts:42`

**Issue:** The `month` string parameter travels from client-side state in `PayrollClient`
(navigateMonth → getPayrollDataAction → getActiveStaffWithPaymentStatus) to:
1. A `.or(`join_date.is.null,join_date.lte.${lastDayStr}`)` PostgREST filter (line 32)
2. A `.eq('payment_month', month)` filter (line 42)

`lastDayStr` is derived from splitting `month` on `-`. If an attacker (or bug) supplies a
string like `"2026-06-01); DROP TABLE payroll_payments;--"`, the `split('-').map(Number)`
produces `NaN` values, and `new Date(NaN, NaN, 0)` returns an Invalid Date whose
`getFullYear()` / `getMonth()` / `getDate()` calls produce `"NaN-NaN-NaN"`, which is
injected into the `.or()` PostgREST string. PostgREST treats this as a filter value, not
executable SQL, so classic SQL injection is not the risk — but the query will silently return
wrong or empty results. The `getPayrollDataAction` server action also accepts `month` as a raw
string with no validation before forwarding it. The action is protected by auth but the
surface should be hardened.

**Fix:** Add a Zod schema guard at the server action boundary:
```typescript
import { z } from 'zod';

const monthSchema = z.string().regex(/^\d{4}-\d{2}-01$/, 'Invalid month format');

export async function getPayrollDataAction(month: string) {
  const parsed = monthSchema.safeParse(month);
  if (!parsed.success) return { staff: [], total: 0, error: 'Invalid month.' };
  // ... rest of action uses parsed.data
}

export async function markAsPaidAction(input: { profileId: string; paymentMonth: string; amountPaid: number }) {
  const schema = z.object({
    profileId: z.string().uuid(),
    paymentMonth: z.string().regex(/^\d{4}-\d{2}-01$/),
    amountPaid: z.number().finite().min(0),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid input.' };
  // ... rest uses parsed.data
}
```

---

## Warnings

### WR-01: `requireAdminRole()` duplicated inline instead of using shared `requireRole()` helper

**File:** `app/(portal)/actions/payroll.ts:21-43`

**Issue:** A 22-line `requireAdminRole()` function is defined locally. The shared
`lib/portal/auth.ts` `requireRole()` helper exists for exactly this purpose and is used by
other action files. The local copy lacks the `authError` logging present in the shared version
and diverges over time. It also returns `supabase` (used to re-fetch `user` twice in
`markAsPaidAction`), but the shared helper returns `{ user, role, supabase }` which makes
the second `getUser()` call at line 59 unnecessary.

**Fix:** Replace local implementation:
```typescript
import { requireRole } from '@/lib/portal/auth';

// In markAsPaidAction:
const { user, supabase } = await requireRole(['super_admin', 'admin']);
// user is already available — remove the second supabase.auth.getUser() call at line 59
```

---

### WR-02: `markAsPaidAction` calls `supabase.auth.getUser()` a second time unnecessarily

**File:** `app/(portal)/actions/payroll.ts:58-60`

**Issue:** After `requireAdminRole()` already authenticated the user, `markAsPaidAction`
calls `supabase.auth.getUser()` again (line 59) to obtain the `user.id` for the `paid_by`
lookup. This is a double network call. If the shared `requireRole()` helper is adopted (WR-01),
`user` is returned directly, eliminating this.

**Fix:** Return `user` from `requireAdminRole()` (or switch to shared helper) and use it
directly. As a stopgap if the local helper is kept:
```typescript
// requireAdminRole returns supabase; extend to also return user:
async function requireAdminRole() {
  // ...existing logic...
  return { supabase, user };   // add user to return value
}
```

---

### WR-03: `loadMonthData` result silently ignored on navigation — stale data shown on failure

**File:** `app/(portal)/payroll/PayrollClient.tsx:58-68`

**Issue:** `navigateMonth` (line 70) calls `loadMonthData(next)` without `await` — it is
a fire-and-forget call. `setIsNavigating(true)` is correctly set before the call, but if
`loadMonthData` fails (e.g. network error), `setIsNavigating(false)` still runs (it is
inside `loadMonthData`), navigation buttons re-enable, and the displayed month label flips
to the new month while the table still shows the previous month's data. There is a
`toast.error` for the case where `result.error` is set, but if the action throws (rather
than returning an error), the promise rejection is unhandled and `isNavigating` may remain
`true` forever.

**Fix:**
```typescript
async function navigateMonth(dir: 'prev' | 'next') {
  const [y, m] = selectedMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + (dir === 'next' ? 1 : -1), 1);
  const next = toFirstOfMonth(d);
  setSelectedMonth(next);
  try {
    await loadMonthData(next);
  } catch {
    // revert month label if data load fails
    setSelectedMonth(selectedMonth);
    toast.error('Failed to load payroll data.');
    setIsNavigating(false);
  }
}
```

---

### WR-04: No optimistic UI revert after `markAsPaidAction` failure

**File:** `app/(portal)/payroll/PayrollClient.tsx:78-101`

**Issue:** `handleMarkAsPaid` does not optimistically update the `staff` state before the
server action resolves. On failure, it calls `toast.error` and returns. On success, it calls
`loadMonthData(selectedMonth)` which fetches the whole page of data again — adding a
visible loading flash (skeletons) on every single "Mark as Paid" click. A better UX would
update the row locally on success and only refetch on error. More critically, if
`markAsPaidAction` throws (not just returns `{ error }`), the `pendingIds` cleanup at lines
86-90 never runs because the `setPendingIds` removal is placed after `await markAsPaidAction`
but before the throw — however since `markAsPaidAction` is not wrapped in try/catch here,
an unexpected throw will leave `pendingIds` with a stale entry, permanently disabling the
"Mark as Paid" button for that row.

**Fix:**
```typescript
async function handleMarkAsPaid(row: StaffPayrollRow) {
  setPendingIds((prev) => new Set(prev).add(row.id));
  try {
    const amountPaid = row.salary ?? 0;
    const result = await markAsPaidAction({ profileId: row.id, paymentMonth: selectedMonth, amountPaid });
    if (result.error) {
      toast.error(result.error);
    } else {
      // optimistic local update — avoids refetch skeleton flash
      setStaff((prev) =>
        prev.map((s) =>
          s.id === row.id ? { ...s, isPaid: true, amountPaid, paidAt: new Date().toISOString() } : s
        )
      );
      setTotal((prev) => prev + amountPaid);
      toast.success(row.salary === null ? 'Marked as ₹0. Update salary on the Staff page first.' : `Marked as paid — ${formatINR(amountPaid)}`);
    }
  } finally {
    setPendingIds((prev) => { const s = new Set(prev); s.delete(row.id); return s; });
  }
}
```

---

## Info

### IN-01: `toFirstOfMonth` duplicated across three files

**File:** `app/(portal)/actions/payroll.ts:15`, `app/(portal)/payroll/page.tsx:4`, `app/(portal)/payroll/PayrollClient.tsx:29`

**Issue:** The same 5-line `toFirstOfMonth` utility is copy-pasted into all three files. Extract to `lib/utils/date.ts` or `lib/portal/payroll-utils.ts`.

**Fix:** Create `lib/utils/date.ts` exporting `toFirstOfMonth` and import it in all three locations.

---

### IN-02: `createAdminClient` called inside every invocation of both DB functions — should be created once

**File:** `lib/db/payroll.ts:21` and `lib/db/payroll.ts:75`

**Issue:** `createAdminClient()` is called on every request. Depending on whether the admin
client factory is singleton-memoized, this may create a new client object per call. This is
a code-quality concern, not a correctness bug. Document intent or memoize at module level.

**Fix:** If `createAdminClient` is not already memoized, consider:
```typescript
// module-level singleton (safe — service role, no per-request context needed)
const adminClient = createAdminClient();
```

---

### IN-03: Empty `<TableHead>` for the action column lacks `aria-label`

**File:** `app/(portal)/payroll/PayrollClient.tsx:155`

**Issue:** `<TableHead></TableHead>` (the action column header) renders an empty `<th>`.
Screen readers announce this as an empty column header. Add a visually-hidden label.

**Fix:**
```tsx
<TableHead>
  <span className="sr-only">Actions</span>
</TableHead>
```

---

_Reviewed: 2026-06-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
