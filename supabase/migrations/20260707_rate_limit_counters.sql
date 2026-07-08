-- Quick task 260707-uz0: Shared, race-safe rate limiting
-- Applies: manually via the Supabase dashboard SQL editor (no Supabase CLI config in this repo)
-- Run this entire file in one paste — all blocks are idempotent where noted.

-- ============================================================
-- 1. Counter table — one row per rate-limit key (e.g. "login:1.2.3.4")
--    idempotent via IF NOT EXISTS
-- ============================================================
create table if not exists rate_limit_counters (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

-- ============================================================
-- 2. Atomic check_rate_limit() function
--    Performs a SINGLE upsert statement (no separate read-then-write)
--    so concurrent requests cannot race past the limit (TOCTOU-safe).
--    Fixed-window algorithm: resets count to 1 once window_start is
--    older than p_window_ms; otherwise increments count in place.
--    Returns true when the request is allowed (count <= p_max),
--    false when the caller is over the limit.
-- ============================================================
create or replace function check_rate_limit(p_key text, p_max int, p_window_ms int)
returns boolean as $$
declare
  v_count int;
begin
  insert into rate_limit_counters (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
          when rate_limit_counters.window_start < now() - make_interval(secs => p_window_ms / 1000.0)
          then 1
          else rate_limit_counters.count + 1
        end,
        window_start = case
          when rate_limit_counters.window_start < now() - make_interval(secs => p_window_ms / 1000.0)
          then now()
          else rate_limit_counters.window_start
        end
  returning count into v_count;

  return v_count <= p_max;
end;
$$ language plpgsql;
