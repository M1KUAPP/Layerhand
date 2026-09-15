# Graph Report - astra-implementor  (2026-09-15)

## Corpus Check
- 139 files · ~181,474 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1269 nodes · 2754 edges · 86 communities (67 shown, 19 thin omitted)
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 428 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `041d94d8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Git Workflow & Repo Tooling
- Run Contract & API Client
- Run Routes & Visitor Admission
- Single-Page Workbench UI
- Run Cost, Limits & Metering
- Artifact Storage
- Image Upload Validation
- Browserbase Client & Probe
- Config, Scripts & Health
- Meter Store & Reservations
- Playwright Photopea Transport
- Photopea Bridge Tests
- Launch Design, Testing & Deploy
- Launch Criteria & Go/No-Go
- Waitlist Store & Migrations
- Contracts, Steering & Live View
- Sample Photo & Upload Form
- Server Runtime Composition
- Photopea Protocol & Traps
- Recorded Editor Fixtures
- Layerhand Pitch & Model Leverage
- Live Photopea Loader Probes
- Session Types & Viewport
- TRD Top-Level Sections
- FakeEditorSession Internals
- Photopea Transport Interface
- Ideation Rounds
- Markdown Layout Rules
- TypeScript Compiler Options
- Competition & Commercial Gate
- Layered PSD Wedge & Launch Copy
- inferred-edges-project-conventions.md
- Swap Test & Primitives
- Application Security Headers
- Markdown Style Basics
- Document Loader Verification
- Metered credits business model
- Route Dependencies & Waitlist
- Agent Behavioral Guidelines
- ComputerAction Session Types
- PRD Sections
- Computer Use & Fallbacks
- Markdown Link Rules
- Markdown Code Rules
- Agent Entry Points & Skills
- PRD Requirement Groups
- TRD Browser Runtime
- EditorSession Interface
- FR-20: apply a typed mid-run correction without discarding completed work
- TRD Editor Adapter
- Agent Tooling Decision (A0)
- Editor Session Contract Tests
- RunRequest type (Contract 2)
- Competition Sections
- inferred-edges-layerhand.md
- TRD Agent Loop
- Project Document Files
- Line Limit & Exceptions
- TRD Three Contracts
- Think Before Coding
- Merge rules kept by convention (branch rulesets and protection unavailable)
- Better/Best Rule
- Code spans for inline code and escaping
- Google docguide philosophy
- Informative link titles
- Lazy list numbering and 4-space nested indent
- Preserve original product name capitalization
- Single H1 heading
- Unique, complete heading names
- OpenAI image generation tool
- Driving mechanism evidence
- Atomic commits
- photopea-document-loader.ts
- FR-20: apply a typed mid-run correction without discarding completed work
- Photopea
- ExpectedSession
- .prettierrc.json
- FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs
- computer tool (GA)
- responses-model.test.ts
- run-registry.test.ts
- Atomic commits
- Q: Why does `Project conventions (rules.md)` connect `Git Workflow & Conventions` to `Formatting & Package Tooling`, `Markdown Style Guide`, `Agent Instruction Bundle`?
- inferred-edges-layerhand.md
- MemoryArtifactStore

## God Nodes (most connected - your core abstractions)
1. `RunRegistry` - 26 edges
2. `createLaunchRuntime()` - 25 edges
3. `RunEvent` - 24 edges
4. `FakeEditorSession` - 22 edges
5. `PhotopeaMessage` - 22 edges
6. `Sample product photograph (sample-photo.png)` - 21 edges
7. `PhotopeaBridge` - 20 edges
8. `EditorSession` - 19 edges
9. `Photopea` - 19 edges
10. `RunRequest` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Prettier owns syntax, not prose` --references--> `printWidth`  [INFERRED]
  docs/agents/rules.md → .prettierrc.json
- `startRequest()` --shares_data_with--> `document-preview.png (flattened document preview fixture)`  [INFERRED]
  test/server/run-routes.test.ts → src/editor/fixtures/document-preview.png
