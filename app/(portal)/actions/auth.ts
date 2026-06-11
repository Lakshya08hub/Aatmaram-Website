'use server';
// app/(portal)/actions/auth.ts
// Server Actions for portal authentication.
// D-10: successful login → redirect to /dashboard (all roles).
// D-11: signOutAction → redirect to /login.
// T-04-02 mitigation: Auth handled by Supabase signInWithPassword — no custom credential logic.

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Authenticates a staff member with email and password.
 * On success: redirects to /dashboard.
 * On error: returns { error: string } for the login form to display.
 */
export async function loginAction(formData: {
  email: string;
  password: string;
}): Promise<{ error: string } | never> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (error) {
    return { error: error.message };
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
