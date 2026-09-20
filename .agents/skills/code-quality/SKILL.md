---
name: code-quality
description: Language-agnostic clean code standards covering naming, function/module design, comments, error handling, complexity, and SOLID principles. Consult this before writing or reviewing ANY code — backend, frontend, scripts, migrations, config. Use whenever writing new code, reviewing code, refactoring, or when a variable/function/file needs a name. Applies regardless of language or framework; always check `.agents/knowledge/conventions.md` first for project-specific overrides of these defaults.
---

# Code Quality

Professional, maintainable code — the kind a senior engineer would sign
their name to, not the fastest thing that happens to run. This applies
to every language and every agent that writes code (Frontend Engineer,
Backend Engineer, Database Engineer, Bug Fixer, Refactoring Agent,
Design System Agent, and anyone else touching a codebase).

**Always check `.agents/knowledge/conventions.md` first.** If this
project has already established a convention that differs from a
default here (e.g. a specific naming scheme, a specific error-handling
pattern), the project's convention wins — but if nothing is
established yet, follow this skill and then *record* what you chose in
`conventions.md` so the next agent doesn't have to re-decide.

---

## 1. Naming — the single highest-leverage thing to get right

Bad names are the #1 tell of AI-generated or rushed code. Never use:
`data`, `item`, `temp`, `value`, `result`, `handleClick`, `doStuff`,
`Component1`, `newVariable`, `foo/bar/baz` (outside throwaway examples),
or a name that's just the type (`string1`, `arr`).

**Rules:**
- Name things for **what they represent**, not their type or their
  position in the code. `activeSubscriptions`, not `list` or `arr2`.
- Booleans read as a yes/no question: `isLoading`, `hasPermission`,
  `canEdit` — not `loading` (ambiguous: state or action?) or `flag`.
- Functions are named as verbs describing the actual effect:
  `calculateShippingCost`, not `process` or `handle`. If you can't name
  a function without "and" in it (`validateAndSave`), it's probably
  doing two things — consider splitting it.
- Event handlers name the *domain event*, not the DOM event:
  `onCheckoutSubmit`, not `onClick`, when the handler is specifically
  for checkout submission.
- Match the casing convention already used in the codebase/language
  (camelCase for JS/TS variables, snake_case for Python/Ruby,
  PascalCase for classes/components everywhere) — check
  `conventions.md`, don't assume.
- Abbreviate only well-known terms (`id`, `url`, `html`) — never
  invent your own abbreviation to save keystrokes (`usr`, `qty` is
  borderline-ok in domain contexts, `cfg` usually isn't worth it).
- A name's length should match its scope: a loop index used for 2 lines
  can be `i`; a variable used across a 200-line module needs a real name.

## 2. Function & module design

- **One function, one responsibility.** If describing what a function
  does needs "then," it should probably be two functions.
- Prefer early returns / guard clauses over deep nesting:
  ```
  // Prefer
  if (!user) return null;
  if (!user.isActive) return null;
  return renderProfile(user);

  // Over
  if (user) {
    if (user.isActive) {
      return renderProfile(user);
    }
  }
  ```
- Keep function argument lists short (roughly ≤4). Beyond that, group
  related arguments into an object/struct.
- Avoid deep nesting (>3 levels) — extract inner logic into a
  well-named helper function instead.
- Don't build a generic/configurable abstraction for something used
  exactly once. Duplication of two similar-but-not-identical things is
  often better than a premature shared abstraction that has to grow
  parameters to handle both cases.
- Pure functions (same input → same output, no side effects) wherever
  practical — they're trivially testable and reasoning-friendly. When a
  function *does* have side effects (I/O, mutation, network), make that
  obvious from its name or placement, don't hide it.

## 3. SOLID, applied practically (not academically)

- **Single Responsibility:** a class/module should have one reason to
  change. A `UserService` that also sends emails and formats PDFs is
  three responsibilities wearing one name.
- **Open/Closed:** prefer designs where adding a new case (a new
  payment method, a new export format) means *adding* code, not editing
  a long `if/else` or `switch` chain scattered across the codebase.
- **Dependency Inversion:** depend on interfaces/contracts where a
  component genuinely needs to be swappable (e.g. a payment provider
  adapter) — but don't add an interface layer for something that will
  only ever have one implementation. Speculative abstraction is its own
  code smell.
- Don't apply all five SOLID letters ceremonially to every file. They're
  tools for a real problem (rigidity, fragility), not a checklist to
  perform.

## 4. Comments

- Comments explain **why**, not **what** — the code already says what.
  `// retry 3x: this API is known to flake under load` is useful.
  `// increment counter` above `counter++` is noise.
- Delete commented-out code before finishing a task — version control
  is the history, not code comments.
- No `TODO` without an owner or a tracked reference — a bare `// TODO:
  fix this later` is invisible to everyone else. Either fix it now, or
  log it to `.agents/knowledge/known-issues.md` and reference that.
- If a function needs a comment to explain what it does (not why), the
  function probably needs a better name instead.

## 5. Error handling

- Never silently swallow an error (empty `catch` block, ignored
  promise rejection). At minimum, log it with enough context to debug;
  usually, handle it or propagate it deliberately.
- Fail with a specific, actionable message — `"Failed to save order:
  insufficient stock for SKU-4471"`, not `"An error occurred"` or a raw
  stack trace shown to an end user (see the `seo-content` skill for
  user-facing copy; this is about the underlying handling).
- Distinguish expected failure (invalid user input — handle gracefully,
  show the user what to fix) from unexpected failure (a bug, a downed
  dependency — log loudly, don't pretend it's fine).
- Validate at boundaries (API input, form input, external API
  responses) rather than trusting data deep inside the system.

## 6. Complexity & duplication

- If a function's cyclomatic complexity is climbing (many branches,
  nested conditions), extract and name the sub-decisions.
- **Rule of three:** duplicated logic isn't automatically wrong the
  first or second time it appears — extract a shared abstraction on
  the third occurrence, once the actual shared shape is clear, not
  before (extracting too early usually guesses the abstraction wrong).
- Dead code (unused functions, unreachable branches, commented-out
  blocks) gets removed as part of the task that made it dead — don't
  leave it "just in case."

## 7. Type safety

- In a typed language/framework, use the type system to make invalid
  states unrepresentable where practical — e.g. a union of specific
  states instead of a loose `status: string`.
- Avoid `any` (TypeScript) or equivalent escape hatches except at true
  external boundaries (parsing unknown JSON), and narrow immediately
  after.
- Don't over-type either — a type that just repeats what's obvious from
  context adds noise without adding safety.

## 8. Before handing off

Quick self-check, not a formality:
- Would a teammate understand this file without asking you questions?
- Are there any names you'd be embarrassed to explain in a code review?
- Did you leave any commented-out code, stray `console.log`/`print`
  debug statements, or TODOs without an owner?
- Does this match what's already in `conventions.md` — and if you made
  a new naming/structure decision, did you record it there?