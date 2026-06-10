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
  // Root layout is minimal — html/body/lang are provided by [locale]/layout.tsx.
  // This file is required by Next.js for the not-found route and metadata export.
  return children;
}
