# Graph Report - feat-launch-application  (2026-09-15)

## Corpus Check
- 102 files · ~150,698 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 838 nodes · 1550 edges · 49 communities (41 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.72)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0f84b3fb`
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
- playwright-photopea-transport.ts
- Layerhand
- container-smoke.sh
- PhotopeaTransport
- Saved query: are Layerhand's inferred relationships correct
- Saved query: are Swap Test's inferred relationships correct
- playwright-photopea-transport.ts
- FakeEditorSession
- PhotopeaDocumentBridge
- session.types.test.ts
- session.types.test.ts
- PhotopeaBridge
- waitlist-export.ts
- PRD: Layerhand
- Functional requirements
- editor-session.contract.ts
- Competition
- state.ts
- Enforcement layers (What enforces what)
- Prettier owns syntax, not prose
- session.types.test.ts
- Links
- Codeblocks
- ExpectedSession
- Headings
- Skills (installed skill collections)
- application.ts
- SqlMeterStore
- photopea-document-loader.integration.test.ts
- Andrej Karpathy Skills
- dom.test.ts
- assets.d.ts

## God Nodes (most connected - your core abstractions)
1. `PhotopeaMessage` - 22 edges
2. `RunRegistry` - 21 edges
3. `Project conventions (rules.md)` - 21 edges
4. `FakeEditorSession` - 20 edges
5. `Launch application design` - 18 edges
6. `PhotopeaTransport` - 17 edges
7. `TRD: Layerhand` - 17 edges
8. `Git workflow reference` - 17 edges
9. `PhotopeaBridge` - 16 edges
10. `Product Hunt ideas: GPT-6 Astra Challenge` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Prettier owns syntax, not prose` --references--> `printWidth`  [INFERRED]
  docs/agents/rules.md → .prettierrc.json
- `Prettier owns syntax, not prose` --references--> `lint-staged`  [EXTRACTED]
  docs/agents/rules.md → package.json
- `bun (package manager and script runner)` --references--> `prepare`  [INFERRED]
  docs/agents/rules.md → package.json
- `Local hook setup (bun install, then uv tool install graphifyy)` --references--> `prepare`  [INFERRED]
  docs/references/git-workflow.md → package.json
- `bun (package manager and script runner)` --references--> `lint`  [EXTRACTED]
  docs/agents/rules.md → package.json

## Import Cycles
- None detected.

## Communities (49 total, 8 thin omitted)

### Community 0 - "Astra Ideation & Selection"
Cohesion: 0.12
Nodes (16): Before committing, Launch artifact, Product Hunt ideas: GPT-6 Astra Challenge, Round 10 — The five-day filter, and the text-only inversion, Round 1 — Computer use, desktop-native, Round 2 — Computer use, hosted browser only, Round 3 — Million-token single-pass context, Round 4 — Async tool calling (+8 more)

### Community 1 - "Formatting, Hooks & Package Tooling"
Cohesion: 0.06
Nodes (33): @commitlint/cli, @commitlint/config-conventional, Saved query: what connects @commitlint/cli, @commitlint/config-conventional and husky, husky, lint-staged, dependencies, playwright-core, devDependencies (+25 more)

### Community 2 - "Run Contracts, Live View & Steering"
Cohesion: 0.19
Nodes (10): createRecordedFakeEditorSession(), EditorRecording, SessionState, PhotopeaBridgeOptions, PhotopeaProtocolError, PhotopeaProtocolErrorCode, createPhotopeaHostHtml(), Button (+2 more)

### Community 3 - "Editor, Browser & Scope Limits"
Cohesion: 0.05
Nodes (43): Advertising, An agent driving a browser is an attack surface, Contract 1: editor session, Contract 2: run orchestration, Contract 3: the HTTP surface, Cost control, Decisions deferred to spikes, Deployment (+35 more)

### Community 4 - "Run Cost, Limits & Metering"
Cohesion: 0.09
Nodes (31): detectFormat(), ERROR_MESSAGES, EXIF_SIGNATURE, ImageFormat, ImageUploadError, ImageUploadErrorCode, isStandaloneJpegMarker(), JPEG_SOF_MARKERS (+23 more)

### Community 5 - "Project Rules & Markdown Style"
Cohesion: 0.13
Nodes (15): Better is better than best, Capitalization, Document layout, Images, Lists, Markdown style guide, Minimum viable documentation, Nested list spacing (+7 more)

