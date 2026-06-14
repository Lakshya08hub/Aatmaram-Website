# Phase 14: Media Infrastructure - Context

**Gathered:** 2026-06-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the image-upload pipeline so the Super Admin (and Admin) can upload, replace, and remove images
from the portal, and those images render optimized on the public site — no image hardcoded in source.

In scope:
1. A Supabase Storage bucket + RLS (Admin/Super Admin write, public read).
2. Upload controls on the doctor, department, and facility portal forms (replacing the current plain
   URL text field) — file → Storage via Server Action → public URL saved to the existing
   `image_url`/`photo_url` columns.
3. Optimized rendering via `next/image` (with `remotePatterns` configured) + on-the-fly Supabase image
   transforms, with the existing fallbacks preserved (doctor initials, department/facility icon).
4. A site-level media slot for the homepage hero background image, managed from a portal media section.

Out of scope (deferred):
- Testimonial avatars and any other Phase 15 site imagery (built where testimonials are built).
- Client-side image compression libraries.
- Private buckets / signed URLs.

</domain>

<decisions>
## Implementation Decisions

### Upload mechanism
- **D-01 — Upload through a Server Action.** The file posts to a Next.js Server Action that uploads to
  Supabase Storage using the admin client (`createAdminClient()`), then saves the resulting public URL
  to the record. Auth (`requireCmsRole()`), file validation, and the DB write all live in one trusted
  server place — mirrors the existing `app/(portal)/actions/content.ts` pattern. No client-direct upload.

### Bucket layout & access
- **D-02 — One public bucket with per-type folders.** A single bucket (e.g. `media`) with folders
  `doctors/`, `departments/`, `facilities/`, `site/`. **Public read** (these images are shown on the
  public marketing site anyway). RLS: only `super_admin`/`admin` roles may write/delete; anonymous read
  allowed. No separate buckets, no signed URLs.
- File naming should avoid collisions and stale-cache issues (e.g. `{entityId}-{timestamp}.{ext}` or a
  uuid) — planner/research decides the exact scheme; deleting/replacing should not leave orphans where
  avoidable.

### Image constraints & processing
- **D-03 — Validate on upload, transform on render.** Enforce allowed types (`jpg`/`png`/`webp`) and a
  max size (target ~5 MB) in the Server Action before upload. Store the original. Resize/optimize at
  render time via Supabase image transformation URLs combined with `next/image`. No client-side image
  compression library.

### Rendering
- **D-04 — `next/image` everywhere images render.** Add the Supabase project host to
  `next.config.ts` `images.remotePatterns`. Render with explicit sizing, lazy loading, and a fallback
  for records without an image. **Preserve existing fallbacks:** doctor initials (DoctorCard),
  department/facility icon. Doctor photos are headshots (square crop); department/facility/hero use
  their natural/wide aspect — planner sets exact sizes per UI.

### Site-level media scope
- **D-05 — Entity images + homepage hero background only.** This phase delivers upload for
  doctors/departments/facilities plus ONE site-level slot: the homepage hero background image.
  Testimonial avatars and other site imagery are deferred to Phase 15. Store the hero image URL as a
  single site-level value — likely a new `hero_image_url` column on the existing single-row
  `hospital_info` table (planner confirms vs a small site-media table). The homepage hero
  (`app/[locale]/(public)/page.tsx` Section 1) renders it as a full-bleed background when set, falling
  back to the current plain background when unset.

### Portal media section
- **D-06 — Site-level images managed from a portal media area.** The hero-background upload lives in a
  portal location (a new "Media" or "Site Images" section, or within an existing settings/hospital-info
  page — planner decides placement consistent with the current portal nav/roles). Entity image uploads
  live inline on their existing CRUD forms (departments/doctors/facilities), replacing the URL text field.

### Claude's Discretion
- Exact bucket name, file-naming scheme, and folder paths.
- Whether the hero URL is a `hospital_info` column vs a dedicated table.
- Exact `next/image` `sizes`/dimensions per surface and the Supabase transform parameters.
- Portal placement of the site-media (hero) upload control.
- Upload-control UX details (preview, drag-drop vs picker, progress) — keep consistent with existing
  shadcn form patterns and the Phase 13 design system.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing schema & columns (image fields already present)
- `supabase/migrations/20260612_cms_tables.sql` — defines `departments.image_url`, `doctors.photo_url`,
  `facilities` and the single-row `hospital_info` table. The new hero column (D-05) and any Storage
  RLS/bucket SQL go in a NEW migration (applied via the Supabase dashboard — no local CLI).

