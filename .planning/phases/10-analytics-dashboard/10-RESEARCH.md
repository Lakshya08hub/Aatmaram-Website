# Phase 10: Analytics Dashboard - Research

**Researched:** 2026-06-13
**Domain:** Next.js Server Components + Supabase query layer + GA4 integration
**Confidence:** HIGH (codebase verified directly; GA4 iframe blocker confirmed via web search)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: GA4 property does NOT exist yet — create it as part of this phase. Plan includes: create GA4 property, obtain Measurement ID (G-XXXXXXX), add gtag snippet to the public site's root layout (`app/[locale]/layout.tsx`), store Measurement ID in `NEXT_PUBLIC_GA_MEASUREMENT_ID` env var.
- D-02: GA4 traffic section in the analytics portal uses an **iframe embed** of the GA4 dashboard URL (not the Data API). Height: 600px.
- D-03: GA4 iframe permission: the user must grant the admin Google account permission to access the GA4 property. The iframe embed shows the live GA4 UI.
- D-04: Stacked full-width sections, top to bottom: GA4 iframe → Appointment Operations card → Staff & Payroll Summary card → Patient Volume card.
- D-05: Layout consistent with payroll page — `p-8` padding, section headers matching portal heading style.
- D-06: No date range picker. Fixed periods only. Each stat section shows two numbers simultaneously: "This week" and "This month".
- D-07: Appointment stats show: total count (this week / this month) + by-status breakdown (pending / contacted / confirmed / cancelled) + by-doctor table (doctor name + count).
- D-08: Server Component fetches all stats on page load. No polling, no auto-refresh, no refresh button.
- D-09: Admin and super_admin only — same gate as payroll (`requireAdminRole()` pattern).

### Claude's Discretion
- Exact stat card layout within each section (label/value/badge arrangement)
- Whether to use shadcn `Card` or a simpler `div` for each section
- Week boundary definition: Monday–Sunday (ISO week) or rolling 7 days — Claude's call

### Deferred Ideas (OUT OF SCOPE)
- GA4 Data API custom charts
- Date range picker
- Auto-refresh / polling
- Day-by-day appointment chart (requires recharts)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANA-01 | Portal analytics page embeds Google Analytics (GA4 script tag) for website traffic data | gtag snippet added to `app/[locale]/layout.tsx` via Next.js `<Script>` component; iframe embed of GA4 reporting UI is blocked (see Critical Finding below) |
| ANA-02 | Portal shows appointment request counts by day/week, by doctor, and by status | `appointment_requests` schema confirmed — status enum: `pending | contacted | confirmed | cancelled`; `preferred_doctor` is free-text; `created_at` is `TIMESTAMPTZ` |
| ANA-03 | Portal shows staff summary: total count by role, current month payroll total | `getActiveStaffWithPaymentStatus()` and `getMonthlyPayrollTotal()` directly reusable from `lib/db/payroll.ts` |
| ANA-04 | Portal shows patient volume: new patients per week/month | `patient_records.created_at` is `TIMESTAMPTZ`; filter with `.gte()` / `.lte()` via admin client |
</phase_requirements>

---

## Summary

Phase 10 builds the `/analytics` portal page — a single Server Component page with four stacked data sections. The implementation is straightforward: duplicate the payroll page pattern, add three new `lib/db/analytics.ts` query functions, and reuse existing payroll lib functions for ANA-03.

**Critical finding (blocker on D-02):** The GA4 reporting interface at `analytics.google.com` sets `X-Frame-Options: SAMEORIGIN`. Embedding it in an iframe from a different domain is **blocked by every modern browser**. The iframe will render a blank frame or a browser-level error — not the GA4 dashboard. Decision D-02 as written cannot be implemented. The planner must surface this to the user and offer an alternative: (a) display a prominent link to the GA4 dashboard instead of an iframe, (b) embed Looker Studio (formerly Data Studio) which does support iframe embedding and connects to GA4, or (c) use the GA4 Data API (deferred per CONTEXT.md). Option (a) — link card — requires zero extra work and unblocks planning.

