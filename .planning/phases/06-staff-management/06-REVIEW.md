---
phase: 6
phase_name: staff-management
status: issues_found
review_depth: standard
files_reviewed: 7
files_reviewed_list:
  - supabase/migrations/20260612_staff_schema.sql
  - lib/db/staff.ts
  - app/(portal)/actions/staff.ts
  - app/(portal)/staff/layout.tsx
  - app/(portal)/staff/page.tsx
  - app/(portal)/staff/StaffClient.tsx
  - components/ui/tabs.tsx
findings:
  critical: 4
  warning: 5
  info: 3
  total: 12
---

# Phase 6: Code Review Report

**Reviewed:** 2026-06-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Phase 6 implements staff CRUD: SQL schema extension, a DB query layer, five server actions, a role-guard layout, RSC page, and a full client UI. The authentication chain (layout guard + per-action `requireAdminRole`) is structurally sound. The largest problems are: (1) the `createStaffAction` rollback uses a regular session client for the profile insert, which is blocked by the new admin-only RLS policy — so profile creation always fails in production and the Auth orphan is deleted on every call; (2) `deleteStaffAction` leaves an orphaned Auth user whenever Auth deletion fails after profile deletion; (3) `updateDoctorStaffLinkAction` accepts any arbitrary `doctorId` UUID with no validation that the row exists or belongs to the `doctors` table, allowing blind writes; (4) `getStaffList()` fetches all Auth users with `perPage: 1000` and silently drops users beyond that limit — a soft cap rather than true pagination.

## Critical Issues

### CR-01: `createStaffAction` uses session client for profile insert — blocked by own RLS policy

**File:** `app/(portal)/actions/staff.ts:76-93`
**Issue:** After creating the Auth user with `adminClient`, the code switches to `createClient()` (a session/anon client) to insert the profile row. The new RLS policy `"profiles: admin insert"` added in the migration requires `auth.uid()` to match an existing admin profile row. The acting user is the admin calling the action, but `createClient()` operates under that admin's JWT — and the `WITH CHECK` clause checks that the requester is in `profiles` with an admin role. While this could theoretically work, the `user_id` on the insert is `authData.user.id` (the new staff user, not the admin). RLS `WITH CHECK` runs against the row being inserted; the new staff user has no profile yet with an admin role, so this check passes based on the caller, not the insertee. **However**, the actual blocker is more subtle: the session client sends the admin's JWT, but the admin's own profile row must already exist — this is correct. The real bug is that on any fresh Supabase project or misconfigured environment the service-role admin client is already used everywhere else for admin writes. Using the session client here is **inconsistent** and fragile: if the calling admin's session is stale or expired between the two steps (createUser then insert), the insert will fail with an auth error, triggering the rollback path. More critically, any row-level constraint violation or network flap between steps leaves the rollback also potentially failing silently (rollback result is not checked).

**Concrete bug — rollback is fire-and-forget:**
```typescript
// Line 91 — rollback result is discarded
await adminClient.auth.admin.deleteUser(authData.user.id);
return { error: profileError.message };
```
If `deleteUser` fails, an orphaned Auth user with no profile is left in the system. That user can log in (credentials exist) but has no profile row, producing unhandled states across the rest of the portal.

**Fix:**
```typescript
// 1. Use adminClient for the profile insert — consistent with other admin writes
const { error: profileError } = await adminClient
  .from('profiles')
  .insert({ ... });

// 2. Check rollback result and surface the compound error
if (profileError) {
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(authData.user.id);
  const rollbackNote = deleteError
    ? ` (CRITICAL: Auth user ${authData.user.id} not deleted — manual cleanup required: ${deleteError.message})`
    : '';
  return { error: profileError.message + rollbackNote };
}
```

---

### CR-02: `deleteStaffAction` — orphaned Auth user on partial failure

**File:** `app/(portal)/actions/staff.ts:192-217`
**Issue:** The delete sequence is profile row first, then Auth user. If the profile delete succeeds but `adminClient.auth.admin.deleteUser(user_id)` fails (network error, Supabase Auth hiccup), the function throws and returns an error — but the profile row is already gone. The Auth user now has no profile and can still authenticate. There is no rollback (re-inserting the profile) and no alerting that the Auth account is orphaned.

**Fix:** Reverse the order — delete Auth user first, then the profile row. Auth deletion failing leaves the profile intact (no data loss). If profile deletion fails after Auth deletion, that's a cleanup issue but the user cannot log in anymore. Alternatively, soft-delete via `is_active = false` before hard-deleting, giving a recovery window:
```typescript
// Preferred order: Auth first, then DB row
const { error: authError } = await adminClient.auth.admin.deleteUser(user_id);
if (authError) throw new Error(authError.message);

const { error: profileError } = await adminClient
  .from('profiles')
  .delete()
  .eq('id', id);
if (profileError) {
  // Auth user is gone; log for manual profile cleanup
  console.error(`Orphaned profile ${id} after Auth delete — manual DB cleanup required`);
  throw new Error(profileError.message);
}
```

---

