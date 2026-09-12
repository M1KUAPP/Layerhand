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
1.  [The wedge: the artifact, not the pixels](#the-wedge-the-artifact-not-the-pixels)
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

Every AI tool aimed at this work returns a flattened image. That is
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
drives a real, full-featured web image editor to do the work. You watch
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
[the pick](producthunt-ideas.md#the-pick-layerhand).

Astra also supplies the second and third properties directly:
**mid-turn steering** over a persistent connection is what makes the
correction land without discarding completed work, and screenshot-driven
computer use is what makes the run watchable.

There is an irony worth stating plainly, because it is the creative core
of the idea: **Astra cannot generate an image.** It is text-output only.
It makes one by operating an image editor — and that constraint is
exactly why the output is a document rather than a picture.

## The wedge: the artifact, not the pixels

Every competing product in this space emits pixels. A diffusion model
cannot emit a layer stack at any quality, because a layer stack is not
an image — it is an edit history. No amount of model improvement closes
that gap, because it is a difference in kind.

So the pitch is not "better retouching." It is:

> AI retouching that returns a layered PSD, not a flat JPEG.

That sentence is the product, the tagline, and the demo. If a viewer
understands only one thing, it should be that the thing they get back is
still theirs to edit.

## Competition

The market splits into three groups, and none of them returns a layered
document.

1.  **One-shot AI image tools** — background removal, generative fill,
    upscaling. Fast, cheap, flat output. They win on price per image and
    lose the moment a revision is needed.
1.  **Batch retouching services** for photographers. Profile-driven,
    high volume, flat output, priced per image.
1.  **Human retouching outsourcers.** They do return layered files, and
    that is precisely the evidence that the layered file is what the
    market wants. They are slow and cost meaningfully more per image.

Layerhand sits in the empty cell: machine speed with a human-shaped
deliverable.

The serious threat is not another agent. It is a first-party server-side
editing API that makes driving a GUI unnecessary — the differentiator
would survive, since the output would still be layered, but the model
leverage story would not, and the model leverage story is what this was
selected for. Quantifying that threat is an open question below.

## Business model

Metered credits, with a small free allowance. Not a subscription, and
never unmetered.

A session is forty to sixty screenshot-driven steps, accumulating
roughly 400K input tokens — mostly cached — and around 30K output. At
$10/M input, $1/M cached, and $50/M output, one image lands near **$3–6
of model spend**, and we plan against the top of that range. Overage
past 272K input tokens costs 2x, which a long session will cross.

Three consequences, all of them product decisions rather than
engineering details:

1.  **Hard-cap the step count.** The cap is a product parameter, not a
    safety valve. A run that hits it returns whatever it has, layered.
1.  **Cache aggressively.** Cached input is a tenth the price of fresh
    input, and the screenshot loop is the entire cost.
1.  **Never offer it unmetered.** Three free images, then credits, or
    bring-your-own-key. A single enthusiastic user on launch day must
    not be able to cost us fifty dollars.

Bring-your-own-key is also the release valve for launch-day traffic: it
decouples our cost from our popularity on the one day popularity spikes.

## Non-goals

Stated so that nobody builds them in the five days available.

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
1.  That works unattended, three times out of four, on our own test set
    of ten images.
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
inversion. Execution is the weak score, and it is the one thing five
days of work can move.

## Risks and the kill switch

Ranked by how likely they are to end the project.

1.  **Reliability of long GUI control.** Forty-plus steps in a dense
    professional interface, unattended, on an image the agent has never
    seen. This is the whole bet.
1.  **Terms of use of the editor we drive.** We do not control it, and
    automated use may not be permitted. This is a legal gate, not a
    technical one, and it is checked before anything is built on top.
1.  **Cost per run under real traffic.** Bounded by the step cap and
    metering, but the cap has to be set from measured runs.
1.  **No audience.** The launch mechanics are unforgiving and we have
    no waitlist. Treated as a build task with an owner, not an
    afterthought.

**The kill switch.** By end of day Monday, September 14, the agent must
complete a scripted three-edit sequence unattended, end to end, and
produce a layered file. If it cannot, we stop and ship the
whole-corpus contradiction finder instead — the runner-up needs no
browser infrastructure, no agent loop, and one weekend. That decision
is made once, on the evidence, and not revisited on optimism.

## Open questions

Each is assigned and answered before it can block work.

1.  Does the editor's licence permit automated and commercial use, and
    at what tier?
1.  Is there a first-party server-side editing API that does this work
    without a GUI, and what does it cost?
1.  What are the official contest rules? They sit behind a login wall
    and we have not read them. Specifically: is a public repository or
    an open-source licence required, and is a demo video required?
1.  Where does the launch-day audience come from?

## See also

- [Product requirements](PRD.md) — what to build, and in what order.
- [Technical requirements](TRD.md) — how it is built.
- [Product Hunt ideas](producthunt-ideas.md) — the ten-round ideation
  this was selected from.
- [GPT-6 Astra Challenge](https://www.producthunt.com/contests/gpt-6-astra-challenge)
