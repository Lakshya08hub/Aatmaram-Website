import { setRequestLocale, getTranslations } from 'next-intl/server';
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
  const t = await getTranslations('about');
  const tNav = await getTranslations('nav');

  return (
    <main>
      {/* Section 1 — Page Header */}
      <section className="py-12 bg-white px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-slate-500 mb-2">{tNav('home')} › {t('pageTitle')}</p>
          <h1 className="text-xl font-semibold text-slate-900">{t('pageTitle')}</h1>
        </div>
      </section>

      {/* Section 2 — Hospital Story (2-column) */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            {/* Left column — story text */}
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {t('intro.heading')}
              </h2>
              <div className="mt-2 w-12 h-1 bg-blue-800 rounded-full" />
              <p className="text-base text-slate-600 mt-6 leading-relaxed">
                {t('intro.body')}
              </p>
            </div>

            {/* Right column — stat cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <span className="text-2xl font-bold text-blue-800">90</span>
                  <p className="text-sm text-slate-500 mt-1">{t('stats.bedsLabel')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <span className="text-2xl font-bold text-blue-800">25+</span>
                  <p className="text-sm text-slate-500 mt-1">{t('stats.doctorsLabel')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <span className="text-2xl font-bold text-blue-800">8</span>
                  <p className="text-sm text-slate-500 mt-1">{t('stats.specialtiesLabel')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <span className="text-2xl font-bold text-blue-800">10+</span>
                  <p className="text-sm text-slate-500 mt-1">{t('stats.yearsLabel')}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 — Mission & Values */}
      <section className="py-12 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <SectionHeading title={t('mission.heading')} />
          <p className="text-base text-slate-600 mt-4 max-w-2xl">
            {t('mission.body')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            <Card>
              <CardContent className="p-6">
                <HeartPulse className="w-8 h-8 text-blue-800 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900">
                  {t('values.care')}
                </h3>
                <p className="text-sm text-slate-500 mt-2">
                  {t('values.careDesc')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Shield className="w-8 h-8 text-blue-800 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900">
                  {t('values.safety')}
                </h3>
                <p className="text-sm text-slate-500 mt-2">
                  {t('values.safetyDesc')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Users className="w-8 h-8 text-blue-800 mb-4" />
                <h3 className="text-xl font-semibold text-slate-900">
                  {t('values.community')}
                </h3>
                <p className="text-sm text-slate-500 mt-2">
                  {t('values.communityDesc')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
