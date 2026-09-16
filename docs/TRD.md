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

### Contract 1: Editor session

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

type LayerKind = 'raster' | 'adjustment' | 'group'
type LayerMaskKind = 'pixel' | 'vector'

interface LayerMaskInfo {
  readonly kind: LayerMaskKind
  readonly enabled: boolean
}

interface LayerInfo {
  readonly name: string
  readonly kind: LayerKind
  readonly visible: boolean
  readonly masks: readonly LayerMaskInfo[]
  readonly children: readonly LayerInfo[]
}
```

The boundary and its fixture-backed fake are explained in
[ADR-0001](/docs/decisions/0001-editor-session-contract.md).

### Contract 2: Run orchestration

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

// Why the run isn't complete, or that it is: the step cap, the spend cap,
// the time limit, a server shutdown, a cancel, or a model failure.
type RunStopReason = 'complete' | 'step_cap' | 'spend_cap' | 'time_limit' | 'shutdown' | 'cancelled' | 'failed'

interface RunResult {
  psdUrl: string
  previewUrl: string
  layers: LayerInfo[]
  complete: boolean // false if the run stopped before finishing, FR-12
  stopReason?: RunStopReason
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
  reload can simply subscribe again (FR-14). Of the run's frames, a replay
  holds only the latest, the one the page shows, and an iteration skips a
  frame it has not reached once a newer one arrives.
- `cost` carries the run's totals so far, and they never fall (FR-15).
- A run ends exactly once, with `done` or with an `error` whose
  `recoverable` is false, and nothing follows. A recoverable error is
  reported and the run carries on.
- `complete` is false whenever the run stopped before the agent
  finished: at the step cap, at the spend cap, on cancel, or because the
  model stopped answering. The result still carries the layers made so
  far (FR-12, FR-13).
- `stopReason` names why, so the page states the true reason instead of
  always blaming the step cap: `step_cap`, `spend_cap`, `time_limit`,
  `shutdown`, `cancelled`, or `failed`. A run the registry's `close()`
  ends for a server shutdown is `shutdown`, distinct from a user's own
  `cancelled` (#112). A `failed` result — the model stopped answering,
  above — states no cap, because it did not stop on one. `RunSnapshot`
  carries the same field, so a reload agrees with what the live `done`
  event showed.
- A model call that still fails once its retries have run out ends the
  run as a cap does, not as a failure: a recoverable error says the model
  stopped answering, and `done` follows with the file made so far. The
  team took this decision on September 16, while completing #104.
- A correction is acknowledged within three seconds (FR-21). Once the
  run has ended, `steer()` rejects and `cancel()` changes nothing.

### Contract 3: The HTTP surface

Owned by the web stream.

| Method | Path                   | Purpose                       |
| ------ | ---------------------- | ----------------------------- |
| `POST` | `/api/runs`            | Start a run, returns `runId`  |
| `GET`  | `/api/runs/:id/events` | Server-sent `RunEvent` stream |
| `POST` | `/api/runs/:id/steer`  | Send a correction             |
| `POST` | `/api/runs/:id/cancel` | Stop, keep the partial result |
| `GET`  | `/api/runs/:id`        | Current state, for reconnect  |
| `POST` | `/api/uploads`         | Warm an editor for an image   |
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

The `computer` tool drives the editor, and code execution is the fallback.
[Spike A0](#decisions-deferred-to-spikes) measured both on September 15.
Each got the same three-edit instruction on the same three images, and both
completed all three runs. On three images the margins between them are not
significant, so the decision rests on two things the measurement does not
change:

- the `computer` tool needs no code sandbox, and nobody can build one in
  the three days left;
- it has no scripting path to guard.

| Mechanism       | Completed | Steps per image | Mean time | Tokens in / out | Cost, three runs |
| --------------- | --------- | --------------- | --------- | --------------- | ---------------- |
| `computer` tool | 3/3       | 12, 13, 13      | 88 s      | 545,044 / 3,866 | $1.56            |
| Code execution  | 3/3       | 13, 16, 15      | 97 s      | 674,110 / 3,388 | $1.75            |

Every run exported four layers: the original, a brightness adjustment
layer and a warming adjustment layer named in plain words, and a vignette
layer. No run had a silent step, a model error, or a disqualification. Two
of the three images show the same scene. The records, code logs, and final
frames are in the
[A0 results](/docs/evidence/driving-mechanism/results/records.json).
To repeat the measurement:

```sh
OPENAI_API_KEY=... bun run docs/evidence/driving-mechanism/harness.ts
```

The two candidates:

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

`ResponsesModel` in `src/agent/responses-model.ts` implements both, and
one option selects the mechanism. Neither weakens the premise: the editor
still has no usable API, and the competence being exercised is still
holding a long GUI task together. Both mechanisms' prompts forbid
Photopea's scripting interface, its script dialog included. A spike run
that scripts it is disqualified, whether its code reaches the interface
or, in computer mode, it types `app.`, `echoToOE`, or `saveToOE`.

**Code execution is the fallback.** Switching is one option in
`ResponsesModel`, and its `run_code` code runs against the page before the
loop takes the next screenshot. OpenAI's recommendation of it for Astra is
why the fallback is credible, and it completed all three A0 runs. Its cost
is the sandbox. Model-written code is untrusted input: the harness ran it
unsandboxed in its own Bun process, which is acceptable for a local spike
and never for production. If we switch, production runs it inside the
page, through `page.evaluate` with a restricted API surface, or in a
separate sandbox. It never runs in the server process, which holds our API
key and the database. We switch if the `computer` tool completes fewer
runs than code execution would on the ten-image set (NFR-1).

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
- A finished edit, a cap, a cancel, a missing narration, or a model that
  stopped answering exports the file and then closes the session. A
  failure attempts one PSD export after the frame pump stops, gives it
  four seconds, and then closes the session whether that export succeeded
  or not. Contract 2 still ends a failed run without a result, and the
  failure's reason is fixed because a provider's error message can quote
  a key.
- The page sees the editor through a frame pump of its own rather than
  the model's screenshots, as [Frames](#frames) describes.

`ResponsesModel` sends a call again rather than let one error end the run
(#104). A call that meets a rate limit, a server error, a failed
connection, or no answer within its own timeout is retried, over the same
socket when it has one. Over HTTP, and in a WebSocket `error` event, a rate
limit is status 429 and a server error 5xx. A failed response over the
WebSocket carries only an error code, so `rate_limit_exceeded` counts as a
rate limit, and `server_error`, or no code at all, as a server error:

- **The timeout** gives each attempt one minute. Over HTTP it bounds the
  request to its whole response; over the WebSocket it bounds a step's
  silence, because a response sends traffic as it goes. Recorded runs
  spent 3 to 20 seconds a step, the editor's actions included.
- **The wait** follows a backoff that doubles from one second up to
  thirty. It is half the backoff, or `retry-after` when that is longer,
  plus up to the other half at random, so that runs rate-limited together
  come back apart even when told the same wait, and it never passes
  thirty seconds. A cancel or the run's ceiling ends it at once.
- **Giving up** comes after six retries, whose waits add up to between
  thirty seconds and a minute unless `retry-after` asks for more, or at
  once when the server asks for a wait longer than thirty seconds. The
  model then throws `ModelUnavailableError`, and the loop ends the run as
  a cap does: it reports a correction left unsent, says the model stopped
  answering, and publishes the file made so far. The run log still
  records it as `failed`, with `model_call_failed`.
- **A refusal is not retried**, on either transport. Any other 400-class
  status or error code, such as `invalid_prompt`; a rate limit for an
  exhausted quota, `insufficient_quota`, which no wait clears; a missing
  key; or a malformed action fails the run at once, as before.

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

`ResponsesModel` implements native steering when `STEERING` is `native`,
which is what production sets, because spike A3 proved it there. The
default is `boundary`, the step-boundary path, which is also what a run
falls back to. The loop is unchanged. `managedAgentRun` acknowledges a
correction through the loop, then offers it to the model's optional
`steer()`. The model sends every step as `response.create` over one
WebSocket per run, with `store: true` and one lane, and steers the response
being generated with the correction. A steer exists only while a response
is being generated, so a correction typed while the editor carries out
actions still waits for the next call. The loop passes every correction
with its next call either way, and the model leaves out any that native
steering applied, or that the server holds for the continuation.

`SteerLedger` alone decides what happens to each correction. Each one ends
either applied or replayed, never both and never neither:

- A steered response is followed to its successor, whose
  `response.created` applies the steers it carries.
- A response that needs tool output keeps its accepted steers for the
  continuation, which applies them, because the server prepends them.
- A refused steer is replayed. `steering_not_supported` also turns native
  steering off for the run.
- The ledger settles steers only after every event through the step's last
  response has been read, so a steer still unanswered when its response
  completed is replayed. A late acceptance can then land the correction
  twice, which is the harmless direction.
- A dropped connection, a step silent for a whole call timeout, a
  successor that never comes, or a response nobody asked for leaves
  steers the connection cannot vouch for. Each is replayed and counted as
  indeterminate. The step is sent again over HTTP, and the run stays on
  HTTP. Replay is the default because a correction applied twice does no
  harm, while a lost one breaks FR-20.
- A step that fails with a rate limit or a server error is sent again on
  the same socket, as [The loop](#the-loop) describes. The steers the
  server held for a continuation that failed are replayed with it,
  because the failed response may have spent them, and the responses the
  step ended before it failed are still billed.

**A3 result, September 15:** passed, on the deployed service. A correction
sent into a response being generated was accepted 194 ms later, that
response ended `response.incomplete` with reason `steered`, its successor
was created 293 ms after that, and the successor's step said "I'll use
restrained warmth and keep the vignette off the middle." The ledger settled
the correction as applied, and nothing was replayed at the step boundary.
The adjustment made before the correction was still in the exported file,
next to the two layers made after it, and the run finished complete in 16
steps and 192.7 s for $0.50. The
[A3 evidence bundle](/docs/evidence/native-steering/README.md) retains the event
sequence, the narrations either side of the correction, the layers, and
what the run cost. Native steering is therefore model leverage the launch
copy can claim: the previous generation has no equivalent.

The server runs `fakeRun()` when `RUN_MODE` is `fake` or unset. When it is
`agent`, the server runs the real agent: `ResponsesModel` on the `computer` tool
drives Photopea in a Browserbase browser created when the run opens its image.
That browser loads the host page from `PUBLIC_URL`, so agent mode needs that
address and `BROWSERBASE_API_KEY`. The model reads the key from the run at every
call, so releasing the run's secrets leaves no copy, and closing the editor,
which the loop does on every ending, releases the browser. When it is
`scripted`, the server runs `runAgent()` against the recorded
`FakeEditorSession` with a scripted model. That model spends one step on each
correction it is sent, so a correction visibly changes the narration that
follows. A correction refused because the run is finishing gets the same HTTP
409 `run_ended` as one sent after it ended.

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
[B1 evidence bundle](/docs/evidence/photopea-round-trip/README.md).

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

`startFramePump()` in `src/browser/frame-pump.ts` keeps that cadence. The
agent loop starts it once the upload is open, and stops it before the
export, waiting up to a second for a frame in progress, so no frame
follows the end of a run. It captures the editor once a second, timed from
the start of one capture to the start of the next, and never starts a
capture before the previous frame is finished. Its captures overlap the
loop's actions and screenshots, so a session must allow `screenshot()`
during any other call, and under Playwright the model's screenshot can
wait behind a frame's. The pump sends nothing when a frame is identical to
the one on the page. A frame that cannot be captured or published leaves
the last one on the page and is reported once, and the run carries on.

Bandwidth was measured on September 15, 2026, against live Photopea in
Google Chrome 153.0.8010.37, with the sample photograph open at 1440x900:

| Editor                    | Frames sent | Mean frame | Slowest capture | One viewer | Twenty viewers |
| ------------------------- | ----------- | ---------- | --------------- | ---------- | -------------- |
| Idle, 20 s                | 4 of 20     | 840 KB     | 263 ms          | 168 KB/s   | 27 Mbit/s      |
| Holding a selection, 20 s | 12 of 20    | 606 KB     | 174 ms          | 363 KB/s   | 58 Mbit/s      |
| Worked, 41.3 s            | 33 of 42    | 612 KB     | 200 ms          | 490 KB/s   | 78 Mbit/s      |

Skipping identical frames pays off only while nothing on screen moves: the
animated outline of a held selection still sends most frames. Plan capacity
on the worked row, at which a run lasting the whole fifteen-minute ceiling
sends each viewer about 440 MB. Sending every capture, even an idle editor
would cost 840 KB a second. The numbers come from
`test/browser/frame-bandwidth.integration.test.ts` on a local browser; a
hosted session shows the same pixels, but its capture time and upload path
are unmeasured.

The server's agent mode sends each frame inside its event as a `data:`
URL, so every frame kept in memory is up to a megabyte kept. Neither the
loop's event log nor the registry keeps more than the latest frame (#101).
A new frame leaves a gap at the old one's id, so ids still only rise: a
reconnect that sends `Last-Event-ID` resumes after its last event, and a
reload replays one frame rather than every frame of the run. A finished run
stays in the registry for an hour, but the registry lets go of the run
itself once it has ended, so what stays is its events, its latest frame,
and its snapshot, not its upload, editor session, or model.

### One ceiling: Fifteen minutes

A run lasts at most **fifteen minutes**, and that single number is the
ceiling everywhere. Two other durations appear in this document and
neither is a ceiling: the sixty-minute WebSocket lifetime is an outer
bound we should never reach, and the twenty minutes we ask of a browser
provider is margin above fifteen, not permission to use it.

Spike A2 sizes the step cap so that a run finishes inside fifteen
minutes. Sizing it against sixty would produce a cap four times too
large and every long run would be torn down mid-edit.

`managedAgentRun` enforces the ceiling:

- **At fifteen minutes** it cancels the run. The run exports and closes as
  a cancel does, and the run log records `time_limit`.
- **An editor call that hangs** never sees the cancel. A run still going a
  minute later has its browser abandoned: the Browserbase session is
  released at once, and the hung call fails.
- **Connecting to Browserbase over CDP** gives up after thirty seconds.

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
itself fails must not prevent the teardown that stops the bill. The error
export gets four seconds; if it is still pending, the browser is abandoned
instead of waiting for the editor's normal close queue to drain.

**Shutdown ends runs too.** On SIGTERM the server:

1.  cancels every run in flight, and gives each four seconds to export and
    be recorded;
1.  abandons any run still going, and gives it four more seconds;
1.  releases each run's secrets, whether or not it has ended.

A deploy therefore never leaves a run billing. Both phases fit inside the
ten seconds Cloud Run allows after SIGTERM.

Warm sessions belong to no run, and releasing one can wait ten seconds on
Browserbase, so they are released alongside those phases rather than before
them. A slow release cannot use up the time the runs need to be recorded.

A crash, or a shutdown that overruns anyway, leaves runs that nothing
records or reconciles. Their reservations stop counting against the daily
ceiling twenty minutes after they were made, as
[sizing the ceiling](#size-the-daily-ceiling-against-concurrency-not-one-user)
describes.

## The web application

A single page. Upload, prompt, run, result — no routing, no navigation,
no account.

- Rendered from the same process that serves the API, so there is one
  deployment and one origin.
- The page, every file it loads, and the link preview banners carry the
  API's security headers. The content security policy lets no other site
  frame the page, which holds the field for a visitor's own key (FR-36),
  and allows what the page loads: its own files, the live view's `data:`
  frames, and the presigned `https:` preview and download. Bun's routes
  for an HTML import cannot add a header, so `pageRoutes()` serves the
  bundle's files itself (#114). Under `LAYERHAND_PAGE_RELOAD`, which
  `bun run dev` sets, it serves the page through that native Bun route
  instead, so an edit under `src/web` shows up without a restart, at the
  cost of the headers above; `bun run start` and every test leave the
  flag unset and stay secured.
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

`POST /api/uploads` runs the same three checks, and only then warms an
editor (#70): the twenty-one seconds a first frame takes are spent inside
the browser session, so they start when the image arrives rather than when
the button is pressed, and the run that follows begins with the image
already open (NFR-3). A visitor holds **one** warm session, so a retried
upload cannot double the browser bill; a second upload releases the first,
an unclaimed one is released after two minutes, and shutdown releases them
all. A visitor is only a cookie and an address, both of which anyone can
change, so the pool is bounded globally too: at most four sessions are warm
at once, and past that an upload does not warm and its run starts cold. Warming spends nothing on the model and reserves nothing from the
daily ceiling: metering stays at run start, where the spend is. A run whose
`uploadId` is unknown, expired, another visitor's, or for a different image
starts cold, exactly as it did before.

Three checks, each with its own message naming the reason:

1.  **Format**, by magic bytes — not by file extension and not by the
    `Content-Type` header, both of which the client controls.
1.  **Size**, at most 20 MB, checked against the actual body length
    rather than a declared one.
1.  **Dimensions**, at most 6000 px on the long edge, read from the
    header without decoding the whole image.

### Resolution: Two different things

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

**A2's first data point** comes from spike A0. A completed three-edit run
took about 13 steps and cost about **$0.55**, with 86–89% of its input read
from the cache. The `computer` tool averaged 12.7 steps at $0.52 a run, and
code execution 14.7 steps at $0.58. That is far below the table above, but
the table stands: forty-step runs are unmeasured, and the daily ceiling is
not re-sized from these figures.

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
measured cost per run from spike A2 rather than by this estimate. The
arithmetic below is what that owner redoes.

Each free run reserves NFR-2's $8 spend cap when it is admitted, and gives
back the difference when it ends. A reservation nothing gives back, because
the server that admitted the run crashed or was stopped first, stops
counting twenty minutes after it was made: the fifteen-minute run ceiling,
plus five minutes for a run stopped there to export and be reconciled, by
which time no run can still be spending it. A run is admitted only while
the day's spend, plus what is still reserved, plus its own $8, stays within
the ceiling. So wave _k_ of twenty concurrent free runs fits only when:

```text
ceiling ≥ (k − 1) × spend per wave + 20 × $8 reservation
```

Spend per wave is twenty times the cost per run that A2 measures.

| Ceiling | At $3.50 a run, caching working | At $14.50 a run, caching broken   |
| ------- | ------------------------------- | --------------------------------- |
| $150    | 18 concurrent free runs, not 20 | 18 concurrent free runs, not 20   |
| $230    | Two full waves: $70 + $160      | One wave, then 8 runs of a second |

With caching broken, the $8 spend cap stops each run at $8, so a wave
spends at most $160, and $230 leaves $70: eight more runs.

The deployed service reserves `FREE_RUN_SPEND_CAP_USD`, $3, so its $10
placeholder ceiling admits three concurrent free runs, and one full wave
would need 20 × $3 = $60.

**Proposed: $230 a day**, for kymil04 to confirm on day 4 from A2's
measurement. It is not yet agreed. The reservation always equals the spend
cap, because reserving less would undercount a run heading for it.
`test/server/limits.test.ts` pins the arithmetic at the $3 and the $8
reservation: nineteen reservations refuse the twentieth concurrent free run,
and twenty admit a full wave.

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

Retries do not raise that ceiling; they ride out a burst. A call that
meets the limit waits at least as long as `retry-after` asks and is sent
again, and a run whose retries run out stops with its partial file, as
[The loop](#the-loop) describes.

## Security

### Secrets

- Our OpenAI key lives in the server environment and never reaches the
  browser (NFR-5).
- A user-supplied key is held in memory for the life of the run,
  redacted from every log line, and never written to disk.
- Uploads go to object storage under an unguessable key, governed by a
  twenty-four-hour lifecycle rule (NFR-6) that is bucket-wide: it
  deletes every object — uploads, results, and previews alike — once
  it is a day old, not uploads only. Cloud Storage applies the rule
  asynchronously, so an object can still outlive that day by up to
  another one. The rule is committed as `.github/gcs-lifecycle.json`,
  and the manual `.github/workflows/gcs-lifecycle.yml` — triggered only
  by `workflow_dispatch`, never by push — applies it on request and
  always prints the bucket's live rule.
- Two tighter guarantees sit in front of that day-old backstop: an
  upload is deleted from the bucket as soon as its run ends, and every
  download link — the PSD's and the preview's — expires after one hour
  (`expiresIn: 3600` in `s3-artifact-store.ts`), by which point the run
  itself has also aged out of the registry (`DEFAULT_RETENTION_MS`, one
  hour, in `run-registry.ts`).
- Every Browserbase session is created with `recordSession` and
  `logSession` both false, so a run's photograph is not retained at
  Browserbase beyond the run itself (NFR-6).

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

- **The browser session reaches only Layerhand's public Photopea host and
  Photopea's origin.** Context-wide HTTP and WebSocket routes install
  before editor navigation and abort every other origin. HTTP redirects
  are rejected too: Chromium can follow a fulfilled redirect without
  routing its later hop, so only final responses are returned to it. This
  is the single most valuable control we have, and it is cheap because
  the product genuinely needs one site.
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

`createRunLogger()` in `src/server/run-log.ts` writes that line. The
launch runtime prints it to standard output as one NDJSON record, and
stores the same fields, with the cache hit rate added, in the `run_log`
table, one row per run. A launch-day question is then one SQL statement:

```sql
SELECT outcome, count(*), avg(steps), avg(cost_usd) FROM run_log GROUP BY outcome;
```

`cap_hit` is true when either cap ended the run, and `outcome` says
which. Before the instruction is cut to eighty characters, anything in
it or in the failure reason shaped like an OpenAI key, `sk-` followed by
eight or more characters, becomes `[redacted]`.

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

The service has **4 GiB** of memory, set by `--memory` in
`.github/workflows/deploy.yml`, and its one instance holds every run. On
September 17, twenty runs at once against a local server in scripted mode,
the recorded editor and a scripted model, with an 840 KB frame every second
and every page reloading once, peaked at **679 MiB** resident. Before only
the latest frame was kept, the same load peaked at 1,863 MiB. The memory
is several times the peak, because the figure leaves out what only real
runs do in this process, above all a large export, which alone takes about
1.1 GiB (the issue #100 export result, below). Their browsers run at Browserbase, but each screenshot and
export arrives here over CDP as base64 to be decoded, each model call
carries a screenshot, and an upload can be 20 MB rather than the 1.7 MB
sample photograph the runs sent. Nor does it cover a viewer on a slow
connection: the event stream does not wait for one, but a slow viewer now
holds at most one unsent frame in this process rather than every frame
behind it (#101). The
[run memory evidence](/docs/evidence/run-memory/README.md) has the method
and its limits.

From the September 17 freeze through the launch window, `deploy.yml` holds
still in three more ways (#112): `--min-instances 1` trades an idle instance
for the eight seconds a cold `/health` cost against well under two warm; a
push that changes only documentation, `graphify-out/`, or evidence never
triggers the workflow at all (`paths-ignore`); and the deploy step waits
for an approval once a required reviewer is set on the `production`
environment, a repository setting the workflow does not itself apply. The
[launch-day runbook](/docs/references/launch-day.md#the-freeze-and-the-no-deploy-rule)
has the approval and rollback steps.

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

Conventions are the repository's existing ones: Bun, Prettier, atomic
commits, Conventional Commits, and the
[Git workflow](/docs/references/git-workflow.md). They are not relaxed for the
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

A0 is answered in
[How the editor is actually driven](#how-the-editor-is-actually-driven):
the `computer` tool, measured on September 15. The
[Codex proxy run](/docs/evidence/codex-proxy/README.md) is a
day-2 feasibility hint for A1, not A0 data.

**B2 result, September 15:** it was measured in a live run of the real agent,
not in a separate probe. The run is in the
[agent run evidence](/docs/evidence/agent-run/README.md).

- **Session.** Browserbase created one in 0.8 seconds.
- **First frame.** The first frame of the opened image reached the page 21.3
  seconds after the run started. A separate probe put the CDP connection at
  about two seconds, so Photopea's start and the image open take most of the
  rest. Locally, in B1, they took 1.4 seconds.
- **NFR-3.** The run's `started` event is immediate, but a live view that
  takes 21 seconds misses NFR-3's intent. Warm sessions, or something shown
  before the first frame, are needed before launch.
- **Release.** The session was released when the run ended, and Browserbase
  reported it `COMPLETED`.
- **Bun version.** Playwright's `connectOverCDP` never connects under Bun
  1.3.14. It works under Bun 1.4.2, the version production runs.
- **Not yet confirmed:** the read-only live view. The run publishes its own
  frames and does not use Browserbase's live view.

**Warm against cold, September 15:** warming an editor while the
instruction is typed (#70) was measured the same way, on the deployed
service, by starting two runs and cancelling each at its first frame. With
a warm session the first frame reached the page **2.0 seconds** after the
button, and without one **7.4 seconds** — 5.4 seconds saved, and the
difference between meeting NFR-3's five-second budget and missing it.
Neither is the 21.3 seconds above, measured in an earlier run on an earlier
revision, and the gap between the two cold figures was not chased. The
[warm editor evidence](/docs/evidence/warm-editor/README.md) has the method, the
summary, and what the pair does not show.

**Re-measured September 16** against commit `28470e5`, the first pair run
through the network allow-list (#111, #147) rather than before it: warm
reached the page in **2.3 seconds** and cold in **8.9 seconds**, the same
pattern as September 15 and still inside NFR-3's budget only when warm.

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
navigation, message delivery, and awaited reload cleanup. Each file a
command receives adds a second a MiB to that wait (#100).

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

Issue #50 export result (2026-09-15, Google Chrome 153.0.8010.37): the
opt-in installed-Chrome export test opened the 1536x1024 sample photograph
in public Photopea and exported it through the bridge. The 9,071,117-byte
PSD took 307 ms and the 1,607,543-byte PNG preview 749 ms, each one run
from `runScript()` to its sentinel, including Photopea building the file.
A snapshot through `PhotopeaDocumentExporter`, as the production session
exports, took 1,081 ms from calling `exportSnapshot()` to its return: both
exports again, plus parsing and checking the PSD. While the host still
passed files out as arrays of numbers, the same PSD and preview took
16,481 ms and 3,779 ms, and the spike A0 harness had measured 62 seconds
for that PSD in headless Chromium, twice the bridge's 30-second default.
Exported files now cross the page boundary as base64, which the transport
encodes inside the page. The test checks SHA-256 digests taken in the page
as each of its four files arrived against the bytes returned.

That measurement is local. Over a CDP WebSocket, as a hosted session
connects, Playwright closes the connection on any message over 256 MiB,
about 192 MiB of file once encoded, and the bridge reported the closed
connection as a timeout, so the run lost its file (#100). The transport now
reads each export out of the page in 4 MiB slices and decodes each straight
into the file, and the bridge's wait grows by a second for each MiB of file
a command receives.

Issue #100 export result (2026-09-17, Google Chrome 153.0.8010.48): the
opt-in `test/editor/photopea-large-export.integration.test.ts` reaches
installed Chrome over `connectOverCDP`, as a hosted session is reached. It
opened a generated 6000x6000 JPEG, the largest image FR-1 allows, added one
full-size layer over the original, as a retouch leaves, and exported it
through the production session in the loop's order. The 326,811,965-byte
PSD, 311.7 MiB, matched the digest taken in the page. Each of the two PSD
exports, the second after the copied layer was renamed, took about 4.9
seconds from the request to its last byte, about two of them Photopea
building the file, and the whole export took 13.5 seconds. Before the
change the same test failed within 10.5 seconds, reported as a Photopea
timeout.

The export raised the test process's resident memory from 527 MiB to a
peak of 1,585 MiB: about 1.1 GiB, or 3.4 times the file. The exporter and
the session each hand out copies of the file, and the collector reclaims
what a read leaves behind late. Before slices were decoded in place and
the exporter dropped two copies of its own, the peak was 2,188 MiB. Each
further full-size layer at 6000x6000 adds about 100 MiB to the file. The
deploy set no memory, which on Cloud Run defaults to 512 MiB, too little to
hold this file once, so the service now runs with 4 GiB. The hosted
browser's own memory and a hosted connection's transfer rate remain
unmeasured.

B0 no longer gates anything. It was written when the licence question
was open; it is
[answered](PRODUCT.md#open-questions), and what is left of B0 is a
purchase with a signup lead time. Nobody should re-litigate the terms
on day 0, and nobody should reach for the kill switch over them.

A0 and A4 are the two that can still change the plan, which is why both
are day-0 despite being short.

**B1 result, September 15:** passed. The retained run reports a 13,442-byte JPEG
sent through `postMessage` and preserves the exact input plus its 1,412,711-byte
PSD with two named layers, `Original photograph` and `Retouched copy`. The
`8BPS` signature, 640x480 dimensions, and both layer names were verified with
`ag-psd` 30.2.0. The captured sequence is the deliberately misleading `"done"`,
the PSD bytes, the unique sentinel, and the real completion `"done"`; the host
logic and tests show why only the exact sentinel completes the wait. Adobe
Photoshop 2026 version 27.10.0 opened the same PSD without a warning dialog and
displayed both named layers. The
[B1 evidence bundle](/docs/evidence/photopea-round-trip/README.md) retains the
exact input, scripts, outputs, hashes, trap results, timing definitions, and the
structured Photoshop observation.

## See also

- [Product brief](PRODUCT.md) — why this, and when we stop.
- [Product requirements](PRD.md) — the `FR` and `NFR` numbers cited here.
- [Architecture decisions](/docs/decisions/README.md) — why durable boundaries
  were chosen.
- [Evidence](/docs/evidence/README.md) — the measurements and live runs
  behind the spikes.
- [Git workflow](/docs/references/git-workflow.md) — how changes land.
