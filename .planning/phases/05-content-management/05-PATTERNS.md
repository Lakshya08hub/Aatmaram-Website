# Phase 5: Content Management — Pattern Map

**Mapped:** 2026-06-12
**Files analyzed:** 17
**Analogs found:** 15 / 17

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/20260612_cms_tables.sql` | migration | batch | `supabase/migrations/20260611_profiles.sql` | exact |
| `lib/supabase/admin.ts` | config | request-response | `lib/supabase/server.ts` | role-match |
| `lib/db/departments.ts` | service | CRUD | `app/(portal)/dashboard/page.tsx` (supabase read pattern) | partial |
| `lib/db/doctors.ts` | service | CRUD | `app/(portal)/dashboard/page.tsx` | partial |
| `lib/db/facilities.ts` | service | CRUD | `app/(portal)/dashboard/page.tsx` | partial |
| `lib/db/hospital-info.ts` | service | CRUD | `app/(portal)/dashboard/page.tsx` | partial |
| `app/(portal)/actions/content.ts` | service | request-response | `app/(portal)/actions/auth.ts` | exact |
| `app/(portal)/content/layout.tsx` | layout | request-response | `app/(portal)/layout.tsx` | role-match |
| `app/(portal)/content/departments/page.tsx` | controller | CRUD | `app/(portal)/dashboard/page.tsx` | role-match |
| `app/(portal)/content/departments/DepartmentsClient.tsx` | component | CRUD | `components/portal/LoginForm.tsx` | role-match |
| `app/(portal)/content/doctors/page.tsx` | controller | CRUD | `app/(portal)/dashboard/page.tsx` | role-match |
| `app/(portal)/content/doctors/DoctorsClient.tsx` | component | CRUD | `components/portal/LoginForm.tsx` | role-match |
| `app/(portal)/content/facilities/page.tsx` | controller | CRUD | `app/(portal)/dashboard/page.tsx` | role-match |
| `app/(portal)/content/facilities/FacilitiesClient.tsx` | component | CRUD | `components/portal/LoginForm.tsx` | role-match |
| `app/(portal)/content/hospital-info/page.tsx` | controller | request-response | `app/(portal)/dashboard/page.tsx` | role-match |
| `app/[locale]/(public)/departments/page.tsx` | controller | request-response | `app/[locale]/(public)/departments/page.tsx` (self — convert) | exact |
| `app/[locale]/(public)/doctors/page.tsx` | controller | request-response | `app/[locale]/(public)/departments/page.tsx` | exact |
| `app/[locale]/(public)/services/page.tsx` | controller | request-response | `app/[locale]/(public)/departments/page.tsx` | exact |
| `app/[locale]/(public)/contact/page.tsx` | controller | request-response | `app/[locale]/(public)/contact/page.tsx` (self — convert) | exact |
| `lib/portal/roles.ts` | config | — | `lib/portal/roles.ts` (self — extend) | exact |

---

## Pattern Assignments

### `supabase/migrations/20260612_cms_tables.sql` (migration, batch)

**Analog:** `supabase/migrations/20260611_profiles.sql`

**Header comment pattern** (lines 1-3):
```sql
-- supabase/migrations/20260611_profiles.sql
-- Phase 4: minimal auth-only columns. Phase 6 adds name/phone/salary/join_date.
```

**Type + table + RLS pattern** (lines 4-23):
```sql
CREATE TYPE staff_role AS ENUM ('super_admin', 'admin', 'doctor', 'receptionist');

CREATE TABLE profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        staff_role NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: own read"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);
```

**Key differences for Phase 5:**
- Four tables: `departments`, `doctors`, `facilities`, `hospital_info`
- RLS SELECT policies target `TO anon, authenticated` (public read), not `auth.uid()` check
- No INSERT/UPDATE/DELETE RLS — service_role key bypasses RLS; role check is in Server Action application code
- `doctors` table includes `staff_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL` as nullable Phase 6 forward-compat column
- `hospital_info` seeded with one empty row via `INSERT INTO hospital_info DEFAULT VALUES`

---

### `lib/supabase/admin.ts` (config, request-response)

**Analog:** `lib/supabase/server.ts` (lines 1-27)

**Full pattern to copy and adapt:**
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,   // <-- change to SUPABASE_SERVICE_ROLE_KEY
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        }
      }
    }
  );
}
```

