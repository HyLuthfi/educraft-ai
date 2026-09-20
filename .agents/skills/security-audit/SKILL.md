---
name: security-audit
description: Security checklist covering authentication/authorization vulnerabilities, injection, XSS, CSRF, IDOR, sensitive data exposure, insecure file uploads, session security, and secret management, plus adversarial testing technique for probing these. Consult this whenever building or reviewing anything that handles user input, authentication, payments, file uploads, or personal data — mandatory for Security Auditor, Privacy/Data Security Agent, Adversarial Agent, and any Backend/Auth Engineer before marking auth/payment/PII-touching work as done. This is defensive: finding and fixing vulnerabilities in code this team owns, never for attacking systems outside this project.
---

# Security Audit

Security review of code this team owns and is responsible for — every
check here is defensive: find the vulnerability in *our* code, report
it with severity and a concrete fix, verify the fix. This skill is
never used to develop attacks against systems outside this project.

Applies to Security Auditor (6.23, checklist-driven review), Privacy/
Data Security Agent (6.24, data-exposure focus), and Adversarial Agent
(6.25, active probing) — and to any Backend/Auth Engineer, who must run
the relevant parts of this checklist on their own work *before* it's
considered done, not just when it reaches the Security team.

---

## 1. Authentication & session security

- Passwords hashed with a modern algorithm (bcrypt/argon2/scrypt) —
  never plain text, never a fast general-purpose hash (MD5/SHA1/SHA256
  alone) without proper salting and work factor.
- Session tokens are random, long, and unpredictable — never
  sequential or derived from guessable data (user ID, timestamp alone).
- Sessions expire appropriately and are invalidated on logout and on
  password change.
- Rate-limit login attempts; lock or delay after repeated failures to
  slow credential-stuffing/brute-force attacks.
- Password reset flows: token is single-use, time-limited, and
  invalidated once used; never reveal whether an email exists in the
  system through response timing or message differences.
- Multi-factor/OAuth flows validate state/nonce parameters to prevent
  replay and CSRF on the auth flow itself.

## 2. Authorization & access control (IDOR)

The single most common real-world vulnerability class in web apps —
check this on **every** endpoint that takes an ID:

- Never trust a client-supplied ID alone. When a request references a
  resource (`/orders/123`, `/users/45/profile`), verify server-side
  that the *authenticated* user is actually allowed to access that
  specific resource — not just that they're logged in.
- Test by substitution: as User A, try accessing/modifying User B's
  resource by changing the ID. If it succeeds, that's an IDOR — Critical
  or High depending on data sensitivity.
- Role checks happen server-side, always. A hidden button or
  disabled UI element is not access control — the API endpoint itself
  must enforce it.
- Check both read *and* write paths — an endpoint that correctly
  blocks viewing another user's data but not editing it is still broken.

## 3. Injection

- **SQL/NoSQL injection**: parameterized queries / prepared statements
  always, for every query built with any user-influenced input — never
  string-concatenate user input into a query.
- **Command injection**: never pass user input directly to a shell
  command; use a library's safe argument-array form, never string
  interpolation into a shell string.
- **Template injection**: be careful with any templating engine that
  evaluates expressions from user-controllable input.
- Validate and sanitize input at the boundary (API/form entry), and
  treat *all* external input as untrusted — including data from a
  third-party API response, not just direct user typing.

## 4. Cross-site scripting (XSS)

- Never render user-supplied content as raw HTML. Use the framework's
  default escaping; if `dangerouslySetInnerHTML` (or equivalent) is
  ever necessary, sanitize with a real library first and document why
  it's needed.
- Be specific about context: HTML-context escaping is different from
  attribute-context or URL-context escaping — use the right one, don't
  assume one function covers all injection points.
- Content-Security-Policy header as defense-in-depth, not a substitute
  for escaping.

## 5. CSRF

- State-changing requests (POST/PUT/DELETE) require a CSRF token or
  equivalent (SameSite cookie configuration, double-submit cookie) —
  don't rely on a cookie being present alone as proof of intent.
