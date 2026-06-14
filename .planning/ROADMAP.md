# Roadmap: Atmaram Child Care and Critical Care — Website + Management Portal

## Overview

Eleven sequential phases take this project from a blank Next.js repo to a fully operational bilingual hospital website with an integrated management portal. The first three phases establish the public-facing deliverable (the paid client work). Phases 4 through 11 layer in the full portal capabilities that are the gift to the client. Each phase delivers a coherent, independently verifiable capability before the next begins.

## Phases

**Phase Numbering:**
- Integer phases (1–11): Planned milestone work
- Decimal phases (e.g., 2.1): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Project Setup** - Next.js + Supabase + Tailwind + folder structure + env config *(completed 2026-06-10)*
- [x] **Phase 2: Public Website** - All pages with placeholder/seeded content and design system *(completed 2026-06-10)*
- [ ] **Phase 3: Bilingual System** - next-intl, EN/HI content files, auto-detect, cookie, toggle
- [x] **Phase 4: Auth + Roles** - Supabase Auth, 4 roles, approval flow, protected portal routes (completed 2026-06-12)
- [ ] **Phase 5: Content Management** - Departments, doctors, facilities editable from portal, fed to public site
- [ ] **Phase 6: Staff Management** - Add/edit/remove staff, doctor profiles sync to public site
- [ ] **Phase 7: Appointment Request System** - Public form + portal management view + status flow
- [x] **Phase 8: Patient Records** - Receptionist creates, doctor adds notes, role-scoped views (completed 2026-06-13)
- [ ] **Phase 9: Payroll Tracker** - Monthly salary tracking, mark as paid, history
- [ ] **Phase 10: Analytics Dashboard** - GA embed + ops numbers + staff summary
- [ ] **Phase 11: Gemini Chat** - Widget on public site, hospital info knowledge base
- [ ] **Phase 12: Homepage Content Curation** - Replace hardcoded homepage sections with Supabase-sourced, admin-curated content; featured toggles for departments (max 8) and doctors (max 3)

---

## Phase Details

### Phase 1: Project Setup
**Goal**: A running, deployable Next.js project with all foundational tooling configured and environment variables wired
**Depends on**: Nothing (first phase)
**Requirements**: *(No direct v1 REQ-IDs — foundational infra enabling all subsequent phases)*
**Success Criteria** (what must be TRUE):
  1. `npm run dev` starts the app without errors on localhost
  2. Supabase project is created, `.env.local` contains valid keys, and a test query returns without error
  3. Tailwind CSS renders styles correctly on a placeholder page
  4. Folder structure matches the App Router + `[locale]` + `/portal` routing architecture
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Scaffold project, install dependencies, create three-zone folder structure and placeholder pages
- [x] 01-02-PLAN.md — Create Supabase project (human checkpoint), wire .env.local, verify connection

### Phase 2: Public Website
**Goal**: Every public-facing page exists and renders correctly with placeholder/seeded content and a consistent design system
**Depends on**: Phase 1
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04, PUB-05, PUB-06, PUB-07, PUB-08
**Success Criteria** (what must be TRUE):
  1. Visitor can navigate to all 7 pages (Home, About, Departments, Doctors, Services, Contact, Appointment Request) without 404s
  2. Ayushman Bharat PM-JAY badge is visible and prominent on the site
  3. All pages share a consistent header, footer, and design system (typography, colors, spacing)
  4. Appointment request form renders with all required fields and submits without error
**Plans**: 6 plans
**UI hint**: yes

Plans:
- [x] 02-01-PLAN.md — shadcn/ui init, design tokens, Geist font wire, (public) layout, translation namespaces
- [x] 02-02-PLAN.md — Seeded data constants (departments/doctors/services) + all shared components (Header, Footer, DepartmentCard, DoctorCard, PMJAYBadge, SectionHeading)
- [x] 02-03-PLAN.md — Home page (replaces smoke test, includes PM-JAY badge) + About page
- [x] 02-04-PLAN.md — Departments page + Doctors page
- [x] 02-05-PLAN.md — Services page (with Ayushman Bharat section) + Contact page
- [x] 02-06-PLAN.md — Appointment form (react-hook-form + Zod + Sonner) + human verification checkpoint