**Change for admin.ts:** Replace `NEXT_PUBLIC_SUPABASE_ANON_KEY` with `process.env.SUPABASE_SERVICE_ROLE_KEY!`. Rename the export to `createAdminClient` to distinguish it from the anon client. This client is imported only in Server Actions that perform CMS mutations.

---

### `lib/db/departments.ts` (and `doctors.ts`, `facilities.ts`, `hospital-info.ts`) (service, CRUD)

**Analog:** `app/(portal)/dashboard/page.tsx` — Supabase read pattern (lines 23-34)

**Supabase read pattern to copy:**
```typescript
const supabase = await createClient();

const { data: { user } } = await supabase.auth.getUser();

const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('user_id', user!.id)
  .single();
```

**Adapted for db utility files:**
```typescript
// lib/db/departments.ts
import { createClient } from '@/lib/supabase/server';

export type Department = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function getDepartments(): Promise<Department[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
```

Use `createClient` from `@/lib/supabase/server` (anon key — public reads work under anon RLS SELECT policy). All four db files follow this same pattern with their respective table names and type shapes.

---

### `app/(portal)/actions/content.ts` (service, request-response)

**Analog:** `app/(portal)/actions/auth.ts` (lines 1-41)

**`'use server'` + imports pattern** (lines 1-9):
```typescript
'use server';
// app/(portal)/actions/auth.ts
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
```

**Return type pattern** (lines 16-19):
```typescript
export async function loginAction(formData: {
  email: string;
  password: string;
}): Promise<{ error: string } | never> {
```

**Error return pattern** (lines 26-30):
```typescript
if (error) {
  return { error: error.message };
}
```

**Adapted for content.ts:**
- Add `import { revalidatePath } from 'next/cache';` at top
- Add `import type { StaffRole } from '@/lib/portal/roles';` for role type
- Add `requireCmsRole()` helper that calls `supabase.auth.getUser()` (never `getSession()`), fetches profile, checks role is `super_admin` or `admin`, redirects to `/login` if not authenticated, throws `Error('Forbidden')` if wrong role
- Each action returns `Promise<{ error?: string }>` (optional error, empty object on success)
- Every mutation calls `revalidatePath('/en/<segment>')` and `revalidatePath('/hi/<segment>')` after success
- Wrap every action body in `try/catch` — return `{ error: err instanceof Error ? err.message : 'Unknown error' }`

---

### `app/(portal)/content/layout.tsx` (layout, request-response)

**Analog:** `app/(portal)/layout.tsx` (lines 1-54)

**Pattern to reference** (lines 15-54):
```typescript
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // auth guard pattern — copy getUser() + profile fetch
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect('/login'); }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect('/login');
  }
  // ...
}
```

**Key differences for content/layout.tsx:**
- This is a nested layout — it does NOT render `<html><body>` (portal root layout already does that)
- Optionally renders a content sub-nav (tabs or sidebar links) for the four content sub-routes
- Role check: redirect if role is not `super_admin` or `admin` (content section is admin-only)
- Children are wrapped in a `<div>` or `<section>`, not a full page shell

---

### `app/(portal)/content/departments/page.tsx` (and `doctors/page.tsx`, `facilities/page.tsx`) (controller, CRUD)

**Analog:** `app/(portal)/dashboard/page.tsx` (lines 22-56)

**Server Component data-fetch + render pattern** (lines 22-56):
```typescript
export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user!.id)
    .single();

  const role = (profile?.role ?? 'receptionist') as StaffRole;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
      // ...
    </div>
  );
}
```

**Adapted portal list page pattern:**
```typescript
// Server Component — fetches data, delegates rendering to Client Component
import { getDepartments } from '@/lib/db/departments';
import { DepartmentsClient } from './DepartmentsClient';

export default async function DepartmentsPortalPage() {
  let departments = [];
  let fetchError = false;
  try {
    departments = await getDepartments();
  } catch {
    fetchError = true;
  }
  return <DepartmentsClient initialData={departments} fetchError={fetchError} />;
}
```

Page-level container: `<div className="p-8">`. Page heading: `<h1 className="text-2xl font-bold text-slate-800">`. Auth is already guarded by `content/layout.tsx` — page does NOT re-check auth.

---

### `app/(portal)/content/departments/DepartmentsClient.tsx` (and equivalent for doctors/facilities) (component, CRUD)

