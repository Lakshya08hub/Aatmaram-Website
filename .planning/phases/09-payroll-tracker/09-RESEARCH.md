# Phase 9: Payroll Tracker - Research

**Researched:** 2026-06-13
**Domain:** Portal data management — monthly salary payment tracking
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `payroll_payments` table: `id` (UUID PK), `profile_id` (UUID FK → profiles.id), `payment_month` (DATE — first of month), `amount_paid` (NUMERIC(10,2) snapshot), `paid_at` (TIMESTAMPTZ), `paid_by` (UUID FK → profiles.id). UNIQUE on `(profile_id, payment_month)`.
- **D-02:** `payment_month` stored as Postgres `DATE` (first of month). Queries use `DATE_TRUNC('month', ...)` for grouping.
- **D-03:** `amount_paid` is a snapshot of `profiles.salary` at time of marking paid — not a live reference.
- **D-04:** Prev/Next arrow month navigation (`< June 2026 >`). Defaults to current calendar month on load. No jump-to picker in v1.
- **D-05:** No lower bound on navigation — admin can go back to any previous month.
- **D-06:** Active staff only (`is_active = true`). Deactivated staff do not appear.
- **D-07:** Each row: name, role, salary (current), status badge (Paid / Unpaid), "Mark as Paid" button on unpaid rows. One click inserts a `payroll_payments` row. No undo.
- **D-08:** Summary card: sum of `amount_paid` for all paid staff in the selected month (not sum of current salaries).
- **D-09:** Admin and super_admin only. `requireAdminRole()` gates all mutations.

### Claude's Discretion
- Month display format: "June 2026" (full month name + year).
- Staff with `salary = null` appear in the list (salary shown as "—"); can be marked paid with amount 0.

### Deferred Ideas (OUT OF SCOPE)
- PF / ESI / TDS deductions — v2
- Leave deductions / salary cuts for absence — v2
- Payslip PDF generation — v2
- Attendance-linked deductions — v2
- Editing or deleting a payment record once marked paid — v2
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAY-01 | Admin can view all staff with their monthly salary amounts | `getStaffList()` returns active staff with `salary`; filter `is_active = true`; LEFT JOIN payroll_payments for selected month |
| PAY-02 | Admin can mark each staff member as "Paid" for a given calendar month | `markAsPaidAction()` inserts to `payroll_payments` with snapshot amount; UNIQUE constraint prevents duplicates |
| PAY-03 | Payment history per staff member is viewable | Month navigator (prev/next) re-fetches data for the selected month; history is any prior month's data |
| PAY-04 | Monthly payroll total (sum of all salaries) is displayed as a summary card | `SUM(amount_paid)` from `payroll_payments` WHERE `payment_month = selected_month` |
</phase_requirements>

---

## Summary

Phase 9 adds a monthly salary payment tracker to the portal. The data layer is a single new table (`payroll_payments`) with a UNIQUE constraint ensuring one payment record per staff member per calendar month. The UI is a portal page with month navigation, a staff-payment table, and a summary card — all following the established Server Component → Client Component (`*Client.tsx`) pattern.

No new external packages are needed. All UI components (Table, Badge, Button, toast) are already installed. The payroll route (`/payroll`) is already protected in middleware and already permitted for `admin` and `super_admin` in `ROLE_SECTIONS`. The sidebar nav item is already in `ALL_SECTIONS`. This phase is predominantly wiring existing infrastructure into a new route.

**Primary recommendation:** Write the migration, a `lib/db/payroll.ts` query module, a `app/(portal)/actions/payroll.ts` server action, and a `app/(portal)/payroll/` page — following the exact same file structure as Phase 8 (patient records).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Payroll data persistence | Database / Storage | — | `payroll_payments` table; adminClient writes |
| Active staff list for payroll | API / Backend | — | `getStaffList()` in lib/db/staff.ts; Server Component fetch |
| Mark-as-paid mutation | API / Backend | — | Server Action with `requireAdminRole()` guard |
| Month navigation state | Browser / Client | — | `useState` in PayrollClient.tsx; no URL state needed in v1 |
| Summary card calculation | API / Backend | Browser | Computed DB-side via SUM for accuracy; displayed client-side |
| Access control | API / Backend | Frontend Server | `requireAdminRole()` in every action; sidebar hides link for non-admins |

