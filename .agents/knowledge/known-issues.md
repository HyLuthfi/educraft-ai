# Known Issues

Open problems, accepted limitations, and deferred bugs — the things a
future agent needs to know about *before* touching related code, so it
doesn't waste time rediscovering a known bug, or "fix" a limitation
that was actually accepted on purpose.

This is different from `decisions.md`: decisions.md is about
deliberate structural choices; this file is about things that are
**not ideal** — bugs not yet fixed, limitations not yet solved, tech
debt not yet paid down — but are being tracked instead of silently
ignored.

**Who writes an entry:** whoever finds the issue — most often Bug
Hunter (5.19), Adversarial Agent (6.25), Security Auditor (6.23), or
QA Engineer (5.18), but any agent can add one. **Never fix an issue by
just deleting its entry** — mark it `Fixed` with a pointer to the
activity log entry where it was actually resolved and verified.

**Entry format:**

```
## #<sequential-id> — <short title>
**Discovered by:** <agent> — <date>
**Severity:** Critical | High | Medium | Low
**Status:** Open | Accepted limitation | Fixed (see activity-log <date/entry>)
**Description:** <what's actually wrong, concretely — repro steps if it's a bug>
**Workaround:** <if any exists, so agents don't need to hit the issue to know about it>
**Why not fixed yet / why accepted:** <only if Open or Accepted — genuine reason, not just "low priority">
```

Severity follows the same scale used by Security Auditor (6.23) and
Release Reviewer (12.38): any **Critical/High** entry with status
`Open` blocks a `READY` verdict for anything that touches it.

---

_No known issues recorded yet. The first agent to find one worth
tracking adds `#1` below, following the format above._