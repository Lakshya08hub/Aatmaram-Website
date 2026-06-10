import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { HeartPulse, Shield, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SectionHeading } from '@/components/public/SectionHeading';
import { routing } from '@/i18n/routing';

export const metadata: Metadata = {
  title: 'About Us | Atmaram Child Care and Critical Care',
  description:
    'Learn about Atmaram Child Care and Critical Care — Kanpur’s trusted super-specialty hospital with 90 beds and 25+ doctors.',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main>
      {/* Section 1 — Page Header */}
      <section className="py-12 bg-white px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-slate-500 mb-2">Home &rsaquo; About Us</p>
          <h1 className="text-xl font-semibold text-slate-900">About Us</h1>
        </div>
      </section>

      {/* Section 2 — Hospital Story (2-column) */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            {/* Left column — story text */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Caring for Kanpur Since Day One
              </h2>
              <div className="mt-2 w-12 h-1 bg-blue-800 rounded-full" />
              <p className="text-base text-slate-600 mt-6 leading-relaxed">
                Atmaram Child Care and Critical Care is a 90-bed super-specialty
                hospital in Kanpur, Uttar Pradesh. Empanelled under Ayushman
                Bharat PM-JAY, we provide accessible, high-quality care to every
                patient who walks through our doors.
              </p>
            </div>

            {/* Right column — stat cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <span className="text-2xl font-bold text-blue-800">90</span>
                  <p className="text-sm text-slate-500 mt-1">Beds</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <span className="text-2xl font-bold text-blue-800">25+</span>
                  <p className="text-sm text-slate-500 mt-1">Doctors</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <span className="text-2xl font-bold text-blue-800">8</span>
                  <p className="text-sm text-slate-500 mt-1">Specialties</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <span className="text-2xl font-bold text-blue-800">10+</span>
                  <p className="text-sm text-slate-500 mt-1">Years of Service</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 — Mission & Values */}
      <section className="py-12 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <SectionHeading title="Our Mission" />
          <p className="text-base text-slate-600 mt-4 max-w-2xl">
            To provide compassionate, evidence-based medical care to children
            and families in Kanpur and the surrounding region, with a special
            commitment to serving patients covered under Ayushman Bharat PM-JAY.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            <Card>
              <CardContent className="p-6">
                <HeartPulse className="w-8 h-8 text-blue-800 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900">
                  Patient-First Care
                </h3>
                <p className="text-sm text-slate-500 mt-2">
                  Every decision centers on patient outcomes and family
                  wellbeing.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Shield className="w-8 h-8 text-blue-800 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900">
                  Clinical Safety
                </h3>
                <p className="text-sm text-slate-500 mt-2">
                  Rigorous protocols and trained staff at every level of care.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Users className="w-8 h-8 text-blue-800 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900">
                  Community Trust
                </h3>
                <p className="text-sm text-slate-500 mt-2">
                  Serving Kanpur families with transparency and compassion.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
