# Jakub Antalik

jakubantalik.com is the portfolio of a product designer and engineer who
led design at 0x.org and worked at Frame.io and Intercom. It is a small
page with a large amount of craft: a customisation panel, three
alternative rendering modes, and a panel that becomes a bottom sheet on
narrow screens. This page records how it is built, measured in the browser
on September 16, 2026, and the two libraries it links to.

Contents:

1.  [The page](#the-page)
1.  [Selected work](#selected-work)
1.  [The customisation panel](#the-customisation-panel)
1.  [The drawer](#the-drawer)
1.  [Libraries.dev](#librariesdev)
1.  [Transitions.dev](#transitionsdev)
1.  [What to use for the landing page](#what-to-use-for-the-landing-page)
1.  [See also](#see-also)

## The page

Measured from the rendered page:

- **Stack.** Plain HTML with `/script.js` and `/lqip.js`. No framework
  markers.
- **Type.** Inter at 400 and 500, 13 px body text in `rgb(228, 228, 231)`
  on `rgb(15, 15, 15)`.
- **Theme.** `data-theme="dark"` on the root, with a sun icon toggle.
- **Layout.** One column about 490 px wide: a name and theme toggle, a
  two-paragraph bio with underlined inline links, then a segmented control
  with "Projects" and "Selected work" pills.
- **Project cards.** A 58 px icon tile, a title and a two-line
  description, each linking out:

  | Card                   | Link                   |
  | ---------------------- | ---------------------- |
  | Libraries.dev          | libraries.dev          |
  | Transitions.dev        | transitions.dev        |
  | Border beam component  | beam.jakubantalik.com  |
  | Liquid metal component | metal.jakubantalik.com |

- **Card surface.** `border-radius: 16px`, `rgb(24, 24, 24)`, 16 px
  padding, and a stacked shadow: `rgba(0,0,0,.04) 0 1px 3px`, an inset
  highlight `rgba(255,255,255,.04) 0 1px 0`, and a hairline ring
  `0 0 0 1px rgba(0,0,0,.06)`. Hover transitions `box-shadow` over 150 ms
  and `background-color` over 200 ms.

## Selected work

The "Selected work" tab breaks out of the narrow column into a full-bleed
two-column grid, about 944 px per column, of ten looping clips and one
still. The clips are MP4s set to `autoplay loop muted playsinline`: liquid
metal buttons, the Libraries.dev hero, a Frame.io iPad sign-in, an install
button, a file explorer, thinking orbs, a border beam, an input and a
metal ring.

Behind every video sits a low-quality image placeholder, a base64 data URI
from `lqip.js`, drawn slightly larger than the video (982 px against 944
px). The blurred still fills the tile before the video decodes, so the grid
never shows empty boxes.

## The customisation panel

A floating card fixed to the right edge lets a visitor restyle the page:

| Control              | Options                                                                            |
| -------------------- | ---------------------------------------------------------------------------------- |
| Font                 | Inter, Suisse Intl, Serif, Sans Serif, Monospace, Georgia, Times, Arial, Helvetica |
| Text & Content style | Three toggles: 3D depth, hand-drawn, water                                         |
| Text color           | Default, Black, Gray, Blue, Green, Red, Purple, Amber, plus a spectrum picker      |
| Corner radius        | Slider, default 16                                                                 |
| Logo size            | Slider, default 14                                                                 |
| Background style     | Default, Sunset, Ocean, Forest, Lavender and more                                  |
| Reset all            | Restores every default                                                             |

How the modes are built:

- **Hand-drawn.** Adds `hand-drawn` to `body`, switches the family to
  Caveat, and applies SVG filters `#sketchy` and `#sketchy-subtle`
  (`feTurbulence` into `feDisplacementMap`) so tile edges wobble like ink.
- **Water.** A fixed `.water-overlay` at `z-index: 99998` with pointer
  events off holds 42 DOM raindrops. Each one layers radial gradients with
  inset shadows, under a backdrop filter of
  `blur(0.6px) brightness(0.97) saturate(1.06)`. Each drop lands with
  `raindrop-land-small` over 0.58 s on `cubic-bezier(0.34, 1.56, 0.64, 1)`,
  an overshoot curve. It uses no canvas or WebGL.
- **Backgrounds.** A body class such as `bg-gradient-sunset` sets layered
  radial gradients. Sunset's first is a warm red wash from the top left:
  `radial-gradient(80% 50% at 20% 0%, rgba(220, 80, 60, 0.14), …)`.

## The drawer

Below 768 px the same panel becomes a bottom sheet. The rules, read from
the stylesheet:

```css
@media (max-width: 768px) {
  .customization-panel {
    position: fixed;
    max-height: 85dvh;
    transform: translateY(100%);
    transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
    backdrop-filter: blur(12px);
    z-index: 10001;
  }
  .customization-panel.sheet-open {
    transform: translateY(0);
    overflow: hidden auto;
    scrollbar-width: none;
  }
  .sheet-handle {
    display: block;
    width: 53px;
    height: 4px;
    border-radius: 10px;
  }
}

.sheet-overlay {
  position: fixed;
  inset: -100px 0;
  background: rgba(0, 0, 0, 0.1);
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.35s,
    visibility 0.35s;
  z-index: 10000;
}
```

The details that make it feel native:

- **The curve.** `cubic-bezier(0.32, 0.72, 0, 1)` leaves the edge fast
  and lands softly. It is the curve the Vaul drawer library uses.
- **A transition, not a keyframe.** Closing mid-open reverses smoothly.
- **The overlay bleeds.** `inset: -100px 0` extends the scrim past both
  edges, most likely so it still covers the page while mobile browser
  toolbars resize.
- **Dark mode** uses `rgba(30, 30, 30, 0.92)` behind the blur and a handle
  at `rgba(255, 255, 255, 0.2)`.
- **Submenus.** `.sheet-back-btn` and `.sheet-submenu` let options drill
  into a second level inside the same sheet.
- **The trigger** is a `.mobile-customize-btn` pill.

## Libraries.dev

"High-crafted UI libraries for AI agents", with 3,597,330 installs shown
on the page. The hero floats sample tiles around a centred headline. It
has five libraries, all React 18+ with no runtime dependencies, about 83 KB
gzipped together:

| Package         | Effect                                                     |
| --------------- | ---------------------------------------------------------- |
| `border-beam`   | A rainbow glow that rides any border                       |
| `thinking-orbs` | Dot-orb loading states for AI interfaces                   |
| `liquid-gooey`  | Pieces that merge and morph like goo                       |
| `metal-fx`      | A real-time chrome ring for buttons and icons              |
| `img-fx`        | A WebGL image-generation loader for cards, needing `three` |

Thinking orbs has nine states, including working, searching, solving,
listening, connecting, composing and breathing. Props cover size (64 or
20 px), cursor gravity, speed, colour, dot count (207), dot size, reach
(160 px), bend (19 px) and orbit paths (50%):

```tsx
import { ThinkingOrb } from 'thinking-orbs'

;<ThinkingOrb state="listening" size={64} />
```

Every library "ships as a prompt": one copy packs the install line, usage
and props for a coding agent. The paid Studio adds deeper tuning and an
agent skill.

## Transitions.dev

"UI transitions for AI agents": a catalogue of small transitions, each
with a live demo, filterable by Essential, AI Agents, Effects, Texts and
Pro. The free ones most relevant to us:

- **Panel reveal**, **Modal open/close** with scale, and **Menu dropdown**,
  which opens from its origin.
- **Page side-by-side** forward and back.
- **Texts reveal**, two lines rising with offset stagger, and **Streaming
  text**, words resolving through a soft cross-blur.
- **Thinking states**, a status line that shimmers then swaps, and
  **Reasoning stream**, agent reasoning scrolling by two lines at a time.
- **Shimmer text**, **Matrix dot loader**, **Skeleton to content**,
  **Toast**, **Tabs sliding** and **Icon swap** with scale and blur.

The skill installs the free set and commands for an agent:

```sh
npx skills add Jakubantalik/transitions.dev
npx skills add Jakubantalik/transitions.dev -s transitions-polish
```

Its commands are `transitions reveal` to list, `review` to audit ad-hoc
durations, `apply <name>`, `refine` to map hard-coded durations to motion
tokens, and `polish`. The review, refine and polish commands are
read-only.

## What to use for the landing page

- **The drawer recipe as written** for the layer-list drawer and for any
  mobile menu, including the overlay's negative inset.
- **LQIP behind every video tile** so the demo loop and any gallery never
  flash empty.
- **The card surface**, retuned to our ink and paper colours: layered
  shadows, a hairline ring, and hover on `box-shadow` alone.
- **Agent-state transitions for the live-run preview.** Thinking states,
  reasoning stream and streaming text match what the product already shows:
  step narration ([FR-11](/docs/PRD.md#the-run)) and live frames. Port
  them; the orbs are React-only.
- **Restraint.** The portfolio's playful modes work because the base page
  is quiet. A landing page gets one signature interaction, not a panel of
  them.

## See also

- [Design research](README.md)
- [Canvas UI](canvas-ui.md#peel), for a WebGL alternative to a drawer
- [Transitions.dev](https://transitions.dev/)
