'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/portal/auth'

export type AppointmentStatus = 'pending' | 'contacted' | 'confirmed' | 'cancelled'

async function requireAppointmentRole() {
  return requireRole(['super_admin', 'admin', 'receptionist'])
}

export async function updateAppointmentStatusAction(
  id: string,
  status: AppointmentStatus,
  notes?: string
): Promise<{ error?: string }> {
  try {
    await requireAppointmentRole()

    // Admin client is used intentionally here to bypass RLS — this is a single-hospital,
    // single-branch v1 portal where all appointment managers share a unified view.
    // If multi-tenancy is added in future, replace with a user-scoped client + branch filter.
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

export async function updateAppointmentNotesAction(
  id: string,
  notes: string
): Promise<{ error?: string }> {
  try {
    await requireAppointmentRole()

    const { error } = await createAdminClient()
      .from('appointment_requests')
      .update({ notes })
      .eq('id', id)

    if (error) throw new Error(error.message)

    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
