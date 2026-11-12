---
phase: 4
phase_name: auth-roles
status: issues_found
review_depth: standard
files_reviewed: 10
files_reviewed_list:
  - middleware.ts
  - supabase/migrations/20260611_profiles.sql
  - lib/portal/roles.ts
  - app/(portal)/actions/auth.ts
  - components/portal/Sidebar.tsx
  - app/(portal)/layout.tsx
  - app/(portal)/dashboard/page.tsx
  - app/login/layout.tsx
  - app/login/page.tsx
  - components/portal/LoginForm.tsx
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
---

# Phase 4: Code Review Report

**Reviewed:** 2026-06-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

This phase implements the authentication and role-based access control backbone for the hospital portal. The approach is broadly sound: `getUser()` is used correctly in both the middleware helper and the layout guard, inactive accounts are signed out before redirect, and the sign-out button is inside a `<form>` (CSRF-safe). However, two critical gaps exist: (1) the middleware's `PORTAL_PATHS` list is missing `/media`, so the `/media` route group is not covered by Supabase session refresh and a doctor/receptionist who guesses the URL is not blocked at the middleware layer; (2) `loginAction` forwards the raw Supabase error message directly to the client, which differentiates "invalid credentials" from "email not found" and enables user enumeration. Four warnings cover the missing `media` server-side auth guard, the unthrottled login action (no brute-force protection), a missing `UPDATE` RLS policy that will block profile deactivation from the portal client, and the hidden sign-out button when the sidebar is collapsed.

---

## Critical Issues

### CR-01: `/media` missing from `PORTAL_PATHS` — session refresh and implicit protection bypass

**File:** `middleware.ts:19-29`

**Issue:** `PORTAL_PATHS` lists eight portal route prefixes but omits `/media`, which is a full portal section defined in `lib/portal/roles.ts` (line 22) and restricted to `super_admin` and `admin`. Any request to `/media` or `/media/*` bypasses `updateSession()` and is routed to `intlMiddleware` instead. This has two consequences:

1. The Supabase JWT cookie is never refreshed on `/media` requests, so a long session can silently expire mid-visit without the user being redirected.
2. If the portal layout RSC (`app/(portal)/layout.tsx`) also covers `/media` routes then the server-side guard still fires — but only because of the layout's own `getUser()` call. The middleware layer provides no defense in depth for this path, and any future middleware-level auth logic (rate limiting, IP allow-list) will silently skip `/media`.

**Fix:** Add `/media` to `PORTAL_PATHS`:
```ts
const PORTAL_PATHS = [
  '/login',
  '/dashboard',
  '/content',
  '/media',      // ← add this line
  '/staff',
  '/appointments',
  '/patients',
  '/payroll',
  '/analytics',
  '/settings',
];
```

---

### CR-02: `loginAction` leaks whether an email exists via raw Supabase error message

**File:** `app/(portal)/actions/auth.ts:27-29`

**Issue:** `error.message` is forwarded verbatim to the client:
```ts
if (error) {
  return { error: error.message };
}
```
Supabase Auth returns distinct messages such as `"Invalid login credentials"` vs `"Email not confirmed"` vs `"User not found"` depending on the failure mode. An attacker can enumerate valid staff email addresses by observing these different messages through repeated login attempts, narrowing the attack surface before attempting a credential-stuffing attack. For a hospital portal, staff email enumeration is a meaningful pre-attack step.

**Fix:** Return a single generic message for all auth failures regardless of the underlying error:
```ts
if (error) {
  return { error: 'Invalid email or password.' };
}
```
If there is a legitimate need to distinguish certain errors internally (e.g., logging), do so server-side only — never forward the raw `error.message` to the client.

---

## Warnings

### WR-01: No brute-force / rate-limit protection on `loginAction`

**File:** `app/(portal)/actions/auth.ts:16-32`

**Issue:** `loginAction` is a Next.js Server Action invoked via a plain POST. There is no IP-based rate limiting, account lockout, CAPTCHA, or any throttle mechanism. An attacker who obtains a staff email address (or guesses common patterns like `admin@atmaram.in`) can issue unlimited login attempts at the speed of the Next.js server. Supabase's built-in auth does not enforce lockout by default for self-hosted or Pro tier projects unless explicitly configured.

**Fix:** Either (a) enable Supabase Auth's built-in rate limiting in the project settings (Dashboard → Auth → Rate Limits), or (b) implement a server-side counter using an upstash/redis edge store or a Supabase `login_attempts` table keyed on email+IP and reject requests exceeding a threshold (e.g., 10 attempts per 15 minutes) before calling `signInWithPassword`. Option (a) is the zero-code path for this budget-constrained project.

---

### WR-02: Missing `UPDATE` RLS policy on `profiles` blocks deactivating accounts from portal client

**File:** `supabase/migrations/20260611_profiles.sql:16-20`

