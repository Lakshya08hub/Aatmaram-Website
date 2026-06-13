# Phase 10: Analytics Dashboard - Context

**Gathered:** 2026-06-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a single `/analytics` portal page giving admins a bird's-eye operational view of the hospital. Four sections:
1. **GA4 website traffic** — iframe embed of the GA4 dashboard (ANA-01)
2. **Appointment operations** — counts this week / this month, by-status breakdown, by-doctor table (ANA-02)
3. **Staff & payroll summary** — total active staff by role, current month payroll total (ANA-03)
4. **Patient volume** — new patients registered this week and this month (ANA-04)

**In scope:**
- GA4 property creation (Measurement ID setup) + gtag script added to public site root layout
- GA4 dashboard iframe embed in the analytics portal page
- Appointment stats queried from `appointment_requests` table
- Staff/payroll summary queried from `profiles` + `payroll_payments` tables
- Patient volume queried from `patient_records` table
- Admin/super_admin only access

**Out of scope:**
- GA4 Data API integration / custom charts — iframe embed is sufficient
- Date range picker / custom date selection — fixed periods only (this week / this month)
- Real-time polling / auto-refresh — once-on-page-load
- Any charting library installation (recharts etc.) — no charts in v1

</domain>

<decisions>
## Implementation Decisions

### GA4 Website Traffic (ANA-01)
- **D-01:** GA4 property does NOT exist yet — create it as part of this phase. Plan includes: create GA4 property, obtain Measurement ID (G-XXXXXXX), add gtag snippet to the public site's root layout (`app/[locale]/layout.tsx`), store Measurement ID in `NEXT_PUBLIC_GA_MEASUREMENT_ID` env var.
- **D-02:** GA4 traffic section in the analytics portal uses an **iframe embed** of the GA4 dashboard URL (not the Data API). Height: 600px. The iframe URL points to the GA4 reporting view for the property.
- **D-03:** GA4 iframe permission: the user must grant the admin Google account permission to access the GA4 property. The iframe embed shows the live GA4 UI (requires the logged-in Google account in the browser to have GA4 access).

### Page Layout
- **D-04:** Stacked full-width sections, top to bottom:
  1. GA4 iframe (600px height, full width)
  2. Appointment Operations card
  3. Staff & Payroll Summary card
  4. Patient Volume card
- **D-05:** Layout consistent with payroll page — `p-8` padding, section headers matching portal heading style.

### Date Range Controls
- **D-06:** No date range picker. Fixed periods only. Each stat section shows **two numbers simultaneously**: "This week" and "This month". No toggle needed — both displayed side by side as stat chips inside each card.
- **D-07:** Appointment stats show: total count (this week / this month) + by-status breakdown (pending / confirmed / cancelled) + by-doctor table (doctor name + count). No day-by-day chart.

### Data Freshness
- **D-08:** Server Component fetches all stats on page load. No polling, no auto-refresh, no refresh button. Admin refreshes the page manually if they want updated data.

### Access Control
- **D-09:** Admin and super_admin only — same gate as payroll (`requireAdminRole()` pattern). Receptionist and doctor do not have access.

### Claude's Discretion
- Exact stat card layout within each section (label/value/badge arrangement)
- Whether to use shadcn `Card` or a simpler `div` for each section
- Week boundary definition: Monday–Sunday (ISO week) or rolling 7 days — Claude's call

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Analytics Dashboard (ANA-01 through ANA-04) — all four requirements

### Existing Portal Patterns
- `app/(portal)/payroll/page.tsx` — Server Component page pattern (async, toFirstOfMonth helper, parallel Promise.all fetch)
- `app/(portal)/payroll/PayrollClient.tsx` — Client Component pattern (though analytics has no interactivity — may be pure Server Component)
- `app/(portal)/actions/payroll.ts` → `requireAdminRole()` — admin gate pattern to duplicate
- `app/(portal)/layout.tsx` — sidebar nav (verify /analytics nav item is active)

### Existing DB Tables to Query
- `appointment_requests` table — for ANA-02 appointment stats (check migration for schema)
- `profiles` table — for ANA-03 staff counts by role (`is_active = true`)
- `payroll_payments` table — for ANA-03 current month payroll total
- `patient_records` table — for ANA-04 patient volume (created_at for new-patient counts)

### GA4 Integration
- `app/[locale]/layout.tsx` — public site root layout where gtag snippet will be added
- `.env.local` — GA Measurement ID will be added as `NEXT_PUBLIC_GA_MEASUREMENT_ID`

### Phase Context
- `.planning/ROADMAP.md` §Phase 10 — success criteria and dependencies

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/db/payroll.ts` → `getMonthlyPayrollTotal(month)` — directly reusable for ANA-03 payroll total
- `lib/db/payroll.ts` → `getActiveStaffWithPaymentStatus(month)` — can derive staff counts by role from the returned rows
- `lib/supabase/admin.ts` → `createAdminClient()` — all analytics queries use this
- `components/ui/card.tsx` — Card/CardContent/CardHeader for each stat section
- `components/ui/badge.tsx` — for status breakdown chips (Pending/Confirmed/Cancelled)

### Established Patterns
- Server Component page (`async function Page()`) fetches data, passes as props to a Client Component — or for analytics (no interactivity), may be a pure Server Component with no client boundary needed.
- `requireAdminRole()` duplicated inline (not imported) — established in payroll actions.
- `createAdminClient()` for all portal DB reads — session client blocked by RLS.

### Integration Points
- `payroll_payments.payment_month` uses DATE type (first of month, e.g. `2026-06-01`) — consistent with existing `getMonthlyPayrollTotal`.
- `patient_records.created_at` (timestamptz) — filter by `created_at >= start_of_week` for patient volume.
- `appointment_requests` schema: check migration file for status column name and values.

</code_context>

<specifics>
## Specific Ideas

- GA4 iframe should note (in the UI) that the admin needs to be signed in to Google with the right account for the iframe to show data — a small helper text below the iframe.
- Week definition: Claude's discretion (rolling 7 days vs ISO week).

</specifics>

<deferred>
## Deferred Ideas

- **GA4 Data API custom charts** — fetching session/user metrics via the GA4 Data API and rendering custom charts. Requires service account + extra complexity. Not in v1.
- **Date range picker** — custom date selection for appointment/patient stats. v2 if needed.
- **Auto-refresh / polling** — real-time stats updates. v2.
- **Day-by-day appointment chart** — requires a charting library (recharts). v2.

</deferred>

---

*Phase: 10-Analytics Dashboard*
*Context gathered: 2026-06-13*
