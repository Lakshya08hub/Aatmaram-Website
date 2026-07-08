---
phase: quick-260708-quc
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/20260708_security_advisor_fixes.sql
autonomous: false
requirements: [SEC-ADV-01, SEC-ADV-02]
must_haves:
  truths:
    - "check_rate_limit(text, int, int) has an explicit, pinned search_path (search_path = public), closing the Advisor 'Function Search Path Mutable' warning"
    - "appointment_requests has RLS enabled with NO policy, so PostgREST denies all anon/authenticated access while the service-role admin client (which bypasses RLS) continues to work unchanged"
    - "No application code changes are required; existing reads/writes via createAdminClient() behave identically"
    - "The new migration is idempotent-safe to run against the already-live database (ALTER-only, no CREATE of existing objects)"
  artifacts:
    - path: "supabase/migrations/20260708_security_advisor_fixes.sql"
      provides: "ALTER FUNCTION pinning check_rate_limit search_path + ALTER TABLE enabling RLS on appointment_requests"
      contains: "enable row level security"
  key_links:
    - from: "supabase/migrations/20260708_security_advisor_fixes.sql"
      to: "check_rate_limit function"
      via: "alter function ... set search_path"
      pattern: "alter function check_rate_limit"
    - from: "supabase/migrations/20260708_security_advisor_fixes.sql"
      to: "appointment_requests table"
      via: "alter table ... enable row level security"
      pattern: "appointment_requests enable row level security"
---

<objective>
Close the two real Supabase Security Advisor findings from the same-day follow-up to quick task 260707-uz0:

1. Pin the `search_path` on `check_rate_limit(text, int, int)` (Advisor Warning: "Function Search Path Mutable").
2. Enable RLS on `appointment_requests` with deliberately no policy (Advisor Error: "RLS Disabled in Public"), matching the deny-all-by-default pattern already used by `patient_records` and `payroll_payments`.

Purpose: The current `DISABLE ROW LEVEL SECURITY` on `appointment_requests` leaves it exposed via Supabase's auto-generated PostgREST API — anyone holding the client-side `NEXT_PUBLIC_SUPABASE_ANON_KEY` could query patient names, phones, and reasons directly, bypassing this app's auth layer. Enabling RLS with no policy denies anon/authenticated while the service-role admin client keeps working. The mutable search_path fix is standard Postgres hardening against search-path hijacking.

Output: One new migration file, `supabase/migrations/20260708_security_advisor_fixes.sql`. No application code changes.
</objective>

<execution_context>
@C:/Users/lakshya_new/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/lakshya_new/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@supabase/migrations/20260707_rate_limit_counters.sql
@supabase/migrations/20260612_appointment_requests.sql
@supabase/migrations/20260613_patient_records.sql

<notes>
- This repo has NO Supabase CLI config. Migrations are applied manually by pasting into the Supabase Dashboard SQL editor (same as 260707-uz0).
- Do NOT edit the already-applied 20260707 or 20260612 migrations in place. Both fixes go in a NEW file via idempotent ALTER statements.
- `check_rate_limit` signature is `check_rate_limit(p_key text, p_max int, p_window_ms int)` — reference it by type list as `check_rate_limit(text, int, int)`.
- `patient_records` (20260613) is the reference for the RLS comment style: "Enable RLS: deny all access to anon/authenticated roles by default. All legitimate access goes through the service-role admin client (createAdminClient), which bypasses RLS."
- Deliberately do NOT add any RLS policy to appointment_requests — no legitimate access path needs anon/authenticated grants.
- Out of scope (do NOT touch): other Advisor findings (update_patient_record/update_testimonials search_path, storage.media public bucket, rls_auto_enable SECURITY DEFINER, Leaked Password Protection auth setting).
</notes>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write the security-advisor-fixes migration</name>
  <files>supabase/migrations/20260708_security_advisor_fixes.sql</files>
  <action>
