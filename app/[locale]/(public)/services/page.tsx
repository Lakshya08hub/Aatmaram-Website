import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PMJAYBadge } from '@/components/public/PMJAYBadge';
import { SectionHeading } from '@/components/public/SectionHeading';
import { services, facilities } from '@/lib/data/services';

export const metadata: Metadata = {
  title: 'Services & Facilities | Atmaram Child Care and Critical Care',
  description:
    'Comprehensive hospital services including ICU, NICU, emergency care, and Ayushman Bharat PM-JAY empanelled treatment.',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ServicesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('services');
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

      {/* Section 2 — Services List (two-column) */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <SectionHeading
            title={t('pageTitle')}
            subtitle={t('pageSubtitle')}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            {services.map((service) => (
              <div key={service.id} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-base text-slate-700">{t(`list.${service.translationKey}`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — Ayushman Bharat Section */}
      <section className="py-12 px-4 bg-blue-50">
        <div className="max-w-7xl mx-auto">
          <SectionHeading title={t('ayushman.heading')} />
          <div className="mt-6 flex justify-start">
            <PMJAYBadge />
          </div>
          <p className="text-base text-slate-600 mt-6 max-w-2xl leading-relaxed">
            {t('ayushman.body')}
          </p>
          <h3 className="text-xl font-semibold text-slate-900 mt-8">{t('ayushman.whatIs')}</h3>
          <p className="text-base text-slate-600 mt-2 max-w-2xl leading-relaxed">
            {t('ayushman.whatIsBody')}
          </p>
        </div>
      </section>

      {/* Section 4 — Facilities Grid */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <SectionHeading title={t('facilities.heading')} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
            {facilities.map((facility) => {
              const Icon = facility.icon;
              return (
                <Card key={facility.id}>
                  <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                    <Icon className="w-8 h-8 text-blue-800" />
                    <p className="text-sm font-semibold text-slate-900">{t(`facilities.items.${facility.translationKey}`)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