- `runRequest()` --shares_data_with--> `document-preview.png (flattened document preview fixture)`  [INFERRED]
  test/server/runtime.test.ts → src/editor/fixtures/document-preview.png
- `openInput()` --references--> `Sample product photograph (sample-photo.png)`  [INFERRED]
  test/web/application.browser.test.ts → src/web/assets/sample-photo.png
- `htmlFile` --references--> `index.html (Layerhand single-page shell)`  [INFERRED]
  test/web/dom.test.ts → src/web/index.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Checks sharing the commitlint rule set** — commitlint_config, husky_commit_msg, github_workflows_conventional_lint, github_workflows_issue_title_lint [EXTRACTED 1.00]
- **Four enforced run limits** — docs_trd_run_limits, docs_prd_fr_12, docs_prd_nfr_2, docs_prd_fr_35, docs_prd_fr_37 [EXTRACTED 1.00]
- **Three contracts and fakes enabling a three-way parallel build** — docs_trd_editorsession, docs_trd_runrequest, docs_trd_runevent, docs_trd_runresult, docs_trd_runhandle, docs_trd_http_api_surface, docs_trd_fake_editor_session, docs_trd_fake_run, docs_trd_stub_http_server, docs_trd_contract_tests [EXTRACTED 1.00]
- **Three product consequences of quadratic screenshot cost: hard step cap, aggressive caching, never unmetered** — docs_product_quadratic_screenshot_cost, docs_product_step_cap_product_parameter, docs_product_aggressive_caching, docs_product_metered_credits_model [EXTRACTED 1.00]
- **Recorded Photopea session fixtures loaded into one EditorRecording** — src_editor_fake_editor_session_createrecordedfakeeditorsession, src_editor_fake_editor_session_editorrecording, src_editor_fixtures_photopea_frame_image, src_editor_fixtures_document_preview_image [EXTRACTED 1.00]
- **Recorded Photopea session: editor frame, flattened preview, and layer metadata** — src_editor_fixtures_photopea_frame_image, src_editor_fixtures_document_preview_image, src_editor_fake_editor_session_editorrecording, src_editor_fake_editor_session_createrecordedfakeeditorsession [EXTRACTED 1.00]
- **Photopea results verified by reading state back** — docs_trd_photopea_traps, docs_trd_echo_sentinel, docs_trd_document_count_snapshot, docs_trd_document_source_filename_verification [INFERRED 0.85]
- **Flattened document preview (FR-28) from contract to recorded fixture and its test** — docs_prd_fr_28, src_editor_session_editorsession_exportpreview, src_editor_fake_editor_session_fakeeditorsession_exportpreview, src_editor_fixtures_document_preview_image, test_editor_recorded_fake_editor_session_test [INFERRED 0.85]
- **Five client reducer states and the app.ts renderers that draw them** — docs_references_launch_application_design_client_reducer_states, src_web_state_reduceclientstate, src_web_app_renderlanding, src_web_app_renderinput, src_web_app_renderrunning, src_web_app_renderresult, src_web_app_rendererror [INFERRED 0.85]
- **Run admission pipeline: validate the image, establish the visitor, admit against the meter, store the upload, then start the run** — docs_references_launch_application_design_admission_order, src_editor_image_upload_validateimageupload, src_server_visitor_identity_establishvisitoridentity, src_server_meter_store_meterstore_admit, src_server_artifact_store_artifactstore_put, src_server_run_routes_runroutes_start [INFERRED 0.85]
- **Original photograph and Retouched copy layer pair: shown, recorded, and asserted** — src_editor_fixtures_photopea_frame_layers_panel, src_editor_fixtures_photopea_frame_history_panel, src_editor_fake_editor_session_createrecordedfakeeditorsession, test_editor_recorded_fake_editor_session_test [INFERRED 0.95]
- **Use-the-sample-photograph flow, from button to run upload (FR-5)** — docs_prd_fr_5, src_web_app_renderinput, src_web_app_choosesample, src_web_assets_sample_photo_image, src_web_app_choosefile, src_web_api_runapi_start, test_web_application_browser_test_openinput [INFERRED 0.95]

