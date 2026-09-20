---
name: auth-patterns
description: Implementation patterns for authentication and authorization flows — login/registration, session strategy (cookies vs JWT), OAuth/SSO, password reset, email verification, session expiration, and role-based access control (RBAC). Consult this whenever building or modifying any auth-related flow. Mandatory for Authentication Engineer before implementation. Distinct from `security-audit`: that skill covers what makes auth *vulnerable*, this skill covers how to *build* the flow correctly in the first place — both apply to every auth task, use them together.
---

# Auth Patterns

How to build authentication and authorization flows correctly the
first time — not just what makes them vulnerable (that's
`security-audit` §1-2, which every auth task must also pass). Use both
skills together: this one for flow design, that one for the
vulnerability checklist before calling it done.

---

## 1. Session strategy — pick deliberately, record the choice

- **Server-side sessions (cookie + session store)**: simplest to revoke
  instantly (delete the session server-side), naturally supports
  server-side logout-everywhere. Requires a session store (DB/Redis) and
  doesn't scale as trivially stateless across services.
- **JWT (stateless token)**: no server-side lookup needed to validate,
  scales easily across services — but genuinely hard to revoke before
  expiry (the token is valid until it expires, unless a
  revocation/blocklist mechanism is added, which reintroduces state
  anyway). Keep JWT lifetimes short if used, and pair with a refresh
  token that *is* revocable server-side.
- Whichever is chosen, record it in `.agents/knowledge/architecture.md`
  (API layer section) so Frontend/Backend Engineers build against a
  consistent, understood mechanism — don't let different endpoints
  assume different auth mechanisms.
- Cookies, if used: `HttpOnly` (not readable by JS, mitigates XSS token
  theft), `Secure` (HTTPS only), `SameSite=Lax` or `Strict` (CSRF
  mitigation) — set all three unless there's a specific documented
  reason not to.

## 2. Login & registration flow

- Never reveal via response difference (message, timing) whether a
  specific email is registered — a generic *"If that email exists,
  we've sent a reset link"* on both password reset request and,
  ideally, similar care on login failure messaging (a slightly harder
  trade-off there — balance against usability, but never say
  "email not found" specifically on login for a public-facing app).
- Rate-limit login attempts (per `security-audit` §1) — implement
  before this ships, not as a follow-up.
- Registration: validate email format and, where relevant, verify
  ownership (§4) before treating the account as fully active — decide
  explicitly whether unverified accounts can do anything beyond basic
  browsing.
- Client-side validation is for UX responsiveness only — the server
  re-validates everything regardless of what the client already checked.

## 3. Password handling

Hashing/storage specifics live in `security-audit` §1 — this section
is about the surrounding flow:
- Enforce a real minimum standard (length matters more than forced
  character-class complexity — NIST guidance favors long passphrases
  over "must contain a symbol") and check against commonly-breached
  password lists if the stack has a library for it.
- Show password strength/requirements *before* the user submits, not
  as a rejection after — better UX (`ux-principles` §3) and fewer
  frustrated retries.
- Never log a password, even at debug level, even temporarily — full
  stop.

## 4. OAuth / SSO integration

- Always validate the `state` parameter on the OAuth callback — this
  is the CSRF protection for the auth flow itself; skipping it is a
  real, common vulnerability.
- Validate the token/response actually came from the provider (signature
  verification, or use a well-maintained library rather than hand-
  rolling the protocol — OAuth has enough subtlety that hand-rolled
  implementations are a frequent source of bugs).
- Decide explicitly how an OAuth login maps to an existing account if
  the same email already has a password-based account — silently
  merging accounts based on email match alone has security implications
  (an attacker who controls a matching email on the OAuth provider
  could hijack an existing account) — this needs a deliberate decision,
  not a default.

## 5. Password reset & email verification

- Reset/verification tokens: single-use, time-limited (e.g. 15-60
  minutes for reset, longer acceptable for verification), invalidated
  immediately once used or once a new one is requested.
- Send the token via the verified channel (email) — never return it
  directly in the API response "to make testing easier," even in
  early development; build a way to inspect it in dev tooling instead.
- After a successful password reset, invalidate all existing sessions
  for that account (force re-login everywhere) — a reset is often
  triggered because a credential was compromised.

## 6. Session expiration & refresh

- Set explicit, deliberate expiration — not "never expires" by default.
  Balance against UX: a reasonable session length for the product's
  actual risk profile (a banking app and a recipe blog have very
  different reasonable defaults).
- If using refresh tokens: refresh token itself should be revocable
  and ideally rotated on each use (rotation detects token theft — if a
  stolen refresh token is used after the legitimate one already rotated,
  that's a signal to invalidate the whole session family).
- Expire sessions server-side on password change, on explicit
  "log out everywhere," and optionally on detected suspicious activity.

## 7. Role-based access control (RBAC)

- Model roles/permissions explicitly — don't scatter ad-hoc
  `if (user.email === 'admin@...')` checks through the codebase.
- Prefer permission checks over role checks where the system might grow
  more roles later (`canEditOrder`, not `role === 'manager'` sprinkled
  everywhere) — makes adding a new role that shares some permissions
  much easier later.
- Enforce every check server-side (see `security-audit` §2) — the
  client-side role display is for UX only, never the actual gate.
- Default to least privilege for any new role/endpoint — require an
  explicit grant rather than defaulting new functionality to accessible
  by everyone "for now."

## 8. Before handing off

- Is the session strategy consistent with what's already documented in
  `architecture.md`, not a new pattern introduced ad hoc?
- Are reset/verification tokens single-use and time-limited?
- Is OAuth `state` validated, and is the account-linking behavior a
  deliberate decision?
- Are all role/permission checks enforced server-side?
- Has this been handed to Security Auditor (6.23) per the mandatory
  handoff in `AGENTS.md` §4.16 — auth work is never "done" without that
  pass?