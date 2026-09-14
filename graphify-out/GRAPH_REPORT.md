# Graph Report - astra  (2026-09-14)

## Corpus Check
- 13 files · ~21,450 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 284 nodes · 650 edges · 10 communities
- Extraction: 74% EXTRACTED · 26% INFERRED · 0% AMBIGUOUS · INFERRED: 168 edges (avg confidence: 0.87)
- Token cost: 220,806 input · 0 output

## Community Hubs (Navigation)
- Astra Ideation & Selection
- Formatting, Hooks & Package Tooling
- Run Contracts, Live View & Steering
- Editor, Browser & Scope Limits
- Run Cost, Limits & Metering
- Project Rules & Markdown Style
- Git Workflow & Conventions
- Launch Criteria & Go/No-Go
- Competition & Commercial Gate
- Agent Behavioral Guidelines

## God Nodes (most connected - your core abstractions)
1. `Project conventions (rules.md)` - 28 edges
2. `Markdown style guide` - 23 edges
3. `Git workflow reference` - 20 edges
4. `Layerhand` - 19 edges
5. `Swap Test` - 19 edges
6. `AGENTS.md (agent instruction entry point)` - 17 edges
7. `Photopea` - 15 edges
8. `Hosted Chrome session over CDP` - 13 edges
9. `Conventional Commits` - 13 edges
10. `Stream-per-directory repository layout` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Prettier owns syntax, not prose` --references--> `printWidth`  [INFERRED]
  docs/agents/rules.md → .prettierrc.json
- `.husky/commit-msg hook` --conceptually_related_to--> `husky`  [INFERRED]
  docs/references/git-workflow.md → package.json
- `.husky/pre-commit hook` --references--> `lint-staged`  [INFERRED]
  .github/workflows/lint.yml → package.json
- `Stream-per-directory repository layout` --references--> `prettier`  [INFERRED]
  docs/TRD.md → package.json
- `Pull request template` --references--> `lint`  [EXTRACTED]
  .github/pull_request_template.md → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Ideation synthesis that produced Layerhand** — docs_producthunt_ideas_computer_use, docs_producthunt_ideas_hosted_browser_computer_use, docs_producthunt_ideas_mid_turn_steering, docs_producthunt_ideas_computer_use_x_steering, docs_producthunt_ideas_web_software_unlock, docs_producthunt_ideas_text_only_inversion, docs_producthunt_ideas_swap_test, docs_product_layerhand [EXTRACTED 1.00]
- **Four enforced run limits** — docs_trd_run_limits, docs_prd_fr_12, docs_prd_nfr_2, docs_prd_fr_35, docs_prd_fr_37 [EXTRACTED 1.00]
- **Three contracts and fakes enabling a three-way parallel build** — docs_trd_editorsession, docs_trd_runrequest, docs_trd_runevent, docs_trd_runresult, docs_trd_runhandle, docs_trd_http_api_surface, docs_trd_fake_editor_session, docs_trd_fake_run, docs_trd_stub_http_server, docs_trd_contract_tests [EXTRACTED 1.00]
- **Ruleset required status checks gating merges into main** — github_workflows_conventional_lint_pr_title, github_workflows_conventional_lint_commits, github_workflows_lint_formatting [INFERRED 0.95]
- **Agent instruction bundle loaded through AGENTS.md** — agents, claude, gemini, docs_agents_andrej_karpathy_skills, docs_agents_graphify, docs_agents_rtk, docs_agents_rules, docs_agents_skills, docs_references_git_workflow, docs_references_markdown_style, docs_product_doc, docs_prd_doc, docs_trd_doc, docs_producthunt_ideas_doc [EXTRACTED 1.00]
- **Checks sharing the commitlint rule set** — commitlint_config, husky_commit_msg, github_workflows_conventional_lint, github_workflows_issue_title_lint [EXTRACTED 1.00]
- **Markdown style rules summarized as the rules.md Writing convention** — docs_agents_rules, docs_references_markdown_style_character_line_limit, docs_references_markdown_style_atx_headings, docs_references_markdown_style_heading_capitalization, docs_references_markdown_style_single_h1_heading, docs_references_markdown_style_document_layout, docs_references_markdown_style_informative_link_titles [EXTRACTED 1.00]

## Communities (10 total, 0 thin omitted)

### Community 0 - "Astra Ideation & Selection"
Cohesion: 0.09
Nodes (47): AGENTS.md (agent instruction entry point), CLAUDE.md (symlink to AGENTS.md), AGENTS.md as the single agent entry point, .agents/skills/ skills directory, Skills (installed skill collections), PRD: Layerhand, FR-16: per-user history of past runs (P2, deferred by the non-goals), FR-33: Product Hunt assets (tagline, description, gallery images, first maker comment) (+39 more)

### Community 1 - "Formatting, Hooks & Package Tooling"
Cohesion: 0.09
Nodes (34): Graphify agent instructions, graphify CLI and knowledge graph (graphify-out/), Query the graph before reading source, Run graphify update after modifying code, bun (package manager and script runner), Prettier owns syntax, not prose, graphify-labs/graphify skill collection, Local hook setup (bun install, then uv tool install graphifyy) (+26 more)

### Community 2 - "Run Contracts, Live View & Steering"
Cohesion: 0.09
Nodes (33): FR-1: accept one JPEG/PNG image up to 20 MB and 6000 px, FR-10: live view of the editor (at least one frame per 2 s, at most 3 s behind), FR-13: cancel at any point and keep the partial result, FR-14: survive a page reload by resuming the live view, FR-15: show the running session cost in credits, FR-20: apply a typed mid-run correction without discarding completed work, FR-21: acknowledge a correction visibly within three seconds, FR-22: show accepted corrections in a visible list (+25 more)

### Community 3 - "Editor, Browser & Scope Limits"
Cohesion: 0.09
Nodes (33): FR-2: free-text instruction of up to 500 characters, FR-28: flattened PNG preview alongside the PSD, FR-4: three worked example instructions that fill the box on click, NFR-3: a run starts within five seconds of the button, Risk: the scripting escape hatch, ag-psd fallback, Browser provider shortlist (Browserbase, Anchor, Hyperbrowser, Steel), Browserbase (+25 more)

### Community 4 - "Run Cost, Limits & Metering"
Cohesion: 0.12
Nodes (32): FR-11: progress as step count against the cap with plain-words current action, FR-12: stop at the step cap and return a layered partial result, FR-35: three free runs per visitor, enforced server-side, FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs, FR-37: global daily spend ceiling that stops free-allowance runs, FR-38: paid credit top-ups (P2), NFR-2: no single run exceeds $8 of model spend, NFR-4: twenty simultaneous runs without queueing, then a queue with a stated position (+24 more)

### Community 5 - "Project Rules & Markdown Style"
Cohesion: 0.12
Nodes (30): RTK agent instructions, RTK condensed command output, rtk proxy fallback, Project conventions (rules.md), Markdown style guide, ATX-style headings, Better/Best Rule, 80-character line limit (+22 more)

### Community 6 - "Git Workflow & Conventions"
Cohesion: 0.18
Nodes (28): Git workflow reference, Atomic commits, Branch naming (<type>/<short-description>), Breaking change marker (! and BREAKING CHANGE footer), Conventional commit types (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test), Conventional Commits, gh pr create --fill-first, Conventional issue and pull request titles (+20 more)

### Community 7 - "Launch Criteria & Go/No-Go"
Cohesion: 0.19
Nodes (18): leonxlnx/taste-skill skill collection, FR-30: public landing page with the differentiator and a silent demo loop, FR-31: email capture live and collecting before launch day, FR-32: thirty-second silent demo recording usable on Product Hunt, Launch acceptance checklist (evening of September 17), Launch schedule (September 12-18, launch Friday 12:01am PT), NFR-1: reliability, eight of ten test runs complete unattended with a valid layered file, Risk: reliability of long GUI control (+10 more)

### Community 8 - "Competition & Commercial Gate"
Cohesion: 0.21
Nodes (18): FR-25: PSD opens without error in Photoshop, Affinity Photo and GIMP, FR-26: every layer named in human words, FR-27: masks and adjustment layers remain editable, Adobe Photoshop API v2, BRIA AI, Commercial gate (risk 1: the commercial case vs the survey), Competition survey (twenty-six products), Adobe Firefly Services (+10 more)

### Community 9 - "Agent Behavioral Guidelines"
Cohesion: 0.25
Nodes (8): Andrej Karpathy Skills (behavioral guidelines), Goal-Driven Execution, Simplicity First, Surgical Changes, Think Before Coding, obra/superpowers skill collection, Minimum viable documentation, How it was verified (pull request template section)

## Knowledge Gaps
- **24 isolated node(s):** `lint:fix`, `lint-staged`, `prettier`, `$schema`, `semi` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 31 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AGENTS.md (agent instruction entry point)` connect `Astra Ideation & Selection` to `Agent Behavioral Guidelines`, `Project Rules & Markdown Style`, `Formatting, Hooks & Package Tooling`, `Git Workflow & Conventions`?**
  _High betweenness centrality (0.232) - this node is a cross-community bridge._
