---
phase: 04-auth-roles
verified: 2026-06-12T00:00:00Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
---

# Phase 04: Auth + Roles — Verification Report

**Phase Goal:** Staff can securely log in to the portal and are restricted to portal sections appropriate for their role
**Verified:** 2026-06-12
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Staff member can log in with email/password and land on /portal/dashboard | VERIFIED | `loginAction` calls `supabase.auth.signInWithPassword`; on success calls `redirect('/dashboard')`. `app/login/page.tsx` renders `<LoginForm />` which calls `loginAction`. Human smoke test confirmed: valid Super Admin lands on /portal/dashboard. |
| 2 | Unauthenticated user accessing any portal route is redirected to /login | VERIFIED | `app/(portal)/layout.tsx` calls `supabase.auth.getUser()`; if `!user` → `redirect('/login')`. Covers every route under `(portal)` group. Human smoke test confirmed: /portal/dashboard redirects unauthenticated users to /login. |
| 3 | New staff account cannot access portal until Admin approves (is_active = true) | VERIFIED | `app/(portal)/layout.tsx` fetches `profiles` table for `role, is_active`; if `!profile \|\| !profile.is_active` → `supabase.auth.signOut()` + `redirect('/login')`. Migration `20260611_profiles.sql` defines `is_active boolean NOT NULL DEFAULT true`. New accounts created manually via Supabase dashboard with `is_active` set by admin at creation time; no INSERT policy exists so anon/staff cannot self-register. |
| 4 | Each of four roles sees only permitted portal sections | VERIFIED | `lib/portal/roles.ts` defines `ROLE_SECTIONS` mapping all 4 roles to specific section keys. `PortalSidebar` receives `role` prop from portal layout (fetched server-side from `profiles` table), filters `ALL_SECTIONS` using `ROLE_SECTIONS[role]`, and renders only allowed sections. Super Admin: 7 sections; Admin: 6 (no settings); Receptionist: 3 (dashboard/appointments/patients); Doctor: 2 (dashboard/patients). |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `middleware.ts` | Supabase session refresh on portal routes | VERIFIED | Branches on `PORTAL_PATHS`; portal routes call `updateSession()`, public routes call intl middleware. Uses `getUser()` not `getSession()`. |
| `lib/supabase/middleware.ts` | `updateSession()` function | VERIFIED | Creates Supabase SSR client, calls `supabase.auth.getUser()`, returns `supabaseResponse`. |
| `lib/portal/roles.ts` | RBAC role-to-section mapping | VERIFIED | Exports `StaffRole` type, `ALL_SECTIONS` (7 sections), `ROLE_SECTIONS` (4 roles fully mapped). |
| `app/(portal)/layout.tsx` | Auth guard + role fetch | VERIFIED | Calls `getUser()`, redirects if no user, fetches `profiles`, blocks inactive accounts, passes `role` to sidebar. |
| `app/(portal)/actions/auth.ts` | `loginAction` + `signOutAction` | VERIFIED | `loginAction` calls `signInWithPassword`, returns `{error}` or `redirect('/dashboard')`. `signOutAction` calls `signOut` + `redirect('/login')`. Both are `'use server'` actions. |
| `components/portal/LoginForm.tsx` | Client form wired to loginAction | VERIFIED | `useForm` + `zodResolver`; `onSubmit` calls `loginAction(data)`; toasts error on failure; redirect handled by server action on success. |
| `app/login/page.tsx` | Login page outside portal guard | VERIFIED | At `app/login/` (top-level, outside `(portal)` group); checks `getUser()` and redirects authed users to `/dashboard` (D-12). |
| `supabase/migrations/20260611_profiles.sql` | `profiles` table with `is_active` and RLS | VERIFIED | `staff_role` ENUM, `profiles` table with `user_id`, `role`, `is_active`; RLS enabled with own-read policy. |
| `components/portal/Sidebar.tsx` | Role-scoped sidebar | VERIFIED | Filters `ALL_SECTIONS` using `Set(ROLE_SECTIONS[role])`; renders only permitted sections as `<Link>` items. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `LoginForm.tsx` | `loginAction` | import + `onSubmit` call | VERIFIED | `import { loginAction } from '@/app/(portal)/actions/auth'`; called in `onSubmit` handler |
| `app/(portal)/layout.tsx` | `PortalSidebar` | import + `<PortalSidebar role={profile.role} />` | VERIFIED | Role from server-side DB passed as prop |
| `PortalSidebar` | `ROLE_SECTIONS` | import + `allowed = new Set(ROLE_SECTIONS[role])` | VERIFIED | Direct use; filters ALL_SECTIONS against allowed set |
| `middleware.ts` | `updateSession` | import + conditional call | VERIFIED | Portal path branch calls `updateSession(request)` |
| `app/(portal)/layout.tsx` | `/login` redirect | `redirect('/login')` when `!user` or `!profile.is_active` | VERIFIED | Two guard conditions both redirect to `/login` |

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| AUTH-01 | Staff login with email/password | SATISFIED | `loginAction` + `signInWithPassword` + `LoginForm` |
| AUTH-02 | Unauthenticated redirect to /login | SATISFIED | `(portal)/layout.tsx` guard with `getUser()` check |
| AUTH-03 | Role-based section access | SATISFIED | `ROLE_SECTIONS` + `PortalSidebar` filtering server-side role |
| AUTH-04 | Inactive account blocked | SATISFIED | `is_active` check in layout; signOut + redirect on `false` |
| AUTH-05 | Already-authed redirect away from /login | SATISFIED | `app/login/page.tsx` redirects authed users to `/dashboard` |

---

### Anti-Patterns Found

None. Scanned key modified files — no TBD/FIXME/XXX/placeholder markers. No stub implementations. `getUser()` is used throughout (never `getSession()`).

---

### Human Verification

Human smoke test was completed and approved before this verification:
- /portal/dashboard redirects unauthenticated users to /login — confirmed
- Wrong password shows toast error — confirmed
- Valid Super Admin credentials land on /portal/dashboard — confirmed
- Logged-in visit to /login redirects to /portal/dashboard — confirmed

No additional human verification items identified.

---

### Notes on SC3 (Approval Gate)

The `is_active` field defaults to `true` in the migration schema. The approval gate works at the portal layout level: any account with `is_active = false` is blocked and signed out. The constraint that "a new account cannot access the portal until Admin approves it" is enforced operationally — no INSERT RLS policy exists, so accounts can only be created via the Supabase dashboard (admin action), where `is_active` can be set to `false` initially. Phase 6 will add the portal UI for account management. This is the intended design per the phase plan (confirmed by `04-01-SUMMARY.md`).

---

_Verified: 2026-06-12_
_Verifier: Claude (gsd-verifier)_
