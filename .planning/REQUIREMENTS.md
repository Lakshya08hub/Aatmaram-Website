# Requirements: Atmaram Child Care and Critical Care

**Defined:** 2026-06-10
**Core Value:** A credible, professional online presence that lets patients find information and request appointments while giving hospital staff a portal to manage everything.

---

## v1 Requirements

### Public Site — Structure

- [ ] **PUB-01**: Visitor can view Home page with hospital overview, key stats, and call-to-action
- [ ] **PUB-02**: Visitor can view About page with hospital history, founding year, and mission
- [ ] **PUB-03**: Visitor can view Departments page listing all specialties with descriptions
- [ ] **PUB-04**: Visitor can view Doctors page listing all doctors with name, specialization, photo, and bio
- [ ] **PUB-05**: Visitor can view Services/Facilities page listing hospital capabilities
- [ ] **PUB-06**: Visitor can view Contact page with address, phone, OPD timings, map embed
- [ ] **PUB-07**: Visitor can view Appointment Request page with booking form
- [ ] **PUB-08**: Ayushman Bharat PM-JAY badge displayed prominently on public site

### Public Site — Bilingual

- [ ] **I18N-01**: Site detects browser language on first visit (Accept-Language header) and serves EN or HI accordingly
- [ ] **I18N-02**: Language preference stored in cookie and persists across pages and sessions
- [ ] **I18N-03**: Manual language toggle visible in header on every page
- [ ] **I18N-04**: Default locale is Hindi (HI) when browser language is ambiguous
- [ ] **I18N-05**: All page content (headings, body text, labels, CTA) available in both EN and HI

### Public Site — Appointment Request

- [ ] **APT-01**: Visitor can submit appointment request with name, phone, preferred doctor, preferred date/time, and reason
- [ ] **APT-02**: Submitted request is stored in Supabase with status "Pending"
- [ ] **APT-03**: Visitor sees confirmation message after successful submission

### Public Site — Gemini Chat

- [ ] **CHAT-01**: Floating chat widget visible on all public pages
- [ ] **CHAT-02**: Chat answers visitor questions about departments, timings, services, doctors, and how to book
- [ ] **CHAT-03**: Chat has no access to Supabase — responds only from system prompt containing public hospital info
- [ ] **CHAT-04**: Chat falls back to phone number when question is out of scope

### Dynamic Content (Portal-driven)

- [ ] **DYN-01**: All doctor profiles on public site are sourced from Supabase (no hardcoded content)
- [ ] **DYN-02**: All department listings on public site are sourced from Supabase
- [ ] **DYN-03**: Facilities/services list on public site is sourced from Supabase
- [ ] **DYN-04**: Hospital info (about text, timings, contact) on public site is sourced from Supabase

### Auth + Roles

- [x] **AUTH-01**: Staff can log in to portal with email and password via Supabase Auth
- [x] **AUTH-02**: Four roles exist: Super Admin, Admin, Doctor, Receptionist
- [x] **AUTH-03**: New staff account requires Admin approval before portal access is granted
- [ ] **AUTH-04**: Portal routes are protected — unauthenticated users are redirected to login
- [ ] **AUTH-05**: Role-based middleware restricts portal sections by role

### Staff Management

- [ ] **STAFF-01**: Admin can add new staff member with name, role, email, phone, salary, join date
- [ ] **STAFF-02**: Admin can edit existing staff member details
- [ ] **STAFF-03**: Admin can deactivate/remove a staff member
- [ ] **STAFF-04**: Admin can view and approve/reject pending account requests
- [ ] **STAFF-05**: Doctor profile fields (name, specialization, photo, bio, availability days) are editable and feed the public site doctor listing

### Public Content Management

- [ ] **CMS-01**: Admin can add, edit, and remove departments (name, description, image)
- [ ] **CMS-02**: Admin can add, edit, and remove facilities/services
- [ ] **CMS-03**: Admin can edit hospital info (about text, OPD timings, emergency number, contact details)
- [ ] **CMS-04**: All CMS changes reflect on the public site immediately without a build step

