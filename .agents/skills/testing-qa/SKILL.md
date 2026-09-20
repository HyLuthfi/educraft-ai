---
name: testing-qa
description: Testing methodology covering the testing pyramid, edge-case discovery, bug report format, root-cause debugging, regression testing, and end-to-end scenario design. Consult this whenever writing tests, testing a feature before handoff, hunting for bugs, fixing a bug, or verifying a fix. Mandatory for QA Engineer, Bug Hunter, Bug Fixer, Regression Agent, E2E Testing Agent, and any Backend/Frontend Engineer self-testing before handoff — "I wrote the code" is never sufficient, this skill defines what "actually tested" means.
---

# Testing & QA

Code that hasn't been run against realistic edge cases isn't finished
— it's a draft. This skill defines what "tested" actually means at
each stage, from an engineer's own self-check through adversarial
QA to release-blocking regression checks.

---

## 1. The testing pyramid — what to write, and how much

- **Unit tests** (most of them): pure logic, one function/module at a
  time, fast, no network/DB. Write these for business logic, edge-case
  branches, and anything with real conditional complexity.
- **Integration tests** (some): does this module correctly work with
  the real DB/API/other modules it depends on? Fewer than unit tests,
  but cover the actual seams where bugs hide.
- **End-to-end tests** (fewest, but critical): full user journeys
  through the real UI (see §5). Expensive to write and run, so reserve
  for the flows that matter most (signup, checkout, core feature loop)
  — not every possible click path.

Don't over-invest in one layer to compensate for skipping another —
100% unit coverage with zero integration/E2E tests still ships broken
user journeys; heavy E2E with no unit tests is slow and hard to debug
when it fails.

## 2. Self-testing before handoff (every engineer, every time)

Before Backend/Frontend Engineer hands a feature to QA, at minimum:
- Run the happy path end to end, actually observing output — not just
  "it compiled" or "no error was thrown."
- Test the boundaries relevant to §3 below for this specific feature.
- If it's UI: check all four states from `ux-principles` §2
  (loading/empty/error/success) actually render correctly.
- If it touches shared code: run the existing test suite, don't just
  test your own addition in isolation.

## 3. Edge-case checklist — think like the data, not the happy path

For **any** input-accepting feature, check:
- **Empty**: empty string, empty array/list, null/undefined, zero.
- **Boundary**: exactly the min/max allowed value, one below, one above.
- **Huge**: a very long string, a list with thousands of items, a large
  file upload — does the UI/API degrade gracefully or break?
- **Malformed**: wrong type, wrong format (invalid email, invalid date),
  unexpected encoding/unicode/emoji.
- **Duplicate / concurrent**: the same request submitted twice quickly
  (double-click, network retry) — does it create two records?
- **Permission edge cases**: a logged-out user hitting a logged-in
  route; a regular user hitting an admin-only action; one user's ID
  substituted into a request meant for another user (see
  `security-audit` for the IDOR angle specifically).
- **Network conditions**: slow response, timeout, request that fails
  partway through — does the UI recover or get stuck?
- **State inconsistency**: what if the data changed between when the
  screen loaded and when the user submitted (stale data, item deleted
  by someone else in the meantime)?

Bug Hunter (5.19) and Adversarial Agent (6.25) actively look for these
— but every engineer should already be checking the ones relevant to
their own feature before it ever reaches Bug Hunter.

## 4. Bug reports (Bug Hunter → Bug Fixer)

A usable bug report is reproducible by someone who wasn't there when
it was found:

```
## Bug: <short, specific title>
**Severity:** Critical | High | Medium | Low
**Steps to reproduce:**
1. ...
2. ...
**Expected:** <what should happen>
**Actual:** <what actually happens>
**Environment:** <browser/viewport/data state, if relevant>
**Relevant logs/stack trace:** <if any>
```

"It's buggy" or "checkout doesn't work" is not a bug report — it's a
lead. Bug Hunter's job isn't done until it's reproducible by someone else.

## 5. Root-cause debugging (Bug Fixer, 5.20)

- Reproduce first, always — don't fix based on a hunch about what's
  probably wrong.
- Find the actual root cause, not just the symptom. A null-pointer fix
  that suppresses the crash without asking *why* the value was null is
  a patch, not a fix — it usually resurfaces elsewhere.
- Fix only what's broken. Don't refactor unrelated code in the same
  change — that's a separate task (Refactoring Agent, 8.30) and makes
  the fix harder to review/revert if wrong.
- After fixing, re-run the exact repro steps from the bug report, then
  run the broader regression check (§6) before handing back.

## 6. Regression testing (Regression Agent, 5.21)

After any change, verify previously-working related features still
work — not just the thing that changed:
- Run the existing automated test suite; a change that breaks existing
  tests is not done until those pass again.
- For anything without test coverage, manually re-check the adjacent
  features most likely to share code paths with what changed.
- When a bug fix reveals there was no test covering that case, add one
  — the same bug reappearing later means the regression step failed.

## 7. End-to-end scenario design (E2E Testing Agent, 5.22)

Cover full realistic journeys, not just isolated actions:
- The core "golden path" (e.g. register → browse → add to cart →
  checkout → confirmation) start to finish.
- At least one abnormal variant per critical journey: what if the user
  abandons checkout and comes back later? What if their session expires
  mid-flow? What if they use the browser back button mid-form?
- Cross-check against acceptance criteria from Product Manager (1.1) —
  E2E scenarios should map to what the feature was actually supposed
  to accomplish for the user, not just technical coverage.

## 8. Business logic verification (Business Logic Agent, 4.17)

Distinct from "does the code run" — does it implement the actual
business rule correctly? Test with concrete real-world scenarios using
actual numbers, not abstractions:
- A specific price, a specific discount percentage, a specific stock
  count, a specific user tier — compute the expected result by hand,
  then verify the system produces it.
- Check rule *interactions*, not just each rule alone (e.g. does a
  member discount correctly stack — or correctly not stack — with a
  promo code, per the actual intended rule?).
- Zero and negative cases specifically: zero stock, 100% discount,
  negative quantity — these are where business logic bugs concentrate.

## 9. Before marking anything "tested"

- Was this actually run, not just read/reasoned about?
- Were the edge cases in §3 relevant to this feature checked, not just
  the happy path?
- If a bug was found and fixed, was the fix re-verified against the
  original repro, and was regression checked?
- Is there a test (unit/integration/E2E as appropriate) that would
  catch this specific issue if it happened again?