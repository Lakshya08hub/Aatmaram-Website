# Phase 7: Appointment Request System — Pattern Map

**Mapped:** 2026-06-12
**Files analyzed:** 7
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/YYYYMMDD_appointment_requests.sql` | migration | CRUD | `supabase/migrations/20260612_cms_tables.sql` | exact |
| `app/(portal)/appointments/page.tsx` | controller (Server Component) | request-response | `app/(portal)/staff/page.tsx` | exact |
| `components/portal/AppointmentsClient.tsx` | component (Client) | CRUD | `app/(portal)/staff/StaffClient.tsx` | exact |
| `app/(portal)/actions/appointments.ts` | service (Server Actions) | CRUD | `app/(portal)/actions/staff.ts` | exact |
| `lib/db/appointment_requests.ts` *(implied — needed by page)* | utility (db query) | CRUD | `lib/db/staff.ts` | exact |
| `components/public/AppointmentForm.tsx` | component (Client) — modify | request-response | self (existing file) | n/a — modify in place |
| `app/[locale]/(public)/appointment/page.tsx` | controller (Server Component) — modify | request-response | self + `app/(portal)/staff/page.tsx` | n/a — modify in place |
| `lib/actions/submitAppointment.ts` | service (Server Action) — new public-facing | request-response | `app/(portal)/actions/staff.ts` | role-match |

---

## Pattern Assignments

### `supabase/migrations/YYYYMMDD_appointment_requests.sql`

**Analog:** `supabase/migrations/20260612_cms_tables.sql`

**Structure to copy (cms_tables.sql lines 1–99):**
```sql
-- Phase N: <description>
-- Creates: <table list>
-- Includes: RLS policies

CREATE TABLE appointment_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name   text NOT NULL,
  phone          text NOT NULL,
  preferred_doctor text,          -- free text or doctor id
  preferred_date date,
  preferred_time text,            -- NEW field vs existing form schema
  reason         text NOT NULL,
  status         text NOT NULL DEFAULT 'new',  -- new | contacted | booked | cancelled
  notes          text,                          -- staff-only internal notes
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE appointment_requests ENABLE ROW LEVEL SECURITY;

-- Anonymous INSERT (public form submission)
CREATE POLICY "appointment_requests: anon insert"
  ON appointment_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Staff read/update (portal)
CREATE POLICY "appointment_requests: staff read"
  ON appointment_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.is_active = true
    )
  );

CREATE POLICY "appointment_requests: staff update"
  ON appointment_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.is_active = true
    )
  );
```

**Gotchas:**
- File naming: use `YYYYMMDD` prefix matching existing files (`20260612_` style). Choose today's date: `20260612_appointment_requests.sql`.
- The `status` field needs a CHECK constraint or a Postgres enum. Prefer a `text` column + CHECK for simplicity (no separate enum type like `facility_category`).
- `preferred_doctor` stores either the doctor's `id` (uuid text) or `'no-preference'`. No FK constraint — the referenced doctor may be deleted later and requests should not cascade.
- No `DELETE` policy is needed for anon; portal staff only soft-delete by changing status.

---

### `app/(portal)/appointments/page.tsx`

**Analog:** `app/(portal)/staff/page.tsx` (lines 1–25)

**Imports pattern (staff/page.tsx lines 1–8):**
```typescript
import { getStaffList, StaffMember } from '@/lib/db/staff';
import { getDoctors, Doctor } from '@/lib/db/doctors';
import StaffClient from './StaffClient';
```

**Core pattern (staff/page.tsx lines 9–25) — copy exactly, swap names:**
```typescript
export const dynamic = 'force-dynamic';

