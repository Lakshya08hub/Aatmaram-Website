# Phase 4: Auth + Roles - Research

**Researched:** 2026-06-11
**Domain:** Supabase Auth SSR + Next.js App Router middleware + RBAC
**Confidence:** HIGH

## Summary

Phase 4 wires staff authentication into the portal using the Supabase SSR infrastructure already built in Phases 1-3. All three Supabase client files (`lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`) are present and use the correct `@supabase/ssr` patterns. No new auth packages are needed.

The primary work is: (1) extending `middleware.ts` to run `updateSession()` for portal routes while leaving next-intl handling for `[locale]/*` public routes; (2) creating a `profiles` table with `(id, user_id, role, is_active)` columns and appropriate RLS; (3) building the login form using existing shadcn/ui components; (4) converting the portal layout stub into a real auth-guarded layout with a role-scoped sidebar; and (5) replacing stub dashboard/login pages with real implementations.

The key architectural insight for this stack is that middleware must call `updateSession()` (which calls `getUser()`, not `getSession()`) on every portal request to keep the JWT refreshed in cookies — without this, sessions silently expire. Role lookup from the `profiles` table happens in Server Components after the middleware confirms a valid session, not in the middleware itself (to avoid cold-start latency on edge).

**Primary recommendation:** Extend middleware.ts with a two-branch matcher, create the profiles table with RLS via Supabase migration, implement login via `supabase.auth.signInWithPassword()` in a Server Action, and guard the portal layout with an async server component that reads the user + profile in one render.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Roles stored in a `profiles` table in Postgres — `(id, user_id, role, is_active)` — joined to `auth.users` on `user_id`. NOT stored in Supabase `user_metadata` or `app_metadata`.
- **D-02:** Phase 4 creates the minimal auth-only columns. Phase 6 adds name, phone, salary, join_date, etc. via ALTER TABLE.
- **D-03:** Admin creates all staff accounts directly from the portal — no self-service signup.
- **D-04:** Admin sets an initial temporary password when creating the account. Staff logs in and changes it.
- **D-05:** `is_active` flag replaces the AUTH-03 approval concept. A created account is immediately active. Admin can deactivate later (Phase 6).
- **D-06:** Hierarchical access — higher roles inherit all sections of lower roles.
- **D-07:** Role → sections mapping:
  - Super Admin: Dashboard, Staff, Appointments, Patients, Payroll, Analytics, Settings
  - Admin: Dashboard, Staff, Appointments, Patients, Payroll, Analytics
  - Receptionist: Dashboard, Appointments, Patients
  - Doctor: Dashboard, Patients (own patients only — enforced in Phase 8)
- **D-08:** All non-dashboard sections are stubs in Phase 4. Sidebar items link to placeholder pages.
- **D-09:** Single `middleware.ts` with split matchers — next-intl covers `/[locale]/*`, Supabase auth check covers `/dashboard`, `/login`, and future portal routes.
- **D-10:** After successful login, all roles land on `/dashboard`.
- **D-11:** Unauthenticated access to any portal route → redirect to `/login`.
- **D-12:** Already-authenticated user visiting `/login` → redirect to `/dashboard`.

### Claude's Discretion
- Sidebar hide vs. lock for unauthorized sections — hide is simpler and cleaner (chosen)
- Exact shadcn/ui component composition for login form and sidebar

