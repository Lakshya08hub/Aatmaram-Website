// app/(portal)/dashboard/page.tsx
// Server Component — aggregates appointment, patient, and staff data for the dashboard.
// Auth is enforced by the portal layout; no auth check needed here.

import { createClient } from '@/lib/supabase/server'
import { DashboardCharts } from '@/components/portal/DashboardCharts'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  let apptData: { created_at: string }[] = []
  let patientData: { created_at: string }[] = []
  let staffCount = 0

  try {
    const { data } = await supabase
      .from('appointment_requests')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo)
    apptData = data ?? []
  } catch {
    apptData = []
  }

  try {
    const { data } = await supabase
      .from('patients')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo)
    patientData = data ?? []
  } catch {
    patientData = []
  }

  try {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
    staffCount = count ?? 0
  } catch {
    staffCount = 0
  }

  return (
    <DashboardCharts
      appointments={apptData}
      patients={patientData}
      staffCount={staffCount}
    />
  )
}
