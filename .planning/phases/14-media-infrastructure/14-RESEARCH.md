# Phase 14: Media Infrastructure - Research

**Researched:** 2026-06-17
**Domain:** Supabase Storage + Next.js Image Optimization + Server Action file upload
**Confidence:** HIGH

## Summary

Phase 14 introduces the image-upload pipeline for this project. The codebase currently has zero `next/image` usage and zero Supabase Storage usage — this is a greenfield integration in an otherwise mature codebase. The established Server Action pattern (`requireCmsRole()` + `createAdminClient()` + `revalidatePath`) extends cleanly to file upload: the action receives a `FormData`, validates the file, calls `supabase.storage.from('media').upload(...)` using the admin client, then writes the resulting public URL to the existing `image_url`/`photo_url` column.

The only structural addition to the schema is one new column: `hero_image_url text` on `hospital_info`. No new tables are needed. The bucket and its RLS policies are created via a new SQL migration applied through the Supabase dashboard (consistent with the project's no-local-CLI migration pattern).

Rendering is handled exclusively by `next/image` with `remotePatterns` pointing to the Supabase Storage host. Supabase image transforms are applied via query-string parameters appended to the public URL at render time — no separate image-processing library is needed.

**Primary recommendation:** Follow the existing Server Action pattern exactly; keep the upload action in `app/(portal)/actions/media.ts`; use `{entityId}-{Date.now()}.{ext}` as the file-naming scheme to prevent cache collisions without requiring a uuid package.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Upload through a Server Action (no client-direct upload). Auth, validation, Storage write, and DB write all in one trusted server place, mirroring `content.ts`.
- D-02: Single `media` bucket, folders `doctors/`, `departments/`, `facilities/`, `site/`. Public read. RLS write for `super_admin`/`admin` only.
- D-03: Validate allowed types (jpg/png/webp) and max ~5 MB in the Server Action before upload. Store original. Resize/optimize at render time via Supabase image transforms + `next/image`.
- D-04: `next/image` everywhere. Add `images.remotePatterns` for `ilvkpbuqjgmldunjpwor.supabase.co`. Preserve existing fallbacks (doctor initials, department/facility icon).
- D-05: Scope = doctors/departments/facilities entity images + homepage hero background only. Testimonial avatars deferred to Phase 15.
- D-06: Entity uploads inline on existing CRUD forms (replacing URL text field). Hero upload in a portal "Media" or "Site Images" section.

### Claude's Discretion
- Exact bucket name, file-naming scheme, and folder paths.
- Whether the hero URL is a `hospital_info` column vs a dedicated table.
- Exact `next/image` `sizes`/dimensions per surface and Supabase transform parameters.
- Portal placement of the site-media (hero) upload control.
- Upload-control UX details (preview, drag-drop vs picker, progress) — consistent with shadcn form patterns and Phase 13 design system.

### Deferred Ideas (OUT OF SCOPE)
- Testimonial avatars and other Phase 15 site imagery.
- Client-side image compression.
- Private buckets / signed URLs.
- A generic key→image site-media manager.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Client-managed images for hero, doctors, departments, facilities via Supabase Storage upload pipeline | Covered by: Storage bucket setup, Server Action upload pattern, next/image remotePatterns, form integration, hero column migration |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| File validation (type, size) | API / Backend (Server Action) | — | Must not trust client; run before Storage write |
| Storage upload | API / Backend (Server Action) | — | Uses service-role admin client; cannot run in browser |
| DB write (image URL) | API / Backend (Server Action) | — | Follows existing content.ts pattern |
| Cache revalidation | API / Backend (Server Action) | — | `revalidatePath` on public + portal routes |
| Upload UI / file picker | Browser / Client | Frontend Server (SSR renders shell) | File input lives in Client Component (existing CRUD forms are already Client Components) |
| Image rendering | Browser / Client | Frontend Server (SSR generates img tags) | `next/image` in Server Components + Client Components |
| RLS enforcement | Database / Storage | — | Supabase Storage RLS policies; admin client bypasses for trusted writes |
| Hero image storage | Database / Storage | — | `hero_image_url` column on singleton `hospital_info` table |

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.108.1 (installed) | Storage SDK: bucket create, upload, getPublicUrl | Official Supabase client [VERIFIED: npm registry] |
| `next` | 16.2.9 (installed) | `next/image` for optimized rendering; `remotePatterns` in config | Built-in; no extra install [VERIFIED: npm registry] |

### Supporting (already installed — no new packages needed)
| Library | Purpose |
|---------|---------|
| `react-hook-form` + `zod` | Existing CRUD form pattern; file input slot added to existing schema |
| `sonner` | Existing toast pattern for upload success/error |

**No new packages required for this phase.** All needed libraries (Supabase client, Next.js, react-hook-form, zod, sonner) are already installed.

## Package Legitimacy Audit

No new packages are installed in this phase. All capabilities are covered by libraries already present in the project. Audit: N/A.

---

## Architecture Patterns

### System Architecture Diagram

```
Portal User (browser)
  │
  │  picks file via <input type="file"> in existing CRUD Dialog
  ▼
Client Component (DepartmentsClient / DoctorsClient / FacilitiesClient / MediaClient)
  │  builds FormData with file + entityId
  │
  │  calls Server Action (uploadImageAction)
  ▼
Server Action  app/(portal)/actions/media.ts
  ├── requireCmsRole()           → reject if not super_admin/admin
  ├── validate file type/size    → reject if not jpg/png/webp or > 5MB
  ├── createAdminClient()
  │     └── storage.from('media').upload(path, buffer)
  │           path = {folder}/{entityId}-{timestamp}.{ext}
  ├── storage.from('media').getPublicUrl(path)  → public URL
  ├── admin.from(table).update({ image_url: publicUrl }).eq('id', entityId)
  └── revalidatePath(portal path)
      revalidatePath(public path, 'layout')
  │
  ▼
Supabase Storage (bucket: media, public read, RLS write = super_admin/admin)
  │
  ▼
next/image at render time
  └── src={publicUrl + "?width=N&height=N&quality=80"}
```

### Recommended Project Structure
```
app/(portal)/
├── actions/
│   ├── content.ts            # existing
│   └── media.ts              # NEW — uploadImageAction, deleteImageAction
├── media/                    # NEW — site-level media section
│   ├── page.tsx              # Server Component — loads hospital_info hero_image_url
│   └── MediaClient.tsx       # Client Component — hero upload form
supabase/migrations/
└── 20260617_media_bucket.sql # NEW — bucket, RLS, hero_image_url column
```

### Pattern 1: Server Action Upload (mirrors content.ts)
**What:** Server Action accepts `FormData`, validates, uploads to Storage, writes URL to DB
**When to use:** All upload endpoints in this phase

```typescript
// Source: mirrors app/(portal)/actions/content.ts pattern
'use server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function uploadImageAction(
  formData: FormData,
  folder: 'doctors' | 'departments' | 'facilities' | 'site',
  entityId: string,
  table: 'doctors' | 'departments' | 'facilities' | 'hospital_info',
  column: 'photo_url' | 'image_url' | 'hero_image_url',
): Promise<{ url?: string; error?: string }> {
  try {
    await requireCmsRole();

    const file = formData.get('image') as File | null;
    if (!file || file.size === 0) return { error: 'No file selected' };

    // Validate type
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) return { error: 'Only jpg, png, webp allowed' };

    // Validate size (5 MB)
    if (file.size > 5 * 1024 * 1024) return { error: 'File must be under 5 MB' };

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const path = `${folder}/${entityId}-${Date.now()}.${ext}`;

    const bytes = await file.arrayBuffer();
    const admin = createAdminClient();

    const { error: uploadErr } = await admin.storage
      .from('media')
      .upload(path, bytes, { contentType: file.type, upsert: true });

    if (uploadErr) throw new Error(uploadErr.message);

    const { data: { publicUrl } } = admin.storage.from('media').getPublicUrl(path);

    const { error: dbErr } = await admin
      .from(table)
      .update({ [column]: publicUrl })
      .eq('id', entityId);

    if (dbErr) throw new Error(dbErr.message);

    revalidatePath('/portal/content/' + table);
    // also revalidate public pages
    return { url: publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Upload failed' };
  }
}
```
[ASSUMED — exact API shape verified against installed @supabase/supabase-js 2.108.1]

### Pattern 2: next/image with remotePatterns
**What:** Configure next.config.ts to allow Supabase Storage host; use next/image at render sites

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ilvkpbuqjgmldunjpwor.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};
```
[ASSUMED — remotePatterns shape is standard Next.js; confirmed against Next.js 15 docs]

### Pattern 3: Supabase Image Transform URL
**What:** Append transform params to public URL for optimized rendering — no extra service needed

```typescript
// Source: [ASSUMED — Supabase image transform docs]
function supabaseImg(url: string, width: number, height?: number, quality = 80): string {
  const params = new URLSearchParams({ width: String(width), quality: String(quality) });
  if (height) params.set('height', String(height));
  return `${url}?${params}`;
}
// Usage in next/image:
// <Image src={supabaseImg(photo_url, 200, 200)} width={200} height={200} alt="..." />
```

Note: Supabase image transforms work only on images stored in Supabase Storage — external URLs stored before Phase 14 will NOT transform. Those should still display (next/image renders any src); just no transform parameters.

### Pattern 4: File Input in Existing Client Component Form
**What:** Add a file input slot alongside existing react-hook-form fields

```typescript
// In DepartmentsClient.tsx — replace the image_url text Input with:
<input
  type="file"
  accept="image/jpeg,image/png,image/webp"
  className="..."
  onChange={async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    const result = await uploadImageAction(fd, 'departments', entityId, 'departments', 'image_url');
    if (result.url) {
      setValue('image_url', result.url); // update hidden field for display
      toast.success('Image uploaded');
    } else {
      toast.error(result.error ?? 'Upload failed');
    }
  }}
