---
name: performance
description: Performance optimization covering Core Web Vitals, frontend rendering/bundle/asset optimization, backend query and caching strategy, and measurement-first methodology. Consult this whenever a feature involves large lists, images, third-party scripts, database queries at scale, or when something "feels slow" and needs diagnosis before fixing. Mandatory for Performance Engineer, Frontend Performance Agent, and Backend Performance Agent — always measure before optimizing, never guess at the bottleneck.
---

# Performance

The rule that overrides everything else in this skill: **measure
first, optimize second.** Optimizing the wrong thing wastes effort and
often adds complexity for no real gain. Every section below assumes a
real, measured bottleneck — not a guess.

---

## 1. Measurement-first methodology

- Profile/measure before changing anything — browser DevTools
  Performance tab, Lighthouse, backend APM/query logs, whatever the
  stack provides. Identify the actual bottleneck, not the intuitive
  suspect.
- Set a concrete target before optimizing ("get this endpoint under
  200ms at p95," not "make it faster") — otherwise there's no way to
  know when to stop.
- Re-measure after the change to confirm it actually helped — a
  plausible-sounding optimization that doesn't move the measured
  number should be reverted, not kept "because it should help."
- Optimize the real-world common case, not a synthetic best case — a
  query fast against 10 test rows can be catastrophic against 2 million
  production rows; test against realistic data volume.

## 2. Core Web Vitals (frontend, user-perceived performance)

- **LCP (Largest Contentful Paint)** — target <2.5s. Usually dominated
  by the largest above-the-fold image or block of text; optimize that
  specific element's load path (preload it, serve it at the right
  size, avoid render-blocking resources ahead of it).
- **INP (Interaction to Next Paint)** — target <200ms. Long JavaScript
  tasks blocking the main thread are the usual cause; break up heavy
  synchronous work, defer non-critical JS.
- **CLS (Cumulative Layout Shift)** — target <0.1. Almost always caused
  by images/embeds without reserved dimensions, or content injected
  above existing content after load — always set explicit width/height
  (or aspect-ratio) on images and reserve space for async content.

## 3. Frontend: rendering & bundle

- **Unnecessary re-renders** (React/Vue/similar): before optimizing,
  confirm with the framework's profiler that a component actually
  re-renders more than needed and that it's expensive enough to matter
  — memoization has its own cost and complexity, don't apply it
  reflexively everywhere.
- **Bundle size**: code-split by route at minimum; lazy-load anything
  not needed for the initial view (modals, below-the-fold widgets,
  rarely-used features). Check what a "add one dependency" decision
  actually costs in bundle size before adding it for a small feature.
- **Images**: serve modern formats (WebP/AVIF with fallback), correctly
  sized for their actual display dimensions (don't ship a 3000px image
  scaled down by CSS to 300px), lazy-load anything below the fold, set
  explicit dimensions to prevent CLS (§2).
- **Fonts**: subset to the characters actually used where practical,
  `font-display: swap` (or equivalent) to avoid invisible-text-while-
  loading, limit the number of font weights/families actually loaded.
- **Third-party scripts**: audit what's actually in use — an unused
  analytics/tag-manager script is pure cost. Load non-critical
  third-party scripts async/deferred, never render-blocking.

## 4. Backend: query & computation

- **N+1 queries** — the most common backend performance bug (see
  `database-design` §7): a loop issuing one query per item instead of
  a single batched query. Always check for this pattern in any code
  that loops over a collection and queries inside the loop.
- **Batch and cache external calls** — if the same third-party
  API/data is needed multiple times in one request's lifecycle, fetch
  once and reuse, don't refetch.
- **Heavy computation**: move genuinely expensive synchronous work
  (report generation, large exports, image processing) to a background
  job instead of blocking a request/response cycle.
- **Pagination** on anything that could return an unbounded result set
  (see `api-design` §5 and `database-design` §7) — an unpaginated
  query against a growing table degrades over time even if it's fine
  today.

## 5. Caching

- Cache at the layer where it actually saves the most work: a
  database query result, a computed API response, a rendered page
  fragment — pick based on where the measured cost actually is.
- Always define an explicit invalidation strategy *before* adding a
  cache — a cache without a clear invalidation plan turns into stale
  data bugs that are hard to diagnose ("cache invalidation is one of
  the two hard problems," treat it accordingly, not as an afterthought).
- Set explicit TTLs appropriate to how stale the data is acceptable to
  be — don't default to "cache forever" or "no expiry."
- Distinguish per-user/private data (rarely cacheable at a shared
  layer, or only cacheable per-user) from shared/public data (safe to
  cache broadly) — caching private data at a shared layer is both a
  correctness and a security bug (`security-audit` §7).

## 6. Connection & resource management (backend)

- Use connection pooling for database/external service connections;
  verify pool size is appropriate for expected concurrency, not left
  at a default that doesn't match the deployment.
- Set explicit timeouts on external calls — an unbounded wait on a
  downstream dependency propagates its slowness (or outage) directly
  into this system's response time.

## 7. Before handing off

- Was the actual bottleneck measured and identified, not assumed?
- Was a concrete target set, and did the fix measurably hit it?
- Was the fix tested against realistic data volume, not a small
  synthetic dataset?
- If caching was added, is there an explicit invalidation strategy and
  TTL, and does it correctly separate private from shared data?
- Did the optimization avoid adding complexity disproportionate to the
  actual gain?