## Communities (86 total, 19 thin omitted)

### Community 0 - "Git Workflow & Repo Tooling"
Cohesion: 0.09
Nodes (24): @commitlint/cli, @commitlint/config-conventional, Answer, Outcome, Q: What connects `@commitlint/cli`, `@commitlint/config-conventional`, `husky` to the rest of the system?, Source Nodes, husky, .husky/pre-push hook (+16 more)

### Community 1 - "Run Contract & API Client"
Cohesion: 0.25
Nodes (9): RunEvent, RunResult, EventLog, FakeRunOptions, ORIGINAL, SCRIPT, LayerInfo, Viewport (+1 more)

### Community 2 - "Run Routes & Visitor Admission"
Cohesion: 0.06
Nodes (42): AsyncFunction, pageCodeRunner(), DEFAULT_IMAGES, INSTRUCTION, logPath, outputDirectory, records, registry (+34 more)

### Community 3 - "Single-Page Workbench UI"
Cohesion: 0.06
Nodes (68): Single-screen core flow, Accessibility baseline (keyboard file picker, visible focus, aria-live status, reduced motion), Bun full-stack HTML import (src/server/index.ts serves src/web/index.html), Five-state pure client reducer (landing, input, running, result, error), SSE sequence-id replay and sessionStorage reconnect, RunSnapshot, accepted(), boolean() (+60 more)

### Community 4 - "Run Cost, Limits & Metering"
Cohesion: 0.27
Nodes (13): FR-12: stop at the step cap and return a layered partial result, NFR-2: no single run exceeds $8 of model spend, Aggressive prompt caching (4x unit-cost swing), Risk: cost per run under real traffic, Hard step cap as a product parameter, Astra agent loop, Bounded frame window, No unit tests of model behaviour (+5 more)

### Community 5 - "Artifact Storage"
Cohesion: 0.12
Nodes (10): ArtifactKind, ArtifactPutRequest, createArtifactKey(), EXTENSIONS, StoredArtifact, createS3Bucket(), S3ArtifactStore, S3ArtifactStoreConfig (+2 more)

### Community 6 - "Image Upload Validation"
Cohesion: 0.11
Nodes (8): CLICK, DONE, fixture(), RECORDED_LAYERS, request, RETOUCH, TEN_PASSES, USAGE

### Community 7 - "Browserbase Client & Probe"
Cohesion: 0.09
Nodes (21): FR-10: live view of the editor (at least one frame per 2 s, at most 3 s behind), Browserbase probe command (creation-to-ready latency), Read-only sandboxed live-view iframe (pointer-events none, tabindex -1), Live frame pump, browserbase:probe, Browserbase probe usage against a deployed /photopea-host, BrowserbaseClient, BrowserbaseError (+13 more)

### Community 8 - "Config, Scripts & Health"
Cohesion: 0.27
Nodes (9): Bun SQL metering and waitlist tables (visitor_usage, daily_usage, waitlist_emails), createDatabase(), applyMigrations(), csvField(), formatWaitlistCsv(), main(), SqlWaitlistStore, databases (+1 more)

### Community 9 - "Meter Store & Reservations"
Cohesion: 0.16
Nodes (7): KEY_NAMES, layerInfo(), PhotopeaPageSession, playwrightKey(), PNG_SIGNATURE, PSD_SIGNATURE, ComputerAction

### Community 10 - "Playwright Photopea Transport"
Cohesion: 0.29
Nodes (7): ScriptedModel, ModelTurn, Observation, CLICK, SCRIPT, ScriptedModelOptions, wait()

### Community 11 - "Photopea Bridge Tests"
Cohesion: 0.09
Nodes (8): PhotopeaDocumentBridge, PhotopeaConfiguration, PhotopeaMessage, ControlledTransport, LateSentinelTransport, MemoryTransport, ImageTransport, RecordingBridge

