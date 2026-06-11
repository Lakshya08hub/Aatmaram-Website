---
phase: 04-auth-roles
plan: "01"
subsystem: auth
tags: [supabase-auth, middleware, rbac, server-actions, profiles]
dependency_graph:
  requires: []
  provides: [middleware.ts, profiles-migration, roles-config, auth-server-actions]
  affects: [app/(portal)/layout.tsx, app/(portal)/login/page.tsx]
tech_stack:
  added: []
  patterns: [branching-middleware, server-action-auth, profiles-table-rbac, rls-own-read]
key_files:
  created:
    - middleware.ts
    - supabase/migrations/20260611_profiles.sql
    - lib/portal/roles.ts
    - app/(portal)/actions/auth.ts
  modified: []
  deleted:
    - proxy.ts
decisions:
  - "D-09 implemented: single middleware.ts with pathname-branch — portal paths to updateSession(), public paths to next-intl"
  - "proxy.ts removed — Next.js only auto-loads middleware.ts; leaving it was dead code"
  - "loginAction accepts plain object {email, password} instead of FormData — cleaner typing for Client Component caller"
  - "PORTAL_PATHS list includes /login so updateSession() refreshes cookies for already-authenticated users at the login page"
metrics:
  duration_minutes: 12
  completed_date: "2026-06-11"
  tasks_completed: 2
  tasks_total: 3
  files_changed: 4
---

# Phase 04 Plan 01: Auth Foundation Summary

**One-liner:** Branching Supabase+next-intl middleware, profiles table with RLS own-read, 4-role RBAC config, and loginAction/signOutAction Server Actions — the auth contracts for all downstream portal plans.

## What Was Built

### Task 1: profiles migration + role config (602b5fc)

- `supabase/migrations/20260611_profiles.sql` — `staff_role` ENUM (`super_admin`, `admin`, `doctor`, `receptionist`); `profiles` table with `(id, user_id, role, is_active, created_at)`; RLS enabled; SELECT policy `USING (auth.uid() = user_id)`. No INSERT/UPDATE policy — accounts created via Supabase dashboard in Phase 4 (Phase 6 adds portal UI).
- `lib/portal/roles.ts` — exports `StaffRole` union type, `ALL_SECTIONS` ordered array of `{key, label, href}` for all 7 portal sections, and `ROLE_SECTIONS: Record<StaffRole, string[]>` with exact D-07 mapping.

### Task 2: branching middleware + auth Server Actions (ac0289f)

- `middleware.ts` (new, replaces `proxy.ts`) — `PORTAL_PATHS` list drives a pathname branch: portal routes call `updateSession()` (T-04-01 mitigation: `getUser()` re-validates JWT with Auth server); all other requests pass to next-intl's `createMiddleware`. Matcher excludes `_next`, `_vercel`, and static file paths.
- `proxy.ts` deleted — Next.js only auto-loads `middleware.ts`; the old file was dead code that silently left portal routes with no session management.
- `app/(portal)/actions/auth.ts` — `loginAction({email, password})`: calls `signInWithPassword`, returns `{error}` on failure, `redirect('/dashboard')` on success. `signOutAction()`: signs out + `redirect('/login')`.

### Task 3: Supabase dashboard setup (checkpoint — blocking-human)

Awaiting human action to apply migration and seed initial Super Admin account. See checkpoint below.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

**One minor implementation choice:** `loginAction` accepts `{ email: string; password: string }` (plain typed object) rather than `FormData`. The plan spec said `formData: { email: string; password: string }` and the pattern in RESEARCH.md Pattern 3 used `FormData.get()`. The plan's own interface definition used a typed object, so the typed object form was used — it is cleaner for the Client Component caller and matches the plan spec exactly.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|-----------|
| T-04-01 | `updateSession()` uses `getUser()` — re-validates JWT with Auth server on every portal request |
| T-04-02 | Auth via Supabase `signInWithPassword` — no custom credential logic |
| T-04-06 | RLS SELECT policy `USING (auth.uid() = user_id)` — anon key cannot read other users' role rows |
| T-04-07 | Role stored in `profiles` table (server-side DB), not JWT claims |

## Known Stubs

None in the files created by this plan.

## Threat Flags

None — no new network endpoints or auth paths beyond those in the plan's threat model.

## Checkpoint: Human Action Required

**Type:** checkpoint:human-action (gate=blocking)

The `supabase/migrations/20260611_profiles.sql` migration must be applied in the Supabase dashboard and an initial Super Admin account must be created before Phase 4 login can be verified end-to-end.

**Steps:**
1. Supabase Dashboard → SQL Editor → paste `supabase/migrations/20260611_profiles.sql` → Run. Confirm "Success."
2. Table Editor → confirm `profiles` table exists with columns: `id`, `user_id`, `role`, `is_active`, `created_at`.
3. Authentication → Users → Add user → enter email + temporary password → Create. Copy the UUID.
4. Table Editor → profiles → Insert row: `user_id = <UUID>`, `role = super_admin`, `is_active = true`.
5. (Optional for AUTH-05 smoke tests) repeat steps 3-4 for `admin`, `doctor`, `receptionist` test accounts.

**Resume signal:** Reply "approved" once the profiles table exists and Super Admin profile row is created.

## Self-Check: PASSED

- `middleware.ts` exists: confirmed (ac0289f)
- `proxy.ts` deleted: confirmed (ac0289f diff shows `delete mode 100644 proxy.ts`)
- `supabase/migrations/20260611_profiles.sql` exists: confirmed (602b5fc)
- `lib/portal/roles.ts` exists: confirmed (602b5fc)
- `app/(portal)/actions/auth.ts` exists: confirmed (ac0289f)
- `tsc --noEmit` passes: confirmed (no output = clean)
- Commits 602b5fc, ac0289f both in git log: confirmed
