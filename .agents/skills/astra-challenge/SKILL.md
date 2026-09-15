---
name: astra-challenge
description: Use when generating, evaluating, or narrowing project ideas for the OpenAI x Product Hunt GPT-6 Astra Challenge, or when deciding what to build with GPT-6 Astra for a launch, hackathon, or showcase submission
---

# Astra Challenge ideation

The GPT-6 Astra Challenge is a **launch** contest, not a hackathon. You win by shipping a real product on Product Hunt that is impossible — or obviously worse — on any other model.

**Core principle:** Generate from a capability only Astra has, then find a domain for it. Never start from a product category and bolt an LLM onto it. Category-first thinking produces wrappers, and wrappers lose on the first judging criterion.

## Contest facts

| Field | Value |
|---|---|
| Host | OpenAI × Product Hunt |
| Deadline | **Launch on Product Hunt by September 18, 2026** |
| Prize | 5 winners each get $10K OpenAI API credits + 1 year ChatGPT Pro (up to 2 team members) + promotion by OpenAI |
| Requirement | Built with GPT-6 Astra, shipped and launched. A working product, not a concept. |
| Published rubric | **None.** OpenAI published no judging criteria for this contest. |

Before ideating, **count the days remaining** against the September 18 deadline. Scope follows from that number, and it is the gate that kills the most ideas.

## Inferred rubric

No criteria were published. Use the criteria from the WebMCP Challenge — OpenAI's nearest comparable build contest, run weeks earlier — which are **equally weighted**:

1. **Model leverage** — "How thoroughly and skillfully does the project use [the model]? Does the code reflect genuine effort and a working, non-trivial implementation?"
2. **Execution** — "a complete, coherent product experience — not just a technical proof of concept"
3. **Potential impact** — "a credible, specific case for solving a real problem for a real audience"
4. **Creativity & ambition** — "How creative and novel is the concept and does the project differ from existing concepts?"

Treat this as a strong prior, not as fact. State the inference when you present scores.

Two Astra-specific additions, because this contest is a Product Hunt launch judged by a company that runs a public showcase:

5. **Launch legibility** — the hook reads in five seconds on a PH card and demos in a silent GIF.
6. **Showcase-ability** — "promotion by OpenAI" means the winners become marketing. Projects OpenAI features are visually polished and screenshot well. See `references/prior-art.md`.

## Process

### 1. Generate from leverage

Open `references/astra-leverage.md`. Pick 2–3 capability primitives. For each, ask:

> What job today requires a skilled human sitting in front of specific software for hours?

Produce 10 raw ideas without filtering. Volume first, judgment second.

### 2. The Swap Test

This is the primary gate. For each idea ask: **if I swap Astra for GPT-5.5, Fable, or Gemini, what breaks?**

| Answer | Verdict |
|---|---|
| "Nothing" / "slightly worse output" / "a bit less accurate" | **Dead.** It is a wrapper. |
| "The core loop takes 10x longer" / "it cannot drive the app at all" / "the product does not function" | **Passes.** |

Most ideas die here. That is the point — the first judging criterion is model leverage, and a wrapper scores zero on it no matter how polished.

### 3. Kill gates, cheapest first

Run in order. Stop at the first failure.

1. **Crowding** — is it on the taken list in `references/prior-art.md`? A hackathon winner already did Blender interiors, Fusion 360 CAD, and travel atlases. The showcase is saturated with Three.js toys and browser games.
2. **Scope** — can a *launchable* version exist in the days remaining? Not a demo. A thing strangers can use.
3. **Demo** — can you show the wow in a 30-second silent GIF? If it needs a narrator to be impressive, it will not survive a PH feed.
4. **Unit economics** — at $10/M input and $50/M output, what does one user session cost? Who pays? A free consumer tool with an unbounded agent loop bleeds money on launch day. See the cost math in `references/astra-leverage.md`.

### 4. Score survivors

Score each on the six criteria above, 0–5. Do not average away a zero: a zero on model leverage or execution is disqualifying regardless of total.

### 5. Write the launch artifact before building

For the top idea, write these three things **first**:

- The Product Hunt tagline (≤60 characters)
- The opening line of the maker's first comment
- A 30-second demo storyboard, shot by shot

If you cannot write them, the idea is not ready. Return to step 1. This step is out of order on purpose — the contest judges a launch, so the launch is the spec.

## Common mistakes

**Starting from "what should I build?"** — produces categories, categories produce wrappers. Start from the capability.

**Confusing ambitious with large.** "Ambitious" in the rubric sits next to "creative" and "novel," not next to "big." A small product doing one impossible thing beats a large product doing ten ordinary things, and it ships in six days.

**Treating polish as optional.** Execution is 1 of 4 criteria and showcase-ability decides promotion. An unstyled demo with a brilliant idea loses to a merely good idea that looks finished.

**Ignoring the launch mechanics.** #1 Product of the Day in 2026 typically needs 500–1,200 upvotes, and the first six hours decide ranking. Placing well on PH is not the contest, but a launch nobody sees gives judges nothing to evaluate.

**Picking a capability Astra does not have.** Astra is text-output only, has no fine-tuning, and is too slow for real-time reaction loops. Check `references/astra-leverage.md` before committing.

**Proposing offensive-security tooling.** Astra is the first model rated "Critical" for cyber capability under OpenAI's Preparedness Framework. Standard access refuses exploit work outright, and adjacent tasks can be throttled.

## References

- `references/astra-leverage.md` — capability primitives, hard limits, cost math
- `references/prior-art.md` — hackathon winners, showcase patterns, the taken list

Facts above were gathered September 12, 2026. Re-verify the deadline and prize terms on the contest page before relying on them.
