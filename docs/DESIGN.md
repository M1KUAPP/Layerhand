# Design: Layerhand

The visual specification for the Layerhand landing page. It turns the
[design research](/docs/research/design/README.md) into binding values:
one typeface pairing, one colour set, one icon library, one motion
vocabulary, and which technique belongs in which section. Where this
document and a research page disagree, this one wins.

Conventions for code live in [the project rules](/docs/agents/rules.md).
This document covers only how the page looks and moves.

Contents:

1.  [Decisions](#decisions)
1.  [Typeface](#typeface)
1.  [Colour](#colour)
1.  [Icons](#icons)
1.  [Motion](#motion)
1.  [The four techniques](#the-four-techniques)
1.  [Fallbacks](#fallbacks)
1.  [Acceptance](#acceptance)
1.  [Do and do not](#do-and-do-not)
1.  [See also](#see-also)

## Decisions

Four questions were open when the research landed. All four are settled,
and nothing below reopens them.

| Question               | Decision                                                 |
| ---------------------- | -------------------------------------------------------- |
| Scope                  | All four techniques: sticky scroll, drawer, parallax, 3D |
| Typeface               | Newsreader for display, Geist for UI                     |
| Canvas UI page effects | Object effects only; no flag, no origin trial            |
| React                  | One island is permitted on the landing page              |

The third decision follows from a fact rather than a preference: Canvas
UI's page effects need an html-in-canvas origin-trial token registered to
a domain, and [#30](https://github.com/M1KUAPP/astra/issues/30) shows the
domain is not registered. Its Three.js object effects need no token and
run everywhere, so those are the only Canvas UI components in scope.

The fourth reverses a line in
[the launch application design](/docs/references/launch-application-design.md),
which is amended to match. The island is confined to the landing page.
The workbench stays plain TypeScript.

## Typeface

Two families, loaded as webfonts. The shipped page sets
`Arial, Helvetica, sans-serif`; this replaces it.

| Style        | Family     | Weight   | Size / line | Tracking | Case  |
| ------------ | ---------- | -------- | ----------- | -------- | ----- |
| Display / H1 | Newsreader | Medium   | 88 / 78     | -6.5%    |       |
| Display / H2 | Newsreader | Medium   | 28 / 28     | -4.5%    |       |
| UI / Lede    | Geist      | Regular  | 16 / 24     | 0        |       |
| UI / Body    | Geist      | Regular  | 15 / 20     | 0        |       |
| UI / Small   | Geist      | Regular  | 13 / 18     | 0        |       |
| UI / Label   | Geist      | SemiBold | 13 / 16     | 0        |       |
| UI / Eyebrow | Geist      | SemiBold | 11.5 / 14   | +13%     | Upper |
| UI / Micro   | Geist      | SemiBold | 11 / 13     | +10%     | Upper |

These are the eight text styles in the
[Figma design system](https://www.figma.com/design/2uTSs2wgXhaj0TbYchr3ze/Layerhand-Design-System?node-id=0-1),
and the names match exactly, so a design and its implementation can be
compared line by line.

Loading rules:

- `font-display: swap`, not `block`. The fallback is the Arial stack the
  page ships today, so a flash of it costs nothing, and a blocked render
  on launch day costs everything.
- Preload only Newsreader Medium and Geist Regular. Every other weight
  loads normally.
- The hero headline may be set at `clamp(3rem, 8vw, 88px)`. No other size
  is fluid; the rest of the scale is fixed.
- A serif headline over a sans body is the deliberate contrast Jakub
  Krehel's `better-typography` describes. Do not add a third family.

## Colour

The landing page uses the semantic tokens from the design system and no
raw hex values. The full set is 19 colours over 41 primitives; these are
the ones a landing page needs.

| Token                  | CSS                      | Light     | Dark      |
| ---------------------- | ------------------------ | --------- | --------- |
| `color/bg/page`        | `--paper`                | `#F3F0E8` | `#11110F` |
| `color/bg/chrome`      | `--color-bg-chrome`      | `#11110F` | `#11110F` |
| `color/bg/subtle`      | `--color-bg-subtle`      | `#E9E5DA` | `#1C1C19` |
| `color/bg/accent`      | `--accent`               | `#C7FF4A` | `#C7FF4A` |
| `color/bg/inverse`     | `--color-bg-inverse`     | `#11110F` | `#F3F0E8` |
| `color/text/primary`   | `--ink`                  | `#11110F` | `#F3F0E8` |
| `color/text/secondary` | `--color-text-secondary` | `#4E4D49` | `#B6B3AA` |
| `color/text/tertiary`  | `--color-text-tertiary`  | `#5F5E59` | `#9D9B94` |
| `color/text/on-accent` | `--color-text-on-accent` | `#11110F` | `#11110F` |
| `color/border/default` | `--rule`                 | `#CFCCC3` | `#3D3C38` |
| `color/border/strong`  | `--color-border-strong`  | `#11110F` | `#F3F0E8` |

Three rules that are not obvious from the table:

- **`color/text/muted` is not a text colour.** It measures 2.44:1 on
  paper, below the 4.5 WCAG AA floor, and any value dark enough to pass
  is `color/text/tertiary` already. Use it for rules and marks only.
- **`color/bg/chrome` never flips.** It is ink in both modes, because
  `color/bg/inverse` inverts and would turn a dark bar into a pale one
  while the text over it stayed pale.
- **The accent never flips either.** Chartreuse on ink and chartreuse on
  paper are both intended; text over it binds to `color/text/on-accent`.

Corners stay square. `radius/none` is the default everywhere, and
`radius/full` exists only for a circular control. There are no gradients
and no decorative cards. Elevation is two effect styles reserved for
overlays; surfaces stay flat.

## Icons

One library for every UI glyph, a second only for large illustration.

| Need                    | Library                  | Size    |
| ----------------------- | ------------------------ | ------- |
| Every UI glyph          | Hugeicons Stroke Rounded | 16–24px |
| Section and feature art | Isocons                  | 48px +  |

Hugeicons loads as an icon font from the CDN, which needs no account and
no build step:

```html
<link rel="stylesheet" href="https://use.hugeicons.com/font/icons.css" />
<i class="hgi-stroke hgi-layers-01" aria-hidden="true"></i>
```

- Use `use.hugeicons.com`. The older `cdn.hugeicons.com/font/` URL is
  deprecated and frozen on a 2024 build.
- Stroke width is 1.5 beside regular text and 2 beside semibold.
- Colour is `currentColor`, size is set in `em` next to text, and every
  icon is checked at 16px.
- The free style has no filled twin, so an active state comes from colour
  or weight. Never swap outline for filled.
- An icon font renders as text. Decorative icons take `aria-hidden="true"`
  and every icon-only button carries an accessible name.
- A contextual icon swap animates scale `0.25` to `1`, opacity `0` to `1`
  and blur `4px` to `0`.

Isocons export raw SVG and need no account. Use them for one illustrative
moment per section at most.

## Motion

### Motion tokens

```css
--ease-reveal: cubic-bezier(0.22, 1, 0.36, 1);
--ease-settle: cubic-bezier(0.16, 1, 0.3, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
--duration-exit: 150ms;
--duration-swap: 200ms;
--duration-drawer: 400ms;
--duration-enter: 700ms;
--stagger-block: 100ms;
--stagger-word: 80ms;
```

### Motion rules

- **Entrances** enter from opacity `0`, `translateY(12px)` and
  `blur(4px)`. Blocks stagger by `--stagger-block`, words in a headline by
  `--stagger-word`. Exits run `--duration-exit` to `-12px`.
- **Compositor only.** Animate `transform`, `opacity` and `filter` and
  nothing else. Use the separate `translate` property rather than
  `transform` so a movement cannot overwrite a scale.
- **Interruptible.** Anything the visitor toggles, such as the drawer, is
  a CSS transition. Keyframes are for one-shot entrances only.
- **The entrance gate.** A `data-enter` attribute on the root goes from
  `pending` to `run` after `document.fonts.ready` and two animation
  frames, with a 1200ms fallback, then to `done`. This keeps the headline
  from animating in the fallback face and then reflowing.

### Reduced motion

Under `prefers-reduced-motion: reduce`:

- Parallax, the scroll scrub and every large movement are disabled. The
  sticky section becomes a static poster.
- Transitions become cross-fades. Press feedback and spinners stay.
- The Three.js object stops its float and rock animation and renders one
  still frame.
- A muted looping video longer than five seconds needs a visible pause
  control regardless of this setting, under WCAG 2.2.2.

## The four techniques

One technique per section, in page order. None of them may be the only
way a message reaches a visitor.

### Hero: layered parallax

Four layers in a section at least `100vh` tall with overflow hidden,
adapted from the
[MotionSites parallax lesson](/docs/research/design/motionsites.md#layered-parallax-hero):

1.  The photograph: the demo loop, or its poster until the loop exists,
    at 120% of its plate's height, drifting inside the plate.
1.  The headline, held still.
1.  The lede, held still.
1.  The plate that frames the photograph, drifting with the scroll.

Scroll maps 0–1 to 0%–8% for the photograph and 0%–4% for the plate,
where 0 is the section's top at the top of the viewport and 1 is its
bottom there. The words stay put while the plate and the photograph
inside it drift at two rates, so the hero shows three planes of depth
and nothing ever passes over a word.

Two parts of the lesson are dropped. Its foreground image sits above the
headline, which needs a cut-out of the subject and hides words wherever
the two overlap. Its lede is set in `mix-blend-mode: overlay`, which on
our paper puts ink at about 1.1:1.

### Layer reveal: the drawer

A bottom sheet carrying the layer list, from
[Jakub Antalik's portfolio](/docs/research/design/jakub-antalik.md#the-drawer):
`translateY(100%)` to `0` over `--duration-drawer` on `--ease-drawer`.

The sheet holds the named layers of the retouched photograph, which makes
the artifact — a layered PSD, not a flat JPEG — literal rather than
described. It is a CSS transition, so it is interruptible.

### Sticky scroll: the scrubbed layer separation

A Gemini clip of a photograph separating into its layers, scrubbed by
scroll, from the
[MotionSites scrub lesson](/docs/research/design/motionsites.md#scroll-scrubbed-video).
The clip is produced by the
[video pipeline](/docs/research/design/video-pipeline.md).

- Three layers fixed at `inset: 0` with pointer events off: a poster, a
  `<video>`, and a `<canvas>`. The poster fades out once a frame exists
  and the canvas fades in once its cache is ready, each over 500ms.
- Progress is `scrollY / (scrollHeight - innerHeight)` clamped to 0–1,
  smoothed with `smoothed += (target - smoothed) * 0.12` each frame.
- The frame cache extracts up to 90 frames, or `duration * 12` with a
  minimum of 24, at up to 960px wide as `ImageBitmap`s, starting 300ms
  after `loadeddata`. Device pixel ratio is capped at 2.
- Until the cache is ready, seek the visible video to
  `smoothed * (duration - 0.05)` whenever the change exceeds 0.04s.
- An `80vh` spacer sets how much scrolling the scrub consumes.
- No text is baked into the clip, so the headline stays editable.

### The Three.js moment

Canvas UI's **Glass Object**, pointed at a stacked-layers SVG, from
[Canvas UI](/docs/research/design/canvas-ui.md#threejs-objects). It needs
`three` and `@types/three` and nothing else, and it runs in every browser
with no flag.

Use the vanilla build, not the React one. Defaults worth keeping:
`ior 1.75`, `thickness 4`, `roughness 0.25`, `dispersion 1.5`.

Canvas UI's html-in-canvas effects — Peel, Laser, Particle Scroll, Bend
and the cursor effects — are **out of scope**. Peel is the most
on-message effect in the library and it is still out, because it would
work only in Chrome with a token for a domain that does not exist yet.

## Fallbacks

- **Below 1280px.** [NFR-7](PRD.md#non-functional-requirements) puts the
  workbench out of scope below 1280px.
  [#128](https://github.com/M1KUAPP/astra/issues/128) asks whether the
  landing page and waitlist should render there anyway, and that is still
  a team decision. This document does not settle it; whichever way it
  goes, the hero must not break at 390px.
- **No WebGL.** The Glass Object section falls back to the flat SVG. The
  page loses nothing it needed.
- **No JavaScript.** The page states what Layerhand is, shows the poster
  frame, and the waitlist form still posts.
- **Slow network.** The poster carries the message until the clip loads.
  Every section reads with no motion at all.

The React island is permitted only for an effect that exists solely as a
React component. It loads after the hero, never blocks first paint, and
if it fails the section around it still reads.

## Acceptance

Checked at two viewports, 1440x900 and 1280x800, in Chrome and one
non-Chromium browser:

1.  The differentiator is readable above the fold without scrolling.
1.  The demo loop autoplays muted and reads without sound.
1.  Each of the four techniques appears once, in its own section.
1.  Every UI glyph comes from Hugeicons Stroke Rounded.
1.  With `prefers-reduced-motion`, nothing parallaxes, scrubs or floats,
    and every section still reads.
1.  No text uses `color/text/muted`.
1.  The waitlist submits, and the product is reachable without joining it.

That last line is not a style preference. Product Hunt's
[featuring guidelines](https://help.producthunt.com/en/articles/9883485-product-hunt-featuring-guidelines)
exclude waitlisted products unless immediate access is provided, so a
page that leads with email capture risks not being featured at all.

## Do and do not

- **Do** take the technique from a research page and leave its typeface,
  copy and hosted video behind. Every MotionSites prompt pins assets that
  are not ours.
- **Do** design the no-motion version of a section first.
- **Do not** add a third typeface, a colour outside the tokens, or a
  second icon library.
- **Do not** use an html-in-canvas effect.
- **Do not** let an effect carry meaning on its own.
- **Do not** put React anywhere but the landing page island.

## See also

- [Layerhand Design System](https://www.figma.com/design/2uTSs2wgXhaj0TbYchr3ze/Layerhand-Design-System?node-id=0-1) —
  the Figma file, view-only. 92 variables, 8 text styles, 2 effect
  styles and 33 components on one page. It is the source for every
  token name and type value in this document.
- [Design research](/docs/research/design/README.md) — the eight sources.
- [Product requirements](PRD.md) — FR-30 to FR-33 and NFR-7.
- [Launch application design](/docs/references/launch-application-design.md) —
  the single-page experience this page sits beside.
- [Markdown style guide](/docs/references/markdown-style.md).
