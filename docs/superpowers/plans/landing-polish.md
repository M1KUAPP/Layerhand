# Landing polish implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking. In this plan the workers are
> Devin and agy command-line agents, one per task, each in its own
> worktree; the coordinator reviews and integrates their commits.

**Goal:** Ship the five refinements in the
[landing polish spec](/docs/superpowers/specs/landing-polish.md) as one
pull request of atomic commits.

**Architecture:** Plain TypeScript DOM modules under `src/web/landing/`,
each section a `renderX()` or `mountX()` function called from
`renderLanding`, with one CSS file per module imported by
`src/web/styles.css`. The workbench lives in `src/web/app.ts` and
`src/web/styles.css`. Behaviour is pinned by Playwright browser tests run
with Bun.

**Tech Stack:** Bun 1.3, TypeScript, Playwright (`playwright-core`
Chromium), Hugeicons font, CSS custom properties from
`src/web/landing/tokens.css`.

**Spec:** `docs/superpowers/specs/landing-polish.md`

## Global constraints

Every task's requirements include these. Read them before starting.

- Read `docs/superpowers/specs/landing-polish.md` for your part, and
  `docs/DESIGN.md` for the design system it extends.
- Change only the files your task names, and nothing else. Leave no
  scratch files. Never run `bun install`, never push, never switch or
  create branches, never edit anything under `graphify-out/`.
- The content security policy is `style-src 'self'`. Never write a
  `style` attribute in markup or with `setAttribute('style', ...)`. Set
  values with `element.style.setProperty('--name', value)` only.
- Colours come only from the tokens in `src/web/landing/tokens.css`. Do
  not add tokens and do not write a colour literal anywhere else, named
  colours included. Available surface tokens: `--glass-fill`,
  `--glass-fill-chrome`, `--glass-blur`, `--color-bg-field`,
  `--color-bg-disabled`, `--color-text-disabled`, `--color-pattern-dot`,
  `--shadow-card`, `--shadow-lift`, `--shadow-sheet`.
- Surfaces are solid or glass. A button, field, card or container never
  has a transparent or see-through background, and never `opacity` below
  1 at rest. Glass is exactly `background-color: var(--glass-fill);` (or
  `var(--glass-fill-chrome)` under light text) with
  `backdrop-filter: var(--glass-blur);`, and only over a photograph, a
  pattern or moving content.
- No `border-radius` anywhere. Gradient functions only in
  `src/web/landing/switcher.css` and in rules whose selector contains
  `.hero-shell` or `.workbench-board`.
- Every landing CSS file you create or edit has a
  `@media (prefers-reduced-motion: reduce)` block. Transitions and
  animations touch only `transform`, `translate`, `opacity` and `filter`.
  Use the motion tokens: `--ease-reveal`, `--ease-settle`,
  `--duration-swap`, `--duration-enter`, `--stagger-block`.
- In `src/web/styles.css`, a literal duration is at most `180ms`.
- Icons are Hugeicons font glyphs: `hgi-stroke` and the `hgi-` name in the
  same class string, with `aria-hidden="true"`. Reuse names already in the
  codebase where one fits.
- Copy: no em dash or en dash characters in any `.ts` under `src/web/`.
  British spelling, as the existing copy uses ("colours").
- Type only through `var(--font-display)`, `var(--font-ui)` and the
  `--text-*` tokens.
- Anything that moves by itself for more than five seconds has a visible
  pause control. Under `prefers-reduced-motion: reduce`, nothing moves by
  itself.
- Do not edit the file lists in `test/web/dom.test.ts`; the coordinator
  adds new files to them. You may add one `@import` line per new CSS file
  to `src/web/styles.css`, next to the other landing imports.
- Browser tests run one file at a time:
  `RUN_BROWSER_TESTS=1 bun test <file>`. Copy the setup of
  `test/web/landing/glass.browser.test.ts`: `startTestApplication()` from
  `test/web/support/test-server.ts`, `chromium.launch({ headless: true })`
  and `openLanding()` from `test/web/landing/support.ts`. Never pass
  `channel: 'chrome'` in a new test: installed Chrome is not on this
  machine. To run an existing test that passes it, copy the file to
  `test/web/tmp-<name>.browser.test.ts` without that option, run the copy,
  then delete it.
- Timers in browser tests: install Playwright's clock before navigating,
  `await page.clock.install()`, and advance it with
  `await page.clock.runFor(ms)`. It drives `setTimeout`,
  `requestAnimationFrame` and `performance.now`.
- Before you finish: `bun run typecheck`,
  `bun test test/web/dom.test.ts test/web/landing/audit.test.ts`,
  `bunx prettier --check <every file you changed>`, and every browser test
  file you created or changed. All must pass.
- Commit your work in your worktree with the exact messages your task
  gives, as separate commits in that order. Wrap commit bodies at 72
  columns, end each message with this trailer line, and do not push:

  ```text
  Claude-Session: https://claude.ai/code/session_016wJYiWoiAW8dYYoVFcmR9Q
  ```

- Finish with a short report: the commits you made, each test command and
  its result, anything you could not do, and anything you guessed.

## Dispatch

| Wave | Task                                   | Worker                      |
| ---- | -------------------------------------- | --------------------------- |
| 1    | 1. Workbench input view                | Devin `swe-2-high`          |
| 1    | 2. Stacked sections                    | Devin `swe-2-high`          |
| 1    | 3. Hero replay                         | Devin `swe-2-high`          |
| 1    | 4. Run log playback and switcher demo  | Devin `swe-2-high`          |
| 1    | 5. Questions section                   | agy `gemini-3.8-flash-high` |
| 1    | 6. Scroll reveals and pointer response | agy `gemini-3.8-flash-high` |
| 2    | 7. Solid-surface sweep                 | Devin `swe-2-high`          |
| 2    | 8. DESIGN.md                           | agy `gemini-3.8-flash-high` |
| 3    | 9. Integration                         | Coordinator                 |

