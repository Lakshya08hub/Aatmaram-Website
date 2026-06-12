# Phase 7: Appointment Request System - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the existing public appointment form to Supabase (APT-01/02/03) and build the portal management view so receptionists can track and update appointment requests through a status workflow (APMT-01/02/03).

**In scope:**
- Connect `AppointmentForm.tsx` to a Server Action that inserts into a new `appointment_requests` table
- Add hCaptcha to the public form to prevent spam
- Add preferred time dropdown to the public form (Morning / Afternoon / Evening OPD slots)
- Switch the doctor dropdown in the form from static `lib/data/doctors` to live Supabase DB
- Create `app/(portal)/appointments/` page: tab-filtered table view of all requests with status management
- Status workflow: Pending → Contacted → Confirmed / Cancelled (any→any transitions allowed)
- Optional callback notes field when receptionist updates status
- No hard delete: Cancelled = soft-delete equivalent; records persist for Phase 10 analytics

**Out of scope:**
- Real slot booking / double-booking prevention (v2 SLOT-01 through SLOT-04)
- Automated notifications (WhatsApp/SMS/email) to patients
- Appointment reminders or scheduling calendar
- Rate limiting beyond hCaptcha

</domain>

<decisions>
## Implementation Decisions

### Form Submission
- **D-01:** `AppointmentForm.onSubmit` calls a Server Action (`'use server'`) — consistent with all Phase 5/6 patterns. No Route Handler.
- **D-02:** The Server Action uses `createAdminClient()` (service role) to insert into `appointment_requests`, bypassing RLS entirely. Public-write RLS policy not needed.
- **D-03:** hCaptcha added to the public form. Supabase natively integrates hCaptcha — enable in Supabase dashboard, verify token server-side in the Server Action.

### Public Form Updates
- **D-04:** Add a `preferredTime` Select field to `AppointmentForm.tsx` with three options: "Morning OPD (9am–12pm)", "Afternoon OPD (12–3pm)", "Evening OPD (3–6pm)".
- **D-05:** Switch the doctor dropdown from `lib/data/doctors` (static) to live Supabase DB — the page server-side fetches doctors via `getDoctors()` (already in `lib/db/doctors.ts`) and passes as props. AppointmentForm becomes a Server-Component-fed Client Component.

### Data Model
- **D-06:** New table `appointment_requests` with columns: `id`, `patient_name`, `phone`, `preferred_doctor` (text — doctor name stored, not FK, since visitors may pick "No preference"), `preferred_date`, `preferred_time`, `reason`, `status` (enum: 'pending' | 'contacted' | 'confirmed' | 'cancelled'), `notes` (text nullable — receptionist callback notes), `created_at`.

### Portal View
- **D-07:** Appointments portal page uses 4 status tabs: Pending / Contacted / Confirmed / Cancelled. Each tab shows a table with: patient name, phone, preferred doctor, preferred date + time, reason, and action buttons.
- **D-08:** Action buttons per row: a status Select dropdown (any → any transitions; no forward-only constraint) + an optional notes textarea that appears when status changes.
- **D-09:** No hard delete. Status change to 'Cancelled' is the terminal action. Records stay for Phase 10 analytics.

### Access Control
- **D-10:** Both Receptionist and Admin can view and update appointment status (per D-07 from Phase 4 — both roles see the Appointments section).
- **D-11:** Public submission has no auth. The Server Action inserts via service role client — no session required.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Appointment Request (APT-01 through APT-03) — public form requirements
- `.planning/REQUIREMENTS.md` §Appointment Request Management (APMT-01 through APMT-03) — portal management requirements

### Project Context
- `.planning/PROJECT.md` — Stack decisions, constraints (Option B booking, no slot reservation in v1)
- `.planning/ROADMAP.md` §Phase 7 — Success criteria and dependencies

### Existing Code to Read Before Implementing
- `components/public/AppointmentForm.tsx` — Existing form UI (already has all 5 fields + validation + toast). Line 67: TODO comment for Server Action wiring. Needs: hCaptcha widget, preferredTime field, doctor list props.
- `app/[locale]/(public)/appointment/page.tsx` — Existing appointment page. Needs: server-side getDoctors() fetch, pass to AppointmentForm.
- `app/(portal)/appointments/page.tsx` — Current stub ("Coming in Phase 7") — replace entirely.
- `lib/db/doctors.ts` — `getDoctors()` function already exists — use for doctor dropdown.
- `lib/supabase/admin.ts` — `createAdminClient()` for service-role inserts.
- `app/(portal)/actions/staff.ts` — `requireAdminRole()` pattern to replicate for portal actions.
- `app/(portal)/staff/StaffClient.tsx` — Tabs + Table + Sheet pattern to replicate for AppointmentsClient.

### Phase 4 Access Decisions
- `.planning/phases/04-auth-roles/04-CONTEXT.md` §D-07 — Role→section map: Receptionist sees Appointments; Admin sees Appointments.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/public/AppointmentForm.tsx` — Full form UI already built; needs Server Action wiring + hCaptcha + preferredTime field + doctor list props injection
- `lib/db/doctors.ts` `getDoctors()` — Ready to use for the doctor dropdown; returns `Doctor[]` with id and name
- `lib/supabase/admin.ts` `createAdminClient()` — Service-role client for the public-facing Server Action insert
- `app/(portal)/staff/StaffClient.tsx` — Tabs + Table + AlertDialog/Sheet pattern (Active/Pending tabs) — replicate for Appointments (Pending/Contacted/Confirmed/Cancelled tabs)
- `app/(portal)/actions/staff.ts` `requireAdminRole()` — Role guard pattern for portal Server Actions

### Established Patterns
- **Server Component page + Client CRUD component + Server Actions file** — the Phase 5/6 pattern; appointments portal follows this exactly
- **`export const dynamic = 'force-dynamic'`** — Required on portal pages that fetch live data
- **`toast()` + `router.refresh()`** — All mutations follow this pattern
- **shadcn/ui Tabs + Table + Sheet + AlertDialog** — All installed; StaffClient.tsx uses all of them
- **`revalidatePath()`** — Called in Server Actions after mutations

### Integration Points
- `app/[locale]/(public)/appointment/page.tsx` — Server Component, needs getDoctors() call added; passes list to AppointmentForm
- `app/(portal)/appointments/page.tsx` — Stub to replace with Server Component fetching all requests + passing to AppointmentsClient
- `middleware.ts` — No changes needed; portal route already protected by existing auth guard

</code_context>

<specifics>
## Specific Ideas

- The time dropdown uses OPD slot labels ("Morning OPD (9am–12pm)" etc.) to align with the hospital's actual schedule shown on the Contact page
- hCaptcha preferred over reCAPTCHA because Supabase natively integrates it — simpler server-side verification
- Status transitions are unconstrained (any → any) because receptionists need to correct mistakes freely; the notes field provides the audit trail
- Records never hard-deleted — Phase 10 analytics will query appointment counts by status, doctor, and date range

</specifics>

<deferred>
## Deferred Ideas

- WhatsApp/SMS/email notifications to patients — v2 (requires Twilio or similar)
- Real-time slot booking with double-booking prevention — v2 SLOT-01 through SLOT-04
- Rate limiting beyond hCaptcha — not needed for regional hospital scale
- Patient-side appointment history (return visitor tracking) — v2

</deferred>

---

*Phase: 7-Appointment Request System*
*Context gathered: 2026-06-12*