**Analog:** `components/portal/LoginForm.tsx` (lines 1-117)

**`'use client'` + imports pattern** (lines 1-19):
```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
```

**Zod schema pattern** (lines 24-29):
```typescript
const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})
type LoginFormValues = z.infer<typeof loginSchema>
```

**useForm + onSubmit + action call pattern** (lines 35-49):
```typescript
const form = useForm<LoginFormValues>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: '', password: '' },
})

const onSubmit = async (data: LoginFormValues) => {
  const result = await loginAction(data)
  if (result && 'error' in result) {
    toast.error(result.error)
  }
}
```

**Loading-disabled button pattern** (lines 104-110):
```typescript
<Button
  type="submit"
  disabled={form.formState.isSubmitting}
>
  {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
</Button>
```

**Adapted for DepartmentsClient — additions:**
- Import `useRouter` from `next/navigation`; call `router.refresh()` after successful mutation to re-run the Server Component
- Import `useState` for dialog/sheet open state and delete target state
- Add `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow` from `@/components/ui/table`
- Add `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from `@/components/ui/dialog`
- Add `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle` from `@/components/ui/alert-dialog`
- Add lucide-react icons: `Pencil`, `Trash2`, `Plus` for table row actions and Add button
- Props: `initialData: Department[]`, `fetchError: boolean`
- On success: `toast.success('Department added')`, `setOpen(false)`, `router.refresh()`
- On server error: `toast.error('Failed to save. Try again.')`
- Fetch error state: inline banner `<div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">Could not load departments...</div>`

---

### `app/(portal)/content/hospital-info/page.tsx` (controller + component, request-response)

**Analog:** `app/(portal)/dashboard/page.tsx` + `components/portal/LoginForm.tsx`

This page is simpler — no list, no table. The Server Component fetches the single `hospital_info` row and passes it to a Client Component form. The form pattern is identical to `LoginForm.tsx` but with more fields and a `Textarea` for about text. The submit calls `updateHospitalInfoAction` and toasts on result. No Dialog or AlertDialog needed.

---

### `app/[locale]/(public)/departments/page.tsx` (convert from static to DB) (controller, request-response)

**Analog:** Current `app/[locale]/(public)/departments/page.tsx` (self — lines 1-59)

**Current static pattern to REMOVE:**
```typescript
// line 6 — remove:
import { departments } from '@/lib/data/departments';

// lines 14-16 — remove:
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// lines 46-52 — remove:
{departments.map((dept) => (
  <DepartmentCard
    name={t(`${dept.translationKey}.name`)}
    description={t(`${dept.translationKey}.description`)}
  />
))}
```

**Pattern to ADD (lines to inject):**
```typescript
// After existing imports — add:
import { getDepartments, type Department } from '@/lib/db/departments';

// Before export default — add:
export const dynamic = 'force-dynamic';

// Inside the async function body, before return — add:
let departments: Department[] = [];
try {
  departments = await getDepartments();
} catch (err) {
  console.error('[departments page] Supabase read failed:', err);
  // Fail silently — show empty list on public side (UI-SPEC)
}

// Replace the static map with:
{departments.map((dept) => (
  <DepartmentCard
    key={dept.id}
    name={dept.name}
    description={dept.description}
  />
))}
```

**Keep unchanged:** All `setRequestLocale`, `getTranslations`, `SectionHeading`, surrounding JSX structure, `metadata` export, `PageProps` type.

Apply this same conversion pattern to `doctors/page.tsx`, `services/page.tsx`, and `contact/page.tsx` — each swapping its static import for the relevant `lib/db/*.ts` function.

---

### `app/[locale]/(public)/contact/page.tsx` (convert static to DB) (controller, request-response)

**Analog:** Current `app/[locale]/(public)/contact/page.tsx` (self — lines 1-104)

**Current pattern to REMOVE:**
```typescript
// lines 13-15 — remove:
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
```

**Pattern to ADD:**
```typescript
import { getHospitalInfo, type HospitalInfo } from '@/lib/db/hospital-info';

export const dynamic = 'force-dynamic';

// Inside page function, before return:
let info: HospitalInfo | null = null;
try {
  info = await getHospitalInfo();
} catch (err) {
  console.error('[contact page] Supabase read failed:', err);
}

// Replace t('address.value') etc. with:
info?.address_line1 ?? t('address.value')
info?.emergency_number ?? t('emergency.value')
// etc. — fall back to translation keys if DB row is null (graceful degradation)
```

