---
name: documentation
description: Writing external-facing documentation — README, API documentation, setup guides, architecture overviews for humans, deployment guides, environment variable references, and troubleshooting guides — plus how the Knowledge Manager curates `.agents/knowledge/`. Consult this whenever writing or updating any documentation file, or when reconciling the knowledge base. Mandatory for Documentation Agent and Knowledge Manager. Distinct from `.agents/knowledge/*`: those files are internal working memory for agents; this skill covers docs meant for human developers/users reading the repo.
---

# Documentation

Two related but distinct outputs: **documentation** (README, API docs,
guides — written for a human developer encountering this project,
often for the first time) and **the knowledge base**
(`.agents/knowledge/*` — internal working memory for agents, covered
briefly in §8). Documentation Agent (11.36) owns the former; Knowledge
Manager (11.37) owns curating the latter.

---

## 1. README

The first thing anyone (human or agent) sees. At minimum:

- **What this is** — one or two sentences, no jargon, answers "what
  does this actually do."
- **Quick start** — the minimum commands to get it running locally,
  tested to actually work from a clean checkout, not just remembered
  from when it was set up.
- **Prerequisites** — exact versions where they matter (not just
  "Node.js" but "Node.js 20+").
- **Project structure** — brief orientation to the folder layout, or a
  link to `architecture.md` for detail.
- **How to run tests.**
- **Link out**, don't duplicate: link to `CONTRIBUTING.md`, deployment
  guide, API docs rather than inlining everything into one giant README.

A README that's out of date is worse than no README — whoever changes
setup/run commands updates this in the same change, not as a follow-up.

## 2. API documentation

- Document the actual contract: endpoint, method, request shape,
  response shape (success and error), auth requirement, and a real
  example request/response — not just a field list with no example.
- Generate from source where the stack supports it (OpenAPI/Swagger,
  GraphQL schema introspection) so docs can't silently drift from the
  real API — prefer this over hand-maintained docs that get stale.
- If hand-maintained, document at the same time the endpoint is built,
  not as a separate later task — an API without docs by the time it's
  handed to Frontend Engineer just pushes the discovery cost onto them.
- Note rate limits, pagination behavior, and versioning explicitly —
  the things a consumer would otherwise discover by trial and error.

## 3. Setup / onboarding guide

- Written and verified from a genuinely clean environment — "works on
  my machine" assumptions (a global tool already installed, an env var
  already set from months ago) are the most common way these guides
  silently rot.
- Order matters: dependencies before the steps that need them,
  environment setup before first run.
- Include what a successful "it's working" checkpoint looks like at
  each major step, so someone following along knows if they're on
  track or already off the rails.

## 4. Architecture documentation (human-facing)

- This is the *presentation* layer over `.agents/knowledge/
  architecture.md` — same underlying facts, written for a human reading
  the repo rather than an agent working in it. Keep them consistent;
  don't let human-facing docs and the internal knowledge file diverge
  into two different stories about the same system.
- A diagram (even a simple one) of major components and how they
  connect is usually worth more than a page of prose for orienting a
  new reader.

## 5. Deployment guide

- Exact steps to deploy, environment-by-environment, including any
  manual steps that aren't automated yet (and flagged as manual —
  don't let a manual step hide as if it were automatic).
- Rollback procedure documented alongside the forward deployment
  procedure — not written for the first time during an actual incident.
- Cross-reference `devops-observability` for what a healthy deployment
  actually looks like (health checks, what to monitor right after
  deploying).

## 6. Environment variables reference

- Every environment variable the app reads: name, purpose, whether
  required or optional, and an example value (a fake/placeholder value
  for anything secret — never a real key).
- Note which variables differ by environment vs. which should always
  be the same.
- Keep this in sync with `.env.example` if the project has one — same
  drift risk as README quick-start commands.

## 7. Troubleshooting guide

- Organized around actual symptoms a developer would search for
  ("build fails with X error," "can't connect to database locally"),
  not around internal system structure.
- Each entry: symptom → likely cause → concrete fix — populated
  progressively as real issues come up (including from
  `known-issues.md`, once something's actually resolved and the
  resolution is generally useful to document), not written
  speculatively for problems that haven't actually occurred.

## 8. Knowledge Manager's curation role

Knowledge Manager (11.37) doesn't originate new entries in
`.agents/knowledge/*` — those come from whichever agent made the
decision/discovery, per `AGENTS.md` §1 principle 7. Its job is
reconciliation:

- Catch and resolve contradictions between files (e.g.
  `project-context.md`'s stack description drifting from what
  `architecture.md` actually documents).
- Keep `project-context.md`'s "Current status" section current and
  concise — trim it back to a few lines if it's accumulated into a
  running history (that belongs in `activity-log.md`/`decisions.md`
  instead).
- Flag knowledge files that have gone stale (referencing something no
  longer true) to the Orchestrator rather than silently rewriting
  another agent's entry without attribution.
- Ensure new agents joining a task can actually find what they need —
  if a fact keeps needing to be re-explained in handoffs, that's a sign
  it belongs in the knowledge base and isn't there yet, or isn't
  where agents are looking for it.

## 9. Before handing off

- If setup/run commands changed, did the README change in the same
  task, not a follow-up?
- Does API documentation include real examples, not just a field list?
- Would someone following the setup guide from a genuinely clean
  environment actually succeed?
- Do human-facing docs and `.agents/knowledge/architecture.md` tell the
  same story about the system?