- Sensitive actions (password change, payment, account deletion)
  deserve re-authentication or an extra confirmation step even beyond
  standard CSRF protection.

## 6. File uploads

- Validate file type by actual content (magic bytes), not just the
  extension or client-reported MIME type — both are trivially spoofable.
- Enforce a size limit server-side, not just in the UI.
- Store uploads outside the web root or in object storage, never
  directly executable from a user-guessable path; rename to a
  generated ID, don't trust the user's filename.
- Scan/limit what file types are accepted based on actual need — don't
  accept arbitrary types "just in case."

## 7. Sensitive data exposure (Privacy/Data Security Agent, 6.24)

- API responses return only what the client actually needs — never
  the full DB row "because it was easier" (leaking password hashes,
  internal flags, other users' data in a list response).
- Error messages shown to users never leak stack traces, internal file
  paths, DB schema, or library versions — log detail server-side, show
  a generic message to the user (see `code-quality` §5, `ux-principles`
  heuristic 9).
- Logs never contain passwords, full card numbers, tokens, or other
  secrets — redact before logging, not after.
- Client-side storage (localStorage, cookies, app state) holds the
  minimum necessary — never store a password, and think twice before
  storing anything sensitive client-side at all, since it's readable
  by any script running on the page.
- PII handling matches what was actually consented to/disclosed —
  flag to the human if a feature seems to collect more than it needs.

## 8. Secrets management

- No API keys, credentials, or tokens in source code, ever — env vars
  or a secrets manager, and confirm `.env`/equivalent is actually
  git-ignored.
- If a secret is found already committed to version control history,
  flag to the human immediately (per `rules/core-guardrails.md`) —
  rotating it is a human decision, not something to silently do.
- Different secrets per environment (dev/staging/prod) — a leaked dev
  key should never be a production-impacting event.

## 9. Insecure configuration & dependencies

- Default credentials changed, unnecessary services/ports disabled,
  verbose debug/error output disabled in production.
- CORS configured to the actual set of trusted origins, never `*`
  alongside credentialed requests.
- Cross-reference with Dependency Auditor (8.31) findings — a known-CVE
  package is a security issue, not just a code-quality one.

## 10. Adversarial testing technique (Adversarial Agent, 6.25)

Different posture from the checklist above — actively try to break in,
then report what worked:

- **Request manipulation**: alter parameters, headers, cookies outside
  what the UI normally sends; does the server still validate correctly?
- **Authorization bypass**: try every role/permission boundary from the
  unauthorized side — logged out, wrong role, wrong tenant/account.
- **ID/parameter tampering**: systematically substitute IDs, especially
  sequential ones, to probe for IDOR (§2).
- **Replay attacks**: resend a captured request (a completed payment,
  a used token) — does the server correctly reject the reuse?
- **Rate/volume abuse**: rapid repeated requests to an endpoint — is
  there any rate limiting, or can it be spammed/abused for resource
  exhaustion or business-logic abuse (e.g. redeeming a one-time coupon
  many times)?
- **Workflow abuse**: skip steps in a multi-step process (jump straight
  to a "confirm order" endpoint without going through cart/payment) —
  does the server enforce the sequence, or only the UI?

All findings get formalized through Security Auditor (6.23) with
severity and a concrete required fix — Adversarial Agent documents,
it doesn't fix.

## 11. Severity & handoff

Use this scale consistently (matches `known-issues.md` and Release
Reviewer's gate):
- **Critical**: direct data breach, full account takeover, remote code
  execution.
- **High**: significant data exposure or privilege escalation for a
  subset of users/data.
- **Medium**: requires unusual conditions to exploit, or limited impact.
- **Low**: best-practice gap with minimal realistic exploitability.

Any unresolved **Critical/High** finding blocks a `READY` verdict for
anything that touches the affected surface. Hand off findings to the
owning Engineer with: the specific vulnerability, severity, how it was
found/reproduced, and the concrete fix required — never just "this is
insecure."