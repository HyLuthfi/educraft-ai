---
name: database-design
description: Database design covering schema/ERD design, relationships, normalization, indexing, constraints, migration strategy, transactions, and query optimization. Consult this whenever designing a new table/collection, writing a migration, adding an index, or reviewing a query for correctness/performance. Mandatory for Database Architect and Database Engineer, and for Backend Engineer whenever a change touches the schema. Always check `.agents/knowledge/architecture.md` (Data layer section) for this project's established entities and conventions first.
---

# Database Design

Schema decisions are expensive to reverse once real data exists — get
the shape right before writing to it, and make every migration
reversible. Check `.agents/knowledge/architecture.md` (Data layer) for
this project's existing entities before adding a new one that might
already exist in a different form.

---

## 1. Schema & entity design

- Model entities around what they actually represent in the domain,
  not around a specific screen/query's convenience — a screen-shaped
  table tends to force awkward duplication once a second screen needs
  the same data differently.
- Every table has a clear, singular purpose. If a table is accumulating
  unrelated columns used by different features, it's probably two
  entities wearing one name (same smell as Single Responsibility in
  `code-quality` §3).
- Choose primary keys deliberately: an auto-increment integer is simple
  but sequential (an IDOR/enumeration concern per `security-audit` §2
  if ever exposed in a URL) — a UUID avoids that but has its own
  indexing trade-offs. Pick based on whether the ID is ever
  client-exposed.

## 2. Relationships & normalization

- Normalize to eliminate update anomalies (the same fact stored in two
  places that can drift out of sync) — but don't normalize past the
  point of diminishing returns; a justified denormalization for read
  performance is fine *if it's deliberate and documented*, not
  accidental duplication.
- Foreign keys are enforced at the database level where the database
  supports it — don't rely on application code alone to maintain
  referential integrity; a direct DB write (migration, admin tool, bug)
  will eventually bypass app-level checks.
- Define `ON DELETE` behavior explicitly for every foreign key
  (`CASCADE`, `RESTRICT`, `SET NULL`) — don't leave it at the database
  default without deciding whether that's actually correct for this
  relationship (e.g. deleting a user should almost never silently
  cascade-delete their financial records).

## 3. Constraints as correctness, not just structure

- Push validation into the schema wherever the database can enforce
  it: `NOT NULL` on required fields, `UNIQUE` on things that must be
  unique (don't only check uniqueness in application code — race
  conditions will eventually create a duplicate), `CHECK` constraints
  for value ranges/enums where supported.
- Soft-delete vs. hard-delete is a deliberate choice per entity, not a
  default — record which entities are soft-deleted and why in
  `architecture.md` (per the example in that file's Data Layer
  section), since it changes how every query against that table must
  filter.

## 4. Indexing

- Index columns used in `WHERE`, `JOIN`, and `ORDER BY` clauses for
  queries that actually run in this application — don't index
  speculatively for queries that don't exist yet.
- Composite indexes: column order matters — put the highest-selectivity
  / most-frequently-filtered column first, matching actual query
  patterns.
- Every index has a cost (write performance, storage) — an index
  added to fix one slow query should be verified against that query's
  actual plan, not added on a guess.
- Foreign key columns are indexed by default in most databases only if
  the DB does so automatically — verify for the specific database in
  use rather than assuming.

## 5. Migrations

- Every migration is reversible (a working `down`/rollback) unless
  there's a specific, documented reason it can't be (e.g. an
  irreversible data transformation) — and that reason is flagged to
  the human before running, per `rules/core-guardrails.md`.
- Migrations that modify/drop a column or table with existing data are
  a guardrail-level action — confirm with the human before running
  against anything but a disposable dev database.
- Large tables: consider whether a migration will lock the table for
  an unacceptable duration in production, and whether it needs to be
  broken into backward-compatible steps (add nullable column → backfill
  → make required, rather than one blocking change).
- Migrations are ordered and idempotent-safe — re-running the migration
  suite from scratch on a fresh database should produce the same result.

## 6. Transactions

- Wrap multi-step writes that must succeed or fail together in an
  actual database transaction — don't rely on application-level
  "best effort" sequencing for something that needs atomicity (e.g.
  deducting stock and creating an order record).
- Keep transactions short — don't hold one open across a slow external
  API call; that blocks other operations and risks timeout-related
  partial states.
- Understand the isolation level in use and whether it's sufficient
  for the operation — a naive read-then-write without proper locking
  is a race condition under concurrent load (relevant to the
  "duplicate/concurrent" edge case in `testing-qa` §3).

## 7. Query optimization (Backend Performance Agent, 7.28, collaborates here)

- Watch for N+1 queries — a loop that issues one query per iteration
  instead of one batched query. This is the single most common
  backend performance bug.
- Select only the columns actually needed, not `SELECT *`, for
  anything beyond trivial/debug queries.
- Use `EXPLAIN`/the database's query planner to verify an index is
  actually being used for a query assumed to be fast — don't assume
  from the schema alone.
- Paginate any query that could return an unbounded result set (see
  `api-design` §5) — an unpaginated query against a growing table is a
  performance incident waiting to happen.

## 8. Before handing off

- Does this schema change match an existing entity in
  `architecture.md`, or does it duplicate/conflict with one?
- Is every foreign key's `ON DELETE` behavior a deliberate choice?
- Are constraints doing as much correctness enforcement as the database
  supports, not left entirely to application code?
- Is the migration reversible, and if it touches real data, has the
  human confirmed before it runs?
- Were new/changed entities recorded in `architecture.md`'s Data Layer
  section?