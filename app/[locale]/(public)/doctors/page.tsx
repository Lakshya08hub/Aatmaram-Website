import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { DoctorCard } from '@/components/public/DoctorCard';
import { SectionHeading } from '@/components/public/SectionHeading';
import { doctors } from '@/lib/data/doctors';

export const metadata: Metadata = {
  title: 'Our Doctors | Atmaram Child Care and Critical Care',
  description:
    'Meet our team of 25+ specialist doctors at Atmaram Child Care and Critical Care, Kanpur.',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function DoctorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('doctors');
  const tDept = await getTranslations('departments');
  const tNav = await getTranslations('nav');

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
            {doctors.map((doc) => (
              <DoctorCard
                key={doc.id}
                name={doc.name}
                initials={doc.initials}
                specialty={tDept(`${doc.specialtyKey}.name`)}
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
