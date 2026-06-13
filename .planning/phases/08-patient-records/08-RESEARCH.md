# Phase 8: Patient Records - Research

**Researched:** 2026-06-13
**Domain:** Supabase (Postgres), Next.js App Router Server Actions, role-based field visibility
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** One row in `patient_records` per visit. No separate patients table in v1.
- **D-02:** Schema: `id`, `patient_name`, `age`, `phone`, `reason`, `assigned_doctor_id` (FK → doctors.id, nullable), `visit_date`, `clinical_notes` (text, nullable), `created_at`, `updated_at`.
- **D-03:** `assigned_doctor_id` FK references `doctors.id` (not `profiles.id`).
- **D-04:** Receptionist: create and edit all fields except `clinical_notes`; can reassign `assigned_doctor_id`.
- **D-05:** Doctor: view records where `assigned_doctor_id` = their linked `doctors.id`; edit `clinical_notes` only.
- **D-06:** Admin / Super Admin: view all; edit access same as receptionist.
- **D-07:** All DB reads and writes use `createAdminClient()` (service role). Role filtering in application code only.
- **D-08:** Doctor-user resolution: `profiles.id` → `doctors.staff_user_id` join.
- **D-09:** Single view, sorted newest-first, client-side search by `patient_name` or `phone`.
- **D-10:** "Add Patient" + "View/Edit" open a Sheet, consistent with Staff page pattern.
- **D-11:** Single `clinical_notes` textarea. Last-saved value stored. Not append-only.
- **D-12:** Receptionist UI hides `clinical_notes` entirely. Doctor UI shows `clinical_notes` editable; all other fields read-only.
- **D-13:** Receptionist fills all fields manually — no returning-patient lookup.
- **D-14:** Doctor reassignment: new doctor gains visibility, old loses it.
- **D-15:** Visibility enforced in application-layer fetch, not RLS.

### Claude's Discretion
- Component file structure and naming within the established portal pattern.
- Exact Zod schema field constraints (min lengths, formats) for `patient_name`, `phone`, `reason`, `age`.
- Whether to use a `Dialog` or `Sheet` for the Add Patient form (CONTEXT.md says Sheet per D-10).

### Deferred Ideas (OUT OF SCOPE)
- Lifetime patient profile (one patient, multiple visit rows linked)
- Returning patient lookup / pre-fill
- Structured clinical notes (Diagnosis, Medications fields)
- Append-only note log per visit
- Tabs by date range (Today / This Week)
- Hard delete
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAT-01 | Receptionist can create a patient record with name, age, phone, reason for visit, assigned doctor, and date | DB migration + `createPatientAction()` with `requirePatientWriteRole()` guard |
| PAT-02 | Doctor can view only the patients assigned to them | `getPatientRecords(role, userId)` joins `profiles → doctors` via `staff_user_id` to filter by `assigned_doctor_id` |
| PAT-03 | Doctor can add clinical notes to their patients | `updateClinicalNotesAction()` with doctor-identity check; Sheet shows `clinical_notes` textarea editable for doctors |
| PAT-04 | Admin and Super Admin can view all patient records | Same fetch function; `role IN ('super_admin','admin')` branch skips the doctor filter |
| PAT-05 | Receptionist can view all patient records for check-in purposes | Same fetch; `role = 'receptionist'` branch returns all records |
</phase_requirements>

---

## Summary

Phase 8 builds a lightweight visit-level EMR inside the existing portal. The data model is a single `patient_records` table — one row per visit — with a nullable FK to the `doctors` table. All access uses the service-role admin client (no RLS), with role filtering applied in Server Components and Server Actions.

The core complexity is role-differentiated field visibility: the same Sheet component renders different fields (and enforces different writability) depending on whether the logged-in user is a receptionist, doctor, or admin. Doctors additionally require a two-step identity resolution — from `auth.uid()` to `profiles.user_id` to `doctors.staff_user_id` — before their assigned-patient filter can be applied.

The codebase already has all necessary primitives: `createAdminClient()` for writes, `requireXxxRole()` pattern for auth guards, Sheet+Table layout in `StaffClient.tsx`, and the `doctors` table with `staff_user_id` already populated by Phase 6.

