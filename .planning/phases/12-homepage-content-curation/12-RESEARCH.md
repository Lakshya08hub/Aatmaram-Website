# Phase 12: Homepage Content Curation - Research

**Researched:** 2026-06-14
**Domain:** Next.js Server Components + Supabase schema migration + portal CRUD Client Components
**Confidence:** HIGH

## Summary

This phase replaces three hardcoded static sections on the public homepage (Departments, Doctors, and a new Facilities section) with live Supabase-sourced data curated via featured toggles in the admin portal. The technical footprint is narrow and well-defined: one new migration file, three new DB query functions, three updated portal Client Components with new inline toggle columns, one updated homepage Server Component, and deletion of three stale static data files.

All pattern foundations are already present in the codebase. The portal pages use the Server Component wrapper + Client Component split (`page.tsx` + `DepartmentsClient.tsx` / `DoctorsClient.tsx` / `FacilitiesClient.tsx`). The Server Action pattern (in `app/(portal)/actions/content.ts`) uses `requireCmsRole()` + `createAdminClient()` + `revalidatePath`. The homepage is a standard async Server Component that already uses `await params`. There are no novel architectural decisions — this phase is pattern replication with surgical additions.

The one nuance is the fallback query logic: `getFeaturedDepartments()` / `getFeaturedDoctors()` / `getFeaturedFacilities()` must each run a conditional query (fetch featured first, fall back to all-active if empty). This is a two-query-or-conditional pattern that must be carefully implemented to avoid an extra round trip every request.

**Primary recommendation:** Write the fallback as a single query that fetches all items ordered by `(is_featured DESC, featured_order ASC, created_at ASC)`, then in application code slice to featured-only if any exist — this avoids a second DB round trip.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 — Featured schema (departments and doctors)**
Add two columns directly to the existing `departments` and `doctors` tables via a new Supabase migration. Do NOT create a new table.
- `is_featured boolean NOT NULL DEFAULT false`
- `featured_order integer NOT NULL DEFAULT 0`
Same pattern applies to the `facilities` table (see D-05).

**D-02 — Fallback when no featured items exist**
If `is_featured = false` for all records in a table, fall back to showing ALL active records on the homepage, ordered by `created_at ASC`. The homepage must never render an empty section due to an unconfigured toggle.

**D-03 — Portal curation UI placement**
Add featured toggle and order field INLINE on the existing `/content/departments` and `/content/doctors` list pages. Do NOT create a new `/content/homepage` page.
- Each row gets a `Featured` switch (shadcn Switch component) and a small number input for `featured_order`.
- Both fields update immediately via a Server Action on change (switch toggle or input blur). No save button needed.

**D-04 — Department cards on homepage (icon handling)**
Use the `Building2` generic fallback that `DepartmentCard` already provides when `icon` prop is omitted. Do NOT add an `icon_name` column.

**D-05 — Facilities section added to homepage**
Add a Facilities section to the homepage as part of this phase.
- Schema: Add `is_featured` and `featured_order` to `facilities` table in same migration.
- Rendering: Flat grid of `FacilityCard` components (or reuse/adapt `DepartmentCard`). Do NOT group by category on homepage.
- Placement: Hero → Stats → Departments → Doctors → **Facilities** → Appointment CTA.
- Portal curation: Add Featured switch + featured_order input to `/content/facilities` list page.
- Fallback: If no facilities are featured, show all active facilities.

**D-06 — Data fetching approach**
Server Components with `force-dynamic`. Three new query functions:
- `lib/db/departments.ts` → `getFeaturedDepartments()`
- `lib/db/doctors.ts` → `getFeaturedDoctors()` (active + featured, or all active)
- `lib/db/facilities.ts` → `getFeaturedFacilities()` (active + featured, or all active)

**D-07 — File deletion**
Delete `lib/data/departments.ts` and `lib/data/doctors.ts` once homepage is wired. Check `lib/data/services.ts` import graph before deleting.

### Claude's Discretion

