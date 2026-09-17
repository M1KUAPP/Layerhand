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
1.  [Page layout](#page-layout)
1.  [The four techniques](#the-four-techniques)
1.  [The footer](#the-footer)
1.  [Fallbacks](#fallbacks)
1.  [Acceptance](#acceptance)
1.  [Do and do not](#do-and-do-not)
1.  [See also](#see-also)

## Decisions

Four questions were open when the research landed. All four are settled,
and nothing below reopens them.

| Question               | Decision                                              |
| ---------------------- | ----------------------------------------------------- |
| Scope                  | Four techniques: parallax, layer switcher, drawer, 3D |
| Typeface               | Newsreader for display, Geist for UI                  |
| Canvas UI page effects | Object effects only; no flag, no origin trial         |
| React                  | One island is permitted on the landing page           |

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

The September 17 redesign adds two styles to that scale:

| Style             | Family     | Weight  | Size / line                    | Tracking |
| ----------------- | ---------- | ------- | ------------------------------ | -------- |
| Display / Section | Newsreader | Medium  | 56 / 52; 38 / 38 below 1280 px | -4.5%    |
| UI / Lede large   | Geist      | Regular | 18 / 28                        | 0        |

Section titles use Display / Section. Card titles, the footer line and
stats use Display / H2 at their own sizes.

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
raw hex values. The original set is 19 colours over 41 primitives; the
redesign adds the band and illustration tokens below.

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

The band is a chrome ground in either colour scheme. Its text never
flips, for the same reason `color/bg/chrome` does not.

| Token                            | CSS                                | Light     | Dark      |
| -------------------------------- | ---------------------------------- | --------- | --------- |
| `color/bg/band`                  | `--color-bg-band`                  | `#11110F` | `#1C1C19` |
| `color/bg/band-panel`            | `--color-bg-band-panel`            | `#1C1C19` | `#11110F` |
| `color/text/on-chrome`           | `--color-text-on-chrome`           | `#F3F0E8` | `#F3F0E8` |
| `color/text/on-chrome-secondary` | `--color-text-on-chrome-secondary` | `#B6B3AA` | `#B6B3AA` |
| `color/border/on-chrome`         | `--color-border-on-chrome`         | `#3D3C38` | `#3D3C38` |
| `color/illustration/warm`        | `--color-illustration-warm`        | `#FF9A3D` | `#FF9A3D` |
| `color/illustration/checker`     | `--color-illustration-checker`     | `#D9D6CD` | `#D9D6CD` |

The two illustration colours are never text. Every other value in this
table already exists among the design system's primitives.

Corners stay square. `radius/none` is the default everywhere, and
`radius/full` exists only for a circular control. There are no decorative
gradients. The hero grid and the switcher's vignette and checkerboard are
illustration. The step cards and run log are flat, square, bordered
content panels. Elevation is two effect styles reserved for overlays;
surfaces stay flat.

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
- **Movement stays on the compositor.** Animate `transform`, `opacity`
  and `filter`. Use the separate `translate` property rather than
  `transform` so a movement cannot overwrite a scale. Colour and rule
  transitions on the bar and controls use `--duration-swap` and
  `--ease-settle`; they do not move the layout.
- **Interruptible.** Anything the visitor toggles, such as the drawer, is
  a CSS transition. Apart from loading spinners, keyframes are for
  one-shot entrances. The ticker is the one looping page-animation
  exception: a pausable, 48-second linear `translate` loop.
- **The entrance gate.** A `data-enter` attribute on the root goes from
  `pending` to `run` after `document.fonts.ready` and two animation
  frames, with a 1200ms fallback, then to `done`. This keeps the headline
  from animating in the fallback face and then reflowing.

### Reduced motion

Under `prefers-reduced-motion: reduce`:

- Parallax and every large movement are disabled. The hero's plate and
  chips do not drift.
- The ticker is still and its pause control is hidden.
- Transitions become cross-fades. Press feedback and spinners stay.
- The Three.js object stops its float and rock animation and renders one
  still frame.
- Back to top scrolls instantly rather than smoothly.

Moving content that runs longer than five seconds needs a visible pause
control regardless of this setting, under WCAG 2.2.2. The ticker has one.

## Page layout

The September 17 redesign follows Cekgu, an earlier project by the same
team. The owner judged the old page bland: its sections lacked contrast,
and a scrub of two tinted planes meant nothing to a customer. The new
page keeps Layerhand's typefaces, primitives, square corners and flat
surfaces. Contrasting grounds separate the sections, and the layer
switcher shows what a separate edit means.

The page runs in this order:

1.  The sticky site bar.
1.  The hero and ticker in one pinned shell.
1.  How it works, on `color/bg/subtle`.
1.  The layer switcher, on `color/bg/band`.
1.  A real run and its drawer, on paper.
1.  The Glass Object, on `color/bg/band`.
1.  Launch updates, on the accent.
1.  The shared footer, on `color/bg/subtle`, with Back to top beside it.

### The site bar

`header.site-header` is sticky and 72px tall. The wordmark begins with a
28px accent square carrying an L in Newsreader, followed by Layerhand.
Its links are How it works, The layers, A real run and Updates. Try it
free opens the workbench. The section links hide below 1280px.

The bar is transparent over the hero at the top of the landing. Beyond
24px of scroll, `data-scrolled` on the root makes it 94% paper with a 1px
rule. Background and rule transition over `--duration-swap` on
`--ease-settle`. There is no backdrop blur. The workbench bar is solid
from the start.

### The hero shell

`.hero-shell` holds the hero and ticker, one viewport tall, sticky at the
top at `z-index: 0`. A single opaque `.landing-body` at `z-index: 1`
holds the remaining sections and slides up over it. Below 1280px the
shell is no longer pinned. Its paper ground carries a 64px grid drawn
with `--rule` at 60%.

The eyebrow pairs an accent AI retouching chip with Built on GPT-6 Astra.
The headline reads "A layered PSD, not a flat JPEG." The lede says what
happens: Layerhand retouches the photograph in Photopea while the visitor
watches, accepts corrections, and returns each edit on its own named
layer.

Retouch a photo is an inverse button with an accent hover. Get launch
updates by email is outlined. The three facts below are Three free runs,
No account needed and Uploads deleted within 24 hours.

The editor window shows the 97 KB `editor-frame.jpg`, derived from the
[final frame of the sample-photo run](/docs/evidence/driving-mechanism/results/computer-1-sample-photo.png/final-frame.png).
It is a still from a real run, not an autoplay demo. An offset accent
sheet sits behind the window. Two chips read "4 named layers in 13 steps"
and "Correct it while it works". The caption identifies the last frame
of a real run on the sample photograph.

### The ticker

The shell's last row is a 56px band. Accent squares separate seven claims:
Named layers, Editable masks, Adjustment layers, Correct it mid-run,
Driven in Photopea, Built on GPT-6 Astra and Opens in Photoshop.

The list translates in a 48-second linear loop. It pauses on hover, on
focus within the band, and through the button labelled "Pause the moving
list". The duplicate list is hidden from assistive technology. Under
reduced motion the list is still and the button hides.

### How it works

A sticky introduction on the subtle ground heads four paper cards. The
title is "Four steps, and you can step in on the third." The lede explains
that Layerhand paints nothing itself: Astra operates a real image editor,
so the edits remain layers the visitor can open.

The index beside the introduction marks the card nearest the middle of
the screen. It repeats the card titles and is hidden from assistive
technology. The cards are flat, square and bordered, with 48px accent
icon tiles:

1.  Drop in a photograph.
1.  Say what you want.
1.  Watch it work, and correct it.
1.  Download the layered PSD.

### Launch updates

The waitlist takes the accent ground and `color/text/on-accent` text.
The field uses `color/text/on-chrome` for its ground and `color/bg/chrome`
for its text. The button reverses those two tokens. The section follows
the glass band, before the shared footer.

## The four techniques

One technique per section, in page order. None of them may be the only
way a message reaches a visitor.

### Hero: layered parallax

The pinned hero adapts the
[MotionSites parallax lesson](/docs/research/design/motionsites.md#layered-parallax-hero).
Its words stay still while the plate and the two chips drift as the page
slides over them.

Progress is `scrollY / hero.offsetHeight`, clamped from 0 to 1. It maps to
0% to -6% for the plate and 0% to -60% for each chip, relative to each
element's own height. The photograph no longer drifts inside the plate.
Under reduced motion neither plate nor chips drift.

Two parts of the lesson are dropped. Its foreground image sits above the
headline, which needs a cut-out of the subject and hides words wherever
the two overlap. Its lede is set in `mix-blend-mode: overlay`, which on
our paper puts ink at about 1.1:1.

### The layer switcher

The switcher replaced the scrubbed layer-separation clip on September 17.
The old clip, its poster still and the script that generated them are
gone. The section keeps the scrub's headline: "A flat JPEG keeps the
result. A PSD keeps the work."

It sits on `color/bg/band`, and its window takes `color/bg/band-panel`.
It shows the sample photograph with the four layers of the September 15
run on it, top of the stack first, drawn by the browser:

1.  Darken corners softly: raster, with a mask, at 30% opacity.
1.  Warm colours: an adjustment layer with a mask.
1.  Brighten photograph: an adjustment layer with a mask.
1.  Original photograph: raster.

Each layer row carries an eye button, with `aria-pressed`, that switches
that layer on or off independently. Brightness is a filter of
brightness, contrast and saturation; the warmth is a soft-light sheet at
62% opacity; the corners are a radial gradient at 72%. With the original
switched off the checkerboard shows through and the adjustments have
nothing to affect.

Two modes, Layered PSD and Flat JPEG, use `aria-pressed` buttons. In
Layered PSD mode the four layers are switchable. Flat JPEG mode bakes
every effect in, shows one locked Background layer, counts the layers as
1 and makes the layer list inert. The caption states that the browser
draws an illustration, not a recording or a PSD.

### Layer reveal: the drawer

A bottom sheet carrying the layer list, from
[Jakub Antalik's portfolio](/docs/research/design/jakub-antalik.md#the-drawer):
`translateY(100%)` to `0` over `--duration-drawer` on `--ease-drawer`.

The section is "A real run", on paper. The sheet holds the named layers
of the September 15 native-steering run on a seascape, which makes the
artifact, a layered PSD, not a flat JPEG, literal rather than described.
It is a CSS transition, so it is interruptible. Its opening and focus
behaviour is unchanged from the drawer spec.

The copy and the run log are recorded from that run, not the sample
photograph in the hero and switcher. The stats are 16 steps, 3 min 13 s,
one correction accepted in 194 ms, and four named layers. The log plays
its narrations:

1.  "I'll inspect the editor and create the brightness adjustment."
1.  "I'll add Brightness/Contrast as an editable adjustment layer."
1.  "I'll gently brighten the scene while retaining its soft highlights."
1.  A correction panel: "Keep the vignette very subtle, and leave the
    middle of the photograph untouched." Accepted in 194 ms. Nothing
    restarted.
1.  "I'll use restrained warmth and keep the vignette off the middle."
1.  "I'll name the warming layer clearly."
1.  "I'll label both adjustments and add a separate vignette layer."
1.  A gap note: steps 7 to 15 paint the corners, finish the names and
    save the PSD.
1.  "I'll close the menu and check the final layered result."

### The Three.js moment

Canvas UI's **Glass Object**, pointed at a stacked-layers SVG, from
[Canvas UI](/docs/research/design/canvas-ui.md#threejs-objects). It needs
`three` and `@types/three` and nothing else, and it runs in every browser
with no flag.

Use the vanilla build, not the React one. Defaults worth keeping:
`ior 1.75`, `thickness 4`, `roughness 0.25`, `dispersion 1.5`.

The redesign moves the section onto `color/bg/band` and tints the object
a fixed light tone from `color/text/on-chrome`, so it reads on the band
in either colour scheme. Behaviour and defaults are otherwise unchanged.

Canvas UI's html-in-canvas effects, Peel, Laser, Particle Scroll, Bend
and the cursor effects, are **out of scope**. Peel is the most
on-message effect in the library and it is still out, because it would
work only in Chrome with a token for a domain that does not exist yet.

## The footer

One footer serves every view, the landing page and the workbench alike.
It sits in the page shell rather than in a view, so changing view never
redraws it. On `color/bg/subtle`, with a 1px `color/border/default` rule
on top, it is a right-aligned stack:

1.  The wordmark: the 28px accent L, then Layerhand.
1.  The tagline as a closing line, in Display / H2 at 40 / 40, and 28 /
    30 below 1280px.
1.  The credits: the GPT-6 Astra Challenge, and Photopea, which
    Layerhand drives and is not affiliated with.
1.  Source on GitHub, last.

Its right padding clears the Back to top control, which sits beside the
stack rather than over it.

The page folds over it. The footer is fixed to the floor of the viewport
behind the page, and the page keeps a bottom margin exactly as tall as
the footer, measured again whenever the footer resizes. As the last
screen scrolls away, the page's bottom edge, a 1px `color/border/default`
rule, lifts off the footer and uncovers it from its bottom row up. At the
end of the page the footer is wholly in view, and the page ends exactly
where the footer begins.

- **Nothing moves.** The fold is the page scrolling away from a footer
  that stays put, so reduced motion changes nothing.
- **Keyboard.** A footer link that takes focus scrolls the page to its
  end, so the link is never hidden under the page, under WCAG 2.4.11.
- **No JavaScript, and print.** The footer stays in the flow after the
  page. In print a fixed footer would repeat on every sheet.
- **Below 1280px.** The footer stacks to one column and shows with the
  landing page; it hides only with the workbench, behind the NFR-7
  gate (#128).

### Back to top

A 44px square control with a strong border, fixed
24px from the bottom and right of the viewport, and 16px from each below
1280px. It appears once the page has scrolled past one viewport height,
`data-far` on the root, and stays for the rest of the page. Before that
point it is out of the tab order and `aria-hidden`. Clicking it scrolls
to the top, smoothly, or instantly under reduced motion. It is hidden
while the drawer is open.

## Fallbacks

- **Below 1280px.** [NFR-7](PRD.md#non-functional-requirements) puts only
  the workbench out of scope below 1280px.
  [#128](https://github.com/M1KUAPP/astra/issues/128) settled, on
  September 16-17, that the landing page and waitlist render there: the
  hero holds together down to 390px.
- **No WebGL.** The Glass Object section falls back to the flat SVG. The
  page loses nothing it needed.
- **No JavaScript.** The page states what Layerhand is, shows the poster
  frame, and the waitlist form still posts.
- **Slow network.** The hero's still frame, a 97 KB JPEG, carries the
  message. Every section reads with no motion at all.

The React island is permitted only for an effect that exists solely as a
React component. It loads after the hero, never blocks first paint, and
if it fails the section around it still reads.

## Acceptance

Checked at two viewports, 1440x900 and 1280x800, in Chrome and one
non-Chromium browser:

1.  The differentiator is readable above the fold without scrolling.
1.  The demo loop autoplays muted and reads without sound.
1.  Each of the four techniques appears once, in its own section.
1.  The bar is clear at the top of the landing and takes the paper once
    the page moves.
1.  The ticker can be paused, and does not move under reduced motion.
1.  Switching a layer off in the switcher visibly changes the photograph.
1.  Every UI glyph comes from Hugeicons Stroke Rounded.
1.  With `prefers-reduced-motion`, nothing parallaxes, loops or floats,
    and every section still reads.
1.  No text uses `color/text/muted`.
1.  The waitlist submits, and the product is reachable without joining it.
1.  At the end of every view the footer is wholly uncovered, and a
    focused footer link is never hidden under the page.

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
