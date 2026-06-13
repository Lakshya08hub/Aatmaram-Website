# Phase 10: Analytics Dashboard - Pattern Map

**Mapped:** 2026-06-13
**Files analyzed:** 3 new/modified files
**Analogs found:** 3 / 3

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/(portal)/analytics/page.tsx` | page (Server Component) | request-response | `app/(portal)/payroll/page.tsx` | exact |
| `lib/db/analytics.ts` | service / db-query | CRUD | `lib/db/payroll.ts` | exact |
| `app/[locale]/layout.tsx` | layout (modification) | request-response | `app/[locale]/layout.tsx` (self) | self |

---

## Pattern Assignments

### `app/(portal)/analytics/page.tsx` (Server Component page, request-response)

**Analog:** `app/(portal)/payroll/page.tsx`

**Key difference from payroll:** No `PayrollClient` split needed — analytics has zero interactivity. The page is a pure Server Component that fetches all data and renders directly. No `'use client'` boundary.

**Imports pattern** (payroll/page.tsx lines 1-2 — adapt for analytics):
```typescript
import { getActiveStaffWithPaymentStatus, getMonthlyPayrollTotal } from '@/lib/db/payroll';
import { getAppointmentStats, getPatientVolumeStats } from '@/lib/db/analytics';
// No PayrollClient import — analytics renders inline
```

**Date helper pattern** (payroll/page.tsx lines 4-8 — copy verbatim):
```typescript
function toFirstOfMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}
```

**requireAdminRole() pattern** (actions/payroll.ts lines 13-43 — inline duplicate in page file):
```typescript
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StaffRole } from '@/lib/portal/roles';

const ADMIN_ROLES: StaffRole[] = ['super_admin', 'admin'];

