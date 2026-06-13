---
plan: 09-04
status: complete
self_check: PASSED
---

# Plan 09-04 Summary: Payroll Page UI

## What was built

`app/(portal)/payroll/page.tsx` — Server Component:
- Computes currentMonth via toFirstOfMonth(new Date())
- Calls getActiveStaffWithPaymentStatus + getMonthlyPayrollTotal in parallel
- Passes initialStaff, initialTotal, initialMonth props to PayrollClient

`app/(portal)/payroll/PayrollClient.tsx` — Client Component:
- Month navigator: ChevronLeft/ChevronRight with aria-labels; ChevronRight disabled when selectedMonth >= currentMonth
- Summary Card: "Total Paid This Month" + formatINR(total) from state (not salary sum)
- Staff table: Name | Role | Monthly Salary | Status | Action
- Skeleton rows (5) during isNavigating state
- Empty state: "No active staff found" + "Add staff on the Staff page before running payroll."
- "Mark as Paid" button with Loader2 spinner during pending state; per-row pendingIds Set
- Paid row shows "Paid on [Day Mon]" timestamp
- Salary null → "—" display
- Toasts: success with amount, null-salary warning, error pass-through

## Key files

- `app/(portal)/payroll/page.tsx` — updated (was stub)
- `app/(portal)/payroll/PayrollClient.tsx` — created

## Deviations

None. All acceptance criteria met. TypeScript compilation: no errors.

## Self-Check

- [x] page.tsx is async Server Component (no 'use client')
- [x] PayrollClient has 'use client' at line 1
- [x] ChevronRight disabled when selectedMonth >= currentMonth
- [x] Summary card total from state (not staff[].salary)
- [x] Null salary shows "—" not "₹0"
- [x] Skeleton rows when isNavigating
- [x] Empty state text matches spec
- [x] handleMarkAsPaid uses row.salary ?? 0 as amountPaid
- [x] No TypeScript errors
