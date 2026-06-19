'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronRight } from 'lucide-react'
import { AppointmentRequest } from '@/lib/db/appointment_requests'
import { updateAppointmentStatusAction, updateAppointmentNotesAction } from '@/app/(portal)/actions/appointments'
import type { AppointmentStatus } from '@/app/(portal)/actions/appointments'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const ADVANCE_MAP: Record<string, { next: AppointmentStatus; label: string } | null> = {
  pending:   { next: 'contacted', label: 'Mark Contacted' },
  contacted: { next: 'confirmed', label: 'Mark Confirmed' },
  confirmed: null,  // confirmed is terminal — no further advance (CR-003)
  cancelled: null,
}

const STATUS_BADGE_CONFIG: Record<string, { className: string; label: string }> = {
  pending:   { className: 'bg-amber-100 text-amber-800 font-semibold dark:bg-amber-900 dark:text-amber-200', label: 'Pending' },
  contacted: { className: 'bg-blue-100 text-blue-800 font-semibold dark:bg-blue-900 dark:text-blue-200', label: 'Contacted' },
  confirmed: { className: 'bg-green-100 text-green-800 font-semibold dark:bg-green-900 dark:text-green-200', label: 'Confirmed' },
  cancelled: { className: 'bg-red-100 text-red-800 font-semibold dark:bg-red-900 dark:text-red-200', label: 'Cancelled' },
}

interface Props {
  appointment: AppointmentRequest
  onAdvance: (id: string, nextStatus: AppointmentStatus) => Promise<void>
  onCancel: (id: string) => Promise<void>
  onNotesChange?: () => void
}

export function KanbanCard({ appointment, onAdvance, onCancel, onNotesChange }: Props) {
  const [localNotes, setLocalNotes] = useState(appointment.notes ?? '')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  const status = appointment.status as AppointmentStatus
  const advance = ADVANCE_MAP[status] ?? null
  const showCancel = status === 'pending' || status === 'contacted'
  const badgeConfig = STATUS_BADGE_CONFIG[status] ?? STATUS_BADGE_CONFIG['pending']

  async function handleNotesSave() {
    if (localNotes === (appointment.notes ?? '')) return
    setIsSavingNotes(true)
    try {
      const result = await updateAppointmentNotesAction(appointment.id, localNotes)
      if (result.error) {
        toast.error('Could not save notes — please try again.')
      } else {
        onNotesChange?.()
      }
    } catch {
      toast.error('Could not save notes — please try again.')
    } finally {
      setIsSavingNotes(false)
    }
  }

  function handleNotesKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleNotesSave()
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col gap-2 pt-4">
        {/* Header row: name + status badge */}
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-foreground">{appointment.patient_name}</p>
          <Badge className={badgeConfig.className}>{badgeConfig.label}</Badge>
        </div>

        {/* Phone */}
        <a
          href={`tel:${appointment.phone}`}
          className="text-blue-600 underline text-sm"
        >
          {appointment.phone}
        </a>

        {/* Preferred date */}
        <p className="text-sm text-muted-foreground">
          {new Date(appointment.preferred_date).toLocaleDateString('en-IN')}
        </p>

        {/* Preferred doctor */}
        <p className="text-sm text-muted-foreground">{appointment.preferred_doctor}</p>

        {/* Inline notes editor */}
        <textarea
          rows={2}
          className="resize-none text-sm bg-transparent border-b border-dashed border-muted-foreground focus:border-blue-500 focus:outline-none w-full mt-1"
          placeholder="Add notes..."
          value={localNotes}
          disabled={isSavingNotes}
          onChange={(e) => setLocalNotes(e.target.value)}
          onBlur={handleNotesSave}
          onKeyDown={handleNotesKeyDown}
        />

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 mt-1">
          {showCancel && (
            <AlertDialog>
              <AlertDialogTrigger>
                <span className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors px-3 py-1 min-h-[36px] text-destructive hover:bg-accent hover:text-destructive cursor-pointer">
                  Cancel
                </span>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will move the appointment to Cancelled. The patient will not be notified automatically.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep appointment</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => onCancel(appointment.id)}
                  >
                    Yes, cancel
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {advance && (
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() => onAdvance(appointment.id, advance.next)}
            >
              {advance.label}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
