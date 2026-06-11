// middleware.ts
// Branching middleware: portal paths → Supabase updateSession(); public paths → next-intl.
// D-09: single middleware.ts with split handling.
// Pitfall 2 guard: /login is included in PORTAL_PATHS so Supabase can refresh the session
// for already-authenticated users, but redirect logic (D-12) lives in the login page itself.

import createIntlMiddleware from 'next-intl/middleware';
import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Portal route prefixes. Any request whose pathname equals one of these
 * or starts with one followed by '/' is handled by Supabase updateSession().
 * All other requests are handled by next-intl.
 */
const PORTAL_PATHS = [
  '/login',
  '/dashboard',
  '/staff',
  '/appointments',
  '/patients',
  '/payroll',
  '/analytics',
  '/settings',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Portal routes: refresh Supabase JWT cookie on every request (T-04-01 mitigation).
  // updateSession() uses getUser() — re-validates with Auth server, never just cookie.
  if (PORTAL_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return await updateSession(request);
  }

  // Public site: next-intl handles locale routing (unchanged from Phase 3).
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Exclude Next.js internals and any paths with a file extension (static files).
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
};
