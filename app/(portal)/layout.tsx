// app/(portal)/layout.tsx
// Auth-guarded Server Component layout for the management portal.
// Runs once, wraps every portal route (Architectural Responsibility Map).
//
// T-04-03 mitigation: getUser() re-validates with Auth server; unauthenticated → redirect('/login').
// T-04-05 mitigation: inactive account → signOut() + redirect('/login') (D-05).
// T-04-08 mitigation: getUser() used (NOT getSession()) — acceptance gate greps for 0 getSession.
// D-09: layout is outside [locale] segment — renders its own <html lang="en"><body> shell.
// D-11: /login lives at app/login/ (outside this layout) so no redirect loop occurs.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PortalSidebar } from '@/components/portal/Sidebar';
import { Toaster } from '@/components/ui/sonner';

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // T-04-03 / T-04-08: Re-validate with Auth server — never trust stale session alone.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // AUTH-03 / D-05: Fetch role + active status from profiles table (server-side DB, not JWT).
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .single();

  // T-04-05: Missing profile or deactivated account → sign out and block entry.
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <PortalSidebar role={profile.role} />
          <main className="flex-1 bg-slate-50">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
