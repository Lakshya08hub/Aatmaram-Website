'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AppointmentRequest } from '@/lib/db/appointment_requests'
import { updateAppointmentStatusAction } from '@/app/(portal)/actions/appointments'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

type AppointmentStatus = 'pending' | 'contacted' | 'confirmed' | 'cancelled'

interface RowState {
  status: AppointmentStatus
  notes: string
  dirty: boolean
}

interface Props {
  appointments: AppointmentRequest[]
  fetchError?: boolean
}

const TIME_LABELS: Record<string, string> = {
  morning: 'Morning OPD (9am–12pm)',
  afternoon: 'Afternoon OPD (12–3pm)',
  evening: 'Evening OPD (3–6pm)',
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const config: Record<AppointmentStatus, { className: string; label: string }> = {
    pending:   { className: 'bg-amber-100 text-amber-800 font-semibold', label: 'Pending' },
    contacted: { className: 'bg-blue-100 text-blue-800 font-semibold', label: 'Contacted' },
    confirmed: { className: 'bg-green-100 text-green-800 font-semibold', label: 'Confirmed' },
    cancelled: { className: 'bg-red-100 text-red-800 font-semibold', label: 'Cancelled' },
  }
  const { className, label } = config[status]
  return <Badge className={className}>{label}</Badge>
}

function TabBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
      {count}
    </span>
  )
}

function EmptyState({ tabValue, tabLabel }: { tabValue: string; tabLabel: string }) {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      <p className="font-semibold">No {tabLabel} appointments</p>
      <p className="mt-1">
        {tabValue === 'pending'
          ? 'New requests will appear here when patients submit the appointment form.'
          : 'No appointments in this status.'}
      </p>
    </div>
  )
}

function AppointmentTable({
  rows,
  rowStates,
  onStatusChange,
  onNotesChange,
  onSave,
}: {
  rows: AppointmentRequest[]
  rowStates: Map<string, RowState>
  onStatusChange: (id: string, status: AppointmentStatus) => void
  onNotesChange: (id: string, notes: string) => void
  onSave: (id: string) => void
}) {
  if (rows.length === 0) return null

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patient Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Preferred Doctor</TableHead>
          <TableHead>Date &amp; Time</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const rowState = rowStates.get(row.id)
          const currentStatus = rowState?.status ?? (row.status as AppointmentStatus)
          const currentNotes = rowState?.notes ?? ''
          const isDirty = rowState?.dirty ?? false

          return (
            <TableRow key={row.id}>
              <TableCell className="font-semibold">{row.patient_name}</TableCell>
              <TableCell>
                <a href={`tel:${row.phone}`} className="text-blue-600 underline">
                  {row.phone}
                </a>
              </TableCell>
              <TableCell>{row.preferred_doctor}</TableCell>
              <TableCell>
                <div>{new Date(row.preferred_date).toLocaleDateString('en-IN')}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {TIME_LABELS[row.preferred_time] ?? row.preferred_time}
                </div>
              </TableCell>
              <TableCell
                className="max-w-[200px] truncate"
                title={row.reason}
              >
                {row.reason.length > 60 ? row.reason.slice(0, 60) + '…' : row.reason}
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status as AppointmentStatus} />
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <Select
                    value={currentStatus}
                    onValueChange={(val) =>
                      onStatusChange(row.id, val as AppointmentStatus)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  {isDirty && (
                    <>
                      <Textarea
                        placeholder="Callback notes (optional)"
                        maxLength={500}
                        value={currentNotes}
                        onChange={(e) => onNotesChange(row.id, e.target.value)}
                        className="text-sm"
                        rows={2}
                      />
                      <Button size="sm" onClick={() => onSave(row.id)}>
                        Save Status
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export default function AppointmentsClient({ appointments, fetchError }: Props) {
  const router = useRouter()
  const [rowStates, setRowStates] = useState<Map<string, RowState>>(new Map())

  const pending   = appointments.filter((a) => a.status === 'pending')
  const contacted = appointments.filter((a) => a.status === 'contacted')
  const confirmed = appointments.filter((a) => a.status === 'confirmed')
  const cancelled = appointments.filter((a) => a.status === 'cancelled')

  function updateRowState(id: string, patch: Partial<RowState>) {
    setRowStates((prev) => {
      const next = new Map(prev)
      const existing = prev.get(id)
      next.set(id, {
        status: existing?.status ?? (appointments.find((a) => a.id === id)?.status as AppointmentStatus) ?? 'pending',
        notes: existing?.notes ?? '',
        dirty: existing?.dirty ?? false,
        ...patch,
      })
      return next
    })
  }

  async function handleSaveStatus(id: string) {
    const rowState = rowStates.get(id)
    if (!rowState) return
    try {
      const result = await updateAppointmentStatusAction(
        id,
        rowState.status,
        rowState.notes || undefined
      )
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Status updated')
        updateRowState(id, { dirty: false })
        router.refresh()
      }
    } catch {
      toast.error('Failed to update. Try again.')
    }
  }

  const tableProps = {
    rowStates,
    onStatusChange: (id: string, status: AppointmentStatus) =>
      updateRowState(id, { status, dirty: true }),
    onNotesChange: (id: string, notes: string) =>
      updateRowState(id, { notes }),
    onSave: handleSaveStatus,
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Appointment Requests</h1>

      {fetchError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load appointment requests. Check your connection and refresh.
        </div>
      )}

      <Tabs defaultValue="pending" className="mt-6">
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            <TabBadge count={pending.length} />
          </TabsTrigger>
          <TabsTrigger value="contacted">
            Contacted
            <TabBadge count={contacted.length} />
          </TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pending.length === 0 ? (
            <EmptyState tabValue="pending" tabLabel="pending" />
          ) : (
            <AppointmentTable rows={pending} {...tableProps} />
          )}
        </TabsContent>

        <TabsContent value="contacted">
          {contacted.length === 0 ? (
            <EmptyState tabValue="contacted" tabLabel="contacted" />
          ) : (
            <AppointmentTable rows={contacted} {...tableProps} />
          )}
        </TabsContent>

        <TabsContent value="confirmed">
          {confirmed.length === 0 ? (
            <EmptyState tabValue="confirmed" tabLabel="confirmed" />
          ) : (
            <AppointmentTable rows={confirmed} {...tableProps} />
          )}
        </TabsContent>

        <TabsContent value="cancelled">
          {cancelled.length === 0 ? (
            <EmptyState tabValue="cancelled" tabLabel="cancelled" />
          ) : (
            <AppointmentTable rows={cancelled} {...tableProps} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
