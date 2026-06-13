---
id: "07-02"
phase: 7
plan: 2
title: "Portal Appointments Management"
status: complete
completed: "2026-06-12"
---

## One-liner

Built the portal `AppointmentsClient` with a 4-tab status view (pending/contacted/confirmed/cancelled) and inline status updates, wired to a role-guarded Server Action using `createAdminClient()` to bypass RLS.

## What was built

- **`lib/db/appointment_requests.ts`** — `AppointmentRequest` type + `getAppointmentRequests()` DB query using `adminClient` (service role) to fetch all requests with joined doctor name.
- **`app/(portal)/actions/appointments.ts`** — `updateAppointmentStatusAction(id, status, notes?)` with `requireAppointmentRole()` auth gate (super_admin, admin, receptionist) and `createAdminClient()` for the DB update.
- **`components/portal/AppointmentsClient.tsx`** — Client Component with 4 status tabs (each showing record count), expandable row details, inline status `Select` + optional callback notes textarea, and "Save Status" button calling the Server Action.
- **`app/(portal)/appointments/page.tsx`** — Server Component fetching all requests server-side, rendering `AppointmentsClient`.

## Key decisions / fixes

- All DB writes use `createAdminClient()` (service role) — the established portal write pattern. Regular `createClient()` hits RLS and silently blocks updates (same root cause fixed across all portal write actions in this milestone).
- No hard delete — status transitions only (pending → contacted → confirmed / cancelled).
- `<Toaster />` added to `app/(portal)/layout.tsx` as part of UAT bug fix (was missing entirely).

## Files changed

- `lib/db/appointment_requests.ts` (new)
- `app/(portal)/actions/appointments.ts` (new)
- `components/portal/AppointmentsClient.tsx` (new)
- `app/(portal)/appointments/page.tsx` (new)
- `app/(portal)/layout.tsx` (Toaster added — UAT fix)
