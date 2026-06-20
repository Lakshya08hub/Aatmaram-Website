'use server';

import { z } from 'zod';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/portal/auth';
import {
  getActiveStaffWithPaymentStatus,
  getMonthlyPayrollTotal,
  type StaffPayrollRow,
} from '@/lib/db/payroll';

const monthRegex = /^\d{4}-\d{2}-01$/;

const markAsPaidSchema = z.object({
  profileId: z.string().uuid(),
  paymentMonth: z.string().regex(monthRegex, 'Invalid month format'),
  amountPaid: z.number().finite().min(0),
});

function toFirstOfMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

export async function markAsPaidAction(input: {
  profileId: string;
  paymentMonth: string;
  amountPaid: number;
}): Promise<{ error?: string }> {
  // Validate input before auth to fail fast on bad data
  const parsed = markAsPaidSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Invalid input.' };
  }

  try {
    const { user, supabase } = await requireRole(['super_admin', 'admin']);

    const currentMonth = toFirstOfMonth(new Date());
    if (parsed.data.paymentMonth > currentMonth) {
      return { error: 'Cannot mark future months as paid.' };
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const adminClient = createAdminClient();
    const { error } = await adminClient.from('payroll_payments').insert({
      profile_id: parsed.data.profileId,
      payment_month: parsed.data.paymentMonth,
      amount_paid: parsed.data.amountPaid,
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
    if (isRedirectError(err)) throw err;
    if (err instanceof Error && err.message === 'Forbidden') throw err;
    return { error: err instanceof Error ? err.message : 'Something went wrong. Please try again.' };
  }
}

const monthSchema = z.string().regex(monthRegex, 'Invalid month format');

export async function getPayrollDataAction(
  month: string
): Promise<{ staff: StaffPayrollRow[]; total: number; error?: string }> {
  const parsedMonth = monthSchema.safeParse(month);
  if (!parsedMonth.success) {
    return { staff: [], total: 0, error: 'Invalid month.' };
  }

  try {
    await requireRole(['super_admin', 'admin']);

    const [staff, total] = await Promise.all([
      getActiveStaffWithPaymentStatus(parsedMonth.data),
      getMonthlyPayrollTotal(parsedMonth.data),
    ]);

    return { staff, total };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    if (err instanceof Error && err.message === 'Forbidden') throw err;
    return {
      staff: [],
      total: 0,
      error: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
    };
  }
}