export default async function AppointmentsPage() {
  let requests: AppointmentRequest[] = [];
  let fetchError = false;

  try {
    requests = await getAppointmentRequests();
  } catch {
    fetchError = true;
  }

  return (
    <AppointmentsClient initialRequests={requests} fetchError={fetchError} />
  );
}
```

**Key differences vs staff/page.tsx:**
- Only one data source (`getAppointmentRequests()`) — no parallel fetch needed (unlike staff which fetches both staff + doctors).
- Import comes from `@/lib/db/appointment_requests` (new file to create).
- No `getDoctors()` needed here because doctor names on appointments are stored as text, not FK references.

**Gotchas:**
- `export const dynamic = 'force-dynamic'` is mandatory — appointment list changes on every submission.
- The portal layout already handles auth guard; no `requireAdminRole()` needed in the page itself.

---

### `components/portal/AppointmentsClient.tsx`

**Analog:** `app/(portal)/staff/StaffClient.tsx` (753 lines total)

**Imports pattern (StaffClient.tsx lines 1–67):**
```typescript
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
```

**Tab structure pattern (StaffClient.tsx lines 474–506):**
```typescript
<Tabs defaultValue="new" className="mt-6">
  <TabsList>
    <TabsTrigger value="new">
      New
      {newCount > 0 && (
        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          {newCount}
        </span>
      )}
    </TabsTrigger>
    <TabsTrigger value="contacted">Contacted</TabsTrigger>
    <TabsTrigger value="booked">Booked</TabsTrigger>
    <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
  </TabsList>
  <TabsContent value="new"><RequestTable rows={newRequests} /></TabsContent>
  <TabsContent value="contacted"><RequestTable rows={contactedRequests} /></TabsContent>
  <TabsContent value="booked"><RequestTable rows={bookedRequests} /></TabsContent>
  <TabsContent value="cancelled"><RequestTable rows={cancelledRequests} /></TabsContent>
