// app/(portal)/dashboard/page.tsx
// Role-aware dashboard landing page (D-10: greeting varies by role).
// Auth is already enforced by the portal layout — this page only needs the role for display.

import { createClient } from '@/lib/supabase/server';
import { StaffRole } from '@/lib/portal/roles';

const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  doctor: 'Doctor',
  receptionist: 'Receptionist',
};

const ROLE_DESCRIPTION: Record<StaffRole, string> = {
  super_admin: 'You have full access to all portal sections.',
  admin: 'You can manage staff, appointments, patients, payroll, and analytics.',
  doctor: 'You have access to your patient records.',
  receptionist: 'You can manage appointments and patient intake.',
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Role already validated by layout; this fetch is just for display context.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user!.id)
    .single();

  const role = (profile?.role ?? 'receptionist') as StaffRole;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        Signed in as{' '}
        <span className="font-semibold text-slate-700">{ROLE_LABELS[role]}</span>
      </p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-700">Welcome back</h2>
        <p className="mt-2 text-sm text-slate-500">{ROLE_DESCRIPTION[role]}</p>
      </div>

      <p className="mt-8 text-xs text-slate-400">
        Atmaram Child Care &amp; Critical Care — Staff Portal
      </p>
    </div>
  );
}
