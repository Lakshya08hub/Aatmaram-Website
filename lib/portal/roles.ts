// lib/portal/roles.ts
// Single source of truth for role definitions and role-to-section access mapping.
// D-07: role → sections mapping (Phase 4 — Auth + Roles)

export type StaffRole = 'super_admin' | 'admin' | 'doctor' | 'receptionist';

export interface SectionConfig {
  key: string;
  label: string;
  href: string;
}

/** Ordered list of all portal sections (used to build sidebar navigation). */
export const ALL_SECTIONS: SectionConfig[] = [
  { key: 'dashboard',     label: 'Dashboard',     href: '/dashboard' },
  { key: 'content',       label: 'Content',       href: '/content' },
  { key: 'staff',         label: 'Staff',         href: '/staff' },
  { key: 'appointments',  label: 'Appointments',  href: '/appointments' },
  { key: 'patients',      label: 'Patients',      href: '/patients' },
  { key: 'payroll',       label: 'Payroll',       href: '/payroll' },
  { key: 'analytics',     label: 'Analytics',     href: '/analytics' },
  { key: 'settings',      label: 'Settings',      href: '/settings' },
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
  super_admin:  ['dashboard', 'content', 'staff', 'appointments', 'patients', 'payroll', 'analytics', 'settings'],
  admin:        ['dashboard', 'content', 'staff', 'appointments', 'patients', 'payroll', 'analytics'],
  receptionist: ['dashboard', 'appointments', 'patients'],
  doctor:       ['dashboard', 'patients'],
};