- Each task runs in `.worktrees/lp-<n>`, a worktree on branch
  `lp/<n>` created from `feat/landing-polish`, with `node_modules`
  hard-linked from `.worktrees/landing-polish`.
- Briefs, logs and exit codes live in `~/.cache/layerhand-fanout/lp/`.
  A brief is the global constraints above plus the task's section.
- Devin and agy run as:

  ```sh
  devin --model swe-2-high --permission-mode dangerous \
    --respect-workspace-trust false --prompt-file "$BRIEF" -p
  agy --model gemini-3.8-flash-high --dangerously-skip-permissions \
    --print-timeout 60m -p "$(cat "$BRIEF")"
  ```

- Every run is launched detached with `setsid nohup` under
  `timeout 3600`, writing its exit code to a file.
- A worker's exit code proves nothing. The coordinator reads the log for
  rejected tool calls, checks `git log` and `git status` in the worktree,
  reads every commit, and runs the task's tests again before integrating.

## Task 1: Workbench input view

**Files:**

- Modify: `src/web/app.ts` (the site header on the workbench and
  `renderInput()`)
- Modify: `src/web/styles.css` (site bar, buttons, fields, disabled
  state, input view layout)
- Create: `test/web/workbench.browser.test.ts`
- Modify only if a renamed selector breaks it:
  `test/web/application.browser.test.ts`

**Interfaces:**

- Consumes: the tokens above; `data-scrolled` on the root, which
  `src/web/scroll.ts` already sets once `scrollY > 24`.
- Produces: `.site-header[data-over]`, clear until
  `:root[data-scrolled='true']`, then glass, on both views. The landing
  already sets `data-over="hero"`; the workbench header sets
  `data-over="page"`. Classes `.back-button`, `.run-guide`,
  `.run-guide__step[data-state='done'|'current'|'upcoming']`,
  `.run-facts`, `.workbench-board`, `.workbench-card`.

- [ ] **Step 1: Write the failing test**

Create `test/web/workbench.browser.test.ts`. Open the workbench the way
`openInput()` in `test/web/application.browser.test.ts` does: load the
landing, click the button named "Retouch a photo". Run each case in light
and in dark (`browser.newPage({ viewport, colorScheme })`) at 1440x900,
and the site bar case at 1440x600 so the page can scroll. Normalise any
computed colour with a canvas so `oklab()` and `color()` values parse:

```ts
async function rgba(page: Page, selector: string, property: string): Promise<number[]> {
  return page
    .locator(selector)
    .first()
    .evaluate((element, name) => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d')!
      context.fillStyle = getComputedStyle(element).getPropertyValue(name)
      context.fillRect(0, 0, 1, 1)
      return [...context.getImageData(0, 0, 1, 1).data]
    }, property)
}

function contrast(a: number[], b: number[]): number {
  const channel = (value: number) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const luminance = ([r, g, b]: number[]) => 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!)
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high! + 0.05) / (low! + 0.05)
}
```

Cases, each with its assertions:

1. Back is a button with a solid fill: `getByRole('button', { name: 'Back' })`
   exists, its background alpha is 255, and its computed
   `border-top-width` is at least `1px`.
2. Start retouching stays readable while disabled: with nothing chosen,
   the button is disabled, its computed `opacity` is `'1'`, and the
   contrast of its `color` against its `background-color` is at least
   4.5.
3. Start retouching is readable when enabled: after clicking "Use the
   sample photograph" and typing an instruction, the contrast is at least
   4.5.
4. The site bar is clear at the top and glass once scrolled: at
   `scrollY` 0 its background alpha is 0; after
   `window.scrollTo(0, 400)` and one animation frame, its computed
   `backdrop-filter` contains `blur`.
5. The board and card: `.workbench-board` computed `background-image`
   contains `radial-gradient`; `.workbench-card` has background alpha 255
   and a computed `box-shadow` other than `none`.
6. The run guide follows the form: four `.run-guide__step` items reading,
   in order, "Choose a photograph", "Say what you want", "Watch it work,
   and correct it", "Download the layered PSD". At first the first step is
   `current` and the rest `upcoming`. After clicking "Use the sample
   photograph", step 1 is `done` and step 2 `current`. After typing an
   instruction, step 2 is `done` and step 3 `current`.
7. The facts: `.run-facts li` texts are exactly "Three free runs",
   "Uploads deleted within 24 hours", "Your key is never stored".

- [ ] **Step 2: Run it and watch it fail**

Run: `RUN_BROWSER_TESTS=1 bun test test/web/workbench.browser.test.ts`
Expected: FAIL, first on the Back button's border and the missing
`.run-guide`.

- [ ] **Step 3: Implement the site bar and Back**

- Generalise the two `.site-header[data-over='hero']` rules in
  `styles.css` to `.site-header[data-over]`. The scrolled rule becomes
  `background-color: var(--glass-fill); backdrop-filter: var(--glass-blur);
box-shadow: inset 0 -1px 0 var(--rule);`.
- Set `data-over="page"` on the header the workbench renders.
- Replace `button('Back', 'text-button')` with a button of class
  `button back-button` holding an `hgi-stroke hgi-arrow-left-01` icon
  (`aria-hidden`) before the text "Back". Style `.back-button`: 40px
  tall, `background: var(--paper)`, 1px `--color-border-strong` border,
  `--color-bg-subtle` on hover. Its accessible name stays "Back".

