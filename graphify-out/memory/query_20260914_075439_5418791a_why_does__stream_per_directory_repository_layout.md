---
type: "query"
date: "2026-09-14T07:54:39.225175+00:00"
question: "Why does `Stream-per-directory repository layout` connect `Git Workflow & Conventions` to `Formatting & Package Tooling`, `Run Contracts, Live View & Steering`, `Editor, Browser & Scope Limits`, `Launch Criteria & Go/No-Go`?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Stream-per-directory repository layout"]
---

# Q: Why does `Stream-per-directory repository layout` connect `Git Workflow & Conventions` to `Formatting & Package Tooling`, `Run Contracts, Live View & Steering`, `Editor, Browser & Scope Limits`, `Launch Criteria & Go/No-Go`?

## Answer

It is where code structure meets repository conventions. The TRD's Repository layout section maps src/agent, src/editor, src/browser, src/server, src/web and test/images to the build streams and to Contracts 1 and 2 (EditorSession, RunHandle, the live frame pump, the ten-image test set), and its next paragraph names the conventions the code follows: bun, Prettier, atomic commits, Conventional Commits and the git workflow. One node therefore touches the contracts, editor and launch clusters on one side and the conventions and formatting clusters on the other. Verified against docs/TRD.md, Repository layout.

## Outcome

- Signal: useful

## Source Nodes

- Stream-per-directory repository layout