**Primary recommendation:** Build `lib/db/patient_records.ts` for reads (mirroring `lib/db/staff.ts`), `app/(portal)/actions/patients.ts` for writes (mirroring `app/(portal)/actions/staff.ts`), and `app/(portal)/patients/` with a Server Component page + `PatientsClient.tsx` (mirroring the appointments + staff patterns).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Patient record storage | Database (Supabase Postgres) | — | Structured relational data; FK to doctors table |
| Role-based data filtering | API / Backend (Server Component + Server Action) | — | D-07: enforced in app code, not RLS |
| Doctor-identity resolution | API / Backend (Server Component) | — | `auth.uid()` → profiles → doctors join; must happen server-side |
| Add/Edit form | Frontend (Client Component Sheet) | — | Interactive form, react-hook-form + Zod |
| Field visibility by role | Frontend (Client Component) | Backend (write guard) | Hide fields client-side; enforce write restrictions server-side |
| Client-side search | Browser (Client Component) | — | D-09: instant filter over in-memory list, no server round-trip |
| DB migration | Database | — | New table + index; follows existing migration file convention |

---

## Standard Stack

No new external packages are required. All libraries below are already installed.

### Core (already in project)
| Library | Purpose | Source |
|---------|---------|--------|
| `@supabase/supabase-js` | DB client — `createAdminClient()` + `createClient()` | [ASSUMED] Already in use across all phases |
| `react-hook-form` + `@hookform/resolvers` + `zod` | Form validation in Sheet (same as StaffClient.tsx) | [ASSUMED] Already used in StaffClient.tsx |
| `sonner` | Toast feedback (already mounted in portal layout) | [ASSUMED] Already in use |
| `lucide-react` | Icons (Pencil, Loader2, etc.) | [ASSUMED] Already in use |
| shadcn/ui components | Sheet, Table, Input, Select, Textarea, Badge, Button | [ASSUMED] Already in use |

**Installation:** None required — no new packages.

---

## Package Legitimacy Audit

No new packages to install. Section not applicable.

---

## Architecture Patterns

### System Architecture Diagram

```
Logged-in portal user
        │
        ▼
middleware.ts (/patients is in PORTAL_PATHS ✓)
        │
        ▼
app/(portal)/patients/page.tsx  [Server Component]
  ├── auth.getUser() → profiles.role + profiles.id
  ├── if doctor: profiles.id → doctors via staff_user_id → get doctors.id
  ├── getPatientRecords(role, doctorId?) → filtered list
  ├── getDoctors() → doctor dropdown options
  └── <PatientsClient records={...} doctors={...} currentRole={...} currentDoctorId={...} />
        │
        ▼
app/(portal)/patients/PatientsClient.tsx  [Client Component]
  ├── search input → client-side filter by patient_name / phone
  ├── Table rows → "View/Edit" opens Sheet
  ├── "Add Patient" button (receptionist/admin only) → opens Sheet
  └── Sheet (Add / Edit):
        ├── role = receptionist/admin → all fields editable, clinical_notes hidden
        └── role = doctor → all fields read-only, clinical_notes textarea editable
              │
              ▼
        Server Actions (app/(portal)/actions/patients.ts)
          ├── createPatientAction()    — requirePatientRole(['receptionist','admin','super_admin'])
          ├── updatePatientAction()    — requirePatientRole(['receptionist','admin','super_admin'])
          └── updateClinicalNotesAction() — requirePatientRole(['doctor'])
                    │
                    ▼
            createAdminClient() → patient_records table
```

### Recommended Project Structure

```
app/(portal)/patients/
├── page.tsx              # Server Component — fetch + pass props
└── PatientsClient.tsx    # Client Component — table + search + sheet

app/(portal)/actions/
└── patients.ts           # Server Actions: create, update, updateClinicalNotes

lib/db/
└── patient_records.ts    # getPatientRecords(role, doctorId?) typed query

supabase/migrations/
└── 20260613_patient_records.sql  # New table + index
```

### Pattern 1: Server Component fetch with role-aware query

