---
phase: 04-auth-roles
plan: "03"
subsystem: auth
tags: [login-page, react-hook-form, zod, shadcn-ui, server-action, redirect-if-authed]
dependency_graph:
  requires: [middleware.ts, auth-server-actions, portal-layout-guard]
  provides: [login-page, LoginForm-component]
  affects: [app/login/, components/portal/LoginForm.tsx]
tech_stack:
  added: []
  patterns: [react-hook-form-zod-form, server-action-call-from-client, redirect-if-authed-D12]
key_files:
  created:
    - app/login/layout.tsx
    - app/login/page.tsx
    - components/portal/LoginForm.tsx
  modified: []
  deleted:
    - app/(portal)/login/page.tsx
decisions:
  - "app/login/ placed at top-level (outside (portal) group) — avoids redirect loop (Pitfall 2 / T-04-11)"
  - "LoginForm exports named export LoginForm (not default) — consistent with portal component convention"
  - "app/(portal)/login/page.tsx stub deleted — conflicted with top-level /login route at build time"
metrics:
  duration_minutes: 8
  completed_date: "2026-06-12"
  tasks_completed: 2
  tasks_total: 3
  files_changed: 4
---

# Phase 04 Plan 03: Login Page Summary

**One-liner:** Login page at app/login/ (outside portal guard) with react-hook-form + zod + loginAction, plus redirect-if-authed guard for already-authenticated users.

## What Was Built

### Task 1: LoginForm client component (1b238cd)

- `components/portal/LoginForm.tsx` — `'use client'` component mirroring AppointmentForm.tsx stack.
- `loginSchema`: `email` (z.string().email) + `password` (z.string().min(1)) defined outside component.
- `useForm` with `zodResolver`; `onSubmit` calls `loginAction(data)`; toasts `result.error` on failure; on success loginAction redirects to `/dashboard`.
- Two `FormField` blocks: email (type=email, autoComplete=email) and password (type=password, autoComplete=current-password).
- Submit `Button` disabled while `form.formState.isSubmitting`; styled `bg-blue-800 hover:bg-blue-900 min-h-[44px]`.

### Task 2: login route shell + page (2f1370f)

- `app/login/layout.tsx` — provides `<html lang="en"><body>` shell (root layout returns children-only; no html/body).
- `app/login/page.tsx` — async Server Component; calls `createClient()` + `supabase.auth.getUser()`; redirects to `/dashboard` if user present (D-12); otherwise renders centered `<LoginForm />`.
- Route is at top-level `app/login/`, OUTSIDE `(portal)` group — portal auth guard never runs on it (Pitfall 2 / T-04-11 mitigated).
- `app/(portal)/login/page.tsx` stub deleted — it conflicted with the new top-level route at build time (Next.js "two parallel pages that resolve to the same path" error).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Deleted conflicting (portal)/login stub**
- **Found during:** Task 2 build verification
- **Issue:** `app/(portal)/login/page.tsx` (a placeholder from pre-Phase 4 scaffolding) caused a Next.js build error: "You cannot have two parallel pages that resolve to the same path. Please check /(portal)/login and /login."
- **Fix:** Removed `app/(portal)/login/page.tsx` via `git rm`. The plan's own acceptance criteria included a check for this: `test ! -d "app/(portal)/login" || echo "WARN: old (portal)/login still exists"` — confirming it was anticipated.
- **Files modified:** `app/(portal)/login/page.tsx` (deleted)
- **Commit:** 2f1370f

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|-----------|
| T-04-09 | loginAction is a Next.js Server Action — built-in origin validation/CSRF |
| T-04-10 | Supabase signInWithPassword handles hashing + rate limiting; no custom auth |
| T-04-02 | Supabase returns generic invalid-credentials message; no user-enumeration detail surfaced |
| T-04-11 | /login at app/login/ (outside portal guard); page redirects authed users to /dashboard (D-12) |

## Known Stubs

None — login form is fully wired to `loginAction` which calls Supabase `signInWithPassword`.

## Threat Flags

None — no new network endpoints or auth paths beyond those in the plan's threat model.

## Checkpoint: Human Verify Required

**Type:** checkpoint:human-verify (gate=blocking)

**Task 3** is a human verification checkpoint. The login flow is complete; end-to-end verification requires the Supabase environment (migration applied, Super Admin account seeded from Plan 04-01 checkpoint) and a running dev server.

**Verification steps:** see Plan 04-03 Task 3 checkpoint details.

## Self-Check: PASSED

- `app/login/layout.tsx` exists: confirmed (2f1370f)
- `app/login/page.tsx` exists: confirmed (2f1370f)
- `components/portal/LoginForm.tsx` exists: confirmed (1b238cd)
- `app/(portal)/login/page.tsx` deleted: confirmed (2f1370f diff)
- `tsc --noEmit` passes: confirmed (no output)
- `npm run build` passes: confirmed (/login appears in build output)
- Commits 1b238cd, 2f1370f in git log: confirmed
