'use client';
// components/portal/Sidebar.tsx
// Role-scoped sidebar navigation for the management portal.
// D-06: sidebar renders only sections permitted for the logged-in role (hide-not-lock).
// D-07: role → section mapping sourced from lib/portal/roles.ts (ROLE_SECTIONS).
// D-08: sections not permitted for the role are hidden entirely (not disabled/locked).
// T-04-04 mitigation: role read server-side from profiles; sidebar filters by ROLE_SECTIONS[role].
// D-15: collapsed state is session-only (component state, not localStorage).

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ALL_SECTIONS, ROLE_SECTIONS, StaffRole } from '@/lib/portal/roles';
import { signOutAction } from '@/app/(portal)/actions/auth';
import { ThemeToggle } from '@/components/portal/theme-toggle';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function PortalSidebar({ role }: { role: StaffRole }) {
  const [collapsed, setCollapsed] = useState(false);

  const allowed = new Set(ROLE_SECTIONS[role]);
  const visibleSections = ALL_SECTIONS.filter((s) => allowed.has(s.key));

  return (
    <aside
      className={cn(
        'flex flex-col min-h-screen transition-all duration-200 bg-sidebar text-sidebar-foreground border-r border-sidebar-border',
        collapsed ? 'w-12' : 'w-56'
      )}
    >
      {/* Hospital branding */}
      <div className={cn('border-b border-sidebar-border', collapsed ? 'px-2 py-5' : 'px-4 py-5')}>
        {collapsed ? (
          <div className="flex justify-center">
            <span className="text-xs font-bold text-sidebar-foreground">A</span>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/50">
              Atmaram
            </p>
            <p className="text-sm font-bold text-sidebar-foreground mt-0.5">Staff Portal</p>
          </>
        )}
      </div>

      {/* Navigation */}
      <TooltipProvider>
        <nav className="flex-1 px-2 py-4">
          <ul className="space-y-1">
            {visibleSections.map((section) => (
              <li key={section.key}>
                <Tooltip>
                  <TooltipTrigger render={
                    <Link
                      href={section.href}
                      className="flex items-center px-3 py-2 rounded-md hover:bg-sidebar-accent gap-3 text-sm font-medium text-sidebar-foreground/80 hover:text-sidebar-foreground transition-colors"
                    >
                      {section.icon && <section.icon className="h-5 w-5 shrink-0" />}
                      <span className={cn('truncate', collapsed && 'hidden')}>{section.label}</span>
                    </Link>
                  } />
                  {collapsed && (
                    <TooltipContent side="right">{section.label}</TooltipContent>
                  )}
                </Tooltip>
              </li>
            ))}
          </ul>
        </nav>
      </TooltipProvider>

      {/* Footer: theme toggle + sign-out + collapse toggle */}
      <div className={cn('border-t border-sidebar-border space-y-1', collapsed ? 'px-1 py-4' : 'px-2 py-4')}>
        {!collapsed && (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-sidebar-foreground/50">Theme</span>
            <ThemeToggle />
          </div>
        )}
        {!collapsed && (
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full flex items-center px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-left"
            >
              Sign out
            </button>
          </form>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="mt-auto flex items-center justify-center w-full p-3 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