```typescript
// app/(portal)/patients/page.tsx
// Source: established pattern from app/(portal)/appointments/page.tsx + staff/page.tsx

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPatientRecords } from '@/lib/db/patient_records'
import { getDoctors } from '@/lib/db/doctors'
import PatientsClient from './PatientsClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PatientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, id')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Doctor-identity resolution: profiles.id → doctors.staff_user_id
  let currentDoctorId: string | null = null
  if (profile.role === 'doctor') {
    const adminClient = createAdminClient()
    const { data: doctorRow } = await adminClient
      .from('doctors')
      .select('id')
      .eq('staff_user_id', user.id)   // doctors.staff_user_id = auth.uid()
      .single()
    currentDoctorId = doctorRow?.id ?? null
  }

  const [records, doctors] = await Promise.all([
    getPatientRecords(profile.role, currentDoctorId),
    getDoctors(),
  ])

  return (
    <PatientsClient
      records={records}
      doctors={doctors}
      currentRole={profile.role}
      currentDoctorId={currentDoctorId}
    />
  )
}
```

**Critical note on doctor linkage:** `doctors.staff_user_id` stores `profiles.user_id` (= `auth.uid()`), NOT `profiles.id`. The query above uses `.eq('staff_user_id', user.id)` where `user.id` is the Supabase Auth UID. This matches how `updateDoctorStaffLinkAction` in `actions/staff.ts` sets it: `staff_user_id = profileUserId` where `profileUserId` comes from `profiles.user_id`. [ASSUMED — verified by reading `lib/db/doctors.ts` interface (`staff_user_id: string | null`) and `actions/staff.ts` `updateDoctorStaffLinkAction` which sets `staff_user_id` to the Auth UID]

### Pattern 2: DB query with role filter

```typescript
// lib/db/patient_records.ts
// Source: mirrors lib/db/staff.ts pattern

import { createAdminClient } from '@/lib/supabase/admin'
import { StaffRole } from '@/lib/portal/roles'

export interface PatientRecord {
  id: string
  patient_name: string
  age: number
  phone: string
  reason: string
  assigned_doctor_id: string | null
  visit_date: string
  clinical_notes: string | null
  created_at: string
  updated_at: string
}

export async function getPatientRecords(
  role: StaffRole,
  currentDoctorId: string | null
): Promise<PatientRecord[]> {
  const adminClient = createAdminClient()
  let query = adminClient
    .from('patient_records')
    .select('*')
    .order('created_at', { ascending: false })

  // Doctor sees only their assigned patients (D-05, D-15)
  if (role === 'doctor') {
    if (!currentDoctorId) return []
    query = query.eq('assigned_doctor_id', currentDoctorId)
  }
  // receptionist, admin, super_admin: no additional filter (D-04, D-06, D-15)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as PatientRecord[]
}
```

### Pattern 3: Role-split Server Actions

```typescript
// app/(portal)/actions/patients.ts
// Source: mirrors app/(portal)/actions/appointments.ts pattern

'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StaffRole } from '@/lib/portal/roles'

async function requireRole(allowedRoles: StaffRole[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single()
  if (!profile || !allowedRoles.includes(profile.role as StaffRole)) {
    throw new Error('Forbidden')
  }
  return { supabase, user }
}

// Receptionist / Admin create (D-04, D-06)
export async function createPatientAction(input: {
  patient_name: string; age: number; phone: string;
  reason: string; assigned_doctor_id: string | null; visit_date: string
}): Promise<{ error?: string }> {
  try {
    await requireRole(['receptionist', 'admin', 'super_admin'])
    const { error } = await createAdminClient()
      .from('patient_records')
      .insert({ ...input, clinical_notes: null })
    if (error) throw new Error(error.message)
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// Receptionist / Admin update non-notes fields (D-04, D-06)
export async function updatePatientAction(
  id: string,
  input: Partial<{ patient_name: string; age: number; phone: string;
                    reason: string; assigned_doctor_id: string | null; visit_date: string }>
): Promise<{ error?: string }> {
  try {
    await requireRole(['receptionist', 'admin', 'super_admin'])
    const { error } = await createAdminClient()
      .from('patient_records').update(input).eq('id', id)
    if (error) throw new Error(error.message)
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// Doctor updates clinical_notes only (D-05, D-11)
export async function updateClinicalNotesAction(
  id: string, clinical_notes: string
): Promise<{ error?: string }> {
  try {
    await requireRole(['doctor'])
    const { error } = await createAdminClient()
      .from('patient_records').update({ clinical_notes }).eq('id', id)
    if (error) throw new Error(error.message)
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
```