Create the new migration file with a header comment matching this repo's style (see 20260707/20260612 headers), then two clearly separated, commented sections — both idempotent-safe ALTER statements that can be re-run against the live database.

File contents:

- Header comment block: note this is quick task 260708-quc closing two Supabase Security Advisor findings (search_path on check_rate_limit; RLS on appointment_requests), and that it is applied manually via the Supabase Dashboard SQL editor (no Supabase CLI config in this repo).

- Section 1 — Function Search Path Mutable (Advisor Warning). Comment explaining that pinning search_path prevents search-path hijacking (a user with schema-create privileges shadowing referenced objects). Statement:
  `alter function check_rate_limit(text, int, int) set search_path = public;`

- Section 2 — RLS Disabled in Public (Advisor Error). Comment matching the style/rationale in 20260613_patient_records.sql, and explicitly noting this closes a gap from the original D-02/D-11 decision: RLS was disabled based on "service role only access" reasoning that did not account for PostgREST's default anon/authenticated grants bypassing the app layer entirely. Enabling RLS with NO policy denies anon/authenticated via PostgREST while the service-role admin client (createAdminClient) bypasses RLS and continues to work. Statement:
  `alter table appointment_requests enable row level security;`

Do NOT add any RLS policy. Do NOT create tables/functions/enums (they already exist). Do NOT modify any .ts files.
  </action>
  <verify>
    <automated>grep -ic "alter function check_rate_limit(text, int, int) set search_path = public" supabase/migrations/20260708_security_advisor_fixes.sql</automated>
    Also confirm the RLS statement is present: `grep -ic "alter table appointment_requests enable row level security" supabase/migrations/20260708_security_advisor_fixes.sql` returns 1, and no policy was added: `grep -ic "create policy" supabase/migrations/20260708_security_advisor_fixes.sql` returns 0.
  </verify>
  <done>The file `supabase/migrations/20260708_security_advisor_fixes.sql` exists with both ALTER statements (search_path pin + RLS enable), header + section comments matching repo style, and no policy or object-creation statements.</done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <what-built>The migration SQL in `supabase/migrations/20260708_security_advisor_fixes.sql`: (1) `alter function check_rate_limit(text, int, int) set search_path = public;` and (2) `alter table appointment_requests enable row level security;` (deny-all-by-default, no policy). This repo has no Supabase CLI config, so migrations are applied manually.</what-built>
  <how-to-verify>
    1. Open the Supabase Dashboard → SQL Editor for this project.
    2. Paste the full contents of `supabase/migrations/20260708_security_advisor_fixes.sql` and run it.
    3. Confirm both statements run with no errors.
    4. (Optional) Re-run the Security Advisor scan and confirm:
       - The "Function Search Path Mutable" warning on `check_rate_limit` is gone.
       - The "RLS Disabled in Public" Error on `appointment_requests` is gone. It may now appear as an Info-level "RLS enabled, no policy" entry — that is the expected, correct end state, matching `patient_records` and `payroll_payments`, NOT a new problem.
    5. (Optional sanity) Confirm the app still works: submit an appointment via the public form and view it in the portal — both paths use the service-role admin client and should be unaffected by the RLS change.
  </how-to-verify>
  <resume-signal>Type "applied" once both statements run cleanly, or paste any SQL error.</resume-signal>
</task>

</tasks>

<verification>
- New migration file exists with both idempotent ALTER statements and no policy/object-creation.
- After manual application: Advisor no longer reports the two findings; appointment_requests shows RLS-enabled-no-policy (Info), matching sibling tables.
- App behavior unchanged (service-role paths bypass RLS).
</verification>

<success_criteria>
- `check_rate_limit(text, int, int)` has `search_path = public` pinned.
- `appointment_requests` has RLS enabled with no policy.
- Zero application code changes; existing createAdminClient() reads/writes work identically.
</success_criteria>

<output>
Create `.planning/quick/260708-quc-fix-2-supabase-security-advisor-findings/260708-quc-SUMMARY.md` when done.
</output>
