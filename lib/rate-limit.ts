import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Shared, race-safe rate limiter backed by the Supabase `check_rate_limit`
 * Postgres function (see supabase/migrations/20260707_rate_limit_counters.sql).
 * Replaces per-instance in-memory Map limiters so limits persist across
 * serverless cold starts and instances.
 *
 * Returns true when the request is allowed, false when the caller is over
 * the limit. On RPC error, fails OPEN (returns true) — a transient DB
 * hiccup should never hard-block legitimate users; origin/captcha/auth
 * checks remain the real gates.
 */
export async function checkRateLimit(
  key: string,
  opts: { max: number; windowMs: number }
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key: key,
    p_max: opts.max,
    p_window_ms: opts.windowMs,
  });

  if (error) {
    console.warn('checkRateLimit RPC failed, failing open', { key, error });
    return true;
  }

  return Boolean(data);
}
