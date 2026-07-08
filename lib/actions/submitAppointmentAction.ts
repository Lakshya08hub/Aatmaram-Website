'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

// ---------------------------------------------------------------------------
// CR-01: Server-side input validation — runs before hCaptcha and DB insert
// ---------------------------------------------------------------------------
const appointmentSchema = z.object({
  patientName:     z.string().min(2).max(100),
  phone:           z.string().regex(/^[6-9]\d{9}$/),
  preferredDoctor: z.string().min(1).max(100),
  preferredDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredTime:   z.enum(['morning', 'afternoon', 'evening']),
  reason:          z.string().min(10).max(1000),
  captchaToken:    z.string().min(1),
})

export async function submitAppointmentAction(rawInput: unknown): Promise<{ error?: string }> {
  // Step 0: Validate input shape and lengths
  const parsed = appointmentSchema.safeParse(rawInput)
  if (!parsed.success) return { error: 'Invalid input.' }
  const input = parsed.data

  try {
    // Step 1: Rate limit by caller IP
    const { headers } = await import('next/headers')
    const hdrs = await headers()
    const ip =
      hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      hdrs.get('x-real-ip') ??
      'unknown'
    if (!(await checkRateLimit('appt:' + ip, { max: 5, windowMs: 60_000 }))) {
      return { error: 'Too many requests. Please wait a moment and try again.' }
    }

    // Step 2: Verify hCaptcha manually — Supabase native hCaptcha is auth-only, not for custom inserts
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

    // Step 3: Validate preferred_date is not in the past (WR-04 defence-in-depth)
    const today = new Date().toISOString().split('T')[0]
    if (input.preferredDate < today) {
      return { error: 'Please select a valid date from today onwards.' }
    }

    // Step 4: Insert via service role — bypasses RLS (D-02)
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
