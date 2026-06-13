---
phase: 06-staff-management
verified: 2026-06-12T00:00:00Z
status: human_needed
score: 15/15 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Add Staff flow end-to-end"
    expected: "Submitting the Add Staff dialog with valid data creates an Auth user + profiles row; new entry appears in the Pending tab after router.refresh()"
    why_human: "Requires live Supabase project with migration applied; cannot invoke createAdminClient.auth.admin.createUser in a static grep check"
  - test: "Migration actually applied to Supabase database"
    expected: "profiles table has full_name, phone, salary, join_date columns; three admin RLS policies exist"
    why_human: "SUMMARY.md documents that supabase db push was skipped (CLI not linked). Migration SQL file is correct but application to live DB cannot be verified without DB access."
  - test: "Activate button in Pending tab grants portal access"
    expected: "Clicking Activate on a pending account sets is_active=true; that user can then log into the portal"
    why_human: "Requires two browser sessions to verify the portal layout is_active check unblocks the activated user"
  - test: "Doctor Profile Link updates public Doctors page"
    expected: "Selecting a doctor in the Edit sheet and saving causes the public /doctors page to display the updated staff_user_id linkage immediately"
    why_human: "Requires live Supabase read on the public page + portal write; cross-page data-flow cannot be verified statically"
---

# Phase 6: Staff Management Verification Report

**Phase Goal:** Admin can manage the full staff roster from the portal, and doctor profile edits automatically update the public-facing Doctors page
**Verified:** 2026-06-12
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|---------|
| 1  | profiles table has full_name, phone, salary, join_date columns (ALTER TABLE) | VERIFIED | `supabase/migrations/20260612_staff_schema.sql` lines 6-10: `ADD COLUMN IF NOT EXISTS` for all four fields |
| 2  | RLS policies exist on profiles for admin INSERT, UPDATE, DELETE | VERIFIED | Migration file lines 19-56: three `CREATE POLICY` statements with EXISTS subquery checking active admin/super_admin role |
| 3  | lib/db/staff.ts exports getStaffList() returning profiles joined with email via admin client | VERIFIED | `lib/db/staff.ts`: exports `StaffMember` interface + `getStaffList()` using `adminClient.auth.admin.listUsers()` merged with profiles select |
| 4  | app/(portal)/actions/staff.ts exports createStaffAction, updateStaffAction, toggleActiveAction, deleteStaffAction | VERIFIED | All four functions present and exported in the file, plus `updateDoctorStaffLinkAction` |
| 5  | createStaffAction uses createAdminClient() for auth.admin.createUser() | VERIFIED | Lines 63-73 of staff.ts: `createAdminClient().auth.admin.createUser(...)` |
| 6  | createStaffAction sets is_active: false on new profile | VERIFIED | Line 83: `is_active: false` in the profiles insert |
| 7  | deleteStaffAction calls auth.admin.deleteUser() to remove Auth user | VERIFIED | Lines 204-205: `adminClient.auth.admin.deleteUser(user_id)` |
| 8  | requireAdminRole() guard used in every Server Action | VERIFIED | All five exported actions call `requireAdminRole()` or `await requireAdminRole()` as first statement |
| 9  | app/(portal)/staff/page.tsx fetches staff list server-side via getStaffList() and renders StaffClient | VERIFIED | page.tsx line 17: `Promise.all([getStaffList(), getDoctors()])`, renders `<StaffClient initialStaff={staff} doctors={doctors} />` |
| 10 | StaffClient renders a table with columns: Name, Email, Role, Phone, Join Date, Status, Actions | VERIFIED | TableHead elements lines 425-432 |
| 11 | StaffClient has Add Staff dialog with correct fields; Edit Sheet without email/temp_password | VERIFIED | Dialog (lines 511-609): full_name, email, temp_password, role, phone, salary, join_date. Sheet (lines 614-716): same minus email/temp_password |
| 12 | StaffClient has Active/Pending tabs with Pending badge for is_active=false rows | VERIFIED | Tabs at lines 475-506; `activeStaff`/`pendingStaff` filter lines 335-336; Pending badge line 362-363 |
| 13 | For doctor-role staff, Edit sheet shows Doctor Profile Select dropdown | VERIFIED | Conditional render lines 674-697: shown when `editingStaff.role === 'doctor' || editForm.watch('role') === 'doctor'` |
| 14 | Selecting a doctor writes doctors.staff_user_id via updateDoctorStaffLinkAction | VERIFIED | onEditSubmit lines 262-275 calls `updateDoctorStaffLinkAction(selectedDoctorId, editingStaff.user_id)`; action updates `doctors.staff_user_id` |
| 15 | app/(portal)/staff/layout.tsx role-guards to super_admin and admin only | VERIFIED | layout.tsx line 45: redirects to `/portal/dashboard` if role is not `super_admin` or `admin`; deactivated accounts redirected to `/login` |