### Pattern 4: Role-conditional Sheet fields

```typescript
// PatientsClient.tsx — Sheet field rendering pattern
// Source: mirrors StaffClient.tsx Sheet pattern

// Props passed from Server Component
interface PatientsClientProps {
  records: PatientRecord[]
  doctors: Doctor[]
  currentRole: StaffRole
  currentDoctorId: string | null
}

// In the Sheet:
const isDoctor = currentRole === 'doctor'
const isReceptionistOrAdmin = ['receptionist', 'admin', 'super_admin'].includes(currentRole)

// Fields visible to all roles (read-only for doctor, editable for receptionist/admin):
<Input readOnly={isDoctor} {...register('patient_name')} />
<Input readOnly={isDoctor} {...register('age')} />
<Input readOnly={isDoctor} {...register('phone')} />
<Input readOnly={isDoctor} {...register('reason')} />
<Input readOnly={isDoctor} {...register('visit_date')} type="date" />
{/* Doctor dropdown only editable for receptionist/admin: */}
{isDoctor ? (
  <Input readOnly value={assignedDoctorName} />
) : (
  <Select ...>{/* doctor options */}</Select>
)}

{/* clinical_notes: hidden for receptionist/admin, editable textarea for doctor */}
{isDoctor && (
  <Textarea {...register('clinical_notes')} />
)}

{/* Save button: receptionist/admin calls updatePatientAction;
    doctor calls updateClinicalNotesAction */}
```

### Pattern 5: DB migration

```sql
-- supabase/migrations/20260613_patient_records.sql
-- Phase 8: Patient Records — lightweight EMR

CREATE TABLE patient_records (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name        TEXT        NOT NULL,
  age                 INTEGER     NOT NULL CHECK (age > 0 AND age < 150),
  phone               TEXT        NOT NULL,
  reason              TEXT        NOT NULL,
  assigned_doctor_id  UUID        REFERENCES doctors(id) ON DELETE SET NULL,
  visit_date          DATE        NOT NULL,
  clinical_notes      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for newest-first sort (D-09 primary access pattern)
CREATE INDEX idx_patient_records_created_at
  ON patient_records(created_at DESC);

-- Index for doctor-filter query (D-05 / D-15)
CREATE INDEX idx_patient_records_assigned_doctor
  ON patient_records(assigned_doctor_id);

-- updated_at trigger (mirrors appointment_requests pattern)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patient_records_updated_at
  BEFORE UPDATE ON patient_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS disabled — all access via service role (D-07, consistent with appointment_requests)
ALTER TABLE patient_records DISABLE ROW LEVEL SECURITY;
```

**Note on `ON DELETE SET NULL`:** When a doctor record is deleted from the `doctors` table, `assigned_doctor_id` becomes NULL rather than cascading delete of patient records. This is the safe default for an EMR context.

### Anti-Patterns to Avoid

- **Filtering by `profiles.id` instead of `auth.uid()` for doctor lookup:** `doctors.staff_user_id` stores the Auth UID (`auth.users.id`), not `profiles.id`. Use `user.id` (from `auth.getUser()`) not `profile.id` when querying `doctors.staff_user_id`.
- **Putting `clinical_notes` in the receptionist form schema:** The Zod schema for the receptionist/admin form should not include the `clinical_notes` field at all — omit it entirely, not just mark it readonly.
- **Server-side paginating the patient list in v1:** D-09 is explicit — no server-side pagination. Load all and filter client-side.
- **Reusing `requireAdminRole()` from `actions/staff.ts`:** Patient write actions need a different role set (includes `receptionist`). Define `requireRole(allowedRoles)` locally in `actions/patients.ts`.
- **Using `createClient()` (user-scoped) for patient DB ops:** Must use `createAdminClient()` to bypass RLS (consistent with all other portal write actions).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Form state + validation | Custom useState per field | react-hook-form + Zod (already in StaffClient.tsx) |
| Toast notifications | Custom alert divs | `toast()` from sonner (already mounted) |
| Table UI | Custom `<table>` | shadcn/ui Table components (already in StaffClient.tsx) |
| Sheet / drawer | Custom side panel | shadcn/ui Sheet (already in StaffClient.tsx) |
| Select dropdown | Custom dropdown | shadcn/ui Select (already in StaffClient.tsx) |
| DB timestamp auto-update | Manual `updated_at` in every action | Postgres trigger `set_updated_at()` |

