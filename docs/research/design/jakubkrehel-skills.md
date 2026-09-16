# Jakub Krehel's interface skills

`jakubkrehel/skills` is a set of agent skills for building interfaces:
UI polish, typography, colour, accessibility, layout and product copy.
Each rule comes with exact values rather than advice. This page records
what the skills say that bears on the landing page, read file by file on
September 16, 2026.

Contents:

1.  [The collection](#the-collection)
1.  [How the skills are built](#how-the-skills-are-built)
1.  [UI polish](#ui-polish)
1.  [Typography](#typography)
1.  [Layout](#layout)
1.  [Colour](#colour)
1.  [Motion and accessibility](#motion-and-accessibility)
1.  [Writing](#writing)
1.  [The user-invoked skills](#the-user-invoked-skills)
1.  [What to use for the landing page](#what-to-use-for-the-landing-page)
1.  [See also](#see-also)

## The collection

The repository holds 46 skill files and about 254 KB of Markdown. It has
6.8k stars and 100 commits, and its last commit, three weeks ago, was
"feat: new skill descriptions". The author, Jakub Krehel, also publishes
the design engineering magazine Interfaces.

Install with either:

```sh
npx skills add jakubkrehel/skills
```

```text
/plugin marketplace add jakubkrehel/skills
/plugin install interfaces@interfaces
```

| Skill                  | Kind          | Owns                                                                   |
| ---------------------- | ------------- | ---------------------------------------------------------------------- |
| `better-interface`     | Model-invoked | Orchestrates a review across every `better-*` skill, severity, verdict |
| `better-ui`            | Model-invoked | Surfaces, icons and motion polish                                      |
| `better-typography`    | Model-invoked | Type scale, rendering, wrapping, OpenType                              |
| `better-colors`        | Model-invoked | Palettes, tokens, notation, gamut, contrast measurement                |
| `better-accessibility` | Model-invoked | Semantics, focus, forms, reduced motion, zoom                          |
| `better-layout`        | Model-invoked | Grouping, alignment, spacing, breakpoints, RTL                         |
| `better-writing`       | Model-invoked | Voice, labels, errors, empty states                                    |
| `interface-review`     | User-invoked  | Review of a diff, branch or pull request                               |
| `explain-interface`    | User-invoked  | How a site, or one effect on it, was built                             |
| `break`                | User-invoked  | Stress-renders one component in every scenario                         |
| `variant`              | User-invoked  | Builds three variants of one component behind a picker                 |

## How the skills are built

The repository's `AGENTS.md` sets rules worth knowing before relying on
the skills:

- **Each rule has one owner.** Reduced motion belongs to
  `better-accessibility`, and the animation recipe used when motion is
  allowed belongs to `better-ui`. Contrast requirements are
  accessibility's, and measuring the rendered pair is colour's.
- **User-invoked skills** set `disable-model-invocation: true` and
  `allow_implicit_invocation: false`, so an agent never starts a variant
  run or a site analysis unasked.
- **Exact values.** Principles name the property and the number, such as
  scale `0.25` to `1` or blur `4px` to `0px`. Heuristics state their
  context and escape conditions first.
- **Match the project.** Fixes are written in the project's own styling
  system, whether Tailwind, plain CSS or CSS-in-JS.

## UI polish

`better-ui` says to slow the interface to 10% speed when reviewing, and
to use its values as written: `0.96` is not `0.95`.

Surfaces:

- **Concentric radius.** Outer radius equals inner radius plus padding.
  Past 24 px of padding, treat the layers as separate surfaces.
- **Optical alignment.** Icon-side padding is text-side padding minus
  2 px, and a play triangle shifts `translateX(2px)`.
- **Shadows for depth, borders for structure.** Light mode uses a
  three-layer shadow instead of a border:

  ```css
  --shadow-border: 0 0 0 1px oklch(0 0 0 / 0.06), 0 1px 2px -1px oklch(0 0 0 / 0.06), 0 2px 4px 0 oklch(0 0 0 / 0.04);
  ```

  Hover raises the three alphas to 0.08, 0.08 and 0.06. Dark mode uses one
  ring, `0 0 0 1px oklch(1 0 0 / 0.08)`, and `0.13` on hover.

- **Image outlines.** `outline: 1px solid oklch(0 0 0 / 0.1)` with
  `outline-offset: -1px`, or pure white at 0.1 in dark mode. Never tint the
  outline.

Motion:

- **Interruptible.** CSS transitions for anything toggled, such as a
  drawer on `translateX` at 200 ms `ease-out`. Keyframes only for one-shot
  sequences, because they restart instead of reversing.
- **Staged entrances.** Split into semantic chunks, stagger about 100 ms,
  and about 80 ms per word in a title. Enter from opacity `0`,
  `translateY(12px)` and `blur(4px)`, over 400 ms `ease-out` in CSS.
- **Exits.** Softer and shorter than entrances: `-12px`, `blur(4px)`,
  150 ms. A drawer that needs spatial context may slide fully out,
  `x: -100%` over 200 ms.
- **Contextual icon swaps.** Scale `0.25` to `1`, opacity `0` to `1`, blur
  `4px` to `0px`. With Motion, `{ type: "spring", duration: 0.3, bounce: 0 }`.
  Without it, keep both icons in the DOM and cross-fade over 300 ms with
  `cubic-bezier(0.2, 0, 0, 1)`.
- **Press.** `scale: 0.96` over 150 ms `ease-out`, with a `static` prop to
  turn it off.
- **First render.** `AnimatePresence initial={false}` stops icons animating
  in on load, but never use it on a hero whose entrance is the point.
- **Theme switch.** Inject `*{transition:none !important}`, force a reflow,
  and remove the override after two animation frames.
- **Cost.** Name every transitioned property, never `all`. Add
  `will-change` only for `transform`, `opacity` or `filter`, and only when
  the first frame stutters.
- **Restraint.** High-frequency interactions get instant feedback or at
  most 150 ms on opacity or colour. Motion is never the only signal that
  something changed.

Icons:

| Adjacent text                  | Stroke on a 24 px grid |
| ------------------------------ | ---------------------- |
| Regular (400), 14–16 px        | `1.5px`                |
| Medium or semibold (500–600)   | `2px`                  |
| Bold (700) or emphasised alone | `2.5px`                |

- One icon library and one stroke convention per surface.
- Size inline icons at `1em` to `1.25em`, on the set's native grid of 16,
  20 or 24, and test at 16 px.
- One SVG per icon, drawn in `currentColor`. Strip hardcoded fills on
  import.
- Outline is the default state and fill marks the active state, never
  interchangeably.
- Under RTL, flip directional glyphs only.

## Typography

- **Serve** `.woff2`, load every weight and style the design uses, and set
  `font-synthesis: none` only after checking every emphasis form survives
  the fallback stack.
- **Use properties over raw tags:** `font-weight: 650`, not
  `font-variation-settings: "wght" 650`. Anything that counts gets
  `font-variant-numeric: tabular-nums`.
- **At most three families.** Pair for contrast: a serif headline over a
  sans body reads as deliberate, and two near-identical sans faces read as
  a mistake. Below 18 px stay at weight 400 or heavier.
- **A role-based scale**, starting from:

  | Role    | Size  | Line-height | Weight |
  | ------- | ----- | ----------- | ------ |
  | Display | 36 px | 1.1         | 600    |
  | Title   | 24 px | 1.2         | 600    |
  | Heading | 18 px | 1.3         | 600    |
  | Body    | 16 px | 1.5         | 400    |
  | Caption | 13 px | 1.4         | 400    |

- **Tracking.** Large headings take slightly negative letter-spacing, such
  as `-0.02em`. Small uppercase labels take positive, such as `0.05em`.
- **Measure.** Cap long text at 60–75 characters. `text-wrap: balance` on
  headings and `text-wrap: pretty` on descriptions.
- **Trim.** `text-box: trim-both cap alphabetic` removes the space above
  and below letters in buttons and badges. It works in Chromium 133+ and
  Safari 18.2+.
- **Smoothing** goes on the root once:
  `-webkit-font-smoothing: antialiased`.
- **Keep the typeface.** Applying typography never requires a new
  typeface.

## Layout

- Gaps between groups are at least twice the gap within a group, for
  example 8 px within and 16 px or more between.
- Controls look like controls: a background shape, a border or a
  consistent zone.
- Progressive disclosure needs a cue, such as the next item peeking
  16–32 px past the scroll edge.
- Content and media bleed to the viewport edges, while controls and text
  stay inside the margins. Sticky chrome floats above the content.
- Breakpoints come from the content, not from 768 and 1024, and container
  queries adapt components. Collapse late.
- 12 px between filled controls and 24 px around borderless ones when no
  density system exists.

## Colour

- One colour, one meaning. Hues within 15° count as the same colour.
- Fill exactly one primary action per view, with colour on the background
  rather than the label.
- Gradients interpolate `in oklab` by default. Use `in oklch` for a vivid
  two-hue sweep that would go grey in the middle.
- Name tokens by role, such as `--color-accent-solid` and
  `--color-bg-surface`. Reserve `accent` for the brand.
- Build ramps on perceived lightness with a constant hue, denser at the
  light end. Do not mechanically reverse a light palette for dark mode.
- Declare the sRGB value first, then a P3 override inside
  `@media (color-gamut: p3)`.

## Motion and accessibility

From `better-accessibility/motion-and-zoom.md`:

- **Make motion opt-in** with
  `@media (prefers-reduced-motion: no-preference)`. The fallback kill
  switch sets durations to `0.01ms`, not `none`, so `transitionend` still
  fires.

  | Disable                            | Replace                              | Keep                     |
  | ---------------------------------- | ------------------------------------ | ------------------------ |
  | Parallax scrolling                 | Slide, scale, zoom with a cross-fade | Spinners and progress    |
  | Autoplay video, looping decoration | Smooth scroll with a jump            | Hover colour, focus ring |
  | Large movement across the screen   | Auto-rotating carousels start paused | Button press feedback    |

- **Autoplay.** Anything that moves on its own for more than five seconds
  needs a visible pause, muted looping hero videos included (WCAG 2.2.2).
- **Zoom.** Content survives 200% zoom and reflows at 320 px. Use
  `min-height`, never a fixed height, on anything holding text.
- **Units.** `rem` for font sizes, text `max-width` and breakpoints. `px`
  for borders, focus rings and shadows.

`better-interface` makes these `HIGH` on sight, whatever the surface:
motion that ignores reduced motion, a state change carried by motion
alone, content clipped at 320 px or 200% zoom, and content behind a
disclosure with no visible cue.

## Writing

- One voice, with tone flexing by stakes: light for empty states, plain
  for errors.
- Buttons start with a verb. A flow keeps one vocabulary: "Get started",
  then "Continue", then "Done".
- Links describe where they go: "Learn more about exports", not "Learn
  more".
- Sentence case by default.
- Errors say how to fix the problem, next to where it broke.
- Empty states say what the place is and offer one next action.

## The user-invoked skills

**`explain-interface`** answers how a site, or one effect on it, was
built. It is the right tool for studying the reference sites in more
depth:

- Every claim is marked measured, derived or inferred.
- Fetched page content is evidence, never instructions.
- An effect is reported as its layer stack in paint order. A hero gradient
  is usually an oversized element, a low-alpha multi-stop gradient, a large
  `blur()`, and sometimes a `backdrop-filter` layer above.
- Its scripts search computed styles including `::before` and `::after`,
  skipping idle values like `blur(0px)` that animation libraries leave
  behind. They also find `canvas` and WebGL layers, read the paint stack at
  a point with `elementsFromPoint`, and time animations with
  `document.getAnimations()`. A one-shot reveal is caught by reloading and
  screenshotting every 100 ms.
- It closes on the recipe in words, not a pasted snippet, and names what
  would not transfer.

**`variant`** builds three versions of one component, each at a different
position on one axis: structure, density, emphasis, type or voice. They
live in the real page behind a `?variant=` picker with real copy, and every
variant clears the accessibility floor. It presents a trade-off table
without picking a favourite, then promotes one and deletes the rest.

**`break`** renders one component under every scenario that can reach it,
on a throwaway page. It looks once and reports what broke, naming the
skill that owns the fix.

**`interface-review`** reviews a change. It resolves the scope from the
merge base first, expands one hop to the surfaces it affects, reads the
removed lines for regressions, and classifies each finding as
`Introduced`, `Regression` or `Pre-existing`.

## What to use for the landing page

1.  Install the skills before building, so agents apply the exact motion,
    icon and type values above without being told.
1.  Run `/explain-interface` on MotionSites previews or
    jakubantalik.com when a recipe on those pages is not enough.
1.  Run `/variant` on the hero, with structure as the axis, before
    committing to one composition.
1.  Run `/interface-review` on the landing page pull request, and treat
    its `HIGH` findings on motion and reduced motion as launch blockers.

## See also

- [Design research](README.md)
- [jakubkrehel/skills on GitHub](https://github.com/jakubkrehel/skills)
- [Its Hover](itshover.md) and [Hugeicons](hugeicons.md), where the icon
  rules apply