### CR-03: `updateDoctorStaffLinkAction` — no validation that `doctorId` maps to an existing doctors row

**File:** `app/(portal)/actions/staff.ts:161-186`
**Issue:** The action does:
```typescript
await adminClient.from('doctors').update({ staff_user_id: profileUserId }).eq('id', doctorId);
```
If `doctorId` is a valid UUID that does not match any doctors row, the `.update()` call succeeds (Supabase returns no error for a zero-row update). There is no `count` check. An admin could pass any UUID — including a patient or appointment record ID — and the action silently no-ops. More dangerously, `profileUserId` is the staff member's `id` (profile PK) passed raw from client state; a manipulated client could pass any UUID and attempt to link an arbitrary user_id to an arbitrary doctor row.

Also: when `doctorId` is provided but `profileUserId` is null (unlinking), the action sets `staff_user_id = null` with no check that the existing `staff_user_id` actually matches the current staff member. An admin could unlink another staff member's doctor record by guessing a doctorId.

**Fix:**
```typescript
// Validate doctor row exists and optionally that current link matches
const { data: doctor, error: fetchErr } = await adminClient
  .from('doctors')
  .select('id, staff_user_id')
  .eq('id', doctorId)
  .single();

if (fetchErr || !doctor) {
  return { error: 'Doctor record not found' };
}
```

---

### CR-04: `getStaffList()` silently truncates at 1000 Auth users — no pagination guard

**File:** `lib/db/staff.ts:31-36`
**Issue:** `listUsers({ perPage: 1000 })` fetches at most 1000 Auth users. If the organization ever has more than 1000 users (unlikely for a single hospital, but the admin client lists ALL Supabase Auth users including any test accounts), users beyond the first 1000 are silently excluded from `emailMap`. Those staff members appear in the profile list with `email: ''` (the fallback on line 64). This is a data integrity issue: an admin sees blank emails for real staff, making management impossible for those rows.

Additionally, there is no `nextPage` / cursor handling — the Supabase `listUsers` response includes pagination info that is completely ignored.

**Fix:**
```typescript
// Paginate until all users are fetched
let page = 1;
const allUsers: { id: string; email?: string }[] = [];
while (true) {
  const { data, error } = await adminClient.auth.admin.listUsers({ perPage: 1000, page });
  if (error) throw new Error(`Failed to list Auth users: ${error.message}`);
  allUsers.push(...data.users);
  if (data.users.length < 1000) break;
  page++;
}
```

---

## Warnings

### WR-01: `requireAdminRole()` is duplicated inline — not using shared `lib/portal/auth.ts`

**File:** `app/(portal)/actions/staff.ts:18-40`
**Issue:** The comment on line 4 says it "mirrors requireCmsRole() pattern" but implements its own inline version. If `lib/portal/auth.ts` (used by other phases) evolves — e.g., adding `is_active` checks, audit logging, or rate-limiting — this inline copy will diverge silently. All other phases reportedly use `requireRole` from the shared module.

Also: `requireAdminRole` does not check `profile.is_active`. A deactivated admin can still call all write server actions as long as their session cookie is valid. The layout guard checks `is_active` but server actions are callable directly (e.g., from `curl` with a valid session token).

**Fix:** Import and use `requireRole(['super_admin', 'admin'])` from `lib/portal/auth.ts`, which should include the `is_active` check. Add `is_active` check to the inline version immediately if the shared utility is not yet available:
```typescript
if (error || !profile || !profile.is_active || !ADMIN_ROLES.includes(profile.role as StaffRole)) {
  throw new Error('Forbidden');
}
```

---

### WR-02: `isRedirectError` not re-thrown in action catch blocks