### Phase 3: Bilingual System
**Goal**: The entire public site is available in both English and Hindi, with automatic language detection and persistent manual override
**Depends on**: Phase 2
**Requirements**: I18N-01, I18N-02, I18N-03, I18N-04, I18N-05
**Success Criteria** (what must be TRUE):
  1. Visitor arriving with a Hindi browser preference sees Hindi content immediately without any manual action
  2. Visitor can toggle language in the header and the switch persists across page navigation and new browser sessions
  3. Every heading, body text, label, and call-to-action on every public page has an EN and HI version
  4. Default locale falls back to Hindi when the browser language is ambiguous or unsupported
**Plans**: 7 plans
**UI hint**: yes

Plans:

**Wave 1** *(no dependencies — run in parallel)*
- [x] 03-01-PLAN.md — Create i18n/navigation.ts (createNavigation module) + add Devanagari font fallback to globals.css
- [x] 03-02-PLAN.md — Write complete messages/hi.json (all 177 strings translated to Hindi)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 03-03-PLAN.md — Create LanguageToggle component + migrate Header.tsx and MobileNav.tsx to locale-aware navigation

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 03-04-PLAN.md — Pre-build verification + human browser test (5 I18N requirement checks)

**Wave 4** *(gap closure — page bodies were never wired to translations; I18N-05 / Success Criterion 3 incomplete)*
- [ ] 03-05-PLAN.md — Migrate Home + About page bodies to consume translation keys
- [ ] 03-06-PLAN.md — Migrate Departments + Doctors pages and their cards (key seeded constants) to translations
- [ ] 03-07-PLAN.md — Migrate Services + Contact + Appointment-header to translations (add service/facility item keys)

### Phase 4: Auth + Roles
**Goal**: Staff can securely log in to the portal and are restricted to portal sections appropriate for their role
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. Staff member can log in with email and password and land on the portal dashboard
  2. Unauthenticated user attempting to access any portal route is redirected to the login page
  3. New staff account created via sign-up cannot access the portal until an Admin approves it
  4. Each of the four roles (Super Admin, Admin, Doctor, Receptionist) sees only the portal sections they are permitted to access
**Plans**: 3 plans

Plans:

**Wave 1** *(no dependencies)*
- [x] 04-01-PLAN.md - Auth foundation: branching middleware.ts (replaces proxy.ts), profiles migration + RLS, role config (lib/portal/roles.ts), login/logout Server Actions

**Wave 2** *(blocked on 04-01; parallel - no file overlap)*
- [x] 04-02-PLAN.md - Auth-guarded portal layout + role-scoped Sidebar + role-aware dashboard + six section stubs
- [x] 04-03-PLAN.md - Login route at app/login/ (outside portal guard) + LoginForm + human verification

### Phase 5: Content Management
**Goal**: All public site content (departments, doctors, facilities, hospital info) is driven from Supabase and editable by Admin via the portal with immediate reflection on the public site
**Depends on**: Phase 4
**Requirements**: DYN-01, DYN-02, DYN-03, DYN-04, CMS-01, CMS-02, CMS-03, CMS-04
**Success Criteria** (what must be TRUE):
  1. Admin can add a new department from the portal and it appears on the public Departments page without a build step
  2. Admin can edit hospital OPD timings and the change is visible on the public Contact page immediately
  3. Admin can add, edit, or remove a facility and the Services page reflects the change in real time
  4. No department, doctor, facility, or hospital info value is hardcoded in the public site — all sourced from Supabase
**Plans**: 5 plans
**UI hint**: yes

Plans:

**Wave 1** *(no dependencies — foundation)*
- [x] 05-01-PLAN.md — DB schema migration (4 CMS tables + RLS) + admin client + env + roles.ts content section [has checkpoint]

**Wave 2** *(blocked on 05-01 — parallel, no file overlap)*
- [x] 05-02-PLAN.md — Portal Departments CRUD (lib/db + Server Actions + Table + Dialog + AlertDialog)
- [x] 05-03-PLAN.md — Portal Doctors CRUD (lib/db + Server Actions + Table + Sheet)
- [x] 05-04-PLAN.md — Portal Facilities CRUD + Hospital Info single-record form

