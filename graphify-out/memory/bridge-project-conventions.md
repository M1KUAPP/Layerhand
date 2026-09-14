---
type: "query"
date: "2026-09-14T07:54:39.274836+00:00"
question: "Why does `Project conventions (rules.md)` connect `Git Workflow & Conventions` to `Formatting & Package Tooling`, `Markdown Style Guide`, `Agent Instruction Bundle`?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Project conventions (rules.md)"]
---

# Q: Why does `Project conventions (rules.md)` connect `Git Workflow & Conventions` to `Formatting & Package Tooling`, `Markdown Style Guide`, `Agent Instruction Bundle`?

## Answer

docs/agents/rules.md is the only page that summarizes every repository convention at once: Git (branching, Conventional Commits, rebase merge, and a link to docs/references/git-workflow.md), Writing (the Markdown style guide), Tooling (bun, Prettier and lint-staged, rtk) and Layout (AGENTS.md, docs/agents, docs/references, .agents/skills, .github). Each section pulls in a different cluster. Caveat: the current AGENTS.md no longer imports rules.md, so agents do not load it even though the graph makes it central.

## Outcome

- Signal: useful

## Source Nodes

- Project conventions (rules.md)