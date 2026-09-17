# Landing polish

Five refinements made after the banded landing (#207) shipped: solid
surfaces, stacked sections, a questions section, motion that shows the
product working, and a redesigned workbench input view. It is the build
sheet for one pull request. [DESIGN.md](/docs/DESIGN.md) is updated to
match and wins wherever the two disagree afterwards.

Contents:

1.  [Scope](#scope)
1.  [Solid or glass surfaces](#solid-or-glass-surfaces)
1.  [Stacked sections](#stacked-sections)
1.  [The questions section](#the-questions-section)
1.  [Motion that shows the product working](#motion-that-shows-the-product-working)
1.  [The workbench input view](#the-workbench-input-view)
1.  [Rules every change keeps](#rules-every-change-keeps)
1.  [Acceptance](#acceptance)

## Scope

- One branch, `feat/landing-polish`, off `main` at `9dcbdd3`, and one pull
  request. It does not plan around #208: whichever merges second resolves
  the overlap in `app.ts`, `styles.css` and `landing/index.ts`.
- Corners stay square everywhere. The workbench softens through layout,
  depth and spacing, not radius.
- Out of scope: the running and result views beyond what the shared
  button and field rules change, the workbench below 1280 px, and copy
  outside the new section and the workbench input view.

## Solid or glass surfaces

Every call to action, card and container paints one of two fills:

- **Solid:** a token colour with no transparency.
- **Glass:** `var(--glass-fill)`, or `var(--glass-fill-chrome)` under light
  text, together with `backdrop-filter: var(--glass-blur)`. Only a surface
  floating over a photograph, a pattern or moving content may be glass:
  the scrolled site bar on both views, Back to top, the hero chips and the
  hero replay overlay.

Never `transparent`, never a see-through fill without the blur, and never
`opacity` below 1 on a surface at rest. Opacity may still animate an
entrance. The illustration layers inside the layer switcher's stage are
not surfaces.

The known offenders on `main`:

| Where                                                  | Today           | Becomes                                           |
| ------------------------------------------------------ | --------------- | ------------------------------------------------- |
| `.hero__updates`                                       | transparent     | solid paper                                       |
| `.switcher__mode`, `.switcher__lock`, `.switcher__eye` | transparent     | solid band panel                                  |
| `.drawer__open`, `.drawer__close`                      | transparent     | solid                                             |
| `.button`, `.sample-button`, `.example-button`         | transparent     | solid                                             |
| `textarea`                                             | transparent     | `--color-bg-field`                                |
| `button:disabled`                                      | `opacity: 0.54` | `--color-bg-disabled` and `--color-text-disabled` |
| `.site-header` once scrolled                           | paper at 94%    | glass                                             |

An element with no background declared is transparent too, so the table
is where the work starts, not all of it.
`test/web/surfaces.browser.test.ts` loads the landing and the workbench in
light and dark at 1440x900 and fails on any button, field, link styled as
a button, or element with a border on all four sides whose computed
background colour is not opaque, unless its `backdrop-filter` is set.

The design audit's "no CSS glass" rule is now "glass only through its
token": every `backdrop-filter` is exactly `var(--glass-blur)`.

## Stacked sections

The grey sections are the ones on the band or subtle ground: How it works,
Why layers and After the run. In dark mode they are the grey bands between
the black ones. Each slides up over the section above it, the way the
landing body already slides over the hero:

| Pinned                          | Slides over it |
| ------------------------------- | -------------- |
| The hero and ticker (unchanged) | How it works   |
| How it works                    | Why layers     |
| From a real run                 | After the run  |

- A pinned section scrolls normally until its bottom meets the bottom of
  the viewport, then holds while the next section rises over it.
  `landing/stack.ts` measures each pinned section with a `ResizeObserver`
  and sets `--stack-top`, `min(0px, 100dvh - height)`, through the CSSOM.
  `landing/stack.css` makes it `position: sticky` at that top.
- Each pinned section and the section rising over it share a `.stack`
  wrapper, so the pin lets go once the pair has scrolled past and nothing
  stays stuck behind the rest of the page.
- The rising section carries `--shadow-sheet` and a rule along its top
  edge, so the overlap reads as a sheet laid on top.
- Only at 1280 px and wider, like the hero pin. Below that the sections
  scroll in order.
- The drawer's layer sheet is a dialog inside From a real run. While it is
  open, that section is raised above After the run, so the dialog is never
  covered.
- The nav's anchor links still land on each section's heading.

## The questions section

A bento grid of ten questions after After the run and before the waitlist,
with `id="faq"` and a nav link labelled FAQ before Updates.

- Paper ground. Eyebrow "Questions", title "Before your first run."
- At 1280 px and wider, a 12-column grid. Questions 1 and 4 take 6
  columns and start open; the rest take 3 or 4, so each row fills 12.
  Below 1280 px, one column.
- Each tile is a `details` element whose `summary` holds the question and
  a plus icon that becomes a minus. Opening a tile animates no height; the
  answer enters with the entrance motion.
- Tiles are solid `--color-bg-subtle` with a `--rule` border.

The copy, verbatim. Product facts from the PRD and TRD only:

1.  **What do I get back?** A layered PSD. Every edit sits on its own
    layer, named for what it does, and its masks and adjustment layers
    stay editable. A flattened PNG comes with it to preview.
2.  **Which apps open the file?** It is a standard PSD, made to open in
    Photoshop, Affinity Photo and GIMP, or back in Photopea, where it was
    made.
3.  **How long does a run take?** A few minutes. The run in the log above
    took 3 min 13 s from start to PSD. No run goes past 15 minutes.
4.  **Can I correct it while it works?** Yes. Type a correction at any
    point and it is acknowledged within three seconds. It shapes the next
    actions and nothing restarts. It cannot undo a step already taken, but
    it can repair one.
5.  **What kind of retouching does it do?** The adjustments a retoucher
    makes in a real editor, such as exposure, colour, warmth and
    vignettes, each on its own layer. Describe them in plain words. It
    works on the photograph you upload and never generates a new image.
6.  **Do I need an account?** No. You get three free runs without signing
    up.
7.  **What happens after the free runs?** Add your own OpenAI API key and
    carry on. It is used for that run only, and never stored or logged.
8.  **What happens to my photographs?** Uploads are deleted within 24
    hours, and download links expire after one hour.
9.  **Which photographs can I upload?** JPEG or PNG, up to 20 MB and
    6000 px on the long edge.
10. **What if a run stops early?** You still get a layered file with
    everything done up to that point, marked as incomplete. A run you
    cancel ends the same way.

## Motion that shows the product working

All of it is still under `prefers-reduced-motion: reduce`. Anything that
moves by itself for longer than five seconds has a visible pause control,
under WCAG 2.2.2.

### Scroll reveals

- `landing/reveal.ts` finds its targets by selector and changes no markup:
  section eyebrows, titles and bodies; step cards; drawer stats; glass
  facts; question tiles; the waitlist form.
- A target below the fold enters with the DESIGN.md entrance when 15% of
  it is in view: from opacity 0, `translate: 0 12px` and `blur(4px)`, over
  `--duration-enter` with `--ease-reveal`, staggered by `--stagger-block`
  within its section. It enters once.
- Nothing is hidden before the script runs, and a target already in view
  when the page loads is shown at once.

### The hero replay

The hero window shows the last frame of the September 15 computer-tool
run on the sample photograph. The replay plays that run's recorded facts
over the frame and invents nothing: the run recorded no narration and took
no correction.

- A glass overlay types the run's instruction, `INSTRUCTION` in
  `docs/evidence/driving-mechanism/harness.ts`, then counts from "Step 1
  of 13" to "Step 13 of 13" along a progress bar, then lists the four
  exported layers, bottom first: Original photograph, Brighten photograph,
  Warm colours, Darken corners softly. It is captioned "A 1 min 42 s run,
  shown faster".
- One loop takes about 12 seconds and repeats, with a Pause the replay
  toggle. Under reduced motion it shows the finished state and no toggle.
- The chips and the drift stay as they are.

### Self-playing demos

- **Run log.** When From a real run is 30% in view, its log rows appear in
  order, the correction panel arrives with its "Accepted in 194 ms" line,
  and the four stats count up to their values. The sequence plays once and
  ends within 4.5 seconds. Assistive technology reads the whole log from
  the start.
- **Layer switcher.** While Why layers is in view and nobody has touched
  it, it demonstrates itself: every 2.4 seconds it hides one layer and then
  shows it again, from the top of the stack down, then switches to Flat
  JPEG and back. A Pause the demo toggle stops it, and any click, key press
  or focus inside the switcher ends it for good. The demo never writes to
  the hint's live region.

### Pointer response

Only under `(hover: hover) and (pointer: fine)`:

- The hero grid brightens in a soft circle under the pointer, drawn by a
  `.hero-shell::before` layer beneath the hero's content, whose `--spot-x`
  and `--spot-y` are set through the CSSOM at most once a frame.
- Step cards, drawer stats, glass facts and question tiles lift by 4 px
  with `--shadow-lift` over `--duration-swap`.
- The arrow icon in a call to action moves 4 px along its direction.

## The workbench input view

- **Site bar.** Clear at the top and glass once the page has scrolled 24
  px, as on the landing.
- **Back.** A bordered button with `hgi-arrow-left-01` and the label Back:
  40 px tall, solid paper, `--color-border-strong`, subtle fill on hover.
- **Layout at 1280 px and wider.** No full-height divider. A left column
  of five twelfths and a right column of seven.
  - Left: the eyebrow, title and lede as today. Then a four-step guide
    (Choose a photograph; Say what you want; Watch it work, and correct
    it; Download the layered PSD) whose first two steps tick off as the
    photograph and the instruction are filled in. Then three facts: Three
    free runs, Uploads deleted within 24 hours, and Your key is never
    stored.
  - Right: `.workbench-board`, a sketchboard of `--color-pattern-dot` dots
    on a 20 px grid over `--color-bg-subtle`, filling the column to the
    bottom of the page. The form floats on it as a solid paper card with a
    `--rule` border and `--shadow-card`, 40 px of padding and at most
    760 px wide.
- **The form.** Three numbered groups that keep their labels, Source
  photograph, Retouching instruction and OpenAI API key (optional), each
  after a decorative 01, 02 or 03. The drop zone is a solid field tile with
  an upload icon, and a chosen photograph shows its thumbnail and name.
  The example prompts are chips that wrap to their content. Fields use
  `--color-bg-field`, and focus shows a 2 px ink outline inside a 4 px
  accent halo.
- **Start retouching.** Full width at the foot of the card: accent fill,
  `--color-text-on-accent` and an arrow icon. Disabled, it is
  `--color-bg-disabled` with `--color-text-disabled`, 5.5:1 in light mode
  and 6.9:1 in dark.
- Every string, control name and behaviour the tests pin stays, including
  "Uploads are deleted within 24 hours." once, inside the file field.

## Rules every change keeps

- The content security policy allows `style-src 'self'` only: no inline
  styles, and values are set through the CSSOM.
- `test/web/landing/audit.test.ts`: colours only from `tokens.css`,
  `hgi-stroke` on every icon, the two typefaces, a reduced-motion block in
  every landing CSS file, only compositor properties animate, and no em or
  en dash in landing `.ts`.
- `test/web/dom.test.ts`: no `border-radius` anywhere; gradients only in
  `switcher.css` and in rules for `.hero-shell` or `.workbench-board`;
  durations in `styles.css` at most 180 ms.
- New landing modules follow the existing ones: a `node()` helper, no
  framework, and a render or mount function called from `renderLanding`.

## Acceptance

- `bun run typecheck`, `bun test` and `bun run lint` pass.
- Every browser test passes on its own with `RUN_BROWSER_TESTS=1`,
  including new ones for stacking, questions, motion and surfaces.
- Screenshots at 1440x900 and 390x844, in light and dark, show no
  transparent surface, the stacked sections, the questions grid, and the
  workbench board and card.
- DESIGN.md describes the surface rule, the stacking, the questions
  section, the new motion and the workbench input view.
