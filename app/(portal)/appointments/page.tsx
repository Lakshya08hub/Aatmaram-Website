import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROLE_SECTIONS } from '@/lib/portal/roles'
import { getAppointmentRequests } from '@/lib/db/appointment_requests'
import AppointmentsClient from '@/components/portal/AppointmentsClient'

export const dynamic = 'force-dynamic'

export default async function AppointmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!profile || !ROLE_SECTIONS[profile.role as keyof typeof ROLE_SECTIONS]?.includes('appointments')) {
    redirect('/dashboard')
  }

  let appointments: AppointmentRequest[] = []
  let fetchError = false

  try {
    appointments = await getAppointmentRequests()
  } catch (e) {
    console.error('[AppointmentsPage] fetch error:', e instanceof Error ? e.message : String(e))
    fetchError = true
  }

  return (
    <AppointmentsClient appointments={appointments} fetchError={fetchError} />
  )
}
