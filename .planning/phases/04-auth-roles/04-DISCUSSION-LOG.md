# Phase 4: Auth + Roles - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-11
**Phase:** 4-Auth + Roles
**Areas discussed:** Role storage, Account creation flow, Role-to-section access map, Middleware architecture

---

## Role Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Profiles table in Postgres | `profiles` table joined to auth.users; phase 6 will need it anyway | ✓ |
| Supabase user_metadata / app_metadata | Role as JWT claim; simpler now but splits data in Phase 6 | |
| You decide | Researcher/planner picks | |

**User's choice:** Profiles table in Postgres

---

### Role storage — schema scope

| Option | Description | Selected |
|--------|-------------|----------|
| Auth columns only now, expand in Phase 6 | Phase 4: `(id, user_id, role, is_active)` only | ✓ |
| Full schema now | Create complete staff table with all fields now | |

**User's choice:** Auth columns only now, expand in Phase 6

---

## Account Creation Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Admin creates accounts directly | No self-registration; admin picks temp password | ✓ |
| Staff self-register, Admin approves | Approval queue UI, email notification required | |
| Email invite flow | Supabase magic-link invite; requires SMTP in dev | |

**User's choice:** Admin creates accounts directly

---

### First login method

| Option | Description | Selected |
|--------|-------------|----------|
| Admin sets initial password, staff changes it | No email dependency in dev | ✓ |
| Staff receives Supabase invite email | Cleaner UX but requires SMTP | |

**User's choice:** Admin sets initial password, staff logs in and changes it

---

### AUTH-03 approval reframe

| Option | Description | Selected |
|--------|-------------|----------|
| is_active flag only | Created = active; Admin deactivates later (Phase 6) | ✓ |
| Keep is_approved separate | Admin must explicitly activate after creating | |

**User's choice:** is_active flag only — no approval queue

---

## Role-to-Section Access Map

| Option | Description | Selected |
|--------|-------------|----------|
| Hierarchical — higher roles see everything below | Super Admin ≥ Admin ≥ Receptionist ≥ Doctor | ✓ |
| Strict per-role sections, no inheritance | Each role has independent section list | |
| You decide | Planner defines role matrix | |

**User's choice:** Hierarchical

---

### Sidebar sections in Phase 4

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard + section stubs | All sections present as stubs; role determines visibility | ✓ |
| Dashboard only | Sidebar built incrementally per phase | |
| You decide | Planner defines sidebar structure | |

**User's choice:** Dashboard + section stubs

---

### Role access map confirmation

Proposed map:
- Super Admin: Dashboard, Staff, Appointments, Patients, Payroll, Analytics, Settings
- Admin: Dashboard, Staff, Appointments, Patients, Payroll, Analytics
- Receptionist: Dashboard, Appointments, Patients
- Doctor: Dashboard, Patients (own only)

**User's choice:** Yes, looks right

---

## Middleware Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Single middleware.ts, matchers split by route | next-intl handles public, Supabase handles portal | ✓ |
| Auth check in portal layout server component | middleware.ts unchanged; redirect after render starts | |
| You decide | Researcher finds best pattern | |

**User's choice:** Single middleware.ts, matchers split by route

---

### Post-login landing page

| Option | Description | Selected |
|--------|-------------|----------|
| /dashboard (all roles) | Simple, consistent; dashboard is role-aware | ✓ |
| Role-specific landing page | Admin → /dashboard, Doctor → /patients, etc. | |

**User's choice:** /dashboard for all roles

---

## Claude's Discretion

None — all gray areas had explicit user choices.

## Deferred Ideas

- Password reset / forgot password UI — not needed for internal staff tool in v1
- Email invite / magic link flow — decided against
- Portal-side "Create Staff Account" form — Phase 6
- Doctor-scoped patient filtering — Phase 8