---

## Standard Stack

### Core (all already installed — no new packages)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | existing | Server Components, Server Actions | Project standard |
| Supabase JS | existing | DB queries, auth | Project standard |
| shadcn/ui (Table, Badge, Button) | existing | Portal table UI | All components already installed |
| sonner (toast) | existing | "Marked as Paid" feedback | Already mounted in portal layout |
| lucide-react | existing | ChevronLeft / ChevronRight icons for month nav | Already installed |

### No new packages required
This phase installs zero external packages. All dependencies are satisfied by Phase 6 and Phase 8 implementations.

---

## Package Legitimacy Audit

No packages to audit — this phase installs zero external dependencies.

---

## Architecture Patterns

### System Architecture Diagram

```
Admin browser
     │
     │  GET /payroll?month=2026-06-01  (or useState month)
     ▼
app/(portal)/payroll/page.tsx   [Server Component]
     │
     ├── getActiveStaffWithPaymentStatus(month)   ─────────────┐
     │     lib/db/payroll.ts                                    │
     │     adminClient                                          ▼
     │     profiles (is_active=true) LEFT JOIN payroll_payments  Supabase Postgres
     │     → StaffPayrollRow[]                                  │
     │                                                           │
     └── getMonthlyPayrollTotal(month)                          │
           SUM(amount_paid) WHERE payment_month = month ────────┘
     │
     ▼
PayrollClient.tsx   [Client Component]
     │
     ├── Month Navigator (useState: selectedMonth)
     │     ← ChevronLeft | "June 2026" | ChevronRight →
     │     on change: router.refresh() or re-fetch via Server Action
     │
     ├── Summary Card: "Total Payroll: ₹X,XX,XXX"
     │
     └── Staff Payment Table
           per row: name | role | salary | Paid/Unpaid badge | [Mark as Paid]
                                                                      │
                                                          markAsPaidAction(profileId, month, salarySnapshot)
                                                          app/(portal)/actions/payroll.ts
                                                          requireAdminRole() → adminClient.insert(payroll_payments)
                                                          → toast("Marked as Paid") + router.refresh()
```

### Recommended Project Structure
```
supabase/migrations/
└── 20260613_payroll_payments.sql   # new table + RLS

lib/db/
└── payroll.ts                      # getActiveStaffWithPaymentStatus(), getMonthlyPayrollTotal()

app/(portal)/
├── actions/
│   └── payroll.ts                  # markAsPaidAction()
└── payroll/
    ├── page.tsx                    # Server Component — fetches data, passes to client
    └── PayrollClient.tsx           # Client Component — month nav + table + summary card
```

### Pattern 1: SQL Migration (payroll_payments)
**What:** New table with service-role-only RLS (matches patient_records pattern — no RLS policies = service role access only via adminClient)

```sql
-- Source: [ASSUMED] — consistent with existing migration pattern (20260613_patient_records.sql)
-- Note: patient_records has NO RLS policies defined in its migration.
-- All portal writes use adminClient (service role key) which bypasses RLS entirely.
-- This pattern is established: add RLS enable, no policies needed for service-role-only access.

CREATE TABLE IF NOT EXISTS payroll_payments (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payment_month   date          NOT NULL,
  amount_paid     numeric(10,2) NOT NULL DEFAULT 0,
  paid_at         timestamptz   NOT NULL DEFAULT now(),
  paid_by         uuid          REFERENCES profiles(id) ON DELETE SET NULL,

  CONSTRAINT payroll_payments_unique_month UNIQUE (profile_id, payment_month)
);

-- Enable RLS (blocks direct client access; adminClient/service role bypasses)
ALTER TABLE payroll_payments ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE policies needed — all access is via adminClient (service role).
-- If a session-client read policy is needed later (e.g. staff sees own payslip), add in v2.
```

