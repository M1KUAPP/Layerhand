# Agent instructions

This repository builds **Layerhand**, an agent that retouches photographs
inside a real image editor and returns a layered file, for the OpenAI ×
Product Hunt GPT-6 Astra Challenge. Each `@` path below imports a document,
with a note on what it covers; harnesses without import support should open
the files directly. Edit this file, never `CLAUDE.md` or `GEMINI.md`, which
are symlinks to it.

## Instructions

- @docs/agents/andrej-karpathy-skills.md — how to approach a task: think
  before coding, keep it simple, change only what the request needs, and
  loop until the result is verified.
- @docs/agents/graphify.md — query the knowledge graph in `graphify-out/`
  before reading or searching raw files.
- @docs/agents/rtk.md — shell output comes back condensed; re-run a command
  with `rtk proxy` only when its result is unusable.
- @docs/agents/rules.md — the project conventions for git, writing,
  tooling, and layout. They override an agent's own defaults.
- @docs/agents/skills.md — the installed skill collections, and when to
  reach for each.

## References

- @docs/references/git-workflow.md — how every change gets from a branch
  to `main`, how commits and titles are named, and what enforces each step.
- @docs/references/markdown-style.md — the style every Markdown document
  here follows: 80-character lines, sentence-case ATX headings, and
  informative links.

## Project documents

- @docs/PRODUCT.md — the product brief: the problem, the users, the
  competition, the unit costs, and the two gates that can stop the project.
- @docs/PRD.md — the requirements: the schedule to the September 18 launch,
  the core flow, and the numbered `FR` and `NFR` items.
- @docs/TRD.md — the technical design: architecture, the three contracts,
  cost control, testing, and the spikes that settle open questions.
- @docs/producthunt-ideas.md — the ten rounds of ideation Layerhand was
  chosen from, including the ideas it beat.