---

### `lib/portal/roles.ts` (config — extend ALL_SECTIONS and ROLE_SECTIONS)

**Analog:** Current `lib/portal/roles.ts` (self — lines 14-37)

**Current ALL_SECTIONS pattern** (lines 14-22):
```typescript
export const ALL_SECTIONS: SectionConfig[] = [
  { key: 'dashboard',     label: 'Dashboard',     href: '/dashboard' },
  { key: 'staff',         label: 'Staff',         href: '/staff' },
  // ...
];
```

**Add to ALL_SECTIONS** (insert before `settings`):
```typescript
{ key: 'content', label: 'Content', href: '/content/departments' },
```

**Current ROLE_SECTIONS pattern** (lines 32-37):
```typescript
export const ROLE_SECTIONS: Record<StaffRole, string[]> = {
  super_admin:  ['dashboard', 'staff', 'appointments', 'patients', 'payroll', 'analytics', 'settings'],
  admin:        ['dashboard', 'staff', 'appointments', 'patients', 'payroll', 'analytics'],
  receptionist: ['dashboard', 'appointments', 'patients'],
  doctor:       ['dashboard', 'patients'],
};
```

**Add `'content'` to `super_admin` and `admin` arrays only.** Do not add to `receptionist` or `doctor`.

---

## Shared Patterns

### Authentication in Server Actions
**Source:** `app/(portal)/actions/auth.ts` lines 20-31
**Apply to:** `app/(portal)/actions/content.ts` — every exported action
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();  // NEVER getSession()
if (error) {
  return { error: error.message };
}
redirect('/dashboard');  // adapt: redirect('/login') for unauthenticated
```

### Form Field Pattern (zod + RHF + shadcn Form)
**Source:** `components/portal/LoginForm.tsx` lines 63-100
**Apply to:** All Client Component forms in `app/(portal)/content/*/`
```typescript
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email address</FormLabel>
      <FormControl>
        <Input type="email" {...field} />
      </FormControl>
      <FormMessage />   {/* inline validation error */}
    </FormItem>
  )}
/>
```

### Loading Submit Button
**Source:** `components/portal/LoginForm.tsx` lines 104-110
**Apply to:** Every form submit button in portal content pages
```typescript
<Button
  type="submit"
  disabled={form.formState.isSubmitting}
>
  {form.formState.isSubmitting ? 'Saving…' : 'Save'}
</Button>
```

### Supabase Auth Guard in Server Component
**Source:** `app/(portal)/layout.tsx` lines 22-43
**Apply to:** `app/(portal)/content/layout.tsx`
```typescript
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) { redirect('/login'); }
const { data: profile } = await supabase
  .from('profiles')
  .select('role, is_active')
  .eq('user_id', user.id)
  .single();
if (!profile || !profile.is_active) {
  await supabase.auth.signOut();
  redirect('/login');
}
```

### Portal Page Container
**Source:** `app/(portal)/dashboard/page.tsx` lines 38-54
**Apply to:** All portal content pages
```typescript
<div className="p-8">
  <h1 className="text-2xl font-bold text-slate-800">{pageTitle}</h1>
  {/* content */}
</div>
```

### Toast Notification
**Source:** `components/portal/LoginForm.tsx` lines 43-47
**Apply to:** All Client Components that call Server Actions
```typescript
const result = await someAction(data);
if (result && 'error' in result) {
  toast.error(result.error);
} else {
  toast.success('Saved successfully');
}
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/(portal)/content/*/DepartmentsClient.tsx` (Table + Dialog combined) | component | CRUD | No existing portal CRUD list page exists yet — closest is LoginForm for the form sub-pattern only |

The Table + Dialog + AlertDialog combination pattern has no existing analog in the codebase. The planner should reference the RESEARCH.md Pattern 6 (Portal Client Component Pattern) and UI-SPEC (Page Interaction Contracts) for the table/dialog composition pattern.

---

## Metadata

**Analog search scope:** `app/(portal)/`, `app/[locale]/(public)/`, `lib/supabase/`, `lib/portal/`, `supabase/migrations/`, `components/portal/`
**Files scanned:** 10 source files read directly
**Pattern extraction date:** 2026-06-12
