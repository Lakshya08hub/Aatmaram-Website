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

  return (
    <MediaClient
      heroImageUrl={info?.hero_image_url ?? null}
      hospitalInfoId={info?.id ?? ''}
    />
  );
}