### Community 6 - "Git Workflow & Conventions"
Cohesion: 0.17
Nodes (12): AGENTS.md (agent instruction entry point), CLAUDE.md (symlink to AGENTS.md), Graphify, RTK, AGENTS.md as the single agent entry point, .agents/skills/ skills directory, Skills (installed skill collections), graphify-labs/graphify skill collection (+4 more)

### Community 7 - "Launch Criteria & Go/No-Go"
Cohesion: 0.06
Nodes (32): RunEvent, RunHandle, RunRequest, RunResult, collect(), endOf(), EventOf, ofType() (+24 more)

### Community 8 - "Competition & Commercial Gate"
Cohesion: 0.11
Nodes (18): Artifact storage, Browserbase boundary, Delivery structure, External checkpoints and issue closure, Goals, Input and admission order, Launch application design, Metering and waitlist persistence (+10 more)

### Community 9 - "Agent Behavioral Guidelines"
Cohesion: 0.18
Nodes (14): apiError(), json(), jsonObject(), registryError(), RunRoutes, clientAddress(), establishVisitorIdentity(), hmac() (+6 more)

### Community 10 - "compilerOptions"
Cohesion: 0.11
Nodes (17): DOM, ESNext, src/**/*.ts, test/**/*.ts, compilerOptions, lib, module, moduleDetection (+9 more)

### Community 11 - "fake-editor-session.ts"
Cohesion: 0.13
Nodes (15): fakeRun(), createApplication(), AdmissionDenied, AdmissionRequest, AdmissionResult, DAILY_LIMIT, FREE_LIMIT, MeterReservation (+7 more)

### Community 12 - "Product: Layerhand"
Cohesion: 0.08
Nodes (12): ArtifactKind, ArtifactPutRequest, ArtifactStore, createArtifactKey(), EXTENSIONS, MemoryArtifactStore, StoredArtifact, S3ArtifactStore (+4 more)

### Community 13 - "FakeEditorSession"
Cohesion: 0.07
Nodes (9): PhotopeaBridge, PhotopeaDocumentBridge, PhotopeaMessage, PhotopeaTransport, ControlledTransport, LateSentinelTransport, MemoryTransport, ImageTransport (+1 more)

### Community 14 - "PhotopeaDocumentBridge"
Cohesion: 0.11
Nodes (15): BrowserbaseClient, BrowserbaseError, BrowserbaseLiveView, BrowserbaseSession, Fetch, requiredString(), BrowserbaseProbeClient, BrowserbaseProbeEvidence (+7 more)

### Community 15 - "PhotopeaMessage"
Cohesion: 0.19
Nodes (12): ConfigurationError, Environment, EnvironmentName, parseBudget(), parseTrustedProxyHops(), readConfig(), REQUIRED_NAMES, requiredEnvironment() (+4 more)

### Community 16 - "playwright-photopea-transport.ts"
Cohesion: 0.14
Nodes (21): RunSnapshot, accepted(), boolean(), decodeRunEvent(), decodeRunSnapshot(), eventId(), EventSourceFactory, EventSourceLike (+13 more)

### Community 17 - "Layerhand"
Cohesion: 0.25
Nodes (7): Architecture, Browserbase probe, Container, Layerhand, Requirements, Run locally, Verify

### Community 19 - "PhotopeaTransport"
Cohesion: 0.17
Nodes (12): Business model, Non-goals, Open questions, Product: Layerhand, Risks and the kill switch, See also, Success criteria, The problem (+4 more)

### Community 22 - "playwright-photopea-transport.ts"
Cohesion: 0.11
Nodes (12): PhotopeaConfiguration, PhotopeaEnvironment, PhotopeaEnvironmentParameters, decodePhotopeaWireMessage(), DEFAULT_VIEWPORT, isByteArray(), LayerhandWindow, PhotopeaWireMessage (+4 more)

### Community 23 - "FakeEditorSession"
Cohesion: 0.23
Nodes (4): cloneAction(), copyBytes(), FakeEditorSession, ComputerAction

### Community 24 - "PhotopeaDocumentBridge"
Cohesion: 0.16
Nodes (7): MemoryWaitlistStore, normalizeWaitlistEmail(), SqlWaitlistStore, WaitlistAddResult, WaitlistEmailError, WaitlistEntry, WaitlistStore

### Community 25 - "session.types.test.ts"
Cohesion: 0.27
Nodes (17): Project conventions (rules.md), Git workflow reference, Atomic commits, Branch naming (<type>/<short-description>), Breaking change marker (! and BREAKING CHANGE footer), Conventional commit types (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test), Conventional Commits, gh pr create --fill-first (+9 more)

