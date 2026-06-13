// app/(portal)/content/layout.tsx
// Role-guard Server Component layout for all /portal/content/* routes.
//
// T-05-03 mitigation: super_admin and admin only — Receptionist and Doctor
// roles are redirected to /portal/dashboard before any content page renders.
// Sidebar link visibility alone is insufficient; this layout is the
// authoritative server-side gate.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function ContentLayout({
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

  // T-05-03: Only super_admin and admin may access /portal/content/* routes.
  if (profile.role !== 'super_admin' && profile.role !== 'admin') {
    redirect('/portal/dashboard');
  }

  const tabs = [
    { label: 'Departments', href: '/content/departments' },
    { label: 'Doctors', href: '/content/doctors' },
    { label: 'Facilities', href: '/content/facilities' },
    { label: 'Hospital Info', href: '/content/hospital-info' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <div className="border-b border-slate-200 bg-white px-6">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="px-4 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 border-b-2 border-transparent hover:border-slate-300 transition-colors"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
