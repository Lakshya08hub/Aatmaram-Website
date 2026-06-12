# Phase 7: Appointment Request System - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-12
**Phase:** 07-Appointment Request System
**Areas discussed:** Form submission wiring, Preferred time field, Portal appointments view, Status flow rules, Public form auth & RLS, Spam prevention, Delete policy

---

## Form Submission Wiring

| Option | Description | Selected |
|--------|-------------|----------|
| Server Action | Consistent with Phase 5/6 patterns — no new API route | ✓ |
| Route Handler (/api/appointments) | Matches the TODO comment in AppointmentForm.tsx | |

**User's choice:** Server Action

---

## Doctor Dropdown Source

| Option | Description | Selected |
|--------|-------------|----------|
| Live DB via getDoctors() | Phase 5 already built it; new portal-added doctors appear immediately | ✓ |
| Keep static lib/data/doctors | Simpler but inconsistent with portal-managed doctors | |

**User's choice:** Live DB (getDoctors() from lib/db/doctors.ts)

---

## Preferred Time Field

| Option | Description | Selected |
|--------|-------------|----------|
| OPD timing slot dropdown | Morning/Afternoon/Evening OPD slots — matches Contact page schedule | ✓ |
| Date only, no time | Simpler; staff confirms time on callback | |
| Free text preferred time | Maximum flexibility | |

**User's choice:** OPD slot dropdown (Morning OPD 9am–12pm, Afternoon OPD 12–3pm, Evening OPD 3–6pm)

---

## Portal Appointments View

| Option | Description | Selected |
|--------|-------------|----------|
| Table + status filter tabs | Mirrors Staff page pattern; tabs for Pending/Contacted/Confirmed/Cancelled | ✓ |
| Table with inline status Select | Single table, all statuses together | |
| Card grid with detail sheet | More complex, better for high volume | |

**User's choice:** Table + status filter tabs

### Notes field on status update

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, optional callback notes | Short text field for receptionist notes; lightweight audit trail | ✓ |
| No, status only | Simpler | |

**User's choice:** Yes, optional callback notes

---

## Status Flow Rules

### Who can change status

| Option | Description | Selected |
|--------|-------------|----------|
| Receptionist + Admin | Both roles see Appointments per D-07; Admin can cover in receptionist's absence | ✓ |
| Receptionist only | Cleaner separation, more friction when receptionist unavailable | |

**User's choice:** Receptionist + Admin

### Transition direction

| Option | Description | Selected |
|--------|-------------|----------|
| Any → any transitions | Staff can correct mistakes; notes provide audit trail | ✓ |
| Forward only | Stricter; harder to correct mistakes | |

**User's choice:** Any → any

---

## Public Form Auth & RLS

| Option | Description | Selected |
|--------|-------------|----------|
| Service role insert | Server Action uses createAdminClient(); no public-write RLS needed | ✓ |
| RLS: allow public inserts | Simpler but exposes table to PostgREST abuse | |

**User's choice:** Service role insert via createAdminClient()

---

## Spam Prevention

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing | Form is low-traffic; receptionists review every submission manually | |
| Phone number dedup warning | Soft warning if same phone submitted in 24h | |
| hCaptcha | Supabase native integration; free tier 1M req/month | ✓ |

**User's choice:** hCaptcha (over reCAPTCHA — native Supabase integration is simpler)

---

## Delete Policy

| Option | Description | Selected |
|--------|-------------|----------|
| Status change only, no hard delete | Cancelled = soft-delete; records persist for Phase 10 analytics | ✓ |
| Allow delete for old/cancelled requests | Cleaner table, but loses analytics data | |

**User's choice:** No hard delete; Cancelled status is terminal

---

## Claude's Discretion

None — all areas had explicit user decisions.

## Deferred Ideas

- WhatsApp/SMS/email notifications to patients — v2 (requires Twilio or similar)
- Real-time slot booking with double-booking prevention — v2 SLOT-01 through SLOT-04
- Rate limiting beyond hCaptcha
- Patient-side appointment history (return visitor tracking) — v2
