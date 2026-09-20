---
name: devops-observability
description: Environment configuration, build/CI/CD pipelines, containerization, deployment practice, and observability (logging, monitoring, metrics, health checks, alerting, crash tracking). Consult this whenever setting up environments, writing CI config, containerizing an app, planning a deployment, or wiring up monitoring/logging. Mandatory for DevOps Agent and Observability Agent. Any actual production deployment or credential/secret action requires human confirmation per `rules/core-guardrails.md` regardless of what this skill recommends.
---

# DevOps & Observability

Getting code running reliably outside a developer's own machine, and
knowing when it breaks before a user has to report it. Two closely
linked concerns: DevOps (10.34) owns getting it deployed correctly;
Observability (10.35) owns knowing what it's doing once it's live.

**Production deployment, credential rotation, and infra changes with
billing impact all require human confirmation** — see
`rules/core-guardrails.md`. Nothing in this skill overrides that.

---

## 1. Environment configuration

- Separate config per environment (dev/staging/production) — never one
  config file with hardcoded production values that dev accidentally
  points at, or vice versa.
- All secrets/environment-specific values come from environment
  variables or a secrets manager, never hardcoded (see `security-audit`
  §8) — an `.env.example` file with placeholder keys (no real values)
  documents what's needed without exposing anything.
- Environment parity: keep dev/staging as close to production as
  practical (same major versions, same architecture shape) — bugs that
  only reproduce in production because of environment drift are
  expensive to debug.

## 2. Build & CI

- CI runs the full check suite on every change before merge: tests
  (`testing-qa`), linting, type-checking, build — a red CI is a
  blocker, not a suggestion to fix later.
- Keep build times reasonable — cache dependencies between runs where
  the CI platform supports it, parallelize independent check steps.
- Fail fast and specifically — a CI failure should point clearly at
  what broke, not require someone to dig through a wall of log output.

## 3. Containerization (where used)

- Multi-stage builds to keep production images small — don't ship
  build tooling/dev dependencies in the runtime image.
- Pin base image versions explicitly (not `latest`) — an unpinned base
  image means a rebuild can silently change what's running.
- Run as a non-root user in the container unless there's a specific
  documented reason not to.
- `.dockerignore` excludes secrets, local env files, and anything not
  needed in the image (same spirit as `.gitignore` for secrets).

## 4. Deployment

- Deployment to production is a guardrail-gated action — confirm with
  the human before it happens, every time, regardless of how routine
  it feels.
- Prefer a rollback-capable deployment strategy (blue-green, rolling,
  or at minimum a fast, tested rollback path) over one-way deploys with
  no easy undo.
- Database migrations that run as part of deployment follow
  `database-design` §5 — backward-compatible, staged where the change
  is risky, confirmed with the human if it touches existing data.
- Health checks gate traffic — a new deployment shouldn't receive
  production traffic until it's confirmed actually healthy, not just
  "the process started."

## 5. Logging

- Structured logging (consistent fields: timestamp, level, request ID,
  relevant context) over unstructured string concatenation — makes
  logs actually searchable/filterable later.
- Log levels used meaningfully: `error` for things that need attention,
  `warn` for degraded-but-handled situations, `info` for significant
  events, `debug` for detail not needed in normal operation — don't log
  everything at `error` "to be safe," it drowns the signal.
- Never log secrets, passwords, full tokens, or unredacted PII (see
  `security-audit` §7) — this is a security requirement, not just a
  hygiene one.
- Include a request/correlation ID threaded through a request's
  lifecycle so related log lines across services can be tied together.

## 6. Monitoring & metrics

- Track the metrics that actually indicate user-facing health: error
  rate, latency (p50/p95/p99, not just average — averages hide bad
  tail latency), throughput — not just infrastructure vanity metrics
  (CPU/memory alone don't tell you if users are having a bad time).
- Dashboards surface what's actually needed to diagnose an incident
  quickly — a dashboard nobody looks at during an actual incident isn't
  serving its purpose.

## 7. Health checks

- A real health check verifies the app can actually do its job (can
  reach the database, can reach critical dependencies) — not just "the
  process is running and responds 200."
- Distinguish liveness (is the process alive, should it be restarted if
  not) from readiness (is it ready to receive traffic right now) where
  the deployment platform supports the distinction.

## 8. Alerting

- Alert on symptoms that need a human to act, not on every anomaly —
  alert fatigue from noisy, low-signal alerts causes real alerts to get
  ignored.
- Every alert that fires should have an obvious next action — if
  responding to an alert always means "check the dashboard, it's
  usually fine," the alert threshold is probably wrong.
- Crash tracking (client and server) captures enough context to
  actually debug the issue (stack trace, relevant state, user action
  that triggered it) without capturing sensitive data (§5).

## 9. Before handing off

- Are secrets sourced from environment/secrets manager, never
  hardcoded, in every environment?
- Does CI actually block merge on failing tests/checks, or is it
  advisory only?
- Is there a tested rollback path for this deployment?
- Do health checks verify real functionality, not just process uptime?
- Would the current logging/monitoring actually surface this specific
  feature breaking, or would it go unnoticed until a user complains?