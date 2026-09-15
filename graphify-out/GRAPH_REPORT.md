# Graph Report - hosted-browser-hardening  (2026-09-16)

## Corpus Check
- 208 files · ~575,311 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 30 file(s) not represented in the graph (top: (none) 12, .ndjson 10, .lock 3)

## Summary
- 1915 nodes · 4286 edges · 117 communities (95 shown, 22 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 468 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `77b41262`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- photopea-editor-session.ts
- responses-model.ts
- app.ts
- editor/index.ts
- artifact-store.ts
- loop.test.ts
- browserbase-probe.ts
- live-frames.browser.test.ts
- photopea-page-session.ts
- ComputerAction
- PhotopeaMessage
- Goal-Driven Execution
- Launch acceptance checklist (evening of September 17)
- run-routes.test.ts
- Issue #15 installed-Chrome upload measurement
- image-upload.ts
- runtime.ts
- startFramePump
- MemoryTransport
- FakeEditorSession
- FR-12: stop at the step cap and return a layered partial result
- photopea-document-exporter.ts
- trap-probe.ts
- responses-model-steering.test.ts
- SteerLedger
- ADR-0003: Export a parser-backed Photopea snapshot
- Gitiles
- compilerOptions
- RunRegistry
- Competition survey (twenty-six products plus a four-product follow-up)
- Google Developer Documentation Style Guide
- live-steer.ts
- RunEvent stream type (Contract 2)
- CommonMark spec
- run-routes.ts
- AgentModel
- run.ts
- config.ts
- run-log.test.ts
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
- Hosted Chrome session over CDP
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
- browserbase-editor-session.ts
- ResponsesModel
- computer tool (GA)
- agent-run.test.ts
- .prettierrc.json
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
- Sample product photograph (sample-photo.png)
- createRecordedFakeEditorSession
- Codex proxy run
- Agent instructions
- Agent run
- Photopea production export evidence
- workflow.test.ts
- Explicit link paths (relative only within the same directory)
- .husky/pre-push hook
- photopea-document-loader.ts
- FR-20: apply a typed mid-run correction without discarding completed work
- PlaywrightPhotopeaTransport
- Four run limits (step cap, spend cap, free runs, daily ceiling)
- PhotopeaTransport
- Recorded Photopea editor frame (photopea-frame.png, 1440x900)
- measure.ts
- Layered PSD output (the wedge)
- PhotopeaDocumentLoader
- RunRouteDependencies
- Launch day runbook
- fake-editor-session.test.ts
- Contest outcome against the four inferred criteria
- PhotopeaBridge
- Photopea
- editor-session.contract.ts
- Warm editor session

## God Nodes (most connected - your core abstractions)
1. `createLaunchRuntime()` - 38 edges
2. `LayerInfo` - 37 edges
3. `RunRegistry` - 33 edges
4. `EditorSession` - 30 edges
5. `RunEvent` - 29 edges
6. `PhotopeaMessage` - 29 edges
7. `PhotopeaBridge` - 28 edges
8. `ComputerAction` - 26 edges
9. `ResponsesModel` - 25 edges
10. `PlaywrightPhotopeaTransport` - 25 edges

## Surprising Connections (you probably didn't know these)
- `Photopea tool bar (marquee, lasso, magic wand, brush, pen, type tools)` --conceptually_related_to--> `Scripted vs GUI-driven split (the line that protects the premise)`  [INFERRED]
  src/editor/fixtures/photopea-frame.png → docs/TRD.md
- `Prettier owns syntax, not prose` --references--> `printWidth`  [INFERRED]
  docs/agents/rules.md → .prettierrc.json
- `Idempotent waitlist endpoint and CSV export (bun run waitlist:export)` --references--> `waitlist:export`  [EXTRACTED]
  docs/references/launch-application-design.md → package.json
- `Contract tests` --references--> `testRunContract()`  [INFERRED]
  docs/TRD.md → src/agent/contract-tests.ts
- `RunRequest` --implements--> `RunRequest type (Contract 2)`  [INFERRED]
  src/agent/contract.ts → docs/TRD.md

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

## Communities (117 total, 22 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, prettier, sharp, @types/bun (+2 more)

### Community 1 - "photopea-editor-session.ts"
Cohesion: 0.09
Nodes (9): PhotopeaExportSnapshot, createPhotopeaEditorSession(), PhotopeaEditorSession, PhotopeaSessionWork, createPlaywrightAuxiliaryMouse(), closeWithWork(), documentCalls(), fixture() (+1 more)

### Community 2 - "responses-model.ts"
Cohesion: 0.12
Nodes (21): BUTTONS, COMMON_PROMPT, correctionText(), describeCodeResult(), Json, keys(), ModelTransport, number() (+13 more)

### Community 3 - "app.ts"
Cohesion: 0.06
Nodes (72): Accessibility baseline (keyboard file picker, visible focus, aria-live status, reduced motion), Five-state pure client reducer (landing, input, running, result, error), SSE sequence-id replay and sessionStorage reconnect, RunSnapshot, accepted(), boolean(), decodeRunEvent(), decodeRunSnapshot() (+64 more)

### Community 4 - "editor/index.ts"
Cohesion: 0.10
Nodes (35): EditorRecording, SessionState, ADJUSTMENT_DEFAULT_NAMES, ADJUSTMENT_LABELS, assertLayerNames(), buildLayerRenamePlan(), DEFAULT_ADJUSTMENT_NAMES, fallbackName() (+27 more)

### Community 5 - "artifact-store.ts"
Cohesion: 0.11
Nodes (8): ArtifactKind, ArtifactPutRequest, createArtifactKey(), EXTENSIONS, MemoryArtifactStore, StoredArtifact, S3Bucket, UPLOAD

### Community 6 - "loop.test.ts"
Cohesion: 0.10
Nodes (11): CLICK, DONE, EDITABLE_LAYERS, editableFixture(), fixture(), RECORDED_LAYERS, request, RETOUCH (+3 more)

### Community 7 - "browserbase-probe.ts"
Cohesion: 0.20
Nodes (8): Spike B2: Browserbase signup and cold-start measurement, BrowserbaseLiveView, BrowserbaseSession, BrowserbaseProbeClient, BrowserbaseProbeEvidence, BrowserbaseProbeOptions, runBrowserbaseProbe(), SAMPLE_PNG

### Community 8 - "live-frames.browser.test.ts"
Cohesion: 0.11
Nodes (21): /health readiness endpoint (process and database readiness), HTTP surface aligned with Contract 3 plus /health, Bun SQL metering and waitlist tables (visitor_usage, daily_usage, waitlist_emails), Idempotent waitlist endpoint and CSV export (bun run waitlist:export), createDatabase(), databaseReady(), applyMigrations(), csvField() (+13 more)

### Community 9 - "photopea-page-session.ts"
Cohesion: 0.18
Nodes (6): KEY_NAMES, layerInfo(), PhotopeaPageSession, playwrightKey(), PNG_SIGNATURE, PSD_SIGNATURE

### Community 10 - "ComputerAction"
Cohesion: 0.08
Nodes (18): playwright-core, AuxiliaryButton, AuxiliaryMouse, KEY_ALIASES, normalizeKey(), PhotopeaActionPage, PhotopeaActionRunner, PhotopeaActionRunnerOptions (+10 more)

### Community 11 - "PhotopeaMessage"
Cohesion: 0.08
Nodes (20): PhotopeaDocumentExporter, PhotopeaDocumentBridge, PhotopeaMessage, adjustmentKinds, exporter(), LiveLayer, MemoryBridge, namedPsd() (+12 more)

### Community 13 - "Launch acceptance checklist (evening of September 17)"
Cohesion: 0.16
Nodes (24): leonxlnx/taste-skill skill collection, FR-30: public landing page with the differentiator and a silent demo loop, FR-31: email capture live and collecting before launch day, FR-32: thirty-second silent demo recording usable on Product Hunt, Launch acceptance checklist (evening of September 17), Launch schedule (September 12-18, launch Friday 12:01am PT), NFR-1: reliability, eight of ten test runs complete unattended with a valid layered file, Day-2 technical go/no-go (kill switch) (+16 more)

### Community 14 - "run-routes.test.ts"
Cohesion: 0.11
Nodes (16): AdmissionDenied, AdmissionRequest, AdmissionResult, assertMicroUsd(), DAILY_LIMIT, MeterReservation, MeterStore, SqlMeterStore (+8 more)

### Community 15 - "Issue #15 installed-Chrome upload measurement"
Cohesion: 0.25
Nodes (13): NFR-3: a run starts within five seconds of the button, Unique app.echoToOE sentinel per scripted call, Image resolution vs screenshot viewport, Issue #15 installed-Chrome upload measurement, Photopea postMessage protocol, Photopea known traps, Reusable Photopea bridge boot, Screenshot policy: 1440x900, detail original, no downscaling (+5 more)

### Community 16 - "image-upload.ts"
Cohesion: 0.06
Nodes (40): EXIF orientation-aware expected dimensions, Upload validation before session creation, detectFormat(), ERROR_MESSAGES, EXIF_SIGNATURE, ImageUploadError, ImageUploadErrorCode, isStandaloneJpegMarker() (+32 more)

### Community 17 - "runtime.ts"
Cohesion: 0.08
Nodes (24): Single-container continuous deployment, ScriptedModel, artifactPublisher(), Application, createApplication(), ArtifactStore, RunRegistryOptions, MAX_RUN_REQUEST_BODY_BYTES (+16 more)

### Community 18 - "startFramePump"
Cohesion: 0.12
Nodes (12): FRAME_INTERVAL_MS, FramePump, FramePumpOptions, startFramePump(), Phase, pumpFor(), retouch(), select() (+4 more)

### Community 19 - "MemoryTransport"
Cohesion: 0.16
Nodes (4): PhotopeaConfiguration, ControlledTransport, LateSentinelTransport, MemoryTransport

### Community 20 - "FakeEditorSession"
Cohesion: 0.23
Nodes (3): cloneAction(), copyBytes(), FakeEditorSession

### Community 21 - "FR-12: stop at the step cap and return a layered partial result"
Cohesion: 0.26
Nodes (15): FR-11: progress as step count against the cap with plain-words current action, FR-12: stop at the step cap and return a layered partial result, NFR-2: no single run exceeds $8 of model spend, Aggressive prompt caching (4x unit-cost swing), Quadratic screenshot-history cost (~$3.50 cached vs ~$14.50 uncached per image), Ideation unit economics estimate ($3-6 per image), Astra agent loop, Bounded frame window (+7 more)

### Community 22 - "photopea-document-exporter.ts"
Cohesion: 0.21
Nodes (14): selectBytes(), selectPngExport(), selectPsdExport(), validPng(), expectedTree(), noDocumentError(), PhotopeaDocumentExporterOptions, renameScript() (+6 more)

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
Cohesion: 0.19
Nodes (7): measure(), RunRegistry background event pump with sixty-minute terminal retention, copyResult(), copySnapshot(), RunRegistry, RunRegistryError, within()

### Community 30 - "Competition survey (twenty-six products plus a four-product follow-up)"
Cohesion: 0.26
Nodes (13): Adobe Photoshop API v2, autoRetouch, BRIA AI, Commercial gate (risk 1: the commercial case vs the survey), Competition survey (twenty-six products plus a four-product follow-up), Adobe Firefly Creative Production (Remove Background preset, masked layered PSD), Adobe Firefly Services (enterprise access), Human retouching price ceiling ($0.39-$2.00 per image) (+5 more)

### Community 32 - "live-steer.ts"
Cohesion: 0.08
Nodes (24): at(), browserbase, ceiling, client, correction, cost, events, imagePath (+16 more)

### Community 33 - "RunEvent stream type (Contract 2)"
Cohesion: 0.13
Nodes (22): FR-10: live view of the editor (at least one frame per 2 s, at most 3 s behind), FR-15: show the running session cost in credits, FR-16: per-user history of past runs (P2, deferred by the non-goals), FR-28: flattened PNG preview alongside the PSD, FR-29: list the layers on the page after the run, NFR-7: page works at 1280 px and above; mobile out of scope, Requirement-level exclusions (no accounts, no in-app editing, no undo, PSD-only output, no internationalisation), Single-screen core flow (+14 more)

### Community 35 - "run-routes.ts"
Cohesion: 0.21
Nodes (10): FR-3: reject invalid input with a specific reason, API error shape { code, message }, apiError(), boundedFormData(), json(), jsonObject(), registryError(), RequestTooLargeError (+2 more)

### Community 36 - "AgentModel"
Cohesion: 0.21
Nodes (8): ScriptedModel, AgentModel, ModelTurn, Observation, CLICK, SCRIPT, ScriptedModelOptions, wait()

### Community 37 - "run.ts"
Cohesion: 0.10
Nodes (23): capCredits, codeLines, codex, decoder, estimateCredits(), events, exported, findSessionLog() (+15 more)

### Community 38 - "config.ts"
Cohesion: 0.14
Nodes (23): Environment configuration names (DATABASE_URL, SESSION_SECRET, FREE_DAILY_BUDGET_USD, S3_*, BROWSERBASE_API_KEY, OPENAI_API_KEY, TRUST_PROXY_HOPS), parseOutputRoot(), parsePositiveDecimal(), parsePositiveInteger(), readReliabilityCommandConfig(), runReliabilityCommand(), ConfigurationError, Environment (+15 more)

### Community 39 - "run-log.test.ts"
Cohesion: 0.17
Nodes (13): RunStopReason, RunFailureCode, createRunLogger(), failureReason(), redact(), RunLoggerOptions, runLogLine, RunLogStore (+5 more)

### Community 40 - "Conventional Commits"
Cohesion: 0.21
Nodes (17): Branch naming (<type>/<short-description>), Breaking change marker (! and BREAKING CHANGE footer), Conventional commit types (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test), Conventional Commits, gh pr create --fill-first, Conventional issue and pull request titles, Bug report issue form, Issue template chooser config (blank issues disabled) (+9 more)

### Community 41 - "Swap Test"
Cohesion: 0.19
Nodes (20): Three product properties: editable output, visible work, steerable work, Keyboard-only accessibility agent, Astra Hackathon, Async tool calling (primitive), Computer use (primitive), Computer use x mid-turn steering (Round 9), Whole-corpus contradiction finder (runner-up), Hosted-browser computer use (Round 2) (+12 more)

### Community 42 - "run-registry.ts"
Cohesion: 0.12
Nodes (18): NFR-8: per-run observability (step count, token spend, outcome, failure reason), RunLogRecord one-line completion log, Per-run structured log line, ManagedRun, ManagedRunMetrics, RunFailure, initialSnapshot(), RegisterRun (+10 more)

### Community 43 - "agent/contract.ts"
Cohesion: 0.18
Nodes (10): ManagedRun server adapter (cache metrics, stop reason, releaseSecrets), RunEvent, RunResult, EventLog, fakeRun(), FakeRunOptions, SCRIPT, managedFakeRun() (+2 more)

### Community 44 - "Agent instructions"
Cohesion: 0.25
Nodes (8): AGENTS.md (agent instruction entry point), AGENTS.md as the single agent entry point, .agents/skills/ skills directory, astra-challenge skill, Agent instructions, Instructions, Project documents, References

### Community 45 - "scripts"
Cohesion: 0.14
Nodes (16): Bun full-stack HTML import (src/server/index.ts serves src/web/index.html), Bun 1.4.2 runtime pin (lockfile version 2, frozen installs), Two-stage non-root container pinned to Bun 1.4.2, scripts, build, dev, lint:fix, reliability (+8 more)

### Community 46 - "run-reliability.ts"
Cohesion: 0.18
Nodes (10): ReliabilityCommandConfig, ReliabilityCommandDependencies, REQUIRED_ENV_VARS, validateCaseId(), writeReliabilityReport(), loadCaseImage(), ReliabilityFailureCode, runReliabilitySuite() (+2 more)

### Community 47 - "agent-run.ts"
Cohesion: 0.12
Nodes (17): AgentLoopDependencies, cut(), graphemes, PublishedKind, runAgent(), TokenUsage, ASTRA_PRICING, Spend (+9 more)

### Community 48 - "RunHandle"
Cohesion: 0.25
Nodes (9): RunHandle, RunRequest, collect(), endOf(), EventOf, ofType(), RunContractSubject, testRunContract() (+1 more)

### Community 49 - "bun (package manager and script runner)"
Cohesion: 0.19
Nodes (16): graphify CLI and knowledge graph (graphify-out/), Query the graph before reading source, Run graphify update after modifying code, RTK condensed command output, rtk proxy fallback, bun (package manager and script runner), Prettier owns syntax, not prose, graphify-labs/graphify skill collection (+8 more)

### Community 50 - "driving-mechanism/package.json"
Cohesion: 0.20
Nodes (9): dependencies, ag-psd, ag-psd, name, private, scripts, dry-run, harness (+1 more)

### Community 51 - "page-routes.ts"
Cohesion: 0.18
Nodes (9): PAGE_SHELL_PATH, PageRouteOptions, pageRoutes(), attribute(), SOCIAL_IMAGE_PATHS, socialMetaTags(), withSocialMeta(), serve() (+1 more)

### Community 52 - "application.ts"
Cohesion: 0.22
Nodes (7): Security and error-handling rules (textContent not innerHTML, restrictive CSP, egress policy, export before release), APPLICATION_CSP, ApplicationDependencies, BASE_SECURITY_HEADERS, json(), PHOTOPEA_HOST_CSP, secured()

### Community 53 - "Photopea round-trip evidence"
Cohesion: 0.25
Nodes (7): Digests, Evidence limits, Files, Photopea round-trip evidence, Photoshop verification, Reproduction, Timing definitions

### Community 54 - "suite.ts"
Cohesion: 0.17
Nodes (10): ReliabilityCase, ReliabilityCaseResult, ReliabilityPublish, ReliabilitySuiteOptions, StartReliabilityRun, StartReliabilityRunInput, onEventsStart(), passingPsdUrl (+2 more)

### Community 55 - "package.json"
Cohesion: 0.13
Nodes (13): dependencies, ag-psd, playwright-core, ag-psd, sharp, @commitlint/cli, @commitlint/config-conventional, husky (+5 more)

### Community 56 - "Hosted Chrome session over CDP"
Cohesion: 0.21
Nodes (16): FR-2: free-text instruction of up to 500 characters, FR-4: three worked example instructions that fill the box on click, NFR-4: twenty simultaneous runs without queueing, then a queue with a stated position, Required FREE_DAILY_BUDGET_USD (no default daily ceiling), Browser provider shortlist (Browserbase, Anchor, Hyperbrowser, Steel), Browserbase, Export-then-destroy session disposal, Fifteen-minute run ceiling (+8 more)

### Community 60 - "live-run.ts"
Cohesion: 0.12
Nodes (14): browserbase, ceiling, client, cost, events, imagePath, INSTRUCTION, last (+6 more)

### Community 71 - "Driving mechanism evidence"
Cohesion: 0.40
Nodes (4): Driving mechanism evidence, Findings from building it, Running it, What a run does

### Community 72 - "WarmSessionPool"
Cohesion: 0.13
Nodes (12): claimed(), Entry, imageDigest(), MAX_WARM_SESSIONS, WARM_SESSION_TTL_MS, WarmEditorSession, WarmSessionPool, WarmSessionPoolOptions (+4 more)

### Community 73 - "browserbase-editor-session.ts"
Cohesion: 0.09
Nodes (21): PhotopeaBridgeOptions, PhotopeaProtocolError, PhotopeaProtocolErrorCode, CreatePhotopeaEditorSessionOptions, PHOTOPEA_CONFIGURATION, PHOTOPEA_ORIGIN, PhotopeaEnvironment, PhotopeaEnvironmentParameters (+13 more)

### Community 74 - "ResponsesModel"
Cohesion: 0.20
Nodes (6): errorCode(), isObject(), narrationOf(), ResponsesApiError, ResponsesModel, safeCode()

### Community 75 - "computer tool (GA)"
Cohesion: 0.67
Nodes (4): Code-execution tool over a persistent Playwright session, computer tool (GA), ComputerAction type, Spike A0: code execution or the computer tool

### Community 76 - "agent-run.test.ts"
Cohesion: 0.14
Nodes (4): DEFAULT_RUN_LIMITS, agentRuntime(), runtimes, samplePath

### Community 77 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): $schema, semi, singleQuote, trailingComma

### Community 78 - "helper.ts"
Cohesion: 0.15
Nodes (11): AsyncFunction, pageCodeRunner(), api, codeLog, [imagePath, outputArgument, portArgument], output, port, runner (+3 more)

### Community 79 - "session.ts"
Cohesion: 0.09
Nodes (19): LayerhandWindow, PhotopeaPageMessage, PhotopeaWireMessage, PlaywrightPhotopeaTransportOptions, Button, LayerKind, LayerMaskInfo, LayerMaskKind (+11 more)

### Community 80 - "report.ts"
Cohesion: 0.32
Nodes (10): formatCacheRate(), formatCost(), formatReliabilityMarkdown(), formatReliabilityTerminal(), formatStatus(), redactSecrets(), SECRET_PATTERNS, SerializableReliabilityCaseResult (+2 more)

### Community 81 - "BrowserbaseClient"
Cohesion: 0.24
Nodes (5): BrowserbaseClient, BrowserbaseError, Fetch, requiredString(), RecordedRequest

### Community 82 - "Stream-per-directory repository layout"
Cohesion: 0.40
Nodes (6): Surgical Changes, Atomic commits, Rebase merge, never squash, Server-side repository setup (gh api merge settings), Single feat/launch-application branch, squash-merged by the coordinator, Stream-per-directory repository layout

### Community 83 - "establishVisitorIdentity"
Cohesion: 0.26
Nodes (11): Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle), Signed visitor cookie and HMAC visitor key (TRUST_PROXY_HOPS), clientAddress(), establishVisitorIdentity(), hmac(), readCookie(), signVisitorId(), validSignedId() (+3 more)

