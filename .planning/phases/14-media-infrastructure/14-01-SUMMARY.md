---
phase: 14-media-infrastructure
plan: "01"
subsystem: media-infrastructure
tags: [storage, next-image, supabase, rls, migration]
dependency_graph:
  requires: []
  provides: [media-bucket-sql, next-image-remote-patterns]
  affects: [next.config.ts, supabase/migrations]
tech_stack:
  added: []
  patterns: [supabase-storage-rls, next-image-remote-patterns]
key_files:
  created:
    - supabase/migrations/20260617_media_bucket.sql
  modified:
    - next.config.ts
decisions:
  - "Used DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$; wrappers for RLS policy creation because CREATE POLICY lacks IF NOT EXISTS support in Postgres"
  - "Scoped remotePatterns pathname to /storage/v1/object/public/** to restrict next/image proxy to public storage objects only"
metrics:
  duration: "5 minutes"
  completed: "2026-06-17"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Phase 14 Plan 01: Media Infrastructure Bootstrap Summary

Wave 1 de-riskers: Supabase Storage migration SQL and next/image hostname allowlist written so the rest of Phase 14 can safely use Supabase Storage URLs through next/image.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Write Phase 14 migration SQL | bca70b6 | supabase/migrations/20260617_media_bucket.sql |
| 2 | Add images.remotePatterns to next.config.ts | 2495827 | next.config.ts |

## What Was Built

**Task 1 — Migration SQL (`supabase/migrations/20260617_media_bucket.sql`):**
- `ALTER TABLE hospital_info ADD COLUMN IF NOT EXISTS hero_image_url text` — new column for hero banner
- `ALTER TABLE facilities ADD COLUMN IF NOT EXISTS image_url text` — new column for facility photos
- `INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true) ON CONFLICT (id) DO NOTHING` — public media bucket
- Three RLS policies on `storage.objects` wrapped in `DO $$ BEGIN ... EXCEPTION $$` blocks for idempotency: public read (anon + authenticated), admin write (role check via profiles table), admin delete (role check via profiles table)

**Task 2 — next.config.ts:**
- Added `images.remotePatterns` with one entry for `ilvkpbuqjgmldunjpwor.supabase.co`, pathname `/storage/v1/object/public/**`
- Existing `turbopack` config and `withNextIntl` export preserved unchanged

## Deviations from Plan

**1. [Rule 2 - Missing Critical Functionality] Wrapped RLS policy CREATE statements in idempotency blocks**
- **Found during:** Task 1
- **Issue:** Plan noted CREATE POLICY lacks IF NOT EXISTS support. Rather than leaving a comment "policies may fail on re-run", wrapped each policy in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` so the file is safely re-runnable
- **Fix:** DO/EXCEPTION wrapper applied to all three policies
- **Files modified:** supabase/migrations/20260617_media_bucket.sql
- **Commit:** bca70b6

## Known Stubs

None — this plan produces SQL and config only, no UI components.

## Threat Flags

None — no new network endpoints or auth paths introduced. remotePatterns scoped to public storage path only (T-14-02 accepted per threat model).

## Self-Check: PASSED

- `supabase/migrations/20260617_media_bucket.sql` exists
- `next.config.ts` contains remotePatterns and ilvkpbuqjgmldunjpwor.supabase.co
- Commits bca70b6 and 2495827 exist in git log
