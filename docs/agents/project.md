# Project

Layerhand's own agent instructions, beside the shared ones. `AGENTS.md` imports the shared agent docs first, then this file and the repository's other topics. Where the two differ, this file wins.

Contents:

1.  [About this repository](#about-this-repository)
1.  [Documents](#documents)
1.  [Knowledge graph](#knowledge-graph)
1.  [Plans and specs](#plans-and-specs)

## About this repository

This repository builds **Layerhand**, an agent that retouches photographs inside a real image editor and returns a layered file, for the OpenAI × Product Hunt GPT-6 Astra Challenge. Each `@` path in `AGENTS.md` imports a document; harnesses without import support should open the files directly. Edit `AGENTS.md`, never `CLAUDE.md` or `GEMINI.md`, which are symlinks to it.

## Documents

What the main imported documents cover:

- [Andrej Karpathy skills](/docs/agents/andrej-karpathy-skills.md) — how to approach a task: think before coding, keep it simple, change only what the request needs, and loop until the result is verified. The guidelines come from [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills), which derives them from Andrej Karpathy's observations on LLM coding pitfalls.
- [Graphify](/docs/agents/graphify.md) — query the knowledge graph in `graphify-out/` before reading or searching raw files.
- [RTK](/docs/agents/rtk.md) — shell output comes back condensed; re-run a command with `rtk proxy` only when its result is unusable.
- [Project rules](/docs/agents/rules.md) — the project conventions for Git, writing, tooling, and layout. They override an agent's own defaults.
- [Git workflow](/docs/references/git-workflow.md) — how every change gets from a branch to `main`, how commits and titles are named, and which steps the local hooks enforce.
- [Markdown style guide](/docs/references/markdown-style.md) — the style every Markdown document here follows: no hard wraps, sentence-case ATX headings, and informative links.
- [Product brief](/docs/PRODUCT.md) — the problem, the users, the competition, the unit costs, and the two gates that can stop the project.
- [PRD](/docs/PRD.md) — the requirements: the schedule to the September 18 launch, the core flow, and the numbered `FR` and `NFR` items.
- [TRD](/docs/TRD.md) — the technical design: architecture, the three contracts, cost control, testing, and the spikes that settle open questions.
- [Ideation](/docs/research/ideation.md) — the ten rounds of ideation Layerhand was chosen from, including the ideas it beat.

## Knowledge graph

- After modifying code, run `bun run graph` rather than a bare `graphify update .`. It runs `graphify update .`, which is AST-only and costs no API calls, then formats what it rewrote. Nothing does this for you: the pre-commit hook no longer refreshes the graph.
- That pass leaves the doc and concept nodes alone. Refreshing those spends API budget and takes `/graphify --update`, from the skill that `graphify install` sets up outside the repository. Never delete `graphify-out/` first: `graphify update .` merges into the tracked `graph.json`, and rebuilding from an empty directory drops every semantic node.

## Plans and specs

Plans and specs go in `docs/plans/`, named without a date, as the [project rules](/docs/agents/rules.md#writing) describe. A spec whose name matches a plan's takes a `spec-` prefix, such as `spec-landing-polish.md`.
