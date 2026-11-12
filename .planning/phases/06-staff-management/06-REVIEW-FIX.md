---
phase: 6
fixed_at: 2026-06-20T00:00:00Z
review_path: .planning/phases/06-staff-management/06-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 6: Code Review Fix Report

**Fixed at:** 2026-06-20T00:00:00Z
**Source review:** .planning/phases/06-staff-management/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 9 (4 Critical + 5 Warning)
- Fixed: 9
- Skipped: 0

## Fixed Issues

### CR-01: createStaffAction rollback is fire-and-forget

**Files modified:** `app/(portal)/actions/staff.ts`
**Applied fix:** Replaced session client (`createClient()`) with `adminClient` for profile insert (consistent with other admin writes, avoids JWT expiry race). Made rollback `await`-ed and checked: if `deleteUser` also fails, the compound error message includes the orphaned Auth user ID for manual cleanup.

### CR-02: deleteStaffAction wrong deletion order

**Files modified:** `app/(portal)/actions/staff.ts`
**Applied fix:** Reversed deletion order — Auth user is deleted first, profile row second. If Auth deletion fails, the function returns an error and the profile remains intact (no zombie logins). If profile deletion fails after Auth deletion, an error is thrown and a `console.error` logs the orphaned profile ID for manual DB cleanup.

### CR-03: updateDoctorStaffLinkAction silent zero-row update

**Files modified:** `app/(portal)/actions/staff.ts`
**Applied fix:** Added a `.select('id').single()` existence check on the `doctors` table before running the UPDATE. Returns `{ error: 'Doctor record not found' }` if the row does not exist, preventing silent no-ops and blind writes.

### CR-04: getStaffList() silently truncates at 1000 Auth users

**Files modified:** `lib/db/staff.ts`
**Applied fix:** Replaced single `listUsers({ perPage: 1000 })` call with a `while(true)` pagination loop that increments `page` and accumulates results into `allUsers` until a page returns fewer than 1000 records.

### WR-01: requireAdminRole missing is_active check

**Files modified:** `app/(portal)/actions/staff.ts`
**Applied fix:** Added `is_active` to the `select()` in `requireAdminRole` and included `!profile.is_active` in the guard condition. Also extended the return value to expose `callerProfileId` and `callerRole` so downstream actions can use them for ownership/escalation checks.

### WR-02: isRedirectError not re-thrown in action catch blocks

**Files modified:** `app/(portal)/actions/staff.ts`
**Applied fix:** Added `import { isRedirectError } from 'next/dist/client/components/redirect'` at the top. Added `if (isRedirectError(err)) throw err` as the first line in every action's catch block (`createStaffAction`, `updateStaffAction`, `toggleActiveAction`, `updateDoctorStaffLinkAction`, `deleteStaffAction`).

### WR-03: updateStaffAction no role escalation guard

**Files modified:** `app/(portal)/actions/staff.ts`
**Applied fix:** Added pre-update fetch of target profile's current role. Returns `{ error: 'Cannot modify a super_admin account' }` if caller is not `super_admin` but target is. Returns `{ error: 'Cannot promote to super_admin' }` if caller is not `super_admin` but `input.role` is `super_admin`.

### WR-04: toggleActiveAction no self-deactivation guard

**Files modified:** `app/(portal)/actions/staff.ts`
**Applied fix:** Added guard returning `{ error: 'Cannot deactivate your own account' }` when `id === callerProfileId`. Added guard preventing an `admin` from deactivating a `super_admin` account.

### WR-05: updateDoctorStaffLinkAction called with profile PK instead of Auth user_id

**Files modified:** `app/(portal)/staff/StaffClient.tsx`
**Applied fix:** Changed `updateDoctorStaffLinkAction` call from `editingStaff.id` to `editingStaff.user_id` as the `profileUserId` argument. Updated `availableDoctors(editingStaff.id)` call site to `availableDoctors(editingStaff.user_id)` and renamed its parameter from `staffProfileId` to `staffUserId` for clarity. Merged the duplicate `import { updateDoctorStaffLinkAction }` statement into the main import block (IN-03).

## Skipped Issues

None — all in-scope findings were applied.

---

_Fixed: 2026-06-20T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