</Tabs>
```

**Handler + toast pattern (StaffClient.tsx lines 291–306):**
```typescript
async function handleStatusChange(id: string, status: string) {
  setUpdatingId(id);
  try {
    const result = await updateAppointmentStatusAction(id, status);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Status updated');
      router.refresh();
    }
  } catch {
    toast.error('Failed to update. Try again.');
  } finally {
    setUpdatingId(null);
  }
}
```

**Error banner pattern (StaffClient.tsx lines 467–471):**
```typescript
{fetchError && (
  <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
    Could not load appointment requests. Check your connection and refresh.
  </div>
)}
```

**Key differences vs StaffClient.tsx:**
- 4 tabs (new / contacted / booked / cancelled) instead of 2 (active / pending).
- No Add Dialog — appointments come from the public form only.
- No Delete — status changes only (new → contacted → booked / cancelled).
- Edit Sheet becomes a "View + Update" sheet: shows all request fields read-only + a status dropdown + optional notes field for staff.
- No Zod form for the add flow (no add flow). Edit sheet only needs a minimal schema: `{ status: z.enum([...]), notes: z.string().optional() }`.
- Row actions: single "Open" button (Pencil icon) to open the view/edit sheet; no toggle or delete buttons.
- `router.refresh()` pattern is identical — required after every status change.

**Gotchas:**
- Do NOT use `useForm` with the same complex resolver cast pattern — only one simple form needed.
- The `'new'` tab count badge should use `bg-amber-100 text-amber-700` to signal attention (copy pending badge style).
- Component lives in `components/portal/` (not co-located with the page like StaffClient), so imports from `@/app/(portal)/actions/appointments` not `./actions`.

---

### `app/(portal)/actions/appointments.ts`

**Analog:** `app/(portal)/actions/staff.ts` (214 lines total)

**File header + auth guard pattern (staff.ts lines 1–40):**
```typescript
'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function requireStaffRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (error || !profile) throw new Error('Forbidden');
  return supabase;
}
```

**Note:** Appointments actions need a `requireStaffRole()` (any active staff, not just admin) instead of `requireAdminRole()`. Any logged-in staff can update appointment status. Copy the guard structure but remove the `ADMIN_ROLES` check — just verify `is_active: true`.

**Action return pattern (staff.ts lines 59–98):**
```typescript
export async function updateAppointmentStatusAction(
  id: string,
  status: 'new' | 'contacted' | 'booked' | 'cancelled',
  notes?: string
): Promise<{ error?: string }> {
  try {
    const supabase = await requireStaffRole();

    const { error } = await supabase
      .from('appointment_requests')
      .update({ status, notes: notes ?? null, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
```

**Key differences vs staff.ts:**
- No `createAdminClient` import needed — no Auth user creation.
- Only two actions needed: `updateAppointmentStatusAction` + `getAppointmentRequests` (but the latter belongs in `lib/db/` not `actions/`).
- Guard is `requireStaffRole` not `requireAdminRole` — receptionist and doctor roles can also manage appointments.

---

### `lib/db/appointment_requests.ts` *(implied file)*

**Analog:** `lib/db/staff.ts` (69 lines)

**Pattern (staff.ts lines 1–68):**
```typescript
import { createClient } from '@/lib/supabase/server';

export interface AppointmentRequest {
  id: string;
  patient_name: string;
  phone: string;
  preferred_doctor: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  reason: string;
  status: 'new' | 'contacted' | 'booked' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function getAppointmentRequests(): Promise<AppointmentRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('appointment_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch appointments: ${error.message}`);
  return (data ?? []) as AppointmentRequest[];
}
```

**Key differences vs staff.ts:**
- No `createAdminClient` — no Auth user merge required. Regular `createClient` is sufficient.
- Simple `select('*')` — no cross-table merge needed.
- Sort descending (`ascending: false`) — newest requests first.

---

### `components/public/AppointmentForm.tsx` *(modify in place)*

**This is the file being modified, not an analog. It already exists at this path.**

**Current state (existing file lines 1–221):**
- Uses `react-hook-form` + Zod + shadcn Form components.
- Doctor list sourced from `@/lib/data/doctors` (static mock data).
- `onSubmit` is a no-op stub with `toast.success` — the Phase 7 TODO comment is on line 67.
- No `preferredTime` field.
- No hCaptcha integration.
- No props — zero-argument component.

**Changes required:**
1. Add `preferredTime` field to Zod schema and form (after `preferredDate`).
2. Replace static `doctors` import with a `doctors` prop (type `{ id: string; full_name: string }[]`).
3. Wire `onSubmit` to call `submitAppointmentAction` from `@/lib/actions/submitAppointment`.
4. Add hCaptcha token field to schema (`hCaptchaToken: z.string().min(1)`) and render `@hcaptcha/react-hcaptcha` component.
5. Handle loading state (disable submit button during submission).

**Gotchas:**
- The component is `'use client'` — hCaptcha render is fine here.
- `preferredDate` validation uses `new Date(val) >= new Date(today)` inline refine — copy the same pattern for the new `preferredTime` optional field (no validation needed, just `z.string().optional()`).
- The `doctors` prop replaces the static import entirely — update the `SelectItem` map from `doc.name` to `doc.full_name` (DB field name differs from mock data field name).
- Keep `FormControl asWrapper` on the Select fields — this is a custom shadcn prop already in use and must not be removed.
- hCaptcha sitekey must come from `process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY` — not hardcoded.

---

### `app/[locale]/(public)/appointment/page.tsx` *(modify in place)*

**Current state (existing file lines 1–55):**
- Already an `async` Server Component.
- Calls `setRequestLocale(locale)` + `getTranslations`.
- Renders `<AppointmentForm />` with no props.

**Changes required:**
1. Import `getDoctors` from `@/lib/db/doctors`.
2. Fetch doctors in the Server Component body (parallel with any other fetches, or standalone).
3. Pass `doctors` prop to `<AppointmentForm doctors={doctors} />`.

**Pattern to copy — parallel fetch (staff/page.tsx lines 16–19):**
```typescript
try {
  doctors = await getDoctors();
} catch {
  // fall through with empty array — form still works, doctor dropdown shows empty
}
```

**Gotchas:**
- `getDoctors()` already exists in `lib/db/doctors.ts` — no new db utility needed.
- If `getDoctors()` throws, pass an empty array to `AppointmentForm` — the form should still be submittable with "No preference" selected.
- `generateStaticParams` is already defined — do NOT convert to `dynamic = 'force-dynamic'`. The page content is static; only the form submission is dynamic (handled by Server Action, not page data).

---

### `lib/actions/submitAppointment.ts`

**Analog:** `app/(portal)/actions/staff.ts` — same `'use server'` + return pattern, but **no auth guard** (public action, unauthenticated users submit).

**Pattern (adapted from staff.ts lines 1–2 and 59–98):**
```typescript
'use server';

import { createClient } from '@/lib/supabase/server';

export async function submitAppointmentAction(input: {
  patientName: string;
  phone: string;
  preferredDoctor: string;
  preferredDate: string;
  preferredTime?: string;
  reason: string;
  hCaptchaToken: string;
}): Promise<{ error?: string }> {
  try {
    // 1. Verify hCaptcha token server-side
    const verifyRes = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.HCAPTCHA_SECRET_KEY}&response=${input.hCaptchaToken}`,
    });
    const verifyData = await verifyRes.json() as { success: boolean };
    if (!verifyData.success) return { error: 'Captcha verification failed. Please try again.' };

    // 2. Insert into appointment_requests
    const supabase = await createClient();
    const { error } = await supabase.from('appointment_requests').insert({
      patient_name: input.patientName,
      phone: input.phone,
      preferred_doctor: input.preferredDoctor === 'no-preference' ? null : input.preferredDoctor,
      preferred_date: input.preferredDate || null,
      preferred_time: input.preferredTime || null,
      reason: input.reason,
      status: 'new',
    });

    if (error) throw new Error(error.message);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
```

**Key differences vs staff.ts:**
- No `requireAdminRole()` or any auth check — this is a public-facing action.
- Adds hCaptcha server-side verification step before the DB insert.
- Uses regular `createClient` (anon session) — the RLS policy allows anon INSERT.
- Lives in `lib/actions/` not `app/(portal)/actions/` — public actions go in lib, portal-only actions go in the app directory.

**Gotchas:**
- `HCAPTCHA_SECRET_KEY` (no `NEXT_PUBLIC_` prefix) must be in `.env.local` — never exposed to client.
- `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` is needed separately for the client component.
- Supabase anon key has INSERT permission on `appointment_requests` only if the RLS policy allows `TO anon`. The migration must explicitly include `TO anon, authenticated` on the INSERT policy.
- The action file path `lib/actions/submitAppointment.ts` is a new directory (`lib/actions/`). Verify it doesn't conflict with any existing structure before creating.

---

## Shared Patterns

### Auth Guard (portal actions)
**Source:** `app/(portal)/actions/staff.ts` lines 12–40
**Apply to:** `app/(portal)/actions/appointments.ts`
```typescript
async function requireStaffRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile, error } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (error || !profile) throw new Error('Forbidden');
  return supabase;
}
```
Note: Remove the `ADMIN_ROLES` array check — any active staff member can manage appointments.

### Error Return Shape
**Source:** `app/(portal)/actions/staff.ts` lines 96–98
**Apply to:** All Server Actions (portal + public)
```typescript
} catch (err) {
  return { error: err instanceof Error ? err.message : 'Unknown error' };
}
```

### `router.refresh()` after mutation
**Source:** `app/(portal)/staff/StaffClient.tsx` lines 210, 279, 303
**Apply to:** `AppointmentsClient.tsx` — every status change handler must call `router.refresh()` on success to re-fetch server data without full navigation.

### Toast feedback
**Source:** `app/(portal)/staff/StaffClient.tsx` (throughout handlers)
**Apply to:** `AppointmentsClient.tsx`
- `toast.success(message)` on success
- `toast.error(result.error)` when action returns an error string
- `toast.error('Failed to update. Try again.')` in catch blocks

### Tab count badge
**Source:** `app/(portal)/staff/StaffClient.tsx` lines 479–483 (active tab) and 485–490 (pending tab)
**Apply to:** AppointmentsClient "new" tab trigger only (the attention-signalling one)
```typescript
{newCount > 0 && (
  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
    {newCount}
  </span>
)}
```

### SQL migration file structure
**Source:** `supabase/migrations/20260612_cms_tables.sql`
- Comment block at top: `-- Phase N: Description`, `-- Creates: ...`, `-- Includes: ...`
- Section dividers: `-- ============================================================`
- Section numbers: `-- 1. table_name`, `-- 2. rls`, etc.
- `ENABLE ROW LEVEL SECURITY` called on every new table before any policy.

---

## No Analog Found

All files have close analogs in the codebase. No files require falling back to RESEARCH.md patterns exclusively.

| File | Note |
|---|---|
| hCaptcha integration in `AppointmentForm.tsx` | No existing hCaptcha usage in codebase. Follow `@hcaptcha/react-hcaptcha` npm package API. Use `useRef` to get the captcha widget ref and call `.resetCaptcha()` after successful submission. |
| `lib/actions/` directory | New directory with no prior files. Pattern borrowed from portal actions — same `'use server'` convention, different location. |

---

## Metadata

**Analog search scope:** `app/(portal)/`, `components/portal/`, `lib/db/`, `supabase/migrations/`, `components/public/`, `app/[locale]/(public)/`
**Files scanned:** 9 source files read in full
**Pattern extraction date:** 2026-06-12
