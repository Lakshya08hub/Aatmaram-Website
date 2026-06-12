# Phase 7: Appointment Request System - Research

**Researched:** 2026-06-12
**Domain:** Next.js Server Actions + hCaptcha + Supabase custom table insert + Portal CRUD UI
**Confidence:** HIGH (all findings grounded in direct codebase reads and verified documentation)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Server Action (not Route Handler) for form submission
- D-02: `createAdminClient()` service role insert; no public RLS
- D-03: hCaptcha via `@hcaptcha/react-hcaptcha`
- D-04: `preferredTime` Select — Morning OPD (9am–12pm) / Afternoon OPD (12–3pm) / Evening OPD (3–6pm)
- D-05: Doctor dropdown switches from static `lib/data/doctors` to live `getDoctors()` from `lib/db/doctors.ts`
- D-06: Table `appointment_requests` — id, patient_name, phone, preferred_doctor (text), preferred_date, preferred_time, reason, status enum ('pending'|'contacted'|'confirmed'|'cancelled'), notes (nullable), created_at
- D-07: Portal page — 4 status tabs (Pending/Contacted/Confirmed/Cancelled) + table
- D-08: Any→any status transitions + optional notes textarea
- D-09: No hard delete
- D-10: Receptionist + Admin can update status
- D-11: Public submission via service role, no auth required

### Claude's Discretion
- Exact column types and constraints for SQL DDL (within D-06 column list)
- Whether to use a `requireReceptionistOrAdminRole()` helper vs inline check
- Portal UI: Sheet vs inline editing for status update (StaffClient uses Sheet; inline row action is simpler here)
- Error display patterns in the public form during Server Action failure

### Deferred Ideas (OUT OF SCOPE)
- WhatsApp/SMS/email patient notifications
- Real-time slot booking with double-booking prevention
- Rate limiting beyond hCaptcha
- Patient-side appointment history
</user_constraints>

---

## Summary

Phase 7 wires two surfaces: the existing public `AppointmentForm.tsx` (needs three additions: hCaptcha widget, `preferredTime` select, and doctor list as props) and a new portal page for receptionists. The codebase is already well-prepared — all shadcn/ui components are installed, the Server Action pattern from Phase 6 is the direct template, and `getDoctors()` already exists in `lib/db/doctors.ts`.

**Critical finding on hCaptcha:** Supabase's native hCaptcha integration applies ONLY to auth operations (`signUp`, `signIn`, `resetPasswordForEmail`). For a custom table insert from an unauthenticated public form, the Server Action must call hCaptcha's `POST https://hcaptcha.com/siteverify` endpoint directly using `HCAPTCHA_SECRET` from env. This is a standard fetch call — no extra npm package needed beyond `@hcaptcha/react-hcaptcha` on the client side.

**Critical finding on role guard:** The existing `requireAdminRole()` in `staff.ts` gates on `['super_admin', 'admin']` only. D-10 requires Receptionist to also update appointment status. A new `requireReceptionistOrAdminRole()` guard is needed, or the roles array must be expanded in the appointments actions file.

**Primary recommendation:** Follow the Phase 6 Server Component page + Client component + Server Actions file pattern exactly. The appointment portal is a 4-tab version of StaffClient with a simpler row action (no Sheet needed — inline status Select + notes within the table row or a compact popover works fine).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| hCaptcha token generation | Browser / Client | — | Widget runs client-side; token sent to server |
| hCaptcha token verification | API / Backend (Server Action) | — | Must happen server-side with secret key |
| Appointment insert | API / Backend (Server Action) | — | Uses service role; no client-side DB access |
| Doctor list for dropdown | Frontend Server (SSR) | — | Page Server Component fetches via `getActiveDoctors()` |
| Appointment list for portal | Frontend Server (SSR) | — | Portal Server Component fetches all requests |
| Status update | API / Backend (Server Action) | — | Guarded by role check |

---

## Q1: hCaptcha Integration with Next.js Server Actions

