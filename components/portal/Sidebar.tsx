// components/portal/Sidebar.tsx
// Role-scoped sidebar navigation for the management portal.
// D-06: sidebar renders only sections permitted for the logged-in role (hide-not-lock).
// D-07: role → section mapping sourced from lib/portal/roles.ts (ROLE_SECTIONS).
// D-08: sections not permitted for the role are hidden entirely (not disabled/locked).
// T-04-04 mitigation: role read server-side from profiles; sidebar filters by ROLE_SECTIONS[role].

import Link from 'next/link';
import { ALL_SECTIONS, ROLE_SECTIONS, StaffRole } from '@/lib/portal/roles';
import { signOutAction } from '@/app/(portal)/actions/auth';

export function PortalSidebar({ role }: { role: StaffRole }) {
  const allowed = new Set(ROLE_SECTIONS[role]);
  const visibleSections = ALL_SECTIONS.filter((s) => allowed.has(s.key));

  return (
    <aside className="w-56 bg-slate-900 min-h-screen text-white flex flex-col">
      {/* Hospital branding */}
      <div className="px-4 py-5 border-b border-white/10">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Atmaram
        </p>
        <p className="text-sm font-bold text-white mt-0.5">Staff Portal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4">
        <ul className="space-y-1">
          {visibleSections.map((section) => (
            <li key={section.key}>
              <Link
                href={section.href}
                className="flex items-center px-3 py-2 rounded-md text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                {section.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sign-out */}
      <div className="px-2 py-4 border-t border-white/10">
        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full flex items-center px-3 py-2 rounded-md text-sm text-white/60 hover:text-white hover:bg-white/10 transition-colors text-left"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