- [ ] **Step 4: Implement the buttons, fields and disabled state**

- `button:disabled` loses `opacity`. It becomes
  `background-color: var(--color-bg-disabled);
border-color: var(--color-bg-disabled);
color: var(--color-text-disabled); cursor: not-allowed;`.
- `.button-accent` text is `var(--color-text-on-accent)`.
- `.button`, `.sample-button` and `.example-button` get solid fills
  (`--paper` or `--color-bg-subtle`), and `textarea` and the key input get
  `--color-bg-field`. Focus on a field: `outline: 2px solid var(--ink);`
  with `box-shadow: 0 0 0 4px var(--accent);`.

- [ ] **Step 5: Implement the layout**

- At 1280px and wider, the input view is a 12-column grid with no
  full-height divider: the intro column takes 5 columns and the board 7.
- Intro column, in order: the existing eyebrow, title and description;
  `ol.run-guide` with the four steps above, each an icon square and a
  label, where `done` shows `hgi-tick-02` on the accent square, `current`
  is ink, and `upcoming` is secondary text; `ul.run-facts` with the three
  facts above, each after an `hgi-tick-02` icon.
- Guide state: step 1 is done once a photograph or the sample is chosen,
  step 2 once the instruction has non-blank text; `current` is the first
  step not done. Update it on those input events and on every render, so
  a re-render keeps it.
- `div.workbench-board` fills the right column down to the bottom of the
  page: `background-color: var(--color-bg-subtle);
background-image: radial-gradient(var(--color-pattern-dot) 1px,
transparent 1.5px); background-size: 20px 20px;` with 48px of padding.
- The form sits in `div.workbench-card`: `background: var(--paper)`, 1px
  `--rule` border, `box-shadow: var(--shadow-card)`, 40px padding, at most
  760px wide.
- Before each of the three field labels, a decorative number span
  (`aria-hidden="true"`) reading 01, 02 and 03. The label texts and
  control names do not change.
- The drop zone is a solid `--color-bg-field` tile, at least 180px tall,
  with an `hgi-stroke hgi-upload-01` icon above its text.
- The example prompts wrap as chips sized to their text, 8px apart.
- Start retouching spans the card's width at its foot, 56px tall, with
  an `hgi-stroke hgi-arrow-right-01` icon after the text.
- Keep every string the tests pin, including "Uploads are deleted within
  24 hours." exactly once, inside the file field.

- [ ] **Step 6: Run the tests**

Run: `RUN_BROWSER_TESTS=1 bun test test/web/workbench.browser.test.ts`,
then a Chromium copy of `test/web/application.browser.test.ts` as the
global constraints describe, then the unit and audit tests.
Expected: all PASS.

- [ ] **Step 7: Commit**

1. `fix(web): keep disabled buttons readable` (the `button:disabled`
   and `.button-accent` colours)
2. `feat(web): turn the site bar to glass once the page scrolls`
3. `feat(web): make Back a real button`
4. `feat(web): lay the workbench form on a sketchboard` (layout, guide,
   facts, board, card, fields, chips, test)

## Task 2: Stacked sections

**Files:**

- Create: `src/web/landing/stack.ts`
- Create: `src/web/landing/stack.css`
- Create: `test/web/landing/stack.browser.test.ts`
- Modify: `src/web/landing/index.ts` (import and one call)
- Modify: `src/web/styles.css` (one `@import`)
- Modify only if the open dialog needs it: `src/web/landing/drawer.css`

**Interfaces:**

- Consumes: sections marked `data-section="steps"`, `"switcher"`,
  `"drawer"` and `"glass"`, adjacent in that order inside
  `.landing-body`; `--shadow-sheet`; `--color-border-on-chrome`.
- Produces: `export function mountStack(body: HTMLElement): void`,
  called in `renderLanding` once `body` holds its sections. It wraps
  steps with switcher, and drawer with glass, each pair in
  `div.stack`, and sets `data-stack="pin"` on steps and drawer and
  `data-stack="sheet"` on switcher and glass.

- [ ] **Step 1: Write the failing test**

Create `test/web/landing/stack.browser.test.ts` at 1440x900:

1. Two `.stack` wrappers exist; the first holds steps then switcher, the
   second drawer then glass.
2. The drawer's computed `position` is `sticky` at 1440x900 and is not
   `sticky` at 1279x800.
3. Glass rises over a pinned drawer: scroll so the glass section's top is
   at half the viewport height, wait two animation frames, then the
   drawer's bounding box bottom is within 2px of `innerHeight` (or its top
   is within 2px of 0 when it is shorter than the viewport), and
   `document.elementFromPoint(720, innerHeight * 0.75)` is inside the
   glass section.
4. The same for switcher rising over steps.
5. Scrolling past the second pair releases the drawer: once the glass
   section's bottom is above the viewport top, the drawer's bounding box
   bottom is also above the viewport top.
6. The open dialog is never covered: with glass at half the viewport,
   click "Show the layers"; the element at the centre of `#drawer-sheet`'s
   bounding box is inside `#drawer-sheet`.

- [ ] **Step 2: Run it and watch it fail**

Run: `RUN_BROWSER_TESTS=1 bun test test/web/landing/stack.browser.test.ts`
Expected: FAIL, no `.stack` wrappers.

- [ ] **Step 3: Implement**

`stack.ts`: wrap each pair; for each pin, a `ResizeObserver` on the pin
and a `resize` listener on the window run:

