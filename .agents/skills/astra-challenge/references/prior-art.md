# Prior Art: What Already Won, What Is Taken

The Astra Challenge had no winners as of September 12, 2026 — submissions close September 18. The signals below are the best available proxies for what OpenAI rewards.

## Official Astra Hackathon winners (Cerebral Valley × OpenAI, SF, Sept 8 2026)

$100K in credits, DevDay tickets, ChatGPT Pro. Run in SF and NYC.

| Place | Project | What it is |
|---|---|---|
| 1st ($50K + DevDay) | **CAD Sandboxes** | An SDK and visual design inspector letting Astra drive Fusion 360, via Codex and Browserbase |
| 2nd ($25K) | **Homebuddy** | Astra-powered interior designer — styles rooms and builds interactive 3D models in Blender from floorplan photos |
| 3rd ($15K) | **Pearl** | Travel discovery atlas turning itinerary questions into interactive worlds |
| — | **Astral Projection** | VR training for operating advanced electronics and datacenter hardware |

**The pattern:** every winner points Astra at professional desktop software that has no good API. First and second place are both "Astra operates a 3D application a trained human normally operates." Computer use is what the judges rewarded.

## WebMCP Challenge (August 2026) — the rubric source

10-day hackathon with Google Chrome, Cloudflare, Shopify, Vercel, Render, Netlify. $35K; top 10 each received $3,000, a year of ChatGPT Pro, a Codex Micro keyboard, and merch. Winners announced September 23, 2026 — after the Astra deadline, so no results to learn from.

Judged in two stages. Stage one is pass/fail on theme fit and required API use. Stage two applies four **equally weighted** criteria: WebMCP leverage, execution, potential impact, creativity & ambition. Submissions required a live URL, a public repo under an open-source license, a text description, and a **YouTube demo video under three minutes**.

The Astra Challenge publishes no criteria. These are the closest thing to OpenAI's stated bar.

## The OpenAI developer showcase

`developers.openai.com/showcase` — where "promotion by OpenAI" likely lands. Filters by model (GPT-6 Astra, GPT-5.6, GPT-5.5), type (App, Game, Experience, Landing Page, Storefront), use case (Agents, Creative tools, Data visualization, Education, Image generation, Interactive experiences, Internal tools, Productivity, Storefronts, Voice, WebMCP), and stack (Next.js, React, Three.js, Python, SwiftUI).

Featured at time of research: **Little Ritual** (3D coffee-delivery game on a spherical world), **Physics museum** (five interactive exhibits), **Below the Surface** (five ocean zones), **Sunwake** (sailing game).

**The bar.** Entries are polished, visually cohesive, and screenshot well. Writeups follow a consistent shape: the initial prompt, four or five documented iteration passes, a final summary, and links to related projects. Material Lab — a browser 3D material and lighting tool — is typical: real-time interaction, persistent local presets, "a professional creative tool without becoming a dense technical shader editor." The showcase rewards finish, not novelty alone.

## The taken list

Do not propose these without a sharp, stated differentiator.

**Won by a hackathon entry already:** Blender interior design · Fusion 360 / CAD control · travel itinerary and discovery atlases · VR hardware training.

**Saturated on the showcase:** Three.js interactive experiences (Abyssal, Clockwork Observatory, Living Cell, Tidegarden, Biome Lab, Courtyard House) · AI-generated storefronts (Ridge Pack, Field Day, Kiln, Scent Cartography) · landing page generators (Frame Studio, Nightjar, Tidal House, Watchmaker) · internal tool dashboards (Sparkboard, Launch Cal, Pulse Dashboard, Onboarding Hub) · WebMCP note-taking and meal-planning apps (WanderNote, Sunday Table, Paperie).

**Saturated in the community:** browser games. The `awesome-gpt-6-astra` collection catalogs 86+ across action, puzzle, strategy, RPG, platformer, and racing — many built in a single prompt. A game needs an extraordinary hook to register.

**Weak by construction:** chat-with-your-docs and RAG products (Astra's million-token context makes the plumbing the wrong thing to sell) · generic coding assistants (the coding lead over competitors is marginal) · anything real-time (latency) · anything needing image or audio output from Astra (text-only) · offensive security tooling (gated Critical, refused on standard access).

## What the games collection reveals about Astra

Useful capability evidence even though games themselves are crowded:

- **Strong:** converting a design concept into a playable prototype fast; procedural 3D geometry with iterative refinement; full-stack gameplay, UI, physics, and Web Audio synthesis; complex rule systems (RTS, tower defense, puzzle solvers). Several projects were genuinely one-prompt builds.
- **Weak:** multiplayer synchronization and backend infrastructure are rarely Astra-native; original artwork still needs separate generation tools; human direction and playtesting remain essential.

## Product Hunt launch mechanics

The contest requires a launch, so launch mechanics are part of execution.

- #1 Product of the Day in 2026 typically needs **500–1,200 upvotes**; a quiet Tuesday might take 450, a competitive Wednesday 1,400+.
- **The first six hours decide ranking.** 50+ upvotes in that window is the marker for a strong finish.
- Launch at **12:01am PT** for the full 24-hour window. Weekend launches face less competition and a lower ceiling.
- Engagement — comments and maker replies — can tip ranking when upvote counts are close.
- Winning launches draw 60%+ of launch-day traffic from a pre-built waitlist. A PH launch is normally a 4–6 week project; compressing it into days means the audience has to come from somewhere else.
- **Never buy upvotes or use vote-swap groups.** Both trigger quality filters.

## Sources

Contest: [Product Hunt contest page](https://www.producthunt.com/contests/gpt-6-astra-challenge) · [OpenAI community thread](https://community.openai.com/t/gpt-6-astra-challenge-on-product-hunt/1396727)

Model: [GPT-6 Astra announcement](https://openai.com/index/gpt-6-astra/) · [model guidance](https://developers.openai.com/api/docs/guides/latest-model) · [rethinking skills and prompts](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra/) · [MarkTechPost technical writeup](https://www.marktechpost.com/2026/09/03/openai-releases-gpt-6-astra-a-1-05m-context-computer-use-model-gated-behind-a-critical-cyber-threshold/) · [Hacker News discussion](https://news.ycombinator.com/item?id=49554643)

Prior art: [OpenAI showcase](https://developers.openai.com/showcase) · [WebMCP Challenge rules](https://webmcp.devpost.com/rules) · [WebMCP Challenge](https://openai.com/webmcp-challenge/) · [Astra Hackathon SF](https://cerebralvalley.ai/e/openai-gpt-6-astra-sf) · [awesome-gpt-6-astra](https://github.com/MartinDelophy/awesome-gpt-6-astra)
