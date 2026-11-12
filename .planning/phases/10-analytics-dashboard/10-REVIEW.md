---
phase: 10
phase_name: analytics-dashboard
status: issues_found
review_depth: standard
files_reviewed: 3
files_reviewed_list:
  - app/[locale]/layout.tsx
  - lib/db/analytics.ts
  - app/(portal)/analytics/page.tsx
findings:
  critical: 3
  warning: 4
  info: 2
  total: 9
---

# Phase 10: Code Review Report

**Reviewed:** 2026-06-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Three files were reviewed: the public locale layout (GA4 instrumentation), the analytics DB layer, and the portal analytics RSC page. The DB layer has a correctness bug that silently undercounts appointment stats. The page duplicates auth guard logic rather than using the shared helper. GA4 setup introduces an XSS-class vulnerability via `dangerouslySetInnerHTML` with a runtime env var. Several data-accuracy and security issues require fixes before this ships.

---

## Critical Issues

### CR-01: XSS via unsanitised env var interpolated into dangerouslySetInnerHTML

**File:** `app/[locale]/layout.tsx:37-45`

**Issue:** `process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID` is interpolated directly into a raw HTML string passed to `dangerouslySetInnerHTML`. At build time this value comes from the developer's environment, but Next.js embeds `NEXT_PUBLIC_*` variables as literal string substitutions. If this value is ever misconfigured, injected via CI secret misconfiguration, or the pattern is copy-pasted to a context where the value comes from a database/user input, arbitrary JavaScript executes in every visitor's browser. Beyond the injection risk, this pattern also breaks any `script-src` CSP nonce policy because the inline script has no nonce attribute.

**Fix:** Use the `gtag` Script approach that avoids inline HTML entirely, or at minimum validate/encode the measurement ID:

```tsx
// Option A — move init logic into a dedicated client component
// that receives the ID as a typed prop and calls gtag() directly
// (no dangerouslySetInnerHTML needed).

// Option B — guard the raw interpolation with a strict format check:
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '';
// Validate format: GA4 IDs are always "G-XXXXXXXXXX"
if (!/^G-[A-Z0-9]+$/.test(GA_ID)) {
  throw new Error('Invalid GA4 measurement ID format');
}
// Then it is safe to interpolate — the regex forbids script-injection payloads.
```

---

### CR-02: Appointment byStatus counts are all-time totals, not "this month" — label is misleading and data is wrong

**File:** `lib/db/analytics.ts:36,51-64`

**Issue:** The Supabase query on line 36 fetches **all** rows from `appointment_requests` with no date filter. The `thisWeek` and `thisMonth` counters are filtered in application code correctly, but `byStatus` (line 51-64) accumulates counts across **every appointment ever created**, not just the current month. The analytics page then labels these as `(this month)` (page.tsx line 120), which is factually wrong — it displays the all-time count for each status under a "this month" label. For a hospital with months of history, this misleads staff into thinking every appointment is still in the current month.

**Fix:** Add a date filter to the query so only this-month rows are fetched, or compute `byStatus` conditionally:

```ts
// Option A — filter at the DB level (preferred, reduces data transfer):
const { data, error } = await adminClient
  .from('appointment_requests')
  .select('created_at, status, preferred_doctor')
  .gte('created_at', startOfMonth.toISOString());

// Option B — filter byStatus accumulation in the loop:
if (createdAt >= startOfMonth && createdAt <= now) {
  byStatus[status] = (byStatus[status] ?? 0) + 1;
}
```

Option A is strongly preferred because it also fixes the unbounded query (CR-03).

---

### CR-03: Unbounded query fetches entire appointments table — correctness and scalability hazard

**File:** `lib/db/analytics.ts:33-36`

**Issue:** `getAppointmentStats` issues `SELECT created_at, status, preferred_doctor FROM appointment_requests` with no `LIMIT` or date filter. For a busy hospital after 1-2 years of operation, this can return tens of thousands of rows on every analytics page load. Supabase's default max row count is 1000; when that limit is hit, the query silently truncates results, making `thisWeek`, `thisMonth`, and `byStatus` all return incorrect (under-counted) values with no error surfaced to the caller. This is a silent data-correctness bug, not merely a performance issue.

**Fix:** Apply the same `startOfMonth` filter used in `getPatientVolumeStats`, which already does this correctly on line 85:

```ts
const { data, error } = await adminClient
  .from('appointment_requests')
  .select('created_at, status, preferred_doctor')
  .gte('created_at', startOfMonth.toISOString());
```

If all-time `byDoctor` totals are intentionally desired, add a separate query with an explicit `.limit()` and surface a "showing top N" caveat in the UI.

---

## Warnings

### WR-01: requireAdminRole() duplicated inline instead of using shared lib/portal/auth.ts helper

**File:** `app/(portal)/analytics/page.tsx:9,17-37`

