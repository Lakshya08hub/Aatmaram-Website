# Deferred Items — Quick Task 260707-uz0

Out-of-scope issues discovered during execution that were NOT fixed (per SCOPE BOUNDARY —
only auto-fix issues directly caused by this task's changes).

## 1. `isRedirectError` no longer exported from `next/dist/client/components/redirect`

**Discovered during:** Task 4/5 final verification (`npm run build`).
**Pre-existing:** Confirmed present in `npx tsc --noEmit` output immediately after Task 1
(before any Task 3/4/5 edits) and unrelated to any file this plan touches.
**Affected files (NOT modified by this plan):**
- `app/(portal)/actions/appointments.ts`
- `app/(portal)/actions/content.ts`
- `app/(portal)/actions/patients.ts`
- `app/(portal)/actions/payroll.ts`
- `app/(portal)/actions/staff.ts` (import only — the plan's Task 4 edits to this file did not
  touch this import; it was already broken before this plan started)
- `app/(portal)/patients/page.tsx`
- `app/(portal)/payroll/page.tsx`

**Symptom:** `next/dist/client/components/redirect` in the installed Next.js 16.2.9 version no
longer exports `isRedirectError` (renamed to `getRedirectError` or removed). This breaks
`npm run build`'s TypeScript check with `TS2724` on every affected file, and blocks a fully
green `npm run build` for the whole repo — not specific to this quick task's changes.

**Other pre-existing, unrelated `tsc --noEmit` errors observed (also NOT fixed):**
- `app/(portal)/actions/content.ts:343` — Zod `errorMap` overload mismatch
- `app/(portal)/appointments/page.tsx:24` — `Cannot find name 'AppointmentRequest'`
- `app/(portal)/media/page.tsx:29` — `hero_image_url` missing on `HospitalInfo` type
- `components/portal/Sidebar.tsx:85` — Radix `asChild` prop type mismatch
- `components/public/ChatWidget.tsx:188` — `Message[]` state-setter type mismatch

**Recommendation:** File a follow-up quick task or phase-review item to bulk-fix the
`isRedirectError` import across the 6 affected files (likely a Next.js version upgrade
side effect) and address the other listed pre-existing type errors. None of this plan's
`must_haves` or `success_criteria` depend on these files compiling cleanly, and none of the
required files in this plan (`lib/rate-limit.ts`, `supabase/migrations/20260707_rate_limit_counters.sql`,
`app/(portal)/actions/auth.ts`, `app/api/chat/route.ts`, `lib/actions/submitAppointmentAction.ts`,
`app/(portal)/actions/staff.ts`) introduce new type errors — `npx tsc --noEmit` shows zero new
errors attributable to this plan's diff.
