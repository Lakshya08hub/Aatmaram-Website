import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { MapPin, Phone, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SectionHeading } from '@/components/public/SectionHeading';
import { getHospitalInfo } from '@/lib/db/hospital-info';
import type { HospitalInfo } from '@/lib/db/hospital-info';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contact Us | Atmaram Child Care and Critical Care',
  description: 'Find us at Naubasta, Kanpur-208021. OPD timings, emergency number, and location.',
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ContactPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('contact');
  const tNav = await getTranslations('nav');

  let hospitalInfo: HospitalInfo | null = null;
  try {
    hospitalInfo = await getHospitalInfo();
  } catch (err) {
    console.error('[ContactPage] fetch failed:', err);
  }

  const addressLine1 = hospitalInfo?.address_line1 ?? '';
  const addressLine2 = hospitalInfo?.address_line2 ?? '';
  const address = [addressLine1, addressLine2].filter(Boolean).join(', ');
  const phone = hospitalInfo?.emergency_number ?? '';
  const opdTimings = hospitalInfo?.opd_timings ?? '';
  const mapsEmbedUrl = hospitalInfo?.maps_embed_url ?? '';

  return (
    <main>
      {/* Section 1 — Page Header */}
      <section className="py-12 bg-white px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-slate-500 mb-2">{tNav('home')} › {t('pageTitle')}</p>
          <h1 className="text-xl font-semibold text-slate-900">{t('pageTitle')}</h1>
        </div>
      </section>

      {/* Section 2 — Contact Details + Map */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <SectionHeading title={t('getInTouch')} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-8 items-start">
            {/* Left column — 4 contact cards */}
            <div className="flex flex-col gap-4">
              {/* Card 1 — Address */}
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-800 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{t('address.heading')}</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {address || t('address.value')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2 — Phone */}
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <Phone className="w-5 h-5 text-blue-800 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{t('phone.heading')}</h3>
                    <p className="text-sm text-slate-600 mt-1">{phone || t('phone.value')}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3 — OPD Timings */}
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-800 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{t('opd.heading')}</h3>
                    <p className="text-sm text-slate-600 mt-1">{opdTimings || t('opd.value')}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 4 — Emergency */}
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{t('emergency.heading')}</h3>
                    <p className="text-sm text-slate-600 mt-1">{phone || t('emergency.value')}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column — Map or placeholder */}
            {mapsEmbedUrl ? (
              <div className="h-64 rounded-xl overflow-hidden">
                <iframe
                  src={mapsEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Hospital location map"
                />
              </div>
            ) : (
              <div className="h-64 bg-slate-100 rounded-xl flex flex-col items-center justify-center gap-2">
                <MapPin className="w-8 h-8 text-slate-400" />
                <p className="text-sm text-slate-400">{t('map.placeholder')}</p>
                <p className="text-xs text-slate-400 text-center px-4">
                  {t('map.subtext')}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
