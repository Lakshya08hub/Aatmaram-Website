'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { StaffRole } from '@/lib/portal/roles';
import {
  getActiveStaffWithPaymentStatus,
  getMonthlyPayrollTotal,
  type StaffPayrollRow,
} from '@/lib/db/payroll';

const ADMIN_ROLES: StaffRole[] = ['super_admin', 'admin'];

function toFirstOfMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
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
    throw new Error('Forbidden');
  }

  return supabase;
}

export async function markAsPaidAction(input: {
  profileId: string;
  paymentMonth: string;
  amountPaid: number;
}): Promise<{ error?: string }> {
  try {
    const supabase = await requireAdminRole();

    const currentMonth = toFirstOfMonth(new Date());
    if (input.paymentMonth > currentMonth) {
      return { error: 'Cannot mark future months as paid.' };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user!.id)
      .single();

    const adminClient = createAdminClient();
    const { error } = await adminClient.from('payroll_payments').insert({
      profile_id: input.profileId,
      payment_month: input.paymentMonth,
      amount_paid: Math.max(0, input.amountPaid),
      paid_by: callerProfile?.id ?? null,
    });

    if (error) {
      if (error.code === '23505') {
        return { error: 'Already marked as paid for this month.' };
      }
      return { error: error.message };
    }

    return {};
  } catch (err) {
    if (err instanceof Error && err.message === 'Forbidden') {
      throw err;
    }
    return { error: err instanceof Error ? err.message : 'Something went wrong. Please try again.' };
  }
}

export async function getPayrollDataAction(
  month: string
): Promise<{ staff: StaffPayrollRow[]; total: number; error?: string }> {
  try {
    await requireAdminRole();

    const [staff, total] = await Promise.all([
      getActiveStaffWithPaymentStatus(month),
      getMonthlyPayrollTotal(month),
    ]);

    return { staff, total };
  } catch (err) {
    if (err instanceof Error && err.message === 'Forbidden') {
      throw err;
    }
    return {
      staff: [],
      total: 0,
      error: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
    };
  }
}
