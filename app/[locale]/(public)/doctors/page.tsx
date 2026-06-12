import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { DoctorCard } from '@/components/public/DoctorCard';
import { SectionHeading } from '@/components/public/SectionHeading';
import { getActiveDoctors } from '@/lib/db/doctors';
import type { Doctor } from '@/lib/db/doctors';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Our Doctors | Atmaram Child Care and Critical Care',
  description:
    'Meet our team of specialist doctors at Atmaram Child Care and Critical Care, Kanpur.',
};

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export default async function DoctorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('doctors');
  const tNav = await getTranslations('nav');

  let doctors: Doctor[] = [];
  try {
    doctors = await getActiveDoctors();
  } catch (err) {
    console.error('[DoctorsPage] fetch failed:', err);
  }

  return (
    <main>
      {/* Page Header */}
      <section className="py-12 bg-white px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-slate-500 mb-2">{tNav('home')} › {t('pageTitle')}</p>
          <h1 className="text-xl font-semibold text-slate-900">{t('pageTitle')}</h1>
        </div>
      </section>

      {/* Doctors Grid */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            title={t('pageTitle')}
            subtitle={t('pageSubtitle')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {doctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                name={doctor.full_name}
                initials={getInitials(doctor.full_name)}
                specialty={doctor.specialization}
                bookLabel={t('bookAppointment')}
              />
            ))}
          </div>

          {/* CTA row */}
          <div className="mt-10 text-center">
            <Link href="/contact" className="text-blue-800 underline text-sm">
              {t('cta')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