```ts
pin.style.setProperty('--stack-top', `${Math.min(0, window.innerHeight - pin.offsetHeight)}px`)
```

`stack.css`:

```css
@media (min-width: 1280px) {
  [data-stack='pin'] {
    position: sticky;
    top: var(--stack-top, 0px);
  }

  [data-stack='sheet'] {
    position: relative;
    box-shadow:
      var(--shadow-sheet),
      inset 0 1px 0 var(--color-border-on-chrome);
  }

  /* The layer sheet is a dialog inside the pinned drawer; while it is
     open the drawer paints above the section laid over it. */
  .drawer.is-open[data-stack='pin'] {
    z-index: 2;
  }
}

@media (prefers-reduced-motion: reduce) {
  /* Pinning follows the scroll position and adds no motion of its own. */
}
```

Merge any `box-shadow` a sheet section already declares for its top rule
into the sheet rule, so neither is lost.

- [ ] **Step 4: Run the tests**

Run the new test, `test/web/landing/drawer.browser.test.ts`,
`test/web/landing/steps.browser.test.ts`,
`test/web/landing/switcher.browser.test.ts`,
`test/web/footer.browser.test.ts`, and the unit and audit tests.
Expected: all PASS.

- [ ] **Step 5: Commit**

1. `feat(web): stack the grey sections over the ones above`

## Task 3: Hero replay

**Files:**

- Modify: `src/web/landing/hero.ts`
- Modify: `src/web/landing/hero.css`
- Create: `test/web/landing/replay.browser.test.ts`
- Modify only where an existing assertion conflicts:
  `test/web/landing/hero.browser.test.ts`

**Interfaces:**

- Consumes: `.hero__screen` with its `img.hero__photo`; the existing
  `LOOP_URL` branch stays untouched.
- Produces: `div.hero__replay` (`aria-hidden="true"`) holding
  `.hero__replay-prompt`, `.hero__replay-progress`,
  `.hero__replay-layers` and `.hero__replay-caption`, and a
  `button.hero__replay-toggle` beside it.

- [ ] **Step 1: Write the failing test**

Create `test/web/landing/replay.browser.test.ts` at 1440x900, with the
clock installed before navigation:

1. After `runFor(2000)`, `.hero__replay-prompt .hero__replay-text` is a
   non-empty prefix of the instruction below.
2. After `runFor(6000)` more, `.hero__replay-step` matches
   `/^Step (\d+) of 13$/`, and the number rises across two later reads.
3. After a full loop (`runFor(12000)` from the start), four
   `.hero__replay-layers li` exist whose texts, top to bottom, are
   "Darken corners softly", "Warm colours", "Brighten photograph",
   "Original photograph".
4. The toggle pauses: click `button.hero__replay-toggle`; its
   `aria-label` becomes "Play the replay"; the step text is unchanged
   after `runFor(3000)`. Click again; it is "Pause the replay".
5. Under reduced motion: at once, the step reads "Step 13 of 13", four
   layers show, the full instruction shows, and the toggle is hidden.
6. Each replay panel's computed `backdrop-filter` contains `blur`.

- [ ] **Step 2: Run it and watch it fail**

Run: `RUN_BROWSER_TESTS=1 bun test test/web/landing/replay.browser.test.ts`
Expected: FAIL, no `.hero__replay`.

- [ ] **Step 3: Implement**

Data, verbatim, with its source comment:

```ts
// The September 15 computer-tool run on the sample photograph, whose last
// frame the window shows (docs/evidence/driving-mechanism): the
// instruction harness.ts sent, its step count and its exported layers,
// bottom of the stack first. The run recorded no narration and took no
// correction, so the replay shows neither.
const REPLAY_INSTRUCTION = [
  'Make three edits to this photograph, each on its own layer with a name that says what it does:',
  '1. Brighten it with a Levels, Curves, or Brightness/Contrast adjustment layer.',
  '2. Warm its colours with a Photo Filter or Color Balance adjustment layer.',
  '3. Darken the corners into a soft vignette on a new layer.'
].join('\n')
const REPLAY_STEPS = 13
const REPLAY_LAYERS = ['Original photograph', 'Brighten photograph', 'Warm colours', 'Darken corners softly']
```

- One loop is 12 seconds, computed from elapsed time by a single
  `render(elapsed)` function: 0 to 3.5s types the instruction; 3.5 to 9s
  counts "Step 1 of 13" to "Step 13 of 13" and fills the bar through
  `--replay-progress` as a `scale` of 0 to 1; 9 to 11s adds the layers one
  by one, the newest at the top of the list as a layers panel shows it;
  11 to 12s holds; then it starts again.
- A `requestAnimationFrame` loop runs it only while the hero is in view
  (an `IntersectionObserver`) and the tab is visible, and pausing freezes
  the elapsed time.
- The panels are glass: `background-color: var(--glass-fill-chrome);
backdrop-filter: var(--glass-blur);` with `--color-text-on-chrome`
  text, laid over the lower part of the screenshot so the photograph's
  centre stays clear. Caption: "A 1 min 42 s run, shown faster".
- The toggle copies `.hero__loop-toggle`'s solid look: `hgi-pause` with
  "Pause the replay", or `hgi-play` with "Play the replay", as both its
  text and its `aria-label`.
- Under reduced motion, render the end state once and hide the toggle.

- [ ] **Step 4: Run the tests**

Run the new test, `test/web/landing/hero.browser.test.ts`, and the unit
and audit tests. Expected: all PASS.

- [ ] **Step 5: Commit**

