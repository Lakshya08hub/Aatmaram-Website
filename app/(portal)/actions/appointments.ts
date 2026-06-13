'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StaffRole } from '@/lib/portal/roles'

type AppointmentStatus = 'pending' | 'contacted' | 'confirmed' | 'cancelled'

const APPOINTMENT_ROLES: StaffRole[] = ['super_admin', 'admin', 'receptionist']

async function requireAppointmentRole() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (error || !profile || !APPOINTMENT_ROLES.includes(profile.role as StaffRole)) {
    throw new Error('Forbidden')
  }

  return supabase
}

export async function updateAppointmentStatusAction(
  id: string,
  status: AppointmentStatus,
  notes?: string
): Promise<{ error?: string }> {
  try {
    await requireAppointmentRole()

    const { error } = await createAdminClient()
      .from('appointment_requests')
      .update({ status, notes: notes ?? null })
      .eq('id', id)

    if (error) throw new Error(error.message)

    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
