# Phase 12: Homepage Content Curation - Context

**Gathered:** 2026-06-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the homepage's three hardcoded sections (Departments, Doctors, Facilities) with live
Supabase-sourced data controlled by admin-managed featured toggles. The `/departments` and
`/doctors` public pages are EXCLUDED — they already use Supabase and are untouched. When
this phase is complete, `lib/data/departments.ts` and `lib/data/doctors.ts` are no longer
imported anywhere in the public homepage.

</domain>

<decisions>
## Implementation Decisions

### D-01 — Featured schema (departments and doctors)
Add two columns directly to the existing `departments` and `doctors` tables via a new Supabase
migration. Do NOT create a new table.

- `is_featured boolean NOT NULL DEFAULT false`
- `featured_order integer NOT NULL DEFAULT 0`

Same pattern applies to the `facilities` table (see D-05).

### D-02 — Fallback when no featured items exist
If `is_featured = false` for all records in a table, fall back to showing ALL active records
on the homepage, ordered by `created_at ASC`. The homepage must never render an empty section
due to an unconfigured toggle. This fallback applies to departments, doctors, and facilities.

### D-03 — Portal curation UI placement
Add the featured toggle and order field INLINE on the existing `/content/departments` and
`/content/doctors` list pages. Do NOT create a new `/content/homepage` page.

- Each row in the table gets a `Featured` switch (shadcn Switch component) and a small
  number input for `featured_order`.
- Both fields update immediately via a Server Action on change (switch toggle or input blur).
  No save button needed. This matches the `is_active` toggle pattern already used in Phase 5.
- The same inline approach applies to `/content/facilities` (see D-05).

### D-04 — Department cards on homepage (icon handling)
Use the `Building2` generic fallback that `DepartmentCard` already provides when `icon` prop
is omitted. Do NOT add an `icon_name` column to the `departments` table. This is consistent
with how the `/departments` page already renders department cards.

### D-05 — Facilities section added to homepage
Add a Facilities section to the homepage as part of this phase.

- **Schema:** Add `is_featured boolean NOT NULL DEFAULT false` and `featured_order integer NOT
  NULL DEFAULT 0` to the `facilities` table in the same migration as D-01.
- **Rendering:** Flat grid of `FacilityCard` components (or reuse/adapt `DepartmentCard`).
  Do NOT group by category (`facility_category` enum) on the homepage.
- **Placement:** After the Doctors section, before the Appointment CTA band (current Section 5).
  New homepage order: Hero → Stats → Departments → Doctors → **Facilities** → Appointment CTA.
- **Portal curation:** Add `Featured` switch + `featured_order` input to the existing
  `/content/facilities` list page (same pattern as D-03).
- **Fallback:** If no facilities are featured, show all active facilities (same rule as D-02).

### D-06 — Data fetching approach
Use Server Components with `force-dynamic` (no static generation) for the homepage, matching
the pattern already used by `/departments` and `/doctors` pages. Add three new query functions:
- `lib/db/departments.ts` → `getFeaturedDepartments()` (returns featured, or all if none)
- `lib/db/doctors.ts` → `getFeaturedDoctors()` (returns active + featured, or all active if none)
- `lib/db/facilities.ts` → `getFeaturedFacilities()` (returns active + featured, or all active if none)

### D-07 — File deletion
Once the homepage is wired to Supabase, verify that `lib/data/departments.ts` and
`lib/data/doctors.ts` are no longer imported anywhere in the public site. Then delete them.
`lib/data/services.ts` may also be redundant — check its import graph before deciding.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Schema
- `supabase/migrations/20260612_cms_tables.sql` — Authoritative DDL for departments, doctors,
  facilities, hospital_info tables. Agents must read before writing the new migration to avoid
  column conflicts.

### Existing DB Query Layer
- `lib/db/departments.ts` — Pattern for `getDepartments()` with typed return. New
  `getFeaturedDepartments()` follows same structure.
- `lib/db/doctors.ts` — Pattern for `getActiveDoctors()`. New `getFeaturedDoctors()` follows
  same structure, filtering `is_active = true AND is_featured = true` (with fallback).
- `lib/db/facilities.ts` (if exists) — Check before creating; may already have `getFacilities()`.

### Existing Public Pages (Supabase pattern to replicate)
- `app/[locale]/(public)/departments/page.tsx` — Shows how Server Component fetches from
  `lib/db/` and renders `DepartmentCard` without icon prop.
- `app/[locale]/(public)/doctors/page.tsx` — Shows `getActiveDoctors()` usage pattern.

### Existing Components
- `components/public/DepartmentCard.tsx` — Props: `name, description, icon? (optional)`.
  Pass no `icon` prop for Supabase departments; `Building2` fallback fires automatically.
- `components/public/DoctorCard.tsx` — Props: `name, initials, specialty, bookLabel`.

### Existing Portal Pattern (Phase 5)
- `app/(portal)/content/departments/page.tsx` — Shows current portal department list page
  that needs the Featured toggle + order input added inline.
- `app/(portal)/content/doctors/page.tsx` — Same for doctors.
- Phase 5 Server Action pattern (check `app/(portal)/content/` for existing action files) —
  Featured toggle should use the same `revalidatePath` + Server Action pattern.

### Homepage to Replace
- `app/[locale]/(public)/page.tsx` — The file being modified. Imports from
  `@/lib/data/departments` and `@/lib/data/doctors` to be replaced with Supabase calls.

### Hardcoded Data to Delete
- `lib/data/departments.ts` — To be deleted after homepage is wired.
- `lib/data/doctors.ts` — To be deleted after homepage is wired.
- `lib/data/services.ts` — Check import graph; may also be deleteable.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/public/DepartmentCard.tsx` — Already icon-optional; no changes needed for
  Supabase departments.
- `components/public/DoctorCard.tsx` — Already accepts plain `name, initials, specialty`
  strings; works directly with Supabase doctor rows.
- `components/public/SectionHeading.tsx` — Used in homepage sections; keep as-is.
- `lib/db/departments.ts` and `lib/db/doctors.ts` — Query patterns to extend (add
  `getFeaturedDepartments` / `getFeaturedDoctors` functions, do not replace existing ones
  since `/departments` and `/doctors` pages still use them).

### Established Patterns
- `force-dynamic` on all public pages that read live Supabase data (required — no ISR).
- Server Actions with `revalidatePath('/content/departments')` for instant portal updates.
- `supabase/server.ts` createClient used in all Server Components and Server Actions.
- TypeScript interfaces defined in `lib/db/*.ts` files, not in page files.

### Integration Points
- New migration file adds columns to existing tables — must not conflict with Phase 5 migration
  (`20260612_cms_tables.sql`). Use a new timestamp prefix.
- `app/[locale]/(public)/page.tsx` switches from static import to async `await` calls —
  must add `export const dynamic = 'force-dynamic'` to opt out of static generation.
- Portal pages at `app/(portal)/content/departments/page.tsx` and `doctors/page.tsx` get new
  Featured column + Server Action; these pages currently have Server Action patterns from Phase 5.

</code_context>

<specifics>
## Specific Ideas

- Max featured: 8 departments, 3 doctors, no stated cap for facilities (use reasonable default
  e.g. 6 — enforce via validation in Server Action or let admin decide freely).
- The `featured_order` field should be a simple ascending integer (1, 2, 3...). If two records
  share the same `featured_order`, break ties by `created_at ASC`.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-Homepage Content Curation*
*Context gathered: 2026-06-14*