**Primary recommendation:** Replace D-02 iframe with a "View in Google Analytics" link card. Add gtag snippet to public site layout as specified (D-01). Implement ANA-02/03/04 as pure Server Component data fetch + render, matching the payroll page pattern exactly.

---

## Critical Finding: GA4 iframe Embed is Blocked

**What D-02 specifies:** `<iframe src="https://analytics.google.com/analytics/web/...">` at 600px height.

**What actually happens:** Google's `analytics.google.com` sends `X-Frame-Options: SAMEORIGIN` (and `frame-ancestors 'self'` via CSP). Any browser will refuse to render it in an iframe on a different origin. The frame shows blank or a security error — the user never sees GA4 data.

**Confidence:** HIGH — confirmed by multiple web sources (Quora, Google Analytics Community) and consistent with Google's general policy on embedding their own UI surfaces. [CITED: support.google.com/analytics/thread/35313442]

**Recommended alternatives for the planner to surface to user:**

| Option | Work | Trade-off |
|--------|------|-----------|
| (A) Link card — "Open GA4 Dashboard" button | ~30 min | No data visible in portal; opens GA4 in new tab |
| (B) Looker Studio iframe — create a GA4 report in Looker Studio, embed that | ~2–4 hrs | Looker Studio reports support iframe embedding; requires one-time report setup |
| (C) GA4 Data API — fetch metrics server-side and render as stat cards | Out of scope (deferred in CONTEXT.md) | — |

**Planner action:** Add a `checkpoint:human-verify` task at the top of Wave 1 to confirm which option the user wants. Default to Option A (link card) to keep phase unblocked.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| GA4 script injection | Frontend Server (SSR/layout) | — | `app/[locale]/layout.tsx` runs server-side; `<Script>` tag written once in root layout |
| GA4 traffic section display | API / Backend (Server Component) | — | Renders link/iframe in RSC; no client state needed |
| Appointment stats queries | API / Backend (Server Component) | Database | Admin client queries `appointment_requests` directly |
| Staff/payroll summary | API / Backend (Server Component) | Database | Reuses `lib/db/payroll.ts` functions |
| Patient volume queries | API / Backend (Server Component) | Database | Admin client queries `patient_records` |
| Access control gate | API / Backend (Server Component) | — | `requireAdminRole()` called at top of page; Server Component redirects on fail |

---

## Standard Stack

### Core (all already installed — zero new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | existing | Server Component page + `<Script>` for gtag | Already in project |
| `@supabase/supabase-js` | existing | `createAdminClient()` for all DB queries | Established pattern |
| `components/ui/card.tsx` | existing | Stat section cards | Shadcn already installed |
| `components/ui/badge.tsx` | existing | Status breakdown chips | Already used in portal |

**No new packages required for this phase.**

---

## Package Legitimacy Audit

No external packages are installed in this phase. Section not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
Page load request → /analytics
  ↓
app/(portal)/analytics/page.tsx  [Server Component, async]
  ↓ requireAdminRole() → redirect /login if not admin/super_admin
  ↓
Promise.all([
  getAppointmentStats(),         ← lib/db/analytics.ts
  getActiveStaffWithPaymentStatus(currentMonth),  ← lib/db/payroll.ts (reused)
  getMonthlyPayrollTotal(currentMonth),           ← lib/db/payroll.ts (reused)
  getPatientVolumeStats(),       ← lib/db/analytics.ts
])
  ↓
Supabase Admin Client → appointment_requests, profiles, payroll_payments, patient_records
  ↓
Rendered HTML → 4 stacked sections (no client boundary needed)
```

### Recommended Project Structure

```
app/(portal)/analytics/
└── page.tsx            # async Server Component — fetch + render, no PayrollClient-style split needed

