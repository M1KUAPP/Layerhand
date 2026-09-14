# PRD: Layerhand

What Layerhand must do, in what order, and how we will know it works.
The reasoning behind these choices is in the [product brief](PRODUCT.md);
the implementation is in the [TRD](TRD.md).

Requirements are numbered so that issues, commits, and tests can cite
them. `FR` is functional, `NFR` non-functional. Priorities are **P0**
(the launch does not happen without it), **P1** (the launch is poor
without it), and **P2** (after the launch, if at all).

Contents:

1.  [Schedule](#schedule)
1.  [The core flow](#the-core-flow)
1.  [Functional requirements](#functional-requirements)
1.  [Non-functional requirements](#non-functional-requirements)
1.  [Launch acceptance](#launch-acceptance)
1.  [Deliberately excluded](#deliberately-excluded)
1.  [See also](#see-also)

## Schedule

Launch is **Friday, September 18, 2026 at 12:01am PT**, which is the
contest deadline and gives the full twenty-four-hour ranking window.
Everything must be frozen the evening of Thursday the 17th.

| Day           | Date   | What must be true at the end of it                  |
| ------------- | ------ | --------------------------------------------------- |
| 0 — Saturday  | Sep 12 | Specs agreed, repo scaffolded, spike running        |
| 1 — Sunday    | Sep 13 | Agent completes one edit unattended                 |
| 2 — Monday    | Sep 14 | **Go/no-go.** Three-edit sequence, layered file out |
| 3 — Tuesday   | Sep 15 | End-to-end through the web app                      |
| 4 — Wednesday | Sep 16 | Steering works; metering works; deployed            |
| 5 — Thursday  | Sep 17 | Frozen. Demo recorded, launch assets done           |
| 6 — Friday    | Sep 18 | Launch at 12:01am PT                                |

The 2026 launch playbooks put the optimal slot on a Tuesday or
Wednesday, and Friday is outside that window — how far outside, we have
not established. Wednesday the 16th would cost two of six build days;
Tuesday the 15th would cost three, and since the schedule freezes the
evening before launch, it would mean freezing on the evening of the
go/no-go itself — no gap at all between proving the thing works and
shipping it. We take the build days.

The contest, not the daily rank, is what is being won. But a launch
nobody sees gives the judges nothing to look at, so
[FR-30](#launch-surface) is not optional.

The go/no-go on day 2 is described in
[risks and the kill switch](PRODUCT.md#risks-and-the-kill-switch). It is
a scheduled decision with a stated fallback, not a status check.

## The core flow

One screen. No navigation. A stranger arrives, and:

1.  Sees a short silent loop of a previous run, already playing.
1.  Drops in a photograph.
1.  Types what they want in plain language.
1.  Presses the button and **watches the editor being operated**.
1.  Types a correction while it is still working, and sees the next
    actions bend rather than restart.
1.  Gets a finished image, and a list of the layers behind it.
1.  Downloads a `.psd` and opens it in their own tool.

Step 5 is the product. If it is buried, hard to reach, or feels like a
restart, the demo has no centre and the launch has no hook.

## Functional requirements

### Input

- **FR-1 (P0).** Accept a single image by drag-and-drop or file picker.
  JPEG and PNG, up to 20 MB and 6000 px on the long edge.
- **FR-2 (P0).** Accept a free-text instruction of up to 500 characters
  alongside the image.
- **FR-3 (P0).** Reject anything else with a specific message naming
  the reason — not a generic failure.
- **FR-4 (P1).** Offer three worked example instructions that fill the
  box on click, so a visitor who does not know what to ask can start.
- **FR-5 (P1).** Ship one sample image that can be tried without
  uploading anything, for visitors who arrive without a photograph.

### The run

- **FR-10 (P0).** Show the editor being operated, live, at no worse
  than one frame every two seconds and no more than three seconds
  behind the real session.
- **FR-11 (P0).** Show progress as a step count against the cap, and
  the current action in plain words ("selecting the background"), not
  raw tool calls.
- **FR-12 (P0).** Stop at the step cap and return whatever exists at
  that point, layered, labelled as incomplete. Never run unbounded.
- **FR-13 (P0).** Let the user cancel at any point and keep the
  partial result.
- **FR-14 (P0).** Survive a page reload: reconnecting to a run in
  progress resumes the live view rather than starting over or
  orphaning the session.
- **FR-15 (P1).** Show the running cost of the session in credits.
- **FR-16 (P2).** Keep a per-user history of past runs. The
  [non-goals](PRODUCT.md#non-goals) rule out both history and accounts,
  so it waits until those are revisited after launch.

### Steering

- **FR-20 (P0).** Accept a typed correction while the run is in
  progress, and apply it to subsequent actions without discarding
  completed work.
- **FR-21 (P0).** Acknowledge the correction visibly within three
  seconds of it being sent, so the user knows it landed.
- **FR-22 (P1).** Show accepted corrections in a visible list for the
  rest of the run.
- **FR-23 (P2).** Allow a correction that undoes work already done.

### Output

- **FR-25 (P0).** Produce a `.psd` that opens without error or warning
  in Photoshop, Affinity Photo, and GIMP.
- **FR-26 (P0).** Every layer is named in human words describing what
  it does. No `Layer 1`, no `copy 3`.
- **FR-27 (P0).** Masks and adjustment layers remain editable — moving
  a mask or changing an adjustment must visibly change the image.
- **FR-28 (P0).** Offer a flattened PNG preview alongside the `.psd`,
  because the first thing anyone does is look at it.
- **FR-29 (P1).** List the layers in the page after the run, so the
  differentiator is visible without downloading anything.

### Launch surface

- **FR-30 (P0).** A public landing page that states the differentiator
  above the fold and plays the demo loop without sound.
- **FR-31 (P0).** An email capture on that page, live and collecting
  before launch day.
- **FR-32 (P1).** A thirty-second silent demo recording, usable as-is
  on Product Hunt.
- **FR-33 (P1).** Product Hunt assets: tagline, description, gallery
  images, first maker comment.

### Metering

- **FR-35 (P0).** Three free runs per visitor, then refusal with an
  explanation. Enforced server-side.
- **FR-36 (P0).** Accept a user-supplied OpenAI API key as an
  alternative to the free allowance, stored only for the session and
  never written to disk or logs.
- **FR-37 (P0).** A global daily spend ceiling that stops all
  free-allowance runs when crossed, with a stated message rather than
  an error.
- **FR-38 (P2).** Paid credit top-ups.

## Non-functional requirements

- **NFR-1 (P0) — Reliability.** Eight of ten runs on the internal test
  set complete unattended and produce a valid layered file. Measured,
  not estimated, and re-measured the evening of day 5.
- **NFR-2 (P0) — Cost.** No single run exceeds $8 of model spend. The
  step cap is set from measurement, not chosen.
- **NFR-3 (P0) — Latency.** A run starts within five seconds of the
  button, so the live view fills the screen before attention leaves.
- **NFR-4 (P0) — Concurrency.** Twenty simultaneous runs without
  queueing; beyond that, a queue with a stated position rather than a
  failure.
- **NFR-5 (P0) — Secrets.** No API key of ours reaches the browser. A
  user-supplied key is never logged, never persisted, and never sent
  anywhere but OpenAI.
- **NFR-6 (P1) — Uploads.** Uploaded images are deleted within
  twenty-four hours, and that is stated on the page.
- **NFR-7 (P1) — Legibility.** The page works at 1280 px and above.
  Mobile is out of scope; below that width, say so rather than
  breaking.
- **NFR-8 (P1) — Observability.** Every run records its step count,
  token spend, outcome, and failure reason, queryable during launch
  day.

## Launch acceptance

The launch happens only if every line below is true on the evening of
Thursday, September 17. Each is checked by someone who did not build it.

1.  A stranger, unprompted and unassisted, completes the core flow and
    opens the resulting `.psd` in Photoshop.
1.  NFR-1 holds on a fresh measurement that day.
1.  A mid-run correction demonstrably changes the outcome, twice in a
    row, on different images.
1.  The step cap, the free allowance, and the daily ceiling have each
    been tested by actually hitting them.
1.  The demo recording exists, is under thirty seconds, and reads
    without sound.
1.  The landing page is live on its own domain with email capture
    working.
1.  Someone has read the official contest rules and confirmed we meet
    them.

Point 7 is unresolved as of writing: the rules are behind a login wall.
It is an
[open question](PRODUCT.md#open-questions) with an owner, and it gates
the launch rather than following it.

## Deliberately excluded

The [non-goals](PRODUCT.md#non-goals) in the product brief are binding
on this document. In addition, and specific to requirements:

- No accounts, passwords, or sign-in. The free allowance is enforced
  without identity.
- No editing in our own interface. We show the run and hand back a
  file.
- No undo of a completed run.
- No formats other than `.psd` on output.
- No internationalisation.

## See also

- [Product brief](PRODUCT.md) — why this, and when we stop.
- [Technical requirements](TRD.md) — how it is built.
- [Git workflow](reference/git-workflow.md) — how changes land.