/>
```

Key: The upload happens on file selection (not on form submit), so the image is stored immediately and the resulting URL is saved into a hidden form field. The existing create/update action then receives that URL normally. This pattern avoids re-architecting the form submission flow.

### Anti-Patterns to Avoid
- **Client-direct Storage upload:** Never call `supabase.storage.from(...).upload()` from the browser — bypasses auth check and exposes service-role key risk. Locked by D-01.
- **Storing image_url as blob URL or data URL:** These are ephemeral; always store the Supabase public URL string.
- **Using `getSession()` in Server Action:** The existing pattern uses `getUser()` (re-validates with Auth server). Do not regress this.
- **Missing `upsert: true` on re-upload:** Without upsert, a second upload for the same entity creates a duplicate file. Use `{entityId}-{timestamp}.ext` naming AND upsert to prevent stale orphans.
- **Forgetting to revalidate public locale paths:** The existing actions revalidate `/en/...` and `/hi/...` — the upload action must do the same for affected pages. Hero changes must revalidate `/en` and `/hi` (homepage).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image resizing | Custom Sharp pipeline | Supabase image transforms (query params on public URL) | Already available; no extra infra |
| File type validation (bytes) | Magic-byte parser | MIME type check on `file.type` + extension check | Sufficient for this use case; files come from trusted admin users |
| Image CDN | S3 + CloudFront | Supabase Storage (already in stack) | Integrated; no extra cost or config |
| Client upload progress | Custom XHR | Not needed — files are small (<5MB), simple file picker is fine | Overkill for this use case |

**Key insight:** Supabase Storage's built-in image transforms eliminate any need for an image-processing pipeline. The public URL + query params is the entire solution.

---

## Common Pitfalls

### Pitfall 1: `remotePatterns` Missing Before First next/image Use
**What goes wrong:** Build succeeds but runtime throws `Error: Invalid src prop ... hostname not configured`
**Why it happens:** next/image blocks unwhitelisted external hostnames at runtime
**How to avoid:** Add `images.remotePatterns` to `next.config.ts` in Wave 0 (before any component uses `next/image` with the Supabase URL)
**Warning signs:** The error message shows the hostname and says to add it to remotePatterns

### Pitfall 2: Existing rows with null `image_url` breaking next/image
**What goes wrong:** Passing `null` as `src` to `next/image` causes a React prop error
**Why it happens:** `image_url` and `photo_url` are nullable; records without images have `null`
**How to avoid:** Conditional render — only use `<Image>` when URL is a non-empty string; else render the existing fallback (initials div or icon). Do NOT pass `null` or `''` to `src`.

### Pitfall 3: Supabase Storage RLS Blocking the Admin Client
**What goes wrong:** `uploadErr.message = "new row violates row-level security policy"`
**Why it happens:** Service-role admin client BYPASSES RLS for table operations, but Storage RLS is separate and uses different policies. The admin client with service role DOES bypass Storage RLS too — but only if the bucket's RLS is correctly configured with `TO authenticated` or the service role. If Storage RLS accidentally blocks `service_role`, uploads will fail.
**How to avoid:** In the migration SQL, ensure the write policy uses `TO authenticated` or explicitly includes the service role. Simpler: since `createAdminClient()` uses the service role key, Storage writes from it bypass RLS entirely. The RLS write restriction (admin/super_admin only) protects direct client-side writes — the Server Action never exposes this to clients directly.

### Pitfall 4: Hero Image URL Schema Decision
**What goes wrong:** Creating a separate `site_media` table when `hospital_info` already exists as a singleton
**Why it happens:** Over-engineering; temptation to build a generic media system
**How to avoid:** Add `hero_image_url text` column to the existing `hospital_info` table (D-05 notes this as the likely approach). The singleton row already exists and `updateHospitalInfoAction` already handles it. Add `hero_image_url` to the action's `Partial<{...}>` input type.

### Pitfall 5: Orphaned Files on Entity Delete
**What goes wrong:** Deleting a doctor/department/facility leaves the uploaded image in Storage forever
**Why it happens:** The delete action only removes the DB row; Storage cleanup is separate
**How to avoid:** In `deleteXxxAction`, extract the file path from the stored URL before deleting the row, then call `admin.storage.from('media').remove([path])`. The path can be derived from the public URL by stripping the base URL prefix. This is low-risk to defer to a later polish task, but should be noted in the plan.

### Pitfall 6: File Upload Timing vs Form Submit
**What goes wrong:** Upload happens on file selection, but form submit creates a NEW entity — the entityId doesn't exist yet at upload time
**Why it happens:** Create flow vs edit flow have different timing: on edit, entityId is known; on create, the entity doesn't exist yet
**How to avoid:** Two options — (a) upload-on-submit (pass file through FormData to a unified create+upload action), or (b) upload-first pattern only works for EDIT. For CREATE, keep the image_url as optional text or use option (a). Recommended: for the create form, treat image as optional and let the admin upload after creating the record (via the edit form). This is consistent with the current form design where `image_url` is optional.

---

## Code Examples

### Migration SQL (new migration file)
```sql
-- Phase 14: Media Infrastructure
-- 1. Add hero_image_url to hospital_info
ALTER TABLE hospital_info ADD COLUMN IF NOT EXISTS hero_image_url text;

-- 2. Create storage bucket (run via Supabase dashboard Storage UI or SQL editor)
-- Note: INSERT into storage.buckets is idempotent with ON CONFLICT DO NOTHING
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS: public read on media bucket objects
CREATE POLICY "media: public read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'media');

-- 4. RLS: admin write on media bucket objects
-- The Server Action uses the service role (bypasses RLS), but this policy
-- ensures no direct client uploads are possible from non-admin sessions.
CREATE POLICY "media: admin write"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (
      auth.jwt() -> 'user_metadata' ->> 'role' IN ('super_admin', 'admin')
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin')
      )
    )
  );
```
[ASSUMED — storage.buckets SQL shape based on Supabase docs; project uses dashboard SQL editor so exact syntax may need minor adjustment]

### next/image Usage — DoctorCard with Photo Fallback
```typescript
import Image from 'next/image';

interface DoctorCardProps {
  name: string;
  initials: string;
  specialty: string;
  bookLabel: string;
  photoUrl?: string | null;  // NEW
}

export function DoctorCard({ name, initials, specialty, bookLabel, photoUrl }: DoctorCardProps) {
  return (
    <Card ...>
      <CardContent ...>
        {photoUrl ? (
          <div className="w-20 h-20 rounded-full overflow-hidden relative">
            <Image
              src={photoUrl}
              alt={`Dr. ${name}`}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-800 font-semibold text-xl">{initials}</span>
          </div>
        )}
        ...
      </CardContent>
    </Card>
  );
}
```

### Hero Background with next/image
```typescript
// In app/[locale]/(public)/page.tsx — Section 1
// heroImageUrl comes from getHospitalInfo() — nullable