1. `feat(web): replay the sample run in the hero window`

## Task 4: Run log playback and switcher demo

**Files:**

- Modify: `src/web/landing/drawer.ts`
- Modify: `src/web/landing/drawer.css`
- Modify: `src/web/landing/switcher.ts`
- Modify: `src/web/landing/switcher.css`
- Create: `test/web/landing/playback.browser.test.ts`
- Modify only where an existing assertion conflicts:
  `test/web/landing/drawer.browser.test.ts`,
  `test/web/landing/switcher.browser.test.ts`

**Interfaces:**

- Consumes: the existing drawer log rows (`.drawer__step`) and stats
  (`.drawer__stat`, `.drawer__stat-value`), and the switcher's `visible`
  record, `mode` and `paint()`.
- Produces: `.drawer__log[data-playback='pending'|'run'|'done']`; a
  `button.switcher__demo-toggle`; `data-demo='active'` on the layer row
  the demo is changing.

- [ ] **Step 1: Write the failing test**

Create `test/web/landing/playback.browser.test.ts` at 1440x900 with the
clock installed:

1. The log waits for the reader: before scrolling, every `.drawer__step`
   has computed `opacity` `0`. Scroll `.drawer__log` into view,
   `runFor(4500)`: every row has `opacity` `1`, and the stat values read
   "16", "3 min 13 s", "194 ms" and "4".
2. Assistive technology gets the whole log from the start: before
   scrolling, `.drawer__log`'s `innerText`-independent accessible text,
   read with `page.locator('.drawer__log').ariaSnapshot()`, contains the
   correction sentence and all seven step sentences.
3. Under reduced motion the rows show and the stats read their values at
   once.
4. The switcher demonstrates itself: scroll `.switcher` into view;
   after `runFor(2400)` the `corners` row has `data-hidden="true"`; after
   another `runFor(2400)` it is `false`; after another the `warm` row is
   hidden.
5. The demo never announces: the text of `.switcher__hint` is the same
   before the demo and at every step through a full cycle, including the
   Flat JPEG step.
6. The toggle pauses: click `button.switcher__demo-toggle`; after
   `runFor(7200)` no row's `data-hidden` changes.
7. Touching the switcher ends the demo: click the eye button named "Show
   Warm colours"; the toggle is gone, the `warm` row is hidden, every other
   row is visible, the mode is Layered PSD, and after `runFor(7200)`
   nothing changes.
8. Under reduced motion there is no toggle and no row changes.

- [ ] **Step 2: Run it and watch it fail**

Run: `RUN_BROWSER_TESTS=1 bun test test/web/landing/playback.browser.test.ts`
Expected: FAIL on the first case.

- [ ] **Step 3: Implement the log playback**

- When motion is allowed, `renderDrawer` sets
  `data-playback="pending"` on `.drawer__log`; CSS hides its rows with
  `opacity: 0; translate: 0 8px`. Never `display: none` or `visibility`,
  which would hide them from assistive technology too.
- An `IntersectionObserver` at a 0.3 threshold starts it once and
  disconnects: `data-playback="run"`, rows show one after another 300ms
  apart with `--duration-enter` and `--ease-reveal`, the correction row
  last of its group with its meta line 400ms after the row, and the stats
  count up over 1200ms, all done by 4.5s, then `data-playback="done"`.
- Counting: each `dd` keeps its final value in a visually hidden span and
  shows the counting number in an `aria-hidden="true"` span. "3 min 13 s"
  counts seconds from 0 to 193 and prints `${minutes} min ${seconds} s`.
- Under reduced motion or without `IntersectionObserver`, nothing is
  pending.

- [ ] **Step 4: Implement the switcher demo**

- While the section is at least half in view, the demo is not paused and
  it has not ended, every 2400ms it takes the next step of this cycle:
  hide corners, show corners, hide warm, show warm, hide brighten, show
  brighten, hide original, show original, Flat JPEG, Layered PSD. The row
  it changes carries `data-demo="active"` until the next step, drawn as an
  accent inset rule on its left edge.
- A demo step calls `paint()` without writing the hint, so the live region
  never speaks for the demo.
- `button.switcher__demo-toggle` sits beside the mode buttons with a solid
  fill: `hgi-pause` and "Pause the demo", or `hgi-play` and "Play the
  demo", as its text and its `aria-label`.
- `pointerdown`, `keydown` or `focusin` inside the section, on anything
  but the toggle, ends the demo for good: restore every layer to visible
  and the mode to Layered PSD without writing the hint, clear
  `data-demo`, and remove the toggle. The visitor's click then acts on
  that restored state.
- Under reduced motion there is no demo and no toggle.
- Give `.switcher__mode`, `.switcher__lock` and `.switcher__eye` a solid
  `--color-bg-band-panel` fill, and `.drawer__open` and `.drawer__close`
  a solid fill, while you are in these files.

- [ ] **Step 5: Run the tests**

Run the new test, `test/web/landing/drawer.browser.test.ts`,
`test/web/landing/switcher.browser.test.ts`, and the unit and audit tests.
Expected: all PASS.

- [ ] **Step 6: Commit**

1. `feat(web): play the run log as it scrolls into view`
2. `feat(web): demonstrate the layer switcher until it is used`
3. `style(web): give the switcher and drawer controls solid fills`

## Task 5: Questions section

**Files:**

- Create: `src/web/landing/faq.ts`
- Create: `src/web/landing/faq.css`
- Create: `test/web/landing/faq.browser.test.ts`
- Modify: `src/web/landing/index.ts` (import, the body list, the nav)
- Modify: `src/web/styles.css` (one `@import`)

