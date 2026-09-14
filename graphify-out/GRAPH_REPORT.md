# Graph Report - feat-launch-application  (2026-09-15)

## Corpus Check
- 79 files · ~55,975 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 602 nodes · 932 edges · 27 communities (21 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8c360c24`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- compilerOptions
- fake-editor-session.ts
- Product: Layerhand
- FakeEditorSession
- PhotopeaDocumentBridge
- PhotopeaMessage
- Layerhand
- container-smoke.sh
- PhotopeaTransport
- Saved query: are Layerhand's inferred relationships correct
- Saved query: are Swap Test's inferred relationships correct
- playwright-photopea-transport.ts
- FakeEditorSession
- PhotopeaDocumentBridge
- session.types.test.ts
- PhotopeaBridge

## God Nodes (most connected - your core abstractions)
1. `PhotopeaMessage` - 22 edges
2. `Project conventions (rules.md)` - 21 edges
3. `FakeEditorSession` - 20 edges
4. `Launch application design` - 18 edges
5. `PhotopeaTransport` - 17 edges
6. `TRD: Layerhand` - 17 edges
7. `Git workflow reference` - 17 edges
8. `PhotopeaBridge` - 16 edges
9. `Product Hunt ideas: GPT-6 Astra Challenge` - 16 edges
10. `Markdown style guide` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Prettier owns syntax, not prose` --references--> `printWidth`  [INFERRED]
  docs/agents/rules.md → .prettierrc.json
- `Prettier owns syntax, not prose` --references--> `lint-staged`  [EXTRACTED]
  docs/agents/rules.md → package.json
- `Prettier owns syntax, not prose` --references--> `lint`  [EXTRACTED]
  docs/agents/rules.md → package.json
- `bun (package manager and script runner)` --references--> `prepare`  [INFERRED]
  docs/agents/rules.md → package.json
- `Local hook setup (bun install, then uv tool install graphifyy)` --references--> `prepare`  [INFERRED]
  docs/references/git-workflow.md → package.json

## Import Cycles
- None detected.

## Communities (27 total, 6 thin omitted)

### Community 0 - "Astra Ideation & Selection"
Cohesion: 0.06
Nodes (33): Adobe is the serious threat, and it is already shipped, And the demand signal is missing, Business model, Competition, Non-goals, Open questions, Product: Layerhand, Risks and the kill switch (+25 more)

### Community 1 - "Formatting, Hooks & Package Tooling"
Cohesion: 0.06
Nodes (35): @commitlint/cli, @commitlint/config-conventional, bun (package manager and script runner), Local hook setup (bun install, then uv tool install graphifyy), husky, lint-staged, dependencies, playwright-core (+27 more)

### Community 2 - "Run Contracts, Live View & Steering"
Cohesion: 0.25
Nodes (5): PhotopeaBridgeOptions, PhotopeaProtocolError, PhotopeaProtocolErrorCode, PhotopeaEnvironment, PhotopeaEnvironmentParameters

### Community 3 - "Editor, Browser & Scope Limits"
Cohesion: 0.05
Nodes (43): Advertising, An agent driving a browser is an attack surface, Contract 1: editor session, Contract 2: run orchestration, Contract 3: the HTTP surface, Cost control, Decisions deferred to spikes, Deployment (+35 more)

### Community 4 - "Run Cost, Limits & Metering"
Cohesion: 0.08
Nodes (32): detectFormat(), ERROR_MESSAGES, EXIF_SIGNATURE, ImageFormat, ImageUploadError, ImageUploadErrorCode, isStandaloneJpegMarker(), JPEG_SOF_MARKERS (+24 more)

### Community 5 - "Project Rules & Markdown Style"
Cohesion: 0.05
Nodes (37): Add spacing to headings, ATX-style headings, Avoid relative paths unless within the same directory, Better is better than best, Capitalization, Capitalization of titles and headers, Code, Codeblocks (+29 more)

### Community 6 - "Git Workflow & Conventions"
Cohesion: 0.07
Nodes (43): AGENTS.md (agent instruction entry point), CLAUDE.md (symlink to AGENTS.md), 1. Think Before Coding, 2. Simplicity First, 3. Surgical Changes, 4. Goal-Driven Execution, Andrej Karpathy Skills, Graphify (+35 more)

### Community 7 - "Launch Criteria & Go/No-Go"
Cohesion: 0.16
Nodes (17): RunEvent, RunHandle, RunRequest, RunResult, collect(), endOf(), EventOf, ofType() (+9 more)

### Community 8 - "Competition & Commercial Gate"
Cohesion: 0.11
Nodes (18): Artifact storage, Browserbase boundary, Delivery structure, External checkpoints and issue closure, Goals, Input and admission order, Launch application design, Metering and waitlist persistence (+10 more)

### Community 9 - "Agent Behavioral Guidelines"
Cohesion: 0.30
Nodes (9): clientAddress(), establishVisitorIdentity(), hmac(), readCookie(), signVisitorId(), validSignedId(), VisitorIdentity, VisitorIdentityError (+1 more)

### Community 10 - "compilerOptions"
Cohesion: 0.12
Nodes (16): DOM, ESNext, src/**/*.ts, test/**/*.ts, compilerOptions, lib, module, moduleDetection (+8 more)

### Community 11 - "fake-editor-session.ts"
Cohesion: 0.09
Nodes (18): bun, databaseReady(), AdmissionDenied, AdmissionRequest, AdmissionResult, assertMicroUsd(), DAILY_LIMIT, FREE_LIMIT (+10 more)

### Community 12 - "Product: Layerhand"
Cohesion: 0.14
Nodes (14): Deliberately excluded, Functional requirements, Input, Launch acceptance, Launch surface, Metering, Non-functional requirements, Output (+6 more)

### Community 13 - "FakeEditorSession"
Cohesion: 0.21
Nodes (5): PhotopeaConfiguration, PhotopeaMessage, ControlledTransport, LateSentinelTransport, MemoryTransport

### Community 14 - "PhotopeaDocumentBridge"
Cohesion: 0.11
Nodes (15): BrowserbaseClient, BrowserbaseError, BrowserbaseLiveView, BrowserbaseSession, Fetch, requiredString(), BrowserbaseProbeClient, BrowserbaseProbeEvidence (+7 more)

### Community 15 - "PhotopeaMessage"
Cohesion: 0.08
Nodes (22): createPhotopeaHostHtml(), Application, APPLICATION_CSP, ApplicationDependencies, BASE_SECURITY_HEADERS, createApplication(), json(), PHOTOPEA_HOST_CSP (+14 more)

### Community 17 - "Layerhand"
Cohesion: 0.25
Nodes (7): Architecture, Browserbase probe, Container, Layerhand, Requirements, Run locally, Verify

### Community 22 - "playwright-photopea-transport.ts"
Cohesion: 0.14
Nodes (7): decodePhotopeaWireMessage(), DEFAULT_VIEWPORT, isByteArray(), LayerhandWindow, PhotopeaWireMessage, PlaywrightPhotopeaTransport, PageFakeState

### Community 23 - "FakeEditorSession"
Cohesion: 0.06
Nodes (29): cloneAction(), copyBytes(), createRecordedFakeEditorSession(), EditorRecording, FakeEditorSession, SessionState, PlaywrightPhotopeaTransportOptions, Button (+21 more)

### Community 25 - "session.types.test.ts"
Cohesion: 0.33
Nodes (5): printWidth, $schema, semi, singleQuote, trailingComma

## Knowledge Gaps
- **234 isolated node(s):** `$schema`, `singleQuote`, `semi`, `trailingComma`, `browserbase:probe` (+229 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PhotopeaMessage` connect `FakeEditorSession` to `Run Contracts, Live View & Steering`, `Run Cost, Limits & Metering`, `PhotopeaTransport`, `playwright-photopea-transport.ts`, `FakeEditorSession`, `PhotopeaDocumentBridge`, `PhotopeaBridge`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `Markdown style guide` connect `Project Rules & Markdown Style` to `Git Workflow & Conventions`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `name()` connect `PhotopeaMessage` to `Run Cost, Limits & Metering`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `$schema`, `singleQuote`, `semi` to the rest of the system?**
  _234 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Astra Ideation & Selection` be split into smaller, more focused modules?**
  _Cohesion score 0.057057057057057055 - nodes in this community are weakly interconnected._
- **Should `Formatting, Hooks & Package Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.057057057057057055 - nodes in this community are weakly interconnected._
- **Should `Editor, Browser & Scope Limits` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._