### Server Action + admin client pattern (the upload action mirrors these)
- `app/(portal)/actions/content.ts` — `requireCmsRole()` gate + `createAdminClient()` write pattern +
  `revalidatePath`. The new `uploadImageAction` follows this exactly.
- `lib/supabase/admin.ts` — service-role admin client used for privileged writes (and Storage writes).
- `lib/supabase/server.ts` — server client for reads.

### Forms to add upload controls to (replace the URL text field)
- `app/(portal)/content/departments/DepartmentsClient.tsx` — has the current "Image URL (optional)"
  text field to replace with an upload control.
- `app/(portal)/content/doctors/DoctorsClient.tsx` — doctor photo field.
- `app/(portal)/content/facilities/FacilitiesClient.tsx` — facility image field.

### Data layer
- `lib/db/departments.ts`, `lib/db/doctors.ts`, `lib/db/facilities.ts` — typed rows incl.
  `image_url`/`photo_url`; the hero value (D-05) likely extends the hospital_info query layer.

### Render targets + current fallbacks (to preserve)
- `components/public/DoctorCard.tsx` — currently renders INITIALS (no photo); add optional photo via
  `next/image` with initials fallback.
- `components/public/DepartmentCard.tsx`, `components/public/FacilityCard.tsx` — icon fallback today.
- `app/[locale]/(public)/page.tsx` — Section 1 hero (full-bleed hero bg target, D-05) + the
  department/doctor/facility card grids.

### Config
- `next.config.ts` — currently NO `images` config; MUST add `images.remotePatterns` for the Supabase
  Storage host. Project host: `ilvkpbuqjgmldunjpwor.supabase.co` (from `NEXT_PUBLIC_SUPABASE_URL`).

### Roles
- `lib/portal/roles.ts` — `super_admin`/`admin` are the CMS-capable roles; Storage RLS write policy
  must match (D-02). `requireCmsRole()` already enforces this set.

### Design system (Phase 13 — just shipped)
- `components/ui/empty-state.tsx`, `components/motion/*` — reuse where an upload area needs an empty/
  placeholder state; keep token classes so any portal upload UI is dark-mode-correct.

</canonical_refs>

<code_context>
## Existing Code Insights

### Current state (greenfield for media)
- NO `next/image` usage anywhere — images are not currently rendered optimized.
- NO Supabase Storage usage anywhere — bucket + policies must be created fresh.
- NO `images` block in `next.config.ts` — remotePatterns must be added before `next/image` of remote
  Supabase URLs will work.
- `image_url`/`photo_url` columns exist and are populated today by plain URL TEXT inputs in the portal
  forms — Phase 14 replaces those inputs with uploads but keeps the columns (store the public URL).

### Established patterns to follow
- Server Actions in `app/(portal)/actions/*.ts` with `requireCmsRole()` + `createAdminClient()` +
  `revalidatePath` on both portal and public paths.
- Migrations are SQL files applied via the Supabase dashboard SQL editor (no local CLI connection).
- shadcn form components (Dialog/Sheet + react-hook-form + Zod) drive the existing CRUD forms.

### Integration points
- The upload Server Action writes to Storage AND updates the record's `image_url`/`photo_url`, then
  revalidates the relevant public pages so new images appear immediately.
- `next.config.ts` change is required and global — verify the public site still builds after adding
  `images.remotePatterns`.
- Storage RLS + bucket creation is DB/dashboard work (a migration + dashboard checkpoint), parallel to
  the Phase 5/12 migration pattern.

</code_context>

<specifics>
## Specific Ideas

- Allowed types: jpg/png/webp; max ~5 MB (planner can tune).
- Doctor photos: square headshot crop; hero: wide/full-bleed; department/facility: card aspect.
- Existing external image URLs (if any rows already have them) should still display — the render path
  should accept any stored URL, not only Storage URLs (remotePatterns may need the broader allowance or
  a documented constraint that only Storage URLs are supported going forward).

</specifics>

<deferred>
## Deferred Ideas

- Testimonial avatars + other Phase 15 site imagery — built in Phase 15 (testimonials don't exist yet).
- Client-side image compression — not this phase (validate + server upload + render-time transform suffices).
- Private buckets / signed URLs — unnecessary for public marketing images.
- A fully generic key→image site-media manager — deferred; Phase 14 ships only the hero slot.

</deferred>

---

*Phase: 14-Media Infrastructure*
*Context gathered: 2026-06-14*