### Client-Side (`@hcaptcha/react-hcaptcha`)

The `<HCaptcha>` component needs three props plus a ref:

```tsx
// [CITED: github.com/hCaptcha/react-hcaptcha]
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { useRef, useState } from 'react'

const captchaRef = useRef<HCaptcha>(null)
const [captchaToken, setCaptchaToken] = useState<string | null>(null)

<HCaptcha
  sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
  onVerify={(token) => setCaptchaToken(token)}
  onExpire={() => setCaptchaToken(null)}
  ref={captchaRef}
/>
```

The token is stored in component state. On form submit, the token is passed to the Server Action as a plain string argument (or hidden form field). After successful submission, call `captchaRef.current?.resetCaptcha()` to reset the widget.

### Passing Token to Server Action

Because `AppointmentForm` uses `react-hook-form` with `form.handleSubmit(onSubmit)` — not a native `<form action={serverAction}>` — the token is passed as an argument to the Server Action call:

```ts
// Inside onSubmit handler:
const result = await submitAppointmentAction({ ...data, captchaToken })
```

The Server Action receives it as part of its typed input object.

### Server-Side Token Verification

**Supabase's native hCaptcha integration does NOT apply to custom `from().insert()` calls.** [ASSUMED from search findings — Supabase docs only show captchaToken on auth methods like `signUp`, `signIn`.]

The Server Action must call hCaptcha's siteverify endpoint directly:

```ts
// [CITED: docs.hcaptcha.com]
async function verifyHcaptcha(token: string): Promise<boolean> {
  const res = await fetch('https://hcaptcha.com/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: process.env.HCAPTCHA_SECRET!,
      response: token,
    }),
  })
  const data = await res.json() as { success: boolean }
  return data.success
}
```

Return `{ error: 'CAPTCHA verification failed' }` if `success` is `false`.

### Required Environment Variables

| Variable | Where Used | Value Source |
|----------|-----------|-------------|
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | Client — `<HCaptcha sitekey>` | hCaptcha dashboard → Sites |
| `HCAPTCHA_SECRET` | Server Action — siteverify call | hCaptcha dashboard → Settings → Secret Key |

Both must be added to `.env.local`. The site key is public (NEXT_PUBLIC_); the secret key is server-only.

---

## Q2: AppointmentForm.tsx Changes Required

### Current State (from file read)

- Uses `react-hook-form` + `zodResolver` + shadcn `<Form>`
- 5 fields: `patientName`, `phone`, `preferredDoctor`, `preferredDate`, `reason`
- Doctor dropdown imports from static `lib/data/doctors` (`doctors` array, shape: `{ id: string, name: string, ... }`)
- `onSubmit` at line 66: stub with `void data` + toast
- Component signature: `export default function AppointmentForm()` — no props

### Required Changes

**1. Add props for doctor list:**
```tsx
interface DoctorOption { id: string; full_name: string }
interface Props { doctors: DoctorOption[] }
export default function AppointmentForm({ doctors }: Props) {
```
Remove the static `import { doctors } from '@/lib/data/doctors'`.

**2. Add `preferredTime` to Zod schema:**
```ts
preferredTime: z.enum(['morning', 'afternoon', 'evening'], {
  required_error: 'Please select a preferred time slot.',
}),
```
Add `preferredTime: ''` to `defaultValues` (use `'' as ''` or start with a valid enum value).

**3. Add `preferredTime` Select field** (after preferredDate, before reason):
Options: value `'morning'` label `"Morning OPD (9am–12pm)"`, `'afternoon'` → `"Afternoon OPD (12–3pm)"`, `'evening'` → `"Evening OPD (3–6pm)"`.

**4. Replace doctor dropdown static data:**
Change `doctors.map(doc => <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>)` to use the `full_name` field from `Doctor` (lib/db/doctors.ts shape):
```tsx
{doctors.map((doc) => (
  <SelectItem key={doc.id} value={doc.full_name}>
    {doc.full_name}
  </SelectItem>
))}
```
Note: D-06 stores `preferred_doctor` as text (doctor name), not as a UUID FK. So the Select value should be `doc.full_name`, not `doc.id`.

