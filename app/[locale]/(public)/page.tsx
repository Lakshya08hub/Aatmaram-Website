import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BedDouble, Users, Stethoscope, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PMJAYBadge } from '@/components/public/PMJAYBadge';
import { DepartmentCard } from '@/components/public/DepartmentCard';
import { DoctorCard } from '@/components/public/DoctorCard';
import { SectionHeading } from '@/components/public/SectionHeading';
import { departments } from '@/lib/data/departments';
import { doctors } from '@/lib/data/doctors';
import { routing } from '@/i18n/routing';

export const metadata: Metadata = {
  title: 'Atmaram Child Care and Critical Care — Kanpur',
  description:
    'A 90-bed super-specialty hospital in Kanpur offering paediatrics, critical care, surgery and more. Ayushman Bharat PM-JAY empanelled.',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main>
      {/* Section 1 — Hero */}
      <section className="bg-white py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900">
            Quality Care for Every Child and Family
          </h1>
          <p className="text-lg text-slate-500 mt-4">
            Kanpur&apos;s trusted super-specialty hospital
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
                Request an Appointment
              </Button>
            </Link>
          </div>
          <div className="mt-4">
            <Link
              href="/services"
              className="text-blue-800 underline text-sm"
            >
              Learn about our services &rarr;
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
              <span className="text-sm text-white/70">Beds</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Users className="w-6 h-6 text-white" />
              <span className="text-xl font-semibold text-white">25+</span>
              <span className="text-sm text-white/70">Doctors</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Stethoscope className="w-6 h-6 text-white" />
              <span className="text-xl font-semibold text-white">8</span>
              <span className="text-sm text-white/70">Specialties</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Clock className="w-6 h-6 text-white" />
              <span className="text-xl font-semibold text-white">24x7</span>
              <span className="text-sm text-white/70">Emergency</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 — Departments Preview */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            title="Our Departments"
            subtitle="Expert care across 8 medical specialties"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {departments.map((dept) => (
              <DepartmentCard key={dept.id} department={dept} />
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Doctors Preview */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            title="Our Doctors"
            subtitle="Our team of specialists is here to help."
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
            {doctors.slice(0, 3).map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/doctors" className="text-blue-800 underline text-sm">
              Meet All Doctors &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Section 5 — Appointment CTA Band */}
      <section className="bg-blue-50 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-xl font-semibold text-slate-900">
            Ready to visit us?
          </h2>
          <p className="text-slate-500 mt-2 text-base">
            Our team is here to help. Request an appointment today.
          </p>
          <div className="mt-8">
            <Link href="/appointment">
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white font-semibold min-h-[44px]"
              >
                Request an Appointment
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