### Patient Records

- [ ] **PAT-01**: Receptionist can create a patient record with name, age, phone, reason for visit, assigned doctor, and date
- [ ] **PAT-02**: Doctor can view only the patients assigned to them
- [ ] **PAT-03**: Doctor can add clinical notes to their patients (medications prescribed, treatment notes)
- [ ] **PAT-04**: Admin and Super Admin can view all patient records
- [ ] **PAT-05**: Receptionist can view all patient records for check-in purposes

### Appointment Request Management

- [ ] **APMT-01**: Receptionist can view all incoming appointment requests from the public site
- [ ] **APMT-02**: Receptionist can update appointment request status: Pending → Contacted → Confirmed / Cancelled
- [ ] **APMT-03**: Appointment list shows patient name, phone, preferred doctor, preferred time, reason, and current status

### Payroll Tracker

- [ ] **PAY-01**: Admin can view all staff with their monthly salary amounts
- [ ] **PAY-02**: Admin can mark each staff member as "Paid" for a given calendar month
- [ ] **PAY-03**: Payment history per staff member is viewable
- [ ] **PAY-04**: Monthly payroll total (sum of all salaries) is displayed as a summary card

### Analytics Dashboard

- [ ] **ANA-01**: Portal analytics page embeds Google Analytics (GA4 script tag) for website traffic data
- [ ] **ANA-02**: Portal shows appointment request counts by day/week, by doctor, and by status
- [ ] **ANA-03**: Portal shows staff summary: total count by role, current month payroll total
- [ ] **ANA-04**: Portal shows patient volume: new patients per week/month

---

## v2 Requirements

### Full Slot Booking

- **SLOT-01**: Doctor availability schedules configurable per doctor
- **SLOT-02**: Patient can select real-time available slots
- **SLOT-03**: Slot reservation with double-booking prevention
- **SLOT-04**: Booking confirmation notification (WhatsApp/SMS)

### Payroll Compliance

- **PAYC-01**: Automatic PF (12%) and ESI (0.75%) deduction calculation
- **PAYC-02**: TDS on salary calculation
- **PAYC-03**: Monthly payslip generation (PDF)
- **PAYC-04**: Form 16 generation

### Staff Attendance

- **ATT-01**: Daily attendance marking per staff member
- **ATT-02**: Attendance history and leave tracking
- **ATT-03**: Attendance feed into payroll calculations

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Billing / invoicing | Different product; requires integration with insurance systems |
| Pharmacy / inventory management | Different product; out of project scope |
| Lab results management | Requires integration with diagnostics systems |
| Mobile app (iOS/Android) | Web-first; native app is a separate engagement |
| Online payment collection | Requires payment gateway setup and compliance |
| Multi-branch / multi-location | Single-location hospital |
| Patient portal / patient accounts | Patients interact via public site only; staff manage records |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PUB-01 to PUB-08 | Phase 2 | Pending |
| I18N-01 to I18N-05 | Phase 3 | Pending |
| APT-01 to APT-03 | Phase 7 | Pending |
| CHAT-01 to CHAT-04 | Phase 11 | Pending |
| DYN-01 to DYN-04 | Phase 5 | Pending |
| AUTH-01 to AUTH-05 | Phase 4 | Pending |
| STAFF-01 to STAFF-05 | Phase 6 | Pending |
| CMS-01 to CMS-04 | Phase 5 | Pending |
| PAT-01 to PAT-05 | Phase 8 | Pending |
| APMT-01 to APMT-03 | Phase 7 | Pending |
| PAY-01 to PAY-04 | Phase 9 | Pending |
| ANA-01 to ANA-04 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 49 total
- Mapped to phases: 49
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-10*
*Last updated: 2026-06-10 after initial definition*