### Deferred Ideas (OUT OF SCOPE)
- Password reset / forgot password UI
- Email invite / magic link flow
- Portal-side "Create Staff Account" form (Phase 6)
- Doctor-scoped patient filtering (Phase 8)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Staff can log in to portal with email and password via Supabase Auth | `signInWithPassword()` in Server Action; existing `lib/supabase/client.ts` handles browser-side call |
| AUTH-02 | Four roles exist: Super Admin, Admin, Doctor, Receptionist | `profiles.role` enum column; seeded via Supabase dashboard for initial Super Admin account |
| AUTH-03 | New staff account requires Admin approval before access | Satisfied by D-05: `is_active` flag + admin-creates-only flow; no approval queue needed |
| AUTH-04 | Portal routes protected — unauthenticated users redirected to login | Middleware `updateSession()` + server component guard in portal layout |
| AUTH-05 | Role-based middleware restricts portal sections by role | Role read in portal layout Server Component; sidebar rendered conditionally by role |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Session refresh (JWT keep-alive) | Next.js Middleware | — | Must run on every request before any component renders; `updateSession()` in `lib/supabase/middleware.ts` already does this |
| Auth guard (redirect unauthed) | Portal Layout (Server Component) | Middleware | Layout reads `getUser()` and redirects; middleware ensures token is fresh |
| Role fetch | Portal Layout (Server Component) | — | DB query; not in middleware (edge cold-start risk); runs once per layout render |
| Login form submission | Server Action (or Client Component + browser client) | — | `signInWithPassword()` can be called from either; Server Action keeps credentials off the client |
| Sidebar role-scoping | Portal Layout (Server Component) | — | Role is already in scope from profile fetch; pass as prop to sidebar |
| Account creation (Phase 4) | Supabase Dashboard (manual) | — | Portal UI for this is Phase 6 |
| Password change on first login | Client Component | — | `supabase.auth.updateUser()` from browser; deferred to polish |

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | ^0.12.0 | Cookie-based session management for Next.js SSR | Official Supabase SSR package; already wired in all 3 client files [VERIFIED: package.json] |
| `@supabase/supabase-js` | ^2.108.1 | Supabase client SDK | Core SDK underlying `@supabase/ssr` [VERIFIED: package.json] |
| `next` | 16.2.9 | App Router, Server Components, Server Actions, middleware | Project constraint [VERIFIED: package.json] |
| `react-hook-form` | ^7.78.0 | Login form state management | Already installed; pairs with zod for validation [VERIFIED: package.json] |
| `zod` | ^4.4.3 | Login form schema validation | Already installed [VERIFIED: package.json] |
| `@hookform/resolvers` | ^5.4.0 | Connects zod to react-hook-form | Already installed [VERIFIED: package.json] |

### Supporting shadcn/ui components (all already installed)
| Component | File | Purpose |
|-----------|------|---------|
| `Input` | `components/ui/input.tsx` | Email/password fields |
| `Button` | `components/ui/button.tsx` | Submit button |
| `Label` | `components/ui/label.tsx` | Field labels |
| `Card` | `components/ui/card.tsx` | Login form container |
| `Form` | `components/ui/form.tsx` | react-hook-form integration |
| `Sonner` | `components/ui/sonner.tsx` | Toast for login errors |

**No new packages needed for this phase.** All dependencies are present.

---

## Package Legitimacy Audit