**Issue:** A local `requireAdminRole()` function is defined at lines 17-37, duplicating auth-guard logic that the known-prior-phase `lib/portal/auth.ts` helper provides. The local copy also defines its own `ADMIN_ROLES` constant (line 9). This creates two maintenance hazards: (1) if admin role definitions change (e.g., a `manager` role is added), only one copy may be updated, silently granting or denying access; (2) if a bug is found in the auth guard, it must be patched in every page that duplicated it.

**Fix:** Delete lines 9-37 and import from the shared helper:

```ts
import { requireAdminRole } from '@/lib/portal/auth';
// ...
export default async function AnalyticsPage() {
  await requireAdminRole();
  // ...
}
```

---

### WR-02: auth.getUser() result is not error-checked — silent auth bypass on Supabase client error

**File:** `app/(portal)/analytics/page.tsx:21-23`

**Issue:** The destructured `getUser()` call discards the `error` field:

```ts
const {
  data: { user },
} = await supabase.auth.getUser();
```

If the Supabase Auth service returns an error (network failure, JWT key rotation, service outage), `user` will be `null` and the code falls through to `if (!user) redirect('/login')` which is correct in that case. However, the error is never logged or surfaced, so transient auth failures silently redirect all staff to the login page with no diagnostic information. More critically, if this pattern is used elsewhere and a future developer checks `user !== null` without checking error, an errored-but-truthy user object could bypass the guard.

**Fix:**

```ts
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError) {
  // Log for observability; still redirect to login safely
  console.error('[analytics] auth.getUser error:', authError.message);
}
if (!user) redirect('/login');
```

---

### WR-03: GA4 Script injected in public locale layout — fires on every public page including patient-facing pages

**File:** `app/[locale]/layout.tsx:30-45`

**Issue:** The GA4 `<Script>` tags are placed in the `[locale]` layout, which wraps all public-facing pages including appointment request forms, doctor listings, and any pages that collect user-identifiable information. Depending on what the GA4 property is configured to track, this may constitute collection of patient browsing behaviour without explicit consent — a compliance concern under India's DPDP Act 2023 for a healthcare provider. There is no consent gate, cookie banner, or conditional rendering based on user consent.

**Fix:** At minimum, conditionally fire GA4 only after the user has given consent (consent management), or restrict tracking to non-PHI pages. As a short-term measure, document the compliance decision in a comment:

```tsx
{/* GA4 — review DPDP Act consent obligations before launch */}
<Script src={...} strategy="afterInteractive" />
```

A proper implementation gates the Script render on a consent cookie/state.

---

### WR-04: toFirstOfMonth helper produces a local-time date string — timezone-sensitive bug

**File:** `app/(portal)/analytics/page.tsx:11-15`

**Issue:** `toFirstOfMonth` calls `d.getFullYear()`, `d.getMonth()` — both local-time methods on a `Date` created with `new Date()` (also local time on the server). If the Next.js server runs in UTC (common in cloud deployments) and the hospital operates in IST (UTC+5:30), on the first ~5.5 hours of each calendar day the server's local month may trail the hospital's actual month. The date string `currentMonth` passed to payroll functions would then pull last month's payroll data from midnight IST to 05:30 UTC. The analytics DB functions use `new Date()` directly for similar comparisons. The discrepancy means payroll totals shown on the dashboard may flip to the wrong month for several hours each month-boundary.

**Fix:** Use UTC-based date construction throughout, or derive `now` in IST explicitly:

```ts
// Server-safe: derive IST "now" explicitly
const nowUTC = new Date();
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const nowIST = new Date(nowUTC.getTime() + IST_OFFSET_MS);
const currentMonth = toFirstOfMonth(nowIST); // pass nowIST to analytics fns too
```

---

## Info

### IN-01: Appointment "byStatus" count displayed with misleading label "(this month)" when data is all-time

**File:** `app/(portal)/analytics/page.tsx:120`

**Issue:** Even without fixing CR-02, the label text `(this month)` on line 120 is shown next to status badge counts that are computed from all-time data. This is a UI-level mislead independent of the backend fix. Should be fixed together with CR-02.

**Fix:** Change label to `(all time)` as a stop-gap until the backend query is scoped correctly.

---

### IN-02: doctor field from user input rendered directly in table without sanitisation note

**File:** `app/(portal)/analytics/page.tsx:140` / `lib/db/analytics.ts:63`

**Issue:** `preferred_doctor` is a free-text field submitted by appointment requesters on the public site. Its raw value is placed in `doctorMap` and then rendered in a React `<td>` (line 140 of the page). React escapes this by default so XSS is not a risk here. However, there is no normalisation: a requester typing "Dr. Sharma", "dr sharma", and "DR SHARMA" will produce three separate rows in the doctor breakdown table, making the breakdown unreliable for any hospital with non-standardised input. This is worth noting for a future normalisation or a controlled dropdown.

**Fix:** Consider trimming and lowercasing before grouping, or migrating to a doctor-selector dropdown on the appointment form.

---

_Reviewed: 2026-06-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
