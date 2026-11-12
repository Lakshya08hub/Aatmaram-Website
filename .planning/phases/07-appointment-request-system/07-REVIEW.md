---
phase: 7
phase_name: appointment-request-system
status: issues_found
review_depth: standard
files_reviewed: 9
files_reviewed_list:
  - supabase/migrations/20260612_appointment_requests.sql
  - lib/actions/submitAppointmentAction.ts
  - components/public/AppointmentForm.tsx
  - app/[locale]/(public)/appointment/page.tsx
  - lib/db/appointment_requests.ts
  - app/(portal)/actions/appointments.ts
  - components/portal/AppointmentsClient.tsx
  - app/(portal)/appointments/page.tsx
  - app/(portal)/layout.tsx
findings:
  critical: 4
  warning: 6
  info: 3
  total: 13
---

# Phase 7: Code Review Report

**Reviewed:** 2026-06-20T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Phase 7 implements a public appointment request form backed by hCaptcha, a Supabase table, and a portal management UI. The overall structure is sound: the Server Action verifies the hCaptcha token server-side using the secret key, portal actions are role-gated, and the layout-level auth guard is correct. However, four critical issues exist: missing input length validation opens a storage-abuse/DoS vector on the public endpoint; hCaptcha tokens are not defended against replay within their validity window; the portal appointments page RSC imports a non-existent `KanbanBoard` component (runtime crash); and `getAppointmentRequests` fetches all rows with no limit (unbounded query). Additionally the `updateAppointmentStatusAction` swallows `isRedirectError`, the status enum is not re-validated server-side at runtime, and several warning-level gaps compound the robustness posture.

---

## Critical Issues

### CR-01: No Input Length / Content Validation on Public Server Action — Storage Abuse / DoS

**File:** `lib/actions/submitAppointmentAction.ts:8–58`

**Issue:** `submitAppointmentAction` accepts `patientName`, `phone`, `preferredDoctor`, `preferredDate`, and `reason` from the caller and inserts them directly into the DB after only verifying hCaptcha and checking `preferredTime`. There is no max-length guard on any TEXT field. A single request with a multi-megabyte `reason` payload passes all current checks and writes to Postgres. Client-side Zod in `AppointmentForm.tsx` is trivially bypassed by calling the Server Action directly (it is a public endpoint). Because hCaptcha tokens can be solved in bulk via CAPTCHA farms, this is an effective storage-exhaustion and data-corruption vector.

**Fix:** Run a Zod parse on the raw input at the top of the action, before hCaptcha and before DB insert:

```ts
import { z } from 'zod'

const appointmentSchema = z.object({
  patientName:     z.string().min(2).max(100),
  phone:           z.string().regex(/^[6-9]\d{9}$/),
  preferredDoctor: z.string().min(1).max(100),
  preferredDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredTime:   z.enum(['morning', 'afternoon', 'evening']),
  reason:          z.string().min(10).max(1000),
  captchaToken:    z.string().min(1),
})

export async function submitAppointmentAction(rawInput: unknown): Promise<{ error?: string }> {
  const parsed = appointmentSchema.safeParse(rawInput)
  if (!parsed.success) return { error: 'Invalid input.' }
  const input = parsed.data
  // … hCaptcha verify, then insert using input.*
}
```

---

### CR-02: No Rate Limiting on Public Server Action — CAPTCHA Farm Bypass

**File:** `lib/actions/submitAppointmentAction.ts:17–29`

**Issue:** There is no per-IP or per-session rate limit on `submitAppointmentAction`. hCaptcha tokens expire after ~60–120 seconds on the hCaptcha server, but a single solved token is usable once; a CAPTCHA farm can solve tokens at ~1/second and flood the endpoint. The code also does not validate the `hostname` field in the hCaptcha verify response, allowing tokens harvested from any other site using the same site key to be replayed here.

**Fix (minimum viable — in-memory rate limiter, acceptable per project constraints):**

```ts
const ipRateMap = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 5

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipRateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    ipRateMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= MAX_PER_WINDOW) return false
  entry.count++
  return true
}
```

Retrieve the caller IP from `headers()` and call `checkRateLimit` before hCaptcha verify. Also add hostname validation:

```ts
const verifyData = await verifyRes.json() as { success: boolean; hostname?: string }
if (!verifyData.success || verifyData.hostname !== process.env.NEXT_PUBLIC_SITE_HOSTNAME) {
  return { error: 'CAPTCHA verification failed. Please try again.' }
}
```

---

