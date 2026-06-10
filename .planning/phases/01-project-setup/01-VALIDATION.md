---
phase: "01"
phase-slug: project-setup
date: 2026-06-10
status: active
---

# Phase 01: Project Setup — Validation Strategy

## Test Framework

Phase 1 is infrastructure setup, not feature code. No test framework exists yet.
Validation is via **smoke checks** (`npm run dev`, `npm run build`) and **structural checks** (file system assertions), not unit tests.

| Property | Value |
|----------|-------|
| Framework | None pre-existing — Phase 1 sets up the project from scratch |
| Quick run command | `npm run build` (type-check + compile validation) |
| Full suite command | `npm run dev` → manual smoke test on localhost |

## Phase Success Criteria → Validation Map

| Success Criterion | Validation Type | Method |
|-------------------|-----------------|--------|
| `npm run dev` starts without errors on localhost | Smoke | Run `npm run dev`, confirm no startup errors on localhost:3000 |
| Supabase `.env.local` valid, test query returns | Smoke + Manual | Add test query in a Server Component, confirm Supabase response |
| Tailwind CSS renders styles correctly | Visual smoke | Render `app/[locale]/(public)/page.tsx` with `bg-blue-500 p-4` div, visually verify blue background |
| Folder structure matches App Router + `[locale]` + `(portal)` architecture | Structural | File system check — all required directories and files exist |

## Automated Checks (Per-Task)

These are run at task-level inside the plan executor:

| Check | Command | Pass Condition |
|-------|---------|----------------|
| Package dependencies installed | `node -e "require('./package.json')"` | Exits 0; next-intl, @supabase/supabase-js, @supabase/ssr present |
| All required files exist | PowerShell `Test-Path` checks | All 14 files in 01-01 Task 3 present on disk |
| TypeScript compiles clean | `npm run build` | Exits 0, no type errors |
| Tailwind v4 import | grep for `@import "tailwindcss"` in globals.css | String found |
| proxy.ts (not middleware.ts) | `Test-Path proxy.ts` | Returns true |
| Supabase getAll/setAll API | grep for `getAll`, `setAll` in lib/supabase/server.ts | Both present; `get(`, `set(`, `remove(` absent |
| locale returned from getRequestConfig | grep for `locale,` in i18n/request.ts return | Present |
| await params in locale layout | grep for `await params` in app/[locale]/layout.tsx | Present |

## Sampling Rate

- **Per task commit:** `npm run build` — catches type errors before moving to next task
- **Per wave merge:** `npm run dev` smoke check on localhost
- **Phase gate:** All 4 success criteria above confirmed before advancing to Phase 2

## Dimension 8 — Nyquist Coverage

Phase 1 has no REQ-IDs. All validation is against the 4 phase success criteria in ROADMAP.md.
Sampling rate: every task has at least one automated verify check.
Coverage: structural checks cover folder structure; TypeScript compile covers wiring correctness; visual smoke covers Tailwind.

Gap: No automated test for `npm run dev` localhost smoke — this requires human visual verification (manual step in Phase gate).