**Interfaces:**

- Consumes: nothing from other tasks.
- Produces: `export function renderFaq(): HTMLElement`, returning
  `section.faq#faq[data-section="faq"]` with `p.faq__eyebrow`,
  `h2.faq__title#faq-title`, `div.faq__grid` and ten
  `details.faq__tile` elements, each holding `summary.faq__question` and
  `p.faq__answer`. Task 6 reveals and lifts `.faq__eyebrow`,
  `.faq__title` and `.faq__tile` by these names.

- [ ] **Step 1: Write the failing test**

Create `test/web/landing/faq.browser.test.ts` at 1440x900 and 390x844:

1. Order: the FAQ section follows the glass section and precedes the
   waitlist section in the DOM.
2. The nav holds a link named "FAQ" to `#faq`, directly before "Updates".
3. The eyebrow is "Questions" and the title "Before your first run."
4. Ten tiles, whose questions are exactly the ten in the spec, in order.
5. Questions 1 and 4 are open at load and the others closed; clicking a
   closed question opens it.
6. At 1440x900, the rendered widths follow the spans 6, 3, 3, 6, 3, 3,
   4, 4, 4 and 12 of a 12-column grid, within 2px of
   `(gridWidth - 11 * gap) / 12 * span + (span - 1) * gap`.
7. At 390x844, every tile has the grid's full width.
8. Each tile's background is solid: its computed `background-color` has
   no alpha below 1.

- [ ] **Step 2: Run it and watch it fail**

Run: `RUN_BROWSER_TESTS=1 bun test test/web/landing/faq.browser.test.ts`
Expected: FAIL, no `#faq`.

- [ ] **Step 3: Implement**

- Build the copy from a constant, verbatim from the spec, each question
  with its answer and span:

```ts
const QUESTIONS = [
  {
    question: 'What do I get back?',
    answer:
      'A layered PSD. Every edit sits on its own layer, named for what it does, and its masks and adjustment layers stay editable. A flattened PNG comes with it to preview.',
    span: 6,
    open: true
  },
  {
    question: 'Which apps open the file?',
    answer:
      'It is a standard PSD, made to open in Photoshop, Affinity Photo and GIMP, or back in Photopea, where it was made.',
    span: 3
  },
  {
    question: 'How long does a run take?',
    answer: 'A few minutes. The run in the log above took 3 min 13 s from start to PSD. No run goes past 15 minutes.',
    span: 3
  },
  {
    question: 'Can I correct it while it works?',
    answer:
      'Yes. Type a correction at any point and it is acknowledged within three seconds. It shapes the next actions and nothing restarts. It cannot undo a step already taken, but it can repair one.',
    span: 6,
    open: true
  },
  {
    question: 'What kind of retouching does it do?',
    answer:
      'The adjustments a retoucher makes in a real editor, such as exposure, colour, warmth and vignettes, each on its own layer. Describe them in plain words. It works on the photograph you upload and never generates a new image.',
    span: 3
  },
  { question: 'Do I need an account?', answer: 'No. You get three free runs without signing up.', span: 3 },
  {
    question: 'What happens after the free runs?',
    answer: 'Add your own OpenAI API key and carry on. It is used for that run only, and never stored or logged.',
    span: 4
  },
  {
    question: 'What happens to my photographs?',
    answer: 'Uploads are deleted within 24 hours, and download links expire after one hour.',
    span: 4
  },
  {
    question: 'Which photographs can I upload?',
    answer: 'JPEG or PNG, up to 20 MB and 6000 px on the long edge.',
    span: 4
  },
  {
    question: 'What if a run stops early?',
    answer:
      'You still get a layered file with everything done up to that point, marked as incomplete. A run you cancel ends the same way.',
    span: 12
  }
]
```

- Set each tile's span with `tile.style.setProperty('--span', String(span))`
  and `grid-column: span var(--span)` at 1280px and wider.
- `summary`: `list-style: none`, no marker, the question text, then an
  `hgi-stroke hgi-plus-sign` icon and an `hgi-stroke hgi-minus-sign` icon;
  CSS shows the plus when closed and the minus when open. A visible focus
  outline: `2px solid var(--ink)`, offset 2px.
- Section: paper ground, padding and eyebrow and title styles copied from
  `steps.css`. Title `--text-display-section`. Open 6-column tiles set
  their question in `--text-display-h2`; the others in `--text-ui-lede` at
  weight 600. Answers `--text-ui-body` in `--color-text-secondary`.
- Tiles: `background: var(--color-bg-subtle); border: 1px solid
var(--rule); padding: 28px;`. Leave hover effects to Task 6.
- An opening answer enters with a one-shot keyframe from `opacity: 0` and
  `translate: 0 8px` over `--duration-enter`; none under reduced motion.
- `index.ts`: add `renderFaq()` after `renderGlass()` in the body, and
  `{ href: '#faq', label: 'FAQ' }` before Updates in `NAV`.

- [ ] **Step 4: Run the tests**

Run the new test, `test/web/chrome.browser.test.ts` (the nav), and the
unit and audit tests. Expected: all PASS.

- [ ] **Step 5: Commit**

1. `feat(web): answer common questions on the landing`

## Task 6: Scroll reveals and pointer response

**Files:**

- Create: `src/web/landing/reveal.ts`
- Create: `src/web/landing/reveal.css`
- Create: `src/web/landing/pointer.ts`
- Create: `src/web/landing/pointer.css`
- Create: `test/web/landing/motion.browser.test.ts`
- Modify: `src/web/landing/index.ts` (imports and two calls)
- Modify: `src/web/styles.css` (two `@import` lines)

