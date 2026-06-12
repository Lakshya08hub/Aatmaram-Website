// app/(portal)/content/hospital-info/page.tsx
// Server Component — fetches the single hospital_info record and passes to HospitalInfoClient.
// Auth + role guard is enforced by the parent portal layout.

import { getHospitalInfo, HospitalInfo } from '@/lib/db/hospital-info';
import HospitalInfoClient from './HospitalInfoClient';

export default async function HospitalInfoPage() {
  const hospitalInfo: HospitalInfo | null = await getHospitalInfo();

  return <HospitalInfoClient initialData={hospitalInfo} />;
}
