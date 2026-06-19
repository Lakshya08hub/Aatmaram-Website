import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROLE_SECTIONS } from '@/lib/portal/roles'
import { getAppointmentRequests, AppointmentRequest } from '@/lib/db/appointment_requests'
import { KanbanBoard } from '@/components/portal/KanbanBoard'

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
    console.error('[AppointmentsPage] Failed to load appointment requests:', e)
    fetchError = true
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-6">Appointment Requests</h1>

      {fetchError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load appointment requests. Check your connection and refresh.
        </div>
      )}

      <KanbanBoard appointments={appointments} />
    </div>
  )
}
