# Phase 9: Payroll Tracker - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-13
**Phase:** 09-payroll-tracker
**Areas discussed:** Month navigation UX, Payment record snapshot vs live salary, Staff scope, Month storage format in DB

---

## Month Navigation UX

| Option | Description | Selected |
|--------|-------------|----------|
| Prev/Next arrows | `< June 2026 >` header. Defaults to current month. One month at a time. | ✓ |
| Month/year dropdowns | Two selects for direct jump to any past month. | |
| Arrows + clickable month label opens picker | Combined nav. | |

**User's choice:** Prev/Next arrows (recommended option)  
**Notes:** Simple navigation, hard to skip months accidentally.

---

## Payment Record: Snapshot vs Live Salary

| Option | Description | Selected |
|--------|-------------|----------|
| Snapshot | Save salary at time of marking paid. History stays accurate if salary changes. | ✓ |
| Reference only | Just record 'paid', always show current salary from profiles. | |

**User's choice:** Snapshot (recommended option)  
**Notes:** Accurate historical payment record; handles salary changes between months.

---

## Staff Scope on Payroll Page

| Option | Description | Selected |
|--------|-------------|----------|
| Active staff only | `is_active = true` only. Deactivated staff not shown. | ✓ |
| All staff (active + recently deactivated) | Show staff who existed during the selected month. | |

**User's choice:** Active staff only (deferred to Claude's recommendation)  
**Notes:** Simpler; deactivated staff won't have a current salary to pay in most cases.

---

## Month Storage Format in DB

| Option | Description | Selected |
|--------|-------------|----------|
| DATE (first day of month) | e.g. `2026-06-01`. Native Postgres date type, correct ordering. | ✓ |
| TEXT ('2026-06') | YYYY-MM string. Simple but string-based ordering. | |
| Two integers (year + month) | Most explicit, most columns. | |

**User's choice:** DATE (recommended option)  
**Notes:** Native type ordering, compatible with `date_trunc()` for grouping queries.

---

## Claude's Discretion

- Staff scope: active only (user deferred to recommendation)
- Month display format: "June 2026" (full month name + year)
- Staff with null salary: show in list with "—" amount

## Deferred Ideas

- **Salary cuts for extra holidays / leave deductions** — user raised this; requires attendance tracking (v2 ATT-01 to ATT-03) and deduction math. Out of v1 scope per CLAUDE.md "no compliance math" constraint.
- **Payslip PDF generation** — v2 PAYC-03
- **Undo / edit a payment record** — v2
