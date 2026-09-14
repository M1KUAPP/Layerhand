# Graph Report - astra  (2026-09-14)

## Corpus Check
- 5 files · ~19,596 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 276 nodes · 590 edges · 10 communities
- Extraction: 72% EXTRACTED · 28% INFERRED · 0% AMBIGUOUS · INFERRED: 167 edges (avg confidence: 0.87)
- Token cost: 261,794 input · 0 output

## Community Hubs (Navigation)
- Git Workflow & Conventions
- Run Cost, Limits & Metering
- Run Contracts, Live View & Steering
- Editor, Browser & Scope Limits
- Astra Ideation & Selection
- Launch Criteria & Go/No-Go
- Markdown Style Guide
- Agent Instruction Bundle
- Formatting & Package Tooling
- Competition & Commercial Gate

## God Nodes (most connected - your core abstractions)
1. `Project conventions (rules.md)` - 26 edges
2. `Markdown style guide` - 22 edges
3. `Swap Test` - 18 edges
4. `Layerhand` - 17 edges
5. `Git workflow reference` - 15 edges
6. `Photopea` - 15 edges
7. `Conventional Commits` - 13 edges
8. `Hosted Chrome session over CDP` - 13 edges
9. `Enforcement layers (What enforces what)` - 12 edges
10. `Launch acceptance checklist (evening of September 17)` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Prettier owns syntax, not prose` --references--> `printWidth`  [INFERRED]
  docs/agents/rules.md → .prettierrc.json
- `Stream-per-directory repository layout` --references--> `prettier`  [INFERRED]
  docs/TRD.md → package.json
- `bun (package manager and script runner)` --references--> `prepare`  [INFERRED]
  docs/agents/rules.md → package.json
- `Git workflow reference` --references--> `prepare`  [INFERRED]
  docs/references/git-workflow.md → package.json
- `Prettier owns syntax, not prose` --references--> `lint-staged`  [EXTRACTED]
  docs/agents/rules.md → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Checks sharing the commitlint rule set** — commitlint_config, husky_commit_msg, github_workflows_conventional_lint, github_workflows_issue_title_lint [EXTRACTED 1.00]
- **Markdown style rules summarized as the rules.md Writing convention** — docs_agents_rules, docs_references_markdown_style_character_line_limit, docs_references_markdown_style_atx_headings, docs_references_markdown_style_heading_capitalization, docs_references_markdown_style_single_h1_heading, docs_references_markdown_style_document_layout, docs_references_markdown_style_informative_link_titles [EXTRACTED 1.00]
- **Ruleset required status checks gating merges into main** — github_rulesets_main, github_workflows_conventional_lint_pr_title, github_workflows_conventional_lint_commits, github_workflows_lint_formatting [INFERRED 0.95]
- **Ideation synthesis that produced Layerhand** — docs_producthunt_ideas_computer_use, docs_producthunt_ideas_hosted_browser_computer_use, docs_producthunt_ideas_mid_turn_steering, docs_producthunt_ideas_computer_use_x_steering, docs_producthunt_ideas_web_software_unlock, docs_producthunt_ideas_text_only_inversion, docs_producthunt_ideas_swap_test, docs_product_layerhand [EXTRACTED 1.00]
- **Four enforced run limits** — docs_trd_run_limits, docs_prd_fr_12, docs_prd_nfr_2, docs_prd_fr_35, docs_prd_fr_37 [EXTRACTED 1.00]
- **Three contracts and fakes enabling a three-way parallel build** — docs_trd_editorsession, docs_trd_runrequest, docs_trd_runevent, docs_trd_runresult, docs_trd_runhandle, docs_trd_http_api_surface, docs_trd_fake_editor_session, docs_trd_fake_run, docs_trd_stub_http_server, docs_trd_contract_tests [EXTRACTED 1.00]
- **Agent instruction bundle loaded through AGENTS.md** — agents, claude, gemini, docs_agents_andrej_karpathy_skills, docs_agents_graphify, docs_agents_rtk, docs_agents_skills, docs_references_markdown_style [EXTRACTED 1.00]

## Communities (10 total, 0 thin omitted)

### Community 0 - "Git Workflow & Conventions"
Cohesion: 0.15
Nodes (36): Project conventions (rules.md), bun (package manager and script runner), Git workflow reference, Atomic commits, Branch naming (<type>/<short-description>), Breaking change marker (! and BREAKING CHANGE footer), Conventional commit types (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test), Conventional Commits (+28 more)

### Community 1 - "Run Cost, Limits & Metering"
Cohesion: 0.11
Nodes (35): FR-1: accept one JPEG/PNG image up to 20 MB and 6000 px, FR-12: stop at the step cap and return a layered partial result, FR-35: three free runs per visitor, enforced server-side, FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs, FR-37: global daily spend ceiling that stops free-allowance runs, FR-38: paid credit top-ups (P2), FR-5: one sample image usable without uploading, NFR-2: no single run exceeds $8 of model spend (+27 more)

### Community 2 - "Run Contracts, Live View & Steering"
Cohesion: 0.08
Nodes (34): FR-10: live view of the editor (at least one frame per 2 s, at most 3 s behind), FR-11: progress as step count against the cap with plain-words current action, FR-13: cancel at any point and keep the partial result, FR-14: survive a page reload by resuming the live view, FR-15: show the running session cost in credits, FR-20: apply a typed mid-run correction without discarding completed work, FR-21: acknowledge a correction visibly within three seconds, FR-22: show accepted corrections in a visible list (+26 more)

### Community 3 - "Editor, Browser & Scope Limits"
Cohesion: 0.09
Nodes (33): FR-16: per-user history of past runs (P2, deferred by the non-goals), FR-2: free-text instruction of up to 500 characters, FR-28: flattened PNG preview alongside the PSD, FR-4: three worked example instructions that fill the box on click, NFR-3: a run starts within five seconds of the button, NFR-7: page works at 1280 px and above; mobile out of scope, Requirement-level exclusions (no accounts, no in-app editing, no undo, PSD-only output, no internationalisation), Photopea licence question (answered: automated and commercial use permitted) (+25 more)

### Community 4 - "Astra Ideation & Selection"
Cohesion: 0.14
Nodes (31): PRD: Layerhand, Contest outcome against the four inferred criteria, Product: Layerhand, GPT-6 Astra, Layerhand, OSWorld V2-Offline benchmark, Keyboard-only accessibility agent, astra-challenge skill (+23 more)

### Community 5 - "Launch Criteria & Go/No-Go"
Cohesion: 0.14
Nodes (27): FR-25: PSD opens without error in Photoshop, Affinity Photo and GIMP, FR-26: every layer named in human words, FR-27: masks and adjustment layers remain editable, FR-30: public landing page with the differentiator and a silent demo loop, FR-31: email capture live and collecting before launch day, FR-32: thirty-second silent demo recording usable on Product Hunt, FR-33: Product Hunt assets (tagline, description, gallery images, first maker comment), Launch acceptance checklist (evening of September 17) (+19 more)

### Community 6 - "Markdown Style Guide"
Cohesion: 0.12
Nodes (25): Markdown style guide, ATX-style headings, Better/Best Rule, 80-character line limit, Code Search, Code spans for inline code and escaping, CommonMark spec, Google docguide philosophy (+17 more)

### Community 7 - "Agent Instruction Bundle"
Cohesion: 0.12
Nodes (23): AGENTS.md (agent instruction entry point), CLAUDE.md (symlink to AGENTS.md), Andrej Karpathy Skills (behavioral guidelines), Goal-Driven Execution, Simplicity First, Surgical Changes, Think Before Coding, Graphify agent instructions (+15 more)

### Community 8 - "Formatting & Package Tooling"
Cohesion: 0.11
Nodes (17): Prettier owns syntax, not prose, devDependencies, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, prettier, lint-staged (+9 more)

### Community 9 - "Competition & Commercial Gate"
Cohesion: 0.33
Nodes (12): Adobe Photoshop API v2, BRIA AI, Commercial gate (risk 1: the commercial case vs the survey), Competition survey (twenty-six products), Adobe Firefly Services, Flat-output competitors (Photoroom, Clipdrop, Pixelcut, Claid, Pixelbin, remove.bg, Evoto, Imagen AI, Aftershoot, BoxBrownie), Flat-output problem in AI retouching, Human retouching price ceiling ($0.39-$2.00 per image) (+4 more)

## Knowledge Gaps
- **32 isolated node(s):** `@commitlint/cli`, `@commitlint/config-conventional`, `husky`, `lint-staged`, `prettier` (+27 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 39 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Stream-per-directory repository layout` connect `Git Workflow & Conventions` to `Formatting & Package Tooling`, `Run Contracts, Live View & Steering`, `Editor, Browser & Scope Limits`, `Launch Criteria & Go/No-Go`?**
  _High betweenness centrality (0.308) - this node is a cross-community bridge._
- **Why does `Project conventions (rules.md)` connect `Git Workflow & Conventions` to `Formatting & Package Tooling`, `Markdown Style Guide`, `Agent Instruction Bundle`?**
  _High betweenness centrality (0.272) - this node is a cross-community bridge._
- **Why does `Git workflow reference` connect `Git Workflow & Conventions` to `Astra Ideation & Selection`?**
  _High betweenness centrality (0.232) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `Project conventions (rules.md)` (e.g. with `RTK condensed command output` and `rtk proxy fallback`) actually correct?**
  _`Project conventions (rules.md)` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `Swap Test` (e.g. with `Risk: the scripting escape hatch` and `astra-challenge skill`) actually correct?**
  _`Swap Test` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `Layerhand` (e.g. with `Computer use x mid-turn steering (Round 9)` and `Product non-goals (no image generation, no batch/API/integrations, no accounts beyond metering, no mobile, no own editor, no presets)`) actually correct?**
  _`Layerhand` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@commitlint/cli`, `@commitlint/config-conventional`, `husky` to the rest of the system?**
  _32 weakly-connected nodes found - possible documentation gaps or missing edges._