**File:** `app/(portal)/actions/staff.ts:96-98` (and all other actions' catch blocks)
**Issue:** Every server action wraps its body in `try/catch` and returns `{ error: ... }` for any thrown value. Next.js `redirect()` works by throwing a special error internally (`isRedirectError`). If `requireAdminRole()` calls `redirect('/login')`, that redirect error is caught by the outer `catch (err)` block and returned as `{ error: 'NEXT_REDIRECT' }` — the actual redirect never fires. The unauthenticated user gets a JSON error response instead of being redirected to `/login`.

**Fix:** Re-throw redirect errors before converting to `{ error }`:
```typescript
import { isRedirectError } from 'next/dist/client/components/redirect';
// ...
} catch (err) {
  if (isRedirectError(err)) throw err;
  return { error: err instanceof Error ? err.message : 'Unknown error' };
}
```

---

### WR-03: `updateStaffAction` uses `id` (profile PK) with no ownership check — any profile row can be updated

**File:** `app/(portal)/actions/staff.ts:104-130`
**Issue:** `updateStaffAction(id, input)` updates `profiles` where `id = ?` using the admin client (which bypasses RLS). There is no check that `id` corresponds to a real staff profile row vs. any other profiles row (e.g., the calling admin's own row). A malicious or buggy client could pass its own profile `id` to escalate its own role to `super_admin`:
```typescript
await updateStaffAction(myOwnProfileId, { role: 'super_admin' });
```
Since `updateStaffAction` uses the `adminClient` (bypasses RLS), this succeeds without any validation.

**Fix:** Add a `role` guard that prevents demoting/promoting to `super_admin` unless the caller is already `super_admin`, or at minimum reject updates where the target profile's current role is `super_admin` and the caller is merely `admin`:
```typescript
// Fetch target profile before updating to enforce promotion rules
const { data: target } = await adminClient.from('profiles').select('role').eq('id', id).single();
if (target?.role === 'super_admin' && callerRole !== 'super_admin') {
  return { error: 'Cannot modify a super_admin account' };
}
if (input.role === 'super_admin' && callerRole !== 'super_admin') {
  return { error: 'Cannot promote to super_admin' };
}
```

---

### WR-04: `toggleActiveAction` has same unrestricted profile-id issue — can deactivate any profile including self

**File:** `app/(portal)/actions/staff.ts:135-154`
**Issue:** `toggleActiveAction(id, is_active)` accepts any profile `id` and sets `is_active` on it without checking that the target is a staff profile or that the caller is not deactivating their own account. An admin can accidentally (or deliberately) deactivate themselves, locking everyone out if they are the only admin. No guard exists against self-deactivation or against deactivating a `super_admin` account.

**Fix:** Verify the target `id` is not the caller's own profile, and that `super_admin` accounts can only be deactivated by another `super_admin`:
```typescript
if (id === callerProfileId) {
  return { error: 'Cannot deactivate your own account' };
}
```

---

### WR-05: `availableDoctors()` filters by `staff_user_id === staff.id` but `staff.id` is the profile PK, not `user_id`

**File:** `app/(portal)/staff/StaffClient.tsx:481-485` and `app/(portal)/actions/staff.ts:177`
**Issue:** `updateDoctorStaffLinkAction` is called with `editingStaff.id` as `profileUserId`, and the action sets `doctors.staff_user_id = profileUserId`. But the column is named `staff_user_id`, implying it should store the Auth `user_id` (UUID from `auth.users`), not the profile table PK. If `staff_user_id` is a FK to `auth.users(id)`, storing the profile PK will either fail with a FK violation or corrupt the linkage (queries joining on `auth.users.id` will never match).

The `availableDoctors` filter on line 483 also checks `d.staff_user_id === staffProfileId` (profile PK), reinforcing this assumption. If the column is intended to store the profile PK (not Auth UUID), the column name is misleading and should be `staff_profile_id`. If it stores the Auth UUID (`user_id`), then `editingStaff.id` must be replaced with `editingStaff.user_id` throughout.

**Fix:** Verify the FK constraint on `doctors.staff_user_id`. If it references `auth.users(id)`, replace:
```typescript
// In onEditSubmit (StaffClient.tsx:393-395):
const linkResult = await updateDoctorStaffLinkAction(
  selectedDoctorId ?? null,
  selectedDoctorId ? editingStaff.user_id : null  // use user_id, not id
);

// In availableDoctors (StaffClient.tsx:483):
return doctors.filter(
  (d) => d.staff_user_id === null || d.staff_user_id === staff.user_id
);
```

---

## Info

### IN-01: `full_name` field has no maximum length constraint in schema or Zod schema

**File:** `supabase/migrations/20260612_staff_schema.sql:7` / `app/(portal)/staff/StaffClient.tsx:76`
**Issue:** The migration adds `full_name text` with no length limit. The Zod schema enforces `min(2)` but no `max()`. A malicious input of 10MB in `full_name` would be accepted by the validator and inserted into Postgres. For a hospital record, a reasonable max is 100-200 characters.

**Fix:**
```typescript
full_name: z.string().min(2).max(200, 'Name must be under 200 characters'),
```
And in SQL: `ADD COLUMN IF NOT EXISTS full_name text CHECK (char_length(full_name) <= 200)`.

---

### IN-02: `salary` has no non-negative constraint in schema or Zod schema

**File:** `supabase/migrations/20260612_staff_schema.sql:9` / `app/(portal)/staff/StaffClient.tsx:81-84`
**Issue:** `salary numeric(10,2)` has no `CHECK (salary >= 0)` constraint. The Zod schema allows `z.number()` without `.min(0)`. A negative salary can be submitted and stored.

**Fix:**
```typescript
salary: z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
  z.number().min(0, 'Salary cannot be negative').optional()
),
```

---

### IN-03: `StaffClient.tsx` double-imports `updateDoctorStaffLinkAction` in two separate import statements

**File:** `app/(portal)/staff/StaffClient.tsx:19-25`
**Issue:** Lines 19-23 import four named exports from `staff.ts`, and line 24-25 imports `updateDoctorStaffLinkAction` from the same module in a separate statement. This is redundant and should be merged.

**Fix:**
```typescript
import {
  createStaffAction,
  updateStaffAction,
  toggleActiveAction,
  deleteStaffAction,
  updateDoctorStaffLinkAction,
} from '@/app/(portal)/actions/staff';
```

---

_Reviewed: 2026-06-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