### Community 13 - "Launch Criteria & Go/No-Go"
Cohesion: 0.26
Nodes (13): leonxlnx/taste-skill skill collection, FR-30: public landing page with the differentiator and a silent demo loop, FR-31: email capture live and collecting before launch day, FR-32: thirty-second silent demo recording usable on Product Hunt, Launch acceptance checklist (evening of September 17), NFR-1: reliability, eight of ten test runs complete unattended with a valid layered file, Launch audience risk (no waitlist), Must-be-true launch criteria (product brief) (+5 more)

### Community 14 - "Waitlist Store & Migrations"
Cohesion: 0.15
Nodes (13): AdmissionDenied, AdmissionRequest, AdmissionResult, DAILY_LIMIT, MeterReservation, MeterStore, usdToMicroUsd(), databases (+5 more)

### Community 15 - "Contracts, Steering & Live View"
Cohesion: 0.13
Nodes (12): NFR-3: a run starts within five seconds of the button, Unique app.echoToOE sentinel per scripted call, Issue #15 installed-Chrome upload measurement, Photopea postMessage protocol, Photopea known traps, Reusable Photopea bridge boot, Pre-warmed editor sessions, Spike B1: verify the image-in, PSD-out round trip (+4 more)

### Community 16 - "Sample Photo & Upload Form"
Cohesion: 0.08
Nodes (40): FR-1: accept one JPEG/PNG image up to 20 MB and 6000 px, FR-5: one sample image usable without uploading, Thirty-second silent demo storyboard, Upload form (picker and drop, inline rejections, three example instructions, bundled sample photograph), EXIF orientation-aware expected dimensions, Upload validation before session creation, detectFormat(), ERROR_MESSAGES (+32 more)

### Community 17 - "Server Runtime Composition"
Cohesion: 0.11
Nodes (18): Application, RunRegistryOptions, createLaunchRuntime(), developmentNumber(), Environment, LaunchRuntime, LaunchRuntimeOptions, readRunMode() (+10 more)

### Community 18 - "Photopea Protocol & Traps"
Cohesion: 0.17
Nodes (9): FramePump, FramePumpOptions, startFramePump(), Phase, pumpFor(), retouch(), select(), numbered() (+1 more)

### Community 19 - "Recorded Editor Fixtures"
Cohesion: 0.14
Nodes (21): FR-28: flattened PNG preview alongside the PSD, Risk: the scripting escape hatch, ComputerAction type, Editor adapter, EditorSession interface (Contract 1), FakeEditorSession, Photopea, Photopea Action Manager stub (stringIDToTypeID lookup table) (+13 more)

### Community 20 - "Layerhand Pitch & Model Leverage"
Cohesion: 0.23
Nodes (3): cloneAction(), copyBytes(), FakeEditorSession

### Community 21 - "Live Photopea Loader Probes"
Cohesion: 0.24
Nodes (15): FR-35: three free runs per visitor, enforced server-side, FR-37: global daily spend ceiling that stops free-allowance runs, FR-38: paid credit top-ups (P2), Bring-your-own-key, Metered credits business model, Quadratic screenshot-history cost (~$3.50 cached vs ~$14.50 uncached per image), Ideation unit economics estimate ($3-6 per image), Atomic free admission with microdollar spend reservations (+7 more)

### Community 22 - "Session Types & Viewport"
Cohesion: 0.31
Nodes (9): FR-20: apply a typed mid-run correction without discarding completed work, FR-21: acknowledge a correction visibly within three seconds, FR-22: show accepted corrections in a visible list, FR-23: correction that undoes work already done (P2), Orchestrator, Native steering via response.steer, OpenAI Responses API (gpt-6-astra), Spike A3: does native mid-turn steering work (+1 more)

### Community 23 - "TRD Top-Level Sections"
Cohesion: 0.10
Nodes (27): InputFixtureEvidence, persistInputFixture(), recordOutputPath(), temporaryDirectories, jpeg, OUTPUT_DIRECTORY, PHOTOPEA_URL, SerializedMessage (+19 more)