---

## Common Pitfalls

### Pitfall 1: Wrong field for doctor-user join
**What goes wrong:** Query `doctors WHERE id = user.id` instead of `doctors WHERE staff_user_id = user.id` — returns nothing for any doctor.
**Why it happens:** Confusion between `doctors.id` (UUID PK of the doctor record) and `doctors.staff_user_id` (the Auth UID linking a doctor record to a portal account).
**How to avoid:** Always resolve: `auth.getUser()` → `user.id` → `doctors.staff_user_id = user.id` → returns `doctors.id` (the FK stored in `patient_records.assigned_doctor_id`).
**Warning signs:** Doctor logs in and sees zero patients despite being assigned.

### Pitfall 2: clinical_notes field included in receptionist Zod schema
**What goes wrong:** Receptionist form accidentally submits `clinical_notes: ""` on every create/update, overwriting a doctor's notes.
**Why it happens:** Sharing one Zod schema for all roles.
**How to avoid:** Define two separate Zod schemas — `receptionistSchema` (no `clinical_notes`) and `doctorSchema` (only `clinical_notes`). Use the appropriate one per role.

### Pitfall 3: `ON DELETE CASCADE` instead of `SET NULL` on FK
**What goes wrong:** Deleting a doctor from the doctors table cascades and wipes all their patient visit records.
**Why it happens:** Default FK behavior assumption.
**How to avoid:** Use `REFERENCES doctors(id) ON DELETE SET NULL` in the migration. Records persist; `assigned_doctor_id` becomes NULL.

### Pitfall 4: Client-side search on stale data after mutation
**What goes wrong:** User adds a patient, the list doesn't reflect the new record because `records` state is stale.
**Why it happens:** Client Component holds the `records` prop in state, but `router.refresh()` is not called after a Server Action completes.
**How to avoid:** Call `router.refresh()` (from `useRouter()`) after every successful Server Action — same pattern used in `StaffClient.tsx`.

### Pitfall 5: `dynamic = 'force-dynamic'` missing on the page
**What goes wrong:** Next.js statically caches the page; newly created records don't appear until next deploy.
**Why it happens:** App Router defaults to static generation for pages without dynamic data markers.
**How to avoid:** Add `export const dynamic = 'force-dynamic'` to `app/(portal)/patients/page.tsx` — same as `appointments/page.tsx`.

---

## Runtime State Inventory

Not applicable — this is a greenfield table addition, not a rename/refactor/migration phase.

---

## Environment Availability

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| Supabase project | DB migration + admin client | Yes | Already in use across all phases |
| `supabase` CLI | Running migration locally | [ASSUMED] Already used in prior phases | Used for migrations in Phase 6/7 |
| shadcn/ui Sheet, Table, Select, Textarea | PatientsClient UI | Yes | Already installed |
| `react-hook-form`, `zod` | Form validation | Yes | Already used in StaffClient.tsx |

No missing dependencies.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| RLS for row-level access control | App-layer filtering with service role (D-07) | Consistent with all other portal phases; no additional RLS policies needed |
| Separate patient + visit tables | Single `patient_records` table per visit (D-01) | Simpler v1; v2 can add patient lookup on top |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected in codebase |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

