import { createAdminClient } from '@/lib/supabase/admin';

export interface AppointmentStats {
  thisWeek: number;
  thisMonth: number;
  byStatus: Record<string, number>;
  byDoctor: { doctor: string; count: number }[];
}

export interface PatientVolumeStats {
  thisWeek: number;
  thisMonth: number;
}

const ZERO_APPOINTMENT_STATS: AppointmentStats = {
  thisWeek: 0,
  thisMonth: 0,
  byStatus: {},
  byDoctor: [],
};

function isMissingTable(error: { code?: string; message?: string }): boolean {
  return error.code === '42P01' || (error.message ?? '').includes('relation');
}

export async function getAppointmentStats(now: Date): Promise<AppointmentStats> {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const adminClient = createAdminClient();

  let rows: { created_at: string; status: string; preferred_doctor: string | null }[];
  try {
    const { data, error } = await adminClient
      .from('appointment_requests')
      .select('created_at, status, preferred_doctor');

    if (error) {
      if (isMissingTable(error)) return ZERO_APPOINTMENT_STATS;
      throw new Error('Failed to fetch appointment stats: ' + error.message);
    }
    rows = (data ?? []) as typeof rows;
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (isMissingTable(e)) return ZERO_APPOINTMENT_STATS;
    throw err;
  }

  let thisWeek = 0;
  let thisMonth = 0;
  const byStatus: Record<string, number> = {};
  const doctorMap: Record<string, number> = {};

  for (const row of rows) {
    const createdAt = new Date(row.created_at);

    if (createdAt >= sevenDaysAgo && createdAt <= now) thisWeek++;
    if (createdAt >= startOfMonth && createdAt <= now) thisMonth++;

    const status = row.status ?? 'unknown';
    byStatus[status] = (byStatus[status] ?? 0) + 1;

    const doctor = row.preferred_doctor ?? 'Unassigned';
    doctorMap[doctor] = (doctorMap[doctor] ?? 0) + 1;
  }

  const byDoctor = Object.entries(doctorMap)
    .map(([doctor, count]) => ({ doctor, count }))
    .sort((a, b) => b.count - a.count);

  return { thisWeek, thisMonth, byStatus, byDoctor };
}

export async function getPatientVolumeStats(now: Date): Promise<PatientVolumeStats> {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const adminClient = createAdminClient();

  let rows: { created_at: string }[];
  try {
    const { data, error } = await adminClient
      .from('patient_records')
      .select('created_at')
      .gte('created_at', startOfMonth.toISOString());

    if (error) {
      if (isMissingTable(error)) return { thisWeek: 0, thisMonth: 0 };
      throw new Error('Failed to fetch patient volume stats: ' + error.message);
    }
    rows = (data ?? []) as typeof rows;
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (isMissingTable(e)) return { thisWeek: 0, thisMonth: 0 };
    throw err;
  }

  let thisWeek = 0;
  const thisMonth = rows.length;

  for (const row of rows) {
    const createdAt = new Date(row.created_at);
    if (createdAt >= sevenDaysAgo && createdAt <= now) thisWeek++;
  }

  return { thisWeek, thisMonth };
}
