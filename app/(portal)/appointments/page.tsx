import { getAppointmentRequests, AppointmentRequest } from '@/lib/db/appointment_requests'
import AppointmentsClient from '@/components/portal/AppointmentsClient'

export const dynamic = 'force-dynamic'

export default async function AppointmentsPage() {
  let appointments: AppointmentRequest[] = []
  let fetchError = false

  try {
    appointments = await getAppointmentRequests()
  } catch {
    fetchError = true
  }

  return <AppointmentsClient appointments={appointments} fetchError={fetchError} />
}
