import { createClient } from '@/lib/supabase/server'

export interface AppointmentRequest {
  id: string
  patient_name: string
  phone: string
  preferred_doctor: string
  preferred_date: string
  preferred_time: string
  reason: string
  status: 'pending' | 'contacted' | 'confirmed' | 'cancelled'
  notes: string | null
  created_at: string
}

export async function getAppointmentRequests(): Promise<AppointmentRequest[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointment_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error('Failed to fetch appointments: ' + error.message)
  return (data ?? []) as AppointmentRequest[]
}
