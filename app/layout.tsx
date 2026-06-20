import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Atmaram Child Care and Critical Care',
  description: 'Super-specialty hospital in Kanpur — Ayushman Bharat PM-JAY empanelled'
};

// Root layout is a minimal shell. <html> and <body> are rendered by
// app/[locale]/layout.tsx so that lang={locale} can be set correctly.
export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return children;
}