### Community 26 - "session.types.test.ts"
Cohesion: 0.29
Nodes (4): documentOperations, frameA, frameB, psd

### Community 28 - "waitlist-export.ts"
Cohesion: 0.24
Nodes (10): bun, createDatabase(), databaseReady(), applyMigrations(), csvField(), formatWaitlistCsv(), main(), databases (+2 more)

### Community 29 - "PRD: Layerhand"
Cohesion: 0.29
Nodes (7): Deliberately excluded, Launch acceptance, Non-functional requirements, PRD: Layerhand, Schedule, See also, The core flow

### Community 30 - "Functional requirements"
Cohesion: 0.29
Nodes (7): Functional requirements, Input, Launch surface, Metering, Output, Steering, The run

### Community 31 - "editor-session.contract.ts"
Cohesion: 0.15
Nodes (5): EditorSession, defineEditorSessionContract(), EditorSessionFactory, pngSignature, image()

### Community 32 - "Competition"
Cohesion: 0.40
Nodes (5): Adobe is the serious threat, and it is already shipped, And the demand signal is missing, Competition, The claim, corrected, The price ceiling is the real problem

### Community 34 - "state.ts"
Cohesion: 0.13
Nodes (41): api, applicationRoot, brandHeader(), button(), chooseFile(), chooseSample(), close(), description() (+33 more)

### Community 35 - "Enforcement layers (What enforces what)"
Cohesion: 0.33
Nodes (5): Enforcement layers (What enforces what), Checklist, How it was verified, What changed, .husky/commit-msg hook

### Community 36 - "Prettier owns syntax, not prose"
Cohesion: 0.17
Nodes (12): bun (package manager and script runner), Prettier owns syntax, not prose, Local hook setup (bun install, then uv tool install graphifyy), Character line limit, Exceptions, lint, prepare, printWidth (+4 more)

### Community 37 - "session.types.test.ts"
Cohesion: 0.22
Nodes (7): ActionVariantKeyChecks, Assert, Assertions, ExpectedAction, IsExact, KeysOfUnion, MethodIsExact

### Community 38 - "Links"
Cohesion: 0.25
Nodes (8): Avoid relative paths unless within the same directory, Define reference links after their first use, Links, Reference links, Use explicit paths for links within Markdown, Use informative Markdown link titles, Use reference links for long links, Use reference links to reduce duplication

### Community 39 - "Codeblocks"
Cohesion: 0.25
Nodes (8): Code, Codeblocks, Declare the language, Escape newlines, Inline, Nest codeblocks within lists, Use code span for escaping, Use fenced code blocks instead of indented code blocks

### Community 41 - "Headings"
Cohesion: 0.33
Nodes (6): Add spacing to headings, ATX-style headings, Capitalization of titles and headers, Headings, Use a single H1 heading, Use unique, complete names for headings

### Community 42 - "Skills (installed skill collections)"
Cohesion: 0.22
Nodes (6): APPLICATION_CSP, ApplicationDependencies, BASE_SECURITY_HEADERS, json(), PHOTOPEA_HOST_CSP, secured()

### Community 43 - "application.ts"
Cohesion: 0.12
Nodes (12): Application, RunRegistryOptions, createLaunchRuntime(), developmentNumber(), Environment, LaunchRuntime, LaunchRuntimeOptions, managedFakeRun() (+4 more)

### Community 49 - "Andrej Karpathy Skills"
Cohesion: 0.33
Nodes (5): 1. Think Before Coding, 2. Simplicity First, 3. Surgical Changes, 4. Goal-Driven Execution, Andrej Karpathy Skills

### Community 51 - "dom.test.ts"
Cohesion: 0.50
Nodes (3): appFile, cssFile, htmlFile

## Knowledge Gaps
- **259 isolated node(s):** `$schema`, `singleQuote`, `semi`, `trailingComma`, `browserbase:probe` (+254 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `validateImageUpload()` connect `Run Cost, Limits & Metering` to `Agent Behavioral Guidelines`, `Run Contracts, Live View & Steering`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Why does `ImageUploadError` connect `Run Cost, Limits & Metering` to `Agent Behavioral Guidelines`, `Run Contracts, Live View & Steering`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `bun` connect `waitlist-export.ts` to `PhotopeaDocumentBridge`, `compilerOptions`, `fake-editor-session.ts`, `Product: Layerhand`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `$schema`, `singleQuote`, `semi` to the rest of the system?**
  _259 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Astra Ideation & Selection` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Formatting, Hooks & Package Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.06050420168067227 - nodes in this community are weakly interconnected._
- **Should `Editor, Browser & Scope Limits` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._