**Interfaces:**

- Consumes: the class names below. `.faq__*` comes from Task 5 and does
  not exist in your worktree; `querySelectorAll` simply finds none there.
- Produces: `export function mountReveal(root: ParentNode): void` and
  `export function mountPointer(shell: HTMLElement): void`, both called in
  `renderLanding`, `mountReveal` inside a `requestAnimationFrame` so the
  landing is in the document when it measures.

- [ ] **Step 1: Write the failing test**

Create `test/web/landing/motion.browser.test.ts` at 1440x900:

1. A target below the fold waits: `.glass__title` has
   `data-reveal="pending"` and computed `opacity` `0`. After
   `scrollIntoViewIfNeeded()` and 1500ms it has opacity `1` and
   `data-reveal="shown"`.
2. Under reduced motion, no element has `data-reveal="pending"` and
   `.glass__title` has opacity `1` at once.
3. The spotlight follows the pointer: `page.mouse.move(400, 400)`; after
   one animation frame `.hero-shell` has `data-spot="on"` and its
   `--spot-x` reads `400px`. Moving the mouse to the ticker area and out
   of the shell removes `data-spot`.
4. A card lifts under the pointer: scroll a `.steps__card` into view,
   wait for it to show, hover it, wait 300ms; its computed `translate` is
   `0px -4px`.
5. Under reduced motion, hovering the card leaves `translate` at `none`.

- [ ] **Step 2: Run it and watch it fail**

Run: `RUN_BROWSER_TESTS=1 bun test test/web/landing/motion.browser.test.ts`
Expected: FAIL on the first case.

- [ ] **Step 3: Implement the reveals**

Targets, as one selector list:

```ts
const TARGETS = [
  '.steps__eyebrow, .steps__title, .steps__body, .steps__card',
  '.switcher__eyebrow, .switcher__title, .switcher__body',
  '.drawer__eyebrow, .drawer__title, .drawer__body, .drawer__stat',
  '.glass__eyebrow, .glass__title, .glass__body, .glass__fact',
  '.faq__eyebrow, .faq__title, .faq__tile',
  '.waitlist__eyebrow, .waitlist__title, .waitlist__body, .waitlist__form'
].join(', ')
```

- Only when motion is allowed and `IntersectionObserver` exists: set
  `data-reveal="on"` on the root. A target whose top is already above the
  viewport's bottom gets `data-reveal="shown"`; every other target gets
  `data-reveal="pending"` and is observed at a 0.15 threshold.
- On entry: `data-reveal="in"`, with `--reveal-i` set to its index among
  the targets of the same `[data-section]` entering in that callback;
  stop observing it; on its `transitionend` for `opacity`, set
  `data-reveal="shown"`.

```css
:root[data-reveal='on'] [data-reveal='pending'] {
  opacity: 0;
  translate: 0 12px;
  filter: blur(4px);
}

:root[data-reveal='on'] [data-reveal='in'] {
  transition:
    opacity var(--duration-enter) var(--ease-reveal),
    translate var(--duration-enter) var(--ease-reveal),
    filter var(--duration-enter) var(--ease-reveal);
  transition-delay: calc(var(--reveal-i, 0) * var(--stagger-block));
}

@media (prefers-reduced-motion: reduce) {
  [data-reveal] {
    opacity: 1;
    translate: none;
    filter: none;
    transition: none;
  }
}
```

- [ ] **Step 4: Implement the pointer response**

- `mountPointer` does nothing unless
  `(hover: hover) and (pointer: fine)` matches and reduced motion does
  not. `pointermove` on the shell writes `--spot-x` and `--spot-y` in px
  relative to the shell, at most once per animation frame, and sets
  `data-spot="on"`; `pointerleave` removes it.

```css
@media (hover: hover) and (pointer: fine) {
  .hero-shell::before {
    position: absolute;
    z-index: -1;
    inset: 0;
    background-image:
      linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px);
    background-position: -1px -1px;
    background-size: 64px 64px;
    content: '';
    mask-image: radial-gradient(circle 240px at var(--spot-x, 50%) var(--spot-y, 50%), var(--ink), transparent);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--duration-swap) var(--ease-settle);
  }

  .hero-shell[data-spot='on']::before {
    opacity: 0.35;
  }

  .steps__card,
  .drawer__stat,
  .glass__fact,
  .faq__tile {
    transition: translate var(--duration-swap) var(--ease-settle);
  }

  .steps__card:hover,
  .drawer__stat:hover,
  .glass__fact:hover,
  .faq__tile:hover {
    box-shadow: var(--shadow-lift);
    translate: 0 -4px;
  }
}
```

- Arrows: in the same media query, an `hgi-arrow-right-01` inside a
  hovered call to action moves `translate: 4px 0`, and an
  `hgi-arrow-down-01` moves `translate: 0 4px`, transitioning `translate`
  over `--duration-swap`. Find the calls to action by searching the landing
  modules for those icon names.
- Under reduced motion: no spotlight, no lift, no arrow movement.
- The spotlight rule's selector contains `.hero-shell`, which is why its
  gradients pass `test/web/dom.test.ts`. `.hero-shell` is sticky, so it
  already contains the absolutely positioned layer.

- [ ] **Step 5: Run the tests**

Run the new test, `test/web/landing/hero.browser.test.ts`,
`test/web/landing/steps.browser.test.ts`, and the unit and audit tests.
Expected: all PASS.

- [ ] **Step 6: Commit**

1. `feat(web): reveal landing content as it scrolls into view`
2. `feat(web): respond to the pointer on the landing`

