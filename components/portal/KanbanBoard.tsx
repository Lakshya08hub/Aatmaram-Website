'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AppointmentRequest } from '@/lib/db/appointment_requests'
import { updateAppointmentStatusAction } from '@/app/(portal)/actions/appointments'
import type { AppointmentStatus } from '@/app/(portal)/actions/appointments'
import { KanbanColumn } from './KanbanColumn'

interface Props {
  appointments: AppointmentRequest[]
}

export function KanbanBoard({ appointments }: Props) {
  const router = useRouter()

  const pending   = appointments.filter((a) => a.status === 'pending')
  const contacted = appointments.filter((a) => a.status === 'contacted')
  const confirmed = appointments.filter((a) => a.status === 'confirmed')
  const cancelled = appointments.filter((a) => a.status === 'cancelled')

  async function handleAdvance(id: string, nextStatus: AppointmentStatus) {
    const result = await updateAppointmentStatusAction(id, nextStatus)
    if (result.error) {
      toast.error('Status update failed — please try again.')
    } else {
      toast.success('Status updated')
      router.refresh()
    }
  }

  async function handleCancel(id: string) {
    const result = await updateAppointmentStatusAction(id, 'cancelled')
    if (result.error) {
      toast.error('Status update failed — please try again.')
    } else {
      router.refresh()
    }
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 p-1 min-w-max kanban-scroll-hint">
        <KanbanColumn
          status="pending"
          label="Pending"
          appointments={pending}
          onAdvance={handleAdvance}
          onCancel={handleCancel}
          onNotesChange={router.refresh}
        />
        <KanbanColumn
          status="contacted"
          label="Contacted"
          appointments={contacted}
          onAdvance={handleAdvance}
          onCancel={handleCancel}
          onNotesChange={router.refresh}
        />
        <KanbanColumn
          status="confirmed"
          label="Confirmed"
          appointments={confirmed}
          onAdvance={handleAdvance}
          onCancel={handleCancel}
          onNotesChange={router.refresh}
        />
        <KanbanColumn
          status="cancelled"
          label="Cancelled"
          appointments={cancelled}
          onAdvance={handleAdvance}
          onCancel={handleCancel}
          onNotesChange={router.refresh}
        />
      </div>
    </div>
  )
}
