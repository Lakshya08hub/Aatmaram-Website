# Phase 4: Auth + Roles - Pattern Map

**Mapped:** 2026-06-11
**Files analyzed:** 9 new/modified files
**Analogs found:** 7 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `middleware.ts` (new — `proxy.ts` is current) | middleware | request-response | `proxy.ts` (current next-intl middleware) | exact — extend, don't replace |
| `app/(portal)/layout.tsx` | layout / auth-guard | request-response | `app/[locale]/(public)/layout.tsx` | role-match (layout shell pattern) |
| `app/(portal)/login/page.tsx` | page + client component | request-response | `components/public/AppointmentForm.tsx` | role-match (form + zod + shadcn/ui) |
| `app/(portal)/dashboard/page.tsx` | page (server component) | request-response | `app/[locale]/(public)/appointment/page.tsx` | role-match (async server page) |
| `app/(portal)/staff/page.tsx` | page (stub) | — | `app/(portal)/dashboard/page.tsx` (existing stub) | exact |
| `app/(portal)/appointments/page.tsx` | page (stub) | — | `app/(portal)/dashboard/page.tsx` (existing stub) | exact |
| `app/(portal)/patients/page.tsx` | page (stub) | — | `app/(portal)/dashboard/page.tsx` (existing stub) | exact |
| `components/portal/Sidebar.tsx` | component | request-response | `components/layout/Header.tsx` (nav link list pattern) | role-match |
| `supabase/migrations/20260611_profiles.sql` | migration | CRUD | no existing migration | no analog |

---

## Pattern Assignments

### `middleware.ts` (middleware, request-response)

**Analog:** `proxy.ts` (lines 1-10) — this IS the current next-intl middleware. Phase 4 replaces the root-level middleware entry point with a branching version. `proxy.ts` shows the exact `createMiddleware` + `config.matcher` shape to preserve.

**Current middleware pattern** (`proxy.ts`, lines 1-10):
```typescript
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: [
    '/((?!portal|api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'
  ]
};
```

**Key observation:** The existing matcher already excludes `/portal` from next-intl handling. This means portal routes currently pass through with NO middleware. Phase 4 replaces this with a single `middleware.ts` that branches by pathname.

**Extended middleware pattern** (copy this shape — from RESEARCH.md Pattern 1):
```typescript
import createIntlMiddleware from 'next-intl/middleware';
import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

const PORTAL_PATHS = ['/login', '/dashboard', '/staff', '/appointments', '/patients', '/payroll', '/analytics', '/settings'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PORTAL_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return await updateSession(request);
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)',]
};
```

**updateSession import** (`lib/supabase/middleware.ts`, lines 1-32):
```typescript
import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        }
      }
    }
  );
  // IMPORTANT: getUser() not getSession() — re-validates with Auth server
  await supabase.auth.getUser();
  return supabaseResponse;
}
```

**Critical note:** `updateSession()` only refreshes the JWT cookie. It does NOT redirect unauthenticated users. Redirects happen in the portal layout Server Component (see below).

---

### `app/(portal)/layout.tsx` (layout / auth-guard, request-response)

**Analog:** `app/[locale]/(public)/layout.tsx` (lines 1-27) — same async Server Component layout shell pattern, but with auth guard added.

**Locale layout pattern to mirror** (`app/[locale]/(public)/layout.tsx`, lines 1-27):
```typescript
// async Server Component layout — this is the exact shape to follow
export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // async param destructure
  // guard/setup
  // return JSX shell with children
}
```

**Server client import** (`lib/supabase/server.ts`, lines 1-27):
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
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

**Auth guard + profile fetch pattern** (from RESEARCH.md Pattern 2):
```typescript
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <html lang="en">
      <body>
        <PortalSidebar role={profile.role} />
        <main>{children}</main>
      </body>
    </html>
  );
}
```

**Critical constraint (Open Question Q3 from RESEARCH.md):** The `/login` page must NOT be rendered inside this auth-guarded layout or a redirect loop occurs (Pitfall 2). Recommended solution: move `app/(portal)/login/` to `app/login/` at the top level, outside any portal route group, with its own minimal layout. If login stays inside `(portal)`, the layout must check `pathname !== '/login'` before redirecting — but the cleaner fix is moving login out.

---

### `app/(portal)/login/page.tsx` (client component form, request-response)