### Community 84 - "Ten-image reliability suite design"
Cohesion: 0.17
Nodes (11): Acceptance mapping, Corpus contract, Execution flow, Expected file layout, Goals, Nightly workflow and spending guard, Non-goals, Results and visibility (+3 more)

### Community 85 - "Layered PSD export implementation plan"
Cohesion: 0.18
Nodes (10): Global constraints, Issue #17 parallel boundary, Layered PSD export implementation plan, Task 1: Migrate the recursive layer contract, Task 2: Parse exported PSD metadata, Task 3: Enforce names and completed-tree policy, Task 4: Build the correlated Photopea export transaction, Task 5: Translate computer actions (+2 more)

### Community 86 - "responses-model.test.ts"
Cohesion: 0.20
Nodes (4): CodeRunner, SCREENSHOT, Sent, USAGE

### Community 87 - "Native steering"
Cohesion: 0.33
Nodes (5): Completed work survived the correction, Native steering, Result, Running it, The correction, and what the socket saw

### Community 88 - "Global constraints"
Cohesion: 0.22
Nodes (8): Global constraints, Task 1: Add and validate the representative corpus, Task 2: Run cases sequentially and validate their PSDs, Task 3: Persist and format inspectable reports, Task 4: Add the paid production command, Task 5: Publish the guarded nightly result, Task 6: Run final verification and prepare review, Ten-image reliability suite implementation plan

