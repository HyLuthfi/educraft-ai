---
name: architecture-patterns
description: Application-level architecture guidance covering structure pattern selection, module boundaries, dependency direction, folder structure, communication patterns between modules, and technical debt assessment. Consult this when starting a new project, planning a major new feature that doesn't fit existing structure, or reviewing whether the current structure is still serving the project. Mandatory for Software Architect before any structural decision. Always inspect the actual project first — this skill has no default stack opinion.
---

# Architecture Patterns

Structural decisions compound — a bad module boundary set on day one
gets built on top of for months before anyone questions it. This skill
is about making that first decision deliberately, and knowing when
structure has actually stopped serving the project.

**Inspect before deciding.** Never assume a pattern — read the actual
project's package manifests, folder layout, and
`.agents/knowledge/architecture.md` first. For an existing project,
matching what's already there usually beats introducing a "better"
pattern the rest of the team isn't using.

---

## 1. Choosing a structure pattern (new projects / new major modules)

Pick based on the project's actual shape, not on trend:

- **Modular monolith** (single deployable, internally organized into
  clear domain modules with enforced boundaries) — the right default
  for most projects, including many that will eventually need to
  scale. Gives most of the organizational benefit of microservices
  without the operational cost, and boundaries can be extracted into
  real services later *if* that becomes necessary.
- **Microservices** — justified when there's a genuine need for
  independent deployment/scaling of specific components, independent
  teams owning separate services, or genuinely different technology
  requirements per component. Not justified purely because it's
  "the modern way" — it multiplies operational complexity
  (networking, observability, data consistency across services) that
  a small team often can't afford.
- **JAMstack / static + serverless functions** — right fit for
  content-heavy sites with light, well-isolated dynamic behavior.
  Wrong fit for an app with heavy stateful interaction or complex
  server-side business logic.
- Whatever the choice, state it explicitly and record the reasoning in
  `.agents/knowledge/decisions.md` — this is exactly the kind of
  decision a later agent could otherwise second-guess or accidentally
  undo.

## 2. Module boundaries

- Organize by domain/feature (what the code *does* for the business),
  not by technical layer alone (`controllers/`, `services/`, `models/`
  scattered flat) — a feature-based structure keeps related code
  together and makes module boundaries visible in the folder structure
  itself.
- Define, explicitly, what's allowed to depend on what. A common rule:
  UI depends on application logic, application logic depends on
  domain/business logic, domain logic depends on nothing else in the
  app (the classic dependency-inversion direction — outer layers know
  about inner layers, not the reverse).
- A module's internals (its own data structures, helper functions) stay
  private to that module; only its explicit public interface is used
  by other modules. If another module needs to reach into a module's
  internals, that's a boundary that needs a proper exported interface,
  not an exception.
- Record actual boundaries in `.agents/knowledge/architecture.md`
  (Module Boundaries section) so engineers have a place to check before
  guessing where new code belongs.

## 3. Communication patterns between modules/services

- Prefer direct function/method calls within a modular monolith — don't
  introduce message queues or event buses for in-process communication
  "for future flexibility" unless there's a concrete current need
  (e.g. genuinely async work like sending an email, generating a
  report).
- When modules/services *do* need to be decoupled (cross-service in a
  microservices setup, or a genuinely async in-process task), be
  explicit about the pattern: synchronous request/response vs.
  asynchronous event/message — and about failure handling (what
  happens if the receiving side is down or the message is lost).
- Avoid circular dependencies between modules — if module A needs
  something from B and B needs something from A, that's usually a sign
  a piece of shared logic should be extracted into a third module both
  depend on.

## 4. Folder structure

- Structure should make "where does new code for X go" answerable
  without asking — a new engineer (or agent) should be able to infer
  the pattern from 2-3 existing examples.
- Keep test files colocated with or clearly mirrored to the code they
  test — record which convention this project uses in
  `.agents/knowledge/conventions.md` (this is a *convention*, not an
  *architecture* decision, so it belongs there, not here).
- Avoid deeply nested folder hierarchies (>3-4 levels) that make
  imports unwieldy and navigation slow.

## 5. Technical debt assessment

- Distinguish **deliberate, documented debt** (a known shortcut taken
  for a real reason, tracked in `known-issues.md`) from **accidental
  debt** (structure that drifted without anyone deciding it should).
  The first is manageable; the second compounds silently.
- A module accumulating unrelated responsibilities, or a boundary being
  routinely violated "just this once," is a signal the current
  structure has stopped fitting the project's actual shape — flag it
  to the Orchestrator rather than let violations normalize.
- Don't recommend a large structural rewrite for debt that a smaller,
  incremental refactor (Refactoring Agent, 8.30) could address — reach
  for the smallest change that actually fixes the underlying issue,
  same principle as `code-quality` §8.

## 6. Before handing off

- Is the chosen pattern justified by this project's actual needs, not
  by default/trend?
- Are module boundaries explicit enough that an engineer can tell where
  new code belongs without asking?
- Is the dependency direction consistent (no circular dependencies,
  inner layers not reaching into outer ones)?
- Was the reasoning behind any non-obvious structural choice recorded
  in `decisions.md`?