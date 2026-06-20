'use server';
// app/(portal)/actions/auth.ts
// Server Actions for portal authentication.
// D-10: successful login → redirect to /dashboard (all roles).
// D-11: signOutAction → redirect to /login.
// T-04-02 mitigation: Auth handled by Supabase signInWithPassword — no custom credential logic.

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

// ---------------------------------------------------------------------------
// In-memory rate limiter (WR-01 mitigation)
// Sliding window: max 5 attempts per IP per 15 minutes.
// NOTE: This resets on server restart and is per-instance only. For
// multi-instance deployments, prefer Supabase Auth rate limits or Redis.
// ---------------------------------------------------------------------------
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const loginAttempts = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const attempts = (loginAttempts.get(ip) ?? []).filter((t) => t > windowStart);
  attempts.push(now);
  loginAttempts.set(ip, attempts);
  return attempts.length > RATE_LIMIT_MAX;
}

/**
 * Authenticates a staff member with email and password.
 * On success: redirects to /dashboard.
 * On error: returns { error: string } for the login form to display.
 */
export async function loginAction(formData: {
  email: string;
  password: string;
}): Promise<{ error: string } | never> {
  const headersList = await headers();
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ??
    headersList.get('x-real-ip') ??
    'unknown';

  if (isRateLimited(ip)) {
    console.warn('[loginAction] rate limit exceeded for IP:', ip);
    return { error: 'Too many login attempts. Please try again later.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (error) {
    console.error('[loginAction] auth error:', error.message);
    return { error: 'Invalid email or password.' };
  }

  redirect('/dashboard');
}

/**
 * Signs out the current user and redirects to /login.
 */
export async function signOutAction(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
