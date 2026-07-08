---
phase: quick-260707-uz0
plan: 01
subsystem: rate-limiting, chat-security, staff-management
tags: [supabase, rate-limit, security, atomic-rpc, cors, token-exhaustion]
dependency-graph:
  requires: []
  provides: [shared-rate-limit-module, rate-limit-counters-migration, chat-abuse-hardening, staff-self-lockout-guard]
  affects: ["app/(portal)/actions/auth.ts", "app/api/chat/route.ts", "lib/actions/submitAppointmentAction.ts", "app/(portal)/actions/staff.ts"]
tech-stack:
  added: []
  patterns: [atomic-single-statement-upsert, fail-open-on-rpc-error, shared-guard-helper, abort-signal-aware-streaming]
key-files:
  created:
    - supabase/migrations/20260707_rate_limit_counters.sql
    - lib/rate-limit.ts
  modified:
    - "app/(portal)/actions/auth.ts"
    - "app/api/chat/route.ts"
    - "lib/actions/submitAppointmentAction.ts"
    - "app/(portal)/actions/staff.ts"
decisions: []
metrics:
  duration: multi-session (Task 1 in first pass, Tasks 3/4/5 in continuation after plan update)
  completed: 2026-07-08 (Tasks 1, 3, 4, 5 complete; Task 2 still pending human action)
---

# Quick 260707-uz0 Plan 01: 5-task hardening pass (rate limiting, origin check, self-lockout, chat abuse) Summary

Race-safe cross-instance rate limiting via a single Postgres `check_rate_limit()` RPC now backs login/chat/appointment limits; chat rejects null-Origin requests; staff self-deactivation is blocked through one shared helper on both mutation paths; and the chat route is additionally hardened against IP-chain spoofing, unbounded Gemini output, oversized total conversation payloads, and wasted generation after client disconnect.

## Status

**Task 1: COMPLETE** — commit `7330930` (rebased from original `bc17db4`)
**Task 2: STILL PENDING — human action required.** The Supabase migration SQL has NOT been applied yet. See "Task 2 — Pending Human Action" below.
**Task 3: COMPLETE** — commit `738757c`
**Task 4: COMPLETE** — commit `66b9603`
**Task 5: COMPLETE** — commit `8aaedc0`

**Important:** Rate-limiter runtime behavior (the actual 429/allow decisions at login, chat, and appointment endpoints) cannot be spot-checked until Task 2's SQL is applied in the Supabase Dashboard. All code changes in Tasks 3–5 compile correctly independent of the migration (confirmed via `npx tsc --noEmit`), per the plan's explicit design — `checkRateLimit()` fails OPEN on RPC error, so until the migration is applied, `rate_limit_counters`/`check_rate_limit` will not exist server-side and every call currently returns `true` (allowed) after logging a `console.warn`. This is expected fail-safe behavior, not a bug — but it also means rate limiting is effectively inactive at runtime until Task 2 is confirmed.

## What Was Built

### Task 1 — Migration + shared rate-limit module

1. **`supabase/migrations/20260707_rate_limit_counters.sql`**
   - `rate_limit_counters` table (`key text primary key, count int, window_start timestamptz`), idempotent via `create table if not exists`.
   - `check_rate_limit(p_key text, p_max int, p_window_ms int) returns boolean` — single atomic `insert ... on conflict (key) do update ... returning count into v_count` (fixed-window, TOCTOU-safe). Returns `true` when allowed.

2. **`lib/rate-limit.ts`**
   - `export async function checkRateLimit(key, { max, windowMs }): Promise<boolean>` calling `createAdminClient().rpc('check_rate_limit', ...)`.
   - Fails OPEN (`true`) on RPC error, logged via `console.warn`.

### Task 3 — Migrate all three call sites to shared `checkRateLimit`