No new packages are installed in this phase. All dependencies were installed in earlier phases and are present in `package.json`.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Browser Request → /portal/* or /dashboard or /login
        │
        ▼
middleware.ts
  ├── matcher: [locale]/* → next-intl createMiddleware (public site, unchanged)
  └── matcher: /dashboard, /login, /portal/* → updateSession() from lib/supabase/middleware.ts
              │   (refreshes JWT cookie, calls getUser() against Supabase Auth server)
              ▼
        NextResponse passes to App Router
              │
              ▼
app/(portal)/layout.tsx  [async Server Component]
  ├── createClient() → supabase.auth.getUser()
  ├── if no user → redirect('/login')
  ├── query profiles table WHERE user_id = user.id
  ├── if profile.is_active === false → redirect('/login?error=inactive')
  └── render <PortalSidebar role={profile.role} /> + {children}
              │
              ▼
        Role-scoped page (dashboard, stub sections)
```

**Login flow:**
```
/login page (Client Component with Server Action)
  User submits email+password
        │
        ▼
  Server Action: supabase.auth.signInWithPassword({ email, password })
  ├── error → return error message to form
  └── success → redirect('/dashboard')
```

### Recommended Project Structure
```
app/
├── (portal)/
│   ├── layout.tsx          # Auth guard + sidebar — REPLACE stub
│   ├── login/
│   │   └── page.tsx        # Login form — REPLACE stub
│   ├── dashboard/
│   │   └── page.tsx        # Role-aware dashboard — REPLACE stub
│   ├── staff/
│   │   └── page.tsx        # Stub: "Coming in Phase 6"
│   ├── appointments/
│   │   └── page.tsx        # Stub: "Coming in Phase 7"
│   ├── patients/
│   │   └── page.tsx        # Stub: "Coming in Phase 8"
│   ├── payroll/
│   │   └── page.tsx        # Stub: "Coming in Phase 9"
│   ├── analytics/
│   │   └── page.tsx        # Stub: "Coming in Phase 10"
│   └── settings/
│       └── page.tsx        # Stub: "Coming in Phase X"
├── [locale]/               # Public site — unchanged
│   └── ...
middleware.ts               # EXTEND: chain next-intl + Supabase updateSession
lib/
└── supabase/
    ├── client.ts           # Unchanged
    ├── server.ts           # Unchanged
    └── middleware.ts       # Unchanged
components/
└── portal/
    └── Sidebar.tsx         # New: role-scoped nav
supabase/
└── migrations/
    └── 20260611_profiles.sql  # New: profiles table + RLS
```

### Pattern 1: Middleware Chaining (next-intl + Supabase)

**What:** Two-branch middleware — next-intl handles public `[locale]/*` routes; Supabase `updateSession()` handles portal routes.

**When to use:** Any Next.js app combining i18n routing with authenticated sub-app.

**Critical constraint:** `middleware.ts` must be a single file. next-intl's `createMiddleware` returns a response; Supabase's `updateSession()` also needs to return a response with updated cookies. The safe pattern is to check the pathname and branch.

```typescript
// Source: Supabase SSR docs + next-intl docs pattern
// middleware.ts
import createIntlMiddleware from 'next-intl/middleware';
import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

const PORTAL_PATHS = ['/login', '/dashboard', '/staff', '/appointments', '/patients', '/payroll', '/analytics', '/settings'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Portal routes: run Supabase session refresh
  if (PORTAL_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return await updateSession(request);
  }

  // Public site: next-intl handles locale routing
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // next-intl: match all except Next.js internals and static files
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
};
```

**Note:** The current `updateSession()` in `lib/supabase/middleware.ts` only refreshes the session — it does NOT redirect unauthenticated users. That redirect logic belongs in the portal layout Server Component (D-09 decision). This separation is intentional: middleware runs on edge with no DB access; redirect logic runs in the layout with full server context.

### Pattern 2: Portal Layout Auth Guard

```typescript
// Source: Supabase SSR server-side Next.js guide
// app/(portal)/layout.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <html lang="en">
      <body>
        <PortalSidebar role={profile.role} />
        <main>{children}</main>
      </body>
    </html>
  );
}
```

### Pattern 3: Login with Server Action

```typescript
// app/(portal)/login/page.tsx — Client Component calling Server Action
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/dashboard');
}
```

**Alternative:** `signInWithPassword()` can also be called from the browser client in a Client Component — this works fine for this use case since credentials are sent to Supabase directly, not through the server. Either approach is valid; Server Action is slightly cleaner (no state management for loading/error needed in the component).

### Pattern 4: profiles Table + RLS

```sql
-- supabase/migrations/20260611_profiles.sql
-- Phase 4: minimal auth-only columns. Phase 6 adds name/phone/salary/join_date.

CREATE TYPE staff_role AS ENUM ('super_admin', 'admin', 'doctor', 'receptionist');

CREATE TABLE profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        staff_role NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS: staff can only read their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: own read"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (used in Phase 6 admin actions) bypasses RLS automatically.
-- No INSERT/UPDATE policy needed in Phase 4 — accounts created via Supabase dashboard.
```

### Pattern 5: Sidebar Role Scoping

```typescript
// components/portal/Sidebar.tsx
type StaffRole = 'super_admin' | 'admin' | 'doctor' | 'receptionist';

const ROLE_SECTIONS: Record<StaffRole, string[]> = {
  super_admin: ['dashboard', 'staff', 'appointments', 'patients', 'payroll', 'analytics', 'settings'],
  admin:       ['dashboard', 'staff', 'appointments', 'patients', 'payroll', 'analytics'],
  receptionist:['dashboard', 'appointments', 'patients'],
  doctor:      ['dashboard', 'patients'],
};

export function PortalSidebar({ role }: { role: StaffRole }) {
  const sections = ROLE_SECTIONS[role];
  // render only sections the role can see
}
```

### Anti-Patterns to Avoid

- **Using `getSession()` instead of `getUser()`:** `getSession()` reads from the cookie without re-validating with the Auth server. A tampered or expired token passes the check. Always use `getUser()` for auth guards. `[VERIFIED: Supabase SSR docs comment in existing lib/supabase/middleware.ts]`
- **Storing role in JWT app_metadata:** D-01 explicitly decided against this. JWT claims require a Supabase function + re-login to update; a `profiles` table update is immediate.
- **Putting redirect logic in middleware:** Middleware runs on the edge runtime with no DB access. Role checks require a DB query (`profiles`). Keep redirects in the layout Server Component.
- **Putting auth guard in page.tsx instead of layout.tsx:** Every page would duplicate the guard. The layout runs once and wraps all portal routes.
- **Wrapping `(portal)` layout in `<html><body>` that conflicts with root layout:** The portal route group's layout.tsx is the root layout for portal routes (it replaces the app root layout for those routes). It must include `<html>` and `<body>` tags — the current stub already does this correctly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session cookie management | Custom cookie read/write for JWT | `@supabase/ssr` `createServerClient` with cookie adapter | Token refresh, SameSite, HttpOnly, expiry all handled |
| Password hashing | bcrypt implementation | Supabase Auth | Supabase handles hashing, salting, secure comparison |
| CSRF protection on login | Custom CSRF token | Next.js Server Actions (built-in CSRF) or Supabase Auth | Server Actions include origin checks automatically |
| Role enforcement per route | Middleware DB query per request | Layout Server Component guard + RLS | Edge middleware has no DB; layout guard + RLS is the correct pattern |

---

## Common Pitfalls

### Pitfall 1: Middleware Matcher Too Broad
**What goes wrong:** If the middleware matcher catches `_next/static`, `_next/image`, or favicon routes, those requests hit `updateSession()` unnecessarily — wasting resources and sometimes causing auth errors.
**Why it happens:** Catch-all matchers like `'/(.*)'` are too greedy.
**How to avoid:** Use the exclusion pattern `'/((?!_next|_vercel|.*\\..*).*)'` as the matcher. Static files are excluded by the `.*\\..*` pattern (any path with a file extension).
**Warning signs:** Favicon or static assets returning 401/redirect responses.

### Pitfall 2: Login Redirect Loop
**What goes wrong:** `/login` is protected by the same auth guard as other portal routes → unauthenticated user → redirected to `/login` → infinite loop.
**Why it happens:** Auth guard in layout.tsx applies to all routes inside `(portal)/`, including `/login/page.tsx`.
**How to avoid:** `/login` must NOT be inside the guarded layout, OR the layout must explicitly skip the redirect check for the `/login` path. Cleanest solution: move login outside the guarded layout, or check `pathname !== '/login'` before redirecting. Alternatively, keep `/login` outside `(portal)` group entirely.
**Warning signs:** Browser shows "too many redirects" on `/login`.

### Pitfall 3: profile Not Found for Valid User
**What goes wrong:** `supabase.auth.getUser()` returns a valid user, but `profiles` select returns null — causing the layout to sign out and redirect even though the user is authenticated.
**Why it happens:** Profile row was not created when the account was created in the Supabase dashboard.
**How to avoid:** Document the account creation SOP: after creating auth user in Supabase dashboard, manually insert the profile row. In Phase 6, the portal UI will automate this via `supabase.auth.admin.createUser()` + profile insert in one operation.
**Warning signs:** Admin can log in but immediately gets kicked out to login page.

### Pitfall 4: RLS Blocking Profile Read
**What goes wrong:** Layout Server Component calls `createClient()` (uses anon key) → RLS policy requires `auth.uid() = user_id` → if session is stale or not set before the component runs, RLS blocks the read.
**Why it happens:** The Server Component runs after middleware has updated the cookie, but the `createClient()` call must pick up the refreshed cookie from the request.
**How to avoid:** Use `createClient()` from `lib/supabase/server.ts` (which reads from `cookies()`) — this is already the correct pattern. Middleware runs first and writes the refreshed cookie; the server component reads it via `cookies()`.
**Warning signs:** Profile query returns null for a logged-in user; check Supabase RLS logs.

### Pitfall 5: next-intl Middleware Interference
**What goes wrong:** next-intl's `createMiddleware` runs on portal routes and tries to prepend a locale prefix (e.g., redirecting `/dashboard` to `/en/dashboard`), breaking the portal.
**Why it happens:** Overly broad matcher passes portal routes to next-intl middleware.
**How to avoid:** Branch by pathname in middleware BEFORE calling `intlMiddleware`. Portal paths must never reach `intlMiddleware`.
**Warning signs:** Portal routes redirect to `/en/dashboard` or `/hi/dashboard`.

---

## Runtime State Inventory

Step 2.5 SKIPPED — this is a greenfield feature phase, not a rename/refactor/migration phase.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js dev server | Confirmed (project running) | 24.x | — |
| @supabase/ssr | Session management | ✓ | ^0.12.0 | — |
| Supabase project (hosted) | Auth + DB | Must be configured | — | Cannot run without; check NEXT_PUBLIC_SUPABASE_URL |
| shadcn/ui components | Login form | ✓ | Input, Button, Card, Form, Label, Sonner all present | — |

**Missing dependencies with no fallback:**
- Supabase project must be live with Auth enabled and email/password provider turned on. This is infrastructure setup (not code) — verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in `.env.local` before implementing.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test config found in repo |
| Config file | None — Wave 0 gap |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| AUTH-01 | Staff logs in with valid credentials | Manual smoke test | Login form + Supabase dashboard account |
| AUTH-02 | Four roles exist in DB | Manual verify | INSERT profiles rows; check enum values accepted |
| AUTH-03 | is_active=false account cannot access portal | Manual smoke test | Create account, set is_active=false, attempt login |
| AUTH-04 | Unauthenticated /dashboard → redirects to /login | Manual smoke test | Open incognito, navigate to /dashboard |
| AUTH-05 | Role determines visible sidebar sections | Manual smoke test | Log in as each role, confirm sidebar items |

### Wave 0 Gaps
- No automated test framework configured in this project. All validation is manual smoke-test for Phase 4. If tests are desired, add Playwright for e2e (portal auth flows are a natural fit for e2e, not unit tests).

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth email+password; no custom auth logic |
| V3 Session Management | yes | `@supabase/ssr` cookie-based sessions; HttpOnly, SameSite handled by Supabase |
| V4 Access Control | yes | Layout Server Component guard + profiles table; RLS on profiles |
| V5 Input Validation | yes | zod schema on login form (email format, password non-empty) |
| V6 Cryptography | no | Supabase handles password hashing — never hand-roll |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Credential stuffing on login | Spoofing | Supabase Auth has built-in rate limiting; no extra config needed for v1 |
| JWT forgery / session hijack | Spoofing | `getUser()` re-validates with Auth server on every request — not just cookie read |
| Privilege escalation via role manipulation | Elevation | Role is read from DB (`profiles`), not from JWT claims that client could forge |
| CSRF on login form | Tampering | Server Actions include origin validation; or use standard form POST with Supabase client |
| Inactive account accessing portal | Auth bypass | `is_active` check in layout guard + sign-out on false |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023-2024 | Auth Helpers deprecated; `@supabase/ssr` is the current standard. Already using correct package. |
| `getSession()` for auth checks | `getUser()` for auth checks | 2023 | `getSession()` does not re-validate with server; `getUser()` does. Existing middleware already uses the correct pattern. |
| Pages Router middleware pattern | App Router Server Component guard | Next.js 13+ | Server Components can read cookies and redirect — no need for complex middleware auth logic |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: replaced by `@supabase/ssr`. Project already uses `@supabase/ssr`. [VERIFIED: package.json]
- `supabase.auth.getSession()` for security-sensitive auth checks: use `getUser()` instead. Already documented in `lib/supabase/middleware.ts` comment. [VERIFIED: existing codebase]

---

## Code Examples

### Creating the profiles table via Supabase SQL editor or migration

```sql
-- Run in Supabase SQL Editor or save as supabase/migrations/20260611_profiles.sql
CREATE TYPE staff_role AS ENUM ('super_admin', 'admin', 'doctor', 'receptionist');

CREATE TABLE profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        staff_role NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: own read"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);
```

### Seeding the initial Super Admin account (manual, Phase 4)

1. In Supabase dashboard → Authentication → Users → "Add user" → enter email + temporary password
2. In Supabase dashboard → Table Editor → profiles → Insert row: `user_id = <copied UUID>`, `role = 'super_admin'`, `is_active = true`

### Sign out action

```typescript
// Can be a Server Action in a Client Component logout button
'use server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | next-intl v4.13 `createMiddleware` accepts the same routing config as v3 | Standard Stack / Middleware pattern | If API changed, middleware chaining pattern needs adjustment — check next-intl v4 docs before implementing |
| A2 | `app/(portal)/layout.tsx` as a route group layout acts as the root HTML shell for portal routes (replaces root `app/layout.tsx`) | Architecture Patterns | If both layouts nest, portal gets double `<html>` tags — verify Next.js route group layout behavior |

**Note on A2:** The portal layout stub already has `<html lang="en"><body>` which is the correct pattern for a route group that needs its own shell. This is consistent with Next.js App Router route group behavior. [ASSUMED — not re-verified in this session against Next.js 16 docs]

---

## Open Questions

1. **Does `app/layout.tsx` (root layout) currently exist and does it conflict with `app/(portal)/layout.tsx`?**
   - What we know: `(portal)` route group has its own layout with `<html><body>` tags
   - What's unclear: If `app/layout.tsx` also has `<html><body>`, Next.js will error on double nesting
   - Recommendation: Check `app/layout.tsx` before implementing; if it exists, the portal layout should NOT include `<html><body>` — use a div wrapper instead and let the root layout provide the shell

2. **Are Supabase env vars already in `.env.local`?**
   - What we know: `lib/supabase/client.ts` and `server.ts` reference `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - What's unclear: Whether these are set (project was set up in Phase 1)
   - Recommendation: Wave 0 task should verify `.env.local` has both vars before building auth features

3. **Where does the `/login` page sit relative to the auth-guarded portal layout?**
   - What we know: D-11 says unauthenticated users redirect to `/login`; D-12 says authenticated users at `/login` redirect to `/dashboard`
   - What's unclear: If `/login` is inside `(portal)` group, the layout guard creates a redirect loop (Pitfall 2)
   - Recommendation: Move login page OUTSIDE the auth-guarded layout — either to `app/login/page.tsx` (top level) or use a separate `(auth)` route group with a minimal layout

---

## Sources

### Primary (HIGH confidence)
- `D:/Git Hub/Aatmaram Website/lib/supabase/middleware.ts` — verified `getUser()` pattern, cookie adapter
- `D:/Git Hub/Aatmaram Website/lib/supabase/server.ts` — verified `createServerClient` + cookies() pattern
- `D:/Git Hub/Aatmaram Website/lib/supabase/client.ts` — verified `createBrowserClient` pattern
- `D:/Git Hub/Aatmaram Website/package.json` — verified all dependency versions
- `D:/Git Hub/Aatmaram Website/app/(portal)/layout.tsx` — verified stub integration point
- `.planning/phases/04-auth-roles/04-CONTEXT.md` — locked decisions D-01 through D-12

### Secondary (MEDIUM confidence)
- Supabase SSR Next.js guide (supabase.com/docs/guides/auth/server-side/nextjs) — middleware + layout patterns [CITED: supabase.com/docs/guides/auth/server-side/nextjs]
- next-intl middleware documentation — `createMiddleware` API [ASSUMED — verified in Phase 3 implementation]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json; no new dependencies needed
- Architecture: HIGH — existing Supabase infrastructure is correct; patterns are clear from codebase
- Pitfalls: HIGH — login redirect loop and profile-not-found are well-known Supabase SSR issues
- Middleware chaining: MEDIUM — pattern is sound but next-intl v4 API not re-verified against docs

**Research date:** 2026-06-11
**Valid until:** 2026-09-11 (stable stack — Supabase SSR and next-intl are both relatively stable)
