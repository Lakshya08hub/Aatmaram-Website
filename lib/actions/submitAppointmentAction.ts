'use server'

import { createAdminClient } from '@/lib/supabase/admin'

const VALID_TIMES = ['morning', 'afternoon', 'evening'] as const
type PreferredTime = typeof VALID_TIMES[number]

export async function submitAppointmentAction(input: {
  patientName: string
  phone: string
  preferredDoctor: string
  preferredDate: string
  preferredTime: string
  reason: string
  captchaToken: string
}): Promise<{ error?: string }> {
  try {
    // Step 1: Verify hCaptcha manually — Supabase native hCaptcha is auth-only, not for custom inserts
    const verifyRes = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.HCAPTCHA_SECRET!,
        response: input.captchaToken,
      }),
    })
    const verifyData = (await verifyRes.json()) as { success: boolean }
    if (!verifyData.success) {
      return { error: 'CAPTCHA verification failed. Please try again.' }
    }

    // Step 2: Validate preferred_time
    if (!VALID_TIMES.includes(input.preferredTime as PreferredTime)) {
      return { error: 'Invalid time slot selected.' }
    }

    // Step 3: Insert via service role — bypasses RLS (D-02)
    const adminClient = createAdminClient()
    const { error } = await adminClient.from('appointment_requests').insert({
      patient_name: input.patientName,
      phone: input.phone,
      preferred_doctor:
        input.preferredDoctor === 'no-preference'
          ? 'No Preference'
          : input.preferredDoctor,
      preferred_date: input.preferredDate,
      preferred_time: input.preferredTime,
      reason: input.reason,
      status: 'pending',
    })

    if (error) throw new Error(error.message)

    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
