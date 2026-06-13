---
id: "07-01"
phase: 7
plan: 1
title: "DB Migration + Public Form Wiring"
status: complete
completed: "2026-06-12"
---

## One-liner

Created the `appointment_requests` table and wired the public `AppointmentForm` to a Server Action with hCaptcha verification (vanilla JS API for React 19 compatibility).

## What was built

- **`supabase/migrations/20260612_appointment_requests.sql`** — `appointment_requests` table with columns: `id`, `patient_name`, `phone`, `preferred_doctor_id` (FK → doctors), `preferred_time` (enum: morning/afternoon/evening), `notes`, `status` (default `pending`), `callback_notes`, `created_at`, `updated_at`. RLS: public INSERT only; portal roles SELECT/UPDATE.
- **`lib/actions/submitAppointmentAction.ts`** — Server Action validating hCaptcha token server-side before inserting record; returns `{ error? }`.
- **`components/public/AppointmentForm.tsx`** — Client Component with react-hook-form, controlled `Select` for `preferredTime` (3 OPD slots), live doctor dropdown from DB, and hCaptcha widget (vanilla JS API — `@hcaptcha/react-hcaptcha` dropped for React 19 compatibility). Success/error toasts via Sonner.
- **`app/[locale]/(public)/appointment/page.tsx`** — Server Component pre-fetching active doctors, rendering `AppointmentForm`.

## Key decisions / fixes

- hCaptcha uses vanilla JS `hcaptcha.execute()` / `hcaptcha.render()` via `useEffect` — the React 19-compatible approach after `@hcaptcha/react-hcaptcha` caused peer-dep errors.
- `preferredTime` Select uses controlled `value` + `onValueChange` (not `defaultValue`) to avoid Radix "uncontrolled" warning.

## Files changed

- `supabase/migrations/20260612_appointment_requests.sql` (new)
- `lib/actions/submitAppointmentAction.ts` (new)
- `components/public/AppointmentForm.tsx` (new)
- `app/[locale]/(public)/appointment/page.tsx` (new)
