// app/(portal)/staff/layout.tsx
// Role-guard Server Component layout for all /portal/staff/* routes.
//
// T-06-02-01: super_admin and admin only — Receptionist and Doctor roles are
// redirected to /portal/dashboard before any staff page renders.
// Mirrors the exact pattern from app/(portal)/content/layout.tsx.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Re-validate with Auth server (never trust stale session).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch role + active status from the profiles table (server-side DB, not JWT).
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  // Missing profile or query error → treat as unauthenticated.
  if (error || !profile) {
    redirect('/login');
  }

  // Deactivated account — block entry.
  if (!profile.is_active) {
    redirect('/login');
  }

  // Only super_admin and admin may access /portal/staff/* routes.
  if (profile.role !== 'super_admin' && profile.role !== 'admin') {
    redirect('/portal/dashboard');
  }

  // Security-only layout — no visible UI. The portal root layout provides
  // the sidebar and chrome.
  return <>{children}</>;
}
