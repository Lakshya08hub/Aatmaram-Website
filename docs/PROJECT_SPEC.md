# Atmaram Child Care and Critical Care — Website + Management Portal
**Project Spec v1.0 | 2026-06-10**

---

## Project Overview

A two-part system for Atmaram Child Care and Critical Care, Kanpur, UP:

1. **Public Hospital Website** — professional marketing/info site for patients. The paid client deliverable.
2. **Management Portal** — internal tool for hospital staff and admin. A gift to the client, built in parallel.

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (Auth + Postgres) + Gemini API  
**Budget:** ₹45–50K INR (public website only — portal is unpaid gift)  
**Timeline:** 10–14 weeks solo  
**Developer:** Solo dev via GSD phase-by-phase execution

---

## Hospital Facts

- **Name:** Atmaram Child Care and Critical Care
- **Location:** 53/128 Y Block, Near Naubasta Bypass Chauraha, Kidwai Nagar, Naubasta, Kanpur – 208021, UP
- **Type:** Super-specialty hospital, 90-bed capacity
- **Specialties:** Paediatrics, Paediatric Surgery, Critical Care, General Surgery, Orthopaedics, Obs & Gynae, General Medicine, Emergency, Polytrauma
- **Accreditation:** Ayushman Bharat PM-JAY empanelled
- **Scale:** ~25–30 doctors
- **Rating:** 4.1/5

---

## Module Breakdown

### Module 1 — Public Website

**Pages:** Home, About, Departments, Doctors, Services/Facilities, Contact, Appointment Request

**Bilingual (EN/HI):**
- Auto-detect browser language via `Accept-Language` header on first visit
- Cookie persistence across pages
- Manual toggle always visible in header
- Default locale: Hindi (primary patient demographic is Hindi-speaking)
- English content written by dev; Gemini-assisted Hindi translation with medical term review

**Dynamic content:** All departments, doctors, facilities, timings, contact info editable from the portal. Nothing hardcoded on the public site.

**Ayushman Bharat PM-JAY badge** featured prominently (key trust signal).

**SEO:** Structured data (JSON-LD), meta tags, Open Graph, Kanpur-targeted keywords.

**Appointment Request Form (Option B — not full slot booking):**
- Patient fills: name, phone, preferred doctor, preferred date/time, reason
- Submitted to Supabase, status starts as "Pending"
- Staff calls patient back to confirm — no automatic slot reservation
- Designed so schema supports upgrade to full slot booking in v2 without rewrite

**Gemini Chat Widget:**
- Public site only — answers visitor questions about departments, timings, services, booking guidance
- Knowledge base: hospital public info only (no Supabase data access, no patient data)
- Fallback: "Please call [number] for more information"

---

### Module 2 — Auth + Roles

- **Provider:** Supabase Auth
- **Roles:** Super Admin, Admin, Doctor, Receptionist
- Staff accounts require Admin approval before any portal access (not self-serve)
- Role-based middleware protects all portal routes
- Login page is portal-only, not on public site

---

### Module 3 — Staff Management (Admin)

- Add / edit / remove staff (doctors, nurses, receptionists)
- Approve or reject pending account requests
- Doctor profiles feed directly to the public website (name, specialization, photo, bio, availability days)
- Staff profile fields: name, role, contact, salary, join date, photo

---

### Module 4 — Public Content Management (Admin)

- Departments: name, description, icon/image
- Facilities and services list
- Hospital info: about text, OPD timings, emergency number, contact details
- All changes reflect on public site immediately (no build step required)

---

### Module 5 — Patient Records (Lightweight EMR)

**Receptionist creates:**
- Name, age, phone, reason for visit, assigned doctor, date of visit

**Doctor adds (their patients only):**
- Medications prescribed, treatment notes

**Access rules:**
- Doctor: sees only patients assigned to them
- Receptionist: creates records, sees all for check-in purposes
- Admin / Super Admin: sees all patients

**Hard scope boundary — NOT included:**
- Billing / invoicing
- Lab results
- Insurance / Ayushman claim tracking
- Document/scan uploads (v2)

---

### Module 6 — Appointment Request Management

