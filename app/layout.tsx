import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { GeistSans } from 'geist/font/sans';
import './globals.css';

export const metadata: Metadata = {
  title: 'Atmaram Child Care and Critical Care',
  description: 'Super-specialty hospital in Kanpur — Ayushman Bharat PM-JAY empanelled'
};

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // next-intl middleware sets x-next-intl-locale for [locale] routes.
  // Portal/login routes bypass intl middleware, so default to 'hi' (site default locale).
  const headersList = await headers();
  const locale = headersList.get('x-next-intl-locale') ?? 'hi';

  return (
    <html lang={locale} className={GeistSans.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
