---
status: complete
phase: 06-staff-management
source: 06-01-SUMMARY.md, 06-02-SUMMARY.md
started: 2026-06-13T00:00:00Z
updated: 2026-06-13T00:00:00Z
---

## Current Test

number: 1
name: DB migration applied
expected: |
  In Supabase Dashboard → Table Editor → profiles, check that the table has
  columns: full_name, phone, salary, join_date (in addition to existing columns).
  If these columns are missing, apply the migration first:
  go to Supabase SQL Editor, open supabase/migrations/20260612_staff_schema.sql,
  paste and run it.
awaiting: user response

## Tests

### 1. DB migration applied
expected: In Supabase Dashboard → Table Editor → profiles, the table has columns full_name, phone, salary, join_date. If missing, apply supabase/migrations/20260612_staff_schema.sql via the SQL Editor first.
result: pass

### 2. Staff page loads
expected: Log in as admin/super_admin and navigate to /staff. The page renders with an "Active" tab and a "Pending" tab, a table of staff members (possibly empty), and an "Add Staff" button in the top right.
result: pass

### 3. Add a new staff member
expected: Click "Add Staff". A dialog opens with fields: Full Name, Email, Temp Password, Role (select), Phone, Salary, Join Date. Fill them in and click "Add Staff". The dialog closes, a success toast appears, and a new row appears in the Pending tab (since new accounts default to is_active = false).
result: issue
reported: "no toast appeared, staff not visible in pending tab — Toaster missing from portal layout + getStaffList used regular client (RLS own-read blocked other rows)"
severity: major

### 4. Activate a pending account
expected: Go to the Pending tab. The new staff member is listed there. Click the "Activate" button on their row. A success toast appears. The row disappears from the Pending tab and reappears in the Active tab.
result: issue
reported: "after clicking approve button it didn't come to active side, not in database either — toggleActiveAction used regular client blocked by RLS admin update policy recursion"
severity: major

### 5. Edit a staff member
expected: In the Active tab, find a staff row and click "Edit". A sheet slides in from the right with all editable fields pre-filled (Full Name, Role, Phone, Salary, Join Date — no email/password fields). Edit a field and save. The sheet closes, toast shows, and the table reflects the updated value.
result: pass

### 6. Deactivate an active account
expected: In the Active tab, find a staff row and click "Deactivate". A confirmation dialog appears. Confirm it. The row moves from the Active tab to the Pending tab. In Supabase, is_active = false for that user.
result: pass

### 7. Doctor profile linkage
expected: In the Active tab, find a staff member with role "doctor" (or create one). Click Edit. The sheet contains a "Doctor Profile" select dropdown listing available doctor profiles. Choose one and save. Navigate to /en/doctors on the public site — the linked doctor's profile should now reflect the staff_user_id linkage (the doctor card is visible/updated). In Supabase, the doctors row has staff_user_id set to this user's ID.
result: pass

### 8. Role guard — non-admin blocked
expected: Log in as a staff member with role "receptionist" or "doctor" (not admin). Try navigating to /staff directly. You should be redirected to /dashboard (not see the staff management page).
result: pass

## Summary

total: 8
passed: 6
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps
