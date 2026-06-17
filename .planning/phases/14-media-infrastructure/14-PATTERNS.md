# Phase 14: Media Infrastructure - Pattern Map

**Mapped:** 2026-06-17
**Files analyzed:** 11 new/modified files
**Analogs found:** 10 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/(portal)/actions/media.ts` | service (Server Action) | request-response | `app/(portal)/actions/content.ts` | exact |
| `supabase/migrations/20260617_media_bucket.sql` | migration | batch | `supabase/migrations/20260612_cms_tables.sql` | role-match |
| `next.config.ts` (modify) | config | — | self (current file) | self-modify |
| `app/(portal)/media/page.tsx` | controller (Server Component) | request-response | `app/(portal)/content/departments/page.tsx` | role-match |
| `app/(portal)/media/MediaClient.tsx` | component (Client Component) | request-response | `app/(portal)/content/departments/DepartmentsClient.tsx` | role-match |
| `app/(portal)/content/departments/DepartmentsClient.tsx` (modify) | component | request-response | self | self-modify |
| `app/(portal)/content/doctors/DoctorsClient.tsx` (modify) | component | request-response | self | self-modify |
| `app/(portal)/content/facilities/FacilitiesClient.tsx` (modify) | component | request-response | self | self-modify |
| `components/public/DoctorCard.tsx` (modify) | component | request-response | self | self-modify |
| `components/public/DepartmentCard.tsx` (modify) | component | request-response | `components/public/DoctorCard.tsx` | exact |
| `components/public/FacilityCard.tsx` (modify) | component | request-response | `components/public/DoctorCard.tsx` | role-match |
| `app/[locale]/(public)/page.tsx` (modify) | controller (Server Component) | request-response | self | self-modify |

---

## Pattern Assignments

### `app/(portal)/actions/media.ts` (service, request-response)

**Analog:** `app/(portal)/actions/content.ts`

**Imports pattern** (lines 1-12 of analog):
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { StaffRole } from '@/lib/portal/roles';
```

**Auth gate pattern** (lines 29-51 of analog — copy `requireCmsRole()` verbatim):
```typescript
const CMS_ROLES: StaffRole[] = ['super_admin', 'admin'];

async function requireCmsRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect('/login'); }
  const { data: profile, error } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (error || !profile || !CMS_ROLES.includes(profile.role as StaffRole)) {
    throw new Error('Forbidden');
  }
  return supabase;
}
```

**Core pattern** — new upload action modelled on `updateDepartmentAction` (lines 79-97 of analog):
```typescript
// Pattern: requireCmsRole() → createAdminClient() → operation → revalidatePath → return {}
export async function uploadImageAction(
  formData: FormData,
  folder: 'doctors' | 'departments' | 'facilities' | 'site',
  entityId: string,
  table: 'doctors' | 'departments' | 'facilities' | 'hospital_info',
  column: 'photo_url' | 'image_url' | 'hero_image_url',
): Promise<{ url?: string; error?: string }> {
  try {
    await requireCmsRole();
    // ... validate file, upload to storage, write URL to DB ...
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
```

**Error handling pattern** (lines 74-76 of analog — identical across all actions):
```typescript
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
```

**Revalidation pattern** — multi-locale revalidation (lines 19-22, 126-129, 215-218, 298-301 of analog):
```typescript
// Always revalidate BOTH locale paths + portal path
revalidatePath('/en/departments');
revalidatePath('/hi/departments');
revalidatePath('/portal/content/departments');
// For hero: revalidatePath('/en'); revalidatePath('/hi');
```

**Admin client for Storage writes** — from `lib/supabase/admin.ts` (lines 11-28):
```typescript
// createAdminClient() uses service role — bypasses RLS for Storage writes
export function createAdminClient() {
  return createClient(url!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

---

### `supabase/migrations/20260617_media_bucket.sql` (migration, batch)

**Analog:** `supabase/migrations/20260612_cms_tables.sql` (structure only — applied via dashboard SQL editor)

**Pattern:** Plain SQL file applied via Supabase dashboard SQL editor. No migration runner CLI. File is documentation and dashboard paste-target, not an auto-applied migration.

---

### `next.config.ts` (config, modify)

**Current state** (entire file, lines 1-12):
```typescript
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname
  }
};