### Community 24 - "FakeEditorSession Internals"
Cohesion: 0.32
Nodes (3): fakeRun(), cut(), runAgent()

### Community 25 - "Photopea Transport Interface"
Cohesion: 0.11
Nodes (9): ManagedRun, initialSnapshot(), RegisterRun, RunRegistryError, RunStatus, StoredRun, Subscriber, RunRouteDependencies (+1 more)

### Community 26 - "Ideation Rounds"
Cohesion: 0.07
Nodes (25): ADR-0001: Define a provider-neutral editor session, Alternatives considered, Consequences, Context, Decision, Expose Photopea or Playwright directly, Let the agent loop own browser interaction, References (+17 more)

### Community 28 - "TypeScript Compiler Options"
Cohesion: 0.11
Nodes (17): DOM, ESNext, src/**/*.ts, test/**/*.ts, compilerOptions, lib, module, moduleDetection (+9 more)

### Community 29 - "Competition & Commercial Gate"
Cohesion: 0.18
Nodes (9): Stream-per-directory repository layout, Answer, Outcome, Q: Why does `Git workflow reference` connect `Git Workflow & Conventions` to `Astra Ideation & Selection`?, Source Nodes, Answer, Outcome, Q: Why does `Stream-per-directory repository layout` connect `Git Workflow & Conventions` to `Formatting & Package Tooling`, `Run Contracts, Live View & Steering`, `Editor, Browser & Scope Limits`, `Launch Criteria & Go/No-Go`? (+1 more)

### Community 30 - "Layered PSD Wedge & Launch Copy"
Cohesion: 0.21
Nodes (14): FR-25: PSD opens without error in Photoshop, Affinity Photo and GIMP, FR-26: every layer named in human words, FR-27: masks and adjustment layers remain editable, FR-33: Product Hunt assets (tagline, description, gallery images, first maker comment), Flat-output competitors (Photoroom, Clipdrop, Pixelcut, Claid, Pixelbin, remove.bg, Evoto, Imagen AI, Aftershoot, BoxBrownie), Flat-output problem in AI retouching, Judged-well criteria (differentiator stated after a silent viewing; layer stack survives a retoucher's inspection), Layered PSD output (the wedge) (+6 more)

### Community 31 - "inferred-edges-project-conventions.md"
Cohesion: 0.22
Nodes (9): RTK condensed command output, rtk proxy fallback, Explicit link paths (relative only within the same directory), Google Developer Documentation Style Guide, Capitalization of titles and headings, Answer, Outcome, Q: Are the 6 inferred relationships involving `Project conventions (rules.md)` (e.g. with `RTK condensed command output` and `rtk proxy fallback`) actually correct? (+1 more)

### Community 32 - "Swap Test & Primitives"
Cohesion: 0.27
Nodes (10): Open question: official contest rules, Before-committing checks (deadline and prize terms, Photopea terms and trademark, waitlist), GPT-6 Astra Challenge (OpenAI x Product Hunt), Inferred judging rubric (WebMCP Challenge criteria), WebMCP, Issue 23 contest-rules investigation (official Product Hunt surface only), Answer, Outcome (+2 more)

### Community 33 - "Application Security Headers"
Cohesion: 0.23
Nodes (16): FR-13: cancel at any point and keep the partial result, FR-14: survive a page reload by resuming the live view, FR-15: show the running session cost in credits, FR-29: list the layers on the page after the run, Contract tests, fakeRun(), Fakes-first development, HTTP API surface (Contract 3) (+8 more)

### Community 35 - "Document Loader Verification"
Cohesion: 0.13
Nodes (19): FR-3: reject invalid input with a specific reason, Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle), API error shape { code, message }, Signed visitor cookie and HMAC visitor key (TRUST_PROXY_HOPS), apiError(), json(), jsonObject(), registryError() (+11 more)

### Community 36 - "Metered credits business model"
Cohesion: 0.06
Nodes (19): LayerInfo type, EditorRecording, SessionState, Button, EditorSession, LayerInfo, Pt, documentOperations (+11 more)