**5. Add hCaptcha widget** (below reason textarea, above submit button):
```tsx
const captchaRef = useRef<HCaptcha>(null)
const [captchaToken, setCaptchaToken] = useState<string | null>(null)
// ...
<HCaptcha
  sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
  onVerify={(token) => setCaptchaToken(token)}
  onExpire={() => setCaptchaToken(null)}
  ref={captchaRef}
/>
```

**6. Wire onSubmit:**
```ts
const onSubmit = async (data: AppointmentFormValues) => {
  if (!captchaToken) {
    toast.error('Please complete the CAPTCHA.')
    return
  }
  const result = await submitAppointmentAction({ ...data, captchaToken })
  if (result.error) {
    toast.error(result.error)
    return
  }
  toast.success(t('success.title'), { description: t('success.description'), duration: 6000 })
  form.reset()
  captchaRef.current?.resetCaptcha()
  setCaptchaToken(null)
}
```

**7. Add `isSubmitting` state** for button loading state — or use `form.formState.isSubmitting`.

### Doctor Field Value Shape Mismatch

The static `lib/data/doctors.ts` uses `{ id: 'dr-sharma', name: 'Dr. Rajesh Sharma' }`. The DB `Doctor` type uses `{ id: uuid, full_name: string }`. The form currently maps `doc.id` as the SelectItem value. Since D-06 stores doctor as text name (not FK), use `doc.full_name` as both value and display. Adjust `preferredDoctor` schema validation to `z.string().min(1)` (it already is).

---

## Q3: appointment_requests Table — SQL DDL

### Status Enum + Table DDL

```sql
-- Migration: create appointment_requests table
-- Run via Supabase Dashboard → SQL Editor

-- Step 1: Create enum type
CREATE TYPE appointment_status AS ENUM (
  'pending',
  'contacted',
  'confirmed',
  'cancelled'
);

-- Step 2: Create table
CREATE TABLE appointment_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name  TEXT NOT NULL,
  phone         TEXT NOT NULL,
  preferred_doctor TEXT NOT NULL,          -- stored as text; "No preference" allowed
  preferred_date   DATE NOT NULL,
  preferred_time   TEXT NOT NULL,          -- 'morning' | 'afternoon' | 'evening'
  reason           TEXT NOT NULL,
  status           appointment_status NOT NULL DEFAULT 'pending',
  notes            TEXT,                   -- nullable; receptionist callback notes
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: Index for portal tab queries (status filter is the primary access pattern)
CREATE INDEX idx_appointment_requests_status ON appointment_requests(status);
CREATE INDEX idx_appointment_requests_created_at ON appointment_requests(created_at DESC);

-- Step 4: RLS — Disable entirely; all access via service role
ALTER TABLE appointment_requests DISABLE ROW LEVEL SECURITY;
```

**RLS decision (D-02):** Public insert and portal reads both go through `createAdminClient()` (service role), which bypasses RLS regardless of setting. Disabling RLS explicitly documents the intent and avoids confusion.

**`preferred_time` as TEXT** (not enum): Simpler to extend if slot labels change. The Server Action validates the value via Zod before insert.

---

## Q4: Portal AppointmentsClient — Adapting StaffClient Pattern

### 4-Tab Structure

StaffClient uses 2 tabs (Active/Pending) driven by `.filter()` on a single array. AppointmentsClient uses the same pattern with 4 status values:

```ts
const pending    = appointments.filter(a => a.status === 'pending')
const contacted  = appointments.filter(a => a.status === 'contacted')
const confirmed  = appointments.filter(a => a.status === 'confirmed')
const cancelled  = appointments.filter(a => a.status === 'cancelled')
```

