import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { GeistSans } from 'geist/font/sans';
import Script from 'next/script';
import { routing } from '@/i18n/routing';
import { Toaster } from '@/components/ui/sonner';

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'hi' | 'en')) {
    notFound();
  }

  const messages = await getMessages();

  // Validate GA4 ID format before injection to prevent XSS via env var misconfiguration.
  // GA4 measurement IDs are always in the form "G-XXXXXXXXXX".
  const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '';
  const validGaId = /^G-[A-Z0-9]+$/.test(GA_ID) ? GA_ID : null;

  return (
    <NextIntlClientProvider messages={messages}>
      <div className={GeistSans.variable}>
        {children}
        <Toaster />
      </div>
      {/* GA4 — review DPDP Act consent obligations before launch */}
      {validGaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${validGaId}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${validGaId}');
              `,
            }}
          />
        </>
      )}
    </NextIntlClientProvider>
  );
}