**Analog:** `components/public/AppointmentForm.tsx` (full file, 222 lines) — exact same stack: `'use client'`, react-hook-form + zodResolver + zod schema + shadcn/ui Form/FormField/FormItem/FormLabel/FormControl/FormMessage + Card/CardContent + Button.

**Imports pattern** (`AppointmentForm.tsx`, lines 1-28):
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
import { Card, CardContent } from '@/components/ui/card'
```

**Zod schema pattern** (`AppointmentForm.tsx`, lines 33-46):
```typescript
const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})
type LoginFormValues = z.infer<typeof loginSchema>
```

**useForm + onSubmit pattern** (`AppointmentForm.tsx`, lines 53-74):
```typescript
const form = useForm<LoginFormValues>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: '', password: '' },
})

const onSubmit = async (data: LoginFormValues) => {
  // Call Server Action or browser client signInWithPassword here
  // On error: toast.error(errorMessage)
  // On success: Server Action calls redirect('/dashboard')
}
```

**FormField pattern** (`AppointmentForm.tsx`, lines 86-105):
```typescript
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email<span className="text-red-500 ml-1">*</span></FormLabel>
      <FormControl>
        <Input type="email" placeholder="staff@atmaram.in" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Server Action pattern** (from RESEARCH.md Pattern 3):
```typescript
// actions/auth.ts  — separate file, called from login page
'use server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function loginAction(formData: { email: string; password: string }) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });
  if (error) return { error: error.message };
  redirect('/dashboard');
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

---

### `app/(portal)/dashboard/page.tsx` (server component page, request-response)

**Analog:** `app/[locale]/(public)/appointment/page.tsx` (lines 1-55) — async server component page with typed props.

**Async server page pattern** (`appointment/page.tsx`, lines 20-30):
```typescript
// No params needed for dashboard — simpler than locale pages
export default async function DashboardPage() {
  // Role is already validated in layout — children receive role via props or re-read from server
  // For phase 4: display role-aware greeting
  // Role comes from portal layout — either pass via searchParams or re-query from server
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
    </div>
  )
}
```

**Note:** The role is already fetched in `layout.tsx`. In Phase 4, the dashboard page can be a simple Server Component that re-queries the profile (one extra DB call) or receives role as a prop. Re-querying is simpler and avoids prop-drilling through layouts.

---

### `app/(portal)/staff/page.tsx`, `appointments/page.tsx`, `patients/page.tsx`, `payroll/page.tsx`, `analytics/page.tsx`, `settings/page.tsx` (stub pages)

**Analog:** `app/(portal)/dashboard/page.tsx` existing stub (lines 1-7):
```typescript
export default function StaffPage() {
  return (
    <div className="p-8">
      Staff Management — Coming in Phase 6
    </div>
  )
}
```

Copy this exact shape for every stub. Replace the display text with the phase number from RESEARCH.md:
- Staff → Phase 6
- Appointments → Phase 7
- Patients → Phase 8
- Payroll → Phase 9
- Analytics → Phase 10
- Settings → Phase X (TBD)

---

### `components/portal/Sidebar.tsx` (component, request-response)

**Analog:** `components/layout/Header.tsx` (lines 1-48) — same pattern of building a nav link array and rendering it as a list. Header uses next-intl `Link`; Sidebar uses standard Next.js `Link` (portal is English-only, no locale routing).

**Nav array + render pattern** (`Header.tsx`, lines 12-47):
```typescript
// Header builds navLinks array and maps over it — copy this shape for sidebar sections
const navLinks = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Staff', href: '/staff' },
  // ...
];

// Render: map over sections array, filter by role
{navLinks.map((link) => (
  <li key={link.href}>
    <Link href={link.href} className="...">
      {link.label}
    </Link>
  </li>
))}
```

**Role-scoping pattern** (from RESEARCH.md Pattern 5):
```typescript
import Link from 'next/link';

type StaffRole = 'super_admin' | 'admin' | 'doctor' | 'receptionist';

const ALL_SECTIONS = [
  { key: 'dashboard',    label: 'Dashboard',    href: '/dashboard' },
  { key: 'staff',        label: 'Staff',        href: '/staff' },
  { key: 'appointments', label: 'Appointments', href: '/appointments' },
  { key: 'patients',     label: 'Patients',     href: '/patients' },
  { key: 'payroll',      label: 'Payroll',      href: '/payroll' },
  { key: 'analytics',    label: 'Analytics',    href: '/analytics' },
  { key: 'settings',     label: 'Settings',     href: '/settings' },
];