### Community 37 - "Route Dependencies & Waitlist"
Cohesion: 0.22
Nodes (10): FR-11: progress as step count against the cap with plain-words current action, FR-16: per-user history of past runs (P2, deferred by the non-goals), NFR-7: page works at 1280 px and above; mobile out of scope, Requirement-level exclusions (no accounts, no in-app editing, no undo, PSD-only output, no internationalisation), Product non-goals (no image generation, no batch/API/integrations, no accounts beyond metering, no mobile, no own editor, no presets), Desktop workbench layout (1280 px minimum, desktop-required message below), #desktop-required notice (workbench needs a desktop at least 1280 pixels wide), appFile (+2 more)

### Community 38 - "Agent Behavioral Guidelines"
Cohesion: 0.20
Nodes (12): Environment configuration names (DATABASE_URL, SESSION_SECRET, FREE_DAILY_BUDGET_USD, S3_*, BROWSERBASE_API_KEY, OPENAI_API_KEY, TRUST_PROXY_HOPS), ConfigurationError, Environment, EnvironmentName, parseBudget(), parseTrustedProxyHops(), readConfig(), REQUIRED_NAMES (+4 more)

### Community 39 - "ComputerAction Session Types"
Cohesion: 0.17
Nodes (13): RunStopReason, createRunLogger(), failureReason(), redact(), RunLoggerOptions, runLogLine, RunLogStore, SqlRunLogStore (+5 more)

### Community 40 - "PRD Sections"
Cohesion: 0.21
Nodes (17): Branch naming (<type>/<short-description>), Breaking change marker (! and BREAKING CHANGE footer), Conventional commit types (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test), Conventional Commits, gh pr create --fill-first, Conventional issue and pull request titles, Bug report issue form, Issue template chooser config (blank issues disabled) (+9 more)

### Community 41 - "Computer Use & Fallbacks"
Cohesion: 0.22
Nodes (18): Three product properties: editable output, visible work, steerable work, Keyboard-only accessibility agent, Astra Hackathon, Async tool calling (primitive), Computer use (primitive), Computer use x mid-turn steering (Round 9), Whole-corpus contradiction finder (runner-up), Hosted-browser computer use (Round 2) (+10 more)

### Community 42 - "Markdown Link Rules"
Cohesion: 0.22
Nodes (5): measure(), RunRegistry background event pump with sixty-minute terminal retention, copyResult(), copySnapshot(), RunRegistry

### Community 43 - "Markdown Code Rules"
Cohesion: 0.23
Nodes (10): ManagedRun server adapter (cache metrics, stop reason, releaseSecrets), RunHandle, RunRequest, collect(), endOf(), EventOf, ofType(), RunContractSubject (+2 more)

### Community 44 - "Agent Entry Points & Skills"
Cohesion: 0.15
Nodes (12): AGENTS.md (agent instruction entry point), AGENTS.md as the single agent entry point, .agents/skills/ skills directory, astra-challenge skill, Answer, Outcome, Q: Why does `Project conventions (rules.md)` connect `Git Workflow & Conventions` to `Formatting & Package Tooling`, `Markdown Style Guide`, `Agent Instruction Bundle`?, Source Nodes (+4 more)

### Community 45 - "PRD Requirement Groups"
Cohesion: 0.14
Nodes (17): Bun 1.4.2 runtime pin (lockfile version 2, frozen installs), /health readiness endpoint (process and database readiness), HTTP surface aligned with Contract 3 plus /health, Two-stage non-root container pinned to Bun 1.4.2, scripts, build, dev, lint:fix (+9 more)

### Community 46 - "TRD Browser Runtime"
Cohesion: 0.14
Nodes (13): dependencies, ag-psd, playwright, sharp, ag-psd, sharp, name, private (+5 more)

### Community 47 - "EditorSession Interface"
Cohesion: 0.22
Nodes (8): AgentLoopDependencies, graphemes, PublishedKind, AgentModel, TokenUsage, ASTRA_PRICING, Spend, TokenPricing

