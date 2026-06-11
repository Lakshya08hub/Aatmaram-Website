# Phase 4: Auth + Roles - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Staff can securely log in to the portal with email and password, are restricted to portal sections appropriate for their role, and Admins can create new staff accounts. Unauthenticated users are redirected to login. The portal sidebar is present with role-scoped navigation stubs (real content comes in later phases).

**In scope:**
- Email + password login form at `/login`
- Supabase Auth session management via SSR cookies
- `profiles` table in Postgres: `(id, user_id, role, is_active)`
- Four roles: Super Admin, Admin, Doctor, Receptionist
- Role-based middleware: portal routes protected, role determines visible sidebar sections
- Portal sidebar with role-scoped section stubs (Dashboard, Staff, Appointments, Patients, Payroll, Analytics, Settings — each shown or hidden per role)
- Admin-creates-accounts flow (no self-registration, no approval queue)
- `is_active` flag: Admin creates = immediately active; deactivation in Phase 6
- Combined `middleware.ts`: next-intl handles `/[locale]/*`, Supabase auth handles portal routes

**Out of scope:**
- Self-registration / approval queue (decided against — admin-creates-only)
- Full staff profile fields (name, phone, salary, join_date) — added in Phase 6
- Password reset / forgot password UI (can be added as a polish item)
- Magic-link / email invite flow
- Actual content behind sidebar stubs (built in Phases 5-10)

</domain>

<decisions>
## Implementation Decisions

### Role Storage
- **D-01:** Roles stored in a `profiles` table in Postgres — `(id, user_id, role, is_active)` — joined to `auth.users` on `user_id`. NOT stored in Supabase `user_metadata` or `app_metadata`.
- **D-02:** Phase 4 creates the minimal auth-only columns. Phase 6 adds name, phone, salary, join_date, etc. via ALTER TABLE.

### Account Creation Flow
- **D-03:** Admin creates all staff accounts directly from the portal — no self-service signup.
- **D-04:** Admin sets an initial temporary password when creating the account. Staff logs in and changes it.
- **D-05:** `is_active` flag replaces the AUTH-03 approval concept. A created account is immediately active. Admin can deactivate later (Phase 6 STAFF-03). No separate approval queue.

### Role-to-Section Access Map
- **D-06:** Hierarchical access — higher roles inherit all sections of lower roles.
- **D-07:** Concrete role → sections mapping:
  - **Super Admin:** Dashboard, Staff, Appointments, Patients, Payroll, Analytics, Settings
  - **Admin:** Dashboard, Staff, Appointments, Patients, Payroll, Analytics
  - **Receptionist:** Dashboard, Appointments, Patients
  - **Doctor:** Dashboard, Patients (own patients only — enforced in Phase 8)
- **D-08:** All non-dashboard sections are stubs in Phase 4. Sidebar items link to placeholder pages that say "Coming in Phase X".

### Middleware Architecture
- **D-09:** Single `middleware.ts` with split matchers: next-intl matcher covers `/[locale]/*` public routes; Supabase auth check covers `/dashboard`, `/login`, and future portal routes.
- **D-10:** After successful login, all roles land on `/dashboard`. Dashboard content is role-aware (different greeting/summary per role).
- **D-11:** Unauthenticated access to any portal route → redirect to `/login`.
- **D-12:** Already-authenticated user visiting `/login` → redirect to `/dashboard`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Auth + Roles — AUTH-01 through AUTH-05 (the 5 requirements this phase satisfies)

### Project Context
- `.planning/PROJECT.md` — Stack decisions, constraints (portal outside [locale] segment, English-only portal)
- `.planning/ROADMAP.md` §Phase 4 — Success criteria and dependency on Phase 1

### Existing Supabase Infrastructure
- `lib/supabase/client.ts` — Browser Supabase client (createBrowserClient from @supabase/ssr)
- `lib/supabase/server.ts` — Server Supabase client (createServerClient, async, cookie-aware)
- `lib/supabase/middleware.ts` — `updateSession()` using `getUser()` — already correct SSR pattern
- `middleware.ts` — Current next-intl middleware (must be extended, not replaced)

### Portal Stubs to Fill
- `app/(portal)/layout.tsx` — Has "auth guard added in Phase 4" comment — this is the integration point
- `app/(portal)/login/page.tsx` — Stub to replace with real login form
- `app/(portal)/dashboard/page.tsx` — Stub to replace with role-aware dashboard

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/supabase/server.ts` — Ready to use for server-side session reads in Server Components and Route Handlers
- `lib/supabase/client.ts` — Ready to use in Client Components for form submission (login action)
- `lib/supabase/middleware.ts` — `updateSession()` already implements the correct `getUser()` pattern — import and call in the extended middleware.ts

### Established Patterns
- **Server Components are async** (see Phase 3's `Header.tsx` migration) — portal layout and dashboard should follow the same async server component pattern
- **`@supabase/ssr` with cookie-based sessions** — already wired in all three client files; do not use `@supabase/supabase-js` directly for auth
- **Tailwind + shadcn/ui** — login form should use shadcn/ui Input, Button, Label, Card components (already installed in Phase 2)

### Integration Points
- `middleware.ts` — Phase 4 extends this file. next-intl's `createMiddleware` currently handles all routing. The new version must chain Supabase session refresh for portal routes while leaving next-intl handling for public routes.
- `app/(portal)/layout.tsx` — Auth guard logic goes here (or in middleware). Sidebar component renders here with role-scoped nav items.
- Supabase Auth dashboard — Admin creates staff accounts here in Phase 4. Portal-side "create account" UI comes in Phase 6 Staff Management.

</code_context>

<specifics>
## Specific Ideas

- Supabase Admin creates accounts in Phase 4 directly via the Supabase dashboard (not via portal UI — that comes in Phase 6). The portal just needs login + session management for now.
- The portal sidebar should show section labels with a lock/placeholder indication for sections the role can't access (or simply hide them — hide is simpler and cleaner for staff UX).

</specifics>

<deferred>
## Deferred Ideas

- Password reset / forgot password UI — not needed for internal staff tool in v1; Admin can reset via Supabase dashboard
- Email invite / magic link flow — decided against; admin-sets-password is simpler for this hospital context
- Portal-side "Create Staff Account" form — Phase 6 (Staff Management)
- Doctor-scoped patient filtering — enforced in Phase 8 (Patient Records), not Phase 4

</deferred>

---

*Phase: 4-Auth + Roles*
*Context gathered: 2026-06-11*
