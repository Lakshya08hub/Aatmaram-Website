// app/(portal)/media/page.tsx
// Server Component — fetches hospital_info and passes hero_image_url to MediaClient.

import type { Metadata } from 'next';
import { getHospitalInfo } from '@/lib/db/hospital-info';
import MediaClient from './MediaClient';

export const metadata: Metadata = {
  title: 'Media | Atmaram Portal',
};

export default async function MediaPage() {
  const info = await getHospitalInfo();

  // CR-004: Guard against null info to prevent orphaned Storage uploads
  // that have no DB record to attach to.
  if (!info) {
    return (
      <div className="p-8">
        <p className="text-sm text-destructive">
          Hospital information not configured. Please set up hospital info first.
        </p>
      </div>
    );
  }

  return (
    <MediaClient
      heroImageUrl={info.hero_image_url}
      hospitalInfoId={info.id}
    />
  );
}
