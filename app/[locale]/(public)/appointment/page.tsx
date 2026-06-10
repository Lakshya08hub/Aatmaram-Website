import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import type { Metadata } from 'next'
import AppointmentForm from '@/components/public/AppointmentForm'

export const metadata: Metadata = {
  title: 'Request an Appointment | Atmaram Child Care and Critical Care',
  description:
    "Request a doctor's appointment at Atmaram Child Care and Critical Care, Kanpur. Our team will call you to confirm.",
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

interface AppointmentPageProps {
  params: Promise<{ locale: string }>
}

export default async function AppointmentPage({
  params,
}: AppointmentPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      {/* Section 1 — Page Header */}
      <section className="py-12 bg-white px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-slate-500 mb-2">
            Home &rsaquo; Request an Appointment
          </p>
          <h1 className="text-xl font-semibold text-slate-900">
            Request an Appointment
          </h1>
          <p className="text-base text-slate-500 mt-2">
            Fill in the form below and our team will call you to confirm.
          </p>
        </div>
      </section>

      {/* Section 2 — Appointment Form */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-lg mx-auto">
            <AppointmentForm />
          </div>
        </div>
      </section>
    </>
  )
}