export default withNextIntl(nextConfig);
```

**Modification:** Add `images.remotePatterns` inside the `nextConfig` object:
```typescript
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

**Critical constraint:** This must be done in Wave 0 (before any component uses `next/image` with a Supabase URL) to avoid runtime hostname errors.

---

### `app/(portal)/media/page.tsx` (controller, request-response)

**Analog:** Any existing portal content `page.tsx` (Server Component shell pattern).

**Pattern** — Server Component that fetches data + passes to Client Component:
```typescript
// Copy pattern from app/(portal)/content/departments/page.tsx
import { getHospitalInfo } from '@/lib/db/hospital_info';  // extend to include hero_image_url
import MediaClient from './MediaClient';

export default async function MediaPage() {
  const info = await getHospitalInfo();
  return <MediaClient heroImageUrl={info?.hero_image_url ?? null} hospitalInfoId={info?.id ?? ''} />;
}
```

---

### `app/(portal)/media/MediaClient.tsx` (component, request-response)

**Analog:** `app/(portal)/content/departments/DepartmentsClient.tsx`

**Imports pattern** (lines 1-52 of analog):
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
// Add: import Image from 'next/image';
// Add: import { uploadImageAction } from '@/app/(portal)/actions/media';
```

**File input pattern** — triggered on file selection (not form submit), upload-then-display:
```typescript
// Pattern: file picker → uploadImageAction on onChange → toast result → router.refresh()
const [uploading, setUploading] = useState(false);

async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  setUploading(true);
  try {
    const fd = new FormData();
    fd.append('image', file);
    const result = await uploadImageAction(fd, 'site', hospitalInfoId, 'hospital_info', 'hero_image_url');
    if (result.url) {
      toast.success('Hero image uploaded');
      router.refresh();
    } else {
      toast.error(result.error ?? 'Upload failed');
    }
  } catch {
    toast.error('Upload failed');
  } finally {
    setUploading(false);
  }
}
```

**Loading state pattern** (lines 374-382 of DepartmentsClient.tsx — Loader2 spinner):
```typescript
{uploading ? (
  <>
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    Uploading…
  </>
) : (
  'Upload Image'
)}
```

**EmptyState pattern** (lines 204-210 of analog):
```typescript
<EmptyState
  icon={ImageIcon}
  title="No hero image set"
  description="Upload an image to display as the homepage hero background."
  action={<label htmlFor="hero-upload"><Button asChild>Choose Image</Button></label>}
/>
```

---

### `DepartmentsClient.tsx`, `DoctorsClient.tsx`, `FacilitiesClient.tsx` (modify — replace URL text field)

**Analog:** Self (existing files). The modification replaces the `<Input ... {...register('image_url')} />` text field with a file input that calls `uploadImageAction` on selection.

**Current image_url field pattern in DepartmentsClient.tsx** (lines 351-363):
```typescript
<div className="space-y-1">
  <label htmlFor="dept-image-url" className="text-sm font-medium text-slate-700">
    Image URL <span className="text-slate-400 font-normal">(optional)</span>
  </label>
  <Input
    id="dept-image-url"
    placeholder="https://example.com/image.jpg"
    {...register('image_url')}
  />
  {errors.image_url && (
    <p className="text-xs text-red-500">{errors.image_url.message}</p>
  )}
</div>
```

**Replace with this upload-control pattern:**
```typescript
// 1. Add uploading state near other state declarations (line ~95 area)
const [uploadingImage, setUploadingImage] = useState(false);