async function requireAdminRole() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();   // Always getUser(), never getSession() — T-04-08

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (error || !profile || !ADMIN_ROLES.includes(profile.role as StaffRole)) {
    throw new Error('Forbidden');
  }

  return supabase;
}
```

**Core page pattern** (payroll/page.tsx lines 10-25 — adapt for 4-way Promise.all):
```typescript
export default async function AnalyticsPage() {
  await requireAdminRole();

  const currentMonth = toFirstOfMonth(new Date());
  const now = new Date();

  const [appointmentStats, staff, payrollTotal, patientStats] = await Promise.all([
    getAppointmentStats(now),
    getActiveStaffWithPaymentStatus(currentMonth),
    getMonthlyPayrollTotal(currentMonth),
    getPatientVolumeStats(now),
  ]);

  // Derive role counts from existing staff rows — no extra DB call
  const roleCount = staff.reduce<Record<string, number>>((acc, s) => {
    acc[s.role] = (acc[s.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-8">
      {/* Section 1: GA4 link card */}
      {/* Section 2: Appointment Operations */}
      {/* Section 3: Staff & Payroll Summary */}
      {/* Section 4: Patient Volume */}
    </div>
  );
}
```

**Layout/padding pattern** (consistent with portal pages):
- Outer wrapper: `<div className="p-8">`
- Section spacing: `space-y-8` or `mb-8` between Card components
- Card components from `components/ui/card.tsx`: `Card`, `CardHeader`, `CardTitle`, `CardContent`
- Status badges from `components/ui/badge.tsx`

---

### `lib/db/analytics.ts` (service/db-query, CRUD)

**Analog:** `lib/db/payroll.ts`

**Imports pattern** (payroll.ts lines 1-2 — copy verbatim):
```typescript
import { createAdminClient } from '@/lib/supabase/admin';
import { StaffRole } from '@/lib/portal/roles';  // only if StaffRole needed
```

**createAdminClient() call pattern** (payroll.ts lines 21, 74 — always call at top of each function):
```typescript
export async function getAppointmentStats(now: Date): Promise<AppointmentStats> {
  const adminClient = createAdminClient();   // always adminClient, never createClient()
  // ...
}
```

**Supabase query + error pattern** (payroll.ts lines 28-37 — copy structure):
```typescript
const { data: profiles, error: profilesError } = await adminClient
  .from('profiles')
  .select('id, full_name, role, salary, join_date')
  .eq('is_active', true)
  .order('created_at', { ascending: true });

if (profilesError) {
  throw new Error(`Failed to fetch staff profiles: ${profilesError.message}`);
}
```

**Null-safe data access pattern** (payroll.ts lines 55-66):
```typescript
return (profiles ?? []).map((p) => {
  return {
    id: p.id as string,
    full_name: p.full_name as string | null,
    role: p.role as StaffRole,
  };
});
```

**getAppointmentStats() shape** — new function, no analog, follows payroll.ts conventions:
```typescript
export interface AppointmentStats {
  thisWeek: number;
  thisMonth: number;
  byStatus: Record<string, number>;   // 'pending' | 'contacted' | 'confirmed' | 'cancelled'
  byDoctor: { doctor: string; count: number }[];
}

export async function getAppointmentStats(now: Date): Promise<AppointmentStats> {
  const adminClient = createAdminClient();

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data, error } = await adminClient
    .from('appointment_requests')
    .select('created_at, status, preferred_doctor');

  if (error) throw new Error(`Failed to fetch appointment stats: ${error.message}`);

  const rows = data ?? [];
  const nowMs = now.getTime();
  const weekMs = sevenDaysAgo.getTime();
  const monthMs = startOfMonth.getTime();

  let thisWeek = 0, thisMonth = 0;
  const byStatus: Record<string, number> = {};
  const byDoctor: Record<string, number> = {};

  for (const row of rows) {
    const ts = new Date(row.created_at as string).getTime();
    if (ts >= weekMs && ts <= nowMs) thisWeek++;
    if (ts >= monthMs && ts <= nowMs) thisMonth++;
    const s = (row.status as string) ?? 'unknown';
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    const d = (row.preferred_doctor as string) ?? 'Unknown';
    byDoctor[d] = (byDoctor[d] ?? 0) + 1;
  }

  return {
    thisWeek,
    thisMonth,
    byStatus,
    byDoctor: Object.entries(byDoctor)
      .map(([doctor, count]) => ({ doctor, count }))
      .sort((a, b) => b.count - a.count),
  };
}
```

**getPatientVolumeStats() shape** — new function, same pattern:
```typescript
export interface PatientVolumeStats {
  thisWeek: number;
  thisMonth: number;
}

export async function getPatientVolumeStats(now: Date): Promise<PatientVolumeStats> {
  const adminClient = createAdminClient();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data, error } = await adminClient
    .from('patient_records')
    .select('created_at')
    .gte('created_at', startOfMonth.toISOString());

  if (error) throw new Error(`Failed to fetch patient stats: ${error.message}`);

  const rows = data ?? [];
  const weekMs = sevenDaysAgo.getTime();
  const nowMs = now.getTime();

  let thisWeek = 0, thisMonth = 0;
  for (const row of rows) {
    const ts = new Date(row.created_at as string).getTime();
    if (ts >= weekMs && ts <= nowMs) thisWeek++;
    thisMonth++;
  }

  return { thisWeek, thisMonth };
}
```

---

### `app/[locale]/layout.tsx` (layout modification — add GA4 gtag)

**Analog:** `app/[locale]/layout.tsx` (self — modification only)

**Current structure** (layout.tsx lines 1-33 — full file, read in context):
- Imports: `NextIntlClientProvider`, `getMessages`, `notFound`, `GeistSans`, `routing`, `Toaster`
- Returns `<html lang={locale} className={GeistSans.variable}><body>...</body></html>`
- `<Toaster />` is the last child inside `<NextIntlClientProvider>`

**Modification: add Next.js Script import** (insert after existing imports, line 7):
```typescript
import Script from 'next/script';
```

**Modification: add gtag scripts** (insert inside `<body>`, after `<NextIntlClientProvider>` closing tag or as siblings of `{children}`):
```tsx
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
  strategy="afterInteractive"
/>
<Script id="ga4-init" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
  `}
</Script>
```

**Constraint:** `NEXT_PUBLIC_GA_MEASUREMENT_ID` must be in `.env.local` before `next dev` restarts — manual checkpoint required in the plan before this code is added.

---

## Shared Patterns

### Authentication Gate
**Source:** `app/(portal)/actions/payroll.ts` lines 13-43
**Apply to:** `app/(portal)/analytics/page.tsx`

Pattern: inline `requireAdminRole()` function (not imported from a shared module — established convention is to duplicate it). Uses `createClient()` (session-scoped) for auth check only, then `createAdminClient()` for all data queries.

```typescript
const ADMIN_ROLES: StaffRole[] = ['super_admin', 'admin'];

async function requireAdminRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile, error } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (error || !profile || !ADMIN_ROLES.includes(profile.role as StaffRole)) {
    throw new Error('Forbidden');
  }
  return supabase;
}
```

### Admin Client for DB Queries
**Source:** `lib/db/payroll.ts` lines 21, 74
**Apply to:** `lib/db/analytics.ts` (all exported functions)

Always `createAdminClient()` for portal reads — never `createClient()`. Bypasses RLS for tables where policies may block server-side reads.

### Error Throw Pattern
**Source:** `lib/db/payroll.ts` lines 35-37, 44-46
**Apply to:** `lib/db/analytics.ts` (all exported functions)

```typescript
if (error) {
  throw new Error(`Failed to fetch <entity>: ${error.message}`);
}
```

### Null-safe Data Access
**Source:** `lib/db/payroll.ts` lines 55, 86
**Apply to:** `lib/db/analytics.ts`

Always use `data ?? []` before iterating. Cast columns explicitly: `p.id as string`, `row.status as string`.

### toFirstOfMonth Helper
**Source:** `app/(portal)/payroll/page.tsx` lines 4-8 (also duplicated in actions/payroll.ts lines 15-19)
**Apply to:** `app/(portal)/analytics/page.tsx`

Copy verbatim — this helper is duplicated by convention (not imported from a shared module).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (none) | — | — | All files have strong analogs |

---

## Metadata

**Analog search scope:** `app/(portal)/payroll/`, `app/(portal)/actions/`, `lib/db/`, `app/[locale]/`
**Files scanned:** 4 analog files read directly
**Pattern extraction date:** 2026-06-13

### Critical Implementation Notes (for planner)

1. **`requireAdminRole()` is inline-duplicated** — do not create a shared import. Established convention per payroll.ts vs actions/payroll.ts both having the function.
2. **No PayrollClient split** — analytics page has no interactivity; render everything in the Server Component directly.
3. **Sidebar nav requires no changes** — `/analytics` already exists in `ROLE_SECTIONS` for admin/super_admin in `lib/portal/roles.ts`.
4. **GA4 section is a link card, not an iframe** — D-02 was revised (CONTEXT.md). X-Frame-Options blocks iframe. Render a `Card` with a description and `<a href="https://analytics.google.com" target="_blank">` button.
5. **Four appointment statuses** — `pending`, `contacted`, `confirmed`, `cancelled`. D-07 in CONTEXT.md lists three; migration has four. Use four.
6. **Manual checkpoint required** — GA4 property must be created and `NEXT_PUBLIC_GA_MEASUREMENT_ID` added to `.env.local` before the gtag snippet can be added to layout.tsx.