### Community 90 - "harness.ts"
Cohesion: 0.14
Nodes (14): host, DEFAULT_IMAGES, INSTRUCTION, logPath, outputDirectory, records, registry, RunRecord (+6 more)

### Community 91 - "Sample product photograph (sample-photo.png)"
Cohesion: 0.20
Nodes (15): FR-1: accept one JPEG/PNG image up to 20 MB and 6000 px, FR-5: one sample image usable without uploading, Upload form (picker and drop, inline rejections, three example instructions, bundled sample photograph), EXAMPLES, *.png, Sample product photograph (sample-photo.png), Brushed metal cap, Cast shadow (+7 more)

### Community 92 - "createRecordedFakeEditorSession"
Cohesion: 0.28
Nodes (8): createRecordedFakeEditorSession(), managedAgentRun(), describeFailure(), FailureRecorder, redactDiagnostic(), live(), run(), watchedSession()

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

### Community 100 - "photopea-document-loader.ts"
Cohesion: 0.29
Nodes (7): Filename verification through Document.source, ImageFormat, ValidatedImageUpload, LoadedPhotopeaDocument, PhotopeaDocumentError, readDocumentCount(), verifyDocument()

### Community 101 - "FR-20: apply a typed mid-run correction without discarding completed work"
Cohesion: 0.18
Nodes (19): FR-13: cancel at any point and keep the partial result, FR-14: survive a page reload by resuming the live view, FR-20: apply a typed mid-run correction without discarding completed work, FR-21: acknowledge a correction visibly within three seconds, FR-22: show accepted corrections in a visible list, FR-23: correction that undoes work already done (P2), Contract tests, fakeRun() (+11 more)

