# Phase 5: Content Management — Research

**Researched:** 2026-06-12
**Domain:** Supabase Postgres schema design, Next.js App Router data fetching / cache invalidation, Server Actions CRUD, RLS policy patterns, next-intl with DB content
**Confidence:** HIGH

---

## Summary

Phase 5 converts four public-site pages (Departments, Doctors, Facilities/Services, Contact) from static TypeScript constants to Supabase-backed data, while adding a portal Content section where Admin and Super Admin can perform full CRUD on that content. The core technical challenge is threefold: (1) designing a DB schema that satisfies Phase 5's immediate needs without blocking Phase 6's staff-management requirements for the doctors table; (2) replacing static `generateStaticParams` exports on public pages with properly configured dynamic server-component reads plus on-demand cache invalidation via `revalidatePath`; and (3) implementing a consistent Server Actions CRUD pattern that the portal forms can use with role-checked Supabase operations and RLS policies.

The project already has all necessary client libraries (`@supabase/supabase-js`, `@supabase/ssr`, `react-hook-form`, `zod`, `sonner`). Only four shadcn components need to be added (`table`, `dialog`, `alert-dialog`, `skeleton`). The established Server Actions pattern from `app/(portal)/actions/auth.ts` extends cleanly to CRUD mutations.

**Primary recommendation:** Use `export const dynamic = 'force-dynamic'` on the four public pages being converted (simplest, ensures freshness), call `revalidatePath('/[locale]/...')` in every Server Action mutation for both locales, and store doctor availability/photo in the doctors table now as nullable columns so Phase 6's staff-management phase can add FK references to profiles without a destructive migration.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DYN-01 | Doctor profiles on public site sourced from Supabase | doctors table + getDoctors() server utility + dynamic public page |
| DYN-02 | Department listings on public site sourced from Supabase | departments table + getDepartments() + dynamic public page |
| DYN-03 | Facilities/services list sourced from Supabase | facilities table + getFacilities() + dynamic public page |
| DYN-04 | Hospital info (about, timings, contact) sourced from Supabase | hospital_info table (single row) + getHospitalInfo() + dynamic contact page |
| CMS-01 | Admin can add/edit/remove departments (name, description, image) | Portal CRUD page + Server Actions + RLS write policy |
| CMS-02 | Admin can add/edit/remove facilities/services | Portal CRUD page + Server Actions + RLS write policy |
| CMS-03 | Admin can edit hospital info fields | Portal single-record form + Server Action + RLS write policy |
| CMS-04 | All CMS changes reflect on public site immediately without build | revalidatePath() called in every mutation Server Action |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Public content display (departments, doctors, facilities, contact) | Frontend Server (SSR) | Database / Storage | Server Components fetch from Supabase on each request (dynamic rendering); no client-side fetch needed |
| Portal CRUD forms | Browser / Client | API / Backend | react-hook-form + zod run in Client Components; mutations dispatched as Server Actions |
| Data mutations (insert/update/delete) | API / Backend | — | Server Actions execute server-side with Supabase server client; RLS enforces role access |
| Cache invalidation | Frontend Server (SSR) | — | revalidatePath() called inside Server Actions after each mutation |
| Role-based access to portal Content section | API / Backend | Frontend Server | roles.ts ROLE_SECTIONS gates sidebar; Server Actions must also check role from profiles table |
| Image storage | Database / Storage | — | Phase 5 uses URL strings in DB (no Supabase Storage bucket needed); simplest approach |

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.108.1 | DB queries, auth | [VERIFIED: npm registry] |
| @supabase/ssr | 0.12.0 | Cookie-based session in Next.js | [VERIFIED: npm registry] |
| next | 16.2.9 | App Router, Server Actions, revalidatePath | [VERIFIED: npm registry] |
| react-hook-form | 7.78.0 | Form state management | [VERIFIED: npm registry] |
| @hookform/resolvers | 5.4.0 | zod integration for RHF | [VERIFIED: npm registry] |
| zod | 4.4.3 | Schema validation | [VERIFIED: npm registry] |
| sonner | 2.0.7 | Toast notifications | [VERIFIED: npm registry] |