**Wave 3** *(blocked on 05-02, 05-03, 05-04 — lib/db must exist)*
- [ ] 05-05-PLAN.md — Convert 4 public pages from static constants to Supabase DB reads (force-dynamic)

### Phase 6: Staff Management
**Goal**: Admin can manage the full staff roster from the portal, and doctor profile edits automatically update the public-facing Doctors page
**Depends on**: Phase 4
**Requirements**: STAFF-01, STAFF-02, STAFF-03, STAFF-04, STAFF-05
**Success Criteria** (what must be TRUE):
  1. Admin can create a new staff member with all required fields and the staff member appears in the portal roster
  2. Admin can deactivate a staff member and that account loses portal access
  3. Admin can view and act on pending account approval requests from the portal
  4. Editing a doctor's specialization, bio, or photo in the portal is immediately reflected on the public Doctors page
**Plans**: TBD
**UI hint**: yes

### Phase 7: Appointment Request System
**Goal**: Visitors can submit appointment requests from the public site and receptionists can manage those requests through a full status workflow in the portal
**Depends on**: Phase 4
**Requirements**: APT-01, APT-02, APT-03, APMT-01, APMT-02, APMT-03
**Success Criteria** (what must be TRUE):
  1. Visitor submits the appointment form and sees a confirmation message; the request appears in Supabase with status "Pending"
  2. Receptionist can view all incoming appointment requests in the portal with name, phone, preferred doctor, time, and reason visible
  3. Receptionist can move a request through the status flow: Pending → Contacted → Confirmed or Cancelled
**Plans**: TBD
**UI hint**: yes

### Phase 8: Patient Records
**Goal**: Receptionists can create patient records and doctors can add clinical notes, with each role seeing only what their access level permits
**Depends on**: Phase 4
**Requirements**: PAT-01, PAT-02, PAT-03, PAT-04, PAT-05
**Success Criteria** (what must be TRUE):
  1. Receptionist can create a patient record with all required fields (name, age, phone, reason, assigned doctor, date)
  2. Doctor logs in and sees only patients assigned to them — no other patient records are visible
  3. Doctor can add medication and treatment notes to their patients' records
  4. Admin or Super Admin can view all patient records regardless of assigned doctor
**Plans**: 3 plans
**UI hint**: yes

Plans:
- [x] 08-01-PLAN.md — DB migration: patient_records table + blocking schema push
- [x] 08-02-PLAN.md — Data layer + server actions (lib/db/patient_records.ts, actions/patients.ts)
- [x] 08-03-PLAN.md — PatientClient component + portal page with role-aware field rendering

### Phase 9: Payroll Tracker
**Goal**: Admin can track monthly salary payments for all staff and view payment history per staff member
**Depends on**: Phase 6
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04
**Success Criteria** (what must be TRUE):
  1. Admin sees a list of all staff with their monthly salary amounts on the payroll page
  2. Admin can mark a staff member as "Paid" for the current calendar month
  3. Admin can view payment history per staff member across previous months
  4. A summary card displays the total payroll cost for the current month
**Plans**: TBD
**UI hint**: yes

### Phase 10: Analytics Dashboard
**Goal**: Admin has a single portal page with website traffic, appointment operations data, and staff/payroll summary
**Depends on**: Phase 7, Phase 9
**Requirements**: ANA-01, ANA-02, ANA-03, ANA-04
**Success Criteria** (what must be TRUE):
  1. Analytics page loads a live Google Analytics GA4 embed showing website traffic without custom dev work
  2. Portal displays appointment request counts grouped by day/week, by doctor, and by status
  3. Portal shows total staff count by role and the current month payroll total
  4. Portal shows patient volume: new patients registered per week and per month
**Plans**: 2 plans
**UI hint**: yes

Plans:

**Wave 1** *(no dependencies)*
- [ ] 10-01-PLAN.md — GA4 property setup (human checkpoint) + gtag snippet in public site root layout [has checkpoint]

