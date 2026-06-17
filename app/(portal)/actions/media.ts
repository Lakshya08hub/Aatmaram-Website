'use server';
// app/(portal)/actions/media.ts
// Server Actions for Media Management (image upload / delete via Supabase Storage).
// T-14-04 mitigation: requireCmsRole() is the first call in both actions.
// T-14-05 mitigation: MIME allowlist (jpeg/png/webp only) checked before upload; path is server-controlled.
// T-14-06 mitigation: 5 MB max enforced before arrayBuffer() conversion.
// T-14-07 mitigation: Path is `{typed-folder}/{entityId}-{timestamp}.ext` — no user-controlled substring.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { StaffRole } from '@/lib/portal/roles';

const CMS_ROLES: StaffRole[] = ['super_admin', 'admin'];

/**
 * Verifies the current session has a CMS-capable role before any write.
 * Redirects to /login if no valid session; throws Error('Forbidden') if role is insufficient.
 * Copied verbatim from content.ts to maintain consistent auth behaviour across action modules.
 */
async function requireCmsRole() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (error || !profile || !CMS_ROLES.includes(profile.role as StaffRole)) {
    throw new Error('Forbidden');
  }

  return supabase;
}

// ---------------------------------------------------------------------------
// Revalidation helpers — keep route sets co-located with their entity type
// ---------------------------------------------------------------------------

function revalidateByFolder(folder: 'doctors' | 'departments' | 'facilities' | 'site'): void {
  switch (folder) {
    case 'doctors':
      revalidatePath('/en/doctors');
      revalidatePath('/hi/doctors');
      revalidatePath('/portal/content/doctors');
      break;
    case 'departments':
      revalidatePath('/en/departments');
      revalidatePath('/hi/departments');
      revalidatePath('/portal/content/departments');
      break;
    case 'facilities':
      revalidatePath('/en/facilities');
      revalidatePath('/hi/facilities');
      revalidatePath('/portal/content/facilities');
      break;
    case 'site':
      revalidatePath('/en');
      revalidatePath('/hi');
      break;
  }
}

function revalidateByTable(
  table: 'doctors' | 'departments' | 'facilities' | 'hospital_info'
): void {
  switch (table) {
    case 'doctors':
      revalidatePath('/en/doctors');
      revalidatePath('/hi/doctors');
      revalidatePath('/portal/content/doctors');
      break;
    case 'departments':
      revalidatePath('/en/departments');
      revalidatePath('/hi/departments');
      revalidatePath('/portal/content/departments');
      break;
    case 'facilities':
      revalidatePath('/en/facilities');
      revalidatePath('/hi/facilities');
      revalidatePath('/portal/content/facilities');
      break;
    case 'hospital_info':
      revalidatePath('/en');
      revalidatePath('/hi');
      break;
  }
}

// ---------------------------------------------------------------------------
// uploadImageAction
// ---------------------------------------------------------------------------

/**
 * Validates, uploads an image to Supabase Storage bucket 'media', and writes
 * the public URL to the specified DB column.
 *
 * @param formData  - Must contain a File under the key 'image'.
 * @param folder    - Sub-folder inside 'media' bucket (determines revalidation routes).
 * @param entityId  - UUID of the entity being updated; used in the Storage path.
 * @param table     - Postgres table to update.
 * @param column    - URL column to set on the row.
 * @returns { url } on success or { error } on failure.
 */
export async function uploadImageAction(
  formData: FormData,
  folder: 'doctors' | 'departments' | 'facilities' | 'site',
  entityId: string,
  table: 'doctors' | 'departments' | 'facilities' | 'hospital_info',
  column: 'photo_url' | 'image_url' | 'hero_image_url'
): Promise<{ url?: string; error?: string }> {
  try {
    // T-14-04: Auth gate is always first.
    await requireCmsRole();

    // Step 1 — extract file from FormData
    const file = formData.get('image') as File | null;
    if (!file || file.size === 0) {
      return { error: 'No file selected' };
    }

    // Step 2 — MIME allowlist (T-14-05)
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { error: 'Only JPG, PNG, or WebP files are allowed.' };
    }

    // Step 3 — size cap (T-14-06): checked BEFORE arrayBuffer() to avoid OOM
    if (file.size > 5 * 1024 * 1024) {
      return { error: 'File exceeds 5 MB. Choose a smaller image.' };
    }

    // Step 4 — build server-controlled Storage path (T-14-07)
    const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
    const path = `${folder}/${entityId}-${Date.now()}.${ext}`;

    // Step 5 — convert to bytes
    const bytes = await file.arrayBuffer();

    // Step 6 — upload to Storage using service-role admin client (bypasses RLS)
    const admin = createAdminClient();
    const { error: uploadErr } = await admin.storage
      .from('media')
      .upload(path, bytes, { contentType: file.type, upsert: true });
    if (uploadErr) throw new Error(uploadErr.message);

    // Step 7 — derive public URL (no signed URL needed; bucket is public per 14-01)
    const {
      data: { publicUrl },
    } = admin.storage.from('media').getPublicUrl(path);

    // Step 8 — persist URL to the correct DB column
    const { error: dbErr } = await admin
      .from(table)
      .update({ [column]: publicUrl })
      .eq('id', entityId);
    if (dbErr) throw new Error(dbErr.message);

    // Step 9 — revalidate affected public + portal routes
    revalidateByFolder(folder);

    return { url: publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ---------------------------------------------------------------------------
// deleteImageAction
// ---------------------------------------------------------------------------

/**
 * Removes an image from Supabase Storage bucket 'media' and clears the
 * DB column.  If the stored URL is an external/legacy URL (not from our
 * Storage bucket), the Storage delete step is skipped and only the DB
 * column is cleared.
 *
 * @param entityId  - UUID of the entity being updated.
 * @param table     - Postgres table to update.
 * @param column    - URL column to clear (set to null).
 * @param storedUrl - Current value of the URL column (used to derive the Storage path).
 * @returns {} on success or { error } on failure.
 */
export async function deleteImageAction(
  entityId: string,
  table: 'doctors' | 'departments' | 'facilities' | 'hospital_info',
  column: 'photo_url' | 'image_url' | 'hero_image_url',
  storedUrl: string
): Promise<{ error?: string }> {
  try {
    // T-14-04: Auth gate is always first.
    await requireCmsRole();

    const admin = createAdminClient();

    // Step 1 — extract the Storage object path from the public URL
    // Public URLs follow the pattern: .../object/public/media/{path}
    let storagePath: string | null = null;
    try {
      const urlObj = new URL(storedUrl);
      const marker = '/object/public/media/';
      const idx = urlObj.pathname.indexOf(marker);
      if (idx !== -1) {
        storagePath = urlObj.pathname.slice(idx + marker.length);
      }
    } catch {
      // If the URL is malformed, skip Storage delete gracefully.
    }

    // Step 2 — remove from Storage only when path could be resolved
    if (storagePath) {
      const { error: storageErr } = await admin.storage.from('media').remove([storagePath]);
      if (storageErr) throw new Error(storageErr.message);
    }

    // Step 3 — clear DB column
    const { error: dbErr } = await admin
      .from(table)
      .update({ [column]: null })
      .eq('id', entityId);
    if (dbErr) throw new Error(dbErr.message);

    // Step 4 — revalidate affected public + portal routes
    revalidateByTable(table);

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
