# Phase 9: Payroll Tracker - Context

**Gathered:** 2026-06-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a monthly salary payment tracker in the portal: admin sees all active staff with their current salary, marks each as "Paid" for the selected month, and can browse payment history by month. No deductions, no compliance math, no payslips — pure paid/unpaid tracking (PAY-01 through PAY-04).

**In scope:**
- `payroll_payments` table: one row per staff member per calendar month they were paid
- Portal `/payroll` page: month navigator (prev/next arrows), staff payment table, "Mark as Paid" action per row, summary card (total payroll for the month)
- Payment history: admin navigates back to any prior month and sees who was paid and at what amount
- Active staff only — deactivated staff are not shown
- Admin and super_admin access only (no receptionist, no doctor)

**Out of scope:**
- PF / ESI / TDS deductions — v2 compliance math per CLAUDE.md constraint
- Leave deductions / salary cuts for absence — v2 (deferred, noted below)
- Payslip PDF generation — v2
- Attendance-linked deductions — v2
- Editing or deleting a payment record once marked paid

</domain>

<decisions>
## Implementation Decisions

### Database Schema
- **D-01:** New table `payroll_payments`: `id` (UUID PK), `profile_id` (UUID FK → profiles.id), `payment_month` (DATE — first day of month, e.g. `2026-06-01`), `amount_paid` (NUMERIC(10,2) — snapshot at time of payment), `paid_at` (TIMESTAMPTZ), `paid_by` (UUID FK → profiles.id — who marked it paid). UNIQUE constraint on `(profile_id, payment_month)` — one payment record per person per month.
- **D-02:** `payment_month` stored as a Postgres `DATE` (first of month). Queries use `DATE_TRUNC('month', ...)` for grouping. Native date ordering — no string parsing needed.
- **D-03:** `amount_paid` is a snapshot of `profiles.salary` at the time of marking paid. History remains accurate even if salary changes in future months.

### Month Navigation UX
- **D-04:** Prev/Next arrow buttons (`< June 2026 >`) in the page header. Defaults to current calendar month on load. Admin can navigate one month at a time in either direction — no jump-to picker in v1.
- **D-05:** No lower bound on navigation — admin can go back to any previous month (useful for retrospective marking).

### Staff Scope
- **D-06:** Show only active staff (`is_active = true` in profiles) for the selected month. Deactivated staff do not appear. Rationale: deactivated staff have no current salary; edge-case final-month payments not scoped for v1.

### Payment Flow
- **D-07:** Each row in the staff table shows: staff name, role, salary (current), status badge (Paid / Unpaid). "Mark as Paid" button on unpaid rows — one click saves a `payroll_payments` row with snapshot amount. No undo in v1.
- **D-08:** Summary card at top of page: "Total Payroll: ₹X,XX,XXX" — sum of `amount_paid` for all paid staff in the selected month (not sum of current salaries, since not everyone may be marked paid yet).

### Access Control
- **D-09:** Admin and super_admin only. Receptionist and doctor do not have access to `/payroll`. Server Action `requireAdminRole()` gates all mutations.

### Claude's Discretion
- Month display format: "June 2026" (full month name + year) — readable, no ambiguity.
- Staff with `salary = null` still appear in the list (salary shown as "—"); they can be marked paid with amount 0 or admin updates their salary first.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Payroll Tracker (PAY-01 through PAY-04) — all four requirements for this phase
- `.planning/ROADMAP.md` §Phase 9 — Success criteria and dependencies

### Project Constraints
- `CLAUDE.md` §Constraints — "Payroll: Monthly tracker only — no Indian compliance math (PF/ESI/TDS) — decided"

### Existing Portal Patterns to Follow
- `lib/db/staff.ts` → `getStaffList()` — returns all active staff with `salary`; reuse as the data source for the payroll staff list. Uses `adminClient`.
- `app/(portal)/staff/StaffClient.tsx` — Table + Sheet + toast pattern to follow for the payroll page layout.
- `app/(portal)/actions/staff.ts` — `requireAdminRole()` auth gate pattern; reuse for payroll mutations.
- `app/(portal)/appointments/page.tsx` — Server Component → Client Component handoff pattern (fetch in page.tsx, pass as props).

### Existing DB Schema
- `supabase/migrations/20260612_staff_schema.sql` — `profiles.salary numeric(10,2)` and `profiles.is_active` columns live here.
- `supabase/migrations/20260612_cms_tables.sql` — RLS pattern reference for new table creation.

### Phase 4 Auth Patterns
- `.planning/phases/04-auth-roles/04-CONTEXT.md` — Role map; payroll is admin/super_admin only.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/db/staff.ts` → `getStaffList()` — call this to get active staff with salary for the payroll page. Filter by `is_active = true` already, or add a param.
- `lib/supabase/admin.ts` → `createAdminClient()` — all payroll writes use this (RLS bypass).
- `components/ui/sonner.tsx` + `<Toaster />` in portal layout — already mounted, toasts work for "Marked as Paid" feedback.
- `app/(portal)/actions/staff.ts` → `requireAdminRole()` — copy pattern for payroll action auth gate.

### Established Patterns
- Server Action: `await requireAdminRole()` first, then `createAdminClient()` for the DB op, return `{ error?: string }`.
- Server Component page fetches data, passes as props to a `*Client.tsx` Client Component.
- All portal DB writes go through `adminClient` (session client is blocked by RLS on most tables).

### Integration Points
- `payroll_payments.profile_id` → `profiles.id` join to match payments to staff members.
- `getStaffList()` returns `profiles.id` as `id` — use this as the FK value for `payroll_payments.profile_id`.
- Middleware `PORTAL_PATHS` in `middleware.ts` — add `/payroll` to the protected routes array.
- Sidebar nav in `app/(portal)/layout.tsx` — payroll nav item likely already stubbed from Phase 4 (verify and activate).

</code_context>

<specifics>
## Specific Ideas

No specific references — standard portal patterns apply throughout.

</specifics>

<deferred>
## Deferred Ideas

- **Salary cuts for extra holidays / leave deductions** — per-day deduction math based on absences. Requires attendance tracking (ATT-01 to ATT-03 in v2 requirements) and compliance math. Deferred to v2.
- **Payslip PDF generation** — PAYC-03 in v2 requirements. Not in v1 scope.
- **Undo / edit a payment record** — once marked paid, no correction in v1. Admin would need to handle via Supabase directly. Can add in v2.
- **Staff with null salary** — flagged as a potential UX edge case; admin should fill in salary on the Staff page before running payroll.

</deferred>

---

*Phase: 9-Payroll Tracker*
*Context gathered: 2026-06-13*
