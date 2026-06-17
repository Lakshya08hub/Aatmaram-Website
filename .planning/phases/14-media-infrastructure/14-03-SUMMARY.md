---
phase: 14-media-infrastructure
plan: "03"
subsystem: portal-server-actions
tags: [media, storage, server-actions, supabase, image-upload]
dependency_graph:
  requires: [14-02]
  provides: [uploadImageAction, deleteImageAction]
  affects: [portal image upload controls, public entity pages]
tech_stack:
  added: []
  patterns: [server-action-auth-gate, admin-client-storage-write, multi-locale-revalidation]
key_files:
  created:
    - app/(portal)/actions/media.ts
  modified: []
decisions:
  - "revalidateByFolder and revalidateByTable helpers defined to keep route sets co-located with entity type"
  - "deleteImageAction gracefully skips Storage remove when URL is malformed or external/legacy"
  - "requireCmsRole() copied verbatim from content.ts to keep auth pattern identical across action modules"
metrics:
  duration: "~10 min"
  completed: "2026-06-17"
---

# Phase 14 Plan 03: Media Server Actions Summary

**One-liner:** Server Actions for Supabase Storage image upload and delete with MIME/size validation and multi-locale cache revalidation, gated by requireCmsRole().

## What Was Built

`app/(portal)/actions/media.ts` — a 'use server' module containing two exported Server Actions:

- **uploadImageAction** — validates MIME type (jpeg/png/webp) and size (<=5 MB) before uploading to the `media` Supabase Storage bucket using the admin client, then writes the public URL to the specified DB column and revalidates affected routes.
- **deleteImageAction** — extracts the Storage object path from the stored public URL, removes it from Storage, clears the DB column to null, and revalidates affected routes.

Both actions:
- Call `requireCmsRole()` as the first operation (T-14-04 mitigation)
- Use `createAdminClient()` for Storage and DB writes (bypasses RLS)
- Return `{ url?, error? }` / `{ error? }` shaped results
- Catch all errors into `{ error: string }` via try/catch

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create media.ts with upload and delete actions | f8482ac | app/(portal)/actions/media.ts |

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|-----------|
| T-14-04 | requireCmsRole() is first call — redirects/throws before any file processing |
| T-14-05 | MIME allowlist ['image/jpeg','image/png','image/webp'] checked before upload |
| T-14-06 | 5 MB size cap enforced before arrayBuffer() conversion |
| T-14-07 | Storage path is `{typed-folder}/{entityId}-{timestamp}.ext` — no user-controlled substring |

## Deviations from Plan

None — plan executed exactly as written. Minor additions:

- **[Rule 2 - Missing helper] Added revalidateByTable()** alongside revalidateByFolder() — deleteImageAction receives `table` not `folder`, so a symmetric helper was needed. This was implicit in the plan's "same revalidatePath logic as upload (by table/folder)" instruction.
- **[Rule 2 - Graceful degradation] URL parse wrapped in try/catch** — if `storedUrl` is malformed the Storage delete is skipped rather than throwing, preventing an unrecoverable error when clearing legacy external URLs.

## Self-Check

- [x] `app/(portal)/actions/media.ts` exists
- [x] Commit f8482ac present in git log
- [x] `npx tsc --noEmit` passes with no errors
- [x] uploadImageAction: 2 occurrences (declaration + export keyword)
- [x] deleteImageAction: 2 occurrences
- [x] requireCmsRole: 4 occurrences (declaration + 2 call sites)
- [x] revalidatePath: 23 occurrences (en/hi pairs for doctors/departments/facilities/site + portal routes)

## Self-Check: PASSED
