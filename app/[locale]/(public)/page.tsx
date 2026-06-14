import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { BedDouble, Users, Stethoscope, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PMJAYBadge } from '@/components/public/PMJAYBadge';
import { DepartmentCard } from '@/components/public/DepartmentCard';
import { DoctorCard } from '@/components/public/DoctorCard';
import { FacilityCard } from '@/components/public/FacilityCard';
import { SectionHeading } from '@/components/public/SectionHeading';
import { getFeaturedDepartments } from '@/lib/db/departments';
import { getFeaturedDoctors } from '@/lib/db/doctors';
import { getFeaturedFacilities } from '@/lib/db/facilities';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Atmaram Child Care and Critical Care — Kanpur',
  description:
    'A 90-bed super-specialty hospital in Kanpur offering paediatrics, critical care, surgery and more. Ayushman Bharat PM-JAY empanelled.',
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [departments, doctors, facilities] = await Promise.all([
    getFeaturedDepartments(),
    getFeaturedDoctors(),
    getFeaturedFacilities(),
  ]);

  const t = await getTranslations('home');
  const tCommon = await getTranslations('common');
  const tDept = await getTranslations('departments');
  const tDoc = await getTranslations('doctors');

  return (
    <main>
      {/* Section 1 — Hero */}
      <section className="bg-white py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
            {t('hero.headline')}
          </h1>
          <p className="text-lg text-slate-500 mt-4">
            {t('hero.tagline')}
          </p>
          <div className="mt-6 flex justify-center">
            <PMJAYBadge />
          </div>
          <div className="mt-8">
            <Link href="/appointment">
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white font-semibold min-h-[44px]"
              >
                {t('hero.cta')}
              </Button>
            </Link>
          </div>
          <div className="mt-4">
            <Link
              href="/services"
              className="text-blue-800 underline text-sm"
            >
              {t('hero.secondaryLink')}
            </Link>
          </div>
        </div>
      </section>

      {/* Section 2 — Trust Signals Band */}
      <section className="bg-blue-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <BedDouble className="w-6 h-6 text-white" />
              <span className="text-xl font-semibold text-white">90</span>
              <span className="text-sm text-white/70">{t('stats.bedsLabel')}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Users className="w-6 h-6 text-white" />
              <span className="text-xl font-semibold text-white">25+</span>
              <span className="text-sm text-white/70">{t('stats.doctorsLabel')}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Stethoscope className="w-6 h-6 text-white" />
              <span className="text-xl font-semibold text-white">8</span>
              <span className="text-sm text-white/70">{t('stats.specialtiesLabel')}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Clock className="w-6 h-6 text-white" />
              <span className="text-xl font-semibold text-white">24x7</span>
              <span className="text-sm text-white/70">{t('stats.emergencyLabel')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 — Departments Preview */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            title={t('sections.departments')}
            subtitle={tDept('pageSubtitle')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {departments.map((dept) => (
              <DepartmentCard
                key={dept.id}
                name={dept.name}
                description={dept.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Doctors Preview */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            title={t('sections.doctors')}
            subtitle={tDoc('pageSubtitle')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
            {doctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                name={doctor.full_name}
                initials={doctor.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                specialty={doctor.specialization}
                bookLabel={tDoc('bookAppointment')}
              />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/doctors" className="text-blue-800 underline text-sm">
              {tCommon('meetAllDoctors')} &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Section 5 — Facilities Preview */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* TODO: use t('facilities.heading') once translation key is added to messages files */}
          <SectionHeading
            title="Our Facilities"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {facilities.map((facility) => (
              <FacilityCard
                key={facility.id}
                name={facility.name}
                description={facility.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Section 6 — Appointment CTA Band */}
      <section className="bg-blue-50 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl font-semibold text-slate-900">
            {t('sections.appointmentCta')}
          </h2>
          <p className="text-slate-500 mt-2 text-base">
            {t('sections.appointmentCtaDesc')}
          </p>
          <div className="mt-8">
            <Link href="/appointment">
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white font-semibold min-h-[44px]"
              >
                {t('hero.cta')}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
