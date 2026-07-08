'use server';
// app/(portal)/actions/auth.ts
// Server Actions for portal authentication.
// D-10: successful login → redirect to /dashboard (all roles).
// D-11: signOutAction → redirect to /login.
// T-04-02 mitigation: Auth handled by Supabase signInWithPassword — no custom credential logic.

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { checkRateLimit } from '@/lib/rate-limit';

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

  if (!(await checkRateLimit('login:' + ip, { max: 5, windowMs: 15 * 60 * 1000 }))) {
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