**Note on RLS pattern:** Looking at `20260612_cms_tables.sql`, public-read tables (departments, doctors, etc.) have `SELECT` policies for anon/authenticated. The `20260613_patient_records.sql` migration has NO RLS policies — consistent with admin-only write/read via service role. `payroll_payments` follows the patient_records pattern: RLS enabled, no policies, adminClient only.

### Pattern 2: DB Query Module (lib/db/payroll.ts)
**What:** Two query functions the Server Component calls for the payroll page

```typescript
// Source: [ASSUMED] — modelled on lib/db/staff.ts pattern
import { createAdminClient } from '@/lib/supabase/admin';
import { StaffMember } from '@/lib/db/staff';

export interface StaffPayrollRow extends Pick<StaffMember, 'id' | 'full_name' | 'role' | 'salary'> {
  isPaid: boolean;
  paidAt: string | null;
  amountPaid: number | null;
}

/**
 * Returns all active staff with their payment status for a given month.
 * month: ISO date string for the first of the month, e.g. "2026-06-01"
 */
export async function getActiveStaffWithPaymentStatus(month: string): Promise<StaffPayrollRow[]> {
  const adminClient = createAdminClient();

  // Fetch active profiles
  const { data: profiles, error } = await adminClient
    .from('profiles')
    .select('id, full_name, role, salary')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  // Fetch payments for the selected month
  const { data: payments, error: payError } = await adminClient
    .from('payroll_payments')
    .select('profile_id, amount_paid, paid_at')
    .eq('payment_month', month);

  if (payError) throw new Error(payError.message);

  const paymentMap = new Map(payments?.map((p) => [p.profile_id, p]) ?? []);

  return (profiles ?? []).map((p) => {
    const payment = paymentMap.get(p.id);
    return {
      id: p.id,
      full_name: p.full_name,
      role: p.role,
      salary: p.salary,
      isPaid: !!payment,
      paidAt: payment?.paid_at ?? null,
      amountPaid: payment?.amount_paid ?? null,
    };
  });
}

/**
 * Returns the total amount paid for a given month (sum of amount_paid for all paid records).
 * Returns 0 if no payments exist for the month.
 */
export async function getMonthlyPayrollTotal(month: string): Promise<number> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('payroll_payments')
    .select('amount_paid')
    .eq('payment_month', month);

  if (error) throw new Error(error.message);

  return (data ?? []).reduce((sum, row) => sum + (row.amount_paid ?? 0), 0);
}
```

**Why two separate queries instead of a JOIN:** Supabase JS client joins via `select('*, payroll_payments(*)')` on FK relationships, but the `profiles` → `payroll_payments` direction is one-to-many. A two-query + merge approach (same as `getStaffList()` merging Auth users with profiles) avoids Supabase FK relationship configuration and is consistent with the established pattern.

### Pattern 3: Server Action (markAsPaidAction)
**What:** Inserts a `payroll_payments` row with salary snapshot; enforces admin role

```typescript
// Source: [ASSUMED] — modelled exactly on app/(portal)/actions/staff.ts pattern
'use server';

import { requireAdminRole } from '@/app/(portal)/actions/staff'; // re-export or duplicate
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function markAsPaidAction(input: {
  profileId: string;
  paymentMonth: string;   // "2026-06-01"
  amountPaid: number;     // snapshot of profiles.salary at call time
}): Promise<{ error?: string }> {
  try {
    // Auth gate — throws 'Forbidden' if not admin/super_admin
    const supabase = await requireAdminRole();

    // Get the caller's profile.id (for paid_by FK)
    const { data: { user } } = await supabase.auth.getUser();
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user!.id)
      .single();

    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('payroll_payments')
      .insert({
        profile_id: input.profileId,
        payment_month: input.paymentMonth,
        amount_paid: input.amountPaid,
        paid_by: callerProfile?.id ?? null,
      });

    // UNIQUE constraint violation = already paid for this month
    if (error?.code === '23505') {
      return { error: 'Already marked as paid for this month' };
    }

    if (error) throw new Error(error.message);

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
```

**Note on requireAdminRole:** `requireAdminRole` is not exported from `actions/staff.ts` (it is an unexported `async function`). The payroll action file must either duplicate the pattern inline or the staff actions file must be updated to export it. Recommend duplicating inline to avoid cross-action coupling — it is only 15 lines.

