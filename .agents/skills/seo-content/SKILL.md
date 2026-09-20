---
name: seo-content
description: SEO fundamentals (metadata, semantic structure, sitemap, robots.txt, canonical tags, Open Graph, structured data, URL structure) and copywriting/microcopy strategy (voice, tone, error messages, CTAs). Consult this whenever building a public-facing page, writing meta tags, or writing any user-facing text. Mandatory for SEO Agent and Content/Copywriting Agent. Copywriting mechanics (avoiding generic phrases) also live in `anti-generic-design` §5 — that's the "don't sound like AI slop" rules; this skill is the fuller voice/strategy layer plus all SEO-specific technical requirements.
---

# SEO & Content

Two related but distinct concerns: making pages findable (SEO Agent,
9.32) and making the words on the page actually work for the person
reading them (Content/Copywriting Agent, 9.33). See
`anti-generic-design` §5 first for the baseline "don't write generic
filler" rules — this skill builds on top of that.

---

## 1. Metadata (every public-facing page)

- Unique, descriptive `<title>` per page (~50-60 chars) — never a
  site-wide default repeated across every page.
- Unique `meta description` per page (~150-160 chars) that actually
  describes that page's content, written to be useful to a human
  scanning search results, not stuffed with keywords.
- Set `lang` attribute on `<html>` correctly for the actual content
  language.
- `viewport` meta tag present for correct mobile rendering.

## 2. Semantic structure

- One `<h1>` per page, describing the page's main content; heading
  levels (`h1`→`h2`→`h3`) nest logically, never skipped for visual
  styling reasons (use CSS for that, not heading level).
- Semantic HTML elements (`<nav>`, `<main>`, `<article>`, `<aside>`,
  `<footer>`) over generic `<div>` soup — this helps both SEO crawlers
  and screen readers (overlaps directly with `ux-principles` §5).
- Internal links use descriptive anchor text ("view shipping policy,"
  not "click here") — both an SEO and an accessibility signal.

## 3. Crawlability & indexing

- `robots.txt` correctly allows/disallows what's actually intended —
  verify it isn't accidentally blocking pages that should be indexed
  (a common, easy-to-miss deploy bug).
- `sitemap.xml` kept current and submitted, covering actual indexable
  pages — not stale, and not including pages that shouldn't be indexed
  (auth-gated pages, admin routes).
- Canonical tags (`<link rel="canonical">`) on any page reachable by
  multiple URLs (with/without trailing slash, with tracking params,
  paginated variants) to avoid duplicate-content dilution.
- `noindex` explicitly on pages that shouldn't appear in search
  (internal tools, duplicate/thin-content pages, auth-gated content) —
  a deliberate choice, not an oversight either direction.

## 4. Open Graph & social sharing

- `og:title`, `og:description`, `og:image`, `og:url` set per page for
  correct link previews when shared — test actual rendering, not just
  presence of the tags (a wrong-aspect-ratio image often gets cropped
  badly by the consuming platform).
- Twitter/X card tags if that platform matters for this product's
  audience.

## 5. Structured data

- Add JSON-LD structured data (schema.org) where it matches actual page
  content — Product, Article, FAQPage, BreadcrumbList, Organization,
  etc. — enables rich results in search, but only mark up content
  that's genuinely visible on the page (marking up content that isn't
  actually there is a violation of search engine guidelines, not just
  unhelpful).

## 6. URL structure

- Human-readable, descriptive URLs (`/products/wireless-headphones`,
  not `/products/p?id=4471`) where the routing approach supports it.
- Consistent casing and word separation (lowercase, hyphens) across the
  whole site — matches the naming-consistency principle in
  `code-quality` §1, applied to URLs.
- Stable URLs — avoid changing a page's URL once it's live/indexed
  without a proper 301 redirect from the old URL; an unredirected URL
  change is a guardrail-adjacent decision (loses accumulated SEO value
  and breaks external links) worth flagging if it's happening to a
  live, indexed page.

## 7. Copywriting voice & tone

Beyond the "don't write generic filler" baseline in
`anti-generic-design` §5:

- Establish a consistent voice appropriate to the actual product and
  audience — a children's education app and a B2B analytics dashboard
  earn different registers, but each should be *consistently* that
  register throughout, not drifting sentence to sentence.
- Write for scanning, not reading start-to-end: front-load the
  important word in a sentence/label, use short sentences, avoid
  needing the reader to hold context across a long paragraph to
  understand a UI label.
- Every button/link label states the actual result of clicking it —
  never a vague "Click here" or "Submit" when a specific action
  ("Save changes," "Delete account," "Send invite") is more useful and
  prevents accidental destructive clicks.

## 8. Error messages & empty/success states (copy specifically)

- Error copy: what happened, in plain terms, and — where possible —
  what to do about it. Never blame the user ("You entered invalid
  data") when the system's own message can be more specific and
  helpful ("That email address doesn't look valid — check for typos").
- Confirmation/success copy matches the specific action taken
  ("Invite sent to sam@example.com," not a generic "Success!") —
  specific confirmation builds trust that the system actually did what
  was asked.
- Empty-state copy explains what would appear here and offers the next
  action, rather than just stating absence.

## 9. Before handing off

- Does every public page have unique title/description, not a
  site-wide default?
- Is heading structure logical and semantic HTML used over generic
  divs?
- Are canonical/robots/sitemap correctly reflecting what should and
  shouldn't be indexed?
- Does every piece of user-facing copy say something specific to this
  product/action, or could it be pasted into any other app unchanged?