**Score:** 15/15 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260612_staff_schema.sql` | ALTER TABLE + RLS admin write policies | VERIFIED | 57 lines; all ALTER columns and three CREATE POLICY blocks present |
| `lib/db/staff.ts` | getStaffList() typed query — profiles + auth email merged | VERIFIED | 68 lines; substantive implementation, not a stub |
| `app/(portal)/actions/staff.ts` | CRUD Server Actions for staff management | VERIFIED | 213 lines; 'use server' directive; five exported actions |
| `app/(portal)/staff/page.tsx` | Server Component — fetches staff list + passes to StaffClient | VERIFIED | 25 lines; Promise.all + export const dynamic = 'force-dynamic' |
| `app/(portal)/staff/StaffClient.tsx` | Client Component — full staff CRUD UI | VERIFIED | 753 lines; 'use client'; full CRUD with tabs, dialog, sheet, alert dialog |
| `app/(portal)/staff/layout.tsx` | Role guard — redirects non-admin roles to /dashboard | VERIFIED | 52 lines; getUser() + profile role check |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `actions/staff.ts createStaffAction` | `lib/supabase/admin.ts createAdminClient` | `import createAdminClient` | WIRED | Import line 8; used at line 63 |
| `actions/staff.ts` | `profiles table` | `supabase.from('profiles')` | WIRED | Lines 79, 119, 143, 200 |
| `staff/page.tsx` | `lib/db/staff.ts getStaffList` | `import getStaffList` | WIRED | Import line 5; called line 17 |
| `StaffClient.tsx` | `actions/staff.ts` | `import createStaffAction` | WIRED | Lines 18-23; all four actions + updateDoctorStaffLinkAction imported and called |
| `staff/layout.tsx` | `profiles table role column` | `getUser() + supabase.from('profiles').select('role')` | WIRED | Lines 22 and 28-32 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `StaffClient.tsx` | `initialStaff` | `getStaffList()` in page.tsx | Yes — DB query via profiles select + auth.admin.listUsers | FLOWING |
| `StaffClient.tsx` | `doctors` | `getDoctors()` in page.tsx | Yes — existing Phase 5 doctors DB utility | FLOWING |
| `actions/staff.ts updateDoctorStaffLinkAction` | `doctors.staff_user_id` | `supabase.from('doctors').update(...)` | Yes — real DB write | FLOWING |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| STAFF-01 | 06-01, 06-02 | Admin can add new staff member with name, role, email, phone, salary, join date | SATISFIED | createStaffAction + Add Staff Dialog with all required fields |
| STAFF-02 | 06-01, 06-02 | Admin can edit existing staff member details | SATISFIED | updateStaffAction + Edit Staff Sheet with full_name, role, phone, salary, join_date |
| STAFF-03 | 06-01, 06-02 | Admin can deactivate/remove a staff member | SATISFIED | toggleActiveAction (deactivate) + deleteStaffAction with AlertDialog confirmation |
| STAFF-04 | 06-02 | Admin can view and approve/reject pending account requests | SATISFIED | Pending tab shows is_active=false accounts; Activate/Delete buttons per row |
| STAFF-05 | 06-02 | Doctor profile fields editable and feed public site doctor listing | SATISFIED | Doctor Profile Select in Edit sheet; updateDoctorStaffLinkAction writes doctors.staff_user_id; public /doctors page reads from doctors table (Phase 5 dynamic) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| No debt markers (TBD/FIXME/XXX) found in phase files | — | — | — | — |

No stub returns, hardcoded empty arrays, or unresolved debt markers detected in any of the six phase files.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compile (self-reported) | `npx tsc --noEmit` | exit 0 per SUMMARY | SKIP — cannot re-run without dev environment |
| `/staff` route redirect (unauthenticated) | Static layout analysis | layout.tsx redirects on `!user` and non-admin roles | VERIFIED statically |

### Probe Execution

No probe scripts defined for this phase. Step 7c: SKIPPED (no `scripts/*/tests/probe-*.sh` files found for phase 6).

### Human Verification Required

#### 1. Migration Applied to Live Database

**Test:** Open Supabase Dashboard > Table Editor > profiles. Verify columns `full_name`, `phone`, `salary`, `join_date` exist. Open Authentication > Policies > profiles and verify three policies: "profiles: admin insert", "profiles: admin update", "profiles: admin delete".
**Expected:** All four columns present; three RLS policies listed.
**Why human:** SUMMARY.md explicitly documents that `supabase db push` was skipped because the CLI was not linked. The migration SQL is correct in the repo but its application to the live database cannot be verified statically.

#### 2. Add Staff End-to-End

**Test:** Log in as super_admin. Navigate to /staff. Click "Add Staff". Fill in full_name, email, a temp_password (8+ chars), role "Doctor". Submit.
**Expected:** No error toast. New staff row appears in the Pending tab. Supabase Auth shows a new user with that email. profiles table shows a new row with is_active=false.
**Why human:** createStaffAction calls auth.admin.createUser against the live Supabase project — cannot verify without a running instance.

#### 3. Activate / Reject Pending Account

**Test:** With a pending account in the Pending tab, click the Activate (UserCheck) button.
**Expected:** Success toast. The row moves to the Active tab. That user can now log into the portal.
**Why human:** Requires two browser sessions; portal layout is_active check behavior cannot be verified statically.

#### 4. Doctor Profile Linkage Updates Public Page

**Test:** Edit a doctor-role staff member. Select a doctor from the Doctor Profile dropdown. Save. Navigate to the public /doctors page.
**Expected:** The doctor record's staff_user_id is updated in the database. The public Doctors page still displays correctly (no regression from Phase 5).
**Why human:** Cross-page data-flow (portal write → public read) requires a live browser + DB to confirm.

---

## Gaps Summary

No automated gaps found. All 15 must-have truths are verified at code level. All five STAFF requirement IDs are satisfied by substantive, wired implementations.

The single outstanding concern is **migration application** (STAFF-01 through STAFF-05 all depend on the profiles schema extension). The SQL file is complete and correct, but the SUMMARY documents that `supabase db push` was skipped. If the migration has not been applied manually via the Supabase SQL editor, none of the staff CRUD operations will function at runtime. Human verification item 1 (above) must be confirmed before the portal can be used.

---

_Verified: 2026-06-12_
_Verifier: Claude (gsd-verifier)_