lib/db/
├── payroll.ts          # existing — reuse getActiveStaffWithPaymentStatus + getMonthlyPayrollTotal
└── analytics.ts        # NEW — getAppointmentStats() + getPatientVolumeStats()
```

### Pattern 1: requireAdminRole() — Inline Duplicate (Established)

`requireAdminRole()` is defined inline in `app/(portal)/actions/payroll.ts`. The CONTEXT.md notes it is "duplicated inline (not imported)." Analytics page follows the same pattern: copy the function into the page file (or into a local `lib/portal/auth.ts` helper — Claude's discretion).

**Exact shape from `app/(portal)/actions/payroll.ts`:**

```typescript
// [VERIFIED: codebase grep]
const ADMIN_ROLES: StaffRole[] = ['super_admin', 'admin'];

async function requireAdminRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  if (error || !profile || !ADMIN_ROLES.includes(profile.role as StaffRole)) {
    throw new Error('Forbidden');
  }
  return supabase;
}
```

For a Server Component page (not a Server Action), `redirect()` works directly. The analytics page can call `requireAdminRole()` at the top of the async page function.

### Pattern 2: Date Range Queries — Supabase JS Filter Syntax

**Week boundary recommendation (Claude's discretion):** Rolling 7 days is simpler to compute; ISO week requires knowing the current ISO Monday. Recommend **rolling 7 days** to avoid edge cases.

```typescript
// [ASSUMED — standard Supabase JS client filter syntax, confirmed via training knowledge]
const now = new Date();
const sevenDaysAgo = new Date(now);
sevenDaysAgo.setDate(now.getDate() - 7);

const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

// Query: "this week"
const { data } = await adminClient
  .from('appointment_requests')
  .select('*')
  .gte('created_at', sevenDaysAgo.toISOString())
  .lte('created_at', now.toISOString());

// Query: "this month"
const { data } = await adminClient
  .from('appointment_requests')
  .select('*')
  .gte('created_at', startOfMonth.toISOString())
  .lte('created_at', now.toISOString());
```

`created_at` is `TIMESTAMPTZ` in both `appointment_requests` and `patient_records` — `.toISOString()` produces a valid ISO 8601 string that Postgres timestamptz accepts.

### Pattern 3: Payroll Page Pattern (exact model for analytics page)

```typescript
// Source: app/(portal)/payroll/page.tsx [VERIFIED: codebase read]
export default async function AnalyticsPage() {
  await requireAdminRole();  // redirects if not admin

  const currentMonth = toFirstOfMonth(new Date());
  const now = new Date();

  const [appointmentStats, staff, payrollTotal, patientStats] = await Promise.all([
    getAppointmentStats(now),
    getActiveStaffWithPaymentStatus(currentMonth),
    getMonthlyPayrollTotal(currentMonth),
    getPatientVolumeStats(now),
  ]);

  return (
    <div className="p-8">
      {/* Section 1: GA4 */}
      {/* Section 2: Appointments */}
      {/* Section 3: Staff & Payroll */}
      {/* Section 4: Patient Volume */}
    </div>
  );
}
```

No `PayrollClient`-style client component is needed — analytics has no user interactions (no markAsPaid, no month selector). Pure Server Component render.

### Pattern 4: GA4 gtag Snippet in Next.js App Router

```tsx
// Source: Next.js docs + community (next/script strategy="afterInteractive")
// Location: app/[locale]/layout.tsx — add inside <html><body> after existing content
// [ASSUMED — standard Next.js Script pattern; verify against official Next.js docs before implementing]
import Script from 'next/script';

// Inside LocaleLayout return:
<>
  <Script
    src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
    strategy="afterInteractive"
  />
  <Script id="ga4-init" strategy="afterInteractive">
    {`
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
    `}
  </Script>