### CR-03: Portal Appointments Page Imports Non-existent `KanbanBoard` — Runtime Crash

**File:** `app/(portal)/appointments/page.tsx:5,44`

**Issue:** The portal appointments page RSC imports `KanbanBoard` from `@/components/portal/KanbanBoard` (line 5) and renders `<KanbanBoard appointments={appointments} />` (line 44). No such component exists; the actual implementation is `AppointmentsClient` in `components/portal/AppointmentsClient.tsx`. This is a fatal module-not-found error: the page crashes at runtime (and at `next build`), making the entire appointments section of the portal inaccessible to all staff.

**Fix:** Replace the import and JSX render:

```tsx
// app/(portal)/appointments/page.tsx — line 5
import AppointmentsClient from '@/components/portal/AppointmentsClient'

// line 44 — replace KanbanBoard render with:
<AppointmentsClient appointments={appointments} fetchError={fetchError} />
```

Also remove the duplicate `<h1>` and error banner from the page RSC (lines 36–43) since `AppointmentsClient` renders its own.

---

### CR-04: `getAppointmentRequests` Fetches Unbounded Rows — No Limit or Pagination

**File:** `lib/db/appointment_requests.ts:16–25`

**Issue:** `getAppointmentRequests()` runs `.select('*').order('created_at', { ascending: false })` with no `.limit()`. For an active 90-bed hospital receiving dozens of appointment requests per week, this query will grow indefinitely. Once row count is high enough, the query will time out (Supabase default 8s), causing the portal to show the fetch-error banner with zero appointments — staff lose visibility into all pending requests with no actionable error.

**Fix:** Add a default limit immediately:

```ts
export async function getAppointmentRequests(limit = 300): Promise<AppointmentRequest[]> {
  const supabase = createAdminClient()   // also see WR-03
  const { data, error } = await supabase
    .from('appointment_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error('Failed to fetch appointments: ' + error.message)
  return (data ?? []) as AppointmentRequest[]
}
```

---

## Warnings

### WR-01: `updateAppointmentStatusAction` Swallows `isRedirectError`

**File:** `app/(portal)/actions/appointments.ts:31–33`

**Issue:** The outer `try/catch` catches all errors including Next.js `NEXT_REDIRECT` throws (used internally by `redirect()`). If `requireRole` or any future call inside the try block invokes `redirect()`, the redirect is eaten and returned as `{ error: "NEXT_REDIRECT" }` to the client. This is the same bug class fixed in Phase 8 for patient records.

**Fix:**

```ts
import { isRedirectError } from 'next/dist/client/components/redirect'

} catch (err) {
  if (isRedirectError(err)) throw err
  return { error: err instanceof Error ? err.message : 'Unknown error' }
}
```

Apply the same fix to `updateAppointmentNotesAction` (line 51).

---

### WR-02: `AppointmentStatus` Not Runtime-Validated Before DB Update

**File:** `app/(portal)/actions/appointments.ts:12–34`

**Issue:** `updateAppointmentStatusAction` accepts `status: AppointmentStatus`. TypeScript types are erased at runtime; a caller supplying `status: "deleted"` passes compile-time checks at the call site but arrives as a plain string. Postgres will reject the invalid enum value, but the action returns a generic "Unknown error" rather than a clear validation rejection, and the client UI leaves the row in a dirty state with no guidance.

**Fix:** Add a runtime allowlist guard before the DB call:

```ts
const VALID_STATUSES = ['pending', 'contacted', 'confirmed', 'cancelled'] as const
if (!(VALID_STATUSES as readonly string[]).includes(status)) {
  return { error: 'Invalid status value.' }
}
```

---

### WR-03: `getAppointmentRequests` Uses User-Scoped Client Against RLS-Disabled Table

**File:** `lib/db/appointment_requests.ts:1,17`

