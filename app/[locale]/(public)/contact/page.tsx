import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import type { Metadata } from 'next';
import { MapPin, Phone, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { SectionHeading } from '@/components/public/SectionHeading';

export const metadata: Metadata = {
  title: 'Contact Us | Atmaram Child Care and Critical Care',
  description: 'Find us at Naubasta, Kanpur-208021. OPD timings, emergency number, and location.',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ContactPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main>
      {/* Section 1 — Page Header */}
      <section className="py-12 bg-white px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-slate-500 mb-2">Home › Contact Us</p>
          <h1 className="text-xl font-semibold text-slate-900">Contact Us</h1>
        </div>
      </section>

      {/* Section 2 — Contact Details + Map */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <SectionHeading title="Get in Touch" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-8 items-start">
            {/* Left column — 4 contact cards */}
            <div className="flex flex-col gap-4">
              {/* Card 1 — Address */}
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-800 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Address</h3>
                    <p className="text-sm text-slate-600 mt-1">
                      Naubasta / Kidwai Nagar, Kanpur - 208021, Uttar Pradesh
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2 — Phone */}
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <Phone className="w-5 h-5 text-blue-800 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Phone</h3>
                    <p className="text-sm text-slate-600 mt-1">+91-XXXXXXXXXX (placeholder)</p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3 — OPD Timings */}
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-800 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">OPD Timings</h3>
                    <p className="text-sm text-slate-600 mt-1">Mon–Sat: 9:00 AM – 5:00 PM</p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 4 — Emergency */}
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">24x7 Emergency</h3>
                    <p className="text-sm text-slate-600 mt-1">+91-XXXXXXXXXX</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column — Map placeholder */}
            <div className="h-64 bg-slate-100 rounded-xl flex flex-col items-center justify-center gap-2">
              <MapPin className="w-8 h-8 text-slate-400" />
              <p className="text-sm text-slate-400">Map loading...</p>
              <p className="text-xs text-slate-400 text-center px-4">
                Interactive map will be available soon
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