- Receptionist sees all incoming requests from the public site
- Status flow: `Pending → Contacted → Confirmed / Cancelled`
- Fields visible: patient name, phone, preferred doctor, preferred time, reason
- Simple list/table view — no calendar, no slot reservation

---

### Module 7 — Monthly Payroll Tracker

- Staff list with monthly salary amounts
- Admin marks each staff member as "Paid" per calendar month
- Payment history per staff member
- Monthly payroll total summary card on analytics dashboard

**Hard scope boundary — NOT included:**
- PF / ESI / TDS deduction calculations
- Payslip generation (v2)
- Bank transfer integration (v2)
- Form 16 or compliance filings (v2)

---

### Module 8 — Analytics Dashboard

Single dashboard page in the portal with three sections:

1. **Website Traffic** — Google Analytics embed (GA4 script tag, zero custom dev work)
2. **Appointment Operations** — request count by day/week, by doctor, by status
3. **Staff + Payroll Summary** — total staff by role, current month payroll total

---

### Module 9 — Gemini Chat (Public Site)

- Floating chat widget on all public pages
- System prompt: hospital name, departments, doctors list, timings, services, FAQ, how to book
- **No Supabase queries — no patient data, no staff data reaches the API**
- Fallback response when question is out of scope
- API route: `app/api/chat/route.ts`

---

## Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Appointment booking | Option B — request form, staff calls back | Hospital not operationally ready for slot management; schema allows v2 upgrade |
| Language | Bilingual auto-detect EN/HI, default HI | Kanpur patient base is Hindi-first |
| Gemini chat placement | Public-facing only | Staff-facing with patient data = PHI to third-party API = compliance violation |
| Payroll | Monthly tracker, mark-as-paid only | Payslip with PF/ESI/TDS math is error-prone; wrong payslip is worse than no payslip |
| Patient records scope | Lightweight EMR only | Full EMR is a standalone product |
| Website analytics | GA4 embed | Don't build what you can embed for free |
| Full slot booking | **Deferred → v2 / separate quote** | 2-week feature, hospital needs operational readiness |
| Payslip generation | **Deferred → v2 / separate quote** | Indian compliance math, legally sensitive |
| Staff attendance | **Deferred → v2 / separate quote** | No attendance input system to feed it |
| Billing / invoicing | **Out of scope permanently** | Different product |
| Pharmacy / inventory | **Out of scope permanently** | Different product |
| Lab results | **Out of scope permanently** | Requires diagnostics system integrations |

---

## Client Content Checklist (gather before Phase 2)

Before building the public site with real content:

- [ ] Hospital logo file
- [ ] Brand colors (from letterhead, pamphlet, or existing materials)
- [ ] Hospital photos (interior, exterior, OT, ICU, wards — phone photos OK)
- [ ] Doctor headshots (at minimum senior/founding doctors)
- [ ] Full list of department names
- [ ] Hospital founding year + short origin story (for About page)
- [ ] OPD timings
- [ ] Emergency line number and main phone
- [ ] Ayushman Bharat empanelment number
- [ ] Domain status — `atmaramchildcareandcriticalcare.com` returning DNS errors; confirm if owned or need to register

---

## Phase Order

| Phase | Scope |
|---|---|
| 1 | Project setup — Next.js + Supabase + Tailwind + folder structure + env config |
| 2 | Public website — all pages with placeholder/seeded content, design system |
| 3 | Bilingual system — next-intl, EN/HI content files, auto-detect, cookie, toggle |
| 4 | Auth + roles — Supabase Auth, 4 roles, approval flow, protected portal routes |
| 5 | Content management — departments, doctors, facilities editable from portal, fed to public site |
| 6 | Staff management — add/edit/remove staff, doctor profiles sync to public site |
| 7 | Appointment request system — public form + portal management view + status flow |
| 8 | Patient records — receptionist creates, doctor adds notes, role-scoped views |
| 9 | Payroll tracker — monthly salary tracking, mark as paid, history |
| 10 | Analytics dashboard — GA embed + ops numbers + staff summary |
| 11 | Gemini chat — widget on public site, hospital info knowledge base |