</>
```

`NEXT_PUBLIC_GA_MEASUREMENT_ID` must be set in `.env.local` before the build/dev server starts. It is baked into client-side JS at build time (because `NEXT_PUBLIC_` prefix). Value is `G-XXXXXXXXXX` obtained from GA4 property creation.

**Important:** The GA4 property must be created manually (browser UI) to obtain the Measurement ID. This is a **manual step** the plan must surface as a `checkpoint:human` task before the gtag snippet is added.

### Anti-Patterns to Avoid

- **`getSession()` instead of `getUser()`:** Portal layout comment explicitly calls out `T-04-08` — always use `getUser()` for auth validation. [VERIFIED: codebase read — comment in `app/(portal)/layout.tsx`]
- **Using session client for analytics queries:** RLS is disabled on `appointment_requests`; `patient_records` RLS unknown. Use `createAdminClient()` for all analytics DB reads — consistent with established payroll pattern.
- **Putting `requireAdminRole()` in a Server Action:** Analytics page is not a Server Action. Call the check directly in the async page function. Server Component `redirect()` works the same way.
- **iframe for GA4 reporting UI:** Blocked by `X-Frame-Options: SAMEORIGIN` — see Critical Finding above.

---

## Confirmed Schema Details

### `appointment_requests` table
[VERIFIED: supabase/migrations/20260612_appointment_requests.sql — codebase read]

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `patient_name` | TEXT | — |
| `phone` | TEXT | — |
| `preferred_doctor` | TEXT | Free-text name; "No Preference" allowed |
| `preferred_date` | DATE | — |
| `preferred_time` | TEXT | 'morning' / 'afternoon' / 'evening' |
| `reason` | TEXT | — |
| `status` | `appointment_status` ENUM | `pending` / `contacted` / `confirmed` / `cancelled` |
| `notes` | TEXT | nullable — receptionist notes |
| `created_at` | TIMESTAMPTZ | default NOW() |

**Status values for ANA-02:** `pending`, `contacted`, `confirmed`, `cancelled` — note **four** values, not three. D-07 in CONTEXT.md says "pending / confirmed / cancelled" but the migration has `contacted` as a fourth value. The by-status breakdown must include all four.

**By-doctor grouping:** `preferred_doctor` is free-text. Group by string value — no JOIN to a doctors table needed for this simple count.

### `patient_records` table
[VERIFIED: supabase/migrations/20260613_patient_records.sql — codebase read]

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `patient_name` | TEXT | — |
| `age` | INTEGER | — |
| `phone` | TEXT | — |
| `reason` | TEXT | — |
| `assigned_doctor_id` | UUID | FK → doctors(id) nullable |
| `visit_date` | DATE | default CURRENT_DATE |
| `clinical_notes` | TEXT | nullable |
| `created_at` | TIMESTAMPTZ | default now() |
| `updated_at` | TIMESTAMPTZ | auto-updated |

**For ANA-04 patient volume:** Filter on `created_at` (not `visit_date`) for "new patients registered" — consistent with CONTEXT.md `code_context` note.

### `profiles` table (for ANA-03 staff counts by role)
[VERIFIED: lib/db/payroll.ts — codebase read]

`getActiveStaffWithPaymentStatus()` already selects `id, full_name, role, salary, join_date` from `profiles` where `is_active = true`. The returned `StaffPayrollRow[]` contains `.role` — derive role counts by grouping the array in TypeScript, no new DB query needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Staff count by role | Manual profiles query + group | Derive from `getActiveStaffWithPaymentStatus()` result | Function already exists; one less DB call |
| Payroll total | Manual `payroll_payments` sum query | `getMonthlyPayrollTotal(currentMonth)` | Already implemented, tested |
| Admin gate | Custom auth check | Inline `requireAdminRole()` pattern from payroll.ts | Established pattern; do not invent new shape |

**Key insight:** Analytics is almost entirely composed of existing primitives. The only new code is `lib/db/analytics.ts` with two query functions (appointment stats + patient volume) and the page render.

---

## `appointment_requests` Table Dependency Risk

Phase 7 (Appointment Request System) is **not yet implemented**. The migration file `20260612_appointment_requests.sql` exists in the repo, but if Supabase migrations haven't been run yet for that phase, the table won't exist in the database.

**Risk:** `getAppointmentStats()` will throw if the table is absent.

**Recommended mitigation:** The `lib/db/analytics.ts` appointment query function should gracefully handle the case — wrap the query in try/catch and return zeroed stats with a flag, OR the plan should explicitly note that the `appointment_requests` migration must be applied before Phase 10 is run. The planner should add a dependency check task.

---

## Nav Item Status

[VERIFIED: lib/portal/roles.ts — codebase read]

`/analytics` is already defined in `ALL_SECTIONS` and in `ROLE_SECTIONS` for `super_admin` and `admin`. The `PortalSidebar` component reads from `ROLE_SECTIONS[role]` — no sidebar changes needed. The Analytics nav item appears automatically once the route exists.

---

## Common Pitfalls

### Pitfall 1: GA4 iframe Blank Frame (Critical)
**What goes wrong:** `<iframe src="https://analytics.google.com/...">` renders blank — browser refuses due to `X-Frame-Options: SAMEORIGIN`.
**Why it happens:** Google deliberately blocks their reporting UI from being embedded in foreign origins.
**How to avoid:** Do not attempt to embed `analytics.google.com`. Use a link card (Option A) or Looker Studio (Option B).
**Warning signs:** Browser console shows "Refused to display in a frame because it set 'X-Frame-Options' to 'SAMEORIGIN'."

### Pitfall 2: Status Enum Has Four Values, Not Three
**What goes wrong:** By-status breakdown only shows pending/confirmed/cancelled, missing `contacted` appointments.
**Why it happens:** CONTEXT.md D-07 lists three statuses; the migration has four.
**How to avoid:** Query all four statuses. Display `contacted` as a badge (e.g., amber/orange color).
**Warning signs:** Appointment counts don't add up to total.

### Pitfall 3: `createClient()` vs `createAdminClient()` for Analytics Queries
**What goes wrong:** `appointment_requests` RLS is disabled; `patient_records` RLS state is unknown. Using `createClient()` (session-scoped) for portal reads may fail silently with empty results due to RLS or policy gaps.
**How to avoid:** Use `createAdminClient()` for all analytics DB reads — matches established payroll pattern.

### Pitfall 4: NEXT_PUBLIC_ Env Var Baked at Build Time
**What goes wrong:** GA4 `Measurement ID` is not in `.env.local` when `next dev` or `next build` runs → gtag fires with `undefined` as the measurement ID, creating phantom GA4 events with no property association.
**How to avoid:** Plan must include a manual checkpoint: "Add `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` to `.env.local` before restarting dev server."

### Pitfall 5: `preferred_doctor` Free-Text Grouping Edge Cases
**What goes wrong:** "Dr. Smith" and "dr. smith" and "Dr Smith" count as three different doctors.
**How to avoid:** Group on exact string value — do not normalize. This is acceptable for v1 since the receptionist enters the name consistently via a form field. Document as known limitation.

---

## Code Examples

### `lib/db/analytics.ts` — getAppointmentStats

```typescript
// [ASSUMED pattern — modeled on lib/db/payroll.ts shape; VERIFIED column names from migration]
import { createAdminClient } from '@/lib/supabase/admin';