### Add for Phase 5 (shadcn components — no npm install, use `npx shadcn add`)
| Component | Install Command | Purpose |
|-----------|----------------|---------|
| table | `npx shadcn add table` | List views for departments, doctors, facilities |
| dialog | `npx shadcn add dialog` | Short add/edit forms (departments, facilities, hospital-info) |
| alert-dialog | `npx shadcn add alert-dialog` | Delete confirmation modal |
| skeleton | `npx shadcn add skeleton` | Loading states while table data fetches |

**Note:** Sheet is already installed (used for Doctors form — longer form with photo URL, bio, availability).

**Installation:**
```bash
npx shadcn add table dialog alert-dialog skeleton
```

---

## Package Legitimacy Audit

All packages in Phase 5 are either already installed in the project or are official shadcn/ui components installed via the project's own CLI (`npx shadcn add`). No new npm packages are introduced.

| Package | Registry | Age | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|
| @supabase/supabase-js | npm | ~4 yrs | N/A — already installed | Approved |
| @supabase/ssr | npm | ~2 yrs | N/A — already installed | Approved |
| next, react, zod, sonner, react-hook-form | npm | established | N/A — already installed | Approved |
| table/dialog/alert-dialog/skeleton | shadcn registry | official | N/A — shadcn official | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
                   PORTAL (Admin/Super Admin)
                   ┌─────────────────────────────────┐
                   │ /portal/content/*                │
                   │  Client Component (RHF + zod)    │
                   │         │ Server Action           │
                   │         ▼                         │
                   │  createClient() [server]          │
                   │  + role check from profiles       │
                   │  + supabase CRUD                  │
                   │         │ revalidatePath()         │
                   └─────────┼───────────────────────-─┘
                             │ writes
                             ▼
                    ┌─────────────────┐
                    │   Supabase DB   │
                    │ departments     │
                    │ doctors         │
                    │ facilities      │
                    │ hospital_info   │
                    └────────┬────────┘
                             │ reads (anon key, RLS SELECT = true)
                             ▼
                   PUBLIC SITE (all visitors)
                   ┌─────────────────────────────────┐
                   │ /[locale]/departments            │
                   │ /[locale]/doctors                │  dynamic = 'force-dynamic'
                   │ /[locale]/services               │  Server Components
                   │ /[locale]/contact                │
                   │  createClient() [server]          │
                   │  getDepartments() etc.            │
                   └─────────────────────────────────┘
```

### Recommended Project Structure
```
app/
├── (portal)/
│   ├── actions/
│   │   ├── auth.ts              # existing
│   │   └── content.ts           # NEW: all CMS Server Actions
│   └── content/
│       ├── layout.tsx           # optional: shared content nav
│       ├── departments/
│       │   └── page.tsx
│       ├── doctors/
│       │   └── page.tsx
│       ├── facilities/
│       │   └── page.tsx
│       └── hospital-info/
│           └── page.tsx
lib/
├── supabase/
│   ├── client.ts                # existing
│   └── server.ts                # existing
├── data/                        # existing static data (keep for reference / seed)
└── db/
    ├── departments.ts           # NEW: getDepartments(), createDepartment(), etc.
    ├── doctors.ts               # NEW: getDoctors(), createDoctor(), etc.
    ├── facilities.ts            # NEW: getFacilities(), createFacility(), etc.
    └── hospital-info.ts         # NEW: getHospitalInfo(), updateHospitalInfo()
supabase/
└── migrations/
    └── 20260612_cms_tables.sql  # NEW: departments, doctors, facilities, hospital_info
```

### Pattern 1: DB Schema — Four CMS Tables

```sql
-- departments
CREATE TABLE departments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text NOT NULL,
  image_url   text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- doctors
-- Phase 5 adds standalone doctor profiles.
-- Phase 6 (Staff Management) adds staff_user_id FK to link doctor accounts.
-- Keep staff_user_id nullable so Phase 6 ALTER TABLE is non-breaking.
CREATE TABLE doctors (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        text NOT NULL,
  specialization   text NOT NULL,
  qualification    text NOT NULL,
  photo_url        text,
  bio              text,
  availability_days text[],          -- e.g. ARRAY['Mon','Wed','Fri']
  is_active        boolean NOT NULL DEFAULT true,
  staff_user_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,  -- nullable; Phase 6 links this
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- facilities (services)
CREATE TYPE facility_category AS ENUM ('OPD', 'ICU', 'Diagnostics', 'Surgery', 'Other');

CREATE TABLE facilities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text NOT NULL,
  category    facility_category NOT NULL DEFAULT 'Other',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- hospital_info — single-row table, seeded at migration
CREATE TABLE hospital_info (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  about_text       text NOT NULL DEFAULT '',
  opd_timings      text NOT NULL DEFAULT '',
  emergency_number text NOT NULL DEFAULT '',
  address_line1    text NOT NULL DEFAULT '',
  address_line2    text,
  city             text NOT NULL DEFAULT 'Kanpur',
  maps_embed_url   text,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Seed one row for hospital_info
INSERT INTO hospital_info DEFAULT VALUES;
```

### Pattern 2: RLS Policies

```sql
-- Public reads (anon key) — all four tables
ALTER TABLE departments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_info ENABLE ROW LEVEL SECURITY;

-- SELECT: public (anon + authenticated users can read)
CREATE POLICY "departments: public read"
  ON departments FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "doctors: public read"
  ON doctors FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "facilities: public read"
  ON facilities FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "hospital_info: public read"
  ON hospital_info FOR SELECT TO anon, authenticated USING (true);

-- WRITE: Portal Server Actions use service_role key (bypasses RLS).
-- Role check (admin / super_admin) is enforced IN the Server Action before calling Supabase.
-- No INSERT/UPDATE/DELETE RLS policy needed for Phase 5 — service_role bypasses RLS.
```

**Key insight:** Portal Server Actions use the service_role key (or a Supabase client created with elevated rights) to bypass RLS entirely. The role gate is enforced in application code by reading the authenticated user's profile before executing mutations. This avoids complex role-aware RLS SQL and keeps the auth logic in one place (TypeScript).

**However**, if the service_role key is not available in Server Actions, use the anon key and add explicit INSERT/UPDATE/DELETE policies checking `auth.role() = 'authenticated'`. This is the safe fallback.

### Pattern 3: DB Utility Functions

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

### Pattern 4: Public Page — Static to Dynamic Conversion

**Critical finding:** All four public pages currently export `generateStaticParams()`. When the page body reads from Supabase (a runtime data source), Next.js will still statically generate at build time unless the rendering mode is changed. The simplest, most correct approach for a hospital CMS is `force-dynamic`.

```typescript
// app/[locale]/(public)/departments/page.tsx
// CHANGE: remove generateStaticParams(), add dynamic export
import { getDepartments } from '@/lib/db/departments';

// Force dynamic rendering — content changes from portal must appear immediately (CMS-04)
export const dynamic = 'force-dynamic';

// REMOVE: export function generateStaticParams() { ... }
// generateStaticParams is for dynamic route segments ([id], etc.) — not needed here.
// These are static routes (/departments, /doctors, etc.) — generateStaticParams serves no purpose.

export default async function DepartmentsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('departments');

  let departments: Department[] = [];
  try {
    departments = await getDepartments();
  } catch (err) {
    console.error('[departments page] Supabase read failed:', err);
    // Fail silently on public side — show empty list (UI-SPEC: public error state is silent)
  }
  // Render with DB data instead of static import ...
}
```

**Note on `generateStaticParams` removal:** The four affected pages (`/departments`, `/doctors`, `/services`, `/contact`) are NOT dynamic route segments — they have no `[param]` in the URL. Their `generateStaticParams()` exports only declare which `locale` values to pre-render. With `dynamic = 'force-dynamic'`, Next.js renders these server-side on each request. The `generateStaticParams` export can be safely removed from these specific pages.

**Alternative — On-Demand ISR:** Instead of `force-dynamic`, export `export const revalidate = 0` (same as force-dynamic) or a time-based value (e.g., `revalidate = 300` = 5 min cached). For a hospital CMS where content changes from the portal should appear immediately (CMS-04), `force-dynamic` is the correct choice.

### Pattern 5: Server Actions — Portal CRUD

```typescript
// app/(portal)/actions/content.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function getAuthenticatedAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    throw new Error('Forbidden: insufficient role');
  }
  return { supabase, profile };
}

export async function createDepartmentAction(
  input: { name: string; description: string; image_url?: string }
): Promise<{ error?: string }> {
  try {
    const { supabase } = await getAuthenticatedAdmin();
    const { error } = await supabase.from('departments').insert(input);
    if (error) return { error: error.message };

    // Invalidate both locales (CMS-04)
    revalidatePath('/en/departments');
    revalidatePath('/hi/departments');
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateDepartmentAction(
  id: string,
  input: Partial<{ name: string; description: string; image_url: string }>
): Promise<{ error?: string }> {
  try {
    const { supabase } = await getAuthenticatedAdmin();
    const { error } = await supabase
      .from('departments')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { error: error.message };

    revalidatePath('/en/departments');
    revalidatePath('/hi/departments');
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function deleteDepartmentAction(id: string): Promise<{ error?: string }> {
  try {
    const { supabase } = await getAuthenticatedAdmin();
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) return { error: error.message };

    revalidatePath('/en/departments');
    revalidatePath('/hi/departments');
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
```

### Pattern 6: Portal Page with Server Data + Client Forms

```typescript
// app/(portal)/content/departments/page.tsx
// Server Component: fetches data, renders Client Component table
import { getDepartments } from '@/lib/db/departments';
import { DepartmentsClient } from './DepartmentsClient'; // Client Component

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

The portal page pattern: Server Component fetches initial data → passes to Client Component → Client Component renders Table with Dialog/Sheet forms and calls Server Actions for mutations.

**After Server Action mutation:** The action calls `revalidatePath('/en/departments')` etc., but the portal page itself (`/portal/content/departments`) needs to refresh too. Options:
1. Call `revalidatePath('/portal/content/departments')` in the action AND the Client Component calls `router.refresh()` after action success.
2. The Client Component maintains local state (`useState`) updated optimistically after successful mutation — UI-SPEC says no optimistic updates, so use `router.refresh()` pattern.

### Pattern 7: next-intl — DB Content Strategy

**The problem:** Current public pages use `t('departments.paediatrics.name')` from translation files to get bilingual content. DB content has no translation keys.

**Resolution for Phase 5:** DB content is stored as English strings only. Translation of the actual department/doctor names is deferred. The DB field value is displayed directly in both locales.

**Why this is acceptable for v1:**
- The hospital is in Kanpur, UP — staff entering data will likely enter content in Hindi or English
- Admin enters content once in the portal (English-only portal) → displays the same string on both public locale pages
- next-intl still controls page chrome (headings, nav, CTAs) — only the data content is untranslated
- This is a documented v1 constraint, not a bug

**Implementation:** Public pages still call `setRequestLocale(locale)` and `getTranslations('departments')` for page-level UI strings (page title, subtitle, CTA). The DB content is rendered directly from the fetched array, bypassing translation keys.

```typescript
// Before (static):
{departments.map((dept) => (
  <DepartmentCard
    name={t(`${dept.translationKey}.name`)}
    description={t(`${dept.translationKey}.description`)}
  />
))}

// After (DB-driven):
{departments.map((dept) => (
  <DepartmentCard
    name={dept.name}           // DB string, displayed as-is in both locales
    description={dept.description}
  />
))}
```

### Anti-Patterns to Avoid

- **Using `getSession()` in Server Actions:** Always use `getUser()` — established in Phase 4. `getSession()` does not re-validate with Auth server.
- **Calling `revalidatePath` in Client Components:** `revalidatePath` is server-only — must be in Server Actions.
- **Keeping `generateStaticParams` on pages that fetch dynamic DB data:** The locale-loop `generateStaticParams` on these pages only pre-builds the route shell; it does not refresh DB content. Remove it or add `dynamic = 'force-dynamic'` to override.
- **Using anon key for portal mutations without role-checking:** Anon key respects RLS. If relying on anon key for writes, add RLS policies. If using service_role, gate in application code.
- **Blocking delete if record has FK references:** doctors table will gain a FK from staff_user_id in Phase 6. Add `ON DELETE SET NULL` (already in schema above) so deleting a doctor profile from the CMS doesn't break the profiles table.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation logic | zod + react-hook-form (already installed) | Field-level error display, type inference, blur/submit triggers |
| Toast notifications | Custom toast component | Sonner (already installed) | Already configured with Toaster in layout |
| Delete confirmation | Custom modal | shadcn AlertDialog | Accessible, keyboard-navigable, focus-trapped |
| Loading skeletons | Custom shimmer CSS | shadcn Skeleton | Consistent with design system |
| Data table | Custom `<table>` HTML | shadcn Table | Column alignment, responsive, design tokens |
| Session validation | Custom JWT decode | `supabase.auth.getUser()` | Re-validates with Auth server, not stale cache |

---

## Common Pitfalls

### Pitfall 1: generateStaticParams Pages Don't See DB Changes

**What goes wrong:** `generateStaticParams` is a build-time function. Even after calling `revalidatePath`, a statically generated page may serve cached HTML. For pages that are NOT dynamic route segments (no `[id]` etc.), `generateStaticParams` is mainly generating locale variants — the page itself may still be fully static.

**Why it happens:** Next.js caches pages aggressively. Without `dynamic = 'force-dynamic'` or a `revalidate` export, database reads inside Server Components on non-dynamic routes may be cached indefinitely.

**How to avoid:** Export `export const dynamic = 'force-dynamic'` on the four public pages being converted. Also remove the `generateStaticParams` locale-loop exports from these pages — they serve no purpose once the page is force-dynamic (locale is already handled by next-intl middleware and `setRequestLocale`).

**Warning signs:** CMS change is saved in portal with success toast, but public site still shows old content after refresh.

### Pitfall 2: Portal Page Stale After Mutation

**What goes wrong:** Server Action runs, DB is updated, `revalidatePath('/en/departments')` is called — but the portal list page (`/portal/content/departments`) still shows old data because the portal route was not revalidated.

**How to avoid:** In Client Component, after Server Action returns success, call `router.refresh()` (from `useRouter()` in `next/navigation`). This re-fetches the current route's server data without a full page reload.

```typescript
const router = useRouter();
const result = await createDepartmentAction(data);
if (!result.error) {
  router.refresh(); // Re-runs the Server Component to fetch fresh list
  closeDialog();
}
```

### Pitfall 3: Doctor Table FK Conflict in Phase 6

**What goes wrong:** Phase 5 creates a `doctors` table. Phase 6 (Staff Management) needs to link doctors to portal user accounts (profiles table). If the `staff_user_id` column doesn't exist in Phase 5, Phase 6 must ALTER TABLE in a live migration, risking data loss or constraint errors.

**How to avoid:** Include `staff_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL` as a nullable column in the Phase 5 migration. Phase 6 can simply update the value without schema changes.

### Pitfall 4: RLS Blocks Portal Reads

**What goes wrong:** Portal content pages also need to read department/doctor data (to populate edit forms). If RLS only allows anon reads and the portal uses an authenticated session, reads may fail if the policy targets `anon` role specifically.

**How to avoid:** Write SELECT policies as `TO anon, authenticated` (both roles) using `USING (true)`. This ensures both the public site (anon key) and portal authenticated users can read content.

### Pitfall 5: `revalidatePath` Locale Path Format

**What goes wrong:** Calling `revalidatePath('/departments')` does not invalidate `/en/departments` or `/hi/departments` — the paths include the locale segment.

**How to avoid:** Revalidate all locale variants explicitly:
```typescript
revalidatePath('/en/departments');
revalidatePath('/hi/departments');
```
Or use `revalidatePath('/', 'layout')` to invalidate all routes under the root layout (nuclear option — use sparingly). For targeted invalidation, use per-locale paths.

### Pitfall 6: Missing `updated_at` Trigger

**What goes wrong:** `updated_at` column value stays at creation time unless explicitly set in every UPDATE query.

**How to avoid:** In Server Actions, pass `updated_at: new Date().toISOString()` in every `.update()` call. Alternatively, add a Postgres trigger — but manual update in Server Actions is simpler for Phase 5 scope.

---

## Code Examples

### Complete Server Action File Structure

```typescript
// app/(portal)/actions/content.ts — complete structure
'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { StaffRole } from '@/lib/portal/roles';

const CMS_ROLES: StaffRole[] = ['super_admin', 'admin'];
const LOCALES = ['en', 'hi'];

async function requireCmsRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  if (!profile || !CMS_ROLES.includes(profile.role as StaffRole)) {
    throw new Error('Forbidden');
  }
  return supabase;
}

function revalidatePublicPath(segment: string) {
  LOCALES.forEach(locale => revalidatePath(`/${locale}/${segment}`));
}
```

### Portal Client Component Pattern (React)

```typescript
// Minimal example — DepartmentsClient.tsx
'use client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createDepartmentAction } from '@/app/(portal)/actions/content';

function DepartmentsClient({ initialData, fetchError }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(values) {
    const result = await createDepartmentAction(values);
    if (result.error) {
      toast.error('Failed to save. Try again.');
      return;
    }
    toast.success('Department added');
    setOpen(false);
    router.refresh(); // Re-runs server component to get updated list
  }
  // ...
}
```

### Supabase Read in Server Component (Public Page)

```typescript
// Minimal pattern for all four public pages
export const dynamic = 'force-dynamic';

export default async function DepartmentsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('departments');

  let items: Department[] = [];
  try {
    items = await getDepartments(); // lib/db/departments.ts
  } catch (err) {
    console.error('[DepartmentsPage] fetch failed:', err);
    // Fail silently — show empty list on public side (UI-SPEC requirement)
  }
  // render...
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router `getStaticProps` + `revalidate` | App Router `dynamic = 'force-dynamic'` + `revalidatePath()` in Server Actions | Next.js 13+ | Simpler ISR — no API route needed for revalidation |
| Direct Supabase client everywhere | `@supabase/ssr` with cookie-based session | 2023 | Correct session handling in Server Components |
| One Supabase client export | Separate `client.ts` (browser) and `server.ts` (SSR) | @supabase/ssr v0.1+ | Prevents cookie write errors in Server Components |

**Deprecated/outdated:**
- `getStaticProps` / `getServerSideProps`: Pages Router only — not applicable in App Router
- `createClientComponentClient` / `createServerComponentClient` from `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr` — project already uses the current pattern correctly

---

## Open Questions (RESOLVED)

1. **Service Role Key in Server Actions**
   - What we know: Service role key bypasses RLS; anon key respects RLS
   - What's unclear: Whether `NEXT_PUBLIC_SUPABASE_ANON_KEY` (already in env) is sufficient for portal writes if RLS write policies are added, or if `SUPABASE_SERVICE_ROLE_KEY` should be added to env
   - Recommendation: Phase 5 plan should include a Wave 0 task to add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and create a `lib/supabase/admin.ts` that uses it for Server Actions. Fallback: use anon key + authenticated RLS write policies.
   - **RESOLVED:** 05-01-PLAN.md Task 1 creates `lib/supabase/admin.ts` using SUPABASE_SERVICE_ROLE_KEY. Service role key is used for all portal Server Actions in `app/(portal)/actions/content.ts`. The key is documented in .env.example and required in .env.local.

2. **Doctor `availability_days` Data Type**
   - What we know: UI-SPEC shows multi-select or comma-separated input for Mon/Tue/etc.
   - What's unclear: Whether `text[]` (Postgres array) or `text` (comma-separated string) is better
   - Recommendation: Use `text[]` (Postgres array) — cleaner querying, Supabase JS client handles array serialization automatically. Portal form collects as toggled set, serializes to array before sending.
   - **RESOLVED:** 05-01-PLAN.md migration schema uses `availability_days text[]` (Postgres array). The doctors portal form (05-03-PLAN.md) uses a multi-select toggle that serializes to array before the Server Action call.

3. **Seed Data Migration Strategy**
   - What we know: Static data exists in `lib/data/departments.ts`, `lib/data/doctors.ts`, `lib/data/services.ts`
   - What's unclear: Whether seed INSERT statements belong in the migration SQL or in a separate seed script
   - Recommendation: Include seed INSERTs in the migration for departments and facilities (known values). Doctors: don't seed — Admin enters real doctor profiles via portal. Hospital info: seed one empty row (already planned above).
   - **RESOLVED:** 05-01-PLAN.md migration seeds exactly one empty hospital_info row. Departments and facilities are NOT seeded — Admin enters content via the portal (matching the real workflow). The static lib/data/ files remain as reference only.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js dev server | ✓ | v24.14.1 | — |
| Next.js | Framework | ✓ | 16.2.9 | — |
| Supabase project | DB + Auth | Assumed ✓ | — | Cannot proceed without it |
| SUPABASE_SERVICE_ROLE_KEY | Admin write operations | Unknown — not verified | — | Add to .env.local in Wave 0 |
| npx (shadcn) | Component install | ✓ | via npm | — |

**Missing dependencies with no fallback:**
- Supabase project with Phase 4 migration applied — required before new migration can run

**Missing dependencies with fallback:**
- `SUPABASE_SERVICE_ROLE_KEY` — fallback is anon key + explicit RLS write policies for authenticated role

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Not detected — no pytest.ini, jest.config, or vitest.config found |
| Config file | none — Wave 0 must add if validation required |
| Quick run command | `npx next build --no-lint` (smoke: pages compile) |
| Full suite command | N/A until test framework added |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DYN-01 to DYN-04 | Public pages render DB content | smoke | `npx next build` | ❌ Wave 0 |
| CMS-01 to CMS-03 | CRUD actions return no error | manual / integration | Manual portal test | ❌ |
| CMS-04 | revalidatePath called in actions | unit (inspect action) | `grep -r revalidatePath app/\(portal\)/actions/content.ts` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] No test framework configured — recommend deferring automated tests to a dedicated testing phase; verify Phase 5 via manual portal smoke test and `next build` success
- [ ] `supabase/migrations/20260612_cms_tables.sql` — must be created and applied before any portal or public page work

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `supabase.auth.getUser()` in every Server Action — established pattern |
| V4 Access Control | yes | `requireCmsRole()` helper checks profile.role before every mutation |
| V5 Input Validation | yes | zod schemas on all CMS form inputs before DB write |
| V6 Cryptography | no | No new crypto in Phase 5 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated write to departments/doctors | Tampering | RLS `SELECT TO anon` only; writes require authenticated session + role check in Server Action |
| Privilege escalation (receptionist editing content) | Elevation of Privilege | `requireCmsRole()` checks role = admin or super_admin before any mutation |
| XSS via stored HTML in description/bio fields | Tampering | Store plain text only; no raw HTML rendering — React escapes by default |
| Path traversal via image_url | Tampering | Phase 5 stores URL strings only — no file upload, no server-side path handling |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `dynamic = 'force-dynamic'` is the correct override for public pages currently using `generateStaticParams` | Architecture Patterns / Pattern 4 | If wrong, public pages might still cache — use `revalidate = 0` as equivalent fallback |
| A2 | Supabase project is already provisioned with Phase 4 migration applied | Environment Availability | Phase 5 migration will fail if profiles table doesn't exist (doctors FK to profiles) |
| A3 | Portal Server Actions can use the anon key with RLS write policies if service_role key is not configured | Open Questions | If anon key can't write, portal mutations will fail silently — must add service_role key |
| A4 | `text[]` is supported for availability_days in Supabase JS client without serialization helpers | Architecture / Schema | Minor — can fall back to comma-separated `text` column |

---

## Sources

### Primary (HIGH confidence)
- Next.js official docs — `generateStaticParams`, `dynamic = 'force-dynamic'`, `revalidatePath` — [nextjs.org/docs/app/api-reference/functions/revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath)
- Supabase official docs — RLS policies, anon vs authenticated roles — [supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- Project codebase: `lib/supabase/server.ts`, `app/(portal)/actions/auth.ts`, `lib/portal/roles.ts` — verified existing patterns
- `package.json` — verified installed versions via `node -e`

### Secondary (MEDIUM confidence)
- Next.js ISR guide — [nextjs.org/docs/app/guides/incremental-static-regeneration](https://nextjs.org/docs/app/guides/incremental-static-regeneration) — confirms revalidatePath pattern
- Supabase blog — Fetching and caching Supabase data in Next.js Server Components — [supabase.com/blog/fetching-and-caching-supabase-data-in-next-js-server-components](https://supabase.com/blog/fetching-and-caching-supabase-data-in-next-js-server-components)

### Tertiary (LOW confidence — training knowledge)
- doctors table `text[]` for availability_days — based on Supabase JS client array handling knowledge; not verified against current docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified via package.json and npm registry
- Schema design: HIGH — derived from UI-SPEC fields + Phase 4 migration patterns + Phase 6 FK consideration
- Architecture (dynamic rendering, revalidatePath): HIGH — verified via official Next.js docs
- RLS patterns: HIGH — verified via official Supabase docs
- next-intl / DB content strategy: MEDIUM — derived from codebase inspection + established next-intl patterns

**Research date:** 2026-06-12
**Valid until:** 2026-07-12 (stable stack — 30 days)
