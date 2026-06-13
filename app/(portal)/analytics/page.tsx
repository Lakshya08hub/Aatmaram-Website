import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StaffRole } from '@/lib/portal/roles';
import { getActiveStaffWithPaymentStatus, getMonthlyPayrollTotal } from '@/lib/db/payroll';
import { getAppointmentStats, getPatientVolumeStats } from '@/lib/db/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ADMIN_ROLES: StaffRole[] = ['super_admin', 'admin'];

function toFirstOfMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

async function requireAdminRole() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (error || !profile || !ADMIN_ROLES.includes(profile.role as StaffRole)) {
    redirect('/dashboard');
  }
}

const APPOINTMENT_STATUSES: {
  key: string;
  label: string;
  variant: 'outline' | 'secondary' | 'default' | 'destructive';
}[] = [
  { key: 'pending', label: 'Pending', variant: 'outline' },
  { key: 'contacted', label: 'Contacted', variant: 'secondary' },
  { key: 'confirmed', label: 'Confirmed', variant: 'default' },
  { key: 'cancelled', label: 'Cancelled', variant: 'destructive' },
];

export default async function AnalyticsPage() {
  await requireAdminRole();

  const now = new Date();
  const currentMonth = toFirstOfMonth(now);

  const [appointmentStats, staff, payrollTotal, patientStats] = await Promise.all([
    getAppointmentStats(now),
    getActiveStaffWithPaymentStatus(currentMonth),
    getMonthlyPayrollTotal(currentMonth),
    getPatientVolumeStats(now),
  ]);

  const roleCount = staff.reduce<Record<string, number>>((acc, s) => {
    acc[s.role] = (acc[s.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-xl font-semibold">Analytics</h1>

      {/* Section 1: GA4 Website Traffic */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Website Traffic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            View your website&apos;s traffic data, audience demographics, and page performance in
            Google Analytics.
          </p>
          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            View in Google Analytics →
          </a>
          <p className="text-xs text-muted-foreground">
            Sign in to Google with the account that owns the GA4 property to see data.
          </p>
        </CardContent>
      </Card>

      {/* Section 2: Appointment Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Appointment Operations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 rounded-lg bg-muted p-4">
              <p className="text-xs text-muted-foreground">This Week</p>
              <p className="mt-1 text-2xl font-semibold">{appointmentStats.thisWeek}</p>
            </div>
            <div className="flex-1 rounded-lg bg-muted p-4">
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="mt-1 text-2xl font-semibold">{appointmentStats.thisMonth}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {APPOINTMENT_STATUSES.map(({ key, label, variant }) => (
              <div key={key} className="flex items-center gap-2">
                <Badge variant={variant}>{label}</Badge>
                <span className="text-sm font-semibold">
                  {appointmentStats.byStatus[key] ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">(this month)</span>
              </div>
            ))}
          </div>

          {appointmentStats.byDoctor.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointment data yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left text-xs text-muted-foreground">Doctor</th>
                  <th className="py-2 text-right text-xs text-muted-foreground w-[120px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {appointmentStats.byDoctor.map(({ doctor, count }) => (
                  <tr key={doctor} className="border-b last:border-0">
                    <td className="py-2">{doctor}</td>
                    <td className="py-2 text-right">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Staff & Payroll Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Staff &amp; Payroll Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(roleCount).length === 0 ? (
            <p className="text-sm text-muted-foreground">No active staff.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left text-xs text-muted-foreground">Role</th>
                  <th className="py-2 text-right text-xs text-muted-foreground w-[120px]">
                    Active Staff
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(roleCount).map(([role, count]) => (
                  <tr key={role} className="border-b last:border-0">
                    <td className="py-2 capitalize">{role.replace('_', ' ')}</td>
                    <td className="py-2 text-right">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="rounded-lg bg-muted p-4">
            <p className="text-xs text-muted-foreground">Current Month Payroll</p>
            <p className="mt-1 text-2xl font-semibold">
              ₹{payrollTotal.toLocaleString('en-IN')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Patient Volume */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Patient Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 rounded-lg bg-muted p-4">
              <p className="text-xs text-muted-foreground">This Week</p>
              <p className="mt-1 text-2xl font-semibold">{patientStats.thisWeek}</p>
            </div>
            <div className="flex-1 rounded-lg bg-muted p-4">
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="mt-1 text-2xl font-semibold">{patientStats.thisMonth}</p>
            </div>
          </div>
          {patientStats.thisWeek === 0 && patientStats.thisMonth === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">No patient records this month yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