### Community 102 - "PlaywrightPhotopeaTransport"
Cohesion: 0.12
Nodes (10): Compact base64 upload transfer, bridge, fixturePath, samplePath, server, session, viewport, decodePhotopeaWireMessage() (+2 more)

### Community 103 - "Four run limits (step cap, spend cap, free runs, daily ceiling)"
Cohesion: 0.22
Nodes (16): FR-35: three free runs per visitor, enforced server-side, FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs, FR-37: global daily spend ceiling that stops free-allowance runs, FR-38: paid credit top-ups (P2), NFR-5: no server API key reaches the browser; user keys never logged, persisted or sent beyond OpenAI, NFR-6: uploaded images deleted within twenty-four hours, Bring-your-own-key, Metered credits business model (+8 more)

### Community 105 - "Recorded Photopea editor frame (photopea-frame.png, 1440x900)"
Cohesion: 0.20
Nodes (13): EditorSession interface (Contract 1), FakeEditorSession, ORIGINAL, document-preview.png (flattened document preview fixture), Minimalist long-exposure seascape with a small rocky island on the horizon, History panel: Open, Name Change, Duplicate Layer, Name Change, Recorded Photopea editor frame (photopea-frame.png, 1440x900), Layers panel: Retouched copy above Original photograph (+5 more)