export interface AppointmentStats {
  thisWeek: number;
  thisMonth: number;
  byStatus: Record<string, number>;  // 'pending' | 'contacted' | 'confirmed' | 'cancelled'
  byDoctor: { doctor: string; count: number }[];
}

export async function getAppointmentStats(now: Date): Promise<AppointmentStats> {
  const adminClient = createAdminClient();

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data, error } = await adminClient
    .from('appointment_requests')
    .select('created_at, status, preferred_doctor');

  if (error) throw new Error(`Failed to fetch appointment stats: ${error.message}`);

  const rows = data ?? [];
  const nowMs = now.getTime();
  const weekMs = sevenDaysAgo.getTime();
  const monthMs = startOfMonth.getTime();

  let thisWeek = 0;
  let thisMonth = 0;
  const byStatus: Record<string, number> = {};
  const byDoctor: Record<string, number> = {};

  for (const row of rows) {
    const ts = new Date(row.created_at as string).getTime();
    if (ts >= weekMs && ts <= nowMs) thisWeek++;
    if (ts >= monthMs && ts <= nowMs) thisMonth++;
    // by-status: count all-time (or scope to this month — Claude's discretion)
    const s = (row.status as string) ?? 'unknown';
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    const d = (row.preferred_doctor as string) ?? 'Unknown';
    byDoctor[d] = (byDoctor[d] ?? 0) + 1;
  }

  return {
    thisWeek,
    thisMonth,
    byStatus,
    byDoctor: Object.entries(byDoctor)
      .map(([doctor, count]) => ({ doctor, count }))
      .sort((a, b) => b.count - a.count),
  };
}
```

### `lib/db/analytics.ts` — getPatientVolumeStats

```typescript
// [ASSUMED pattern — VERIFIED column names from migration]
export interface PatientVolumeStats {
  thisWeek: number;
  thisMonth: number;
}

