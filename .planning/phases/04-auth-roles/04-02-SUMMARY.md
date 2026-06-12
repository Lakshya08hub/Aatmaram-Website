---
phase: 04-auth-roles
plan: 02
subsystem: portal-auth
tags: [auth, portal, sidebar, role-scoped, server-component]
dependency_graph:
  requires: [04-01]
  provides: [portal-layout-guard, role-scoped-sidebar, dashboard, section-stubs]
  affects: [all-portal-routes]
tech_stack:
  added: []
  patterns: [async-server-component-auth-guard, role-scoped-nav, hide-not-lock]
key_files:
  created:
    - components/portal/Sidebar.tsx
  modified:
    - app/(portal)/layout.tsx
    - app/(portal)/dashboard/page.tsx
    - app/(portal)/staff/page.tsx
    - app/(portal)/appointments/page.tsx
    - app/(portal)/patients/page.tsx
    - app/(portal)/payroll/page.tsx
    - app/(portal)/analytics/page.tsx
    - app/(portal)/settings/page.tsx
decisions:
  - "getUser() used (not getSession()) for auth guard per T-04-08 mitigation"
  - "Role-scoped sidebar hides (not locks) sections not permitted for role (D-06/D-08)"
  - "Inactive account triggers signOut() before redirect to prevent stale session (D-05)"
  - "Portal layout renders own html+body shell since root layout returns children-only (D-09)"
metrics:
  duration: "pre-committed"
  completed: "2026-06-12"
  tasks_completed: 3
  tasks_total: 3
---

# Phase 04 Plan 02: Auth-guarded Portal Layout + Role-scoped Sidebar Summary

Auth-guarded portal layout using getUser() + DB profile fetch, role-scoped PortalSidebar filtering ROLE_SECTIONS, role-aware dashboard, and six section stub pages with phase placeholders.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Role-scoped Sidebar component | 188161d | components/portal/Sidebar.tsx |
| 2 | Auth-guarded portal layout | 9fe67ce | app/(portal)/layout.tsx |
| 3 | Role-aware dashboard + six section stubs | d03a3fa | app/(portal)/dashboard/page.tsx, 6 stub pages |

## What Was Built

**Task 1 — PortalSidebar:**
- `components/portal/Sidebar.tsx` exports `PortalSidebar({ role })` as a Server Component
- Imports `ALL_SECTIONS`, `ROLE_SECTIONS`, `StaffRole` from `@/lib/portal/roles`
- Builds `allowed = new Set(ROLE_SECTIONS[role])` and filters `ALL_SECTIONS` — hide-not-lock
- Renders `<aside className="w-56 bg-slate-900 ...">` with nav links using plain `next/link` (not next-intl)
- Sign-out form wired to `signOutAction` from `@/app/(portal)/actions/auth`

**Task 2 — Portal Layout Guard:**
- `app/(portal)/layout.tsx` is an async Server Component with full auth + DB guard
- `supabase.auth.getUser()` re-validates with Auth server (T-04-08; getSession() forbidden)
- Missing user → `redirect('/login')` (T-04-03 / AUTH-04)
- Queries `profiles` table for `role, is_active` — server-side DB, not JWT
- Missing profile or `is_active=false` → `signOut()` + `redirect('/login')` (T-04-05 / AUTH-03)
- Renders `<html lang="en"><body>` shell (D-09) with flex layout: `<PortalSidebar>` + `<main>`

**Task 3 — Dashboard + Stubs:**
- `app/(portal)/dashboard/page.tsx` fetches role and renders role-specific greeting + description
- Six stub pages created with correct "Coming in Phase X" text:
  - staff → "Coming in Phase 6"
  - appointments → "Coming in Phase 7"
  - patients → "Coming in Phase 8"
  - payroll → "Coming in Phase 9"
  - analytics → "Coming in Phase 10"
  - settings → "Coming in a later phase"

## Verification

- `npx tsc --noEmit` passes (no TypeScript errors)
- All acceptance criteria met:
  - `getUser` present in layout, `getSession` absent
  - Two `redirect('/login')` calls in layout (unauthenticated + inactive)
  - `is_active` check present in layout
  - `PortalSidebar` used in layout
  - `ROLE_SECTIONS` used in Sidebar
  - No `next-intl` import in Sidebar
  - All six stub files exist with correct phase text

## Deviations from Plan

None — plan executed exactly as written.

## Threat Model Coverage

| Threat ID | Status |
|-----------|--------|
| T-04-03 | Mitigated — getUser() + redirect('/login') in layout |
| T-04-04 | Mitigated — ROLE_SECTIONS[role] server-side filter in Sidebar |
| T-04-05 | Mitigated — is_active check + signOut() + redirect('/login') |
| T-04-08 | Mitigated — getUser() used; getSession() absent (grep-verified) |

## Known Stubs

The six section pages (staff, appointments, patients, payroll, analytics, settings) are intentional stubs. Each shows a "Coming in Phase X" placeholder. These will be wired with real data in Phases 6-10 respectively.

## Self-Check: PASSED

- components/portal/Sidebar.tsx: EXISTS
- app/(portal)/layout.tsx: EXISTS
- app/(portal)/dashboard/page.tsx: EXISTS
- All six stub pages: EXIST
- Commits 188161d, 9fe67ce, d03a3fa: VERIFIED in git log