const ROLE_SECTIONS: Record<StaffRole, string[]> = {
  super_admin:  ['dashboard', 'staff', 'appointments', 'patients', 'payroll', 'analytics', 'settings'],
  admin:        ['dashboard', 'staff', 'appointments', 'patients', 'payroll', 'analytics'],
  receptionist: ['dashboard', 'appointments', 'patients'],
  doctor:       ['dashboard', 'patients'],
};

export function PortalSidebar({ role }: { role: StaffRole }) {
  const allowed = new Set(ROLE_SECTIONS[role]);
  const sections = ALL_SECTIONS.filter(s => allowed.has(s.key));

  return (
    <aside className="w-56 bg-slate-900 min-h-screen text-white">
      <nav>
        <ul className="space-y-1 p-4">
          {sections.map((s) => (
            <li key={s.key}>
              <Link href={s.href} className="block px-3 py-2 rounded text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors">
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
```

---

### `supabase/migrations/20260611_profiles.sql` (migration, CRUD)

**No analog** — no existing migrations in the repo.

Use RESEARCH.md Pattern 4 verbatim:
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

---

## Shared Patterns

### Async Server Component + createClient()
**Source:** `lib/supabase/server.ts` (full file, 27 lines) + `app/[locale]/(public)/layout.tsx` (lines 1-27)
**Apply to:** `app/(portal)/layout.tsx`, `app/(portal)/dashboard/page.tsx`
```typescript
// Always: await createClient(), then await supabase.auth.getUser()
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

### shadcn/ui Form Stack (react-hook-form + zod)
**Source:** `components/public/AppointmentForm.tsx` (lines 1-28, 33-48, 53-74, 76-220)
**Apply to:** `app/(portal)/login/page.tsx`

Full pattern: `'use client'` directive + zod schema outside component + `useForm` with `zodResolver` + `Form` wrapper + `FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormMessage` per field + `Card`/`CardContent` container + `Button type="submit"`.

### Tailwind Utility Classes (project conventions)
**Source:** `components/public/AppointmentForm.tsx` line 77, `components/layout/Header.tsx` line 22-25
**Apply to:** All portal components
- Container: `max-w-7xl mx-auto px-4`
- Cards: `shadow-sm border border-slate-200 rounded-xl`
- Buttons: `bg-blue-800 hover:bg-blue-900 text-white font-semibold min-h-[44px]`
- Dark nav bg: `bg-slate-900` (portal sidebar — darker than public header `bg-[#1E3A5F]`)

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `supabase/migrations/20260611_profiles.sql` | migration | CRUD | No existing SQL migrations in repo — use RESEARCH.md Pattern 4 verbatim |

---

## Critical Notes for Planner

1. **`proxy.ts` vs `middleware.ts`:** The current next-intl middleware lives in `proxy.ts` (not `middleware.ts`). Phase 4 must create `middleware.ts` at the repo root (Next.js only picks up `middleware.ts`). The `proxy.ts` file should either be deleted or left as dead code reference. Verify whether `proxy.ts` was being used — Next.js 15+ requires exactly `middleware.ts` or `middleware.js`.

2. **Login page location (Open Question Q3):** `/login` must be outside the auth-guarded portal layout to avoid redirect loop. Recommended: `app/login/page.tsx` (top-level, no layout group). This means login does NOT use the portal `<html><body>` shell — it needs its own minimal layout or uses the root `app/layout.tsx` if one exists.

3. **Root layout conflict (Open Question Q2):** Verify whether `app/layout.tsx` exists. If it does, `app/(portal)/layout.tsx` must NOT include `<html><body>` tags — use a `<div>` wrapper instead. The current stub already has `<html><body>` which is correct only if there is no root `app/layout.tsx`.

4. **`proxy.ts` matcher excludes `/portal`:** The existing matcher `/((?!portal|...).*) ` already excludes paths starting with `/portal` from next-intl. But portal routes are at `/dashboard`, `/login`, `/staff` etc. (NOT under `/portal`). So portal routes currently get NO middleware coverage. The new `middleware.ts` must cover these paths via `PORTAL_PATHS` array.

---

## Metadata

**Analog search scope:** `app/`, `components/`, `lib/supabase/`, root level
**Files scanned:** 16
**Pattern extraction date:** 2026-06-11