export async function getPatientVolumeStats(now: Date): Promise<PatientVolumeStats> {
  const adminClient = createAdminClient();

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data, error } = await adminClient
    .from('patient_records')
    .select('created_at')
    .gte('created_at', startOfMonth.toISOString());

  if (error) throw new Error(`Failed to fetch patient stats: ${error.message}`);

  const rows = data ?? [];
  const nowMs = now.getTime();
  const weekMs = sevenDaysAgo.getTime();

  let thisWeek = 0;
  let thisMonth = 0;
  for (const row of rows) {
    const ts = new Date(row.created_at as string).getTime();
    if (ts >= weekMs && ts <= nowMs) thisWeek++;
    thisMonth++;
  }

  return { thisWeek, thisMonth };
}
```

### Staff Count by Role (TypeScript — no extra DB call)

```typescript
// Derive from existing getActiveStaffWithPaymentStatus() result
// [VERIFIED: StaffPayrollRow type from lib/db/payroll.ts]
const roleCount = staff.reduce<Record<string, number>>((acc, s) => {
  acc[s.role] = (acc[s.role] ?? 0) + 1;
  return acc;
}, {});
// Result: { doctor: 3, receptionist: 2, admin: 1, super_admin: 1 }
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Pages Router + `getServerSideProps` | App Router Server Components (async functions) | No `getServerSideProps`; data fetch inline in page function |
| GA embed via Universal Analytics | GA4 Measurement ID + gtag.js (`G-XXXXXXX`) | Different URL format; `gtag('config', ...)` replaces `ga('send', ...)` |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Google Analytics account | ANA-01 — GA4 property creation | Unknown — manual step | — | None; must be created before phase completes |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` env var | ANA-01 — gtag snippet | Not set (GA4 property doesn't exist yet) | — | Phase plan must include manual checkpoint |
| `appointment_requests` DB table | ANA-02 | Migration file exists; apply status unknown | — | Wrap query in try/catch; zeroed fallback |
| `patient_records` DB table | ANA-04 | Migration file exists; apply status unknown | — | Wrap query in try/catch; zeroed fallback |

**Missing dependencies with no fallback:**
- Google Analytics account / GA4 property — must be created manually before gtag snippet is deployed

**Missing dependencies with fallback:**
- `appointment_requests` and `patient_records` tables — queries can fail gracefully with zeroed stats

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Not detected — no test config files found in codebase |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANA-01 | gtag snippet renders in `<head>` on public pages | manual-only | — manual browser check — | ❌ |
| ANA-02 | Appointment stats render correct counts | manual-only | — visual check on /analytics page — | ❌ |
| ANA-03 | Staff count and payroll total match payroll page | manual-only | — cross-check with /payroll — | ❌ |
| ANA-04 | Patient volume counts match DB records | manual-only | — visual check — | ❌ |

**Rationale for manual-only:** No test framework is configured. All four requirements are UI rendering + DB query correctness — best validated by loading the page and comparing displayed values against Supabase dashboard queries.

### Wave 0 Gaps
- No test framework — install not recommended in this phase (out of scope per CONTEXT.md budget constraint)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `requireAdminRole()` — `getUser()` re-validates with Supabase Auth server |
| V3 Session Management | no | Handled by portal layout; not phase-specific |
| V4 Access Control | yes | Admin/super_admin only gate in page function; sidebar already hides nav item for other roles |
| V5 Input Validation | no | Read-only page; no user input |
| V6 Cryptography | no | No secrets handled in this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized access to /analytics by receptionist/doctor | Elevation of Privilege | `requireAdminRole()` at page top; `ROLE_SECTIONS` hides nav link |
| GA4 Measurement ID exposed in client JS | Information Disclosure | Acceptable — `NEXT_PUBLIC_` env vars are intentionally public; GA measurement IDs are not secrets |
| Stale session bypassing admin check | Spoofing | `getUser()` (not `getSession()`) per T-04-08 mitigation already in place project-wide |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Rolling 7 days preferred over ISO week for "this week" boundary | Code Examples, Date Range Queries | Low — display-only; no business logic consequence |
| A2 | By-status breakdown is all-time (not scoped to this month) | Code Examples | Low — can adjust in implementation |
| A3 | Supabase JS `.gte()` / `.lte()` accept ISO 8601 strings for TIMESTAMPTZ columns | Code Examples | Low — standard Supabase behavior; easy to verify in first test |
| A4 | `patient_records` RLS is not enabled (migration doesn't show RLS enable) | Common Pitfalls | Medium — if RLS is on without a permissive policy, `createAdminClient()` bypasses it correctly anyway |
| A5 | gtag `strategy="afterInteractive"` is the correct Next.js Script strategy for GA4 | Code Examples (Pattern 4) | Low — `afterInteractive` is the universal recommendation for analytics scripts |

---

## Open Questions

1. **GA4 iframe alternative (D-02 blocker)**
   - What we know: analytics.google.com blocks iframe embedding via X-Frame-Options SAMEORIGIN
   - What's unclear: User preference between Option A (link card), Option B (Looker Studio), or re-scoping ANA-01 away from iframe entirely
   - Recommendation: Planner adds `checkpoint:human-verify` as Wave 1 task 0 with three clear options; defaults plan to Option A (link card) to stay unblocked

2. **`appointment_requests` migration applied status**
   - What we know: Migration SQL file exists; Phase 7 is not implemented
   - What's unclear: Has the migration been applied to the Supabase project?
   - Recommendation: Plan includes a "verify migration applied" step; analytics query wraps in try/catch

---

## Sources

### Primary (HIGH confidence)
- `D:/Git Hub/Aatmaram Website/supabase/migrations/20260612_appointment_requests.sql` — exact schema for appointment_requests, confirmed status enum values
- `D:/Git Hub/Aatmaram Website/supabase/migrations/20260613_patient_records.sql` — exact schema for patient_records
- `D:/Git Hub/Aatmaram Website/lib/db/payroll.ts` — exact shape of existing query functions
- `D:/Git Hub/Aatmaram Website/app/(portal)/actions/payroll.ts` — exact `requireAdminRole()` implementation
- `D:/Git Hub/Aatmaram Website/lib/portal/roles.ts` — confirmed /analytics already in ALL_SECTIONS and ROLE_SECTIONS for admin/super_admin

### Secondary (MEDIUM confidence)
- [Google Analytics Community thread](https://support.google.com/analytics/thread/35313442) — GA4 blocked in iframe due to SameSite/X-Frame-Options
- [Quora: Can GA4 reporting interface be embedded in iframe](https://www.quora.com/Is-it-possible-to-embed-the-Google-Analytics-reporting-interface-into-an-Iframe) — confirmed X-Frame-Options SAMEORIGIN blocks embedding
- Multiple community sources confirm `X-Frame-Options: SAMEORIGIN` on `analytics.google.com`

### Tertiary (LOW confidence)
- Next.js community articles on GA4 + App Router `<Script>` pattern — standard approach, not verified against official Next.js docs in this session

---

## Metadata

**Confidence breakdown:**
- Schema details: HIGH — read directly from migration SQL files
- Existing patterns (requireAdminRole, admin client, payroll lib): HIGH — read directly from source
- GA4 iframe blocker: HIGH — confirmed via multiple web sources + Google's known policy
- Supabase query syntax: MEDIUM — standard JS client behavior, not re-verified against docs
- GA4 gtag/Script pattern: MEDIUM — widely documented community pattern

**Research date:** 2026-06-13
**Valid until:** 2026-07-13 (stable stack)
