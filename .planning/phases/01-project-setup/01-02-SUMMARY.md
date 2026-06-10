---
plan: 01-02
phase: 01-project-setup
status: complete
completed: 2026-06-10
commits:
  - 7988050
---

# Plan 01-02 Summary: Supabase Environment Setup

## What Was Built

Wired Supabase credentials into `.env.local`, committed a safe `.env.local.example` template, and verified a live Supabase connection from a Server Component. The project is now connected to the `atmaram-hospital` Supabase project in ap-south-1 (Mumbai).

## Key Files Created

- `.env.local` — NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY=placeholder (not committed — gitignored)
- `.env.local.example` — committed template with placeholder values for new contributors
- `app/[locale]/(public)/page.tsx` — updated with Supabase connection smoke test

## Must-Haves Verification

- [x] `.env.local` contains NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
- [x] SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY have NO NEXT_PUBLIC_ prefix
- [x] `.env.local` is gitignored (`.env.local` pattern in .gitignore)
- [x] `.env.local.example` committed with placeholder values only
- [x] Supabase connection verified — dev server returns "table not found" (not auth/network error), confirming valid keys

## Supabase Project Details

- Project ref: `ilvkpbuqjgmldunjpwor`
- Region: `ap-south-1` (Mumbai)
- Plan: Free tier

## Deviations

1. **Gitignore too broad**: create-next-app generated `.env*` which blocked `.env.local.example` from being committed. Narrowed to explicit patterns (`.env.local`, `.env*.local`, etc.) to allow committing the example file.

2. **New Supabase key format**: Keys use the `sb_publishable_` / `sb_secret_` format (Supabase's newer SDK key format) rather than the JWT-style keys documented in RESEARCH.md. The `@supabase/ssr@0.12.0` client handles both formats — connection confirmed working.

## Self-Check: PASSED

Supabase connection confirmed via dev server smoke test. Table-not-found error (PostgREST schema cache miss on non-existent table) is the expected success signal at this stage — no auth errors, no network errors.
