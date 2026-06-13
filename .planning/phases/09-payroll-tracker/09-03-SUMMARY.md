---
plan: 09-03
status: complete
self_check: PASSED
---

# Plan 09-03 Summary: Server Actions for Payroll

## What was built

Created `app/(portal)/actions/payroll.ts` with:
- `requireAdminRole()` — private, duplicated inline from actions/staff.ts (not imported). createClient() → getUser() → profile.role check → throw Forbidden.
- `markAsPaidAction({ profileId, paymentMonth, amountPaid })` — auth gate, future-month guard (string comparison), adminClient INSERT with Math.max(0, amount) sanitization, 23505 duplicate guard, error bubbling.
- `getPayrollDataAction(month)` — auth gate, parallel Promise.all of getActiveStaffWithPaymentStatus + getMonthlyPayrollTotal.
- `toFirstOfMonth(date)` — private helper for current month string.

## Key files

- `app/(portal)/actions/payroll.ts` — created

## Deviations

None. Threat model item T-09-07 (negative amountPaid) handled with `Math.max(0, input.amountPaid)`.

## Self-Check

- [x] 'use server' at line 1
- [x] requireAdminRole() duplicated inline, not imported
- [x] markAsPaidAction: future-month guard
- [x] markAsPaidAction: error.code === '23505' → specific error message
- [x] markAsPaidAction: createAdminClient() for insert
- [x] getPayrollDataAction: calls both query functions in parallel
- [x] No TypeScript errors
