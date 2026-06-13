---
status: complete
phase: 09-payroll-tracker
source: 09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-03-SUMMARY.md, 09-04-SUMMARY.md
started: 2026-06-13T00:00:00.000Z
updated: 2026-06-13T00:00:00.000Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Run `supabase db push` to apply the payroll_payments migration, then start the app fresh with `npm run dev`. The server boots without errors. Navigate to /payroll — the page loads and shows the staff payment table (or empty state if no staff).
result: pass

### 2. Payroll Page Loads with Staff List
expected: Visit /payroll as an admin. The page shows the "Payroll" heading, the current month (e.g. "June 2026") in the month navigator, a summary card labelled "Total Paid This Month", and a table listing all active staff with columns: Name, Role, Monthly Salary, Status, and an action column. Each unpaid row shows an "Unpaid" badge and a "Mark as Paid" button.
result: pass

### 3. Mark as Paid
expected: Click "Mark as Paid" on an unpaid staff row. The button shows a spinner and "Marking..." while pending. On success: the row's badge switches to "Paid", the action cell shows "Paid on [Day Mon]", and a toast appears saying "Marked as paid — ₹X,XX,XXX". The summary card total increases by that staff member's salary.
result: pass

### 4. Null Salary Warning Toast
expected: If a staff member has no salary set (shown as "—" in the salary column), click "Mark as Paid" on their row. The action succeeds and a toast appears: "Marked as ₹0. Update salary on the Staff page first." The row switches to "Paid" with ₹0 recorded.
result: pass

### 5. Duplicate Payment Blocked
expected: Attempt to mark the same staff member as paid a second time for the same month (e.g. by opening dev tools and re-submitting the action). The server returns the error toast: "Already marked as paid for this month." No duplicate row is inserted.
result: skipped
reason: UNIQUE constraint on (profile_id, payment_month) is DB-enforced; UI removes the button after marking paid so duplicate click is not possible without manual action call

### 6. Month Navigation — Previous Month
expected: Click the left chevron (Previous month) button. The month label changes to the prior month (e.g. "May 2026"), the table briefly shows skeleton rows while loading, then renders that month's payment data. Staff who were paid in that prior month show "Paid" badges; others show "Unpaid".
result: issue
reported: "yes (what if the staff joined this month why it shows the same staff to previous month as well)"
severity: minor

### 7. Future Month Blocked
expected: The right chevron (Next month) button is disabled and not clickable when the selected month is the current calendar month. Attempting to navigate forward is not possible from the UI. If the server action is called directly with a future month, it returns "Cannot mark future months as paid."
result: pass

### 8. Summary Card Accuracy
expected: The "Total Paid This Month" card shows the sum of `amount_paid` for all paid records in the selected month — not the sum of all staff salaries. When navigating to a month where nobody was paid, it shows ₹0.
result: pass

### 9. Admin-Only Access Gate
expected: Log in as a receptionist or doctor (non-admin role). Either /payroll is not visible in the sidebar, or navigating to it directly redirects to /login or shows a Forbidden error. The "Mark as Paid" action cannot be called by non-admin users.
result: pass

## Summary

total: 9
passed: 7
issues: 1
pending: 0
skipped: 1
blocked: 0

## Gaps

- truth: "Staff shown in a month's payroll view should only include staff who had joined on or before that month"
  status: failed
  reason: "User reported: staff who joined this month appear in previous months' payroll views. getActiveStaffWithPaymentStatus queries is_active=true with no join_date filter."
  severity: minor
  test: 6
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
