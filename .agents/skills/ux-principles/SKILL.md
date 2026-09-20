---
name: anti-generic-design
description: Guidance for producing distinctive, intentional visual and interaction design that doesn't read as templated AI output. Consult this BEFORE designing or implementing any new screen, component, or visual element — mandatory for UI Designer, Design System Agent, Frontend Engineer, and any agent producing copy. Use whenever the task involves a hero section, landing page, dashboard, form, empty/error state, color palette, typography choice, or component visual design. Covers the specific clichés to avoid and the process for making deliberate choices instead.
---

# Anti-Generic Design

The goal: every screen this project ships should look like it was made
*for this product, by someone who thought about it* — not like it fell
out of a generic AI-design template. This skill exists because that
outcome doesn't happen by default; it takes deliberate choices at each
step below.

**Owned primarily by:** UI Designer (3.9) and Design System Agent
(3.10) for visual direction; Frontend Engineer (4.13) must implement
faithfully to the direction, not fall back to defaults under time
pressure; Content/Copywriting Agent (9.33) for copy specifically (§5).

---

## 1. Recognize the clichés first

Right now, AI-generated design clusters around a small number of
recognizable defaults. If a design matches one of these *by default*
rather than as a deliberate choice for this specific product, that's
the signal to stop and reconsider:

- **Warm-cream-and-serif**: near-white/cream background, a high-contrast
  serif display face, a single terracotta/warm-clay accent color.
- **Near-black-with-neon-accent**: dark background, one bright
  acid-green or vermilion accent color, sparse layout.
- **Newspaper/broadsheet**: hairline rules, zero border-radius, dense
  multi-column layout, small caps labels.
- **The generic SaaS hero**: centered headline + subheadline + two
  buttons ("Get Started" / "Learn More") + a vague gradient blob or
  abstract 3D shape behind it.
- **Generic card grid**: identical rounded-corner cards with an icon
  circle, a bold title, and two lines of filler description, repeated
  3-6 times, regardless of whether the content actually has that shape.
- **Purple/blue gradient on everything** as the default "modern SaaS"
  palette, chosen because it's safe, not because it fits the product.
- **Default font stack**: Inter/system-ui for everything, no type
  personality, because it's the safe default rather than a choice.
- **Numbered-step markers (01 / 02 / 03)** applied to content that
  isn't actually sequential — decoration masquerading as structure.
- **Stock-photo people smiling at laptops**, or generic undraw-style
  flat illustrations, standing in for actual product content.
- **Excessive scroll-triggered fade-ins on every element** — motion
  used as decoration rather than because it serves the interaction.

None of these are permanently banned — a real brief might call for a
dark minimal UI, or a serif display face. The test is: **would this be
the answer for almost any product in this category, or is it a choice
made because of what *this* product actually is?**

## 2. Ground every choice in the actual product

Before choosing a palette, a typeface, or a layout, be able to answer:
who uses this, in what context, and what's the one thing this specific
screen needs to do? The product's own domain — its content, its actual
data, its real vocabulary — is where distinctive choices come from, not
from a generic "modern web app" aesthetic layered on top.

If the brief/requirement doesn't specify a visual direction, don't
default to safe-and-generic — make one concrete, justified choice and
state it (in the handoff, and in `conventions.md` once established).

## 3. Work in two passes: plan, then build

**Pass 1 — Design plan (before writing any code):**
- **Color:** 4-6 named colors with hex values, chosen for *this*
  product, not the safe default palette.
- **Type:** 2 typeface roles minimum — a display face used with
  restraint, and a complementary body face — paired deliberately, not
  "whatever's already imported."
- **Layout:** the actual structural concept for this screen, described
  in a sentence or a rough wireframe, before jumping to code.
- **Signature:** the one memorable, specific element this screen will
  be remembered by — a distinctive interaction, a specific way data is
  visualized, a particular structural device that actually means
  something for this content.

**Pass 2 — Self-critique before building:**
Check the plan against §1's cliché list. If any part of it is what
you'd produce for almost any similar product, revise that part and
note what changed and why. Only then implement — and implement the
revised plan faithfully; don't quietly drift back to defaults once
you're deep in code.

Record the resulting palette/type/spacing decisions in
`.agents/knowledge/conventions.md` (under "UI / component conventions")
so every later screen stays consistent with this one, instead of each
new screen re-inventing its own direction.

## 4. Restraint

Spend boldness in one place — the signature element — and keep
everything around it disciplined and quiet. Not every element needs its
own animation or its own visual flourish; excess ornamentation reads as
templated just as much as excess sameness does. Before shipping, ask:
if I removed one decorative element, would this be better? If yes,
remove it.

Baseline quality bar, non-negotiable regardless of aesthetic direction:
- Responsive down to mobile — actually check it, don't assume.
- Visible keyboard focus states on every interactive element.
- Respect `prefers-reduced-motion` for anything beyond subtle transitions.
- Real content/data in the design, not lorem ipsum or placeholder
  copy left in past the draft stage.

## 5. Copy is design material, not filler

Generic copy makes a well-designed screen feel templated anyway.
Applies to Content/Copywriting Agent (9.33) directly, and to any other
agent writing UI text when Copywriting isn't in the loop:

- Write from the end user's side of the screen: name things by what
  people control and recognize (*"notifications"*), not by internal
  system names (*"webhook config"*).
- Use active voice describing exactly what happens: a button says
  *"Save changes,"* not *"Submit"* — and the resulting confirmation
  matches it (*"Changes saved,"* not a generic *"Success"*).
- Never ship *"Welcome to [Product]"*, *"Lorem ipsum,"* or
  *"An error occurred"* as final copy. Errors state what happened and
  what to do about it, in the product's voice — never vague, never
  apologetic filler.
- Empty states are an invitation to act, not just an absence notice —
  say what the user can do from here.
- Keep register plain and consistent: no filler words, sentence case
  unless the project's convention says otherwise, one job per line of
  copy (a label labels, an example demonstrates — don't make one
  string do both).

## 6. Before handing off

- Does this match a cliché from §1 by default, or was every major
  choice deliberate and justified for *this* product?
- Is there one signature element someone would actually remember, or
  is everything uniformly safe?
- Did real copy replace all placeholder text?
- Is the palette/type/spacing decision recorded in `conventions.md` so
  the next screen stays consistent?
- Baseline bar met: responsive, keyboard-focusable, reduced-motion
  respected? (Full accessibility detail lives in `ux-principles`.)