- **`app/(portal)/actions/auth.ts`**: removed `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `loginAttempts` Map, `isRateLimited`. `loginAction` now calls `checkRateLimit('login:' + ip, { max: 5, windowMs: 15 * 60 * 1000 })`. Same warn log and same `{ error: 'Too many login attempts...' }` return preserved.
- **`app/api/chat/route.ts`**: removed `rateLimitMap`, `RATE_LIMIT`, `WINDOW_MS`, the local `checkRateLimit` function, and the `setInterval` cleanup. `POST` now calls shared `checkRateLimit` (imported aliased as `rateLimit`) with `'chat:' + ip`, `{ max: 20, windowMs: 60_000 }`. Same `429 { error: 'Too many requests' }` response preserved.
- **`lib/actions/submitAppointmentAction.ts`**: removed `ipRateMap`, `RATE_WINDOW_MS`, `MAX_PER_WINDOW`, local `checkRateLimit`. `submitAppointmentAction` now calls shared `checkRateLimit('appt:' + ip, { max: 5, windowMs: 60_000 })`. Same `{ error: 'Too many requests. Please wait a moment and try again.' }` return preserved.
- No dead Map/interval code remains at any of the three sites (grep-confirmed).

### Task 4 — Chat null-origin fix + staff self-lockout guard consolidation

- **`app/api/chat/route.ts`**: `isAllowedOrigin` changed from `if (!origin) return true` to `if (!origin) return false`, with an updated comment explaining the missing-Origin bypass vector is now closed. `ALLOWED_ORIGINS` allowlist logic unchanged.
- **`app/(portal)/actions/staff.ts`**: added module-level `assertNotSelfDeactivation(targetId, callerProfileId, isDeactivating)` helper with the exact original error wording (`'Cannot deactivate your own account'`). `toggleActiveAction` now delegates to it. `updateStaffAction`'s `requireAdminRole()` destructure was extended to also pull `callerProfileId`, and a call to the guard was added before the `.update(input)` call — closing the gap where self-deactivation was previously only blocked via `toggleActiveAction`, not the generic partial-update path.

### Task 5 — Harden chat route against token-exhaustion / rapid-fire abuse

Four additive fixes, all in `app/api/chat/route.ts`:

1. **First-hop IP extraction:** `x-forwarded-for` is now parsed as `.split(',')[0]?.trim()` before falling back to `x-real-ip`/`'127.0.0.1'`, matching the existing convention already used in `auth.ts` and `submitAppointmentAction.ts`. Prevents a raw multi-hop header string from being used as the rate-limit key.
2. **Gemini output cap:** `generateContentStream`'s `config` now includes `maxOutputTokens: 500` alongside `systemInstruction`.
3. **Total conversation character budget:** new `MAX_TOTAL_CONVERSATION_CHARS = 6000` constant; after `safeMessages = messages.slice(-20)`, a `reduce` sums `.content.length` across `safeMessages` and returns `400 { error: 'Conversation too long. Please start a new chat.' }` (same response shape as other validation errors in this file) before calling Gemini if the total exceeds the cap.
4. **Abort on client disconnect:** inside the `ReadableStream`'s streaming `for await` loop, `request.signal.aborted` is checked each iteration and `break`s out before `controller.enqueue` once true, with a comment explaining why (stop enqueueing to a dead controller / stop paying for tokens nobody will read).

## Task 2 — Pending Human Action (blocking checkpoint, still open)

**What was built:** The migration SQL in `supabase/migrations/20260707_rate_limit_counters.sql` creating the `rate_limit_counters` table and `check_rate_limit()` function. This repo has no Supabase CLI config, so migrations must be applied manually.

**Exact file path:** `supabase/migrations/20260707_rate_limit_counters.sql`

**How to verify:**
1. Open the Supabase Dashboard → SQL Editor for this project.
2. Paste the full contents of the file above and run it.
3. Confirm no errors, and that `rate_limit_counters` appears under Tables and `check_rate_limit` under Database → Functions.
4. (Optional) Run `select check_rate_limit('test:1', 2, 60000);` a few times — first two calls return `true`, third returns `false`.

**Resume signal:** Type "applied" once the migration runs cleanly, or paste any SQL error.

**Consequence of remaining pending:** Every `checkRateLimit()` call across login/chat/appointment currently fails OPEN (logs a `console.warn`, returns `true`/allowed) because the `check_rate_limit` RPC does not exist server-side yet. This is safe by design (no legitimate user is blocked by a missing RPC) but means rate limiting is NOT actually enforced at runtime until this migration is applied and confirmed.

## Verification

- `npx tsc --noEmit`: zero new errors attributable to this plan's diff (`lib/rate-limit.ts`, the migration SQL, `app/(portal)/actions/auth.ts`, `app/api/chat/route.ts`, `lib/actions/submitAppointmentAction.ts`, `app/(portal)/actions/staff.ts`). A set of pre-existing, unrelated TypeScript errors exists elsewhere in the repo — see `deferred-items.md`.
- `npm run build`: fails at the TypeScript-check stage due to a pre-existing, out-of-scope issue (`isRedirectError` no longer exported from `next/dist/client/components/redirect`) in 6 files not touched by this plan (`app/(portal)/actions/appointments.ts`, `content.ts`, `patients.ts`, `payroll.ts`, plus two `page.tsx` files, and the *import line* in `staff.ts` which predates this plan's edits to that file). Confirmed via `git log` that these commits/imports predate this quick task. Logged to `deferred-items.md`; not fixed here per SCOPE BOUNDARY (out of scope — pre-existing failures in files this plan doesn't own).
- All task-level grep checks passed:
  - `grep -c "on conflict" supabase/migrations/20260707_rate_limit_counters.sql` → `1`
  - `grep -c "\.rpc('check_rate_limit'" lib/rate-limit.ts` → `1`
  - `grep -rc "new Map<string" app/(portal)/actions/auth.ts app/api/chat/route.ts lib/actions/submitAppointmentAction.ts` → `0` each
  - `grep -rc "setInterval" app/api/chat/route.ts` → `0`
  - `grep -c "if (!origin) return false" app/api/chat/route.ts` → `1`
  - `grep -c "assertNotSelfDeactivation" app/(portal)/actions/staff.ts` → `3`
  - `grep -c "split(',')\[0\]" app/api/chat/route.ts` → `1`
  - `grep -c "maxOutputTokens" app/api/chat/route.ts` → `1`
  - `grep -c "MAX_TOTAL_CONVERSATION_CHARS" app/api/chat/route.ts` → `2`
  - `grep -c "request.signal.aborted" app/api/chat/route.ts` → `1`

## Deviations from Plan

### Auto-fixed Issues

None — all five tasks executed per their written specs.

### Process Deviations (self-corrected, not plan deviations)

**1. cwd-drift during Task 1 (first pass), corrected before continuing.**
A `cd` into the parent repository directory (`D:\Git Hub\Aatmaram Website`) briefly caused the Task 1 commit to land on `main` instead of the per-agent worktree branch (`worktree-agent-a2fb1d1f865e147a5`) — a cwd-drift issue (#3097). Detected immediately via the mandatory pre-commit branch check and corrected by cherry-picking the commit onto the correct worktree branch and hard-resetting `main` back to its pre-mistake state. Documented in the Task-1-only summary from the first pass; superseded by this summary.

**2. Worktree branch was ~16 phases behind `main` at continuation time.**
When resuming to execute Tasks 3/4/5, the worktree branch's base commit (`4e36c2c`) turned out to be far behind `main` (main had since accumulated Phases 13–16 and multiple `app/api/chat/route.ts` / `staff.ts` / `submitAppointmentAction.ts` hardening commits that the plan's Task 3/4/5 specs assume already exist — e.g. the CORS allowlist, in-memory rate limiter, and message-array-length check in `chat/route.ts` did not exist in the stale worktree copy). Since the worktree branch had exactly one unique commit ahead of the stale base (the Task 1 commit), it was safe to `git rebase main` from inside the worktree — this replayed the Task 1 commit on top of current `main` with no conflicts and brought all target files up to the state the plan's Task 3/4/5 instructions describe. No destructive operation was applied to any protected branch; `main` was not modified. Verified via `git log --oneline worktree-agent-a2fb1d1f865e147a5 ^main` showing only the Task 1 commit as unique before rebase, and `git rev-parse --abbrev-ref HEAD` confirming the branch remained `worktree-agent-a2fb1d1f865e147a5` throughout.

**3. `node_modules` was missing in the worktree**, causing Turbopack to fail resolving its own package during `npm run build` (worktree filesystem isolation — Turbopack refuses to resolve packages outside the project directory even with `turbopack.root` already set in `next.config.ts`). Ran `npm install --no-audit --no-fund` (matches the committed, unmodified `package-lock.json` — no new/unverified packages introduced) to populate `node_modules` locally in the worktree. This incidentally rewrote a stale `lucide-react` version pin in `package-lock.json` (unrelated pre-existing drift between `package.json`'s `^1.17.0` and the lockfile's stale `0.469.0`); that unrelated lockfile change was reverted via `git checkout -- package-lock.json` before committing, so no unrelated diff was introduced.

### Deferred (out of scope, logged not fixed)

See `.planning/quick/260707-uz0-fix-3-code-review-issues-shared-supabase/deferred-items.md` for the full list. Summary: a pre-existing, repo-wide `isRedirectError` import break (6 files, none touched by this plan) blocks a fully green `npm run build`, plus several other pre-existing unrelated `tsc` errors (Zod overload mismatch, missing `AppointmentRequest` type, missing `hero_image_url` field, Radix `asChild` prop, `ChatWidget` state-setter type). None of these are caused by or block this plan's `must_haves`/`success_criteria`.

## Commits

- `7330930` — `feat(260707-uz0): shared Supabase-backed atomic rate limiter` (Task 1; rebased from original `bc17db4`)
- `738757c` — `refactor(260707-uz0): migrate login/chat/appointment rate limits to shared Supabase RPC` (Task 3)
- `66b9603` — `fix(260707-uz0): reject null-origin chat requests, consolidate staff self-lockout guard` (Task 4)
- `8aaedc0` — `fix(260707-uz0): harden chat route against token-exhaustion / rapid-fire abuse` (Task 5)

## Self-Check

- `supabase/migrations/20260707_rate_limit_counters.sql`: FOUND
- `lib/rate-limit.ts`: FOUND
- `app/(portal)/actions/auth.ts`: FOUND
- `app/api/chat/route.ts`: FOUND
- `lib/actions/submitAppointmentAction.ts`: FOUND
- `app/(portal)/actions/staff.ts`: FOUND
- Commit `7330930` on branch `worktree-agent-a2fb1d1f865e147a5`: FOUND
- Commit `738757c` on branch `worktree-agent-a2fb1d1f865e147a5`: FOUND
- Commit `66b9603` on branch `worktree-agent-a2fb1d1f865e147a5`: FOUND
- Commit `8aaedc0` on branch `worktree-agent-a2fb1d1f865e147a5`: FOUND

## Self-Check: PASSED
