import { createAdminClient } from '@/lib/supabase/admin';
import { StaffRole } from '@/lib/portal/roles';

export interface StaffPayrollRow {
  id: string;
  full_name: string | null;
  role: StaffRole;
  salary: number | null;
  isPaid: boolean;
  paidAt: string | null;
  amountPaid: number | null;
}

/**
 * Returns all active staff with their payment status for the given month.
 * Only includes staff whose join_date is on or before the last day of the month
 * (staff who joined after the month are excluded). Null join_date is always included.
 * @param month - ISO date string for first day of month, e.g. "2026-06-01" (must be zero-padded)
 */
export async function getActiveStaffWithPaymentStatus(month: string): Promise<StaffPayrollRow[]> {
  const adminClient = createAdminClient();

  // Compute last day of the selected month for the join_date filter.
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0); // day 0 of next month = last day of this month
  const lastDayStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

  const { data: profiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('id, full_name, role, salary, join_date')
    .eq('is_active', true)
    .or(`join_date.is.null,join_date.lte.${lastDayStr}`)
    .order('created_at', { ascending: true });

  if (profilesError) {
    throw new Error(`Failed to fetch staff profiles: ${profilesError.message}`);
  }

  const { data: payments, error: paymentsError } = await adminClient
    .from('payroll_payments')
    .select('profile_id, amount_paid, paid_at')
    .eq('payment_month', month);

  if (paymentsError) {
    throw new Error(`Failed to fetch payroll payments: ${paymentsError.message}`);
  }

  const paymentMap = new Map<string, { amount_paid: number; paid_at: string }>(
    (payments ?? []).map((p) => [
      p.profile_id as string,
      { amount_paid: p.amount_paid as number, paid_at: p.paid_at as string },
    ])
  );

  return (profiles ?? []).map((p) => {
    const payment = paymentMap.get(p.id as string) ?? null;
    return {
      id: p.id as string,
      full_name: p.full_name as string | null,
      role: p.role as StaffRole,
      salary: p.salary as number | null,
      isPaid: !!payment,
      paidAt: payment?.paid_at ?? null,
      amountPaid: payment?.amount_paid ?? null,
    };
  });
}

/**
 * Returns the sum of amount_paid for all paid records in the given month.
 * Queries payroll_payments only — does not use profiles.salary.
 * @param month - ISO date string for first day of month, e.g. "2026-06-01" (must be zero-padded)
 */
export async function getMonthlyPayrollTotal(month: string): Promise<number> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('payroll_payments')
    .select('amount_paid')
    .eq('payment_month', month);

  if (error) {
    throw new Error(`Failed to fetch payroll total: ${error.message}`);
  }

  return (data ?? []).reduce((sum, row) => sum + (Number(row.amount_paid) || 0), 0);
}
