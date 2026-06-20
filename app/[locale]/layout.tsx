import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
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

  // Must be called before any locale-dependent server calls (getMessages, etc.)
  // so that static rendering uses the correct locale from async context.
  setRequestLocale(locale);

  const messages = await getMessages();

  // Validate GA4 ID format before injection to prevent XSS via env var misconfiguration.
  // GA4 measurement IDs are always in the form "G-XXXXXXXXXX".
  const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '';
  const validGaId = /^G-[A-Z0-9]+$/.test(GA_ID) ? GA_ID : null;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={GeistSans.variable}>
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster />
        </NextIntlClientProvider>
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
      </body>
    </html>
  );
}