**Issue:** The file uses `createClient` (the user-scoped Supabase client, which attaches the user's JWT) to query `appointment_requests`. The migration explicitly disables RLS (`DISABLE ROW LEVEL SECURITY`) with the stated reason that all access should go through the service role (D-02). If RLS is ever re-enabled (e.g. to add a policy), the user-scoped client will silently return zero rows (RLS default-deny), and staff will see an empty appointments list with no error.

**Fix:** Use `createAdminClient` for consistency with D-02 and resilience against future RLS changes:

```ts
import { createAdminClient } from '@/lib/supabase/admin'

export async function getAppointmentRequests(): Promise<AppointmentRequest[]> {
  const supabase = createAdminClient()
  // …
}
```

---

### WR-04: `preferredDate` Not Validated Server-Side — Past Dates Accepted

**File:** `lib/actions/submitAppointmentAction.ts:37–50`

**Issue:** The Server Action validates `preferredTime` against a whitelist but does not validate `preferredDate` at all. A caller bypassing the client form can submit `preferredDate: "2000-01-01"` and it will be stored. The DB column is `DATE NOT NULL`, which will accept any valid date string regardless of whether it is in the past.

**Fix:** Add a date check after hCaptcha verification:

```ts
const today = new Date().toISOString().split('T')[0]
if (!/^\d{4}-\d{2}-\d{2}$/.test(input.preferredDate) || input.preferredDate < today) {
  return { error: 'Please select a valid date from today onwards.' }
}
```

(This becomes redundant once CR-01's Zod schema is applied, but should be kept as defence-in-depth until then.)

---

### WR-05: No Optimistic UI Revert on Save Failure in `AppointmentsClient`

**File:** `components/portal/AppointmentsClient.tsx:205–224`

**Issue:** When `handleSaveStatus` is called, the row Select already shows the new status (the `rowState` was updated on change). On save failure, only a toast is shown; `rowStates` is not reverted. A receptionist who dismisses the toast will believe the status is saved when it is not. The stale local state also means subsequent saves of the same row will send the wrong (already-applied-locally) status to the server.

**Fix:** Snapshot the previous state before the async call and revert on error:

```ts
async function handleSaveStatus(id: string) {
  const rowState = rowStates.get(id)
  if (!rowState) return
  const prevState = { ...rowState }
  try {
    const result = await updateAppointmentStatusAction(id, rowState.status, rowState.notes || undefined)
    if (result.error) {
      toast.error(result.error)
      updateRowState(id, prevState)   // revert
    } else {
      toast.success('Status updated')
      updateRowState(id, { dirty: false })
      router.refresh()
    }
  } catch {
    toast.error('Failed to update. Try again.')
    updateRowState(id, prevState)     // revert
  }
}
```

---

### WR-06: `preferredDate` Zod Refine Allows Empty String — Required Field Not Enforced

**File:** `components/public/AppointmentForm.tsx:60–65`

**Issue:** The `preferredDate` refine starts with `!val ||`, meaning an empty string passes the refine predicate (short-circuit). The field is visually required (`*` label) but Zod will not reject a blank date value, allowing a form submission with `preferredDate: ""`. The Server Action will then attempt to insert an empty string into a `DATE NOT NULL` column, producing a DB error rather than a user-friendly validation message.

**Fix:** Remove the `!val ||` escape hatch:

```ts
preferredDate: z.string()
  .min(1, 'Please select a date.')
  .refine(
    (val) => new Date(val) >= new Date(new Date().toISOString().split('T')[0]),
    'Please select a date from today onwards.'
  ),
```

---

## Info

### IN-01: Duplicate Error Banner — RSC and Client Component Both Render It

**File:** `app/(portal)/appointments/page.tsx:38–43` and `components/portal/AppointmentsClient.tsx:239–243`

**Issue:** Both the page RSC and `AppointmentsClient` contain a red "Could not load" error banner. Once CR-03 is fixed by using `AppointmentsClient`, both banners will render on fetch failure, producing duplicate error messages.

**Fix:** Remove the error banner from the page RSC and let `AppointmentsClient` own all error UI via its `fetchError` prop.

---

### IN-02: `updateAppointmentNotesAction` Accepts Unbounded `notes` String

**File:** `app/(portal)/actions/appointments.ts:36–54`

**Issue:** `updateAppointmentNotesAction` accepts `notes: string` with no length cap. `AppointmentsClient` enforces `maxLength={500}` via the `Textarea` HTML attribute, but this is a client-side hint only — it can be bypassed by direct API calls. The `notes` column is `TEXT` with no DB-level constraint.

**Fix:** Add a length check in the action:

```ts
if (notes.length > 1000) return { error: 'Notes exceed maximum length.' }
```

---

### IN-03: `console.error` With Full Error Object in Production RSC

**File:** `app/(portal)/appointments/page.tsx:30`

**Issue:** `console.error('[AppointmentsPage] Failed to load appointment requests:', e)` logs the full error object (which may include Supabase error details containing schema or query info) to server logs in production.

**Fix:** Log only the message:

```ts
console.error('[AppointmentsPage] fetch error:', e instanceof Error ? e.message : String(e))
```

---

_Reviewed: 2026-06-20T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