```tsx
<Tabs defaultValue="pending">
  <TabsList>
    <TabsTrigger value="pending">Pending <CountBadge n={pending.length} /></TabsTrigger>
    <TabsTrigger value="contacted">Contacted <CountBadge n={contacted.length} /></TabsTrigger>
    <TabsTrigger value="confirmed">Confirmed <CountBadge n={confirmed.length} /></TabsTrigger>
    <TabsTrigger value="cancelled">Cancelled <CountBadge n={cancelled.length} /></TabsTrigger>
  </TabsList>
  <TabsContent value="pending"><AppointmentTable rows={pending} /></TabsContent>
  {/* ...etc */}
</Tabs>
```

### Table Columns

| Column | Source field | Notes |
|--------|-------------|-------|
| Patient Name | `patient_name` | — |
| Phone | `phone` | Clickable `tel:` link for receptionists |
| Preferred Doctor | `preferred_doctor` | Text; "No preference" possible |
| Date | `preferred_date` | Format as `toLocaleDateString('en-IN')` |
| Time Slot | `preferred_time` | Map 'morning' → "Morning OPD (9am–12pm)" etc. |
| Reason | `reason` | Truncate to 60 chars with title= full text |
| Submitted | `created_at` | Relative or date |
| Actions | — | Status Select + Notes (see below) |

### Row Action — Status Update

Unlike StaffClient which uses a Sheet for editing, the appointments row action is simpler. The UX pattern that fits D-08 (any→any transition + optional notes) is an inline row expansion or a compact Sheet triggered per row. **Recommended: Sheet** (consistent with StaffClient, gives notes textarea enough space).

Sheet content:
1. Status `<Select>` — all 4 values available
2. `<Textarea>` for notes — optional, pre-filled with existing notes if any
3. Save / Cancel buttons

```ts
type AppointmentRequest = {
  id: string
  patient_name: string
  phone: string
  preferred_doctor: string
  preferred_date: string
  preferred_time: string
  reason: string
  status: 'pending' | 'contacted' | 'confirmed' | 'cancelled'
  notes: string | null
  created_at: string
}
```

### Props Interface

```tsx
interface Props {
  appointments: AppointmentRequest[]
  fetchError?: boolean
}
```

---

## Q5: Server Actions for Portal

### Role Guard — Critical Gap

`requireAdminRole()` in `staff.ts` allows only `['super_admin', 'admin']`. D-10 requires receptionist access. The `ROLE_SECTIONS` in `lib/portal/roles.ts` already maps `receptionist: ['dashboard', 'appointments', 'patients']` — the intent is established.

**Solution:** Create a `requireAppointmentRole()` (or `requireReceptionistOrAdminRole()`) helper in the new appointments actions file:

```ts
// app/(portal)/actions/appointments.ts
const APPOINTMENT_ROLES: StaffRole[] = ['super_admin', 'admin', 'receptionist']

async function requireAppointmentRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (error || !profile || !APPOINTMENT_ROLES.includes(profile.role as StaffRole)) {
    throw new Error('Forbidden')
  }
  return supabase
}
```

### updateAppointmentStatusAction

```ts
export async function updateAppointmentStatusAction(
  id: string,
  status: 'pending' | 'contacted' | 'confirmed' | 'cancelled',
  notes?: string
): Promise<{ error?: string }> {
  try {
    const supabase = await requireAppointmentRole()
    const { error } = await supabase
      .from('appointment_requests')
      .update({ status, notes: notes ?? null })
      .eq('id', id)
    if (error) throw new Error(error.message)
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
```

Note: No `revalidatePath()` call needed here — the pattern from StaffClient uses `router.refresh()` on the client side after action completes.

### submitAppointmentAction (public — no auth)

