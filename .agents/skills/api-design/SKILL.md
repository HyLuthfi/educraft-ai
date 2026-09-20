---
name: api-design
description: API design conventions covering endpoint structure, request/response schemas, error format, authentication/authorization shape, pagination, filtering, rate limiting, and versioning. Consult this whenever designing a new API endpoint, reviewing an API contract, or integrating a frontend against a backend. Mandatory for API Architect, Integration Architect, and Backend Engineer before finalizing any endpoint. Applies to REST by default; see §8 for GraphQL/RPC adjustments. Always check `.agents/knowledge/architecture.md` (API layer section) for this project's established contract before introducing a new pattern.
---

# API Design

A well-designed API is predictable enough that a consumer can guess the
shape of an endpoint they haven't used yet. This skill defines that
predictability. Check `.agents/knowledge/architecture.md` (API layer)
first — if this project has an established contract, match it instead
of introducing a competing pattern.

---

## 1. Resource & endpoint structure

- Endpoints are nouns representing resources, not verbs:
  `POST /orders`, not `POST /createOrder`.
- Nest resources only where there's a genuine ownership relationship,
  and keep nesting shallow (max ~2 levels):
  `/orders/{orderId}/items` is fine; `/users/{id}/orders/{id}/items/{id}/reviews`
  is not — flatten deep resources into their own top-level path with a
  filter param instead.
- Use plural nouns consistently: `/orders`, not a mix of `/order` and
  `/orders` across the API.
- Standard HTTP methods map to standard meanings — don't repurpose
  `GET` for something that mutates state, or `POST` for a pure read.

## 2. Request & response schema

- Consistent envelope shape across all endpoints — pick one and use it
  everywhere (e.g. `{ data, error, meta }` or a bare resource for
  success + a separate error shape) — don't let different endpoints
  invent their own response shape.
- Consistent field naming convention across the whole API (camelCase or
  snake_case — match `conventions.md`; never mix within one API).
- Dates in ISO 8601, consistently, with explicit timezone handling
  documented (UTC on the wire is the safe default).
- Don't return more than the consumer needs by default — especially
  never a full internal DB row (see `security-audit` §7). Explicit
  field selection/expansion params if partial vs. full detail is
  genuinely needed.

## 3. Error format

One consistent error shape across every endpoint:

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Only 3 units of SKU-4471 are available.",
    "field": "quantity"
  }
}
```

- `code` is a stable, machine-readable identifier the frontend can
  branch on — never make the frontend parse the human-readable message
  to determine what happened.
- `message` is safe to show a user but never leaks internals (no stack
  traces, no SQL, no internal file paths — see `security-audit` §7).
- Use correct HTTP status codes: `400` for client/validation errors,
  `401` unauthenticated, `403` authenticated-but-forbidden, `404` not
  found (or not authorized to know it exists — see IDOR note below),
  `409` conflict, `422` semantically invalid, `429` rate-limited, `5xx`
  server-side failure. Don't return `200` with an error body.
- For IDOR-sensitive resources, consider returning `404` rather than
  `403` when a user requests a resource they can't access, so
  existence of the resource isn't leaked to unauthorized users — decide
  deliberately per-resource, don't default to one without thinking.

## 4. Authentication & authorization shape

- State the mechanism explicitly and consistently: bearer token,
  session cookie, API key — don't mix mechanisms across endpoints
  without a documented reason.
- Every protected endpoint documents what role/permission it requires
  — and see `security-audit` §2: that check happens server-side on
  every request, not just at the route/middleware layer in a way that
  can be bypassed.
- Token refresh/expiry behavior is explicit and consistent: what
  happens on an expired token (401 with a specific code the frontend
  can detect, so it knows to refresh vs. re-login).

## 5. Pagination & filtering

- Pick one pagination style per API and use it everywhere: offset-based
  (`?page=2&limit=20`) or cursor-based (`?cursor=abc&limit=20`) —
  cursor-based is generally more robust against data changing between
  pages, worth it for any frequently-mutated large collection.
- Always include total/hasMore metadata so the client knows when to
  stop paging, rather than inferring it from an empty page.
- Filtering/sorting params follow one consistent naming pattern across
  endpoints (`?sort=createdAt&order=desc&status=active`), not a
  different scheme per endpoint.
- Always cap the maximum page size server-side — never let a client
  request an unbounded result set.

## 6. Rate limiting

- Rate-limit by a meaningful key (user/API key/IP as appropriate to the
  endpoint), especially on auth endpoints (§ see `security-audit` §1)
  and any endpoint with a real cost (search, export, third-party calls).
- Return `429` with a `Retry-After` header, not a generic error, so
  well-behaved clients can back off correctly.

## 7. Versioning

- Decide the strategy explicitly (URL path `/v1/`, header-based, or
  none yet because the API has no external consumers) and record it in
  `architecture.md` — don't let it be implicit/accidental.
- A breaking change to a live endpoint with real consumers is a
  guardrail-level decision (`rules/core-guardrails.md`) — requires
  human sign-off, not a unilateral agent decision.
- Non-breaking changes (new optional field, new endpoint) don't need a
  version bump; changing a field's type/meaning or removing a field does.

## 8. GraphQL/RPC adjustments

If this project uses GraphQL or RPC instead of REST, the same
underlying principles apply, adapted:
- **GraphQL**: consistent error extensions format, explicit nullability
  decisions (don't make everything nullable by default — model what's
  actually optional), pagination via a standard pattern (e.g. Relay
  cursor connections) applied consistently, and the same server-side
  authorization-per-field/resolver requirement as §4 — a GraphQL schema
  is not itself an access-control layer.
- **RPC (gRPC/tRPC/etc.)**: consistent error/status code usage across
  procedures, explicit versioning of the schema/contract, same
  pagination/auth consistency requirements as above.

## 9. Before handing off

- Does this endpoint's shape match the rest of the API, or does it
  invent its own pattern?
- Is the error format consistent with every other endpoint?
- Is authorization actually enforced server-side for this specific
  resource, not just the general route?
- Is pagination bounded and consistent with the rest of the API?
- Was the contract communicated clearly to whoever builds against it
  (Frontend Engineer), not just implemented and left for them to
  reverse-engineer from the code?