import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Atmaram Child Care and Critical Care',
  description: 'Super-specialty hospital in Kanpur — Ayushman Bharat PM-JAY empanelled'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