### Community 48 - "FR-20: apply a typed mid-run correction without discarding completed work"
Cohesion: 0.16
Nodes (9): Compact base64 upload transfer, decodePhotopeaWireMessage(), isByteArray(), LayerhandWindow, PhotopeaWireMessage, PlaywrightPhotopeaTransport, PlaywrightPhotopeaTransportOptions, Viewport (+1 more)

### Community 49 - "TRD Editor Adapter"
Cohesion: 0.31
Nodes (11): graphify CLI and knowledge graph (graphify-out/), Query the graph before reading source, Run graphify update after modifying code, bun (package manager and script runner), Prettier owns syntax, not prose, graphify-labs/graphify skill collection, Local hook setup (bun install, then uv tool install graphifyy), Lint workflow (formatting) (+3 more)

### Community 50 - "Agent Tooling Decision (A0)"
Cohesion: 0.20
Nodes (9): dependencies, ag-psd, ag-psd, name, private, scripts, dry-run, harness (+1 more)

### Community 51 - "Editor Session Contract Tests"
Cohesion: 0.29
Nodes (12): Adobe Photoshop API v2, autoRetouch, BRIA AI, Commercial gate (risk 1: the commercial case vs the survey), Competition survey (twenty-six products plus a four-product follow-up), Adobe Firefly Creative Production (Remove Background preset, masked layered PSD), Adobe Firefly Services (enterprise access), Human retouching price ceiling ($0.39-$2.00 per image) (+4 more)

### Community 52 - "RunRequest type (Contract 2)"
Cohesion: 0.15
Nodes (12): Security and error-handling rules (textContent not innerHTML, restrictive CSP, egress policy, export before release), APPLICATION_CSP, ApplicationDependencies, BASE_SECURITY_HEADERS, createApplication(), json(), PHOTOPEA_HOST_CSP, secured() (+4 more)

### Community 53 - "Competition Sections"
Cohesion: 0.25
Nodes (7): Contents, Digests, Evidence limits, Photopea round-trip evidence, Photoshop verification, Reproduction, Timing definitions

### Community 54 - "inferred-edges-layerhand.md"
Cohesion: 0.29
Nodes (7): Contest outcome against the four inferred criteria, GPT-6 Astra, Risk: reliability of long GUI control, OSWorld V2-Offline benchmark, Astra cannot generate an image (text-output-only irony), First maker comment opening line, Text-only inversion

### Community 55 - "TRD Agent Loop"
Cohesion: 0.33
Nodes (4): dependencies, playwright-core, lint-staged, playwright-core

### Community 56 - "Project Document Files"
Cohesion: 0.23
Nodes (15): FR-2: free-text instruction of up to 500 characters, FR-4: three worked example instructions that fill the box on click, NFR-4: twenty simultaneous runs without queueing, then a queue with a stated position, Browser provider shortlist (Browserbase, Anchor, Hyperbrowser, Steel), Browserbase, Export-then-destroy session disposal, Fifteen-minute run ceiling, Hosted Chrome session over CDP (+7 more)

### Community 71 - "Driving mechanism evidence"
Cohesion: 0.40
Nodes (4): Driving mechanism evidence, Findings from building it, Running it, What a run does

### Community 72 - "Atomic commits"
Cohesion: 0.16
Nodes (7): Idempotent waitlist endpoint and CSV export (bun run waitlist:export), MemoryWaitlistStore, normalizeWaitlistEmail(), WaitlistAddResult, WaitlistEmailError, WaitlistEntry, WaitlistStore

### Community 73 - "photopea-document-loader.ts"
Cohesion: 0.11
Nodes (19): Document-count snapshot before file delivery, Per-bridge FIFO for complete document opens, Filename verification through Document.source, ImageFormat, ValidatedImageUpload, PhotopeaBridgeOptions, PhotopeaProtocolError, PhotopeaProtocolErrorCode (+11 more)