- Max featured caps: 8 departments (soft), 3 doctors, ~6 facilities — enforce via Server Action validation or leave to admin discretion.
- `featured_order` tie-breaking: same order value → break by `created_at ASC`.
- FacilityCard component: reuse/adapt `DepartmentCard` or create new component.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Migration (add is_featured, featured_order) | Database | — | Schema change lives in migration file |
| Featured query functions | API / Backend | — | Server-side DB reads in lib/db/ |
| Homepage rendering (Departments, Doctors, Facilities sections) | Frontend Server (SSR) | — | Server Component with force-dynamic |
| FacilityCard component | Browser / Client | — | Presentational leaf component |
| Portal featured toggle + order input | Browser / Client | API / Backend | Client Component calls Server Action |
| Server Actions (toggle featured, set order) | API / Backend | — | Server-side DB writes with role guard |
| Revalidation on toggle | API / Backend | CDN / Static | revalidatePath invalidates Next.js cache |

---

## Standard Stack

### Core (all already installed — no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | installed | DB queries + Server Actions | Project standard |
| next | installed | Server Components, force-dynamic, revalidatePath | Project standard |
| shadcn/ui Switch | installed | Featured toggle in portal rows | Matches is_active toggle pattern from Phase 5 |
| shadcn/ui Input (number) | installed | featured_order field | Already used in portal forms |
| react-hook-form + zod | installed | Form validation in Client Components | Already used in DepartmentsClient, FacilitiesClient |

### No New Packages Required

This phase installs zero new packages. All UI primitives (Switch, Input, Table, Button), query utilities, and Server Action infrastructure are already in place.

**Installation:** None needed.

---

## Package Legitimacy Audit

No external packages are being installed in this phase.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Admin (portal browser)
  |
  | toggle Featured / set Order
  v
DepartmentsClient.tsx / DoctorsClient.tsx / FacilitiesClient.tsx  [Client Components]
  |
  | calls Server Action on change (switch toggle / input blur)
  v
app/(portal)/actions/content.ts  [Server Actions]
  | requireCmsRole() — auth + role check
  | createAdminClient().from('departments').update({ is_featured, featured_order })
  | revalidatePath('/en/departments') + revalidatePath('/hi/departments')
  |                                    + revalidatePath('/en/') + revalidatePath('/hi/')
  v
Supabase Postgres
  | departments table  (+ is_featured, featured_order columns)
  | doctors table      (+ is_featured, featured_order columns)
  | facilities table   (+ is_featured, featured_order columns)
  ^
  | async query
app/[locale]/(public)/page.tsx  [Server Component, force-dynamic]
  | getFeaturedDepartments()
  | getFeaturedDoctors()
  | getFeaturedFacilities()
  v
Public homepage browser
  DepartmentCard × N (no icon prop — Building2 fallback)
  DoctorCard × N
  FacilityCard × N (new component or adapted DepartmentCard)
```

### Recommended Project Structure

```
supabase/migrations/
  20260614_featured_columns.sql      ← new (timestamp > 20260613)

lib/db/
  departments.ts   ← add getFeaturedDepartments()
  doctors.ts       ← add getFeaturedDoctors()
  facilities.ts    ← add getFeaturedFacilities()  + update Facility interface

app/(portal)/actions/
  content.ts       ← add toggleDepartmentFeaturedAction, setDepartmentOrderAction
                      toggleDoctorFeaturedAction, setDoctorOrderAction
                      toggleFacilityFeaturedAction, setFacilityOrderAction

app/(portal)/content/departments/
  DepartmentsClient.tsx   ← add Featured column (Switch + number input)

app/(portal)/content/doctors/
  DoctorsClient.tsx       ← add Featured column

app/(portal)/content/facilities/
  FacilitiesClient.tsx    ← add Featured column

app/[locale]/(public)/
  page.tsx    ← convert to force-dynamic, await getFeatured*(), add Facilities section

components/public/
  FacilityCard.tsx   ← new component (or adapt DepartmentCard)

lib/data/
  departments.ts   ← DELETE after homepage wired
  doctors.ts       ← DELETE after homepage wired
  services.ts      ← DELETE (confirmed: zero importers in codebase)
```

### Pattern 1: Migration File Naming

The latest existing migration is `20260613_payroll_payments.sql`. The new migration must use a timestamp prefix greater than `20260613`. Use `20260614_featured_columns.sql`.

```sql
-- Source: existing migration pattern in supabase/migrations/
-- supabase/migrations/20260614_featured_columns.sql

ALTER TABLE departments
  ADD COLUMN is_featured   boolean NOT NULL DEFAULT false,
  ADD COLUMN featured_order integer NOT NULL DEFAULT 0;

