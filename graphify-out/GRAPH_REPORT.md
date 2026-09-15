# Graph Report - hosted-browser-hardening  (2026-09-16)

## Corpus Check
- 209 files · ~576,305 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 30 file(s) not represented in the graph (top: (none) 12, .ndjson 10, .lock 3)

## Summary
- 1924 nodes · 4303 edges · 105 communities (84 shown, 21 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 470 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a17e3873`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- photopea-editor-session.test.ts
- responses-model.ts
- app.ts
- photopea-document-exporter.ts
- artifact-store.ts
- loop.test.ts
- browserbase-probe.ts
- live-frames.browser.test.ts
- photopea-page-session.ts
- photopea-action-runner.ts
- photopea-document-exporter.test.ts
- Goal-Driven Execution
- Launch acceptance checklist (evening of September 17)
- run-routes.test.ts
- PhotopeaBridge
- validateImageUpload
- createLaunchRuntime
- startFramePump
- PhotopeaMessage
- FakeEditorSession
- photopea-editor-session.integration.test.ts
- trap-probe.ts
- responses-model-steering.test.ts
- SteerLedger
- ADR-0003: Export a parser-backed Photopea snapshot
- Gitiles
- compilerOptions
- RunRegistry
- Layered PSD output (the wedge)
- Google Developer Documentation Style Guide
- live-steer.ts
- Desktop workbench layout (1280 px minimum, desktop-required message below)
- CommonMark spec
- run-routes.ts
- AgentModel
- run.ts
- runtime.ts
- run-log.ts
- Conventional Commits
- Swap Test
- run-registry.ts
- agent/contract.ts
- Agent instructions
- scripts
- run-reliability.ts
- agent-run.ts
- RunHandle
- bun (package manager and script runner)
- driving-mechanism/package.json
- page-routes.ts
- application.ts
- Photopea round-trip evidence
- suite.ts
- package.json
- Photopea
- Code Search
- Simplicity First
- Think Before Coding
- live-run.ts
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
- WarmSessionPool
- browserbaseEditorSession
- ResponsesModel
- computer tool (GA)
- agent-run.test.ts
- helper.ts
- session.ts
- report.ts
- BrowserbaseClient
- Stream-per-directory repository layout
- establishVisitorIdentity
- Ten-image reliability suite design
- Layered PSD export implementation plan
- responses-model.test.ts
- Native steering
- Global constraints
- EditorSession
- harness.ts
- managedAgentRun
- Codex proxy run
- Agent instructions
- Agent run
- Photopea production export evidence
- workflow.test.ts
- Explicit link paths (relative only within the same directory)
- .husky/pre-push hook
- editor/index.ts
- FR-20: apply a typed mid-run correction without discarding completed work
- playwright-core
- Four run limits (step cap, spend cap, free runs, daily ceiling)
- measure.ts
- RunRouteDependencies
- Launch day runbook
- Warm editor session

## God Nodes (most connected - your core abstractions)
1. `createLaunchRuntime()` - 38 edges
2. `LayerInfo` - 37 edges
3. `RunRegistry` - 33 edges
4. `EditorSession` - 31 edges
5. `RunEvent` - 29 edges
6. `PhotopeaMessage` - 29 edges
7. `PhotopeaBridge` - 28 edges
8. `ComputerAction` - 26 edges
9. `playwright-core` - 25 edges
10. `ResponsesModel` - 25 edges

## Surprising Connections (you probably didn't know these)
- `Atomic free admission with microdollar spend reservations` --conceptually_related_to--> `FREE_LIMIT`  [INFERRED]
  docs/references/launch-application-design.md → src/server/meter-store.ts
- `startRequest()` --shares_data_with--> `document-preview.png (flattened document preview fixture)`  [INFERRED]
  test/server/run-routes.test.ts → src/editor/fixtures/document-preview.png
- `openInput()` --references--> `Sample product photograph (sample-photo.png)`  [INFERRED]
  test/web/application.browser.test.ts → src/web/assets/sample-photo.png
- `htmlFile` --references--> `index.html (Layerhand single-page shell)`  [INFERRED]
  test/web/dom.test.ts → src/web/index.html
- `Prettier owns syntax, not prose` --references--> `printWidth`  [INFERRED]
  docs/agents/rules.md → .prettierrc.json

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

## Communities (105 total, 21 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, prettier, sharp, @types/bun (+2 more)

### Community 1 - "photopea-editor-session.test.ts"
Cohesion: 0.09
Nodes (7): PhotopeaExportSnapshot, PhotopeaEditorSession, PhotopeaSessionWork, closeWithWork(), documentCalls(), fixture(), screenshot()

### Community 2 - "responses-model.ts"
Cohesion: 0.12
Nodes (21): BUTTONS, COMMON_PROMPT, correctionText(), describeCodeResult(), Json, keys(), ModelTransport, number() (+13 more)

### Community 3 - "app.ts"
Cohesion: 0.06
Nodes (72): Accessibility baseline (keyboard file picker, visible focus, aria-live status, reduced motion), Five-state pure client reducer (landing, input, running, result, error), SSE sequence-id replay and sessionStorage reconnect, RunSnapshot, accepted(), boolean(), decodeRunEvent(), decodeRunSnapshot() (+64 more)

### Community 4 - "photopea-document-exporter.ts"
Cohesion: 0.08
Nodes (40): selectBytes(), selectPngExport(), selectPsdExport(), validPng(), ADJUSTMENT_DEFAULT_NAMES, ADJUSTMENT_LABELS, assertLayerNames(), buildLayerRenamePlan() (+32 more)

### Community 5 - "artifact-store.ts"
Cohesion: 0.09
Nodes (13): artifactPublisher(), ArtifactKind, ArtifactPutRequest, ArtifactStore, createArtifactKey(), EXTENSIONS, StoredArtifact, createS3Bucket() (+5 more)

### Community 6 - "loop.test.ts"
Cohesion: 0.10
Nodes (11): CLICK, DONE, EDITABLE_LAYERS, editableFixture(), fixture(), RECORDED_LAYERS, request, RETOUCH (+3 more)

### Community 7 - "browserbase-probe.ts"
Cohesion: 0.22
Nodes (9): BrowserbaseLiveView, BrowserbaseSession, BrowserbaseProbeClient, BrowserbaseProbeEvidence, BrowserbaseProbeOptions, createReadOnlyLiveView(), main(), runBrowserbaseProbe() (+1 more)

### Community 8 - "live-frames.browser.test.ts"
Cohesion: 0.09
Nodes (22): HTTP surface aligned with Contract 3 plus /health, Bun SQL metering and waitlist tables (visitor_usage, daily_usage, waitlist_emails), Idempotent waitlist endpoint and CSV export (bun run waitlist:export), waitlist:export, MemoryArtifactStore, createDatabase(), databaseReady(), applyMigrations() (+14 more)

### Community 9 - "photopea-page-session.ts"
Cohesion: 0.17
Nodes (6): KEY_NAMES, layerInfo(), PhotopeaPageSession, playwrightKey(), PNG_SIGNATURE, PSD_SIGNATURE

### Community 10 - "photopea-action-runner.ts"
Cohesion: 0.09
Nodes (16): AuxiliaryButton, AuxiliaryMouse, KEY_ALIASES, normalizeKey(), PhotopeaActionPage, PhotopeaActionRunner, unknownKey(), createPhotopeaEditorSession() (+8 more)

### Community 11 - "photopea-document-exporter.test.ts"
Cohesion: 0.13
Nodes (14): PhotopeaDocumentExporter, PhotopeaDocumentBridge, adjustmentKinds, exporter(), LiveLayer, namedPsd(), psd(), adjustments (+6 more)

### Community 13 - "Launch acceptance checklist (evening of September 17)"
Cohesion: 0.16
Nodes (24): leonxlnx/taste-skill skill collection, FR-30: public landing page with the differentiator and a silent demo loop, FR-31: email capture live and collecting before launch day, FR-32: thirty-second silent demo recording usable on Product Hunt, Launch acceptance checklist (evening of September 17), Launch schedule (September 12-18, launch Friday 12:01am PT), NFR-1: reliability, eight of ten test runs complete unattended with a valid layered file, Risk: reliability of long GUI control (+16 more)

### Community 14 - "run-routes.test.ts"
Cohesion: 0.10
Nodes (19): createApplication(), AdmissionDenied, AdmissionRequest, AdmissionResult, assertMicroUsd(), DAILY_LIMIT, FREE_LIMIT, MeterReservation (+11 more)

### Community 15 - "PhotopeaBridge"
Cohesion: 0.10
Nodes (21): NFR-3: a run starts within five seconds of the button, Browserbase probe command (creation-to-ready latency), Document-count snapshot before file delivery, Per-bridge FIFO for complete document opens, Unique app.echoToOE sentinel per scripted call, Issue #15 installed-Chrome upload measurement, Photopea postMessage protocol, Photopea known traps (+13 more)

### Community 16 - "validateImageUpload"
Cohesion: 0.05
Nodes (49): FR-1: accept one JPEG/PNG image up to 20 MB and 6000 px, FR-3: reject invalid input with a specific reason, FR-4: three worked example instructions that fill the box on click, FR-5: one sample image usable without uploading, Target users: e-commerce photo teams, real-estate photographers, freelance retouchers, Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle), API error shape { code, message }, Upload form (picker and drop, inline rejections, three example instructions, bundled sample photograph) (+41 more)

### Community 17 - "createLaunchRuntime"
Cohesion: 0.15
Nodes (13): MAX_RUN_REQUEST_BODY_BYTES, createLaunchRuntime(), developmentNumber(), LaunchRuntime, readRunMode(), agentRuntime(), opened, runtimeWithBudget() (+5 more)

### Community 18 - "startFramePump"
Cohesion: 0.13
Nodes (9): FRAME_INTERVAL_MS, FramePump, FramePumpOptions, startFramePump(), pumpFor(), ManualClock, numbered(), settle() (+1 more)

### Community 19 - "PhotopeaMessage"
Cohesion: 0.10
Nodes (7): PhotopeaConfiguration, PhotopeaMessage, ControlledTransport, LateSentinelTransport, MemoryTransport, MemoryBridge, ImageTransport

### Community 20 - "FakeEditorSession"
Cohesion: 0.07
Nodes (27): FR-28: flattened PNG preview alongside the PSD, EditorSession interface (Contract 1), FakeEditorSession, ORIGINAL, cloneAction(), copyBytes(), EditorRecording, FakeEditorSession (+19 more)

### Community 21 - "photopea-editor-session.integration.test.ts"
Cohesion: 0.21
Nodes (7): assertCompleteLayerTree(), LayerCompletionError, LayerCompletionErrorCode, expectIncomplete(), locateMaskThumbnail(), viewport, waitForMaskThumbnail()

### Community 23 - "trap-probe.ts"
Cohesion: 0.06
Nodes (40): InputFixtureEvidence, persistInputFixture(), recordOutputPath(), temporaryDirectories, dependencies, ag-psd, playwright, sharp (+32 more)

### Community 24 - "responses-model-steering.test.ts"
Cohesion: 0.09
Nodes (16): CLICK, Connection, created(), Inbox, Json, observe(), SCREENSHOT, scriptedFetch() (+8 more)

### Community 25 - "SteerLedger"
Cohesion: 0.06
Nodes (21): hasToolCall(), HeaderedWebSocket, isObject(), Json, openResponsesSocket(), REPORTED, ResponsesSocket, ResponsesSocketOptions (+13 more)

### Community 26 - "ADR-0003: Export a parser-backed Photopea snapshot"
Cohesion: 0.05
Nodes (42): ADR-0001: Define a provider-neutral editor session, Alternatives considered, Consequences, Context, Decision, Expose Photopea or Playwright directly, Let the agent loop own browser interaction, References (+34 more)

### Community 28 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleDetection, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck (+5 more)

### Community 29 - "RunRegistry"
Cohesion: 0.20
Nodes (6): measure(), RunRegistry background event pump with sixty-minute terminal retention, copyResult(), copySnapshot(), RunRegistry, RunRegistryError

### Community 30 - "Layered PSD output (the wedge)"
Cohesion: 0.13
Nodes (26): FR-25: PSD opens without error in Photoshop, Affinity Photo and GIMP, FR-26: every layer named in human words, FR-27: masks and adjustment layers remain editable, FR-33: Product Hunt assets (tagline, description, gallery images, first maker comment), Adobe Photoshop API v2, autoRetouch, BRIA AI, Commercial gate (risk 1: the commercial case vs the survey) (+18 more)

### Community 32 - "live-steer.ts"
Cohesion: 0.08
Nodes (24): at(), browserbase, ceiling, client, correction, cost, events, imagePath (+16 more)

### Community 33 - "Desktop workbench layout (1280 px minimum, desktop-required message below)"
Cohesion: 0.22
Nodes (10): FR-15: show the running session cost in credits, FR-16: per-user history of past runs (P2, deferred by the non-goals), NFR-7: page works at 1280 px and above; mobile out of scope, Requirement-level exclusions (no accounts, no in-app editing, no undo, PSD-only output, no internationalisation), Product non-goals (no image generation, no batch/API/integrations, no accounts beyond metering, no mobile, no own editor, no presets), Desktop workbench layout (1280 px minimum, desktop-required message below), #desktop-required notice (workbench needs a desktop at least 1280 pixels wide), appFile (+2 more)

### Community 35 - "run-routes.ts"
Cohesion: 0.24
Nodes (8): apiError(), boundedFormData(), json(), jsonObject(), registryError(), RequestTooLargeError, RunRoutes, RunStartError

### Community 36 - "AgentModel"
Cohesion: 0.19
Nodes (9): ScriptedModel, AgentModel, ModelTurn, Observation, CLICK, SCRIPT, ScriptedModel, ScriptedModelOptions (+1 more)

### Community 37 - "run.ts"
Cohesion: 0.10
Nodes (23): capCredits, codeLines, codex, decoder, estimateCredits(), events, exported, findSessionLog() (+15 more)

### Community 38 - "runtime.ts"
Cohesion: 0.12
Nodes (22): Environment configuration names (DATABASE_URL, SESSION_SECRET, FREE_DAILY_BUDGET_USD, S3_*, BROWSERBASE_API_KEY, OPENAI_API_KEY, TRUST_PROXY_HOPS), DEFAULT_RUN_LIMITS, Environment, EnvironmentName, parsePositiveDecimal(), parsePositiveInteger(), parseTrustedProxyHops(), readConfig() (+14 more)

### Community 39 - "run-log.ts"
Cohesion: 0.19
Nodes (11): RunStopReason, RunFailureCode, createRunLogger(), failureReason(), redact(), RunLoggerOptions, runLogLine, RunLogStore (+3 more)

### Community 40 - "Conventional Commits"
Cohesion: 0.21
Nodes (17): Branch naming (<type>/<short-description>), Breaking change marker (! and BREAKING CHANGE footer), Conventional commit types (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test), Conventional Commits, gh pr create --fill-first, Conventional issue and pull request titles, Bug report issue form, Issue template chooser config (blank issues disabled) (+9 more)

### Community 41 - "Swap Test"
Cohesion: 0.17
Nodes (22): Contest outcome against the four inferred criteria, Three product properties: editable output, visible work, steerable work, Keyboard-only accessibility agent, Astra Hackathon, Async tool calling (primitive), Computer use (primitive), Computer use x mid-turn steering (Round 9), Whole-corpus contradiction finder (runner-up) (+14 more)

### Community 42 - "run-registry.ts"
Cohesion: 0.11
Nodes (19): NFR-8: per-run observability (step count, token spend, outcome, failure reason), RunLogRecord one-line completion log, Per-run structured log line, ManagedRun, ManagedRunMetrics, RunFailure, initialSnapshot(), RegisterRun (+11 more)

### Community 43 - "agent/contract.ts"
Cohesion: 0.14
Nodes (12): RunEvent, RunResult, EventLog, fakeRun(), FakeRunOptions, SCRIPT, cut(), runAgent() (+4 more)

### Community 44 - "Agent instructions"
Cohesion: 0.25
Nodes (8): AGENTS.md (agent instruction entry point), AGENTS.md as the single agent entry point, .agents/skills/ skills directory, astra-challenge skill, Agent instructions, Instructions, Project documents, References

### Community 45 - "scripts"
Cohesion: 0.16
Nodes (15): Bun 1.4.2 runtime pin (lockfile version 2, frozen installs), /health readiness endpoint (process and database readiness), Two-stage non-root container pinned to Bun 1.4.2, scripts, build, dev, lint:fix, reliability (+7 more)

### Community 46 - "run-reliability.ts"
Cohesion: 0.21
Nodes (12): parseOutputRoot(), parsePositiveDecimal(), parsePositiveInteger(), readReliabilityCommandConfig(), ReliabilityCommandConfig, REQUIRED_ENV_VARS, runReliabilityCommand(), ReliabilityFailureCode (+4 more)

### Community 47 - "agent-run.ts"
Cohesion: 0.15
Nodes (10): AgentLoopDependencies, graphemes, PublishedKind, TokenUsage, ASTRA_PRICING, Spend, TokenPricing, EXPORT_GRACE_MS (+2 more)

### Community 48 - "RunHandle"
Cohesion: 0.25
Nodes (9): RunHandle, RunRequest, collect(), endOf(), EventOf, ofType(), RunContractSubject, testRunContract() (+1 more)

### Community 49 - "bun (package manager and script runner)"
Cohesion: 0.13
Nodes (20): graphify CLI and knowledge graph (graphify-out/), Query the graph before reading source, Run graphify update after modifying code, RTK condensed command output, rtk proxy fallback, bun (package manager and script runner), Prettier owns syntax, not prose, graphify-labs/graphify skill collection (+12 more)

### Community 50 - "driving-mechanism/package.json"
Cohesion: 0.20
Nodes (9): dependencies, ag-psd, ag-psd, name, private, scripts, dry-run, harness (+1 more)

### Community 51 - "page-routes.ts"
Cohesion: 0.17
Nodes (11): PAGE_SHELL_PATH, PageRouteOptions, pageRoutes(), attribute(), SOCIAL_IMAGE_PATHS, socialMetaTags(), withSocialMeta(), connect() (+3 more)

### Community 52 - "application.ts"
Cohesion: 0.18
Nodes (8): Security and error-handling rules (textContent not innerHTML, restrictive CSP, egress policy, export before release), Application, APPLICATION_CSP, ApplicationDependencies, BASE_SECURITY_HEADERS, json(), PHOTOPEA_HOST_CSP, secured()

### Community 53 - "Photopea round-trip evidence"
Cohesion: 0.25
Nodes (7): Digests, Evidence limits, Files, Photopea round-trip evidence, Photoshop verification, Reproduction, Timing definitions

### Community 54 - "suite.ts"
Cohesion: 0.15
Nodes (13): ReliabilityCommandDependencies, ReliabilityCase, loadCaseImage(), ReliabilityCaseResult, ReliabilityPublish, ReliabilitySuiteOptions, runReliabilitySuite(), StartReliabilityRun (+5 more)

### Community 55 - "package.json"
Cohesion: 0.13
Nodes (13): dependencies, ag-psd, playwright-core, ag-psd, sharp, @commitlint/cli, @commitlint/config-conventional, husky (+5 more)

### Community 56 - "Photopea"
Cohesion: 0.14
Nodes (25): FR-2: free-text instruction of up to 500 characters, NFR-4: twenty simultaneous runs without queueing, then a queue with a stated position, Photopea licence question (answered: automated and commercial use permitted), Risk: the scripting escape hatch, ag-psd fallback, Browser provider shortlist (Browserbase, Anchor, Hyperbrowser, Steel), Browserbase, Editor adapter (+17 more)

### Community 60 - "live-run.ts"
Cohesion: 0.12
Nodes (14): browserbase, ceiling, client, cost, events, imagePath, INSTRUCTION, last (+6 more)

### Community 71 - "Driving mechanism evidence"
Cohesion: 0.40
Nodes (4): Driving mechanism evidence, Findings from building it, Running it, What a run does

### Community 72 - "WarmSessionPool"
Cohesion: 0.13
Nodes (12): claimed(), Entry, imageDigest(), MAX_WARM_SESSIONS, WARM_SESSION_TTL_MS, WarmEditorSession, WarmSessionPool, WarmSessionPoolOptions (+4 more)

### Community 73 - "browserbaseEditorSession"
Cohesion: 0.14
Nodes (11): LiveAgentDependencies, browserbaseEditorSession, BrowserbaseSessions, closedError(), comparableOrigin(), connectOverCdp(), installNetworkAllowList(), RemoteBrowser (+3 more)

### Community 74 - "ResponsesModel"
Cohesion: 0.23
Nodes (5): errorCode(), isObject(), narrationOf(), ResponsesModel, safeCode()

### Community 75 - "computer tool (GA)"
Cohesion: 0.40
Nodes (6): Code-execution tool over a persistent Playwright session, computer tool (GA), ComputerAction type, Orchestrator, OpenAI Responses API (gpt-6-astra), Spike A0: code execution or the computer tool

### Community 76 - "agent-run.test.ts"
Cohesion: 0.15
Nodes (6): createRecordedFakeEditorSession(), liveAgentRun(), live(), run(), runtimes, samplePath

### Community 78 - "helper.ts"
Cohesion: 0.14
Nodes (12): AsyncFunction, pageCodeRunner(), api, codeLog, host, [imagePath, outputArgument, portArgument], output, port (+4 more)

### Community 79 - "session.ts"
Cohesion: 0.08
Nodes (29): SessionState, cloneLayerInfo(), cloneLayerTree(), PhotopeaActionRunnerOptions, CreatePhotopeaEditorSessionOptions, LayerhandWindow, PhotopeaPageMessage, PhotopeaWireMessage (+21 more)

### Community 80 - "report.ts"
Cohesion: 0.29
Nodes (12): formatCacheRate(), formatCost(), formatReliabilityMarkdown(), formatReliabilityTerminal(), formatStatus(), redactSecrets(), SECRET_PATTERNS, SerializableReliabilityCaseResult (+4 more)

### Community 81 - "BrowserbaseClient"
Cohesion: 0.24
Nodes (5): BrowserbaseClient, BrowserbaseError, Fetch, requiredString(), RecordedRequest

### Community 82 - "Stream-per-directory repository layout"
Cohesion: 0.40
Nodes (6): Surgical Changes, Atomic commits, Rebase merge, never squash, Server-side repository setup (gh api merge settings), Single feat/launch-application branch, squash-merged by the coordinator, Stream-per-directory repository layout

### Community 83 - "establishVisitorIdentity"
Cohesion: 0.32
Nodes (10): Signed visitor cookie and HMAC visitor key (TRUST_PROXY_HOPS), clientAddress(), establishVisitorIdentity(), hmac(), readCookie(), signVisitorId(), validSignedId(), VisitorIdentity (+2 more)

### Community 84 - "Ten-image reliability suite design"
Cohesion: 0.17
Nodes (11): Acceptance mapping, Corpus contract, Execution flow, Expected file layout, Goals, Nightly workflow and spending guard, Non-goals, Results and visibility (+3 more)

### Community 85 - "Layered PSD export implementation plan"
Cohesion: 0.18
Nodes (10): Global constraints, Issue #17 parallel boundary, Layered PSD export implementation plan, Task 1: Migrate the recursive layer contract, Task 2: Parse exported PSD metadata, Task 3: Enforce names and completed-tree policy, Task 4: Build the correlated Photopea export transaction, Task 5: Translate computer actions (+2 more)

### Community 86 - "responses-model.test.ts"
Cohesion: 0.17
Nodes (5): CodeRunner, ResponsesApiError, SCREENSHOT, Sent, USAGE

### Community 87 - "Native steering"
Cohesion: 0.33
Nodes (5): Completed work survived the correction, Native steering, Result, Running it, The correction, and what the socket saw

### Community 88 - "Global constraints"
Cohesion: 0.22
Nodes (8): Global constraints, Task 1: Add and validate the representative corpus, Task 2: Run cases sequentially and validate their PSDs, Task 3: Persist and format inspectable reports, Task 4: Add the paid production command, Task 5: Publish the guarded nightly result, Task 6: Run final verification and prepare review, Ten-image reliability suite implementation plan

### Community 90 - "harness.ts"
Cohesion: 0.15
Nodes (12): DEFAULT_IMAGES, INSTRUCTION, logPath, outputDirectory, records, registry, RunRecord, server (+4 more)

### Community 92 - "managedAgentRun"
Cohesion: 0.27
Nodes (7): managedAgentRun(), CODES, describeFailure(), FailureRecorder, Operation, redactDiagnostic(), watchedSession()

### Community 93 - "Codex proxy run"
Cohesion: 0.40
Nodes (4): Codex proxy run, How it runs, Results, Running it

### Community 94 - "Agent instructions"
Cohesion: 0.40
Nodes (4): Agent instructions, Instructions, Project documents, References

### Community 95 - "Agent run"
Cohesion: 0.50
Nodes (3): Agent run, Result, Running it

### Community 96 - "Photopea production export evidence"
Cohesion: 0.50
Nodes (3): Photopea production export evidence, Provenance and reproduction, Retained artifact

### Community 97 - "workflow.test.ts"
Cohesion: 0.50
Nodes (3): WorkflowDefinition, WorkflowJob, WorkflowStep

### Community 100 - "editor/index.ts"
Cohesion: 0.10
Nodes (26): Filename verification through Document.source, ERROR_MESSAGES, EXIF_SIGNATURE, ImageFormat, ImageUploadError, ImageUploadErrorCode, JPEG_SOF_MARKERS, JPEG_SOI (+18 more)

### Community 101 - "FR-20: apply a typed mid-run correction without discarding completed work"
Cohesion: 0.11
Nodes (31): FR-10: live view of the editor (at least one frame per 2 s, at most 3 s behind), FR-13: cancel at any point and keep the partial result, FR-14: survive a page reload by resuming the live view, FR-20: apply a typed mid-run correction without discarding completed work, FR-21: acknowledge a correction visibly within three seconds, FR-22: show accepted corrections in a visible list, FR-23: correction that undoes work already done (P2), FR-29: list the layers on the page after the run (+23 more)

### Community 102 - "playwright-core"
Cohesion: 0.08
Nodes (16): Compact base64 upload transfer, playwright-core, bridge, fixturePath, samplePath, server, session, viewport (+8 more)

### Community 103 - "Four run limits (step cap, spend cap, free runs, daily ceiling)"
Cohesion: 0.13
Nodes (33): FR-11: progress as step count against the cap with plain-words current action, FR-12: stop at the step cap and return a layered partial result, FR-35: three free runs per visitor, enforced server-side, FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs, FR-37: global daily spend ceiling that stops free-allowance runs, FR-38: paid credit top-ups (P2), NFR-2: no single run exceeds $8 of model spend, NFR-5: no server API key reaches the browser; user keys never logged, persisted or sent beyond OpenAI (+25 more)

### Community 106 - "measure.ts"
Cohesion: 0.20
Nodes (13): cookieFrom(), filename, image, imageBlob(), imagePath, Measurement, output, summary (+5 more)

### Community 110 - "Launch day runbook"
Cohesion: 0.22
Nodes (8): Changing a limit in a hurry, Launch day runbook, Rotating the server key, See also, The clock, The freeze, and the no-deploy rule, When the providers misbehave, Where to look when something is wrong

### Community 116 - "Warm editor session"
Cohesion: 0.50
Nodes (3): Result, Running it, Warm editor session

## Ambiguous Edges - Review These
- `EXAMPLES` → `Cobalt glass bottle`  [AMBIGUOUS]
  src/web/assets/sample-photo.png · relation: conceptually_related_to

## Knowledge Gaps
- **443 isolated node(s):** `$schema`, `singleQuote`, `semi`, `trailingComma`, `INSTRUCTION` (+438 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 741 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `EXAMPLES` and `Cobalt glass bottle`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `playwright-core` connect `playwright-core` to `photopea-editor-session.test.ts`, `editor/index.ts`, `browserbase-probe.ts`, `live-frames.browser.test.ts`, `photopea-page-session.ts`, `photopea-action-runner.ts`, `browserbaseEditorSession`, `agent-run.test.ts`, `helper.ts`, `session.ts`, `PhotopeaBridge`, `createLaunchRuntime`, `photopea-editor-session.integration.test.ts`, `package.json`, `EditorSession`, `harness.ts`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `LayerInfo` connect `session.ts` to `photopea-editor-session.test.ts`, `app.ts`, `editor/index.ts`, `photopea-document-exporter.ts`, `FR-20: apply a typed mid-run correction without discarding completed work`, `WarmSessionPool`, `photopea-page-session.ts`, `agent/contract.ts`, `agent-run.test.ts`, `FakeEditorSession`, `photopea-editor-session.integration.test.ts`, `harness.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `PhotopeaDocumentLoader` connect `PhotopeaBridge` to `editor/index.ts`, `playwright-core`, `browserbase-probe.ts`, `photopea-page-session.ts`, `photopea-action-runner.ts`, `session.ts`, `validateImageUpload`, `photopea-editor-session.integration.test.ts`, `Photopea`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `LayerInfo` (e.g. with `Layers panel: Retouched copy above Original photograph` and `LayerInfo type`) actually correct?**
  _`LayerInfo` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `singleQuote`, `semi` to the rest of the system?**
  _443 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `photopea-editor-session.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08771929824561403 - nodes in this community are weakly interconnected._