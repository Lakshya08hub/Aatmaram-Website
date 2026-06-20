import { requireRole } from '@/lib/portal/auth';
import { getActiveStaffWithPaymentStatus, getMonthlyPayrollTotal } from '@/lib/db/payroll';
import PayrollClient from './PayrollClient';
import { isRedirectError } from 'next/dist/client/components/redirect';

function toFirstOfMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

export default async function PayrollPage() {
  try {
    await requireRole(['super_admin', 'admin']);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    throw err; // re-throw Forbidden so error boundary / middleware handles it
  }

  const currentMonth = toFirstOfMonth(new Date());

  const [staff, total] = await Promise.all([
    getActiveStaffWithPaymentStatus(currentMonth),
    getMonthlyPayrollTotal(currentMonth),
  ]);

  return (
    <PayrollClient
      initialStaff={staff}
      initialTotal={total}
      initialMonth={currentMonth}
    />
  );
}
