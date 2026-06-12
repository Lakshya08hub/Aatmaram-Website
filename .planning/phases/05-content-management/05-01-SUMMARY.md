---
phase: 05-content-management
plan: "01"
subsystem: cms-foundation
tags: [supabase, migration, rls, admin-client, roles, layout-guard]
dependency_graph:
  requires: [04-03]
  provides: [cms-tables, admin-client, content-role-guard]
  affects: [05-02, 05-03, 05-04]
tech_stack:
  added: [supabase service-role client]
  patterns: [server-component role guard, rls policies, singleton table seed]
key_files:
  created:
    - supabase/migrations/20260612_cms_tables.sql
    - lib/supabase/admin.ts
    - .env.example
    - app/(portal)/content/layout.tsx
  modified:
    - lib/portal/roles.ts
decisions:
  - "Service-role client is stateless: no cookie handling, autoRefreshToken=false, persistSession=false"
  - "hospital_info uses INSERT DEFAULT VALUES seed so Server Actions can always UPDATE (no INSERT logic needed)"
  - "content layout.tsx is security-only — no visible UI; portal root layout provides chrome"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-12"
  tasks_completed: 3
  tasks_total: 4
  files_created: 4
  files_modified: 1
---

# Phase 05 Plan 01: CMS Foundation Summary

**One-liner:** Four CMS tables with RLS + service-role admin client + role-guarded /portal/content/* layout for super_admin/admin only.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CMS migration SQL + admin client + env.example | de9b01b | supabase/migrations/20260612_cms_tables.sql, lib/supabase/admin.ts, .env.example |
| 2 | Update roles.ts — add content section | 185dbdc | lib/portal/roles.ts |
| 3 | Create content/layout.tsx role guard | d0e2204 | app/(portal)/content/layout.tsx |
| 4 | [BLOCKING CHECKPOINT] Apply migration via Supabase Dashboard | — | User action required |

## What Was Built

### supabase/migrations/20260612_cms_tables.sql
Four tables with RLS enabled:
- `departments` — name, description, image_url
- `doctors` — full_name, specialization, qualification, photo_url, bio, availability_days[], is_active, nullable `staff_user_id` FK → profiles(id)
- `facilities` — name, description, facility_category enum (OPD/ICU/Diagnostics/Surgery/Other)
- `hospital_info` — singleton table seeded with one row; about_text, opd_timings, emergency_number, address fields, maps_embed_url

All four tables have `CREATE POLICY ... FOR SELECT TO anon, authenticated USING (true)`.

### lib/supabase/admin.ts
`createAdminClient()` using `SUPABASE_SERVICE_ROLE_KEY` — stateless, no cookie handling. Throws a descriptive error if the key is missing.

### lib/portal/roles.ts
`ALL_SECTIONS` now has 8 entries (content inserted after dashboard). `ROLE_SECTIONS.super_admin` has 8 sections; `ROLE_SECTIONS.admin` has 7. Receptionist and doctor unchanged.

### app/(portal)/content/layout.tsx
Server Component role guard: getUser() → profile fetch → redirect /login if unauthed/inactive/missing → redirect /portal/dashboard if role is not super_admin or admin. Security-only — no visible UI.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Mitigations Applied

| Threat | Mitigation |
|--------|-----------|
| T-05-01 | SUPABASE_SERVICE_ROLE_KEY documented in .env.example with placeholder; .env.local is gitignored |
| T-05-02 | All four tables have ENABLE ROW LEVEL SECURITY + SELECT policies |
| T-05-03 | content/layout.tsx enforces super_admin/admin check server-side |

## Pending: Blocking Human Action

Task 4 requires the user to apply the migration SQL to the live Supabase project. See checkpoint below.

## Self-Check: PASSED

- supabase/migrations/20260612_cms_tables.sql: FOUND
- lib/supabase/admin.ts: FOUND
- .env.example: FOUND
- lib/portal/roles.ts: modified with content section
- app/(portal)/content/layout.tsx: FOUND
- Commits de9b01b, 185dbdc, d0e2204: verified in git log
- npx tsc --noEmit: PASSED (no output)