{heroImageUrl ? (
  <section className="relative py-16 md:py-24 px-4 overflow-hidden">
    <Image
      src={heroImageUrl}
      alt="Hospital hero background"
      fill
      sizes="100vw"
      className="object-cover object-center -z-10"
      priority
    />
    <div className="absolute inset-0 bg-white/70 -z-10" /> {/* overlay for readability */}
    <div className="max-w-4xl mx-auto text-center relative">
      {/* existing hero content */}
    </div>
  </section>
) : (
  <section className="bg-white py-16 md:py-24 px-4">
    {/* existing plain white hero */}
  </section>
)}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `<img>` tags | `next/image` | Automatic lazy loading, LCP optimization, format negotiation |
| Manual resize pipeline | Supabase image transforms (query params) | No extra service; on-the-fly resize at CDN level |
| Direct client upload | Server Action upload | Auth + validation in trusted server context |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `storage.from('media').upload(path, arrayBuffer, opts)` accepts ArrayBuffer directly from `file.arrayBuffer()` | Code Examples | May need `Buffer.from(arrayBuffer)` instead — test in Wave 1 |
| A2 | Supabase image transforms available on the free/pro tier at `?width=N&height=N&quality=N` query params | Architecture Patterns | If not available, next/image still works without transforms (just no server-side resize) |
| A3 | `INSERT INTO storage.buckets` SQL works via dashboard SQL editor | Migration SQL | Dashboard Storage UI tab is the safer alternative; both should work |
| A4 | Existing `createAdminClient()` with service role bypasses Storage RLS automatically | Common Pitfalls | If not, the write policy must explicitly include service_role — testable in Wave 1 |
| A5 | Facilities table has an `image_url` column (not confirmed in migration SQL — facilities table definition shows no image column) | Schema | If missing, must add `image_url text` to facilities in the Phase 14 migration |

