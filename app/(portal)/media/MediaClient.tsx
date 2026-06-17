'use client';
// app/(portal)/media/MediaClient.tsx
// Client Component — hero image upload, preview, and remove for the portal Media section.
// T-14-10 mitigation: requireCmsRole() enforced inside uploadImageAction / deleteImageAction.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { Loader2, ImagePlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  uploadImageAction,
  deleteImageAction,
} from '@/app/(portal)/actions/media';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  heroImageUrl: string | null;
  hospitalInfoId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MediaClient({ heroImageUrl, hospitalInfoId }: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // -------------------------------------------------------------------------
  // Upload handler
  // -------------------------------------------------------------------------

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation — mirrors server-side checks for fast UX feedback
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File exceeds 5 MB. Choose a smaller image.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG, or WebP files are allowed.');
      return;
    }

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
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected after an error
      e.target.value = '';
    }
  }

  // -------------------------------------------------------------------------
  // Remove handler
  // -------------------------------------------------------------------------

  async function handleRemove() {
    if (!heroImageUrl) return;

    setUploading(true);
    try {
      const result = await deleteImageAction(
        hospitalInfoId,
        'hospital_info',
        'hero_image_url',
        heroImageUrl
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Hero image removed');
        setConfirmRemove(false);
        router.refresh();
      }
    } finally {
      setUploading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Site Images</h1>

      {/* Hero image card */}
      <div className="border rounded-lg p-4">
        <p className="font-medium mb-3">Homepage Hero Background</p>

        {/* Preview or empty state */}
        {heroImageUrl ? (
          <div className="relative w-full aspect-video rounded overflow-hidden mb-3">
            <Image
              src={heroImageUrl}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <EmptyState
            icon={ImagePlus}
            title="No hero image set"
            description="Upload an image to display as the homepage background. Without one, the default navy background is shown."
          />
        )}

        {/* Upload control */}
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium">
            {heroImageUrl ? 'Replace Image' : 'Upload Image'}
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={handleFileChange}
            className="block text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">JPG, PNG or WebP — max 5 MB</p>
        </div>

        {/* Uploading indicator */}
        {uploading && (
          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Uploading…</span>
          </div>
        )}

        {/* Remove button with inline confirmation */}
        {heroImageUrl && !uploading && (
          <div className="mt-4">
            {!confirmRemove ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmRemove(true)}
              >
                Remove
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-destructive">
                  The image will be deleted. This cannot be undone.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemove}
                  >
                    Remove
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmRemove(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