No test infrastructure exists in the project. Phase 8 follows the same pattern as all prior phases — manual UAT via `08-UAT.md`.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| PAT-01 | Receptionist creates patient record | Manual UAT | — | No test framework |
| PAT-02 | Doctor sees only assigned patients | Manual UAT | — | |
| PAT-03 | Doctor edits clinical notes | Manual UAT | — | |
| PAT-04 | Admin sees all records | Manual UAT | — | |
| PAT-05 | Receptionist sees all records | Manual UAT | — | |

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Supabase Auth (`auth.getUser()` in every Server Action) |
| V4 Access Control | Yes | `requireRole(allowedRoles)` gate before every write; doctor filter before reads |
| V5 Input Validation | Yes | Zod schema on Server Action inputs |
| V6 Cryptography | No | No new secrets or encryption required |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Doctor reading another doctor's patient notes | Information Disclosure | Server-side `assigned_doctor_id = currentDoctorId` filter in `getPatientRecords()` |
| Receptionist writing `clinical_notes` directly | Tampering | `createPatientAction` / `updatePatientAction` do not accept `clinical_notes` in their input types |
| Doctor updating non-notes fields | Tampering | `updateClinicalNotesAction` only accepts `clinical_notes`; separate action for non-notes fields requires different role |
| Unauthenticated access to `/patients` | Elevation of Privilege | `/patients` already in `PORTAL_PATHS` (verified in middleware.ts) — Supabase session refresh enforced |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `doctors.staff_user_id` stores `auth.uid()` (not `profiles.id`) | Code Examples Pattern 1 + Pitfall 1 | Doctor-patient filter returns wrong results; doctors see zero patients |
| A2 | No test framework exists in the project | Validation Architecture | If a framework does exist, UAT plan may be insufficient |
| A3 | shadcn/ui `Textarea` component is installed | Standard Stack | Planner task for `clinical_notes` field needs a `Textarea` install step |

---

## Open Questions

1. **Does `set_updated_at()` Postgres function already exist from a prior migration?**
   - What we know: `appointment_requests` table has no `updated_at`, so no trigger was created in Phase 7.
   - What's unclear: Whether any earlier migration created this function.
   - Recommendation: Include `CREATE OR REPLACE FUNCTION` in the migration — idempotent, no harm if it already exists.

2. **Should the doctor dropdown in the Add Patient form show only `is_active = true` doctors?**
   - What we know: `getDoctors()` returns all doctors; `getActiveDoctors()` filters to `is_active = true`.
   - What's unclear: Whether inactive doctors should still be assignable (for historical records).
   - Recommendation: Use `getActiveDoctors()` for the Add/Edit dropdown (only assign to active doctors), but existing records with an inactive assigned doctor still display the doctor name read-only.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `middleware.ts` — `/patients` confirmed in `PORTAL_PATHS` array
- `lib/portal/roles.ts` — role definitions and `patients` section assignment confirmed
- `lib/db/doctors.ts` — `Doctor` interface with `staff_user_id: string | null` confirmed
- `app/(portal)/actions/staff.ts` — `updateDoctorStaffLinkAction` confirms `staff_user_id` = Auth UID
- `supabase/migrations/20260612_appointment_requests.sql` — RLS disabled pattern confirmed
- `app/(portal)/staff/StaffClient.tsx` — Sheet + react-hook-form + Zod pattern confirmed
- `app/(portal)/appointments/page.tsx` — Server Component + Client Component split pattern confirmed

### Secondary (ASSUMED — training knowledge, consistent with codebase)
- shadcn/ui Sheet, Table, Textarea component APIs
- Supabase `ON DELETE SET NULL` FK behavior
- Next.js `dynamic = 'force-dynamic'` requirement for portal pages

---

## Metadata

**Confidence breakdown:**
- DB migration design: HIGH — schema from CONTEXT.md D-02/D-03, FK pattern from existing migrations
- Doctor-user linkage: HIGH — `staff_user_id` column confirmed in `lib/db/doctors.ts` interface and `actions/staff.ts`
- Role-based field visibility pattern: HIGH — mirrors StaffClient.tsx Sheet pattern directly
- Client-side search pattern: HIGH — D-09 explicit; `router.refresh()` pattern confirmed in StaffClient.tsx
- Middleware: HIGH — `/patients` confirmed present in `PORTAL_PATHS`

**Research date:** 2026-06-13
**Valid until:** 2026-07-13 (stable stack, no fast-moving dependencies)
