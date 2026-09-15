# Ideation: GPT-6 Astra Challenge

Ten rounds of ideation for the OpenAI × Product Hunt GPT-6 Astra
Challenge, run September 12, 2026 using the `astra-challenge` skill.

**Days remaining: 6.** Entries must launch on Product Hunt by September 18.
Launching at 12:01am PT on the 18th to get the full 24-hour window leaves
five working days to build. The [PRD schedule](PRD.md#schedule) counts
six build days, September 12 to 17, and is the one to plan against. Scope
killed more ideas below than any other gate.

**Rubric caveat.** OpenAI published no judging criteria for this contest.
Every score here is against the four equally-weighted WebMCP Challenge
criteria — model leverage, execution, potential impact, creativity &
ambition — plus launch legibility and showcase-ability. That is an
inference from OpenAI's nearest comparable contest, not a stated bar.

Each round picks capability primitives, generates without filtering, runs
the Swap Test, then the kill gates. Rounds are progressive: each one is
shaped by what the previous round killed.

Contents:

1. [Round 1 — Computer use, desktop-native](#round-1--computer-use-desktop-native)
1. [Round 2 — Computer use, hosted browser only](#round-2--computer-use-hosted-browser-only)
1. [Round 3 — Million-token single-pass context](#round-3--million-token-single-pass-context)
1. [Round 4 — Async tool calling](#round-4--async-tool-calling)
1. [Round 5 — Mid-turn steering](#round-5--mid-turn-steering)
1. [Round 6 — Persisted reasoning and notes](#round-6--persisted-reasoning-and-notes)
1. [Round 7 — Programmatic tool calling and orchestration](#round-7--programmatic-tool-calling-and-orchestration)
1. [Round 8 — WebMCP](#round-8--webmcp)
1. [Round 9 — Computer use × mid-turn steering](#round-9--computer-use--mid-turn-steering)
1. [Round 10 — The five-day filter, and the text-only inversion](#round-10--the-five-day-filter-and-the-text-only-inversion)
1. [Shortlist](#shortlist)
1. [The pick: Layerhand](#the-pick-layerhand)
1. [Launch artifact](#launch-artifact)
1. [Before committing](#before-committing)

## Round 1 — Computer use, desktop-native

_Primitive: computer use on real desktop software._

Astra drives a DAW as a mixing engineer · drives Premiere or DaVinci
Resolve · drives SAP GUI · files through government permit portals ·
operates microscope and chromatography control software · drives KiCad or
Altium · drives QGIS · drives QuickBooks Desktop · drives a 3D-printing
slicer · drives legacy dental and medical practice software.

**Swap Test:** nearly all pass. At 65.7% OSWorld, the previous generation
cannot hold a 40-step GUI task together; the product does not function.

**Kill gate: scope.** Every one of these requires a fleet of hosted
desktop VMs with licensed software for strangers to use. Not in five days.
Crowding also removes CAD and Blender — both already won the Astra
Hackathon.

**What the round taught.** Computer use is simultaneously the highest-
leverage primitive and the best silent GIF in existence, and desktop
hosting is what makes it unshippable. Every later round tries to keep the
first half and drop the second.

## Round 2 — Computer use, hosted browser only

_Same primitive, retargeted to remove the VM fleet._

An agent that files bureaucratic forms (visas, FOIA, unclaimed property) ·
fights insurance claim denials through insurer portals · cancels
subscriptions and negotiates bills · does competitive teardowns by
actually using rivals' products · runs QA on your web app by using it like
a user · applies to jobs · works vendor procurement portals · audits
accessibility by operating a site keyboard-only · reproduces bug reports
from support tickets · mystery-shops competitor checkout flows.

**Swap Test:** the long-horizon ones pass. Single-form fills do not — a
weaker model handles one form fine.

**Kill gate: crowding.** Subscription cancellation, bill negotiation, and
job applications are each an existing startup category. AI QA has a dozen
funded entrants. These score well on impact and near-zero on creativity.

**What the round taught.** Hosted-browser computer use is the scope fix,
but pointing it at _services_ lands in crowded markets. Point it at
_software_ instead.

## Round 3 — Million-token single-pass context

_Primitive: 1,050,000-token context, no RAG, no chunking._

Analyze an entire legislative session · answer cross-cutting questions
over a company's full Slack and Notion history · build a timeline from a
complete discovery dump · diff a year of city council minutes · find the
recurring root cause across a repo's whole issue history · check an
implementation against a full standards family · reconcile medical records
from every provider · track narrative drift across every earnings call
since IPO · run a continuity pass on a novel manuscript · check drawings
against a full building code.

**Swap Test:** this is where the round earns its keep. "Answer a question
about the corpus" is **dead** — RAG does that acceptably, so the honest
answer is "slightly worse." "Find what contradicts itself across the whole
corpus" **passes**, and passes hard.

**What the round taught.** Retrieval needs a query. Inconsistency has no
query — you cannot retrieve the contradiction because you do not know what
to search for. So the million-token context only clears the Swap Test for
_inconsistency_ tasks, never for _question-answering_ tasks. That is the
line between this and the "chat with your docs" products already on the
weak-by-construction list.

## Round 4 — Async tool calling

_Primitive: `async: true`, keep reasoning while a slow tool runs._

A render-farm director · FEA and CFD parameter sweeps · bioinformatics
pipelines · CI triage while the suite is still running · lab instrument
control · reasoning during long Rust and C++ builds · video transcode
pipelines · training sweeps · multi-hour crawls · DFT chemistry jobs.

**Swap Test: dead, categorically.** Async tool calling is an ergonomics
win in your orchestration layer. A competitor can hand-roll the same
behavior with a job queue, and the user cannot tell the difference.

**What the round taught.** Apply the Swap Test to _user-visible behavior_,
never to the implementation. A primitive nobody can feel is not leverage —
and judges score the product, not the request payload.

## Round 5 — Mid-turn steering

_Primitive: send new instructions while Astra is working, over a
WebSocket, without discarding completed work._

Redirect a design tool mid-generation · steer a document as it drafts ·
narrate at a 3D scene builder while it builds · redirect an analysis
mid-analysis · steer a video assembly · steer a music arrangement · steer
a refactor in flight · redirect a research agent mid-crawl · build slides
conversationally · steer level generation.

**Swap Test: passes, and passes visibly.** Everywhere else, changing your
mind means cancel and re-prompt, and four minutes of finished work goes in
the bin. Users do not tolerate that twice. The difference is not output
quality — it is whether the interaction model exists at all.

**What the round taught.** This is the second survivor, and the only one
besides computer use that a user _feels_. It needs two things to matter: a
generation long enough to be worth interrupting, and an artifact visible
enough that you can see it going wrong.

## Round 6 — Persisted reasoning and notes

_Primitive: notes that survive context pressure instead of compacting._

An incident commander spanning a multi-day outage · a migration co-pilot ·
a weeks-long audit · a legal-matter second brain · a heisenbug hunt · a
dissertation partner · immigration case tracking · a renovation manager ·
longitudinal patient records.

**Swap Test: dead.** Astra has no cross-conversation memory; the
capability sheet says persistence is your job. The Codex notes feature is
experimental and off by default. Anything you build here, you build on top
of the model, which means you can build it on top of any model.

**What the round taught.** Primitives 3 and 5 are implementation
conveniences wearing capability clothing. After six rounds, only two
survive: computer use and mid-turn steering. Round 3's narrow inconsistency
framing is a conditional third.

## Round 7 — Programmatic tool calling and orchestration

_Primitive: Astra writes and runs the loop instead of being the loop._

Bulk-process 10,000 PDFs · clean a dataset by writing the cleaning code ·
mass personalization · migrate 500 files between formats · sweep 1,000
contracts for a clause · reconcile two large databases · localize into 40
languages · structure 2,000 spreadsheet rows · run a compliance sweep.

**Swap Test: dead.** A cost and latency optimization. The user sees a
cheaper, faster version of something that already worked.

**What the round taught.** Where batch work _does_ pass — the 1,000-
contract sweep — it passes for Round 3's reason, not this one. What makes
it interesting is finding the clause that contradicts the other 999, and
that is whole-corpus reasoning, not loop-writing.

## Round 8 — WebMCP

_Primitive: pages exposing typed tools directly to agents._

Co-editing surfaces · agent-drivable dashboards · agentic storefronts ·
bookable services · runnable documentation · a tool-exposing spreadsheet ·
an agent-operable CRM, tracker, code review surface, design system.

**Swap Test: dead by design.** WebMCP is an open standard whose entire
purpose is to decouple the page from the model. If the page is built
correctly, swapping Astra for any other agent changes nothing. That is the
point of the specification and it is fatal to the first judging criterion.

**What the round taught.** WebMCP is a trap for this contest specifically.
It is the most strategically aligned thing on the list — OpenAI pushes it,
it is a showcase filter category, it had its own challenge — and it scores
zero on model leverage. Note-taking and meal-planning entries are already
saturated on top of that. Only worth it as a surface _attached_ to an
Astra-only capability, never as the capability itself.

## Round 9 — Computer use × mid-turn steering

_Crossing the two survivors: an agent operating real software that you can
redirect while it is operating it._

Steer a video editor mid-cut · steer a chart builder · steer a financial
model as the cells fill · steer a slide deck in a real presentation app ·
steer a photo retouch · steer a DAW · steer a level designer · steer a
researcher mid-crawl · steer legal document formatting in Word · steer a
map build in QGIS.

**Swap Test:** passes on both axes at once. This is the strongest
combination available.

**Kill gate: scope** — again the desktop VM problem from Round 1. Then the
unlock: _web-based_ professional software is still real professional
software. Figma, Google Sheets, Photopea, Canva, Excel Online, tldraw,
Google Earth. Each is GUI-locked, each is API-poor or API-restricted for
the work that matters, and each runs in a hosted browser with no VM fleet
and no license server. CAD Sandboxes won the hackathon on roughly this
stack — Codex plus Browserbase.

**What the round taught.** Round 1's fatal gate was never "computer use."
It was "desktop." Drop that one word and the highest-leverage combination
becomes shippable in five days.

## Round 10 — The five-day filter, and the text-only inversion

_Applying scope, demo, and unit economics ruthlessly to what survived._

The limits table says Astra is text-output only: no native image, audio,
or video generation. Every round so far has treated that as a fence.

Invert it. **Astra cannot generate an image — but it can make one by
operating an image editor.** And what comes back is not what an image
model produces. An image model returns flattened pixels. An agent
operating a real editor returns a _layered file_ — named layers,
adjustable masks, non-destructive edits a designer can still change
afterward. No diffusion model can produce that artifact at any quality,
because the artifact is an edit history, not an image.

That is the sharpest thing found in ten rounds: a capability gap that
reads as a limitation until you route around it, and a deliverable no
competing product category can emit.

## Shortlist

Scored 0–5 on the six criteria. A zero on model leverage or execution
would be disqualifying; none of the five scored one.

| Idea                                      | Leverage | Exec | Impact | Creativity | Launch | Showcase | Total  |
| ----------------------------------------- | -------- | ---- | ------ | ---------- | ------ | -------- | ------ |
| [Layerhand](#the-pick-layerhand)          | 5        | 3    | 4      | 5          | 5      | 5        | **27** |
| Steerable book-length localization        | 4        | 4    | 4      | 4          | 3      | 3        | 22     |
| Whole-corpus contradiction finder         | 3        | 5    | 5      | 3          | 3      | 3        | 22     |
| Steerable financial model built in Sheets | 4        | 3    | 4      | 3          | 4      | 3        | 21     |
| Keyboard-only accessibility agent         | 4        | 4    | 4      | 2          | 3      | 2        | 19     |

The pick has the highest ceiling and the shakiest floor — a 3 on execution
is the five-day risk, not a knock on the concept.

## The pick: Layerhand

An agent that does real retouching work inside Photopea — a full-featured
web image editor with no public API — and hands back a layered file rather
than a flat export. You watch it work and correct it mid-run.

**Why it survives.** Swapping Astra for another model does not degrade the
output; it removes the product. Driving Photopea's toolbar through 40-plus
steps is exactly the long-horizon GUI competence the OSWorld jump measures,
and it is what the Astra Hackathon judges rewarded in first and second
place. The Round 10 inversion supplies the creativity score: nearly every
other AI image product returns pixels, this one returns an editable
document.

**Who pays.** E-commerce and real-estate photo pipelines, where retouching
is a real line item and a flattened JPEG is unusable because the client
always asks for one more change.

**Unit economics.** Order of magnitude, at $10/M input, $1/M cached, $50/M
output: forty screenshot-driven steps resend their history for roughly
1.3M input tokens cumulatively, mostly cached, plus ~30K output, and land
near $3–6 per image. Assume the top of that range. The 2x tier past 272K
input is charged per request, and a single request tops out near 63K.
Consequences: hard-cap the step count, cache aggressively, and never offer
it unmetered. Three free images, then credits — or bring-your-own-key.

**The risk, stated plainly.** Reliable multi-step control of a dense
professional GUI in five days is the whole bet. Decide by end of day two.
If the agent cannot complete a scripted three-edit sequence unattended by
then, ship the contradiction finder instead — it needs no browser infra, no
agent loop, and one weekend.

## Launch artifact

Written before any code, because the contest judges a launch.

**Tagline** (57 characters):

> AI retouching that returns a layered PSD, not a flat JPEG

**First comment, opening line:**

> Most AI photo tools hand you pixels you can't change — so I stopped
> generating images and taught Astra to use a real image editor instead.

**Thirty-second demo storyboard**, silent, no narrator:

1. **0–4s** A product photo, plainly unretouched. One typed line: _remove
   the background, warm the highlights, clean the reflections._
2. **4–10s** The Photopea window takes over the frame. The toolbar
   responds on its own — selection, mask, adjustment layer. Nobody is
   touching the mouse.
3. **10–16s** Mid-run, a correction is typed: _keep the shadow._ The work
   does not restart. The next actions bend. This is the beat the whole
   video exists for — hold it, and let the layer stack stay visible so it
   is obvious nothing was thrown away.
4. **16–24s** Finished image. Cut to the layer panel: seven named layers,
   editable masks.
5. **24–30s** A mask slider is dragged by hand, and the image changes.
   Final card: _it's still yours to edit._

The mid-run correction in beat 3 and the hand-dragged slider in beat 5 are
the two shots that carry the entire pitch. If either cannot be filmed, the
product is not ready to launch.

## Before committing

- Re-verify the September 18 deadline and prize terms on the
  [contest page](https://www.producthunt.com/contests/gpt-6-astra-challenge).
  All facts here were gathered September 12, 2026.
- Check Photopea's terms for automated use, and check the name against
  existing trademarks and domains.
- There is no pre-built waitlist. Winning launches draw 60%+ of launch-day
  traffic from one, and the first six hours decide ranking. That audience
  has to come from somewhere by the 18th — treat it as a build task, not
  an afterthought.

## See also

- [GPT-6 Astra Challenge](https://www.producthunt.com/contests/gpt-6-astra-challenge)
- [The astra-challenge skill](/.agents/skills/astra-challenge/SKILL.md) that
  ran this process, and its references on
  [Astra leverage](/.agents/skills/astra-challenge/references/astra-leverage.md)
  and [prior art](/.agents/skills/astra-challenge/references/prior-art.md)
