'use client'

import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface Props {
  appointments: { created_at: string }[]
  patients: { created_at: string }[]
  staffCount: number
}

function groupByDay(
  items: { created_at: string }[]
): { date: string; count: number }[] {
  if (items.length === 0) return []
  const map: Record<string, number> = {}
  for (const item of items) {
    const day = item.created_at.slice(0, 10)
    map[day] = (map[day] ?? 0) + 1
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))
}

const appointmentsChartConfig: ChartConfig = {
  count: { label: 'Appointments', color: 'var(--color-primary)' },
}

const patientsChartConfig: ChartConfig = {
  count: { label: 'Admissions', color: 'var(--color-primary)' },
}

export function DashboardCharts({ appointments, patients, staffCount }: Props) {
  const apptByDay = groupByDay(appointments)
  const patientsByDay = groupByDay(patients)

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card A — Appointments over time */}
        <Card>
          <CardHeader>
            <CardTitle>Appointments</CardTitle>
            <p className="text-muted-foreground text-sm">Last 30 days</p>
          </CardHeader>
          <CardContent>
            {apptByDay.length === 0 ? (
              <p className="text-sm text-muted-foreground py-16 text-center">
                No appointments in the last 30 days
              </p>
            ) : (
              <ChartContainer config={appointmentsChartConfig} className="h-48 w-full">
                <BarChart data={apptByDay}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Card B — Patient admissions trend */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Admissions</CardTitle>
            <p className="text-muted-foreground text-sm">Last 30 days</p>
          </CardHeader>
          <CardContent>
            {patientsByDay.length === 0 ? (
              <p className="text-sm text-muted-foreground py-16 text-center">
                No admissions in the last 30 days
              </p>
            ) : (
              <ChartContainer config={patientsChartConfig} className="h-48 w-full">
                <BarChart data={patientsByDay}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Card C — Staff on duty */}
        <Card>
          <CardHeader>
            <CardTitle>Staff On Duty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">{staffCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Active staff members</p>
          </CardContent>
        </Card>

        {/* Card D — Payroll placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Payroll</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">₹0</p>
            <p className="text-sm text-muted-foreground mt-1">Payroll tracker coming soon</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">Last 30 days</p>
    </div>
  )
}
