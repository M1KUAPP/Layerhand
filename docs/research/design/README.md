# Design research

Research for the Layerhand landing page: eight reference sites and
libraries, read in a logged-in Chrome session on September 16, 2026, plus
the Gemini video tools agents will use to make its footage. Each source has
its own page. This page pulls them together into what the landing page
should take from each.

Contents:

1.  [Sources](#sources)
1.  [What the landing page needs](#what-the-landing-page-needs)
1.  [The typeface question](#the-typeface-question)
1.  [Iconography](#iconography)
1.  [Motion](#motion)
1.  [Video](#video)
1.  [Constraints from our stack](#constraints-from-our-stack)
1.  [Open questions](#open-questions)
1.  [See also](#see-also)

## Sources

| Page                                        | Source                                       | What it is                                                      |
| ------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------- |
| [Interface skills](jakubkrehel-skills.md)   | github.com/jakubkrehel/skills                | Agent skills with exact values for UI, type, colour and motion  |
| [MotionSites](motionsites.md)               | motionsites.ai, free tier                    | Prompts that rebuild cinematic landing pages, plus free lessons |
| [Canvas UI](canvas-ui.md)                   | canvasui.dev/components                      | 35 WebGL and WebGPU effects that run over live HTML             |
| [Jakub Antalik](jakub-antalik.md)           | jakubantalik.com                             | A portfolio with a panel that becomes a bottom sheet on mobile  |
| [Its Hover](itshover.md)                    | itshover.com/icons                           | 263 hover-animated React icons                                  |
| [Iconsax](iconsax.md)                       | app.iconsax.io, free tier                    | 7,140 free icons in six styles                                  |
| [Isocons](isocons.md)                       | isocons.app                                  | About 1,000 isometric line icons                                |
| [Hugeicons](hugeicons.md)                   | hugeicons.com/icons/stroke-rounded, free     | About 6,000 free Stroke Rounded icons                           |
| [Landing video pipeline](video-pipeline.md) | gemini.google.com, geminiwatermarkremover.io | Making the landing footage and removing the visible mark        |

## What the landing page needs

The team asked for a top-tier SaaS landing page that keeps our typeface,
uses one icon system throughout, and uses sticky scrolling, drawer layers,
parallax and Three.js. The product documents add four constraints:

- **The wedge is the artifact.** The page has to make "a layered PSD, not a
  flat JPEG" visible above the fold ([FR-30](/docs/PRD.md#launch-surface)).
- **The demo loop plays silently** and a thirty-second recording must read
  without sound ([FR-32](/docs/PRD.md#launch-surface)).
- **Desktop first.** The page works at 1280 px and up, and says so below
  that width ([NFR-7](/docs/PRD.md#non-functional-requirements)).
- **Waitlist capture** is live on the same page
  ([FR-31](/docs/PRD.md#launch-surface)).

A layer stack is a good fit for depth. Sticky scrolling can pull a
retouched photo apart into its named layers. Parallax can separate those
layers in space, and a drawer can open to show the layer list. Most of the
sources below have a direct recipe for one of those moves.

## The typeface question

"Our existing typeface" means two different things right now:

- **The shipped page** sets everything in `Arial, Helvetica, sans-serif`
  with `font-synthesis: none` (`src/web/styles.css`). No webfont is
  loaded.
- **The Figma design system**, a file built today, pairs **Newsreader**
  for display (H1 88/78, tracking -6.5%) with **Geist** for UI (body
  15/20). It has not reached the repository.

Every recommendation here works with either choice. Two things from the
sources apply whichever wins:

- Jakub Krehel's `better-typography` says applying typography never
  requires a new typeface, and that a serif headline over a sans body
  reads as deliberate. The Figma pairing follows that rule, and Arial alone
  does not use the contrast.
- Every MotionSites prompt pins one family and forbids swapping it. The
  prompts are useful for layout and motion, but their fonts (Figtree, Inter,
  Inter Tight, Helvetica Now) must be replaced with ours.

## Iconography

Use **Hugeicons Stroke Rounded** for every UI icon on the site, **Isocons**
for large illustrative moments, and nothing else. The reasoning, with
Iconsax and Its Hover as alternatives, is in each icon library's page. In
short:

| Need                     | Pick                            | Why                                                                                      |
| ------------------------ | ------------------------------- | ---------------------------------------------------------------------------------------- |
| UI glyphs at 16–24 px    | Hugeicons Stroke Rounded        | 6,000+ free icons in one style, 1.5 stroke on a 24 px grid, `currentColor`, no-login CDN |
| Feature and section art  | Isocons                         | Isometric line art at 48 px and up that echoes a stack of layers                         |
| Hover-animated accents   | Its Hover, ported               | React and Motion only, with mixed fill and stroke, so port a few animations by hand      |
| Second UI set, if needed | Iconsax free, Linear or Outline | Six styles, but exported SVG hardcodes `#ffffff` and clip-path ids                       |

Rules to apply, from `better-ui`:

- A 1.5 px stroke next to regular text, 2 px next to semibold, and one
  library per surface.
- An outline icon by default and a filled one for the active state. That
  pairing requires a paid Hugeicons style, so use colour and weight for
  state instead.
- `currentColor` everywhere, sized in `em` next to text and tested at
  16 px.
- Contextual icon swaps animate scale `0.25` to `1`, opacity `0` to `1` and
  blur `4px` to `0px`.

## Motion

Each of the four requested techniques, with the recipe to start from:

| Technique     | Start from                                                                             | Source                                                     |
| ------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Sticky scroll | Pinned stage plus scroll-scrubbed video drawn to canvas, with a lerp of 0.12 per frame | [MotionSites lesson](motionsites.md#scroll-scrubbed-video) |
| Sticky scroll | Canvas UI Laser, Particle Scroll or Bend over live HTML                                | [Canvas UI](canvas-ui.md#scroll-driven-effects)            |
| Drawer layers | Bottom sheet: `translateY(100%)` to `0`, 0.4 s `cubic-bezier(0.32, 0.72, 0, 1)`        | [Jakub Antalik](jakub-antalik.md#the-drawer)               |
| Drawer layers | Canvas UI Peel, which peels the page back to reveal a layer underneath                 | [Canvas UI](canvas-ui.md#peel)                             |
| Parallax      | Sky, title, then foreground layers moving 0% to 8% while the title stays put           | [MotionSites lesson](motionsites.md#layered-parallax-hero) |
| Three.js      | Image to multi-view to GLB, then Three.js with tone mapping                            | [MotionSites lesson](motionsites.md#threejs-scroll-scene)  |
| Three.js      | Canvas UI Glass Object or Particle Object, which work in every browser                 | [Canvas UI](canvas-ui.md#threejs-objects)                  |

Rules that hold across all of them:

- **Reduced motion.** Parallax, autoplay loops and large movement are
  disabled under `prefers-reduced-motion`. Slides become cross-fades, and
  press feedback and spinners stay. A muted looping hero video running
  longer than five seconds needs a visible pause control (WCAG 2.2.2).
- **Interruptible.** Use CSS transitions for anything the user toggles,
  such as the drawer, and keyframes only for one-shot entrances.
- **Entrances.** Stagger about 100 ms between blocks and about 80 ms per
  word in a headline. Enter from opacity `0`, `translateY(12px)` and
  `blur(4px)`, and exit in 150 ms to `-12px`.
- **Compositor-only.** Animate `transform`, `opacity` and `filter`. The
  MotionSites prompts animate the separate `translate` property so it
  cannot overwrite a `transform` scale.

## Video

Gemini's Videos tool on the team's Pro account produced a 1280x720 clip,
ten seconds long, with sound and a small four-point sparkle in the
bottom-right corner. The watermark remover's CLI takes a file path
directly, which suits agents better than the browser page's file picker.
The full pipeline, including prompt shape and the scroll-scrub encoding,
is in [Landing video pipeline](video-pipeline.md).

## Constraints from our stack

- **No framework.** `src/web` is plain TypeScript that builds DOM nodes and
  bundles through `Bun.serve`. Anything React-only needs a port or a React
  island: Its Hover, the libraries.dev effects, `motion/react` recipes, and
  the React versions of MotionSites prompts. Canvas UI ships vanilla
  builds, Hugeicons has an icon font, and Isocons and Iconsax export raw
  SVG.
- **No Three.js yet.** `three` is not a dependency. Adding it is one
  package, and it is also what Canvas UI's object effects need.
- **html-in-canvas is Chrome-only.** Canvas UI's page effects need a
  Chrome flag or an origin-trial token registered for our domain. Other
  browsers get plain HTML, so no effect can carry meaning on its own.

## Open questions

1.  Which typeface is "existing": the shipped Arial stack or the Figma
    Geist and Newsreader pairing?
1.  Do we register the html-in-canvas origin trial for the production
    domain, or limit Canvas UI to its object effects that need no flag?
1.  Is a React island acceptable on the landing page, or must every
    effect be ported to plain TypeScript?

## See also

- [Product requirements](/docs/PRD.md): FR-30 to FR-33 and NFR-7.
- [Launch application design](/docs/references/launch-application-design.md)
