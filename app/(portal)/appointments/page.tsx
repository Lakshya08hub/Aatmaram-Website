import { getAppointmentRequests, AppointmentRequest } from '@/lib/db/appointment_requests'
import { KanbanBoard } from '@/components/portal/KanbanBoard'

export const dynamic = 'force-dynamic'

export default async function AppointmentsPage() {
  let appointments: AppointmentRequest[] = []
  let fetchError = false

  try {
    appointments = await getAppointmentRequests()
  } catch {
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
