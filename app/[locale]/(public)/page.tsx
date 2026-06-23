import Image from 'next/image';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { BedDouble, Users, Stethoscope, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PMJAYBadge } from '@/components/public/PMJAYBadge';
import { PMJAYExplainer } from '@/components/public/PMJAYExplainer';
import { DepartmentCard } from '@/components/public/DepartmentCard';
import { DoctorCard } from '@/components/public/DoctorCard';
import { FacilityCard } from '@/components/public/FacilityCard';
import { SectionHeading } from '@/components/public/SectionHeading';
import { FadeIn } from '@/components/motion/fade-in';
import { HoverLift } from '@/components/motion/hover-lift';
import { CountUp } from '@/components/motion/count-up';
import { Card, CardContent } from '@/components/ui/card';
import { getFeaturedDepartments } from '@/lib/db/departments';
import { getFeaturedDoctors } from '@/lib/db/doctors';
import { getFeaturedFacilities } from '@/lib/db/facilities';
import { getHospitalInfo } from '@/lib/db/hospital-info';
import { getActiveTestimonials } from '@/lib/db/testimonials';
import { localize } from '@/lib/db/i18n';

export const dynamic = 'force-dynamic';

async function safeFetch<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site' });
  return {
    title: `${t('title')} — Kanpur`,
    description:
      locale === 'hi'
        ? '90-बेड सुपर-स्पेशलिटी अस्पताल, Kanpur। बाल रोग, गहन चिकित्सा, शल्य चिकित्सा। Ayushman Bharat PM-JAY सूचीबद्ध।'
        : 'A 90-bed super-specialty hospital in Kanpur offering paediatrics, critical care, surgery and more. Ayushman Bharat PM-JAY empanelled.',
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [departments, doctors, facilities, info, testimonials] = await Promise.all([
    safeFetch(getFeaturedDepartments, []),
    safeFetch(getFeaturedDoctors, []),
    safeFetch(getFeaturedFacilities, []),
    safeFetch(getHospitalInfo, null),
    safeFetch(getActiveTestimonials, []),
  ]);

  const heroImageUrl = info?.hero_image_url ?? null;

  const t = await getTranslations('home');
  const tCommon = await getTranslations('common');
  const tDept = await getTranslations('departments');
  const tDoc = await getTranslations('doctors');
  const tPmjay = await getTranslations('pmjay');
  const tTestimonials = await getTranslations('testimonials');

  const heroSectionClass =
    heroImageUrl && heroImageUrl.length > 0
      ? 'relative py-16 md:py-24 px-4 overflow-hidden'
      : 'bg-white py-16 md:py-24 px-4';

  return (
    <main>
      {/* Section 1 — Hero */}
      <section className={heroSectionClass}>
        {heroImageUrl && heroImageUrl.length > 0 && (
          <>
            <Image src={heroImageUrl} alt="" fill sizes="100vw" className="object-cover object-center -z-10" priority />
            <div className="absolute inset-0 bg-white/70 -z-10" />
          </>
        )}
        <div className="relative max-w-4xl mx-auto text-center">
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
          <FadeIn className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <BedDouble className="w-6 h-6 text-white" />
              <CountUp value={90} className="text-xl font-semibold text-white" />
              <span className="text-sm text-white/70">{t('stats.bedsLabel')}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Users className="w-6 h-6 text-white" />
              <CountUp value={25} suffix="+" className="text-xl font-semibold text-white" />
              <span className="text-sm text-white/70">{t('stats.doctorsLabel')}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Stethoscope className="w-6 h-6 text-white" />
              <CountUp value={8} className="text-xl font-semibold text-white" />
              <span className="text-sm text-white/70">{t('stats.specialtiesLabel')}</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Clock className="w-6 h-6 text-white" />
              <span className="text-xl font-semibold text-white">24x7</span>
              <span className="text-sm text-white/70">{t('stats.emergencyLabel')}</span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Section 2.5 — PM-JAY Explainer */}
      <FadeIn>
        <PMJAYExplainer
          heading={tPmjay('heading')}
          fact1Heading={tPmjay('fact1Heading')}
          fact1Body={tPmjay('fact1Body')}
          fact2Heading={tPmjay('fact2Heading')}
          fact2Body={tPmjay('fact2Body')}
          fact3Heading={tPmjay('fact3Heading')}
          fact3Body={tPmjay('fact3Body')}
          cta={tPmjay('cta')}
        />
      </FadeIn>

      {/* Section 3 — Departments Preview */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            title={t('sections.departments')}
            subtitle={tDept('pageSubtitle')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {departments.map((dept) => (
              <DepartmentCard
                key={dept.id}
                name={localize(dept.name, dept.name_hi, locale)}
                description={localize(dept.description, dept.description_hi, locale)}
                imageUrl={dept.image_url}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Doctors Preview */}
      <section className="py-16 md:py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            title={t('sections.doctors')}
            subtitle={tDoc('pageSubtitle')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
            {doctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                name={localize(doctor.full_name, doctor.full_name_hi, locale)}
                initials={(doctor.full_name ?? '').trim().split(/\s+/).filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                specialty={localize(doctor.specialization, doctor.specialization_hi, locale)}
                bookLabel={tDoc('bookAppointment')}
                photoUrl={doctor.photo_url}
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
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            title={t('sections.facilities')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {facilities.map((facility) => (
              <FacilityCard
                key={facility.id}
                name={localize(facility.name, facility.name_hi, locale)}
                description={localize(facility.description, facility.description_hi, locale)}
                imageUrl={facility.image_url}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Section 5.5 — Testimonials Strip */}
      {testimonials.length > 0 && (
        <section className="py-16 md:py-24 px-4 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <SectionHeading
              title={tTestimonials('heading')}
              subtitle={tTestimonials('subtitle')}
            />
            <FadeIn>
              <div className="mt-8 flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:overflow-visible">
                {testimonials.map((testimonial) => (
                  <HoverLift key={testimonial.id} className="min-w-[280px] md:min-w-0">
                    <Card className="h-full">
                      <CardContent className="p-6">
                        <p className="text-slate-700 italic">
                          &ldquo;{localize(testimonial.quote, testimonial.quote_hi, locale)}&rdquo;
                        </p>
                        <div className="mt-4">
                          <p className="font-semibold text-slate-900 text-sm">
                            {localize(testimonial.patient_name, testimonial.patient_name_hi, locale)}
                          </p>
                          {testimonial.designation && (
                            <p className="text-slate-500 text-xs mt-0.5">
                              {localize(testimonial.designation, testimonial.designation_hi, locale)}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </HoverLift>
                ))}
              </div>
            </FadeIn>
          </div>
        </section>
      )}

      {/* Section 6 — Appointment CTA Band */}
      <section className="bg-blue-50 py-16 md:py-24 px-4">
        <FadeIn>
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
        </FadeIn>
      </section>
    </main>
  );
}
