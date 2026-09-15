# TRD: Layerhand

How Layerhand is built, and — more importantly for a six-day project
with three people — how it is cut into pieces that three people can
build at the same time. Requirements cited as `FR-n` and `NFR-n` come
from the [PRD](PRD.md).

Contents:

1.  [Shape of the system](#shape-of-the-system)
1.  [The three contracts](#the-three-contracts)
1.  [Fakes first](#fakes-first)
1.  [The agent loop](#the-agent-loop)
1.  [Steering](#steering)
1.  [The editor adapter](#the-editor-adapter)
1.  [The browser runtime](#the-browser-runtime)
1.  [The web application](#the-web-application)
1.  [Cost control](#cost-control)
1.  [Security](#security)
1.  [Observability](#observability)
1.  [Testing](#testing)
1.  [Deployment](#deployment)
1.  [Repository layout](#repository-layout)
1.  [Decisions deferred to spikes](#decisions-deferred-to-spikes)
1.  [See also](#see-also)

## Shape of the system

One long-lived server process. Not serverless: a run is a stateful
conversation lasting minutes, holding a browser session and streaming
frames, and it cannot be resumed from nothing on a cold invocation.

```text
  Browser                  Server (one process)            External
  ────────                 ────────────────────            ────────
  upload + prompt  ──POST─▶ run registry
  live view        ◀──SSE── orchestrator ──────────────────▶ OpenAI
  correction       ──POST─▶     │        Responses API, gpt-6-astra
  download         ◀───────  editor adapter
                                │
                                └── browser session ───────▶ hosted Chrome
                                    (CDP)                    running the editor
```

The orchestrator is the only component that talks to the model. The
editor adapter is the only component that knows what editor we drive.
Neither fact leaks past those boundaries, because both are the parts
most likely to change under us this week.

## The three contracts

These exist so three people can start on day 0 without waiting for each
other. They are written down before anything is implemented, and
changing one is a conversation, not a commit.

### Contract 1: editor session

Owned by the editor and browser streams; consumed by the agent loop.

```ts
interface EditorSession {
  readonly id: string
  readonly viewport: Viewport

  open(image: Uint8Array, filename: string): Promise<void>
  screenshot(): Promise<Uint8Array> // PNG of the viewport
  act(actions: ComputerAction[]): Promise<void> // batched, in order

  layers(): Promise<LayerInfo[]>
  exportPsd(): Promise<Uint8Array>
  exportPreview(): Promise<Uint8Array> // flattened PNG, FR-28
  close(): Promise<void>
}

// Mirrors the `computer` tool's action schema exactly, so that a
// computer_call can be passed through without translation.
type Pt = { x: number; y: number }
type ComputerAction =
  | ({ type: 'click'; button: Button; keys?: string[] } & Pt)
  | ({ type: 'double_click'; keys?: string[] } & Pt)
  | ({ type: 'move'; keys?: string[] } & Pt)
  | { type: 'drag'; path: Pt[]; keys?: string[] }
  | ({ type: 'scroll'; scroll_x: number; scroll_y: number; keys?: string[] } & Pt)
  | { type: 'keypress'; keys: string[] }
  | { type: 'type'; text: string }
  | { type: 'wait' }
  | { type: 'screenshot' }

type Button = 'left' | 'right' | 'wheel' | 'back' | 'forward'

interface Viewport {
  width: number
  height: number
}

interface LayerInfo {
  name: string
  kind: 'raster' | 'mask' | 'adjustment' | 'group'
  visible: boolean
}
```

The boundary and its fixture-backed fake are explained in
[ADR-0001](/docs/decisions/0001-editor-session-contract.md).

### Contract 2: run orchestration

Owned by the agent stream; consumed by the web application.

```ts
interface RunRequest {
  image: Uint8Array
  filename: string
  instruction: string // FR-2
  stepCap: number // FR-12
  budgetUsd: number // NFR-2
  apiKey?: string // FR-36, never persisted
}

type RunEvent =
  | { type: 'started'; runId: string; viewport: Viewport }
  | { type: 'step'; n: number; cap: number; narration: string } // FR-11
  | { type: 'frame'; pngUrl: string } // FR-10
  | { type: 'correction_ack'; text: string } // FR-21
  | { type: 'cost'; usd: number; tokensIn: number; tokensOut: number }
  | { type: 'done'; result: RunResult }
  | { type: 'error'; reason: string; recoverable: boolean }

interface RunResult {
  psdUrl: string
  previewUrl: string
  layers: LayerInfo[]
  complete: boolean // false if the step cap ended it, FR-12
}

interface RunHandle {
  events: AsyncIterable<RunEvent>
  steer(text: string): Promise<void> // FR-20
  cancel(): Promise<void> // FR-13
}
```

The types leave some behaviour open. The contract tests in
`src/agent/contract-tests.ts` pin it, for the fake and the real loop
alike:

- A run carries on whether or not anyone reads `events`. Each iteration
  replays the run from its first event and then follows it live, so a
  reload can simply subscribe again (FR-14).
- `cost` carries the run's totals so far, and they never fall (FR-15).
- A run ends exactly once, with `done` or with an `error` whose
  `recoverable` is false, and nothing follows. A recoverable error is
  reported and the run carries on.
- `complete` is false whenever the run stopped before the agent
  finished: at the step cap, at the spend cap, or on cancel. The result
  still carries the layers made so far (FR-12, FR-13).
- A correction is acknowledged within three seconds (FR-21). Once the
  run has ended, `steer()` rejects and `cancel()` changes nothing.

### Contract 3: the HTTP surface

Owned by the web stream.

| Method | Path                   | Purpose                       |
| ------ | ---------------------- | ----------------------------- |
| `POST` | `/api/runs`            | Start a run, returns `runId`  |
| `GET`  | `/api/runs/:id/events` | Server-sent `RunEvent` stream |
| `POST` | `/api/runs/:id/steer`  | Send a correction             |
| `POST` | `/api/runs/:id/cancel` | Stop, keep the partial result |
| `GET`  | `/api/runs/:id`        | Current state, for reconnect  |
| `POST` | `/api/waitlist`        | Email capture (FR-31)         |

Server-sent events rather than WebSockets for the browser leg: the
stream is one-directional, corrections go over a normal `POST`, and SSE
reconnects by itself, which is most of [FR-14](PRD.md#the-run).

## Fakes first

The first thing each stream produces is a fake of its own contract, not
an implementation. By the end of day 0 all three fakes exist and the
whole system runs end to end on them.

1.  **`FakeEditorSession`** replays a recorded set of screenshots and
    writes a hand-made `.psd`. The agent stream develops against it.
1.  **`fakeRun()`** emits a scripted `RunEvent` sequence on a timer.
    The web stream builds every screen against it, including failure,
    cap, and cancel.
1.  **A stub HTTP server** serving Contract 3 from `fakeRun`.

Nobody is blocked, nothing is mocked twice, and on the day a real
implementation lands it is a one-line swap. This is the single decision
that makes three-way parallelism possible on this timescale.

## The agent loop

Model `gpt-6-astra` on the **Responses API**. Not Chat Completions,
which does not support function calling with Astra at all.

### How the editor is actually driven

Two candidate mechanisms, and this is the first thing to settle because
everything else hangs off it.

1.  **The `computer` tool.** The GA tool definition is exactly
    `{ "type": "computer" }` — no `display_width`, no `display_height`,
    no `environment`. Those fields belong to the superseded
    `computer_use_preview` tool. The model returns a `computer_call`
    carrying an ordered **`actions[]` array**, we execute them, and we
    reply with a `computer_call_output` holding the new screenshot.
1.  **Code execution.** A plain function tool taking a `code` string,
    which we run against a persistent Playwright session. **OpenAI
    recommends this one for Astra**: the computer-use guide says the
    `computer` tool "remains supported as an alternative," and every
    computer-tool example in it is pinned to the previous-generation
    model rather than to Astra.

We plan on code execution and keep the `computer` tool as the fallback
— the reverse of what the ideation assumed. It is likely to be more
reliable and it is the documented recommendation, and it does not
weaken the premise: the editor still has no usable API, and the
competence being exercised is still holding a forty-step GUI task
together. [Spike A0](#decisions-deferred-to-spikes) picks one on day 0
by running both against the same three-edit sequence.

Contract 1 is expressed in the `computer` tool's action vocabulary
either way, because it is a perfectly good description of "what you can
do to a browser" and it keeps the fallback a swap rather than a
rewrite.

### The loop

1.  Send the instruction, the screenshot history, and the step budget.
1.  Receive actions.
1.  Execute them through `EditorSession.act`.
1.  Screenshot, append, repeat until no more actions come back.

Four things around it that are not optional:

- **A step cap** (FR-12), checked before each model call. Hitting it
  ends the run cleanly with `complete: false` and a real export.
- **A spend cap** (NFR-2), accumulated from `usage` on each response
  and checked at the same point.
- **Narration** (FR-11), produced by the model alongside its actions,
  not reverse-engineered from coordinates.
- **An explicit `reasoning.effort`.** Astra's default is undocumented,
  and `none` is not merely discouraged — it returns HTTP 400. We run
  the loop at `low` and raise to `high` for the planning step via a
  `configuration_update` input item, which changes effort without
  disturbing the cached prefix. Adjacent `configuration_update` items
  are rejected, and it cannot be combined with automatic truncation.

`runAgent()` in `src/agent/loop.ts` is this loop. It reaches the model
through an `AgentModel` port, one call per step. Each call takes the
latest screenshot and any corrections sent since the previous call, and
returns narration, actions, token usage, and whether the edit is done. A
turn that is not done is a step even without actions, so a model that
changes the editor by running code fits the port as well as one that
returns `computer` actions. The Responses API adapter plugs into that
port; until it exists, the loop runs against `FakeEditorSession` and a
scripted model. How the loop applies the rules above:

- Both caps come from the `RunRequest` and are checked before every call.
  The step cap counts model calls. The spend cap stops the run when the
  next call could pass `budgetUsd`, pricing that call as the last call's
  input, grown by as much as the last call grew it and none of it cached,
  plus the last call's output. A run can still pass the cap if its output
  jumps or its history grows faster than before, and the first call has
  nothing to estimate from.
- Uncached input is priced as a cache write, at $12.50 per million rather
  than $10, so the running cost errs high.
- A step's narration is trimmed and cut to eighty characters. A step
  without one stops the run before its actions are carried out, with a
  recoverable error that says why.
- Corrections are refused once no further call can carry one. One already
  acknowledged by then is reported as a recoverable error rather than
  dropped.
- `cancel()` resolves at once. It abandons the model call in flight, even
  one that ignores the abort signal, but an editor call that hangs still
  waits for the [fifteen-minute ceiling](#one-ceiling-fifteen-minutes).
- A finished edit, a cap, a cancel, or a missing narration exports the
  file and then closes the session. A failure only closes it: contract 2
  ends a failed run with an error event that carries no result, so the
  best-effort export that [Disposal](#disposal) asks of the error path
  waits on a contract change. A failure's reason is fixed, because a
  provider's error message can quote a key.
- Each step's screenshot is also published as the page's frame. That is
  one frame per step, so the frame pump FR-10 needs is still owed.

### Screenshots

Capture at **1440x900** and send with `detail: "original"`. The
integration guide explicitly warns against `high` and `low` detail for
computer use, and names 1440x900 and 1600x900 as the resolutions that
perform well. Any downscaling obliges us to remap the model's
coordinates back ourselves, which is a bug generator; we do not
downscale.

Astra prices images by patch: `ceil(w/32) x ceil(h/32)`, times 1.2. A
1440x900 frame is therefore about **1,570 tokens**.

### Prompting

Astra is documented as stopping early and asking rather than assuming —
the guidance calls it "more tentative about when to stop." An
unattended forty-step retouch is exactly the shape of task that fails
on. The system prompt states that the run is unattended, that the task
includes iterating until the edit is done, and that it should carry the
task to completion rather than return for review. Conversely, Astra is
documented as over-obeying instruction files, so the prompt carries no
decorative prohibitions: anything we write will be followed literally.

The user's instruction is untrusted input and is passed as a separate
user message, never concatenated into the system prompt.

## Steering

Native steering is real, and it is **Astra-only** — the previous
generation does not support it. That makes it genuine model leverage
rather than a feature of our loop, which matters because it is the beat
the entire demo is built around.

The mechanism: one persistent WebSocket to the Responses API. After
`response.created`, send

```json
{
  "type": "response.steer",
  "previous_response_id": "resp_1",
  "input": "keep the shadow"
}
```

and wait for `response.steer.accepted`. The event accepts those three
fields and nothing else. The server finishes the output item in flight
and any hosted tool work already started, then continues under the new
instruction; the interrupted response ends `response.incomplete` with
`incomplete_details.reason: "steered"`. Do **not** send a fresh
`response.create` — keep reading events from the same connection.

Four constraints that shape the product:

1.  Steering does not undo actions already taken. "Keep the shadow"
    after the shadow is gone is a request the model must repair, not a
    rollback. The prompt says so.
1.  Queued steers are connection-local and do not survive a
    disconnect, so the run owns the socket for its lifetime.
1.  A connection lives at most **sixty minutes**. That is an outer
    bound, not our ceiling — [the run ceiling is fifteen
    minutes](#one-ceiling-fifteen-minutes) — so it should never bind.
    If it ever does, something else has already gone wrong.
1.  If the model is waiting on a tool result, the steer comes back
    `response.steer.pending`; we return the tool result normally and
    the server prepends the queued steer itself.

**The fallback**, written first on day 1 so steering is never on the
critical path: inject the correction as a user message at the next step
boundary. Completed work survives trivially because the editor holds
the state, not the model. It satisfies FR-20 — but it is not
Astra-specific, so if only the fallback ships, steering stops being
model leverage and we describe it accurately as a feature of the loop.

`runAgent()` implements the fallback. A correction is acknowledged as
soon as it arrives, and reaches the model with the next call. One that
arrives during the call that finishes the edit gets one more call if the
caps allow it, and otherwise leaves the run incomplete. Once no call can
follow, a correction is refused, and one acknowledged but not yet sent,
including one a cancel strands, is reported as a recoverable error.

## The editor adapter

The editor is **Photopea**, and the adapter is the only component that
knows it. Everything else sees Contract 1.

Photopea is chosen because PSD is its _native in-memory model_ rather
than an export target — it converts everything it opens into a PSD —
which is why it can emit a real layered file where Figma, Canva, and
Polotno cannot. It also needs no account, no key, and no contract:
there is no `X-Frame-Options` and no `frame-ancestors`, so it can be
framed from any origin, and its terms of use say, in full and without
qualification, that "the Photopea editor can be used by anyone for any
purpose, for free. If Photopea allows you to do something, without
asking you to pay, you can do it." The terms contain no clause about
bots, automation, scraping, or embedding.

### The line that protects the premise

Photopea exposes a **Photoshop-compatible scripting interface**. That is
a gift and a trap.

The gift: file loading, layer naming, and export are one-liners, and
nobody should spend a day of a six-day project teaching an agent to
click through a save dialogue.

The trap: if the _retouching decisions_ are scripted rather than
driven, any model can write that script, the product fails the test it
was selected on, and we have built an ordinary wrapper with an
expensive backend.

So the split is fixed, and it is the adapter's one design rule:

| Scripted                           | Driven through the GUI          |
| ---------------------------------- | ------------------------------- |
| Load the image, set the viewport   | Selecting the subject           |
| Name layers, read the layer list   | Placing and refining masks      |
| Export the PSD and the PNG preview | Choosing and tuning adjustments |
| Zoom, scroll, reset state          | Judging when the edit is right  |

Photopea's Action Manager is a **stub** — `stringIDToTypeID` is a short
lookup table that returns its input unchanged for anything not in it —
so the usual Photoshop escape hatch of dropping to action descriptors
for whatever the DOM does not cover is closed. Basic selection and
colour operations did work in spike B1, however. The table above is a
product boundary that protects the premise, not a claim that every
operation on its right is technically impossible to script.

### The protocol

Photopea runs in an iframe and speaks `postMessage` in both directions.

- **Send a `String`** and Photopea executes it as a script.
- **Send an `ArrayBuffer`** and Photopea opens it as a file — which
  also sidesteps the `Access-Control-Allow-Origin` requirement that
  applies to loading by URL.
- **Receive an `ArrayBuffer`** for an exported file, followed by the
  string `"done"`.

Export is one call:

```js
app.activeDocument.saveToOE('psd') // "psd:true" for a minified file
```

The bytes arrive with **no filename, no MIME type, and no correlation
id** — the format is identified by magic bytes (`8BPS`).

Startup configuration goes in the URL as
`https://www.photopea.com/#<encodeURIComponent(json)>`, carrying `files`,
`environment`, and an initial `script`. The fragment is required:
without one, the root URL now opens a marketing page and never starts
the editor. The outer environment also needs a non-opaque origin. An
`about:blank` parent denied Photopea access to `localStorage`, aborted
its startup script, and never emitted the ready message; the same frame
under `http://127.0.0.1` started normally.

The upload, transport, and sentinel choices are explained in
[ADR-0002](/docs/decisions/0002-photopea-upload-transport.md).

### Known traps

Spike B1 retested each warning locally on September 15, 2026. The scripts,
captured outputs, and exact limitations are retained in the
[B1 evidence bundle](evidence/photopea-round-trip/README.md).

The test used Google Chrome 153.0.8010.36. Its result is deliberately scoped
to the calls named below; an untested Photopea DOM operation still needs
read-back verification.

1.  **Confirmed: `"done"` is not a reliable terminator.** Document and
    text-layer operations emitted `"done"` before the call's sentinel,
    and a script that threw also ended with `"done"`. Every scripted
    call therefore ends with a unique sentinel through
    `app.echoToOE("<uuid>")` and waits for that exact string.
1.  **Confirmed: modern JavaScript syntax fails silently.** Arrow
    functions, template literals, and `for...of` all reached the
    sentinel but evaluated to `undefined`, `null`, and `0` instead of
    their expected values. Adapter scripts stay within ES3 syntax.
1.  **Not reproduced: a crashed script poisons the interpreter.** A
    missing-method call was followed by a 250 ms pause. A separate
    layer rename and sentinel then completed in 13 ms without
    reloading. The probe did not capture exception details or measure
    end-to-end recovery. A sentinel timeout still triggers a frame
    reload, but interpreter poisoning was not reproduced by this call.
1.  **Not reproduced for the tested selection and colour calls.** A
    polygon selection reported the expected `0,0,64,64` bounds, and a
    fill using `rgb.hexValue = "FF0000"` produced first decoded bytes
    `[255, 0, 0, 255]`. The first three establish red; the probe did
    not retain the channel count needed to call all four one RGBA
    pixel. Read-back verification remains mandatory for every scripted
    mutation.
1.  **Inconclusive: text layers need a two-second delay.** A text layer
    created immediately after the ready message returned its expected
    contents and layer count, as did one created after two seconds. The
    probe did not retain rendered-pixel evidence, so font rendering at
    either time remains unverified.
1.  **Not reproduced locally: a seven-second cold start.** The editor
    was ready in 1.309 seconds, opening the first 640x480 JPEG took
    0.033 seconds, and PSD export through the exact sentinel took 0.100
    seconds. The direct JPEG-post-to-PSD-sentinel round trip took 0.133
    seconds, and the full local probe ended in 2.356 seconds. The local
    ready and direct round-trip intervals total 1.442 seconds, below
    NFR-3's five-second threshold. These are one
    retained sample from a new local Chrome process and temporary
    profile; the bundle defines each clock and its cache limitation.
    Browserbase cold-start time remains a separate B2 measurement and
    can still force session warming; the local result does not prove
    the button-to-run-start requirement.

### Advertising

Free embedding shows ads, which would appear in our product and in the
demo recording. Removing them requires a **Distributor account**, from
**€60 for 30 days at 1,000 frame-loads per month**, rising to €300 at
20,000. This is cheap, it has a signup lead time, and a demo video with
somebody else's advertisement in it is not a demo video we can submit.
It is bought on day 0.

### The fallback

If driving Photopea proves unreliable, `ag-psd` (MIT) writes layered
PSDs directly from Node with no browser at all. It is a strictly worse
product — nothing to watch, nothing to steer, no model leverage — but
it guarantees that _something_ with a layer stack ships. It is the
floor, not a plan, and choosing it means the launch copy stops claiming
computer use.

## The browser runtime

### Why there is one at all

Photopea can be framed from any origin, which invites an obvious
saving: put the iframe in the _user's_ browser and skip hosted
browsers entirely.

It does not work, and the reason is worth recording so nobody proposes
it again on day 3. A cross-origin iframe gives the parent page **no
pixels**. The agent's entire input is pixels. There is no way to
screenshot Photopea from a page that merely embeds it, so the editor
has to run somewhere we control — which means a browser on our side,
and that is the whole justification for the cost.

The saving is still available for the _fallback_ product: an embedded
Photopea the user drives themselves, with the agent writing scripts
rather than looking. That is a different, weaker product, and it is
what the [editor fallback](#the-fallback) turns into.

### What we need from it

A hosted Chrome session per run, driven over CDP, with Photopea loaded
and the user's image opened.

- **CDP access**, so we drive it ourselves rather than through a
  provider's own agent abstraction.
- **Sessions of at least twenty minutes**, giving margin over our
  fifteen-minute run ceiling for export and teardown.
- **Concurrency** to cover NFR-4 on the entry paid tier — though see
  [the rate-limit ceiling](#the-concurrency-ceiling-is-a-rate-limit-not-a-server),
  which may bind first.
- **A live view**, if the provider has one. If not, we make our own.

### The shortlist

All four of these expose a live-view iframe and a CDP endpoint from a
single session-create call, and each is an afternoon's integration.

| Provider     | Entry tier  | Concurrency | Per browser-hour | Max session |
| ------------ | ----------- | ----------- | ---------------- | ----------- |
| Browserbase  | $20/mo      | 25          | $0.12            | 6 h         |
| Anchor       | $50/mo      | 25          | $0.05            | 180 min     |
| Hyperbrowser | $30/mo      | unpublished | $0.10            | 12 h        |
| Steel        | usage-based | 10 (Launch) | $0.10            | **15 min**  |

**Browserbase is the default choice**: the cheapest entry tier that
covers NFR-4's twenty concurrent runs, with a session length nowhere
near binding. Anchor is half the hourly rate and the only one with a
documented flow for handing control to a human — interesting for a
later version, not for this one.

**Steel's Launch tier is disqualified at that tier, not as a product.**
Its fifteen-minute session cap is exactly our run ceiling, leaving no
margin for export and teardown — the thing
[the ceiling section](#one-ceiling-fifteen-minutes) exists to prevent.
Its Scale tier does not have that problem.

So [spike B2](#decisions-deferred-to-spikes) is no longer a comparison.
It is: sign up, create one real session, confirm the live view and CDP
behave, and measure cold start — which nobody publishes, and where both
available benchmarks were written by a competitor.

**Correction to an earlier draft of this document:** self-hosted
Playwright is _not_ a fallback that always works. A watchable,
interruptible remote Chrome is weeks of work, and the hard parts are
not Chrome — they are arbitrating control when a human takes over
mid-run, and keeping raw CDP away from the user's browser, since CDP
grants `Runtime.evaluate` and cookie access to whoever holds it. If no
provider works out, the product changes; we do not build one.

### Frames

Frames reach the browser as periodically captured PNGs pushed over the
event stream, not as a video pipeline. One frame every one to two
seconds satisfies FR-10, costs nothing to build, and degrades
gracefully — a dropped frame is invisible where a stalled video stream
is not. A provider-native embeddable live view, if one exists, is
strictly better and replaces this.

These are _not_ the frames sent to the model. The model gets 1440x900
captures on its own cadence; the user gets whatever bandwidth allows.
Conflating the two couples the demo's smoothness to the token bill.

### One ceiling: fifteen minutes

A run lasts at most **fifteen minutes**, and that single number is the
ceiling everywhere. Two other durations appear in this document and
neither is a ceiling: the sixty-minute WebSocket lifetime is an outer
bound we should never reach, and the twenty minutes we ask of a browser
provider is margin above fifteen, not permission to use it.

Spike A2 sizes the step cap so that a run finishes inside fifteen
minutes. Sizing it against sixty would produce a cap four times too
large and every long run would be torn down mid-edit.

### Disposal

Sessions are destroyed on completion, cancellation, error, or the
fifteen-minute ceiling, whichever comes first. A leaked browser session
is a leaked bill, and the test for this asserts that no session
survives its run — including when the run throws.

**Export first, on every path.** The session holds the only copy of the
work: `exportPsd()` is a method on `EditorSession`, so once the session
is gone there is nothing left to export from. FR-12 requires a run
stopped by the step cap to return a layered file, and FR-13 requires
the same of a cancelled one — both are unsatisfiable if teardown wins
the race.

So disposal is always two steps in order: export, then destroy. It
applies to the cancel, ceiling, and error paths as much as to normal
completion, and on the error path it is best-effort — an export that
itself fails must not prevent the teardown that stops the bill.

## The web application

A single page. Upload, prompt, run, result — no routing, no navigation,
no account.

- Rendered from the same process that serves the API, so there is one
  deployment and one origin.
- Run state lives server-side, keyed by `runId`, and the page holds
  only the id. A reload re-subscribes (FR-14).
- The live view is an `<img>` swapped on each `frame` event. The layer
  list (FR-29) renders from `RunResult.layers`.
- The correction box is always present during a run, never behind a
  disclosure. It is the most important control on the page.

### Input validation

FR-1 and FR-3 are enforced at `POST /api/runs`, **before a browser
session is created**. A session opened for an upload we were always
going to reject is a bill we chose to pay for nothing.

Three checks, each with its own message naming the reason:

1.  **Format**, by magic bytes — not by file extension and not by the
    `Content-Type` header, both of which the client controls.
1.  **Size**, at most 20 MB, checked against the actual body length
    rather than a declared one.
1.  **Dimensions**, at most 6000 px on the long edge, read from the
    header without decoding the whole image.

### Resolution: two different things

FR-1 allows a 6000 px image while the model sees a 1440x900 viewport,
which reads like a contradiction and is not one.

The **image** opens in Photopea at its full resolution and stays there;
the exported PSD is at that resolution. The **screenshot** is of the
browser viewport, which is 1440x900 regardless of how large the image
is — Photopea fits the document to its canvas and the agent works
against what it can see, exactly as a person would.

So the "we do not downscale" rule in
[Screenshots](#screenshots) is about never resizing the _screenshot_
after capture, which would oblige us to remap the model's coordinates.
Nothing downsamples the user's photograph, and nothing needs to.

## Cost control

### Where the money goes

The loop resends a growing screenshot history, so naive cost is
quadratic in the step count. Forty steps at 1440x900 send roughly
**1.3M input tokens cumulatively** — about **$13** at the $10/M input
rate, for one photograph. That is the number the product dies on.

Prompt caching is the lever: reads are $1/M and writes $12.50/M, so the
same input lands near **$2**. Adding roughly 30K of output at $50/M:

|                 | Input | Output | **Per run** |
| --------------- | ----- | ------ | ----------- |
| Caching working | ~$2   | $1.50  | **~$3.50**  |
| Caching broken  | ~$13  | $1.50  | **~$14.50** |

Everything below exists to keep us in the first row.

- **The tool array must be byte-stable across the run.** Changing a
  tool's name, description, schema, or even its _ordering_ invalidates
  the cache from that point. Build it once per run and freeze it.
- **The minimum cacheable prefix is 1,024 tokens**, which our system
  prompt plus the first frame clears immediately.
- **The cache TTL is 30 minutes and that is the only supported value.**
  Reuse refreshes it for free, so a steadily-stepping run stays warm; a
  run that stalls for half an hour pays full price to resume.
- The implicit cache breakpoint lands at the last tool response in a
  group, which is exactly the shape of a screenshot output, so an
  append-only loop caches well without explicit breakpoints.
- Caches are machine-local, and sustained traffic above 15 requests per
  minute can overflow to another machine and miss. Twenty concurrent runs
  (NFR-4) send more than that in total. Whether the threshold counts per
  cached prefix or across the organisation is not yet known, and it
  decides which row of the table above launch-day traffic lands in.

A **bounded frame window** — the first screenshot plus the last few —
is the backstop if caching underperforms, at some cost in the model's
ability to see what it has already done. The window size is an output
of [spike A2](#decisions-deferred-to-spikes), not a guess.

Worth noting what is _not_ a risk: requests over 272K input tokens are
billed at 2x input and cache rates and 1.5x output **for the whole
request**, but forty frames come to roughly 63K tokens. We stay far
below that cliff, and the step cap keeps it that way. The threshold is
per request; our exposure is cumulative, and the two are easy to
confuse in the wrong direction.

### The four limits

| Limit         | Scope     | Enforced in    | Requirement |
| ------------- | --------- | -------------- | ----------- |
| Step cap      | Per run   | The agent loop | FR-12       |
| Spend cap     | Per run   | The agent loop | NFR-2       |
| Free runs     | Per visit | The HTTP layer | FR-35       |
| Daily ceiling | Global    | The HTTP layer | FR-37       |

The free allowance is enforced server-side against a signed cookie plus
address, accepting that this is defeatable. The global daily ceiling is
what actually protects us, and it is the one that must be tested by
being hit.

A user-supplied key (FR-36) bypasses the free-run limit and the daily
ceiling, because it is their money. It does not bypass the step or
spend caps, because a runaway loop on someone else's key is still our
bug.

### Size the daily ceiling against concurrency, not one user

NFR-4 and FR-37 are both P0, and read carelessly they collide. Twenty
concurrent runs at about $3.50 each spend roughly **$70 in one
ten-minute wave**. A daily ceiling set anywhere near the "no single
user costs us fifty dollars" figure in the product brief is tripped by
the first wave — NFR-4 then holds on paper and nobody can use it,
though nothing is out of capacity.

The two limits protect against different things:

- **An honest visitor** is bounded by the free allowance — three runs,
  about $10.50. The allowance is defeatable by design, so **a
  determined one** is bounded by the daily ceiling instead.
- **The daily ceiling** bounds total exposure. It is a budget the team
  sets deliberately, knowing roughly how many waves it buys, with that
  arithmetic written down next to the number.
- **NFR-4** describes capacity, not a commitment to spend. When the
  ceiling is hit, free runs stop and user-supplied keys keep working,
  so the concurrency is still there for anyone paying their own way.

Setting the number is a day-4 decision with an owner, informed by the
measured cost per run from spike A2 rather than by this estimate.

### The concurrency ceiling is a rate limit, not a server

NFR-4 asks for twenty simultaneous runs. Whether we can serve them is
decided by our OpenAI tier, not by our hardware: tier 1 allows 500
requests and **500,000 tokens per minute**, and image tokens count.
Twenty runs each resending tens of thousands of image tokens per step
will exhaust that long before the server notices. Confirming the
organisation's tier and headroom is
[spike A4](#decisions-deferred-to-spikes) and it is a day-0 item,
because the remedy — raising the tier — has a lead time we do not
control.

## Security

### Secrets

- Our OpenAI key lives in the server environment and never reaches the
  browser (NFR-5).
- A user-supplied key is held in memory for the life of the run,
  redacted from every log line, and never written to disk.
- Uploads go to object storage under an unguessable key with a
  twenty-four-hour lifecycle rule (NFR-6). Results are served by signed
  URL.

### An agent driving a browser is an attack surface

Astra's own system card puts indirect prompt injection at an estimated
**8.5% attack success rate** against a curated adversarial set — much
better than the 27.0% of the previous generation, and nowhere near
zero. In realistic computer-use environments it reports misaligned
outcomes at 3.4% overall, with unauthorised transactions at 6.8% and
data exfiltration at 4.3% — and, tellingly, **a confirmation policy
barely moved those two numbers**. Asking the agent to confirm is not a
control. Making the bad action impossible is.

So the controls are structural:

- **The browser session reaches the editor's origin and nothing else**,
  by network allow-list. This is the single most valuable control we
  have, and it is cheap because the product genuinely needs one site.
- **The session holds no credentials** — no logged-in accounts, no
  payment methods, no cookies worth stealing. There is nothing to
  exfiltrate and nothing to spend.
- **The user's instruction and the uploaded image are untrusted
  input.** The instruction is a separate user message, never
  concatenated into the system prompt. The image is data the model
  looks at, and an image containing text that reads like an
  instruction is a real vector, not a hypothetical one.
- **Sessions are destroyed after every run**, so nothing carries from
  one user to the next.

## Observability

One structured log line per run, written at completion, carrying: run
id, step count, whether the cap was hit, token counts in and out, cost,
duration, outcome, and failure reason (NFR-8). That single table answers
every question worth asking on launch day.

Frames are not logged. Instructions are, truncated; keys never.

## Testing

Proportionate to six days, and concentrated where being wrong is
expensive.

1.  **The ten-image set** (NFR-1). Ten real photographs with a written
    instruction and a written expectation each. Run nightly from day 2.
    This is the number the launch decision is made on, and it is the
    only test that can stop the launch. The day-2 go/no-go is a
    separate, lower bar: one scripted three-edit sequence, end to end.
1.  **PSD validation** (FR-25 to FR-27), automated: parse the exported
    file, assert layer count, assert every name is human, assert at
    least one editable mask or adjustment exists. Then, manually and
    once per day, open it in Photoshop, Affinity, and GIMP.
1.  **Contract tests** run against both the fake and the real
    implementation of each contract, so the fakes cannot drift.
1.  **The limits** — step cap, spend cap, free allowance, daily ceiling
    — each tested by being hit, not by being reasoned about.

No unit tests of the model's behaviour. It is not deterministic, and
pretending otherwise wastes days we do not have.

## Deployment

A single container on a platform that runs long-lived processes with
persistent connections. Serverless is ruled out by the shape of a run.

- One environment, deployed continuously from `main` from day 0. There
  is no staging; there is not time, and a staging environment nobody
  looks at is worse than none.
- Object storage for uploads and results.
- One small relational store for metering counters and waitlist emails.
- Secrets from the platform's own store, never in the repository.
- The landing page (FR-30) is served by the same app on the same
  domain.

Deploying from day 0 is deliberate: the first deployment is the one
most likely to eat an afternoon, and finding that out on day 5 is how
launches get missed.

## Repository layout

```text
src/
  agent/      the Astra loop, steering, budgets, narration
  editor/     the editor adapter and its fake
  browser/    session provider and the live frame pump
  server/     HTTP surface, metering, storage
  web/        the single page and the landing page
test/
  images/     the ten-image set and its expectations
docs/         PRODUCT.md, PRD.md, TRD.md, references/
```

One directory per stream, so that day-to-day work rarely collides.
`src/agent` and `src/editor` meet only at Contract 1; `src/server` and
`src/agent` meet only at Contract 2.

Conventions are the repository's existing ones: bun, Prettier, atomic
commits, Conventional Commits, and the
[git workflow](/docs/references/git-workflow.md). They are not relaxed for the
deadline.

## Decisions deferred to spikes

Each is time-boxed, has an owner, and ends in a written answer
committed to this document. A spike that overruns its box is escalated
the same day, not extended.

| Spike | Question                                            | Box     | Day |
| ----- | --------------------------------------------------- | ------- | --- |
| B0    | Buy the Distributor account, and re-read the terms  | 1 hour  | 0   |
| A0    | Code execution or the `computer` tool?              | ½ day   | 0   |
| A4    | What is our OpenAI tier, and does it allow NFR-4?   | 1 hour  | 0   |
| B1    | Verify the image-in, PSD-out round trip end to end  | ½ day   | 0   |
| B2    | Sign up for Browserbase and measure cold start      | 2 hours | 0   |
| A1    | Can the agent complete one edit unattended?         | 1 day   | 1   |
| A2    | What step cap and frame window does the cost allow? | ½ day   | 2   |
| A3    | Does native mid-turn steering work for us?          | ½ day   | 3   |

Issue #15 upload result (2026-09-14, Google Chrome 153.0.8010.36): the
opt-in installed-Chrome test opened PNG and JPEG at their full 6000x1
resolution, including an exact 20 MiB JPEG padded with valid APP15
segments. The measured values were `pngMs: 86.93262499999992`,
`jpegMs: 78.7602079999997`, and `maxJpegMs: 1034.7378339999996`.
The 20 MiB case is below NFR-3's five-second start budget for an already
booted editor. These timings cover binary transfer through document
verification, fitting, and Move-tool selection; they exclude editor boot
and do not establish the whole cold-start budget.

Visible Google Chrome verification confirmed Layers, Adjustments, and
Properties (collapsed in its dock), with the Move tool selected. The
boundary image retained its 6000x1 source dimensions, verified in
Photopea's Image Size dialog, and its tab displayed `boundary.png`.
Because a fitted single-pixel row is too thin to inspect visually, a
separate temporary 6000x4000 PNG was opened through the same loader: all
four canvas edges fitted within the 1440x900 viewport. No image binaries
were committed.

The live proof exposed two adapter defects. Photopea's `Document.name`
read-back drops text from the first period onward, so the loader sets a
display stem and verifies the complete filename through the documented
[`Document.source` identifier](https://www.photopea.com/learn/scripts).
Serializing 20 MiB as individual numbers initially took
`maxJpegMs: 28022.7145`; a compact base64 transfer reduced it to the
measurement above while preserving every byte and defensive copies.

The September 14 review added header-field validation before browser
navigation, applied the transport viewport to injected pages, and made
bridge boot reusable. Concurrent boot calls share one readiness wait;
successful boot is cached, while a failed attempt permits a fresh host.
Installed-Chrome tests with a local host confirm fresh initialization on
repeated transport boots and that cleanup messages cannot satisfy a retry.
The bridge's `commandTimeoutMs` bounds each message wait, excluding
navigation, message delivery, and awaited reload cleanup.

A subsequent same-page decode regression established that Photopea can
finish processing a truncated file without creating a document. The loader
now snapshots the document count before delivery and requires one newly
appended document before selecting or renaming it. Public-Photopea Chrome
coverage rejects a truncated second PNG without renaming the original,
then opens a valid second image on the same loader. A follow-up concurrency
regression showed that the bridge's per-command queue did not protect the
complete count-to-verification workflow. Complete opens now share an internal
FIFO by bridge identity, including multiple loader instances. It holds through
Move-tool selection; failed calls do not block later work. Validation and byte
copying happen before queueing, and load timing excludes queue wait. Chrome
coverage verifies overlapping failed/valid and valid/valid uploads without
mistaking another call's document for the uploaded image.

The September 15 EXIF regression used a valid JPEG with raw SOF dimensions
of 32x16 and orientation 6. Photopea correctly displayed it at 16x32, while
the validator previously expected 32x16. Bounded APP1/TIFF IFD0 orientation
parsing now supplies the expected displayed dimensions; public-Photopea
Chrome coverage passes for all eight orientations. Orientations 5–8 swap
axes. Original bytes and the long-edge limit are unchanged. Malformed
inspected EXIF fields are rejected before boot; unrelated metadata, PNG
CRCs, and full pixel decoding remain outside the validation boundary.

B0 no longer gates anything. It was written when the licence question
was open; it is
[answered](PRODUCT.md#open-questions), and what is left of B0 is a
purchase with a signup lead time. Nobody should re-litigate the terms
on day 0, and nobody should reach for the kill switch over them.

A0 and A4 are the two that can still change the plan, which is why both
are day-0 despite being short.

**B1 result, September 15:** passed. The retained run reports a 13,442-byte
JPEG sent through `postMessage` and preserves the exact input plus its
1,412,711-byte PSD with two named layers, `Original photograph` and
`Retouched copy`. The `8BPS` signature, 640x480 dimensions, and both layer
names were verified with `ag-psd` 30.2.0. The captured sequence is the
deliberately misleading `"done"`, the PSD bytes, the unique sentinel, and the
real completion `"done"`; the host logic and tests show why only the exact
sentinel completes the wait. Adobe Photoshop 2026 version 27.10.0 opened the
same PSD without a warning dialog and displayed both named layers. The
[B1 evidence bundle](evidence/photopea-round-trip/README.md) retains the exact
input, scripts, outputs, hashes, trap results, timing definitions, and the
structured Photoshop observation.

## See also

- [Product brief](PRODUCT.md) — why this, and when we stop.
- [Product requirements](PRD.md) — the `FR` and `NFR` numbers cited here.
- [Architecture decisions](/docs/decisions/README.md) — why durable boundaries were
  chosen.
- [Git workflow](/docs/references/git-workflow.md) — how changes land.