// 2. Replace the image_url <Input> field with:
<div className="space-y-1">
  <label className="text-sm font-medium text-slate-700">
    Image <span className="text-slate-400 font-normal">(optional)</span>
  </label>
  {/* Show current image preview if URL set */}
  {watch('image_url') && (
    <div className="relative w-20 h-20 rounded overflow-hidden border border-slate-200">
      <Image src={watch('image_url')!} alt="Preview" fill className="object-cover" />
    </div>
  )}
  <input
    type="file"
    accept="image/jpeg,image/png,image/webp"
    className="block text-sm text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
    disabled={uploadingImage || !editingDepartment}  // upload only on edit (entityId required)
    onChange={async (e) => {
      const file = e.target.files?.[0];
      if (!file || !editingDepartment) return;
      setUploadingImage(true);
      try {
        const fd = new FormData();
        fd.append('image', file);
        const result = await uploadImageAction(fd, 'departments', editingDepartment.id, 'departments', 'image_url');
        if (result.url) {
          setValue('image_url', result.url);
          toast.success('Image uploaded');
          router.refresh();
        } else {
          toast.error(result.error ?? 'Upload failed');
        }
      } catch {
        toast.error('Upload failed');
      } finally {
        setUploadingImage(false);
      }
    }}
  />
  {!editingDepartment && (
    <p className="text-xs text-slate-400">Save the department first, then upload an image.</p>
  )}
  {uploadingImage && <p className="text-xs text-slate-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</p>}
</div>
```

**Key constraint from RESEARCH.md Pitfall 6:** Upload-on-select only works for EDIT (entityId exists). For CREATE, show a note: "Save first, then upload an image." The `image_url` value flows into the existing create/update action as a plain string — no re-architecture needed.

**Zod schema change:** Remove the `.url()` validator from `image_url` since it's now set programmatically, not typed by user:
```typescript
// Before (line 64 of DepartmentsClient.tsx):
image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
// After:
image_url: z.string().optional(),
```

---

### `components/public/DoctorCard.tsx` (modify — add optional photo)

**Current pattern** (lines 14-43 — initials-only avatar):
```typescript
export function DoctorCard({ name, initials, specialty, bookLabel }: DoctorCardProps) {
  return (
    <Card ...>
      <CardContent ...>
        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center" ...>
          <span className="text-blue-800 font-semibold text-xl">{initials}</span>
        </div>
```

**Replace avatar div with conditional photo/initials pattern:**
```typescript
// Add to imports:
import Image from 'next/image';

// Add to interface:
interface DoctorCardProps {
  name: string;
  initials: string;
  specialty: string;
  bookLabel: string;
  photoUrl?: string | null;  // NEW
}

// Replace avatar div:
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
  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center"
       aria-label={'Doctor avatar for ' + name}>
    <span className="text-blue-800 font-semibold text-xl">{initials}</span>
  </div>
)}
```

**Critical:** Never pass `null` or `''` to `next/image` src — only render `<Image>` when `photoUrl` is a non-empty string.

---

### `components/public/DepartmentCard.tsx` and `FacilityCard.tsx` (modify — add optional image)

**Analog:** `components/public/DoctorCard.tsx` (same card pattern, same fallback principle)

**Pattern:** Same conditional `next/image` vs icon fallback:
```typescript
import Image from 'next/image';

// Props addition:
imageUrl?: string | null;

// In JSX — replace icon fallback div with conditional:
{imageUrl ? (
  <div className="relative w-full h-40 rounded-t-xl overflow-hidden">
    <Image
      src={imageUrl}
      alt={name}
      fill
      sizes="(max-width: 768px) 100vw, 33vw"
      className="object-cover"
    />
  </div>
) : (
  // existing icon/fallback UI preserved exactly
)}
```

---

### `app/[locale]/(public)/page.tsx` (modify — hero image + pass photo/image props)

**Current hero section** (lines 47-77 — plain white section):
```typescript
{/* Section 1 — Hero */}
<section className="bg-white py-16 md:py-24 px-4">
  <div className="max-w-4xl mx-auto text-center">
    ...existing hero content...
  </div>
</section>
```

**Modification — conditional hero background:**
```typescript
// 1. Add import:
import Image from 'next/image';
import { getHospitalInfo } from '@/lib/db/hospital_info';

// 2. Add to data fetches in Promise.all or separate:
const info = await getHospitalInfo();
const heroImageUrl = info?.hero_image_url ?? null;

// 3. Replace hero section:
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
    <div className="absolute inset-0 bg-white/70 -z-10" />
    <div className="max-w-4xl mx-auto text-center relative">
      {/* existing hero content unchanged */}
    </div>
  </section>
) : (
  <section className="bg-white py-16 md:py-24 px-4">
    {/* existing hero content unchanged */}
  </section>
)}

