import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client authenticated with the service role key.
 * Use this ONLY in Server Actions and Route Handlers — never expose this
 * client or its key to the browser.
 *
 * T-05-01 mitigation: key read from process.env at call-time (server-only);
 * never serialised into client bundles.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. ' +
      'Add it to .env.local (get the value from Supabase Dashboard → Project Settings → API).'
    );
  }

  return createClient(url!, serviceRoleKey, {
    auth: {
      // Service-role clients are stateless — no session persistence needed.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
