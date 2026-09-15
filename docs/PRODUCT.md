# Product: Layerhand

Why we are building an agent that retouches photographs by operating a
real image editor, and hands back a layered file instead of a flat one.
This is the strategy document: the problem, the wedge, the business
model, and the conditions under which we stop. What to build is in the
[PRD](PRD.md); how to build it is in the [TRD](TRD.md).

Contents:

1.  [The problem](#the-problem)
1.  [Who it is for](#who-it-is-for)
1.  [What Layerhand is](#what-layerhand-is)
1.  [Why this is only possible now](#why-this-is-only-possible-now)
1.  [The wedge: The artifact, not the pixels](#the-wedge-the-artifact-not-the-pixels)
1.  [Competition](#competition)
1.  [Business model](#business-model)
1.  [Non-goals](#non-goals)
1.  [Success criteria](#success-criteria)
1.  [Risks and the kill switch](#risks-and-the-kill-switch)
1.  [Open questions](#open-questions)
1.  [See also](#see-also)

## The problem

Commercial photo retouching is a job that a skilled person does by hand,
inside a dense professional GUI, one image at a time. E-commerce and
real-estate pipelines buy it by the image, and the work is repetitive:
cut the product out, even the exposure, kill the reflections, warm the
highlights, keep the shadow.

Almost every AI tool aimed at this work returns a flattened image. That is
fine until the client asks for one more change — and the client always
asks for one more change. A flat JPEG cannot absorb that request. The
retoucher starts again, or opens the original and redoes the work by
hand. The AI saved nothing, because it did not produce the thing the
workflow actually runs on: an editable document.

The gap is not quality. It is **the format of the output**.

## Who it is for

The first user is someone who already pays for retouching and already
works in layers.

1.  **E-commerce photo teams.** Catalogue shoots with hundreds of
    near-identical product images. Retouching is a line item with a
    known per-image price, and revisions are routine.
1.  **Real-estate photographers.** High volume, fast turnaround, a
    house style per client, and constant small corrections.
1.  **Freelance retouchers.** The people whose deliverable is already a
    PSD, and who are the harshest judges of whether the layer stack is
    usable or merely present.

We are not aiming at consumers. A consumer does not want a PSD, and the
unit economics do not survive a free consumer tier.

## What Layerhand is

Layerhand takes a photograph and an instruction in plain language, and
drives [Photopea](https://www.photopea.com/) — a full-featured web
image editor with no public API — to do the work. You watch
it happen in your browser. You can type a correction while it is still
working, and it bends rather than restarting. When it finishes, you
download a layered file — named layers, editable masks, adjustment
layers — that opens in Photoshop, Affinity, GIMP, or back in the editor
it was made in.

Three properties, in order of importance:

1.  **The output is editable.** This is the product.
1.  **The work is visible.** You see the editor being operated, which
    is both the trust mechanism and the demo.
1.  **The work is steerable.** You correct it mid-run, the way you
    would correct a junior retoucher standing next to you.

## Why this is only possible now

GPT-6 Astra scores 72.6% on OSWorld V2-Offline against 65.7% for the
previous generation. That difference is the difference between an agent
that can hold a forty-step GUI task together and one that cannot.
Retouching a single image in a real editor is a forty-step GUI task.

Swap Astra for any other current model and the product does not get
worse — it stops existing. The agent cannot drive the editor to
completion, so there is no layered file at the end, so there is no
product. That is the test this idea was selected on, and it is the only
one of the six shortlisted ideas that passes it outright. See
[the pick](ideation.md#the-pick-layerhand).

Astra also supplies the second and third properties directly:
**mid-turn steering** over a persistent connection is what makes the
correction land without discarding completed work, and screenshot-driven
computer use is what makes the run watchable.

There is an irony worth stating plainly, because it is the creative core
of the idea: **Astra cannot generate an image.** It is text-output only.
It makes one by operating an image editor — and that constraint is
exactly why the output is a document rather than a picture.

## The wedge: The artifact, not the pixels

Nearly every competing product in this space emits pixels. A diffusion model
cannot emit a layer stack at any quality, because a layer stack is not
an image — it is an edit history. No amount of model improvement closes
that gap, because it is a difference in kind.

So the pitch is not "better retouching." It is:

> AI retouching that returns a layered PSD, not a flat JPEG.

That sentence is the product, the tagline, and the demo. If a viewer
understands only one thing, it should be that the thing they get back is
still theirs to edit.

## Competition

A survey of twenty-six products, checked against their own format enums
and documentation rather than against comparison articles, and a
follow-up on the four products it could not settle.

### The claim, corrected

"Every AI photo tool hands you pixels" is **not true**, and the version
of this document that said so was wrong.

| Product                                                   | Returns a layered file?                                                                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Adobe Photoshop API v2                                    | **Yes.** Named, adjustment, smart-object, group layers, and pixel masks                                                                  |
| Adobe Firefly Creative Production                         | **Yes.** The image on a masked layer, one layer per background, and a colour-decontamination layer. No adjustment layers documented      |
| BRIA AI                                                   | **Yes, raster only.** A background layer, a foreground layer, and one layer per object. No masks, names, or adjustment layers documented |
| Pixelz                                                    | **Yes, contents undocumented.** "A PSD complete with layers" as an extra output, from AI and human editors                               |
| Retouch4me                                                | **Partly.** Real Photoshop layers and masks, user's choice of separate or merged. No adjustment layers                                   |
| autoRetouch                                               | **Partly.** Background removal exports cut-out layers, optionally masked. Every other step exports one flat layer                        |
| Photoroom, Clipdrop, Pixelcut, Claid, Pixelbin, remove.bg | No. PNG, JPEG, WebP                                                                                                                      |
| Evoto, Imagen AI, Aftershoot                              | No. Flat, or Lightroom XMP sidecars                                                                                                      |
| BoxBrownie and the real-estate tools                      | No. Flat                                                                                                                                 |

What is left of the gap is narrower and more specific than the pitch:
**no self-serve product is known to deliver an automated, single-pass
PSD that is named _and_ masked _and_ carries adjustment layers.** Adobe's
API can, for whoever signs an enterprise contract. Adobe's self-serve
plans already return a masked PSD, so a mask sets nothing apart, and
BRIA's PSD is raster layers with no documented masks at all. What
remains is adjustment layers and human layer names, which no self-serve
product documents. It is not the gap we said it was.

### Adobe is the serious threat, and it is already shipped

`/v2/execute-actions` runs Photoshop Actions server-side — arbitrary
`.atn` files, Generative Fill included — and `/v2/create-composite`
returns a layered PSD. No browser, no GUI, no screenshots. Adobe solved
with an HTTP endpoint the problem this product's entire architecture
exists to work around.

The only thing standing between that API and anyone who wants it is an
**enterprise contract**: Firefly Services access is arranged through an
Adobe representative and the rate card is private. That is a commercial
moat, not a technical one, and Adobe can remove it whenever it decides
to open a self-serve tier.

It has started to. Since October 28, 2025, Adobe's paid plans with
premium generative features have included Firefly Creative Production's
Remove Background preset, which runs in bulk and can return a layered
PSD for 40 generative credits an output. Adobe's enterprise help puts the
image on a masked layer in that file, over one layer per background. The
rest of Creative Production still needs an enterprise plan.

### The price ceiling is the real problem

Human retouching, from published price lists:

| Work                    | Price     | Turnaround |
| ----------------------- | --------- | ---------- |
| Clipping path           | **$0.39** | 6–96 h     |
| Product retouching      | **$0.69** | 24 h       |
| Ghost mannequin         | $0.89     | 24 h       |
| Real-estate enhancement | $2.00     | 24 h       |

At **$3.50 of model spend per image**, we are five to nine times the
price of a human doing the same job, and roughly two hundred times the
$0.018 BRIA charges to remove a background. The premise that
"retouching is a real line item" is true and cuts against us: the line
item is already small, and AI has compressed it further.

### And the demand signal is missing

Across thirteen retouching outsourcers with published pricing, **not
one markets layered-PSD delivery as a named or priced deliverable.**
The single vendor where layered files provably exist mentions them only
in a refund clause. The nearest thing to an exception is Pixelz, whose
help centre offers "a PSD complete with layers" as an extra output on an
order without saying what the layers are. What photographers complain
about is consistency and rework, not layers — which argues for a
deterministic pipeline with quality control, roughly the opposite of an
agent working by eye.

This does not make the idea worthless. It makes the "who pays" story in
the next section a hypothesis that the evidence currently contradicts,
and it belongs in
[risks](#risks-and-the-kill-switch) rather than in a slide.

## Business model

Metered credits, with a small free allowance. Not a subscription, and
never unmetered.

A session is forty to sixty screenshot-driven steps. Each step sends
the history again, so cost is quadratic in the step count: at 1,570
tokens per 1440x900 screenshot, forty steps send roughly **1.3M input
tokens cumulatively**, plus around 30K of output.

That gives two very different answers, and which one we get is an
engineering outcome rather than a pricing decision:

|                 | Input  | Output | **Per image** |
| --------------- | ------ | ------ | ------------- |
| Caching working | ~$2.00 | $1.50  | **~$3.50**    |
| Caching broken  | ~$13   | $1.50  | **~$14.50**   |

We plan at **$6** — headroom over the good case, nowhere near the bad
one — and treat anything above $8 as a bug rather than a bill.

Note what is _not_ a problem: the 2x tier above 272K input tokens is
charged per request, and a single request tops out near 63K. We never
approach it. The danger is cumulative, not per-request.

Three consequences, all of them product decisions rather than
engineering details:

1.  **Hard-cap the step count.** The cap is a product parameter, not a
    safety valve. A run that hits it returns whatever it has, layered.
1.  **Cache aggressively.** This is a 4x swing in unit cost, not a
    tuning exercise, and it is the difference between a viable product
    and one that loses money on every image.
1.  **Never offer it unmetered.** Three free images, then credits, or
    bring-your-own-key. A single enthusiastic user on launch day must
    not be able to cost us fifty dollars — and at $3.50 an image that
    is fourteen images, which is not a lot of enthusiasm.

Bring-your-own-key is also the release valve for launch-day traffic: it
decouples our cost from our popularity on the one day popularity spikes.

## Non-goals

Stated so that nobody builds them in the six build days available.

- **No image generation.** We retouch what you upload.
- **No batch pipeline, no API, no integrations.** One image at a time,
  through the web app.
- **No accounts beyond what metering requires.** No teams, no sharing,
  no history, no projects.
- **No mobile layout.** The demo is a desktop editor being driven.
- **No editor of our own.** We drive somebody else's.
- **No style profiles or presets.** A per-client house style is the
  obvious second product. It is not the first one.

## Success criteria

The contest is judged on a launch, so the launch is the deliverable.

**Must be true to launch at all:**

1.  A stranger can upload an image, watch the run, interrupt it once,
    and download a layered file that opens correctly in Photoshop.
1.  That works unattended on **eight of ten** runs against our own test
    set, which is [NFR-1](PRD.md#non-functional-requirements) and the
    number the launch decision turns on. The day-2 go/no-go asks less:
    one scripted three-edit sequence (see [risks](#risks-and-the-kill-switch)).
1.  The thirty-second silent demo exists and shows the mid-run
    correction and the hand-dragged mask.

**Judged well if:**

1.  A viewer who watches the demo without sound can state the
    differentiator afterwards.
1.  The layer stack survives a professional retoucher's inspection —
    named, sensibly ordered, actually editable, not seven copies of the
    same raster.

**Contest outcome**, against the four inferred criteria: model leverage
is the reason to build this at all, and creativity follows from the
inversion. Execution is the weak score, and it is the one thing six
days of work can move.

## Risks and the kill switch

Ranked by how likely they are to end the project.

1.  **The commercial case does not survive the survey.** This moved to
    the top after the research and it is the one to answer first. Humans
    retouch a product image for $0.39–$0.69; BRIA removes a background
    for $0.018; Adobe's paid plans return a masked, layered PSD in bulk,
    and its API does the whole job server-side for whoever signs a
    contract; and no outsourcer surveyed sells layered delivery as a
    priced deliverable. We cost $3.50 an image. Every one of those is
    sourced in [competition](#competition).

    **This is a decision, not a risk to monitor**, and it comes before
    the day-2 technical gate because no amount of engineering answers
    it. Three honest readings:

    - _Build it as a contest entry._ The contest is judged on model
      leverage, execution, creativity and impact — not on beating the
      market price. The Swap Test still passes: no other model drives
      the GUI. Say plainly that it is a demonstration, and stop
      claiming a market the evidence contradicts.
    - _Repoint it at the gap that is actually empty._ No self-serve product
      is known to ship named **and** masked **and** adjustment-layered
      output in one pass. Adobe already ships the mask, so the gap is
      adjustment layers and names. That is narrow and defensible — but it
      is a different product brief from this one.
    - _Take the runner-up._ The kill switch below already names it.

1.  **Reliability of long GUI control.** Forty-plus steps in a dense
    professional interface, unattended, on an image the agent has never
    seen. This is the whole technical bet.
1.  **Cost per run under real traffic.** Bounded by the step cap and
    metering, but the cap has to be set from measured runs.
1.  **The scripting escape hatch.** Photopea exposes a
    Photoshop-compatible scripting interface, which is exactly the
    shortcut a deadline pushes you towards. Taking it for the
    _retouching decisions_ — rather than for loading and exporting —
    would mean any model could do the job, and the one thing this idea
    was selected for would be gone. The
    [TRD draws that line](TRD.md#the-line-that-protects-the-premise);
    holding it is a discipline problem, not a technical one.
1.  **No audience.** The launch mechanics are unforgiving and we have
    no waitlist. Treated as a build task with an owner, not an
    afterthought.

**Two gates, in order.**

_The commercial gate, now._ Risk 1 is answered before anyone writes
code, because it decides which product the code is for. It is the one
decision on this page that evidence alone does not settle.

_The technical gate, end of day Monday, September 14._ The agent must
complete a scripted three-edit sequence unattended, end to end, and
produce a layered file. If it cannot, we stop and ship the whole-corpus
contradiction finder instead — the runner-up needs no browser
infrastructure, no agent loop, and one weekend. That decision is made
once, on the evidence, and not revisited on optimism.

Note what the survey did **not** damage. The Swap Test still passes:
swap Astra out and the agent cannot drive the editor, so there is no
product. Adobe's API does not weaken that — it removes the need for an
agent at all, which is an argument about whether to build this, not
about whether Astra is load-bearing in it.

## Open questions

Each is assigned and answered before it can block work.

1.  ~~Does the editor's licence permit automated and commercial use?~~
    **Answered: yes.** Photopea's terms say it "can be used by anyone
    for any purpose, for free," carry no clause about bots or
    automation, and permit selling the resulting work. What remains is
    commercial rather than legal: free embedding shows advertisements,
    and removing them needs a Distributor account from €60 a month.
1.  ~~Does any existing product return a layered file?~~ **Answered:
    yes, six do, two of them only in part.** ~~Is there a first-party
    server-side editing API?~~ **Answered: Adobe's, and it is GA.** Both
    are written up in [competition](#competition), and together they are
    why risk 1 exists.
1.  What are the official contest rules? **The deadline is answered; the
    rest needs a person.** The contest runs on Friday, September 18 PT
    alone. Submissions close at 12:00am PT that day, 07:00 UTC, and a
    launch enters only if it is scheduled for the 18th and joined to the
    challenge, which is a separate choice when scheduling. Every source
    for that is quoted in
    [the schedule change](https://github.com/M1KUAPP/astra/pull/69).

    The rules themselves are not published. They were looked for twice on
    September 15 in a logged-in browser: the contest page gives the prize,
    the date and a countdown, and links no terms but Product Hunt's
    site-wide ones. What is left sits behind the submission form, which is
    part of the submission flow, so a person opens it rather than an
    agent. Seven questions wait on that: whether a public repository is
    required; whether an open-source licence is; whether a demo video is,
    and how long it may run; any team-size limit; any region restriction;
    any age restriction; and the IP terms. This repository is private and
    unlicensed, so the first two would be blockers with a lead time, which
    is why [#23](https://github.com/M1KUAPP/astra/issues/23) stays open
    rather than being answered by inference.

1.  Where does the launch-day audience come from?

## See also

- [Product requirements](PRD.md) — what to build, and in what order.
- [Technical requirements](TRD.md) — how it is built.
- [Ideation](ideation.md) — the ten rounds this was selected from.
- [GPT-6 Astra Challenge](https://www.producthunt.com/contests/gpt-6-astra-challenge)
