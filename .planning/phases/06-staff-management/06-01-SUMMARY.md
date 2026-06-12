---
phase: 06-staff-management
plan: "01"
subsystem: staff-management
tags: [supabase, rls, server-actions, admin-client, profiles]
dependency_graph:
  requires: [04-auth-roles]
  provides: [staff-schema, staff-db-utilities, staff-server-actions]
  affects: [portal-staff-page]
tech_stack:
  added: []
  patterns: [requireAdminRole-guard, admin-client-merge, auth-rollback]
key_files:
  created:
    - supabase/migrations/20260612_staff_schema.sql
    - lib/db/staff.ts
    - app/(portal)/actions/staff.ts
  modified: []
decisions:
  - "New staff accounts created with is_active: false (pending state) — admin activates separately"
  - "createStaffAction rolls back Auth user if profiles insert fails (atomicity)"
  - "getStaffList merges Auth email into profile rows in-memory (no DB join needed)"
  - "requireAdminRole uses getUser() (server-side re-validation), not getSession()"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-12"
  tasks_completed: 4
  files_created: 3
---

# Phase 6 Plan 01: Staff Management Foundation Summary

Staff management foundation built: schema extended, RLS admin write policies added, typed DB utility created, and four Server Actions wired with admin-role guard.

## What Was Built

**T-06-01-01 — Schema migration (`supabase/migrations/20260612_staff_schema.sql`):**
- `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS` for `full_name text`, `phone text`, `salary numeric(10,2)`, `join_date date` (all nullable, no defaults)
- Three RLS write policies using an EXISTS subquery against profiles to verify the requesting user is an active `super_admin` or `admin`

**T-06-01-02 — Migration push:**
- `npx supabase db push` requires the project to be linked (`supabase link --project-ref <ref>`). The migration file is complete and ready. See deviation below.

**T-06-01-03 — `lib/db/staff.ts`:**
- `StaffMember` interface with all profile fields + `email` from Auth
- `getStaffList()` calls `adminClient.auth.admin.listUsers()`, runs `profiles` select via regular server client, merges by `user_id`, sorts by `created_at` ascending

**T-06-01-04 — `app/(portal)/actions/staff.ts`:**
- `requireAdminRole()` guard — mirrors `requireCmsRole()` pattern, uses `getUser()` for server-side validation
- `createStaffAction` — Auth.createUser + profile insert (is_active: false), Auth.deleteUser rollback on profile failure
- `updateStaffAction` — partial profiles update by id
- `toggleActiveAction` — flip is_active by id
- `deleteStaffAction` — profiles delete then Auth.deleteUser

## Deviations from Plan

**[Rule 3 - Blocking] Supabase CLI not linked — migration push skipped**
- **Found during:** T-06-01-02
- **Issue:** `npx supabase db push` exits with "Cannot find project ref. Have you run supabase link?" because no `supabase/config.toml` exists (project was managed via dashboard only in prior phases).
- **Fix:** Migration SQL is complete and verified. Before Plan 06-02 executes, run: `npx supabase link --project-ref <your-project-ref>` then `npx supabase db push` to apply the schema extension. Alternatively, apply the SQL directly in the Supabase SQL editor.
- **Files modified:** none (migration file already committed)
- **Action required:** Human must link Supabase CLI or apply migration manually before staff page (06-02) can function.

## Known Stubs

None — this plan creates server-side infrastructure only (migration, DB utility, Server Actions). No UI components with stub data.

## Threat Flags

None — no new network endpoints or auth paths beyond the established portal Server Action pattern.

## Self-Check: PASSED

- `supabase/migrations/20260612_staff_schema.sql` — exists, commit `1e4368b`
- `lib/db/staff.ts` — exists, commit `f140e1b`
- `app/(portal)/actions/staff.ts` — exists, commit `972724e`
- `npx tsc --noEmit` — exit 0, no errors
