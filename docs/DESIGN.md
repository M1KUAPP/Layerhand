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
1.  [The workbench input view](#the-workbench-input-view)
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

The landing polish adds tokens for surfaces, controls and depth:

| Token                  | CSS                     | Light     | Dark      |
| ---------------------- | ----------------------- | --------- | --------- |
| `surface/glass`        | `--glass-fill`          | dynamic   | dynamic   |
| `surface/glass-chrome` | `--glass-fill-chrome`   | dynamic   | dynamic   |
| `surface/glass-blur`   | `--glass-blur`          | blur      | blur      |
| `color/bg/field`       | `--color-bg-field`      | `#FBFAF6` | `#181815` |
| `color/bg/disabled`    | `--color-bg-disabled`   | `#DEDAD0` | `#2A2A27` |
| `color/text/disabled`  | `--color-text-disabled` | `#55534E` | `#B6B3AA` |
| `color/pattern/dot`    | `--color-pattern-dot`   | `#BFBBB0` | `#3A3935` |
| `elevation/card`       | `--shadow-card`         | 24px drop | 24px drop |
| `elevation/lift`       | `--shadow-lift`         | 18px drop | 18px drop |
| `elevation/sheet`      | `--shadow-sheet`        | 28px drop | 28px drop |

The surface and depth tokens serve specific roles across the page and the
workbench:

- `--glass-fill` mixes paper at 76% in oklab for glass over light grounds.
- `--glass-fill-chrome` mixes band at 74% in oklab for glass under light
  text over dark or moving content.
- `--glass-blur` is `blur(20px) saturate(1.4)`. It is the only value
  permitted in any `backdrop-filter` rule across the codebase.
- `--color-bg-field` provides a solid ground for text inputs, textareas
  and the upload drop zone.
- `--color-bg-disabled` and `--color-text-disabled` provide high-contrast
  solid fills and text for disabled buttons and controls (5.5:1 in light
  mode and 6.9:1 in dark mode).
- `--color-pattern-dot` draws the 20px dot pattern on the sketchboard.
- `--shadow-card` provides resting depth for the workbench card.
- `--shadow-lift` provides elevation when cards or interactive tiles lift
  under the pointer.
- `--shadow-sheet` creates the sheet boundary where a stacked section
  slides over the section before it.

Surfaces are solid or glass. Every button, field, card and container
paints one of two fills:

- **Solid:** a token colour with no transparency.
- **Glass:** `var(--glass-fill)`, or `var(--glass-fill-chrome)` under light
  text, together with `backdrop-filter: var(--glass-blur)`. Glass is
  permitted only over a photograph, a pattern or moving content: the
  scrolled site bar on both views, Back to top, the hero chips and the
  hero replay overlay.

A surface never sits on `transparent`, never uses a see-through fill
without the blur token, and never has `opacity` below 1 at rest. Opacity
may still animate an entrance. The illustration layers inside the layer
switcher stage are not surfaces, and nor is the wordmark, the site's name
set on the site bar.

Corners stay square everywhere. There is no `border-radius` anywhere.
Decorative gradients are restricted: gradient functions appear only in
`src/web/landing/switcher.css` (the vignette) and in rules for `.hero-shell`
(pointer spotlight and grid) or `.workbench-board` (sketchboard dots).
Surfaces stay flat except where depth is applied through the three shadow
tokens.

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

- **Entrances and scroll reveals.** Entrances start from opacity `0`,
  `translate: 0 12px` and `blur(4px)`. `landing/reveal.ts` mounts an
  `IntersectionObserver` with a 0.15 threshold for below-the-fold content:
  section eyebrows, titles, bodies, step cards, drawer stats, glass facts,
  question tiles and the waitlist form. Targets enter over `--duration-enter`
  with `--ease-reveal`, staggered within each section by `--stagger-block`.
  Each enters once and holds. Targets already in view on first load show
  immediately without animating.
- **Movement stays on the compositor.** Animate `transform`, `opacity`
  and `filter`. Use the separate `translate` property rather than
  `transform` so a movement cannot overwrite a scale. Colour and rule
  transitions on the bar and controls use `--duration-swap` and
  `--ease-settle`; they do not move the layout.
- **Interruptible.** Anything the visitor toggles, such as the drawer, is
  a CSS transition. Apart from loading spinners, keyframes are for
  one-shot entrances.
- **Looping exceptions.** Three looping animations run on the page: the
  ticker, the hero replay and the layer switcher demo. Under WCAG 2.2.2, any
  movement lasting longer than five seconds provides a visible pause
  control:
  - **The ticker:** a 48-second linear translate loop with a "Pause the
    moving list" button. It pauses on hover and on focus within the band.
  - **The hero replay:** a 12-second loop in the hero window, with a "Pause
    the replay" button. It types the instruction (0 to 3.5 s), counts from
    step 1 to 13 along the progress bar (3.5 to 9 s), stacks the four layers
    top first (9 to 11 s), and holds (11 to 12 s). It runs only while the
    hero is in view and the document is visible.
  - **The switcher demo:** while Why layers is at least half in view and
    untouched, it cycles every 2.4 seconds, hiding and restoring each layer
    from top to bottom before flattening to JPEG and back. It provides a
    "Pause the demo" toggle. Any pointer, key or focus event in the section
    permanently dismisses the demo and restores Layered PSD mode before the
    gesture lands. The demo never speaks into the live region.
- **Run log playback.** When From a real run is 30% in view, its log rows
  appear in order staggered by 300 ms, the correction meta line appears
  400 ms after its row, and the four stats count up over 1200 ms to their
  final values. The sequence completes within 4.5 seconds. Pending rows are
  transparent (`opacity: 0`) rather than hidden, preserving the entire log in
  the accessibility tree from the start. Final stat values sit in visually
  hidden spans while counting spans are `aria-hidden`.
- **Pointer response.** Active only under `(hover: hover) and (pointer: fine)`:
  - The hero grid brightens in a 240 px circle under the cursor, tracked via
    `--spot-x` and `--spot-y` at most once per frame.
  - Step cards, drawer stats, glass facts and question tiles lift by 4 px
    with `--shadow-lift` over `--duration-swap`.
  - The arrow glyph in calls to action translates 4 px along its direction.
- **The entrance gate.** A `data-enter` attribute on the root goes from
  `pending` to `run` after `document.fonts.ready` and two animation frames,
  with a 1200ms fallback, then to `done`. This keeps the headline from
  animating in the fallback face and then reflowing.

### Reduced motion

Under `prefers-reduced-motion: reduce`:

- Parallax and every large movement are disabled. The hero's plate and
  chips do not drift.
- Scroll reveals show all content immediately (`opacity: 1`, `translate: none`,
  `filter: none`).
- The ticker is still and its pause control is hidden.
- The hero replay holds its completed final frame, and its toggle is hidden.
- The switcher demo never arms, and its toggle is omitted.
- The run log playback never arms; all rows and final stat values show
  immediately without counting up.
- Pointer response is disabled: the spotlight layer is hidden, cards do not
  lift, and arrows do not translate.
- Transitions become cross-fades. Press feedback and spinners stay.
- The Three.js object stops its float and rock animation and renders one
  still frame.
- Back to top scrolls instantly rather than smoothly.

Moving content that runs longer than five seconds needs a visible pause
control regardless of this setting, under WCAG 2.2.2. The ticker, the hero
replay and the switcher demo each have one.

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
1.  Common questions, on paper.
1.  Launch updates, on the accent.
1.  The shared footer, on `color/bg/subtle`, with Back to top beside it.

### The site bar

`header.site-header` is sticky and 72px tall. The wordmark begins with a
28px accent square carrying an L in Newsreader, followed by Layerhand.
Its links are How it works, MCP and Updates. Try it free opens the
workbench. The section links hide below 1280px.

The bar is transparent over the hero at the top of the landing and at the
top of the workbench (`data-over`). Beyond 24px of scroll, `data-scrolled` on
the root turns it to glass: `var(--glass-fill)` with `backdrop-filter:
var(--glass-blur)` and a 1px `--rule` bottom border. Background and rule
transition over `--duration-swap` on `--ease-settle`.

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
An offset accent sheet sits behind the window. Two chips read "4 named layers
in 13 steps" and "Correct it while it works". Over the lower part of the
window, a glass overlay plays the recorded facts of that run, with a Pause
the replay button beside it. The caption identifies the last frame of a real
run on the sample photograph.

### The ticker

The shell's last row is a 56px band. Accent squares separate seven claims:
Named layers, Editable masks, Adjustment layers, Correct it mid-run,
Driven in Photopea, Built on GPT-6 Astra and Opens in Photoshop.

The list translates in a 48-second linear loop. It pauses on hover, on
focus within the band, and through the button labelled "Pause the moving
list". The duplicate list is hidden from assistive technology. Under
reduced motion the list is still and the button hides.

### Stacked sections

The grey sections sit on the band or subtle ground: How it works (subtle),
The layer switcher (band), and The Glass Object (band). At 1280 px and wider,
sections stack in pairs:

| Pinned          | Slides over it     |
| --------------- | ------------------ |
| How it works    | The layer switcher |
| From a real run | The Glass Object   |

This extends the hero shell pin, where the landing body slides over the
pinned hero and ticker.

- Each pinned section and the section rising over it share a `div.stack`
  wrapper. The wrapper bounds sticky positioning: once the pair scrolls past,
  the pin releases and scrolls with the pair, so nothing stays stuck behind
  the page.
- A pinned section (`data-stack="pin"`) scrolls normally until its bottom
  meets the bottom of the viewport, then holds while the next section rises
  over it. `landing/stack.ts` measures the pinned section with a
  `ResizeObserver` and sets `--stack-top` to `min(0px, 100dvh - height)`
  via the CSSOM. `landing/stack.css` sets `position: sticky` at that top.
- A pinned section carries `padding-bottom: max(136px, 50vh)`. This
  half-screen foot lets the last items cross the middle of the screen (where
  the steps index reads position) before the section holds.
- The rising section (`data-stack="sheet"`) carries `position: relative`,
  `box-shadow: var(--shadow-sheet)`, and an inset top rule (`inset 0 1px 0
var(--color-border-on-chrome)`), reading as a sheet laid on top.
- Below 1280 px, sections scroll in standard document flow without pinning.
- While the drawer's layer sheet is open, `.drawer.is-open[data-stack="pin"]`
  takes `z-index: 2` so the dialog is never covered by the rising sheet.
- Navigation anchor links still land on each section's heading.

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

### Common questions

The questions section sits on paper after The Glass Object and before Launch
updates, with `id="faq"` and a primary navigation link labelled FAQ before
Updates. It is a 12-column bento grid at 1280 px and wider, collapsing to a
single column below 1280 px:

- Eyebrow "Questions" in UI / Eyebrow, title "Before your first run." in
  Display / Section.
- Ten questions, each in a `details` element whose `summary` holds the
  question and a plus glyph (`hgi-plus-sign`) that switches to a minus glyph
  (`hgi-minus-sign`) when open.
- Questions 1 and 4 take 6 columns (`data-span="6"`), lead with Display / H2
  questions, and start open. The remaining eight questions span 3 or 4 columns
  using UI / Lede with semibold weight, filling each row to 12 columns.
- Tiles are solid `--color-bg-subtle` with a 1px `--rule` border.
- Opening a tile animates no height. The answer enters with keyframe
  animation (`faq-answer-enter`: opacity 0 to 1, translate 0 8px to 0) over
  `--duration-enter` with `--ease-reveal`. Under reduced motion, answer
  animation is disabled.

### Launch updates

The waitlist takes the accent ground and `color/text/on-accent` text.
The field uses `color/text/on-chrome` for its ground and `color/bg/chrome`
for its text. The button reverses those two tokens. The section follows
the questions section, before the shared footer.

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

Over the editor window, a glass replay overlay plays the recorded facts of
the September 15 computer-tool run. Along the bottom it types the
instruction and advances the step counter across 13 steps on a progress
bar, captioned "A 1 min 42 s run, shown faster". At the top right, below
the pause toggle and clear of the chip on the window's lower corner, it
stacks the four output layers. It loops every 12 seconds with a pause
toggle, and shows the finished frame under reduced motion.

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

While Why layers is at least half in view and untouched, it demonstrates
itself every 2.4 seconds, hiding and restoring each layer from top to bottom
before flattening to JPEG and restoring PSD. It provides a pause control, and
any click, key press or focus within the section dismisses the demo
permanently.

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
one correction accepted in 194 ms, and four named layers.

When the section reaches 30% in view, the log plays once: steps enter
staggered by 300 ms, the correction meta line appears 400 ms later, and the
four stats count up over 1200 ms to their final values, finishing within 4.5
seconds. Pending rows are transparent so screen readers retain full access
from the start. The log plays its narrations:

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

## The workbench input view

The workbench input view is the starting state of the application beside the
landing page. It softens through layout, depth and spacing rather than radius.
Per NFR-7, the workbench is in scope at 1280 px and wider; below 1280 px it is
gated behind a notice.

### The workbench site bar

The workbench site bar shares the glass transition with the landing: clear at
the top of the page (`data-over="page"`) so the layout runs to the top edge,
turning to glass (`var(--glass-fill)` with `backdrop-filter: var(--glass-blur)`
and a 1px `--rule` bottom border) after 24 px of scroll.

### Back button

A 40 px tall button (`.back-button`) with a solid paper fill, a strong 1px
`--color-border-strong` border, and a subtle fill (`--color-bg-subtle`) on
hover. It carries an `hgi-arrow-left-01` icon ahead of the label "Back", with
its accessible name remaining "Back".

### Two-column workbench layout

At 1280 px and wider, the input view is a 12-column grid without a full-height
divider:

- **Left column (5 columns, `grid-column: 1 / 6`):**
  - Header hierarchy: eyebrow "Layerhand", title "Give the agent one clear
    direction.", lede "The result remains editable.".
  - **The run guide (`.run-guide`):** an ordered list of four steps (Choose a
    photograph; Say what you want; Watch it work, and correct it; Download the
    layered PSD). Steps 1 and 2 tick off automatically as the photograph and
    instruction are supplied, tracked in the DOM (`data-state="done"`) without
    re-rendering the form. Completed steps show an accent 24 px square tile
    with an `hgi-tick-02` icon and ink text. The active step displays an ink
    tile with paper text. Upcoming steps show a subtle tile with secondary text.
  - **Run facts (`.run-facts`):** three facts with `hgi-tick-02` icons: Three
    free runs, Uploads deleted within 24 hours, Your key is never stored.
- **Right column (7 columns, `grid-column: 6 / 13`):**
  - **The sketchboard (`.workbench-board`):** fills the column to the bottom of
    the page (`min-height: calc(100dvh - 72px)`). Ground is
    `--color-bg-subtle` patterned with `--color-pattern-dot` dots on a 20 px
    grid using a radial gradient.
  - **The card (`.workbench-card`):** a solid paper card floating on the
    sketchboard with a 1px `--rule` border, `--shadow-card` depth, 32 px of
    padding above and below and 40 px at the sides, and a maximum width of
    760 px. A card shorter than the board sits in its middle
    (`align-content: safe center`); a taller one starts at the top.

### The workbench form

The form inside the card holds three numbered groups and a footer, with
decorative `01`, `02` and `03` numbers (`.field-number`) in UI / Micro. Each
part after the first is ruled off by a 1px `--rule` line with the same gap,
`--form-group-gap`, above and below it. The gap is
`clamp(12px, 3.2vh - 12px, 32px)`, so it grows with the window's height
while Start retouching stays in the first viewport at 1280x800. Inside a
group, parts sit 10 px apart.

Each group opens with a header row (`.field-head`): its label on the left,
and its count or note on the right in UI / Small.

1.  **Source photograph:** the legend "01 Source photograph", with the
    sample button drawn at the right of its row. The button follows the drop
    zone in the markup, so the file input comes first from the keyboard.
    The drop zone spans the card: a dashed tile on `--color-bg-field`
    (176 px min-height) with an `hgi-upload-01` icon, the prompt, and the
    format and deletion notes (`.drop-notes`). The notes stay out of the
    file input's name and reach it as its description. A chosen photograph
    replaces the icon with its thumbnail and shows its filename.
2.  **Retouching instruction:** the label "02 Retouching instruction" with
    the `0 / 500` counter on the right, a textarea with 2 rows on
    `--color-bg-field`, then the example prompts as chips (`.examples`,
    8 px gap, solid `--color-bg-subtle` fills) after the lead "Try a precise
    direction".
3.  **OpenAI API key (optional):** the label "03 OpenAI API key (optional)"
    with "Used for this run only and never stored." on the right, over a
    text input on `--color-bg-field`.

Focus on any field shows a 1px ink outline with 0 offset and a 4 px accent
halo (`box-shadow: 0 0 0 4px var(--accent)`).

The submit button ("Start retouching", `#start-run`) spans the full width at
the foot of the card: 56 px tall, accent fill, `--color-text-on-accent` and an
`hgi-arrow-right-01` icon. When disabled, it rests on `--color-bg-disabled`
with text in `--color-text-disabled`, maintaining accessible contrast (5.5:1
in light mode, 6.9:1 in dark mode).

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
1.  The bar is clear at the top of the landing and workbench, and turns
    to glass once the page moves.
1.  Every call to action, field, card and container is solid or glass; no
    surface sits on transparent or has an opacity below 1 at rest.
1.  Glass appears only over a photograph, a pattern or moving content,
    pairing `--glass-fill` or `--glass-fill-chrome` with `--glass-blur`.
1.  Disabled buttons rest on solid `--color-bg-disabled` with readable
    contrast in both colour schemes.
1.  At 1280 px and wider, How it works and From a real run pin while the
    next section rises over them, releasing when the pair scrolls past;
    the open layer sheet dialog is never covered.
1.  The questions section renders a 12-column bento grid of ten questions
    before the waitlist, with questions 1 and 4 starting open.
1.  Below-the-fold content enters with scroll reveals once 15% is in view.
1.  The ticker, hero replay and switcher demo can be paused, and do not
    move by themselves under reduced motion.
1.  Any interaction inside the switcher ends its demo permanently.
1.  The run log plays within 4.5 seconds on scroll, and screen readers read
    the full log from the start.
1.  Under hover and fine pointer, the hero spotlight tracks the cursor, cards
    lift by 4 px with shadow, and CTA arrows translate 4 px.
1.  The workbench input view renders the 5/7 column split at 1280 px and wider,
    with the live run guide, dotted sketchboard and floating paper card.
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
- **Do** ensure every surface is solid or glass; buttons, fields, cards
  and containers must be opaque at rest.
- **Do** restrict glass surfaces to floating overlays over a photograph,
  a pattern or moving content, pairing `--glass-fill` or
  `--glass-fill-chrome` with `backdrop-filter: var(--glass-blur)`.
- **Do** provide a visible pause control for any movement that loops or
  runs longer than five seconds.
- **Do** ensure all self-playing motion leaves full, accessible text
  available to screen readers from the start.
- **Do** wrap stacked section pairs in `div.stack` containers so sticky pins
  release when scrolled past.
- **Do not** add a third typeface, a colour outside the tokens, or a
  second icon library.
- **Do not** leave any button, field, card or container transparent or
  with opacity below 1 at rest.
- **Do not** use backdrop filter with any value other than
  `var(--glass-blur)`.
- **Do not** write inline styles or `style` attributes; set CSS custom
  properties via the CSSOM.
- **Do not** add `border-radius` anywhere.
- **Do not** pin stacked sections below 1280 px.
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