### Community 106 - "measure.ts"
Cohesion: 0.20
Nodes (13): cookieFrom(), filename, image, imageBlob(), imagePath, Measurement, output, summary (+5 more)

### Community 107 - "Layered PSD output (the wedge)"
Cohesion: 0.23
Nodes (13): FR-25: PSD opens without error in Photoshop, Affinity Photo and GIMP, FR-26: every layer named in human words, FR-27: masks and adjustment layers remain editable, Flat-output competitors (Photoroom, Clipdrop, Pixelcut, Claid, Pixelbin, remove.bg, Evoto, Imagen AI, Aftershoot, BoxBrownie), Flat-output problem in AI retouching, Judged-well criteria (differentiator stated after a silent viewing; layer stack survives a retoucher's inspection), Layered PSD output (the wedge), Remaining gap: no self-serve single-pass PSD known to be named, masked and adjustment-layered (+5 more)

### Community 108 - "PhotopeaDocumentLoader"
Cohesion: 0.29
Nodes (7): Browserbase probe command (creation-to-ready latency), browserbase:probe, Browserbase probe usage against a deployed /photopea-host, PhotopeaDocumentLoader, main(), probePhotopeaOverCdp(), openImage()

### Community 109 - "RunRouteDependencies"
Cohesion: 0.20
Nodes (3): RunRouteDependencies, MemoryWaitlistStore, WaitlistStore

### Community 110 - "Launch day runbook"
Cohesion: 0.22
Nodes (8): Changing a limit in a hurry, Launch day runbook, Rotating the server key, See also, The clock, The freeze, and the no-deploy rule, When the providers misbehave, Where to look when something is wrong

### Community 111 - "fake-editor-session.test.ts"
Cohesion: 0.22
Nodes (7): createSession(), documentOperations, frameA, frameB, MutableLayerInfo, nestedLayers, psd

### Community 112 - "Contest outcome against the four inferred criteria"
Cohesion: 0.25
Nodes (8): FR-33: Product Hunt assets (tagline, description, gallery images, first maker comment), Contest outcome against the four inferred criteria, GPT-6 Astra, Risk: reliability of long GUI control, OSWorld V2-Offline benchmark, Astra cannot generate an image (text-output-only irony), First maker comment opening line, Text-only inversion

### Community 114 - "Photopea"
Cohesion: 0.48
Nodes (7): Risk: the scripting escape hatch, Document-count snapshot before file delivery, Per-bridge FIFO for complete document opens, Editor adapter, Photopea, Photopea Action Manager stub (stringIDToTypeID lookup table), Scripted vs GUI-driven split (the line that protects the premise)

### Community 115 - "editor-session.contract.ts"
Cohesion: 0.48
Nodes (4): assertLayerTree(), defineEditorSessionContract(), EditorSessionFactory, pngSignature

### Community 116 - "Warm editor session"
Cohesion: 0.50
Nodes (3): Result, Running it, Warm editor session

## Ambiguous Edges - Review These
- `EXAMPLES` → `Cobalt glass bottle`  [AMBIGUOUS]
  src/web/assets/sample-photo.png · relation: conceptually_related_to

## Knowledge Gaps
- **443 isolated node(s):** `$schema`, `singleQuote`, `semi`, `trailingComma`, `INSTRUCTION` (+438 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 737 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `EXAMPLES` and `Cobalt glass bottle`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `playwright-core` connect `ComputerAction` to `photopea-editor-session.ts`, `PlaywrightPhotopeaTransport`, `browserbase-probe.ts`, `live-frames.browser.test.ts`, `photopea-page-session.ts`, `browserbase-editor-session.ts`, `PhotopeaMessage`, `agent-run.test.ts`, `helper.ts`, `session.ts`, `Issue #15 installed-Chrome upload measurement`, `startFramePump`, `package.json`, `harness.ts`, `Sample product photograph (sample-photo.png)`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `LayerInfo` connect `editor/index.ts` to `photopea-editor-session.ts`, `RunEvent stream type (Contract 2)`, `app.ts`, `WarmSessionPool`, `photopea-page-session.ts`, `Recorded Photopea editor frame (photopea-frame.png, 1440x900)`, `agent/contract.ts`, `agent-run.test.ts`, `session.ts`, `fake-editor-session.test.ts`, `editor-session.contract.ts`, `FakeEditorSession`, `photopea-document-exporter.ts`, `harness.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `ComputerAction` connect `ComputerAction` to `photopea-editor-session.ts`, `responses-model.ts`, `AgentModel`, `editor/index.ts`, `loop.test.ts`, `photopea-page-session.ts`, `computer tool (GA)`, `agent-run.test.ts`, `session.ts`, `fake-editor-session.test.ts`, `FakeEditorSession`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `LayerInfo` (e.g. with `Layers panel: Retouched copy above Original photograph` and `LayerInfo type`) actually correct?**
  _`LayerInfo` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `singleQuote`, `semi` to the rest of the system?**
  _443 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `photopea-editor-session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08710801393728224 - nodes in this community are weakly interconnected._