```ts
// app/(portal)/actions/appointments.ts — also 'use server'
export async function submitAppointmentAction(input: {
  patientName: string
  phone: string
  preferredDoctor: string
  preferredDate: string
  preferredTime: string
  reason: string
  captchaToken: string
}): Promise<{ error?: string }> {
  try {
    // 1. Verify hCaptcha
    const captchaOk = await verifyHcaptcha(input.captchaToken)
    if (!captchaOk) return { error: 'CAPTCHA verification failed. Please try again.' }

    // 2. Insert via service role (D-02)
    const adminClient = createAdminClient()
    const { error } = await adminClient.from('appointment_requests').insert({
      patient_name: input.patientName,
      phone: input.phone,
      preferred_doctor: input.preferredDoctor,
      preferred_date: input.preferredDate,
      preferred_time: input.preferredTime,
      reason: input.reason,
      status: 'pending',
    })
    if (error) throw new Error(error.message)
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
```

**No auth check on `submitAppointmentAction`** — D-11 confirms public submission requires no session. Service role key is server-only and never exposed to the browser.

---

## Q6: getDoctors() Compatibility with AppointmentForm

### What getDoctors() Returns

From direct file read of `lib/db/doctors.ts`:

```ts
export interface Doctor {
  id: string           // UUID (not a slug like 'dr-sharma')
  full_name: string    // e.g. "Dr. Rajesh Sharma"
  specialization: string
  qualification: string
  photo_url: string | null
  bio: string | null
  availability_days: string[] | null
  is_active: boolean
  staff_user_id: string | null
  created_at: string
  updated_at: string
}
```

`getActiveDoctors()` returns only `is_active: true` doctors — use this for the public form.

### Shape AppointmentForm Needs

The form only needs `id` and `full_name` from each doctor. To avoid passing the full `Doctor` object, define a lean prop type in the form:

```ts
interface DoctorOption {
  id: string
  full_name: string
}
```

The page server component calls `getActiveDoctors()`, then passes the result (typed as `Doctor[]`, but satisfies `DoctorOption[]`).

### Static vs DB Doctor ID Format Mismatch

The existing static `lib/data/doctors.ts` uses string slugs (`'dr-sharma'`) as IDs and `name` as the display field. The DB uses UUIDs for `id` and `full_name` for the display field. These are completely different shapes. The form must:
- Switch SelectItem `key` from `doc.id` (slug) to `doc.id` (UUID)
- Switch SelectItem `value` from `doc.id` (slug) to `doc.full_name` (text name — stored in DB column)
- Switch SelectItem display from `doc.name` to `doc.full_name`

The "no preference" option (`value="no-preference"` / label from translations) stays as-is.

### Appointment Page Change

`app/[locale]/(public)/appointment/page.tsx` needs:
1. `import { getActiveDoctors } from '@/lib/db/doctors'`
2. `const doctors = await getActiveDoctors()` inside the async Server Component
3. Pass to `<AppointmentForm doctors={doctors} />`

