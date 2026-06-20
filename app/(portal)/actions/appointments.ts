'use server'

import { isRedirectError } from 'next/dist/client/components/redirect'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/portal/auth'

export type AppointmentStatus = 'pending' | 'contacted' | 'confirmed' | 'cancelled'

// WR-02: runtime allowlist — TypeScript types are erased at runtime
const VALID_STATUSES: readonly string[] = ['pending', 'contacted', 'confirmed', 'cancelled']

async function requireAppointmentRole() {
  return requireRole(['super_admin', 'admin', 'receptionist'])
}

export async function updateAppointmentStatusAction(
  id: string,
  status: AppointmentStatus,
  notes?: string
): Promise<{ error?: string }> {
  // WR-02: validate status before any DB call
  if (!VALID_STATUSES.includes(status)) {
    return { error: 'Invalid status value.' }
  }

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
    if (isRedirectError(err)) throw err  // WR-01: re-throw Next.js redirect
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateAppointmentNotesAction(
  id: string,
  notes: string
): Promise<{ error?: string }> {
  // IN-02: guard notes length (client maxLength is bypassable)
  if (notes.length > 1000) return { error: 'Notes exceed maximum length.' }

  try {
    await requireAppointmentRole()

    const { error } = await createAdminClient()
      .from('appointment_requests')
      .update({ notes })
      .eq('id', id)

    if (error) throw new Error(error.message)

    return {}
  } catch (err) {
    if (isRedirectError(err)) throw err  // WR-01: re-throw Next.js redirect
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
