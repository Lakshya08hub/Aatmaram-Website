# Atmaram Child Care and Critical Care — Hospital Website + Management Portal

## What This Is

A professional bilingual (EN/HI) hospital website for Atmaram Child Care and Critical Care, Kanpur, UP — a 90-bed super-specialty Ayushman Bharat PM-JAY empanelled hospital. The public site is the paid client deliverable (₹45-50K); the management portal (staff management, patient records, payroll, analytics) is a gift to the client built alongside the public site.

## Core Value

A credible, professional online presence for the hospital that lets patients find information, request appointments, and get answers — while giving hospital staff a single portal to manage everything.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Public hospital website with all department and doctor information
- [ ] Bilingual EN/HI with auto browser language detection and manual toggle
- [ ] Appointment request form (staff calls back to confirm)
- [ ] Gemini-powered chat widget answering hospital info questions
- [ ] Role-based management portal (Admin, Doctor, Receptionist)
- [ ] Staff management (add/edit/remove, feeds public site doctor profiles)
- [ ] Patient records (receptionist creates, doctor adds clinical notes)
- [ ] Monthly payroll tracker (mark-as-paid, history)
- [ ] Analytics dashboard (GA embed + appointment ops + staff summary)
- [ ] All public content editable from the portal (departments, facilities, doctors)

### Out of Scope

- Full slot booking with real-time availability — hospital not operationally ready; v2 with separate quote
- Payslip generation with PF/ESI/TDS calculations — error-prone compliance math; v2
- Staff attendance tracking — no input system exists; v2
- Billing/invoicing — different product entirely
- Pharmacy/inventory management — different product entirely
- Lab results management — requires diagnostics integrations

## Context

- **Hospital:** Atmaram Child Care and Critical Care, Naubasta/Kidwai Nagar, Kanpur-208021, UP
- **Scale:** ~25-30 doctors, 90-bed capacity
- **Accreditation:** Ayushman Bharat PM-JAY empanelled — prominent trust signal on public site
- **Specialties:** Paediatrics, Paediatric Surgery, Critical Care, General Surgery, Orthopaedics, Obs & Gynae, General Medicine, Emergency, Polytrauma
- **Existing website:** Dead (DNS failure) — building from scratch
- **Client relationship:** Developer's best friend's father — public site is paid deliverable, portal is a gift
- **Solo developer** building phase by phase via GSD + Claude Code
- **Domain:** Client owns a domain (exact name TBD); use localhost for dev

## Constraints

- **Tech Stack:** Next.js (App Router) + TypeScript + Tailwind + Supabase (Auth + Postgres) + Gemini API — decided
- **i18n:** next-intl with `[locale]` routing, default locale Hindi — decided
- **Portal routing:** Outside `[locale]` segment (English-only internal tool) — decided
- **Appointment booking:** Option B only (request form + staff callback) — no slot reservation in v1
- **Gemini chat:** Public site only, hospital info only, zero patient data access — compliance constraint
- **Payroll:** Monthly tracker only — no Indian compliance math (PF/ESI/TDS) — decided
- **Patient records:** Lightweight EMR only — no billing, lab results, insurance — decided
- **Budget:** ₹45-50K for public website; portal is unpaid gift — no budget creep possible
- **Timeline:** No hard deadline from client; realistic solo-dev estimate 10-14 weeks

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Bilingual EN/HI with auto-detect | Kanpur patient base is Hindi-first; browser detection removes friction | — Pending |
| Default locale: Hindi | Primary patient demographic; English as fallback | — Pending |
| Portal outside [locale] segment | Portal is English-only; avoids locale overhead on auth routes | — Pending |
| Appointment booking: request form only | Hospital not operationally ready for slot management | — Pending |
| Gemini chat: public-facing only | Patient data to third-party API = PHI compliance violation | — Pending |
| Payroll: mark-as-paid tracker | Wrong payslip worse than no payslip; v2 for compliance math | — Pending |
| Patient records: lightweight EMR | Full EMR is a standalone product; scope control | — Pending |
| Analytics: GA embed + ops dashboard | Don't build what you can embed for free | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-10 after initialization*