This page is already an async Server Component; adding the DB call is trivial.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@hcaptcha/react-hcaptcha` | ~1.x | Client-side CAPTCHA widget | [ASSUMED] Official hCaptcha React library |
| `@supabase/supabase-js` | already installed | Service role insert | Already in project |

**hCaptcha server-side verification:** Native `fetch()` call — no additional package needed.

### Already Installed (from Phase 5/6)
All shadcn/ui components (Tabs, Table, Sheet, Select, Textarea, Badge, Button, Dialog), `sonner`, `react-hook-form`, `zod`, `@hookform/resolvers` — no new installs needed for portal side.

---

## Package Legitimacy Audit

Only one new package to install: `@hcaptcha/react-hcaptcha`.

| Package | Registry | Source Repo | slopcheck | Disposition |
|---------|----------|-------------|-----------|-------------|
| `@hcaptcha/react-hcaptcha` | npm | github.com/hCaptcha/react-hcaptcha | [ASSUMED — slopcheck not run] | [ASSUMED] Approved — official hCaptcha org repo |

*slopcheck was not available at research time. The package is the official React library from the hCaptcha organization (github.com/hCaptcha/react-hcaptcha). Planner should verify with `npm view @hcaptcha/react-hcaptcha` before install.*

**Packages removed due to [SLOP]:** none
**Packages flagged [SUS]:** none identified

---

## Common Pitfalls

### Pitfall 1: Using Supabase Native hCaptcha for Custom Table Insert
**What goes wrong:** Developer enables hCaptcha in Supabase dashboard and passes `captchaToken` to `supabase.from().insert()` expecting automatic server-side verification — but Supabase's native integration only intercepts auth calls.
**Why it happens:** The Supabase docs show captchaToken on signUp; it's easy to assume it works everywhere.
**How to avoid:** Always call hCaptcha's `siteverify` endpoint directly in the Server Action for non-auth inserts.
**Warning signs:** No error thrown even with invalid/missing token; CAPTCHA is silently ignored.

### Pitfall 2: Doctor SelectItem value = UUID instead of name
**What goes wrong:** If `value={doc.id}` (UUID) is stored in `appointment_requests.preferred_doctor`, that UUID has no meaning when a doctor is later deleted or deactivated. D-06 explicitly specifies `preferred_doctor` as TEXT (name).
**How to avoid:** Use `value={doc.full_name}` in the SelectItem. This survives doctor record changes.

### Pitfall 3: requireAdminRole() on Appointment Actions Blocks Receptionists
**What goes wrong:** Copying `requireAdminRole()` verbatim from `staff.ts` blocks the `receptionist` role.
**How to avoid:** Implement `requireAppointmentRole()` with `['super_admin', 'admin', 'receptionist']`.

### Pitfall 4: `preferredTime` Zod Enum with react-hook-form defaultValues
**What goes wrong:** `z.enum(['morning', 'afternoon', 'evening'])` with `defaultValues: { preferredTime: '' }` causes a Zod parse error on mount in some versions.
**How to avoid:** Use `z.enum([...]).optional()` in the schema and validate presence separately, OR set `defaultValues: { preferredTime: 'morning' }` as a pre-selected default.

### Pitfall 5: HCaptcha in development with test sitekey
**What goes wrong:** hCaptcha widget doesn't render or always fails in localhost without the test sitekey.
**How to avoid:** hCaptcha provides a test sitekey (`10000000-ffff-ffff-ffff-000000000001`) and secret (`0x0000000000000000000000000000000000000000`) for development. Use these in `.env.local` for dev.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Not yet determined from codebase — check for jest.config.* or vitest.config.* |
| Quick run command | `npm test` (verify) |
| Full suite command | `npm run test:ci` (verify) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| APT-01 | Public form submits appointment request | Integration (manual) | Server Action touches Supabase; mock in unit |
| APT-02 | hCaptcha blocks bot submissions | Unit | Test verifyHcaptcha() with mock fetch |
| APT-03 | Doctor dropdown shows live doctors | Unit | Test page passes getActiveDoctors() result |
| APMT-01 | Portal shows requests by status tab | Unit | Filter logic on array |
| APMT-02 | Status update persists to DB | Integration (manual) | updateAppointmentStatusAction test |
| APMT-03 | Receptionist role can update status | Unit | requireAppointmentRole() with mock profile |

### Wave 0 Gaps
- [ ] No test file found for Server Actions — `tests/actions/appointments.test.ts` needed for hCaptcha verify and role guard unit tests
- [ ] `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` and `HCAPTCHA_SECRET` test env vars needed

---

## Environment Availability

| Dependency | Required By | Available | Fallback |
|------------|------------|-----------|----------|
| `@hcaptcha/react-hcaptcha` | Public form widget | Install needed | None — required by D-03 |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | HCaptcha widget | Must be added to .env.local | Use test sitekey in dev |
| `HCAPTCHA_SECRET` | Server-side verification | Must be added to .env.local | Use test secret in dev |
| Supabase `appointment_requests` table | All phase functionality | Migration needed | None — must run SQL first |
| `appointment_status` enum type | Table DDL | Migration needed | None |

**Missing dependencies with no fallback:** The DB migration (enum + table) must run before any code execution. The hCaptcha env vars must be set.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Zod schema on Server Action input |
| V4 Access Control | yes | `requireAppointmentRole()` on portal actions |
| V2 Authentication | partial | Public action is unauthenticated by design (D-11); guarded by CAPTCHA |
| V6 Cryptography | no | No passwords or PII encryption needed |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Spam form submissions | Spoofing/DoS | hCaptcha token verified server-side |
| Skipping CAPTCHA via direct Server Action call | Tampering | verifyHcaptcha() is first check in Server Action |
| Receptionist escalating to admin actions | Elevation | Separate role arrays per action file |
| Phone number injection / XSS | Tampering | Zod validates phone regex before insert |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase native hCaptcha only works for auth operations, not custom table inserts | Q1 | If wrong: could use Supabase-managed verification instead of manual siteverify call — simpler but unlikely |
| A2 | `@hcaptcha/react-hcaptcha` is the correct npm package name (official hCaptcha React library) | Standard Stack | Low risk — official GitHub at github.com/hCaptcha/react-hcaptcha confirms name |
| A3 | hCaptcha test sitekey is `10000000-ffff-ffff-ffff-000000000001` | Pitfall 5 | Minor — confirm at docs.hcaptcha.com |

---

## Open Questions

1. **hCaptcha dev keys**
   - What we know: hCaptcha provides test keys for localhost dev
   - What's unclear: Whether the test keys are configured in this project's `.env.local` already
   - Recommendation: Check `.env.local` before implementing; add test keys if absent

2. **Existing test infrastructure**
   - What we know: Phase 5/6 did not show test files in the reads
   - What's unclear: Whether any jest/vitest config exists
   - Recommendation: `ls .planning/` and check for test config at project root before Wave 0

3. **`appointment_requests` migration timing**
   - What we know: Migration must run before code; Supabase SQL editor is the method
   - What's unclear: Whether there is a local Supabase dev instance or cloud-only
   - Recommendation: Plan assumes cloud Supabase SQL editor; add migration as Wave 0 task

---

## Sources

### Primary (HIGH confidence)
- Direct file read: `components/public/AppointmentForm.tsx` — exact current state
- Direct file read: `lib/db/doctors.ts` — getDoctors() return shape
- Direct file read: `app/(portal)/actions/staff.ts` — requireAdminRole() pattern
- Direct file read: `app/(portal)/staff/StaffClient.tsx` — Tabs+Table+Sheet pattern
- Direct file read: `lib/portal/roles.ts` — StaffRole type and ROLE_SECTIONS map
- Direct file read: `lib/supabase/admin.ts` — createAdminClient() signature

### Secondary (MEDIUM confidence)
- [hCaptcha React GitHub](https://github.com/hCaptcha/react-hcaptcha) — component props (onVerify, onExpire, ref, sitekey)
- [hCaptcha Developer Guide](https://docs.hcaptcha.com/) — siteverify endpoint and response shape
- [Supabase CAPTCHA docs](https://supabase.com/docs/guides/auth/auth-captcha) — confirms native integration scope (auth only)

### Tertiary (LOW confidence — flagged as ASSUMED)
- WebSearch: Supabase native hCaptcha does not apply to custom table inserts — consistent across multiple results but not explicitly stated in official docs as "not supported for inserts"

---

## Metadata

**Confidence breakdown:**
- hCaptcha client integration: HIGH — official GitHub repo pattern
- hCaptcha server verification for custom inserts: MEDIUM — inferred from Supabase docs scope; manual siteverify is the safe fallback regardless
- AppointmentForm changes: HIGH — direct file read
- SQL DDL: HIGH — standard Postgres/Supabase patterns
- Role guard gap: HIGH — direct code read confirms receptionist not in ADMIN_ROLES array
- getDoctors() shape: HIGH — direct file read

**Research date:** 2026-06-12
**Valid until:** 2026-07-12 (stable libraries; Supabase auth-captcha integration scope unlikely to change)