// 4. Pass photo/image props to cards:
<DoctorCard ... photoUrl={doctor.photo_url} />
<DepartmentCard ... imageUrl={dept.image_url} />
<FacilityCard ... imageUrl={facility.image_url} />
```

---

## Shared Patterns

### Auth Gate (applies to `media.ts`)
**Source:** `app/(portal)/actions/content.ts` lines 13-51
**Apply to:** `app/(portal)/actions/media.ts` — copy `requireCmsRole()` verbatim; it already checks `super_admin`/`admin` via `profiles` table.

### Error Return Shape (applies to all new actions)
**Source:** `app/(portal)/actions/content.ts` lines 74-76
**Apply to:** All exports in `media.ts`
```typescript
} catch (err) {
  return { error: err instanceof Error ? err.message : 'Unknown error' };
}
```

### Toast Feedback (applies to all modified Client Components)
**Source:** `app/(portal)/content/departments/DepartmentsClient.tsx` lines 151-158
**Apply to:** All upload `onChange` handlers in CRUD clients and `MediaClient.tsx`
```typescript
if (result.error) {
  toast.error('...');
} else {
  toast.success('...');
  router.refresh();
}
```

### Loader2 Spinner (applies to upload buttons/labels)
**Source:** `app/(portal)/content/departments/DepartmentsClient.tsx` lines 374-382
**Apply to:** Any upload-in-progress UI state
```typescript
{uploading ? (
  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</>
) : 'Upload Image'}
```

### Multi-locale Revalidation (applies to `media.ts`)
**Source:** `app/(portal)/actions/content.ts` — `revalidateDepartments()`, `revalidateDoctors()`, `revalidateFacilities()`, `revalidateHomepages()`
**Apply to:** `uploadImageAction` and `deleteImageAction` in `media.ts`
```typescript
// Entity images:
revalidatePath('/en/' + publicRoute);
revalidatePath('/hi/' + publicRoute);
revalidatePath('/portal/content/' + table);
// Hero image:
revalidatePath('/en');
revalidatePath('/hi');
```

### Admin Client for Storage (applies to `media.ts`)
**Source:** `lib/supabase/admin.ts` lines 11-28
**Apply to:** All Storage operations in `media.ts` — `createAdminClient().storage.from('media').upload(...)`

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `supabase/migrations/20260617_media_bucket.sql` | migration | batch | Storage bucket + RLS SQL has no prior analog — project has no existing Storage setup. Use RESEARCH.md migration SQL example directly. |

---

## Critical Implementation Notes for Planner

1. **Wave 0 blocker:** `next.config.ts` `images.remotePatterns` MUST be added before any component uses `next/image` with the Supabase URL. Do this first.

2. **Upload timing (Pitfall 6):** Upload-on-file-select only works for EDIT flow (entityId known). For CREATE, disable the file input and show "Save first, then upload." No architecture change needed to the create action.

3. **Null guard:** Never pass `null`/`''` to `next/image` `src`. Conditional render: `{photoUrl ? <Image src={photoUrl} ... /> : <fallback />}`.

4. **Facilities `image_url` column (Open Question A5):** The CMS migration may not have added `image_url` to `facilities`. Planner must check `supabase/migrations/20260612_cms_tables.sql` and add `ALTER TABLE facilities ADD COLUMN IF NOT EXISTS image_url text;` to the Phase 14 migration if absent.

5. **Orphan cleanup:** When any entity delete action runs, extract the file path from the stored URL and call `admin.storage.from('media').remove([path])` before or after the DB delete. Acceptable to defer as a post-MVP note but should be in the plan.

6. **`hero_image_url` column:** Add to `hospital_info` table via migration. Also update `updateHospitalInfoAction` in `content.ts` to include `hero_image_url` in its `Partial<{...}>` input type so the column can be cleared if needed.

---

## Metadata

**Analog search scope:** `app/(portal)/actions/`, `app/(portal)/content/`, `components/public/`, `lib/supabase/`, `next.config.ts`
**Files read:** 9
**Pattern extraction date:** 2026-06-17
