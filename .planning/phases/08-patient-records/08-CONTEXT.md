# Phase 8: Patient Records - Context

**Gathered:** 2026-06-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a lightweight EMR in the portal: receptionists create one visit record per patient visit, doctors add a single editable clinical note per visit, and each role sees only what their access level permits (PAT-01 through PAT-05).

**In scope:**
- `patient_records` table: name, age, phone, reason for visit, assigned doctor (FK → doctors), visit date, clinical_notes (text), created_at, updated_at
- Portal `/patients` page: searchable list (by name or phone), "Add Patient" flow, view/edit record sheet
- Role-filtered views: Receptionist sees all records; Doctor sees only records where `assigned_doctor_id = their doctor profile`; Admin/Super Admin sees all
- Receptionist can edit all fields except clinical notes; can reassign assigned doctor
- Doctor can view their assigned patients and edit the `clinical_notes` field only
- One visit record per visit — no patient lookup or pre-fill for returning patients in v1

**Out of scope:**
- Lifetime patient profile with multiple visits linked (v2)
- Patient lookup / name-search to pre-fill returning patient details (v2)
- Structured clinical notes (diagnosis, medications fields) — free text only
- Append-only note log per visit — single editable `clinical_notes` field only
- Tabs by date range (Today / This Week) — search handles filtering
- Hard delete of any record
- Billing, lab results, insurance — per CLAUDE.md constraint

</domain>

<decisions>
## Implementation Decisions

### Data Model
- **D-01:** One row in `patient_records` per visit. A returning patient who visits 3 times has 3 records. No separate patients table in v1.
- **D-02:** Schema: `id`, `patient_name`, `age`, `phone`, `reason`, `assigned_doctor_id` (FK → doctors.id, nullable), `visit_date`, `clinical_notes` (text, nullable — doctor fills this), `created_at`, `updated_at`.
- **D-03:** `assigned_doctor_id` FK references `doctors.id` (not `profiles.id`) — the same `doctors` table used by the public site and content management.

### Access Control
- **D-04:** Receptionist: can create and edit all fields except `clinical_notes`; can reassign `assigned_doctor_id`.
- **D-05:** Doctor: can view records where `assigned_doctor_id` = their linked `doctors.id`; can edit `clinical_notes` only.
- **D-06:** Admin / Super Admin: can view all records; edit access same as receptionist for admin tasks. Clinical notes editing remains doctor-appropriate.
- **D-07:** All DB reads and writes use `createAdminClient()` (service role) — established portal write pattern. Role filtering is enforced in application code (Server Components / Server Actions), not via RLS.

### Doctor's Patient View
- **D-08:** To resolve "doctor's assigned patients", the portal must look up the logged-in user's `doctors.id` via `profiles.id` → `doctors.staff_user_id` join — the same linkage established in Phase 6 staff management.

### Patient List UX
- **D-09:** Single view (no tabs), sorted newest first, with a client-side search input that filters by `patient_name` or `phone` instantly. No server-side pagination in v1.
- **D-10:** "Add Patient" opens a dialog/sheet (consistent with Staff page pattern). "View/Edit" opens the same sheet pre-filled.

### Clinical Notes
- **D-11:** Single `clinical_notes` text area per visit record. Doctor edits and saves — last-saved value is stored. Not append-only, no version history.
- **D-12:** Receptionist UI hides the clinical notes field entirely (not shown, not editable). Doctor UI shows clinical notes as an editable textarea; all other fields (name, phone, reason, date, assigned doctor) are read-only for the doctor.

### Record Creation Flow
- **D-13:** Receptionist always fills in all fields manually on every visit — no returning-patient lookup or pre-fill.
- **D-14:** When a doctor is reassigned, the new doctor gains visibility; old doctor loses visibility (enforced by D-07 app-level filter).

### Notification / Visibility
- **D-15:** Records created/updated by a receptionist are visible to admin, super_admin, and the specific assigned doctor. Other doctors do not see unassigned records. Enforced in application-layer fetch, not RLS.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Patient Records (PAT-01 through PAT-05) — all five requirements for this phase
- `.planning/ROADMAP.md` §Phase 8 — Success criteria and dependencies

### Project Context
- `.planning/PROJECT.md` — Stack decisions and constraints (lightweight EMR only — no billing, lab results, insurance per CLAUDE.md)
- `CLAUDE.md` §Constraints — "Patient records: Lightweight EMR only — no billing, lab results, insurance"

### Existing Portal Patterns to Follow
- `app/(portal)/staff/StaffClient.tsx` — Tabs + Table + Sheet (dialog) pattern; Active/Pending tabs and edit sheet. Replicate for patient list + edit sheet.
- `app/(portal)/actions/staff.ts` — `requireAdminRole()` auth gate + `createAdminClient()` write pattern. Replicate for patient actions.
- `lib/db/staff.ts` — `getStaffList()` using `adminClient` for reads. Replicate for `getPatientRecords()`.
- `app/(portal)/appointments/page.tsx` — Server Component fetch + Client Component pattern.

### Role-to-Section Map (Phase 4)
- `.planning/phases/04-auth-roles/04-CONTEXT.md` §Access Control — Role map; Receptionist and Doctor both see the Patients section.

### Doctor Profile Linkage (Phase 6)
- `.planning/phases/06-staff-management/06-CONTEXT.md` — `doctors.staff_user_id` → `profiles.id` linkage. To resolve "which doctor is this logged-in user", join `profiles` → `doctors` via `staff_user_id`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/(portal)/staff/StaffClient.tsx` — Sheet + DataTable pattern (tabs, edit dialog, toast feedback). Patient list should follow the same layout (tabs not needed here, but Sheet for add/edit is the same).
- `components/ui/sonner.tsx` + `<Toaster />` in `app/(portal)/layout.tsx` — already mounted, toasts work.
- `lib/supabase/admin.ts` → `createAdminClient()` — all portal writes use this.
- `lib/db/doctors.ts` → `getDoctors()` — already fetches doctors for dropdowns (used in Phase 7 appointment form).

### Established Patterns
- Server Action pattern: `await requireXxxRole()` for auth gate, then `createAdminClient()` for DB op.
- Server Component fetches data server-side, passes as props to Client Component (no client-side fetch).
- All portal write actions are in `app/(portal)/actions/` as `'use server'` files.

### Integration Points
- `doctors` table — `assigned_doctor_id` FK; `getDoctors()` populates the doctor dropdown in the Add Patient form.
- `profiles` table — `profiles.id` → `doctors.staff_user_id` join to resolve "which doctor is this user" for the doctor-filtered view.
- Middleware `PORTAL_PATHS` in `middleware.ts` — must include `/patients` (already listed in the PORTAL_PATHS array from Phase 4).

</code_context>

<specifics>
## Specific Ideas

No specific references — standard portal patterns apply throughout.

</specifics>

<deferred>
## Deferred Ideas

- **Lifetime patient profile** — one record per patient with multiple visits linked beneath it. Could be Phase 8.5 or v2.
- **Returning patient lookup** — search existing records to pre-fill details for repeat visits. v2.
- **Structured clinical notes** — separate fields for Diagnosis, Medications, Follow-up date. v2 if doctors request it.
- **Today's visits tab** — date-range tabs (Today / This Week). v2 if receptionist workflow demands it.

</deferred>

---

*Phase: 8-Patient Records*
*Context gathered: 2026-06-13*