ALTER TABLE doctors
  ADD COLUMN is_featured   boolean NOT NULL DEFAULT false,
  ADD COLUMN featured_order integer NOT NULL DEFAULT 0;

ALTER TABLE facilities
  ADD COLUMN is_featured   boolean NOT NULL DEFAULT false,
  ADD COLUMN featured_order integer NOT NULL DEFAULT 0;
```

No RLS changes needed — existing `public read` policies use `USING (true)` which covers all columns.

### Pattern 2: Featured Query Function (single-query fallback)

```typescript
// Source: existing getDepartments() pattern in lib/db/departments.ts
// New function to add to lib/db/departments.ts

export interface Department {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  is_featured: boolean;        // new
  featured_order: number;      // new
  created_at: string;
  updated_at: string;
}

/**
 * Returns featured departments ordered by featured_order ASC, then created_at ASC.
 * Falls back to ALL departments if none are featured (D-02).
 * Throws on Supabase error.
 */
export async function getFeaturedDepartments(): Promise<Department[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('is_featured', { ascending: false })   // featured first
    .order('featured_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const all = data as Department[];
  const featured = all.filter((d) => d.is_featured);
  return featured.length > 0 ? featured : all;
}
```

The same pattern applies to `getFeaturedDoctors()` (filter `is_active = true` first) and `getFeaturedFacilities()`.

For doctors: facilities table has no `is_active` column — only doctors does. `getFeaturedDoctors()` must filter `is_active = true` AND then apply featured logic.

```typescript
// lib/db/doctors.ts addition
export async function getFeaturedDoctors(): Promise<Doctor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('featured_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  const all = data as Doctor[];
  const featured = all.filter((d) => d.is_featured);
  return featured.length > 0 ? featured : all;
}
```

For facilities there is no `is_active` column in the current schema. `getFeaturedFacilities()` fetches all and applies the same featured/fallback logic.

### Pattern 3: Homepage Server Component Conversion

```typescript
// app/[locale]/(public)/page.tsx — changes required
// Source: existing /departments/page.tsx pattern

// ADD at top of file:
export const dynamic = 'force-dynamic';

// REMOVE:
import { departments } from '@/lib/data/departments';
import { doctors } from '@/lib/data/doctors';

// ADD:
import { getFeaturedDepartments } from '@/lib/db/departments';
import { getFeaturedDoctors } from '@/lib/db/doctors';
import { getFeaturedFacilities } from '@/lib/db/facilities';

// Inside HomePage function body, ADD awaits:
const departments = await getFeaturedDepartments();
const doctors = await getFeaturedDoctors();
const facilities = await getFeaturedFacilities();

// REMOVE generateStaticParams() export — incompatible with force-dynamic
```

`generateStaticParams()` must be deleted. It conflicts with `force-dynamic` and is unnecessary once the page is dynamic.

### Pattern 4: Server Action for Featured Toggle (inline update, no dialog)

New actions follow the same `requireCmsRole()` + `createAdminClient()` pattern already in `content.ts`. They must also call `revalidatePath` for the homepage routes:

```typescript
// To add to app/(portal)/actions/content.ts

function revalidateHomepage(): void {
  revalidatePath('/en');
  revalidatePath('/hi');
  revalidatePath('/');
}

export async function toggleDepartmentFeaturedAction(
  id: string,
  is_featured: boolean
): Promise<{ error?: string }> {
  try {
    await requireCmsRole();
    const { error } = await createAdminClient()
      .from('departments')
      .update({ is_featured, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
    revalidateDepartments();
    revalidateHomepage();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function setDepartmentOrderAction(
  id: string,
  featured_order: number
): Promise<{ error?: string }> {
  try {
    await requireCmsRole();
    const { error } = await createAdminClient()
      .from('departments')
      .update({ featured_order, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
    revalidateDepartments();
    revalidateHomepage();
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
// Repeat for doctors and facilities
```

### Pattern 5: Portal Client Component — Inline Featured Column

The portal Client Components (`DepartmentsClient.tsx`, `DoctorsClient.tsx`, `FacilitiesClient.tsx`) use `router.refresh()` after Server Action calls. The featured toggle column will do the same.

Key implementation note: the Switch component from shadcn/ui is a controlled component. The `checked` prop must be driven by local state (or `initialData`) and updated optimistically on toggle for snappy UX, then confirmed via `router.refresh()`.

```typescript
// In DepartmentsClient.tsx — add to each TableRow
<TableCell>
  <div className="flex items-center gap-2">
    <Switch
      checked={dept.is_featured}
      onCheckedChange={async (checked) => {
        await toggleDepartmentFeaturedAction(dept.id, checked);
        router.refresh();
      }}
      aria-label={`Feature ${dept.name} on homepage`}
    />
    <Input
      type="number"
      min={0}
      max={99}
      defaultValue={dept.featured_order}
      className="w-16 h-8 text-sm"
      onBlur={async (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val)) {
          await setDepartmentOrderAction(dept.id, val);
          router.refresh();
        }
      }}
      aria-label={`Featured order for ${dept.name}`}
    />
  </div>
</TableCell>
```

The `Department` interface in `lib/db/departments.ts` must be updated to include `is_featured` and `featured_order` before the Client Component can use them.

### Anti-Patterns to Avoid

- **Two-query fallback:** Do NOT make a first query for featured-only and then a second query for all-if-empty. Use the single-query order trick (ORDER BY is_featured DESC) and slice in application code.
- **Keeping generateStaticParams():** Must be removed — it's incompatible with `force-dynamic` and will cause a Next.js build error.
- **Updating interface in page file:** TypeScript interfaces belong in `lib/db/*.ts`, not in page or Client Component files.
- **Separate Server Action files:** All content actions go in the existing `app/(portal)/actions/content.ts` — do not create a new file.
- **Forgetting homepage revalidatePath:** Existing actions call `revalidateDepartments()` and `revalidateDoctors()` but NOT homepage routes. New toggle actions must call both the content-page revalidations AND `revalidatePath('/en')` / `revalidatePath('/hi')`.
- **Leaving lib/data/ imports anywhere:** After wiring, confirm no file imports from `@/lib/data/departments` or `@/lib/data/doctors` before deleting. The grep confirms only `page.tsx` currently imports them.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Role guard in Server Actions | Custom auth check | `requireCmsRole()` already in content.ts | Already handles getUser() + profile.role check + redirect |
| Revalidation on toggle | Manual ISR invalidation | `revalidatePath()` in Server Action | Built into Next.js cache system |
| Featured toggle UI | Custom checkbox | shadcn/ui `Switch` component | Already installed; matches is_active pattern |
| DB client in actions | Direct supabase-js | `createAdminClient()` | Bypasses RLS for admin writes; already the pattern |

---

## Common Pitfalls

### Pitfall 1: Forgetting to Remove generateStaticParams()
**What goes wrong:** Build fails or homepage silently uses stale static HTML after adding `force-dynamic` alongside `generateStaticParams()`.
**Why it happens:** Both exports can coexist in some configs but produce undefined behavior. `force-dynamic` and `generateStaticParams()` are contradictory.
**How to avoid:** Delete `generateStaticParams()` from `page.tsx` as the first edit.
**Warning signs:** `next build` completes but homepage doesn't show DB data in production.

### Pitfall 2: Interface Shape Mismatch at Build Time
**What goes wrong:** TypeScript error in `DepartmentsClient.tsx` because `Department` interface doesn't have `is_featured` and `featured_order`.
**Why it happens:** The interface in `lib/db/departments.ts` must be updated in the same task as the query function. Client Components depend on the exported interface.
**How to avoid:** Update the interface, the query function, and the column addition in the same plan step.

### Pitfall 3: Missing Homepage revalidatePath in Toggle Actions
**What goes wrong:** Admin toggles a department featured — portal refreshes correctly, but the public homepage still shows old data until the next server restart.
**Why it happens:** Existing `revalidateDepartments()` only calls `revalidatePath('/en/departments')` and `/hi/departments`. Homepage routes (`/en/`, `/hi/`) are not included.
**How to avoid:** Every new toggle/order Server Action must call both the content-page revalidations AND `revalidatePath('/en')` + `revalidatePath('/hi')`.

### Pitfall 4: facilities Table Has No is_active Column
**What goes wrong:** `getFeaturedFacilities()` written to filter `.eq('is_active', true)` — Supabase returns a query error at runtime.
**Why it happens:** The `facilities` table schema does NOT include `is_active` (confirmed in `20260612_cms_tables.sql`). Only `doctors` has `is_active`.
**How to avoid:** `getFeaturedFacilities()` fetches all facilities (no `is_active` filter). Departments similarly have no `is_active` column.

### Pitfall 5: DoctorCard Props Mismatch
**What goes wrong:** Homepage tries to pass `doctor.name` but DB column is `full_name`. Build or runtime error.
**Why it happens:** `lib/data/doctors.ts` used `name` and `initials` fields. `lib/db/doctors.ts` uses `full_name`. `initials` does not exist in the DB schema.
**How to avoid:** When rendering `DoctorCard` from DB data: compute `initials` from `full_name` at render time (e.g., split by space, take first letters). Pass `full_name` as `name` prop.

### Pitfall 6: Deleting lib/data/services.ts Breaks a Route
**What goes wrong:** If `lib/data/services.ts` is deleted but the `/services` public page imports it, the build breaks.
**Why it happens:** `services.ts` exports both `services[]` and `facilities[]` arrays that may be used elsewhere.
**Confirmed safe:** Grep confirmed zero importers of `lib/data/services.ts` in the codebase. Safe to delete.

---

## Codebase Findings (Verified)

### Schema (current, before migration)

**departments table columns:** `id, name, description, image_url, created_at, updated_at`
- No `is_active`. No `is_featured`. No `featured_order`. [VERIFIED: read migration file]

**doctors table columns:** `id, full_name, specialization, qualification, photo_url, bio, availability_days, is_active, staff_user_id, created_at, updated_at`
- Has `is_active boolean NOT NULL DEFAULT true`. No `is_featured`. No `featured_order`. [VERIFIED: read migration file]

**facilities table columns:** `id, name, description, category (facility_category enum), created_at, updated_at`
- No `is_active`. No `is_featured`. No `featured_order`. [VERIFIED: read migration file]

### Latest Migration Timestamp
The latest migration file is `20260613_payroll_payments.sql`. New migration must use prefix `20260614` or later. [VERIFIED: directory listing]

### lib/db/facilities.ts EXISTS
`getFacilities()` already exists — returns `Facility[]` (id, name, description, category, created_at, updated_at). [VERIFIED: read file]

### Portal Page Architecture
All three portal pages (`/content/departments`, `/content/doctors`, `/content/facilities`) use the same pattern:
- `page.tsx` — async Server Component, fetches data, passes to Client Component
- `DepartmentsClient.tsx` / `DoctorsClient.tsx` / `FacilitiesClient.tsx` — `'use client'` components with CRUD dialogs
- All three import Server Actions from `app/(portal)/actions/content.ts` [VERIFIED: read all files]

### Current Homepage Imports
`app/[locale]/(public)/page.tsx` imports:
- `{ departments }` from `@/lib/data/departments`
- `{ doctors }` from `@/lib/data/doctors`
- Does NOT import from `@/lib/db/*` currently
- Has `generateStaticParams()` — must be removed with force-dynamic [VERIFIED: read file]

### lib/data/services.ts Import Graph
Zero files in the codebase import from `lib/data/services`. Safe to delete in D-07 step. [VERIFIED: grep]

### DoctorCard Props vs DB Shape
`DoctorCard` accepts: `name, initials, specialty, bookLabel`
DB `doctors` row has: `full_name, specialization` (no `initials` column)
Mapping needed at render: `name = doctor.full_name`, `initials = initials(doctor.full_name)`, `specialty = doctor.specialization` [VERIFIED: read page.tsx and lib/db/doctors.ts]

---

## Code Examples

### Migration File

```sql
-- supabase/migrations/20260614_featured_columns.sql
-- Phase 12: Add is_featured and featured_order to departments, doctors, facilities

ALTER TABLE departments
  ADD COLUMN is_featured    boolean NOT NULL DEFAULT false,
  ADD COLUMN featured_order integer NOT NULL DEFAULT 0;

ALTER TABLE doctors
  ADD COLUMN is_featured    boolean NOT NULL DEFAULT false,
  ADD COLUMN featured_order integer NOT NULL DEFAULT 0;

ALTER TABLE facilities
  ADD COLUMN is_featured    boolean NOT NULL DEFAULT false,
  ADD COLUMN featured_order integer NOT NULL DEFAULT 0;
```

### Initials Helper (for DoctorCard)

```typescript
// Compute initials from full_name — add inline on homepage page.tsx or extract to lib/utils
function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join('');
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Static `lib/data/` arrays | Supabase live queries with force-dynamic | Homepage reflects portal edits immediately |
| No featured concept | `is_featured + featured_order` columns | Admin can curate homepage without code changes |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `revalidatePath('/en')` and `revalidatePath('/hi')` correctly invalidates the homepage cache in Next.js App Router | Pattern 4 | Homepage may not reflect toggle immediately; would need to test revalidation paths |
| A2 | shadcn/ui `Switch` component is already installed in the project | Standard Stack | Would need to add it; low risk — it's a standard shadcn component |

---

## Open Questions

1. **FacilityCard component**
   - What we know: `DepartmentCard` accepts `name, description, icon?`. Facilities have same shape.
   - What's unclear: Should Facilities section on homepage reuse `DepartmentCard` directly, or get its own `FacilityCard` component?
   - Recommendation: For this phase, reuse `DepartmentCard` without an `icon` prop (same pattern as D-04). Create `FacilityCard` only if distinct visual treatment is needed. Decision is Claude's discretion per CONTEXT.md.

2. **Max featured enforcement**
   - What we know: CONTEXT.md says "enforce via validation in Server Action or let admin decide freely."
   - What's unclear: Should the toggle Server Action reject if already 8 departments featured?
   - Recommendation: Skip enforcement in v1. Let admin decide freely. Add a helper text note to the portal UI: "Up to 8 recommended."

---

## Environment Availability

Step 2.6: SKIPPED — this phase is code/config changes only. No new external CLI tools, runtimes, or services are required beyond what is already in use (Supabase, Next.js).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Not detected (no jest.config, vitest.config, or test/ directory found) |
| Config file | None |
| Quick run command | Manual browser verification |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| — | Migration adds columns without error | smoke | `supabase db push` exits 0 | ❌ manual |
| — | getFeaturedDepartments returns featured subset when any are featured | unit | n/a — no test framework | ❌ manual |
| — | getFeaturedDepartments falls back to all when none featured | unit | n/a | ❌ manual |
| — | Homepage renders without error after switching to force-dynamic | smoke | `next build` passes + page loads | ❌ manual |
| — | Portal toggle updates featured column and homepage reflects change | e2e | manual browser test | ❌ manual |
| — | DoctorCard renders correctly with DB-sourced full_name | smoke | visual browser check | ❌ manual |

No test infrastructure exists in this project. All validation is manual smoke testing.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (portal writes) | `requireCmsRole()` in content.ts — calls `supabase.auth.getUser()` |
| V3 Session Management | no | Portal layout handles; not new surface |
| V4 Access Control | yes | `CMS_ROLES: ['super_admin', 'admin']` check before any DB write |
| V5 Input Validation | yes | `featured_order` is an integer — validate `Number.isInteger(val) && val >= 0` in Server Action |
| V6 Cryptography | no | No cryptographic operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated featured toggle | Elevation of Privilege | `requireCmsRole()` guards all new toggle/order actions |
| featured_order set to negative or huge value | Tampering | Validate `0 <= val <= 999` in Server Action before DB write |
| Stale homepage showing non-featured content | Information Disclosure (minor) | `revalidatePath` in every toggle action |

---

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/20260612_cms_tables.sql` — exact current schema for departments, doctors, facilities
- `lib/db/departments.ts`, `lib/db/doctors.ts`, `lib/db/facilities.ts` — existing query patterns
- `app/(portal)/actions/content.ts` — Server Action pattern, requireCmsRole, revalidatePath usage
- `app/(portal)/content/departments/DepartmentsClient.tsx` — Client Component CRUD pattern
- `app/(portal)/content/facilities/FacilitiesClient.tsx` — Facilities Client Component pattern
- `app/[locale]/(public)/page.tsx` — current homepage, static imports, generateStaticParams

### Secondary (MEDIUM confidence — from training knowledge)
- Next.js `force-dynamic` + `revalidatePath` behavior [ASSUMED]
- shadcn/ui Switch component API [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Schema/migration: HIGH — read actual migration file
- Query patterns: HIGH — read actual existing query files
- Portal Client Component architecture: HIGH — read all three Client Components
- Server Action pattern: HIGH — read full content.ts
- Homepage current state: HIGH — read page.tsx
- force-dynamic + revalidatePath behavior: MEDIUM [ASSUMED] — training knowledge

**Research date:** 2026-06-14
**Valid until:** 2026-07-14 (stable framework/patterns)
