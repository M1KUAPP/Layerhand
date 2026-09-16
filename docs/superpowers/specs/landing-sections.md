# Landing sections

The build sheet for the five sections of the Layerhand landing page, in
page order: every visible string, the DOM each section is built from, the
content that is not copy, and what done looks like at 1440x900. It is the
concrete companion to [DESIGN.md](/docs/DESIGN.md), which wins wherever
the two disagree.

Contents:

1.  [The page's argument](#the-pages-argument)
1.  [Rules for every section](#rules-for-every-section)
1.  [Hero](#hero)
1.  [Scrub](#scrub)
1.  [Drawer](#drawer)
1.  [Glass](#glass)
1.  [Waitlist and footer](#waitlist-and-footer)
1.  [Strings the tests check](#strings-the-tests-check)
1.  [Left out on purpose](#left-out-on-purpose)
1.  [See also](#see-also)

## The page's argument

Read from the top, the page makes one case in five steps:

1.  **Hero.** Layerhand is AI retouching that hands back a layered PSD,
    not a flat JPEG, and it is free to try now.
1.  **Scrub.** A flat file keeps only the result; a layered one keeps the
    work, one decision to a layer.
1.  **Drawer.** The proof: the four named layers from a real run, one of
    them shaped by a correction sent while it worked.
1.  **Glass.** Because nothing is baked in, the file stays yours to change
    after the agent stops.
1.  **Waitlist and footer.** An email address gets the launch recording
    and updates, and using Layerhand needs neither.

## Rules for every section

- **Class names start with the section's file name:** `hero__`,
  `scrub__`, `drawer__`, `glass__`, `waitlist__`. Do not use or restyle
  the shared `.button`, `.eyebrow` or `.lede`; the workbench still uses
  them, and a rule in a section's stylesheet would change it too.
- **Each section root carries `data-section`** with its name, so tests
  and audits find it without leaning on a class.
- **Text styles are named as in DESIGN.md.** Use the matching type token
  from `tokens.css`, with its tracking and case. Text is `--ink` unless
  the outline says `--color-text-secondary` or `--color-text-tertiary`,
  and `--mark-muted` is never text.
- **Icons** are `<i class="hgi-stroke hgi-NAME" aria-hidden="true"></i>`
  in `currentColor`, at `1.25em` beside 13px text, which is 16px. Every
  name in this sheet was checked against the font's stylesheet at
  `use.hugeicons.com` on September 17. No Isocons in this pass.
- **Strings go in through `textContent`,** copied exactly. The sheet uses
  real quotation marks, ellipses and middle dots, and no dashes.
- **`.enter` is for the hero only.** The entrance gate runs at load, so an
  entrance below the fold would finish before anyone scrolled to it.
- **Build the static version first.** Each outline is the page with no
  motion; motion is listed after it, with what reduced motion leaves.
- **No `backdrop-filter`,** no shadows on surfaces, no gradients, and
  square corners.
- **Layout** at 1280px and wider is a 12-column grid with 36px side
  padding and 24px gutters. Whether the page shows below 1280px at all is
  [#128](https://github.com/M1KUAPP/astra/issues/128). If it does, every
  section is one column with 16px side padding, and the hero has to hold
  together at 390px.

## Hero

Unit H. The only section above the fold, and the only one that carries
the tagline, the primary call to action and the demo loop.

### Hero copy

```text
Eyebrow            AI retouching
Headline, line 1   A layered PSD,
Headline, line 2   not a flat JPEG.
Lede               Layerhand retouches your photograph in Photopea while you watch. Correct it as it works, then download a PSD with each edit on its own named layer.
Primary button     Retouch a photo
Note               Three free runs. No account needed.
Secondary link     Get launch updates by email
Poster alt         Unretouched studio photograph of a cobalt-blue glass bottle with a brushed-metal cap on a creased paper backdrop.
Poster caption     Before retouching: the sample photograph, which you can try in the workbench.
Loop label         Silent demo of Layerhand retouching a photograph in Photopea
Pause button       Pause
Pause name         Pause the demo
Play button        Play
Play name          Play the demo
```

The eyebrow and the headline read together as the tagline. The headline
breaks after "PSD," at every width.

### Hero DOM outline

```text
section.hero                         data-section="hero", aria-labelledby="hero-title"
  div.hero__copy
    p.hero__eyebrow                  UI / Eyebrow, --color-text-tertiary      .enter  --enter-i: 0
    h1#hero-title.hero__title        Display / H1, clamp(3rem, 8vw, 88px)
      span.hero__line                display: block
        span.hero__word × 3          A · layered · PSD,                       .enter  --enter-i: 0, 0.8, 1.6
      span.hero__line                display: block
        span.hero__word × 4          not · a · flat · JPEG.                   .enter  --enter-i: 2.4, 3.2, 4, 4.8
    p.hero__lede                     UI / Lede, --color-text-secondary        .enter  --enter-i: 4
    div.hero__actions                                                         .enter  --enter-i: 5
      button.hero__cta               UI / Label, type="button"
        "Retouch a photo"
        i.hgi-arrow-right-01
      a.hero__updates                UI / Label, href="#updates"
        "Get launch updates by email"
        i.hgi-arrow-down-01
      p.hero__note                   UI / Small, --color-text-secondary
  div.hero__media                                                             .enter  --enter-i: 2
    figure.hero__plate
      div.hero__window               aspect-ratio: 3 / 2, overflow: hidden, 1px --rule border
        img.hero__photo              poster state: the sample photograph, alt = Poster alt
        video.hero__photo            loop state instead: muted, loop, playsinline, autoplay, poster, aria-label = Loop label
        button.hero__loop-toggle     loop state only: UI / Label, type="button", aria-label = Pause name or Play name
          i.hgi-pause or i.hgi-play
          "Pause" or "Play"
      figcaption.hero__caption       poster state only: UI / Small, --color-text-tertiary, 12px below the window
```

- **Words.** Each `.hero__word` is `display: inline-block`, so its
  entrance can move, with a plain space between the spans. The fractional
  `--enter-i` values space the words 80ms apart, `--stagger-word` over
  `--stagger-block`, and every entrance ends by the time the gate reaches
  `done`.
- **The headline** overrides the shared `h1` rule's size and
  `max-width`, and each `.hero__line` is `white-space: nowrap`. Each line
  is about 480px wide at 88px and 260px at 48px.
- **At 1280px and wider,** `.hero` is at least `100vh` tall, padded 64px
  top and bottom, with its children centred vertically. `.hero__copy`
  spans columns 1 to 6 and `.hero__media` columns 7 to 12.
- **Below 1280px,** it is one column, the copy and then the plate at full
  width.
- **The photograph** is positioned absolutely inside `.hero__window` at
  `top: -10%`, full width, `height: 120%`, with `object-fit: cover`.
- **The primary button** calls `context.startRun()`. The secondary link is
  a plain jump to `#updates`, with no smooth scrolling.

The two plate states:

- **Poster state.** `hero.ts` holds one constant for the loop's URL, empty
  until [#20](https://github.com/M1KUAPP/astra/issues/20) delivers the
  recording. While it is empty, the plate is an `<img>` with the caption
  and no toggle.
- **Loop state.** Once the constant is set, the plate is a `<video>` with
  the same poster, the toggle and no caption. The toggle sits 16px in from
  the window's bottom-left corner, in `--paper` with a 1px
  `--color-border-strong` border, and swaps its glyph, text and name when
  pressed.

Motion:

- **Parallax.** On each animation frame, write
  `clamp((scrollY - heroTop) / heroHeight, 0, 1)` to `--hero-progress` on
  `.hero`, where `heroTop` is the section's offset from the top of the
  page. `.hero__photo` takes
  `translate: 0 calc(var(--hero-progress) * 8%)` and `.hero__plate` takes
  `translate: 0 calc(var(--hero-progress) * 4%)`, so the caption drifts
  with its frame and nothing overlaps it. The copy never moves, and the
  entrance stays on `.hero__media`, so no element's `translate` has two
  owners.
- **Reduced motion.** Nothing writes `--hero-progress`, so nothing drifts.
  The loop does not autoplay and its toggle starts as Play. The entrances
  cross-fade, as `shell.css` already arranges.

### Hero content

- **The poster** is `src/web/assets/sample-photo.png`, 1536x1024, which
  `app.ts` already imports as `samplePhotoUrl`. Its provenance is in
  `sample-photo.md` beside it.
- **The loop** does not exist yet. Nothing the poster state shows mentions
  it, so the hero reads the same whether or not it ever arrives.

### Hero done looks like

At 1440x900, the eyebrow, the two-line headline, the lede, the chartreuse
"Retouch a photo" button, the updates link and the note sit in the left
half above the fold, beside the framed bottle photograph and its caption.
Scrolling moves the photograph inside its frame and the frame a little,
the words stay put and nothing covers them, and at 390px the same content
stacks, copy first, with no sideways scroll.

## Scrub

Unit C, with its clip from unit V. The first section below the fold.

### Scrub copy

```text
Eyebrow        Why layers
Headline       A flat JPEG keeps the result. A PSD keeps the work.
Body           Retouching is a stack of separate decisions, from the photograph at the bottom to the last adjustment on top. Layerhand hands the stack back as it was built, so one decision can change without redoing the rest.
Frame name     Illustration of a photograph coming apart into separate layers
Caption        An illustration. The layers from a real run come next.
```

### Scrub DOM outline

```text
section.scrub                        data-section="scrub", aria-labelledby="scrub-title"
  div.scrub__track                   height: 180vh, the stage plus 80vh of scrub
    div.scrub__stage                 position: sticky, top: 0, height: 100vh
      div.scrub__copy
        p.scrub__eyebrow             UI / Eyebrow, --color-text-tertiary
        h2#scrub-title.scrub__title  Display / H2
        p.scrub__body                UI / Lede, --color-text-secondary
      figure.scrub__figure
        div.scrub__frame             role="img", aria-label = Frame name, aspect-ratio: 16 / 9, 1px --rule border
          img.scrub__poster          alt="", inset: 0, object-fit: cover
          video.scrub__video         muted, playsinline, preload="auto", aria-hidden="true", inset: 0
          canvas.scrub__canvas       aria-hidden="true", inset: 0
        figcaption.scrub__caption    UI / Small, --color-text-tertiary
```

- **At 1280px and wider,** the stage is padded 64px on the grid, with
  `.scrub__copy` in columns 1 to 4 and `.scrub__figure` in columns 5 to
  12, centred vertically.
- **The static version,** which is also what reduced motion and widths
  below 1280px get: `.scrub__track` is `height: auto`, the stage is
  `position: static` and `height: auto` with 120px top and bottom
  padding, and only the poster is created, with no video or canvas.
- **Motion** is DESIGN.md's scrub recipe, with progress measured over
  `.scrub__track`: `(scrollY - trackTop) / (trackHeight - innerHeight)`.
- No icons and no `.enter`.

### Scrub content

- **The clip and poster** are `src/web/assets/landing/scrub.mp4` and
  `scrub-poster.jpg`, from unit V. Until a person makes the Gemini clip,
  they are a synthetic clip cut from the sample photograph, and either
  drops in for the other. The copy is true of both: neither is a recording
  of a run, and the caption says so.
- **The frame is 16:9** because Gemini's clips are; `object-fit: cover`
  crops a clip of any other shape.

### Scrub done looks like

At 1440x900, the stage pins for 80vh of scrolling while the clip runs
from its first frame to its last across exactly that distance, and the
copy stays still and readable throughout. With reduced motion nothing
pins, and the poster sits beside the copy.

## Drawer

Unit D. The layer list from a real run, in a bottom sheet.

### Drawer copy

```text
Eyebrow           From a real run
Headline          Four layers, each named for what it does.
Body              On September 15, Layerhand was asked to brighten a seascape, warm its colours and darken its corners. Partway through, it was told to keep the vignette very subtle. These are the layers in the PSD it handed back.
Open button       Show the layers
Sheet title       Layers in the exported PSD
Sheet meta        16 steps · 3 min 13 s · one correction
Order note        Bottom of the stack first
Close button      Close
Close name        Close the layers
Raster kind       Raster layer
Adjustment kind   Adjustment layer
Mask label        With mask
Row 4 note        Shaped by the correction sent mid-run: “Keep the vignette very subtle, and leave the middle of the photograph untouched.”
```

The four layer names are in [the drawer's content](#drawer-content).

### Drawer DOM outline

```text
section.drawer                                  data-section="drawer", aria-labelledby="drawer-title"
  p.drawer__eyebrow                             UI / Eyebrow, --color-text-tertiary
  h2#drawer-title.drawer__title                 Display / H2
  p.drawer__body                                UI / Lede, --color-text-secondary
  button.drawer__open                           UI / Label, type="button", aria-haspopup="dialog", aria-controls="drawer-sheet", aria-expanded
    i.hgi-layers-01
    "Show the layers"
  div.drawer__scrim                             aria-hidden="true"
  div#drawer-sheet.drawer__sheet                role="dialog", aria-modal="true", aria-labelledby="drawer-sheet-title", inert while closed
    div.drawer__handle                          aria-hidden="true", 48 × 4px of --mark-muted
    div.drawer__head
      h3#drawer-sheet-title.drawer__sheet-title UI / Label
      p.drawer__meta                            UI / Small, --color-text-secondary
      button.drawer__close                      UI / Label, type="button", aria-label = Close name
        i.hgi-cancel-01
        "Close"
    p.drawer__order                             UI / Micro, --color-text-tertiary
    ol.drawer__layers
      li.drawer__layer × 4                      data-kind="raster" or "adjustment", 1px --rule between rows
        i.drawer__layer-icon                    hgi-image-01 for raster, hgi-sliders-horizontal for adjustment
        span.drawer__layer-name                 UI / Body
        span.drawer__layer-kind                 UI / Micro, --color-text-tertiary
        span.drawer__layer-mask                 adjustment rows only: UI / Micro, --color-text-tertiary
          i.hgi-layer-mask-01
          "With mask"
        p.drawer__layer-note                    row 4 only: UI / Small, --color-text-secondary
          i.hgi-message-edit-01
          the Row 4 note
```

- **The section** sits in columns 1 to 6, padded 120px top and bottom.
- **The sheet** is fixed to the bottom edge and centred, at
  `width: min(640px, 100% - 32px)` and `max-height: 85dvh`, scrolling
  inside. It is `--paper` with a 1px `--color-border-strong` border on
  its top and sides, and 24px of padding.
- **Each row** is a grid of the icon at 20px, the name at `1fr`, then the
  kind and the mask at `auto`. Row 4's note takes a second line under the
  name.
- **Closed,** the sheet is `translate: 0 100%`, `visibility: hidden` and
  `inert`, and the scrim is `opacity: 0` with pointer events off.
- **Open,** the sheet is `translate: 0 0`, and the scrim is `--ink` at
  `opacity: 0.12`, covering `inset: -100px 0`.
- **Opening** moves focus to the close button. Esc, the close button and a
  click on the scrim each close the sheet and return focus to the open
  button, and `aria-expanded` follows.

Motion:

- **Open and close** are transitions, never keyframes, so a close halfway
  through an open reverses: `translate` and `visibility` over
  `--duration-drawer` on `--ease-drawer`, and the scrim's opacity over the
  same duration.
- **Reduced motion.** No `translate`; the sheet and the scrim cross-fade
  over `--duration-swap`.

### Drawer content

| Row | Name                        | Kind             | Glyph                    | Mask      |
| --- | --------------------------- | ---------------- | ------------------------ | --------- |
| 1   | Original photograph         | Raster layer     | `hgi-image-01`           |           |
| 2   | Brighten the photograph     | Adjustment layer | `hgi-sliders-horizontal` | With mask |
| 3   | Warm the colours            | Adjustment layer | `hgi-sliders-horizontal` | With mask |
| 4   | Very subtle corner vignette | Raster layer     | `hgi-image-01`           |           |

- **Every row** is from the PSD of the
  [A3 native-steering run](/docs/evidence/native-steering/README.md) on
  September 15, in the order its `summary.json` lists them, which is the
  bottom of the stack first. The step count, the duration and the
  correction in the copy come from the same run, and the instruction is
  spike A0's three edits.
- **No thumbnail.** The run's photograph was a seascape that is not a web
  asset, and the bottle in the hero is not the image these layers came
  from, so nothing on the sheet may suggest it is.

### Drawer done looks like

At 1440x900, pressing "Show the layers" slides a 640px sheet up from the
bottom edge with the four rows in order, each with its glyph, name and
kind, "With mask" on both adjustments and the correction quoted under the
vignette. Esc, "Close" and a click outside the sheet each close it, and
closing it halfway open reverses without a jump.

## Glass

Unit G. The Three.js moment, which says nothing the copy beside it does
not.

### Glass copy

```text
Eyebrow         After the run
Headline        Still yours to edit.
Body            Nothing in the file is baked in. Open the PSD and carry on where the agent stopped.
Fact 1 title    Repaint a mask
Fact 1 body     Masks stay separate from the pixels, so fixing an edge is a brush stroke, not a redo.
Fact 2 title    Retune an adjustment
Fact 2 body     An adjustment is a setting on its own layer. Change the number and the photograph follows.
Fact 3 title    Hide a layer
Fact 3 body     Every edit sits on a layer of its own. Turn one off and the rest stay as they were.
```

### Glass DOM outline

```text
section.glass                        data-section="glass", aria-labelledby="glass-title"
  div.glass__object                  aria-hidden="true", 560 × 560px
    canvas.glass__canvas             with WebGL: the Glass Object tracing layers.svg
    svg.glass__art                   without WebGL instead: layers.svg inlined, 480px tall, centred
  div.glass__copy
    p.glass__eyebrow                 UI / Eyebrow, --color-text-tertiary
    h2#glass-title.glass__title      Display / H2
    p.glass__body                    UI / Lede, --color-text-secondary
    ul.glass__facts
      li.glass__fact × 3
        i.glass__fact-icon           hgi-layer-mask-01, hgi-sliders-horizontal, hgi-view-off
        h3.glass__fact-title         UI / Label
        p.glass__fact-body           UI / Body, --color-text-secondary
```

- **At 1280px and wider,** the section is padded 120px top and bottom,
  with `.glass__object` in columns 1 to 6 and `.glass__copy` in columns 8
  to 12, centred vertically. The facts stack 24px apart, each icon to the
  left of its title and body.
- **The Glass Object** uses DESIGN.md's settings over a transparent
  background, so `--paper` shows through. `three` loads only after the
  hero has rendered.
- **Its ring light** defaults to `#066aff`, a colour outside the tokens.
  If the vanilla build takes a light colour, set it from `--accent`;
  if it does not, say so in the pull request.

Motion:

- **With WebGL,** the object floats and rocks as the vanilla build does by
  default.
- **Reduced motion.** One still frame, with no float and no rock.
- **No WebGL.** The flat SVG, which is also what shows while `three`
  loads.

### Glass SVG

Four flat slabs stacked straight up, one for each layer in the drawer,
listed bottom first:

- **Slabs.** Four rhombi, each 360 wide and 120 tall in the viewBox. The
  3:1 aspect reads as a square sheet seen from a low angle.
- **Offset and order.** No horizontal offset, and 136 units from one slab
  to the next, which leaves a 16-unit gap. No two slabs overlap, so the
  trace keeps them as four pieces.
- **Stroke.** 2px with round joins, not scaled with the drawing.
- **Colour.** The bottom three are `--paper` with an `--ink` stroke. The
  top one is `--accent` with a `--color-text-on-accent` stroke, which
  stays dark on chartreuse in both colour schemes.
- **Size.** The viewBox is 364 by 532. The flat fallback shows it 480px
  tall, about 328px wide, centred in the 560px box.

The file holds shapes and class names and no colour, so it needs no hex
and follows dark mode. That means the fallback inlines it into the page,
because an `<img>` cannot see the page's custom properties. The Glass
Object reads only the shapes. Save it as
`src/web/assets/landing/layers.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 364 532">
  <path class="glass__slab" d="M182 410 362 470 182 530 2 470Z" />
  <path class="glass__slab" d="M182 274 362 334 182 394 2 334Z" />
  <path class="glass__slab" d="M182 138 362 198 182 258 2 198Z" />
  <path class="glass__slab glass__slab--top" d="M182 2 362 62 182 122 2 62Z" />
</svg>
```

And colour it in `glass.css`:

```css
.glass__art .glass__slab {
  fill: var(--paper);
  stroke: var(--ink);
  stroke-width: 2px;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.glass__art .glass__slab--top {
  fill: var(--accent);
  stroke: var(--color-text-on-accent);
}
```

### Glass done looks like

At 1440x900, the glass stack sits in a 560px square on the left and the
copy with its three facts on the right. With WebGL unavailable the same
four slabs show flat, three outlined in ink and the top one filled
chartreuse, and with reduced motion the object holds still.

## Waitlist and footer

Unit W. Secondary by design: Product Hunt's featuring guidelines exclude
waitlisted products that give no immediate access, so the copy says the
email address is for the recording and updates, never for access.

### Waitlist copy

```text
Eyebrow            Launch updates
Headline           Get the launch recording.
Body               Leave an email address and we will send the thirty-second demo when it is out, then the occasional update. You do not need this to use Layerhand, which is open now with three free runs.
Label              Email address
Placeholder        you@example.com
Submit button      Email me the recording
Status, saving     Saving your address…
Status, new        Thanks. The recording will come to that address.
Status, repeat     That address is already signed up.
Status, failed     the sentence context.publicMessage(error) returns
```

### Footer copy

```text
Wordmark           Layerhand
Credit             Built on GPT-6 Astra for the GPT-6 Astra Challenge.
Credit link        "GPT-6 Astra Challenge" goes to https://www.producthunt.com/contests/gpt-6-astra-challenge
Photopea note      Layerhand drives Photopea, a web image editor, and is not affiliated with it.
Photopea link      "Photopea" goes to https://www.photopea.com/
Source link        Source on GitHub
Source target      https://github.com/M1KUAPP/astra
```

### Waitlist DOM outline

```text
div.waitlist                                   what renderWaitlist(context) returns
  section#updates.waitlist__section            data-section="waitlist", aria-labelledby="waitlist-title", 1px --rule on top
    div.waitlist__copy
      p.waitlist__eyebrow                      UI / Eyebrow, --color-text-tertiary
      h2#waitlist-title.waitlist__title        Display / H2
      p.waitlist__body                         UI / Lede, --color-text-secondary
    form.waitlist__form                        data-form="waitlist"
      label.waitlist__label                    UI / Label, for="waitlist-email", visible
      div.waitlist__row
        input#waitlist-email.waitlist__input   UI / Body, type="email", name="email", autocomplete="email", required, placeholder
        button.waitlist__submit                UI / Label, type="submit", --color-bg-inverse with --paper text
          "Email me the recording"
          i.hgi-mail-send-01
      p.waitlist__status                       UI / Small, --color-text-secondary, role="status"
        i.waitlist__status-icon                hgi-loading-03 saving, hgi-checkmark-circle-02 new or repeat, hgi-alert-circle failed
        span.waitlist__status-text
  footer.waitlist__footer                      data-section="footer", 1px --rule on top
    p.waitlist__wordmark                       UI / Label
    p.waitlist__credit                         UI / Small, --color-text-secondary, holds a.waitlist__link
    p.waitlist__credit                         UI / Small, --color-text-secondary, holds a.waitlist__link
    a.waitlist__source                         UI / Label
      i.hgi-github
      "Source on GitHub"
```

- **At 1280px and wider,** the section is padded 120px top and bottom,
  with `.waitlist__copy` in columns 1 to 5 and the form in columns 7 to 12,
  level with the bottom of the copy. The input and the button share one
  48px row, and the input takes the width the button leaves.
- **The input** is `--paper` with a 1px `--color-border-strong` border,
  and its placeholder is `--color-text-tertiary`.
- **The footer** is padded 32px and runs in one row: the wordmark, the
  two credits, and the source link at the right edge. It wraps below
  1280px.
- **Submitting** disables the button and shows the saving status. A new
  address shows the new status and clears the input, an existing one
  shows the repeat status and keeps it, and a throw shows the failed
  status. The button is enabled again in every case.
- **Links** open in the same tab, underlined in `currentColor`.

Motion: the saving glyph spins, which stays under reduced motion because
DESIGN.md keeps spinners. Nothing else moves.

### Waitlist content

Nothing beyond the copy and the glyphs in the outline.

### Waitlist done looks like

At 1440x900, the section shows its copy on the left and, on the right, a
visible "Email address" label over the input and the ink "Email me the
recording" button. A new address shows the check glyph and the thanks
line, the same address again shows "That address is already signed up.",
and the footer below carries the wordmark, both credits and the GitHub
link.

## Strings the tests check

- **`Retouch a photo`** is unchanged, so every test that clicks it keeps
  passing.
- **`Join waitlist`** becomes `Email me the recording`, and
  **`You are on the list.`** becomes
  `Thanks. The recording will come to that address.` Both are asserted in
  `test/web/application.browser.test.ts`, which is not in unit W's file
  list, so W needs that file too or the advisor changes the two lines at
  merge.
- **`test/web/dom.test.ts`** reads `app.ts` as text and expects
  `video.autoplay = true`, `video.muted = true`, `video.loop = true` and
  `form.dataset.form = 'waitlist'` in it. The foundation moves those lines
  out of `app.ts`, and the hero's poster state has no video at all, so
  those four expectations move with the code or go. It also forbids em and
  en dashes in `app.ts`; this sheet's strings contain none.

## Left out on purpose

- **Upload deletion.** NFR-6 wants the page to say uploads are deleted
  within twenty-four hours, but the
  [launch application design](/docs/references/launch-application-design.md#artifact-storage)
  says the repository cannot claim the bucket's lifecycle rule until
  someone has inspected it. The line belongs in the footer once someone
  has.
- **Which editors open the file.** FR-25 names Photoshop, Affinity Photo
  and GIMP. Photoshop opened a two-layer Photopea PSD in spike B1, but no
  retouch with adjustment layers has been opened in any of the three, so
  the page names none.
- **A licence link.** The repository is public and has no licence file.
- **Bring your own key.** The workbench offers it, and the hero keeps to
  one action.
- **The run's photograph,** for the reason in
  [the drawer's content](#drawer-content).

## See also

- [DESIGN.md](/docs/DESIGN.md) — the tokens, type, motion and techniques
  this sheet applies.
- [Native steering evidence](/docs/evidence/native-steering/README.md) —
  the A3 run the drawer shows.
- [Product requirements](/docs/PRD.md#launch-surface) — FR-30 to FR-33.
- [Design research](/docs/research/design/README.md) — the sources behind
  each technique.
