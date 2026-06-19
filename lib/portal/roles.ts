// lib/portal/roles.ts
// Single source of truth for role definitions and role-to-section access mapping.
// D-07: role → sections mapping (Phase 4 — Auth + Roles)

import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, CalendarClock, Users, UserCog, FileText, Settings, Image, BarChart2, Wallet } from 'lucide-react';

export type StaffRole = 'super_admin' | 'admin' | 'doctor' | 'receptionist';

export interface SectionConfig {
  key: string;
  label: string;
  href: string;
  icon?: LucideIcon;
}

/** Ordered list of all portal sections (used to build sidebar navigation). */
export const ALL_SECTIONS: SectionConfig[] = [
  { key: 'dashboard',     label: 'Dashboard',     href: '/dashboard',     icon: LayoutDashboard },
  { key: 'content',       label: 'Content',       href: '/content',       icon: FileText },
  { key: 'media',         label: 'Media',         href: '/media',         icon: Image },
  { key: 'staff',         label: 'Staff',         href: '/staff',         icon: UserCog },
  { key: 'appointments',  label: 'Appointments',  href: '/appointments',  icon: CalendarClock },
  { key: 'patients',      label: 'Patients',      href: '/patients',      icon: Users },
  { key: 'payroll',       label: 'Payroll',       href: '/payroll',       icon: Wallet },
  { key: 'analytics',     label: 'Analytics',     href: '/analytics',     icon: BarChart2 },
  { key: 'settings',      label: 'Settings',      href: '/settings',      icon: Settings },
];

/**
 * Maps each staff role to the section keys it is allowed to access.
 * D-07 exact mapping:
 *   super_admin  — all 8 sections (dashboard + content + 6 others)
 *   admin        — all except settings (7 sections; includes content)
 *   receptionist — dashboard + appointments + patients
 *   doctor       — dashboard + patients (own patients only — enforced in Phase 8)
 */
export const ROLE_SECTIONS: Record<StaffRole, string[]> = {
  super_admin:  ['dashboard', 'content', 'media', 'staff', 'appointments', 'patients', 'payroll', 'analytics', 'settings'],
  admin:        ['dashboard', 'content', 'media', 'staff', 'appointments', 'patients', 'payroll', 'analytics'],
  receptionist: ['dashboard', 'appointments', 'patients'],
  doctor:       ['dashboard', 'patients'],
};

/**
 * Returns true if the given role may access the given section key.
 * Use this in page RSCs to enforce server-side section-level authorization (CR-005).
 */
export function canAccessSection(role: StaffRole, sectionKey: string): boolean {
  return ROLE_SECTIONS[role]?.includes(sectionKey) ?? false;
}
