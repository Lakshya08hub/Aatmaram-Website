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
 * @param month - ISO date string for first day of month, e.g. "2026-06-01" (must be zero-padded)
 */
export async function getActiveStaffWithPaymentStatus(month: string): Promise<StaffPayrollRow[]> {
  const adminClient = createAdminClient();

  const { data: profiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('id, full_name, role, salary')
    .eq('is_active', true)
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
