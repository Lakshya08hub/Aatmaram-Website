'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';

import { type StaffPayrollRow } from '@/lib/db/payroll';
import { markAsPaidAction, getPayrollDataAction } from '@/app/(portal)/actions/payroll';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PayrollClientProps {
  initialStaff: StaffPayrollRow[];
  initialTotal: number;
  initialMonth: string;
}

function toFirstOfMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function formatMonthDisplay(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PayrollClient({ initialStaff, initialTotal, initialMonth }: PayrollClientProps) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [staff, setStaff] = useState<StaffPayrollRow[]>(initialStaff);
  const [total, setTotal] = useState(initialTotal);
  const [isNavigating, setIsNavigating] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const currentMonth = toFirstOfMonth(new Date());
  const isAtCurrentMonth = selectedMonth >= currentMonth;

  async function loadMonthData(month: string) {
    setIsNavigating(true);
    const result = await getPayrollDataAction(month);
    if (result.error) {
      toast.error(result.error);
    } else {
      setStaff(result.staff);
      setTotal(result.total);
    }
    setIsNavigating(false);
  }

  function navigateMonth(dir: 'prev' | 'next') {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + (dir === 'next' ? 1 : -1), 1);
    const next = toFirstOfMonth(d);
    setSelectedMonth(next);
    loadMonthData(next);
  }

  async function handleMarkAsPaid(row: StaffPayrollRow) {
    setPendingIds((prev) => new Set(prev).add(row.id));
    const amountPaid = row.salary ?? 0;
    const result = await markAsPaidAction({
      profileId: row.id,
      paymentMonth: selectedMonth,
      amountPaid,
    });
    setPendingIds((prev) => {
      const s = new Set(prev);
      s.delete(row.id);
      return s;
    });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (row.salary === null) {
      toast.success('Marked as ₹0. Update salary on the Staff page first.');
    } else {
      toast.success(`Marked as paid — ${formatINR(amountPaid)}`);
    }
    loadMonthData(selectedMonth);
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Payroll</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            className="min-h-[48px]"
            onClick={() => navigateMonth('prev')}
            disabled={isNavigating}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center text-xl font-semibold">
            {formatMonthDisplay(selectedMonth)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next month"
            className="min-h-[48px]"
            onClick={() => navigateMonth('next')}
            disabled={isAtCurrentMonth || isNavigating}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="mt-8 bg-muted">
        <CardContent className="p-4">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <IndianRupee className="h-3 w-3" />
            Total Paid This Month
          </p>
          <p className="mt-1 text-3xl font-semibold">{formatINR(total)}</p>
        </CardContent>
      </Card>

      {/* Staff Payment Table */}
      <div className="mt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Monthly Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isNavigating ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center">
                  <p className="font-medium">No active staff found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add staff on the Staff page before running payroll.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              staff.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-sm">{row.full_name ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.role}</TableCell>
                  <TableCell className="text-sm">
                    {row.salary !== null ? formatINR(row.salary) : '—'}
                  </TableCell>
                  <TableCell>
                    {row.isPaid ? (
                      <Badge variant="default">Paid</Badge>
                    ) : (
                      <Badge variant="secondary">Unpaid</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.isPaid ? (
                      <span className="text-xs text-muted-foreground">
                        Paid on{' '}
                        {new Date(row.paidAt!).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        disabled={pendingIds.has(row.id)}
                        onClick={() => handleMarkAsPaid(row)}
                      >
                        {pendingIds.has(row.id) ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Marking...
                          </>
                        ) : (
                          'Mark as Paid'
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
