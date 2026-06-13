import { getActiveStaffWithPaymentStatus, getMonthlyPayrollTotal } from '@/lib/db/payroll';
import PayrollClient from './PayrollClient';

function toFirstOfMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

export default async function PayrollPage() {
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