**Wave 2** *(blocked on 10-01)*
- [ ] 10-02-PLAN.md — lib/db/analytics.ts query functions + /analytics Server Component page (four-section render)

### Phase 11: Gemini Chat
**Goal**: A floating chat widget on every public page answers visitor questions about the hospital using only public information, with no access to patient or staff data
**Depends on**: Phase 2
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04
**Success Criteria** (what must be TRUE):
  1. A floating chat widget is visible on every public page without obstructing navigation
  2. Visitor can ask about departments, timings, services, or how to book and receive an accurate answer
  3. Chat widget makes no Supabase queries — it operates entirely from a static system prompt containing public hospital info
  4. When a question is out of scope, the widget responds with the hospital phone number rather than hallucinating
**Plans**: 2 plans
**UI hint**: yes

Plans:

**Wave 1** *(no dependencies)*
- [ ] 11-01-PLAN.md — @google/genai install + hospital knowledge base (lib/chat/hospital-knowledge.ts) + streaming Gemini Route Handler (app/api/chat/route.ts) [has checkpoint: package legitimacy]

**Wave 2** *(blocked on 11-01)*
- [ ] 11-02-PLAN.md — ChatWidget Client Component (components/public/ChatWidget.tsx) + mount in public layout [has checkpoint: end-to-end smoke test]

### Phase 12: Homepage Content Curation
**Goal**: Replace all hardcoded static data on the public homepage with Supabase-sourced, portal-curated content — eliminating the redundancy between homepage sections and their dedicated portal-managed pages
**Depends on**: Phase 5
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. Homepage "Our Departments" grid pulls featured departments from Supabase (not `lib/data/departments.ts`); admin can toggle each department as featured (max 8) from the portal
  2. Homepage "Meet Our Doctors" section pulls featured doctors from Supabase (not `lib/data/doctors.ts`); admin can toggle up to 3 doctors as featured from the portal
  3. `/departments` and `/doctors` pages continue to show all active records regardless of featured status
  4. `lib/data/departments.ts` and `lib/data/doctors.ts` are no longer imported anywhere in the public site
**Plans**: 4 plans
**UI hint**: yes

Plans:

**Wave 1** *(no dependencies)*
- [x] 12-01-PLAN.md — Migration (featured columns) + getFeatured* DB query functions

**Wave 2** *(blocked on 12-01 — parallel, no file overlap)*
- [x] 12-02-PLAN.md — FacilityCard component + homepage wired to Supabase (force-dynamic, three sections)
- [x] 12-03-PLAN.md — Portal featured toggle UI + Server Actions (departments, doctors, facilities)

**Wave 3** *(blocked on Wave 2)*
- [ ] 12-04-PLAN.md — Schema push (BLOCKING) + stale file deletion + human verification [has checkpoint]

**Bugs driving this phase (found 2026-06-13):**
- `app/[locale]/(public)/page.tsx:10` — imports hardcoded `departments` from `lib/data/departments.ts` instead of Supabase
- `app/[locale]/(public)/page.tsx:11` — imports hardcoded `doctors` from `lib/data/doctors.ts` instead of Supabase
- Root cause: Phase 5 plan `05-05-PLAN.md` (convert public pages to DB) was never completed for the homepage

---

## Progress

**Execution Order:** Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Setup | 2/2 | Complete | 2026-06-10 |
| 2. Public Website | 0/6 | Planned | - |
| 3. Bilingual System | 4/7 | In progress | - |
| 4. Auth + Roles | 3/3 | Complete   | 2026-06-12 |
| 5. Content Management | 4/5 | In Progress|  |
| 6. Staff Management | 0/TBD | Not started | - |
| 7. Appointment Request System | 0/TBD | Not started | - |
| 8. Patient Records | 3/3 | Complete   | 2026-06-13 |
| 9. Payroll Tracker | 0/4 | Planned | - |
| 10. Analytics Dashboard | 0/TBD | Not started | - |
| 11. Gemini Chat | 0/2 | Planned | - |
| 12. Homepage Content Curation | 3/4 | In Progress|  |