### Community 74 - "FR-20: apply a typed mid-run correction without discarding completed work"
Cohesion: 0.29
Nodes (3): artifactPublisher(), ArtifactStore, RecordingArtifacts

### Community 75 - "Photopea"
Cohesion: 0.31
Nodes (9): Launch schedule (September 12-18, launch Friday 12:01am PT), Day-2 technical go/no-go (kill switch), Photopea licence question (answered: automated and commercial use permitted), Code-execution tool over a persistent Playwright session, computer tool (GA), Photopea Distributor account, Spike A0: code execution or the computer tool, Spike A1: can the agent complete one edit unattended (+1 more)

### Community 77 - ".prettierrc.json"
Cohesion: 0.33
Nodes (5): printWidth, $schema, semi, singleQuote, trailingComma

### Community 78 - "FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs"
Cohesion: 0.53
Nodes (5): FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs, NFR-5: no server API key reaches the browser; user keys never logged, persisted or sent beyond OpenAI, NFR-6: uploaded images deleted within twenty-four hours, User-supplied OpenAI key handling (bypasses admission, not per-run caps; never stored), Secrets and upload handling

### Community 79 - "computer tool (GA)"
Cohesion: 0.14
Nodes (7): text(), ScriptedModel, managedAgentRun(), managedFakeRun(), run(), runtimes, samplePath

### Community 80 - "responses-model.test.ts"
Cohesion: 0.38
Nodes (3): bun, databaseReady(), databases

### Community 82 - "Atomic commits"
Cohesion: 0.50
Nodes (5): Surgical Changes, Atomic commits, Rebase merge, never squash, Server-side repository setup (gh api merge settings), Single feat/launch-application branch, squash-merged by the coordinator

### Community 83 - "Q: Why does `Project conventions (rules.md)` connect `Git Workflow & Conventions` to `Formatting & Package Tooling`, `Markdown Style Guide`, `Agent Instruction Bundle`?"
Cohesion: 0.50
Nodes (5): NFR-8: per-run observability (step count, token spend, outcome, failure reason), RunLogRecord one-line completion log, Per-run structured log line, ManagedRunMetrics, TerminalRun

### Community 84 - "inferred-edges-layerhand.md"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Are the 3 inferred relationships involving `Layerhand` (e.g. with `Computer use x mid-turn steering (Round 9)` and `Product non-goals (no image generation, no batch/API/integrations, no accounts beyond metering, no mobile, no own editor, no presets)`) actually correct?, Source Nodes

## Ambiguous Edges - Review These
- `EXAMPLES` → `Cobalt glass bottle`  [AMBIGUOUS]
  src/web/assets/sample-photo.png · relation: conceptually_related_to

## Knowledge Gaps
- **240 isolated node(s):** `$schema`, `singleQuote`, `semi`, `trailingComma`, `AsyncFunction` (+235 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `EXAMPLES` and `Cobalt glass bottle`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Stream-per-directory repository layout` connect `Competition & Commercial Gate` to `Application Security Headers`, `Browserbase Client & Probe`, `PRD Sections`, `Launch Criteria & Go/No-Go`, `TRD Editor Adapter`, `Atomic commits`, `Recorded Editor Fixtures`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `validateImageUpload()` connect `Sample Photo & Upload Form` to `photopea-document-loader.ts`, `Document Loader Verification`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `Photopea` connect `Recorded Editor Fixtures` to `Route Dependencies & Waitlist`, `Computer Use & Fallbacks`, `photopea-document-loader.ts`, `Photopea`, `Contracts, Steering & Live View`, `Sample Photo & Upload Form`, `Project Document Files`, `Layered PSD Wedge & Launch Copy`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `$schema`, `singleQuote`, `semi` to the rest of the system?**
  _240 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Git Workflow & Repo Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.08666666666666667 - nodes in this community are weakly interconnected._
- **Should `Run Routes & Visitor Admission` be split into smaller, more focused modules?**
  _Cohesion score 0.05576441102756892 - nodes in this community are weakly interconnected._