---
status: resolved
trigger: "Proactive security audit — check for SSTI, ReDoS, LPDoS, Secret Key Leak, NoSQL/SQL Injection, Clipboard Attack, Replay Attack across the full site"
created: 2026-06-14
updated: 2026-06-14
---

# Debug Session: security-audit-full-site

## Symptoms

- **Expected:** No exploitable security vulnerabilities present in any layer
- **Actual:** Unknown — proactive pre-launch check before site goes live
- **Error messages:** None observed
- **Timeline:** Newly built Next.js + Supabase site, never been in production
- **Reproduction:** Targeted attack vectors listed below

## Scope

- Public site (patient-facing): homepage, appointment form, doctors/departments pages
- Portal (staff login): CMS, content management, staff-only actions
- API / Server Actions: toggleFeatured, setFeaturedOrder, all server actions in app/(portal)/actions/
- Supabase / DB layer: SQL queries, auth, RLS policies

## Vulnerabilities to Audit

1. **SSTI** (Server-Side Template Injection)
2. **ReDoS** (Regular Expression Denial of Service)
3. **LPDoS** (resource exhaustion DoS)
4. **Secret Key Leak**
5. **NoSQL/SQL Injection**
6. **Clipboard Attack**
7. **Replay Attack**

## Evidence

- timestamp: 2026-06-14T00:00:00Z
  file: app/(portal)/actions/content.ts
  note: "All server actions call requireCmsRole() / requireAdminRole() which calls supabase.auth.getUser() (re-validates with server). Uses Supabase query builder — no raw SQL. table param in toggleFeatured/setFeaturedOrder is typed as FeaturedTable union literal."

- timestamp: 2026-06-14T00:00:00Z
  file: app/api/chat/route.ts
  note: "Accepts open POST requests from public. No authentication, no rate limiting, no IP throttling. Slices last 20 messages but does not limit individual message length. GEMINI_API_KEY is server-only (process.env, not NEXT_PUBLIC_)."

- timestamp: 2026-06-14T00:00:00Z
  file: app/[locale]/layout.tsx:38
  note: "dangerouslySetInnerHTML used for GA4 inline script. The injected value is process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID interpolated directly at build time. This is a server-side string interpolation with an env var — not user input."

- timestamp: 2026-06-14T00:00:00Z
  file: app/(portal)/actions/content.ts:350
  note: "setFeaturedOrder returns early with {} (success) before requireCmsRole() when order is NaN or < 0. Unauthenticated caller can probe this endpoint to get a success response without credentials."

- timestamp: 2026-06-14T00:00:00Z
  file: lib/supabase/admin.ts
  note: "SUPABASE_SERVICE_ROLE_KEY read from process.env at call time, never assigned to NEXT_PUBLIC_* var. GEMINI_API_KEY same. .env.local is gitignored. .env.example committed — contains only placeholder values, not real secrets."

- timestamp: 2026-06-14T00:00:00Z
  file: lib/actions/submitAppointmentAction.ts
  note: "hCaptcha verification runs before insert. Preferred time is allowlist-validated. All inserts go through Supabase query builder parameterized API — no raw SQL."

- timestamp: 2026-06-14T00:00:00Z
  file: app/(portal)/actions/patients.ts
  note: "Zod schema validates all patient inputs. Clinical notes update checks record ownership (assigned_doctor_id === doctorRow.id) before allowing write."

- timestamp: 2026-06-14T00:00:00Z
  file: middleware.ts
  note: "Portal paths matched by prefix list and routed to Supabase updateSession(). Public paths handled by next-intl. API routes excluded from matcher — /api/chat has no middleware-level protection."

- timestamp: 2026-06-14T00:00:00Z
  file: next.config.ts
  note: "No productionBrowserSourceMaps: true set. Default Next.js behavior: source maps not served in production builds. No custom headers configured."

## Findings

### 1. SSTI — NOT APPLICABLE

No templating engine is used. The codebase uses React JSX (compiled, not evaluated at runtime). The only `dangerouslySetInnerHTML` is in `app/[locale]/layout.tsx` for the GA4 init script, and the injected content (`NEXT_PUBLIC_GA_MEASUREMENT_ID`) is resolved from a server environment variable at build time — not from user input. There is no eval(), template literal injection, or server-side string interpolation of user data.

Verdict: NOT APPLICABLE

### 2. ReDoS — NOT APPLICABLE

No custom regular expressions found in any .ts source file. Zod validators use built-in methods (min, max, string, uuid). hCaptcha token is passed opaquely to the hCaptcha API — not regex-validated locally. No user-supplied regex patterns accepted anywhere.

Verdict: NOT APPLICABLE

### 3. LPDoS — CONFIRMED (LOW SEVERITY)

**Attack surface:** `POST /api/chat`

The Gemini chat endpoint is public (no auth, no rate limiting). A caller can:
- Send 20 messages (the slice cap) each up to unconstrained string length
- Trigger a Gemini API streaming call per request
- Repeat rapidly from multiple IPs

There is no per-IP rate limiting, no request body size limit beyond Next.js defaults (~4 MB), and no cost throttle. While individual message count is capped at 20, individual message `content` strings have no length cap, so a single request can send 20 × arbitrary-length strings to Gemini, amplifying compute cost.