### Pattern 4: Month Navigation (client-side state)
**What:** useState manages selected month; page re-fetches on change via router.refresh()

```typescript
// Month state as ISO date string (first of month)
const [selectedMonth, setSelectedMonth] = useState<string>(() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
});

// Navigate forward/backward
function navigateMonth(direction: 'prev' | 'next') {
  const [year, month] = selectedMonth.split('-').map(Number);
  const d = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
  setSelectedMonth(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  );
}

// Display: "June 2026"
function formatMonthDisplay(isoDate: string): string {
  const [year, month] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric',
  });
}
```

**Month navigation architecture decision:** Since month is client-side state, the PayrollClient cannot call Server Component data fetchers directly on navigation. Two valid approaches:

| Approach | Mechanism | Trade-off |
|----------|-----------|-----------|
| **A (recommended):** Pass fetch functions as Server Actions | PayrollClient calls a `fetchPayrollData(month)` Server Action on month change, updates local state | Clean, no URL change, consistent with "actions for mutations" pattern |
| **B:** URL search param | `?month=2026-06-01` in URL, page.tsx reads `searchParams`, router.push on navigation | URL is shareable/bookmarkable but adds URL complexity |

Given D-04 says "no jump-to picker in v1" and the app has no existing searchParams usage in portal pages, **Approach A** (Server Action for data fetch) is recommended. Alternatively, the page can be a pure Server Component that re-renders on `router.refresh()` after the action, keeping month in URL state — simpler but less smooth UX.

**Simplest correct approach:** Store `selectedMonth` in `useState` in PayrollClient. On navigation, call a `getPayrollDataAction(month)` Server Action (read-only, returns `StaffPayrollRow[]` and total). Update local state. No router.refresh() needed. This is the lowest-complexity implementation.

### Anti-Patterns to Avoid
- **Calculating total from current salaries:** The summary card (D-08) must sum `amount_paid` from `payroll_payments`, not `profiles.salary`. Not all staff may be marked paid yet; using salary would over-report.
- **Allowing future month payments:** D-05 says no lower bound but does not explicitly allow future months. Recommend blocking "Mark as Paid" for months after the current calendar month — a payment in July 2026 on June 13 would be a data entry error. Add a guard in the action: `if (paymentMonth > currentMonth) return { error: 'Cannot mark future months as paid' }`.
- **Querying profiles with session client:** `profiles` has RLS "own read" — session client can only read its own row. Use `adminClient` for the staff list query (as in `getStaffList()`).
- **Using `getSession()` in Server Actions:** Existing pattern uses `getUser()` — never `getSession()`. Portal layout comment explicitly notes this (T-04-08).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Duplicate payment prevention | Manual check-before-insert | UNIQUE constraint on `(profile_id, payment_month)` | DB-level atomicity; race-condition safe |
| Indian currency formatting | Custom formatter | `toLocaleString('en-IN', { style: 'currency', currency: 'INR' })` | Built into JS Intl |
| Role access check | Custom role lookup in every action | `requireAdminRole()` pattern (copy from staff.ts) | Established, tested pattern |
| Table UI | Custom HTML table | shadcn/ui `Table` components | Already installed, matches portal style |

---

## Common Pitfalls

### Pitfall 1: payment_month DATE format mismatch
**What goes wrong:** Postgres DATE comparison fails if month is passed as "2026-6-1" instead of "2026-06-01".
**Why it happens:** JS `Date.getMonth()` returns 0-indexed; `getDate()` returns unpadded.
**How to avoid:** Always construct with `String(month).padStart(2, '0')` and `String(day).padStart(2, '0')`. Use a single `toPaymentMonth(date: Date): string` utility function.
**Warning signs:** Query returns empty results for months that should have data.

### Pitfall 2: requireAdminRole is not exported
**What goes wrong:** `import { requireAdminRole } from '@/app/(portal)/actions/staff'` fails at build time — the function is declared but not exported.
**Why it happens:** It was written as an unexported helper in staff.ts.
**How to avoid:** Duplicate the ~15-line function in `actions/payroll.ts` rather than creating a cross-module dependency on a private function. If future phases need it repeatedly, extract to `lib/portal/auth-guards.ts`.
**Warning signs:** TypeScript error "Module has no exported member 'requireAdminRole'".