## Task 7: Solid-surface sweep

Runs on `feat/landing-polish` after Task 9 has integrated wave 1.

**Files:**

- Create: `test/web/surfaces.browser.test.ts`
- Modify: any landing CSS file and `src/web/styles.css`, only to change a
  background, a border colour or a `backdrop-filter`

**Interfaces:**

- Consumes: everything wave 1 produced.
- Produces: no new names.

- [ ] **Step 1: Write the failing test**

Load the landing, then the workbench, in light and dark at 1440x900.
Scroll the landing to its end in 400px steps, waiting 800ms each, so
reveals finish and every section renders. Then, in the page, collect:

```ts
const candidates = [...document.querySelectorAll<HTMLElement>('button, input, textarea, select, a, [class]')].filter(
  (element) => {
    const style = getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    const box = element.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) return false
    const control = ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
    const buttonLink =
      element.tagName === 'A' && parseFloat(style.paddingLeft) >= 8 && parseFloat(style.borderTopWidth) > 0
    const boxed = ['Top', 'Right', 'Bottom', 'Left'].every(
      (side) => parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0
    )
    return control || buttonLink || boxed
  }
)
```

For each, normalise `background-color` through a 1x1 canvas as Task 1
does, and fail with the element's tag, classes and text when its alpha is
below 255 and its computed `backdrop-filter` is `none`. Skip elements
inside `.switcher__stage` and inside `canvas` or `svg`, and skip visually
hidden elements (`clip` or `clip-path` hiding them, or 1px boxes).

- [ ] **Step 2: Run it and watch it fail**

Run: `RUN_BROWSER_TESTS=1 bun test test/web/surfaces.browser.test.ts`
Expected: FAIL, listing the offenders, `.hero__updates` among them.

- [ ] **Step 3: Fix every offender**

A solid token fill that matches the element's ground, or glass where the
spec allows it: the hero chips and Back to top become glass
(`--glass-fill` with `--glass-blur`). Change nothing but fills, border
colours and `backdrop-filter`.

- [ ] **Step 4: Run the tests**

Run the new test, every landing browser test one by one, the workbench
test, and the unit and audit tests. Expected: all PASS.

- [ ] **Step 5: Commit**

1. `style(web): give every remaining surface a solid or glass fill`
2. `test(web): check every surface is solid or glass`

## Task 8: DESIGN.md

Runs on `feat/landing-polish` after Task 9 has integrated wave 1.

**Files:**

- Modify: `docs/DESIGN.md`

- [ ] **Step 1: Read what shipped**

Read the spec, then `git log --oneline main..HEAD` and the diff of every
commit, so the document describes what was built rather than what was
planned.

- [ ] **Step 2: Update the document**

- Colour: the surface rule (solid or glass, and where glass is allowed),
  the new tokens and what each is for.
- Motion rules: scroll reveals; the two looping exceptions beside the
  ticker, the hero replay and the switcher demo, with their pause
  controls; the run log playback; pointer response and its media query.
- Page layout: the stacked pairs, the `.stack` wrapper and when pinning
  applies; the questions section and its place in the page and the nav.
- A new section for the workbench input view: the glass site bar, Back,
  the two columns, the run guide, the board and the card.
- Do and do not, and Acceptance: lines for each of the above.
- Keep the Markdown style guide: lines at most 80 characters outside
  tables, headings, links and code; sentence-case headings; no em or en
  dashes in new text.

- [ ] **Step 3: Check and commit**

Run: `bunx prettier --check docs/DESIGN.md`, and check line lengths with
`awk 'length > 80 && !/^\|/ && !/^#/ && !/\]\(/' docs/DESIGN.md`.
Expected: prettier passes, and the awk command prints only lines that
were already long before your change.

1. `docs(design): describe the landing polish`

## Task 9: Integration

The coordinator's task, after each wave.

- [ ] **Step 1: Review each worker**

For each worktree: grep its log for `rejected a tool call`, read
`git log feat/landing-polish..HEAD` and every diff, and run its task's
tests again. Send a task back with the defects named, or fix a small one
directly.

- [ ] **Step 2: Integrate wave 1**

Cherry-pick onto `feat/landing-polish` in this order: Task 1, Task 2,
Task 5, Task 6, Task 3, Task 4. Resolve the expected overlaps in
`src/web/landing/index.ts` and the `@import` lines of `src/web/styles.css`
by keeping both sides.

- [ ] **Step 3: Update the markup checks**

Add `landing/stack.css`, `landing/faq.css`, `landing/reveal.css` and
`landing/pointer.css` to `cssSource`, and `landing/stack.ts`,
`landing/faq.ts`, `landing/reveal.ts` and `landing/pointer.ts` to
`appSource`, in `test/web/dom.test.ts`. Run
`bun test test/web/dom.test.ts`. Commit
`test(web): read the new landing modules in the markup checks`.

- [ ] **Step 4: Verify wave 1**

Run `bun run typecheck`, `bun test`, `bun run lint`, and every browser
test under `test/web/` one file at a time. Then dispatch wave 2 from the
integrated branch and integrate it the same way.

- [ ] **Step 5: Verify the whole**

Screenshots at 1440x900 and 390x844, light and dark: the hero with its
replay, both stacked pairs mid-overlap, the questions grid, and the
workbench. Look at each. Run `bun run graph` and commit
`chore(graph): refresh the knowledge graph` if it changed tracked files.

- [ ] **Step 6: Open the pull request**

Push the branch, open the pull request with a Conventional Commits title,
and watch the five required checks.
