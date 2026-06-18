'use client'

import type { LucideIcon } from 'lucide-react'
import { CalendarX, Phone, CheckCircle, XCircle } from 'lucide-react'
import { AppointmentRequest } from '@/lib/db/appointment_requests'
import { EmptyState } from '@/components/ui/empty-state'
import { KanbanCard } from './KanbanCard'

type AppointmentStatus = 'pending' | 'contacted' | 'confirmed' | 'cancelled' | 'completed'

const COLUMN_HEADER_COLORS: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  contacted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const EMPTY_STATE_CONFIG: Record<string, { icon: LucideIcon; title: string; description: string }> = {
  pending: {
    icon: CalendarX,
    title: 'No pending appointments',
    description: 'New appointment requests from patients will appear here.',
  },
  contacted: {
    icon: Phone,
    title: 'No appointments in progress',
    description: "Appointments you've contacted will appear here.",
  },
  confirmed: {
    icon: CheckCircle,
    title: 'No confirmed appointments',
    description: 'Confirmed appointments will appear here.',
  },
  cancelled: {
    icon: XCircle,
    title: 'Nothing here yet',
    description: 'Cancelled or completed appointments will appear here.',
  },
}

interface Props {
  status: AppointmentStatus
  label: string
  appointments: AppointmentRequest[]
  onAdvance: (id: string, nextStatus: AppointmentStatus) => Promise<void>
  onCancel: (id: string) => Promise<void>
}

export function KanbanColumn({ status, label, appointments, onAdvance, onCancel }: Props) {
  const headerColor = COLUMN_HEADER_COLORS[status] ?? COLUMN_HEADER_COLORS['pending']
  const emptyState = EMPTY_STATE_CONFIG[status] ?? EMPTY_STATE_CONFIG['cancelled']

  return (
    <div className="min-w-[280px] bg-card rounded-lg p-4 flex flex-col gap-3">
      {/* Column header */}
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-foreground capitalize">{label}</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${headerColor}`}>
          {appointments.length}
        </span>
      </div>

      {/* Card list or empty state */}
      {appointments.length === 0 ? (
        <EmptyState
          icon={emptyState.icon}
          title={emptyState.title}
          description={emptyState.description}
          className="py-8"
        />
      ) : (
        <div className="flex flex-col space-y-3">
          {appointments.map((a) => (
            <KanbanCard
              key={a.id}
              appointment={a}
              onAdvance={onAdvance}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </div>
  )
}