### Pitfall 3: Summary card double-counting unpaid staff
**What goes wrong:** Summary shows ₹0 for unpaid rows if code accidentally sums `salary` from profiles instead of `amount_paid` from payroll_payments.
**Why it happens:** Confusion between "what we owe" (sum of current salaries) vs "what we paid" (sum of paid records for the month).
**How to avoid:** `getMonthlyPayrollTotal()` queries only `payroll_payments` table. The summary card label should read "Total Paid This Month" to be unambiguous.
**Warning signs:** Summary card shows a non-zero amount even when no one has been marked paid.

### Pitfall 4: Month navigation allowing future months
**What goes wrong:** Admin accidentally marks July salary as paid in June, creating a phantom record.
**Why it happens:** "No lower bound" (D-05) was specified but future months were not explicitly addressed.
**How to avoid:** In `markAsPaidAction`, compare `paymentMonth` against `new Date()` first-of-month. Return `{ error: 'Cannot mark future months as paid' }` if `paymentMonth > currentMonth`.
**How to handle in UI:** Optionally disable the `>` (next) button when selected month equals current month.

### Pitfall 5: Staff with salary = null marked paid with amount 0
**What goes wrong:** Admin marks a staff member with null salary as paid — `amount_paid = 0` is stored. This is valid per D-09 (Claude's discretion) but may be confusing.
**How to avoid:** Show a warning toast: "Salary not set for [name] — marking as ₹0. Update salary on the Staff page." This is UX guidance, not a blocker.

---

## Code Examples

### Indian currency format
```typescript
// Source: [ASSUMED] — standard JS Intl API
function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
// Output: ₹1,25,000
```

### First-of-month ISO string
```typescript
// Source: [ASSUMED] — standard JS Date manipulation
function toFirstOfMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}
```

### Current month as ISO string (for default)
```typescript
const currentMonth = toFirstOfMonth(new Date()); // e.g. "2026-06-01"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Portal page = one file | Server Component page.tsx + Client `*Client.tsx` | Phase 6+ | Hydration boundary is explicit; data fetching is server-side |
| Direct Supabase client for admin ops | `createAdminClient()` (service role) | Phase 4 | Bypasses RLS; required for cross-user data access |

---

## Infrastructure Already in Place

**No new setup needed for:**
- `/payroll` middleware protection — already in `PORTAL_PATHS` array in `middleware.ts`
- Sidebar nav item "Payroll" → `/payroll` — already in `ALL_SECTIONS` in `lib/portal/roles.ts`
- Role access (`admin`, `super_admin`) — already in `ROLE_SECTIONS` map
- `<Toaster />` — already mounted in `app/(portal)/layout.tsx`
- shadcn/ui Table, Badge, Button, Loader2 — all installed

**Only new files needed:**
1. `supabase/migrations/20260613_payroll_payments.sql`
2. `lib/db/payroll.ts`
3. `app/(portal)/actions/payroll.ts`
4. `app/(portal)/payroll/page.tsx`
5. `app/(portal)/payroll/PayrollClient.tsx`

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `patient_records` migration has no RLS policies (service role access only) — `payroll_payments` should follow the same pattern | Architecture Patterns / Migration | If patient_records does have RLS policies not visible in the truncated read, the payroll migration should add equivalent policies. Low risk — adminClient bypasses RLS regardless. |
| A2 | Two-query + merge pattern is preferable to Supabase FK join for profiles→payroll_payments | Architecture Patterns / DB Query | If Supabase FK relationship is configured, a single `.select('*, payroll_payments(*)')` call is valid but requires FK introspection setup. Two-query approach always works. |
| A3 | Month state managed client-side via useState + Server Action re-fetch (not URL searchParams) | Architecture Patterns / Month Nav | If URL bookmarking of month is desired in future, switch to searchParams. No functional difference for v1. |
| A4 | `requireAdminRole` should be duplicated in payroll.ts (not re-exported from staff.ts) | Pitfalls | If the codebase later centralizes auth guards, a light refactor moves it. No correctness risk. |

**No assumed package names** — zero new packages installed in this phase.

---

## Open Questions

1. **Future month guard in UI**
   - What we know: D-05 says no lower bound on navigation. Future months not mentioned.
   - What's unclear: Should the "next" button be disabled when the selected month = current month?
   - Recommendation: Disable `>` button when `selectedMonth >= currentMonth` to prevent accidentally navigating to future months. Also add server-side guard in action.

2. **Staff with null salary UX**
   - What we know: Claude's discretion says they appear and can be marked paid at ₹0.
   - What's unclear: Should the "Mark as Paid" button show a confirmation dialog for ₹0 payments?
   - Recommendation: Show a warning toast after marking (not a blocking dialog) — keeps UX fast.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code/config changes with no new external dependencies. All runtime dependencies (Supabase, Next.js, shadcn/ui) confirmed operational in prior phases.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Not detected (no jest.config.*, vitest.config.*, pytest.ini found) |
| Config file | None — no automated test infrastructure in this project |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAY-01 | Active staff list with salary appears on payroll page | manual-only | — | N/A |
| PAY-02 | "Mark as Paid" inserts payroll_payments row; UNIQUE prevents duplicates | manual-only | — | N/A |
| PAY-03 | Month navigation shows historical payment data | manual-only | — | N/A |
| PAY-04 | Summary card shows correct sum of amount_paid | manual-only | — | N/A |

### Wave 0 Gaps
None — no test infrastructure exists in this project; manual UAT is the established validation method (see existing `*-UAT.md` files in prior phases).

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `requireAdminRole()` — `getUser()` re-validates with Auth server |
| V3 Session Management | yes | `updateSession()` in middleware on every portal request |
| V4 Access Control | yes | `requireAdminRole()` in every Server Action; ROLE_SECTIONS hides nav for non-admins |
| V5 Input Validation | yes | Validate `paymentMonth` format and `amountPaid >= 0` in action |
| V6 Cryptography | no | No crypto operations in this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Receptionist/doctor marking staff as paid | Elevation of privilege | `requireAdminRole()` throws 'Forbidden' for non-admin roles |
| Double-payment via rapid clicks | Tampering | UNIQUE constraint on `(profile_id, payment_month)` + `error.code === '23505'` guard |
| Marking future-month payments | Tampering | Server-side date guard: `paymentMonth > currentMonth → error` |
| Salary data exposure via direct DB query | Information disclosure | RLS enabled on `payroll_payments`; no session-client SELECT policy; adminClient only |

---

## Sources

### Primary (HIGH confidence)
- Codebase: `lib/db/staff.ts` — two-query + merge pattern for staff data
- Codebase: `app/(portal)/actions/staff.ts` — `requireAdminRole()` pattern, adminClient usage
- Codebase: `lib/portal/roles.ts` — confirmed `/payroll` already in ALL_SECTIONS and ROLE_SECTIONS for admin/super_admin
- Codebase: `middleware.ts` — confirmed `/payroll` already in PORTAL_PATHS
- Codebase: `supabase/migrations/20260613_patient_records.sql` — migration pattern (no RLS policies; adminClient-only access)
- Codebase: `app/(portal)/layout.tsx` — Toaster already mounted; PortalSidebar reads role from DB

### Secondary (MEDIUM confidence)
- `09-CONTEXT.md` — all locked decisions (D-01 through D-09) directly sourced from user

### Tertiary (LOW confidence — ASSUMED)
- Month navigation via useState + Server Action re-fetch (A3) — standard React pattern, not verified against a specific docs source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new packages; all dependencies verified in codebase
- Architecture: HIGH — direct read of existing patterns from codebase; exact replication
- DB migration: HIGH — schema specified verbatim in D-01/D-02/D-03; RLS pattern read from existing migrations
- Pitfalls: MEDIUM — edge cases (null salary, future months) derived from D-05/D-09 and standard DB behavior

**Research date:** 2026-06-13
**Valid until:** 2026-07-13 (stable — no fast-moving dependencies)