- **Why does `Layerhand` connect `Astra Ideation & Selection` to `Competition & Commercial Gate`, `Run Contracts, Live View & Steering`, `Editor, Browser & Scope Limits`?**
  _High betweenness centrality (0.228) - this node is a cross-community bridge._
- **Why does `Stream-per-directory repository layout` connect `Git Workflow & Conventions` to `Formatting, Hooks & Package Tooling`, `Run Contracts, Live View & Steering`, `Editor, Browser & Scope Limits`, `Launch Criteria & Go/No-Go`?**
  _High betweenness centrality (0.186) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Project conventions (rules.md)` (e.g. with `Explicit link paths (relative only within the same directory)` and `Capitalization of titles and headings`) actually correct?**
  _`Project conventions (rules.md)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `Layerhand` (e.g. with `Computer use x mid-turn steering (Round 9)` and `Product non-goals (no image generation, no batch/API/integrations, no accounts beyond metering, no mobile, no own editor, no presets)`) actually correct?**
  _`Layerhand` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `Swap Test` (e.g. with `Risk: the scripting escape hatch` and `astra-challenge skill`) actually correct?**
  _`Swap Test` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `lint:fix`, `lint-staged`, `prettier` to the rest of the system?**
  _24 weakly-connected nodes found - possible documentation gaps or missing edges._