**Issue:** Only a `SELECT` policy exists. The comment correctly notes that Phase 6 `createStaffAction` will use the service role (which bypasses RLS). However, deactivating a staff member (`is_active = false`) is an admin operation that may also run via the service role — but any portal Server Action that does NOT use the service role client and instead uses the regular server client will receive a silent RLS denial (Supabase returns zero rows updated, not an error) when trying to `UPDATE profiles`. This silent failure mode is dangerous: an admin believes an account is deactivated when it is not.

**Fix:** Either (a) explicitly document in the migration that ALL `profiles` writes must use the service role client and add a lint/code-review gate to catch violations, or (b) add a restrictive UPDATE policy now:
```sql
CREATE POLICY "profiles: admin update"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.role IN ('super_admin', 'admin')
    )
  );
```
Option (a) is acceptable only if documented and enforced at code review; option (b) is safer.

---

### WR-03: Sign-out button inaccessible when sidebar is collapsed

**File:** `components/portal/Sidebar.tsx:82-91`

**Issue:** The sign-out `<form>` is wrapped in `{!collapsed && (...)}` (line 82). When the sidebar is collapsed to the icon-only 48px rail, the sign-out affordance is completely hidden with no tooltip fallback. The collapse toggle (line 94) remains visible, so a user can expand to sign out, but there is no visual indication this is required. A user who collapses the sidebar has no visible path to sign out without first knowing to expand it.

**Fix:** Render an icon-only sign-out button in collapsed state, matching the pattern used for nav links with tooltips:
```tsx
{collapsed ? (
  <Tooltip>
    <TooltipTrigger asChild>
      <form action={signOutAction}>
        <button type="submit" aria-label="Sign out" className="...icon button styles...">
          <LogOut className="h-4 w-4" />
        </button>
      </form>
    </TooltipTrigger>
    <TooltipContent side="right">Sign out</TooltipContent>
  </Tooltip>
) : (
  <form action={signOutAction}>
    <button type="submit" className="...full button styles...">Sign out</button>
  </form>
)}
```

---

### WR-04: `dashboard/page.tsx` silently swallows DB errors — no error distinction for authorization failures

**File:** `app/(portal)/dashboard/page.tsx:19-47`

**Issue:** All three Supabase queries are wrapped in bare `try/catch` blocks that swallow every error and fall back to empty data. If any query fails due to an RLS policy violation (e.g., a doctor hitting `appointment_requests` which they should not see), the dashboard silently renders zeros rather than surfacing the access error. This masks misconfigured RLS rather than alerting developers. Additionally, using `try/catch` on Supabase client calls is incorrect — the client never throws; errors are returned in the `error` property of the result. These catch blocks will never fire for RLS errors.

**Fix:** Check the `error` return value instead of using try/catch, and log/surface errors in development:
```ts
const { data, error } = await supabase
  .from('appointment_requests')
  .select('created_at')
  .gte('created_at', thirtyDaysAgo)

if (error) {
  console.error('[dashboard] appointment_requests fetch error:', error.message)
}
apptData = data ?? []
```
This also correctly catches RLS denials, which the current `try/catch` does not.

---

## Info

### IN-01: `lib/portal/roles.ts` comment states "all 8 sections" but `ALL_SECTIONS` defines 9

**File:** `lib/portal/roles.ts:37`

**Issue:** The JSDoc comment reads `super_admin — all 8 sections (dashboard + content + 6 others)` but `ALL_SECTIONS` has 9 entries (dashboard, content, media, staff, appointments, patients, payroll, analytics, settings), and `ROLE_SECTIONS.super_admin` also maps to all 9 keys. The comment is stale — likely written before `/media` was added.

**Fix:** Update the comment: `super_admin — all 9 sections`.

---

### IN-02: `loginAction` accepts a plain object, not `FormData` — deviates from Next.js Server Action convention

**File:** `app/(portal)/actions/auth.ts:16-18`

**Issue:** Server Actions that are called from `<form action={...}>` receive a `FormData` argument by default. This action instead accepts `{ email: string; password: string }` and is called programmatically from `LoginForm.tsx` via `form.handleSubmit(onSubmit)`. This is valid, but it means the action cannot be used directly as a `<form action>` attribute, which limits progressive-enhancement (the form will not work without JS). Given this is an internal portal where JS can be required, this is a low-severity concern, but it deviates from the pattern used by `signOutAction` (which uses `<form action={signOutAction}>` correctly).

**Fix:** For consistency and progressive enhancement, consider converting `loginAction` to accept `FormData`:
```ts
export async function loginAction(formData: FormData): Promise<{ error: string } | never> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  // validate with zod, then signInWithPassword...
}
```
This is optional for a portal-only tool where JS is guaranteed, but reduces the surface of inconsistency.

---

_Reviewed: 2026-06-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