The appointment form is protected by hCaptcha — not an LPDoS vector.

**Exploit path:**
```
POST /api/chat
Body: { messages: Array(20).fill({ role: "user", content: "A".repeat(100000) }) }
```
Repeated by a botnet: generates uncapped Gemini API calls, exhausting API quota and driving up cost.

**Fix required:** Add per-IP rate limiting (e.g. `upstash/ratelimit` or `@vercel/edge-config`), message length cap (e.g. 2000 chars per message), and total payload size validation before calling the Gemini API.

### 4. Secret Key Leak — NOT APPLICABLE (with one note)

- `SUPABASE_SERVICE_ROLE_KEY` — named without `NEXT_PUBLIC_` prefix, read only in `lib/supabase/admin.ts` inside server actions and route handlers. Never referenced in client code.
- `GEMINI_API_KEY` — same pattern. Used only in `app/api/chat/route.ts` (server-side route handler).
- `HCAPTCHA_SECRET` — same pattern.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — intentionally public (Supabase design; anon key is safe with RLS).
- `.env.local` is gitignored. `.env.example` contains only placeholder strings.
- Source maps: `productionBrowserSourceMaps` not enabled in `next.config.ts` — Next.js default does not expose source maps in production builds.

**Note:** `NEXT_PUBLIC_GA_MEASUREMENT_ID` is embedded in the page HTML (GA4 measurement IDs are public by design — this is not a secret).

Verdict: NOT APPLICABLE

### 5. NoSQL/SQL Injection — NOT APPLICABLE

The entire codebase uses the Supabase JavaScript query builder exclusively. The query builder uses parameterized queries internally — no raw SQL strings constructed from user input anywhere in the codebase. The `table` parameter in `toggleFeatured` and `setFeaturedOrder` is typed as a TypeScript union literal (`'departments' | 'doctors' | 'facilities'`) — only those three strings are accepted. Patient, appointment, and staff actions use Zod-validated inputs passed to builder methods.

No `.rpc()` calls with user-supplied SQL fragments were found.

Verdict: NOT APPLICABLE

### 6. Clipboard Attack — NOT APPLICABLE

No Clipboard API usage found anywhere in the codebase. The only `dangerouslySetInnerHTML` is the GA4 init block (build-time env var, not user data). All chat widget messages are rendered as React text nodes (confirmed in planning docs: "message.content rendered as React text node, not dangerouslySetInnerHTML"). No `innerHTML` assignment found.

Verdict: NOT APPLICABLE

### 7. Replay Attack — PLAUSIBLE (LOW SEVERITY, requires clarification)

**JWT replay:** Supabase JWTs have an `exp` claim. The middleware calls `updateSession()` on every portal request, which re-validates with the Supabase Auth server and refreshes the token. Stolen JWTs are exploitable only within their TTL window (typically 1 hour for Supabase). This is the standard Supabase security model — no additional mitigation is practical without short-TTL + refresh-token rotation (which Supabase handles automatically).

**CSRF:** Next.js server actions (called via `fetch` with `Content-Type: application/x-www-form-urlencoded` or JSON from the same origin) are protected from cross-origin form submission by the Next.js Same-Origin enforcement on Server Actions — the framework rejects cross-origin server action calls by default. The appointment public form action goes through a server action (`submitAppointmentAction`) which is already CAPTCHA-protected.

**Idempotency probe (already flagged):** `setFeaturedOrder` returns `{}` (HTTP 200 with empty body) before calling `requireCmsRole()` when `order` is NaN or negative. An unauthenticated attacker can distinguish "I got a success response" from an auth error by probing this endpoint. This leaks behavioral information about the server action dispatch without authentication. It is not a data-modification vulnerability (the database write never happens), but it is an information-disclosure issue and violates the principle that auth should gate the entire action.

**Fix for setFeaturedOrder:** Move the NaN/negative guard to after `requireCmsRole()`, or return an auth error for unauthenticated calls regardless of input validity.

Verdict: PLAUSIBLE (low) — the `setFeaturedOrder` early-return is an unauthenticated probe vector.

## Current Focus

hypothesis: "Audit complete — two issues found: LPDoS on /api/chat (no rate limit), and unauthenticated probe via setFeaturedOrder early return"
test: "Static analysis across all 7 vulnerability classes"
expecting: "Fixes applied to chat route (rate limit + length cap) and setFeaturedOrder (auth before guard)"
next_action: "apply fixes"
reasoning_checkpoint: "All 7 classes investigated. SSTI/ReDoS/SecretLeak/SQLi/Clipboard all clear. Two real issues: LPDoS and partial Replay/probe."

## Resolution

root_cause: "Two issues: (1) /api/chat has no rate limiting or message length cap, enabling cost-amplification DoS against Gemini API. (2) setFeaturedOrder returns success before requireCmsRole(), enabling unauthenticated behavioral probing."

fix: "Add per-IP rate limiting + per-message length cap to /api/chat. Move NaN/negative guard in setFeaturedOrder to after requireCmsRole() call."
