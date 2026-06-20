import { createAdminClient } from '@/lib/supabase/admin'

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

// WR-03: use admin client for consistency with D-02 (RLS disabled on this table)
// CR-04: default limit prevents unbounded query growth and Supabase timeout
export async function getAppointmentRequests(limit = 300): Promise<AppointmentRequest[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('appointment_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error('Failed to fetch appointments: ' + error.message)
  return (data ?? []) as AppointmentRequest[]
}