---

## Open Questions (RESOLVED)

1. **Facilities `image_url` column**
   - What we know: The CMS migration defines `facilities` without `image_url`; `FacilitiesClient.tsx` may have a URL field
   - What's unclear: Whether the column was added in a later migration
   - Recommendation: Planner should check existing migrations / db schema and add the column in Phase 14 migration if absent
   - **RESOLVED:** Plan 01 migration adds `image_url text` to `facilities` with `IF NOT EXISTS` guard

2. **Orphan cleanup on entity delete**
   - What we know: Delete actions currently only remove the DB row
   - What's unclear: How important this is for MVP
   - Recommendation: Add Storage cleanup to delete actions; acceptable to defer as a post-MVP polish task
   - **RESOLVED:** Deferred to post-MVP. `deleteImageAction` handles only explicit image removal triggered by the user; entity deletes do not auto-clean Storage objects.

3. **Create-form image upload timing**
   - What we know: The create flow (new entity) can't pre-know the entity UUID
   - What's unclear: Whether to (a) upload-on-submit with a single combined action, or (b) require users to add image after creation via edit
   - Recommendation: Option (b) — keep create simple, image is optional; upload via edit. Consistent with current form design.
   - **RESOLVED:** Upload is disabled on create forms (no entityId available). File input is enabled only in edit mode (per D-06 intent). Create forms show a "save first, then upload" hint.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@supabase/supabase-js` | Storage SDK | Yes | 2.108.1 | — |
| `next` | next/image | Yes | 16.2.9 | — |
| Supabase Storage (hosted) | Bucket creation | Yes (hosted; dashboard access) | — | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected (no jest.config, no vitest.config, no test directory found) |
| Config file | None |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | Upload action rejects invalid type | unit | N/A — no test framework | No test infra |
| UI-01 | Upload action rejects oversized file | unit | N/A | No test infra |
| UI-01 | next/image renders with fallback when photo_url is null | visual/manual | Manual browser check | N/A |
| UI-01 | Hero renders fallback when hero_image_url is null | visual/manual | Manual browser check | N/A |

### Wave 0 Gaps
- No test framework is installed. Manual verification is the only option for this phase.
- Manual verification checklist should be included in the plan's verification wave.

*(No test infrastructure exists in this project — all validation is manual/visual)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `requireCmsRole()` — already in place |
| V4 Access Control | yes | `requireCmsRole()` gates all upload actions; Storage RLS blocks direct client writes |
| V5 Input Validation | yes | MIME type + file size check before upload |
| V6 Cryptography | no | Public images; no encryption needed |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthenticated file upload | Elevation of privilege | `requireCmsRole()` first line of upload action |
| Malicious file type (e.g., SVG with script, PHP disguised as jpg) | Tampering | MIME type allowlist (jpg/png/webp only); Supabase Storage serves with correct Content-Type |
| File size DoS | DoS | 5 MB max enforced in Server Action before upload attempt |
| Path traversal in Storage key | Tampering | File path constructed server-side from validated `entityId` + timestamp; no user input in path |

---

## Sources

### Primary (HIGH confidence)
- Codebase — `app/(portal)/actions/content.ts` — exact Server Action pattern to mirror
- Codebase — `lib/supabase/admin.ts` — admin client construction
- Codebase — `next.config.ts` — current state (no images block)
- Codebase — `supabase/migrations/20260612_cms_tables.sql` — schema ground truth
- Codebase — `lib/portal/roles.ts` — role definitions

### Secondary (MEDIUM confidence)
- Installed `@supabase/supabase-js` 2.108.1 — storage API shape
- Next.js 16.2.9 — next/image and remotePatterns behavior

### Tertiary (LOW / ASSUMED)
- Supabase Storage RLS SQL syntax — [ASSUMED] based on training knowledge; verify against dashboard
- Supabase image transform query parameter names — [ASSUMED]; verify against Supabase dashboard docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, versions confirmed
- Architecture: HIGH — mirrors established patterns exactly
- Schema: HIGH — migration SQL read directly
- Supabase Storage API: MEDIUM — installed version confirmed; exact method signatures assumed
- RLS/bucket SQL: LOW — no local Supabase CLI to test; apply via dashboard

**Research date:** 2026-06-17
**Valid until:** 2026-07-17 (stable libraries; Supabase Storage API is stable)
