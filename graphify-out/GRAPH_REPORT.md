# Graph Report - astra  (2026-09-16)

## Corpus Check
- 209 files · ~577,202 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 26 file(s) not represented in the graph (top: (none) 10, .ndjson 10, .psd 3)

## Summary
- 1917 nodes · 4308 edges · 124 communities (101 shown, 23 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 470 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7332122c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- photopea-editor-session.ts
- responses-model.ts
- app.ts
- photopea-document-exporter.ts
- artifact-store.ts
- loop.test.ts
- browserbase-probe.ts
- live-frames.browser.test.ts
- run.ts
- photopea-action-runner.ts
- photopea-document-exporter.test.ts
- Goal-Driven Execution
- Launch acceptance checklist (evening of September 17)
- run-routes.test.ts
- PhotopeaTransport
- corpus.ts
- runtime.ts
- startFramePump
- PhotopeaMessage
- FakeEditorSession
- SteerLedger
- layer-names.ts
- trap-probe.ts
- responses-model-steering.test.ts
- AgentModel
- ADR-0003: Export a parser-backed Photopea snapshot
- Gitiles
- compilerOptions
- RunRegistry
- Layered PSD output (the wedge)
- Google Developer Documentation Style Guide
- live-steer.ts
- Desktop workbench layout (1280 px minimum, desktop-required message below)
- CommonMark spec
- Issue #15 installed-Chrome upload measurement
- live-runner.test.ts
- PhotopeaPageSession
- run-reliability.ts
- run-log.ts
- Conventional Commits
- Swap Test
- PhotopeaDocumentBridge
- agent/contract.ts
- Agent instructions
- scripts
- helper.ts
- harness.ts
- run-registry.ts
- bun (package manager and script runner)
- Risk: reliability of long GUI control
- browserbase-network.integration.test.ts
- application.ts
- Photopea round-trip
- loop.ts
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
- Driving mechanism
- run-routes.ts
- browserbase-editor-session.ts
- ResponsesModel
- computer tool (GA)
- PhotopeaBridge
- Competition survey (twenty-six products plus a four-product follow-up)
- RunRoutes
- session.ts
- Sample product photograph (sample-photo.png)
- BrowserbaseClient
- Stream-per-directory repository layout
- establishVisitorIdentity
- RunHandle
- PhotopeaEditorSession
- responses-model.test.ts
- Native steering
- RunEvent
- Codex proxy run
- Evidence
- runAgent
- createRecordedFakeEditorSession
- agent-run.test.ts
- Agent instructions
- Agent run
- Photopea production export
- workflow.test.ts
- Explicit link paths (relative only within the same directory)
- .husky/pre-push hook
- image-upload.ts
- Contract tests
- editor/index.ts
- Four run limits (step cap, spend cap, free runs, daily ceiling)
- Ten-image reliability suite design
- photopea-document-loader.test.ts
- measure.ts
- Photopea
- PhotopeaDocumentLoader
- Computer use (primitive)
- Launch day runbook
- Layered PSD export implementation plan
- playwright-core
- scripted-model.ts
- Ten-image reliability suite implementation plan
- FR-20: apply a typed mid-run correction without discarding completed work
- Warm editor session
- FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs
- GPT-6 Astra Challenge (OpenAI x Product Hunt)
- EditorSession
- Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle)
- .prettierrc.json
- fake-editor-session.test.ts
- Superpowers

## God Nodes (most connected - your core abstractions)
1. `createLaunchRuntime()` - 38 edges
2. `LayerInfo` - 37 edges
3. `RunRegistry` - 33 edges
4. `EditorSession` - 31 edges
5. `RunEvent` - 29 edges
6. `PhotopeaMessage` - 29 edges
7. `PhotopeaBridge` - 28 edges
8. `playwright-core` - 27 edges
9. `ComputerAction` - 26 edges
10. `ResponsesModel` - 25 edges

## Surprising Connections (you probably didn't know these)
- `Prettier owns syntax, not prose` --references--> `printWidth`  [INFERRED]
  docs/agents/rules.md → .prettierrc.json
- `Bun full-stack HTML import (src/server/index.ts serves src/web/index.html)` --conceptually_related_to--> `build`  [INFERRED]
  docs/references/launch-application-design.md → package.json
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

## Communities (124 total, 23 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, prettier, sharp, @types/bun (+2 more)

### Community 1 - "photopea-editor-session.ts"
Cohesion: 0.09
Nodes (9): PhotopeaDocumentExporter, PhotopeaExportSnapshot, createPhotopeaEditorSession(), PhotopeaEditorSessionDependencies, PhotopeaSessionWork, createPlaywrightAuxiliaryMouse(), exporter(), fixture() (+1 more)

### Community 2 - "responses-model.ts"
Cohesion: 0.13
Nodes (19): BUTTONS, COMMON_PROMPT, correctionText(), describeCodeResult(), Json, keys(), ModelTransport, number() (+11 more)

### Community 3 - "app.ts"
Cohesion: 0.06
Nodes (73): Accessibility baseline (keyboard file picker, visible focus, aria-live status, reduced motion), Five-state pure client reducer (landing, input, running, result, error), SSE sequence-id replay and sessionStorage reconnect, RunSnapshot, RunStatus, accepted(), boolean(), decodeRunEvent() (+65 more)

### Community 4 - "photopea-document-exporter.ts"
Cohesion: 0.19
Nodes (18): selectBytes(), selectPngExport(), selectPsdExport(), validPng(), expectedTree(), noDocumentError(), renameScript(), responseError() (+10 more)

### Community 5 - "artifact-store.ts"
Cohesion: 0.11
Nodes (11): Single-container continuous deployment, ArtifactKind, ArtifactPutRequest, createArtifactKey(), EXTENSIONS, StoredArtifact, createS3Bucket(), S3ArtifactStore (+3 more)

### Community 6 - "loop.test.ts"
Cohesion: 0.10
Nodes (11): CLICK, DONE, EDITABLE_LAYERS, editableFixture(), fixture(), RECORDED_LAYERS, request, RETOUCH (+3 more)

### Community 7 - "browserbase-probe.ts"
Cohesion: 0.21
Nodes (8): BrowserbaseSession, BrowserbaseProbeClient, BrowserbaseProbeEvidence, BrowserbaseProbeOptions, createReadOnlyLiveView(), main(), runBrowserbaseProbe(), SAMPLE_PNG

### Community 8 - "live-frames.browser.test.ts"
Cohesion: 0.09
Nodes (21): Bun SQL metering and waitlist tables (visitor_usage, daily_usage, waitlist_emails), MemoryArtifactStore, createDatabase(), databaseReady(), applyMigrations(), csvField(), formatWaitlistCsv(), main() (+13 more)

### Community 9 - "run.ts"
Cohesion: 0.10
Nodes (23): capCredits, codeLines, codex, decoder, estimateCredits(), events, exported, findSessionLog() (+15 more)

### Community 10 - "photopea-action-runner.ts"
Cohesion: 0.09
Nodes (14): AuxiliaryButton, AuxiliaryMouse, KEY_ALIASES, normalizeKey(), PhotopeaActionPage, PhotopeaActionRunner, PhotopeaActionRunnerOptions, unknownKey() (+6 more)

### Community 11 - "photopea-document-exporter.test.ts"
Cohesion: 0.12
Nodes (16): marker, adjustmentKinds, LiveLayer, namedPsd(), psd(), locateMaskThumbnail(), viewport, waitForMaskThumbnail() (+8 more)

### Community 13 - "Launch acceptance checklist (evening of September 17)"
Cohesion: 0.26
Nodes (14): leonxlnx/taste-skill skill collection, FR-30: public landing page with the differentiator and a silent demo loop, FR-31: email capture live and collecting before launch day, FR-32: thirty-second silent demo recording usable on Product Hunt, Launch acceptance checklist (evening of September 17), Launch schedule (September 12-18, launch Friday 12:01am PT), NFR-1: reliability, eight of ten test runs complete unattended with a valid layered file, Day-2 technical go/no-go (kill switch) (+6 more)

### Community 14 - "run-routes.test.ts"
Cohesion: 0.10
Nodes (17): createApplication(), AdmissionDenied, AdmissionRequest, AdmissionResult, assertMicroUsd(), DAILY_LIMIT, MeterReservation, MeterStore (+9 more)

### Community 16 - "corpus.ts"
Cohesion: 0.16
Nodes (15): ReliabilityCommandDependencies, isValidHttpsUrl(), isValidRelativeImagePath(), loadReliabilityCorpus(), parseAndValidateCase(), RawCase, ReliabilityCategory, ReliabilityCorpusError (+7 more)

### Community 17 - "runtime.ts"
Cohesion: 0.09
Nodes (27): ScriptedModel, artifactPublisher(), EXPORT_GRACE_MS, LiveAgentDependencies, liveAgentRun(), ManagedAgentRunOptions, RUN_CEILING_MS, Application (+19 more)

### Community 18 - "startFramePump"
Cohesion: 0.12
Nodes (12): FRAME_INTERVAL_MS, FramePump, FramePumpOptions, startFramePump(), Phase, pumpFor(), retouch(), select() (+4 more)

### Community 19 - "PhotopeaMessage"
Cohesion: 0.19
Nodes (5): PhotopeaConfiguration, PhotopeaMessage, ControlledTransport, LateSentinelTransport, MemoryTransport

### Community 20 - "FakeEditorSession"
Cohesion: 0.23
Nodes (3): cloneAction(), copyBytes(), FakeEditorSession

### Community 21 - "SteerLedger"
Cohesion: 0.06
Nodes (21): hasToolCall(), HeaderedWebSocket, isObject(), Json, openResponsesSocket(), REPORTED, ResponsesSocket, ResponsesSocketOptions (+13 more)

### Community 22 - "layer-names.ts"
Cohesion: 0.17
Nodes (18): ADJUSTMENT_DEFAULT_NAMES, ADJUSTMENT_LABELS, assertLayerNames(), buildLayerRenamePlan(), DEFAULT_ADJUSTMENT_NAMES, fallbackName(), firstFreeName(), flattenLayers() (+10 more)

### Community 23 - "trap-probe.ts"
Cohesion: 0.09
Nodes (27): InputFixtureEvidence, persistInputFixture(), recordOutputPath(), temporaryDirectories, jpeg, OUTPUT_DIRECTORY, PHOTOPEA_URL, SerializedMessage (+19 more)

### Community 24 - "responses-model-steering.test.ts"
Cohesion: 0.09
Nodes (18): ResponsesModelOptions, CLICK, Connection, created(), Inbox, Json, observe(), SCREENSHOT (+10 more)

### Community 25 - "AgentModel"
Cohesion: 0.17
Nodes (10): AgentLoopDependencies, AgentModel, TokenPricing, managedAgentRun(), CODES, describeFailure(), FailureRecorder, Operation (+2 more)

### Community 26 - "ADR-0003: Export a parser-backed Photopea snapshot"
Cohesion: 0.05
Nodes (42): ADR-0001: Define a provider-neutral editor session, Alternatives considered, Consequences, Context, Decision, Expose Photopea or Playwright directly, Let the agent loop own browser interaction, References (+34 more)

### Community 28 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleDetection, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck (+5 more)

### Community 29 - "RunRegistry"
Cohesion: 0.20
Nodes (7): measure(), RunRegistry background event pump with sixty-minute terminal retention, copySnapshot(), initialSnapshot(), RunRegistry, RunRegistryError, within()

### Community 30 - "Layered PSD output (the wedge)"
Cohesion: 0.24
Nodes (13): FR-25: PSD opens without error in Photoshop, Affinity Photo and GIMP, FR-26: every layer named in human words, FR-27: masks and adjustment layers remain editable, FR-33: Product Hunt assets (tagline, description, gallery images, first maker comment), Single-screen core flow, Judged-well criteria (differentiator stated after a silent viewing; layer stack survives a retoucher's inspection), Layered PSD output (the wedge), Remaining gap: no self-serve single-pass PSD known to be named, masked and adjustment-layered (+5 more)

### Community 32 - "live-steer.ts"
Cohesion: 0.08
Nodes (24): at(), browserbase, ceiling, client, correction, cost, events, imagePath (+16 more)

### Community 33 - "Desktop workbench layout (1280 px minimum, desktop-required message below)"
Cohesion: 0.18
Nodes (13): FR-15: show the running session cost in credits, FR-16: per-user history of past runs (P2, deferred by the non-goals), FR-29: list the layers on the page after the run, NFR-7: page works at 1280 px and above; mobile out of scope, Requirement-level exclusions (no accounts, no in-app editing, no undo, PSD-only output, no internationalisation), Product non-goals (no image generation, no batch/API/integrations, no accounts beyond metering, no mobile, no own editor, no presets), Bun full-stack HTML import (src/server/index.ts serves src/web/index.html), Desktop workbench layout (1280 px minimum, desktop-required message below) (+5 more)

### Community 35 - "Issue #15 installed-Chrome upload measurement"
Cohesion: 0.23
Nodes (14): NFR-3: a run starts within five seconds of the button, Unique app.echoToOE sentinel per scripted call, Image resolution vs screenshot viewport, Issue #15 installed-Chrome upload measurement, Photopea postMessage protocol, Photopea known traps, Reusable Photopea bridge boot, Screenshot policy: 1440x900, detail original, no downscaling (+6 more)

### Community 36 - "live-runner.test.ts"
Cohesion: 0.29
Nodes (3): ReliabilityCommandConfig, ReliabilityFailureCode, validEnv

### Community 38 - "run-reliability.ts"
Cohesion: 0.09
Nodes (38): Environment configuration names (DATABASE_URL, SESSION_SECRET, FREE_DAILY_BUDGET_USD, S3_*, BROWSERBASE_API_KEY, OPENAI_API_KEY, TRUST_PROXY_HOPS), Security and error-handling rules (textContent not innerHTML, restrictive CSP, egress policy, export before release), parseOutputRoot(), parsePositiveDecimal(), parsePositiveInteger(), readReliabilityCommandConfig(), REQUIRED_ENV_VARS, runReliabilityCommand() (+30 more)

### Community 39 - "run-log.ts"
Cohesion: 0.21
Nodes (10): RunStopReason, RunFailureCode, createRunLogger(), failureReason(), redact(), RunLoggerOptions, runLogLine, RunLogStore (+2 more)

### Community 40 - "Conventional Commits"
Cohesion: 0.21
Nodes (17): Branch naming (<type>/<short-description>), Breaking change marker (! and BREAKING CHANGE footer), Conventional commit types (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test), Conventional Commits, gh pr create --fill-first, Conventional issue and pull request titles, Bug report issue form, Issue template chooser config (blank issues disabled) (+9 more)

### Community 41 - "Swap Test"
Cohesion: 0.21
Nodes (13): Contest outcome against the four inferred criteria, Keyboard-only accessibility agent, Async tool calling (primitive), Whole-corpus contradiction finder (runner-up), Inferred judging rubric (WebMCP Challenge criteria), Million-token single-pass context (primitive), Persisted reasoning and notes (primitive), Programmatic tool calling and orchestration (primitive) (+5 more)

### Community 42 - "PhotopeaDocumentBridge"
Cohesion: 0.12
Nodes (3): PhotopeaDocumentBridge, MemoryBridge, RecordingBridge

### Community 43 - "agent/contract.ts"
Cohesion: 0.17
Nodes (6): RunResult, FakeRunOptions, SCRIPT, databases, RESULT, RESULT

### Community 44 - "Agent instructions"
Cohesion: 0.25
Nodes (8): AGENTS.md (agent instruction entry point), AGENTS.md as the single agent entry point, .agents/skills/ skills directory, astra-challenge skill, Agent instructions, Instructions, Project documents, References

### Community 45 - "scripts"
Cohesion: 0.15
Nodes (15): Bun 1.4.2 runtime pin (lockfile version 2, frozen installs), Two-stage non-root container pinned to Bun 1.4.2, scripts, build, dev, lint:fix, reliability, start (+7 more)

### Community 46 - "helper.ts"
Cohesion: 0.16
Nodes (12): api, codeLog, host, [imagePath, outputArgument, portArgument], output, port, runner, screenshot() (+4 more)

### Community 47 - "harness.ts"
Cohesion: 0.12
Nodes (15): AsyncFunction, pageCodeRunner(), DEFAULT_IMAGES, INSTRUCTION, logPath, outputDirectory, records, registry (+7 more)

### Community 48 - "run-registry.ts"
Cohesion: 0.14
Nodes (15): NFR-8: per-run observability (step count, token spend, outcome, failure reason), RunLogRecord one-line completion log, Per-run structured log line, ManagedRun, ManagedRunMetrics, RunFailure, RegisterRun, StoredRun (+7 more)

### Community 49 - "bun (package manager and script runner)"
Cohesion: 0.19
Nodes (16): graphify CLI and knowledge graph (graphify-out/), Query the graph before reading source, Run graphify update after modifying code, RTK condensed command output, rtk proxy fallback, bun (package manager and script runner), Prettier owns syntax, not prose, graphify-labs/graphify skill collection (+8 more)

### Community 50 - "Risk: reliability of long GUI control"
Cohesion: 0.50
Nodes (4): GPT-6 Astra, Risk: reliability of long GUI control, OSWorld V2-Offline benchmark, Astra cannot generate an image (text-output-only irony)

### Community 51 - "browserbase-network.integration.test.ts"
Cohesion: 0.11
Nodes (11): PAGE_SHELL_PATH, PageRouteOptions, pageRoutes(), attribute(), SOCIAL_IMAGE_PATHS, socialMetaTags(), withSocialMeta(), connect() (+3 more)

### Community 52 - "application.ts"
Cohesion: 0.20
Nodes (7): /health readiness endpoint (process and database readiness), HTTP surface aligned with Contract 3 plus /health, Idempotent waitlist endpoint and CSV export (bun run waitlist:export), ApplicationDependencies, BASE_SECURITY_HEADERS, json(), secured()

### Community 53 - "Photopea round-trip"
Cohesion: 0.22
Nodes (8): Digests, Files, Limits, Photopea round-trip, Photoshop verification, Result, Running it, Timing definitions

### Community 54 - "loop.ts"
Cohesion: 0.15
Nodes (11): graphemes, PublishedKind, ReliabilityCase, ReliabilityCaseResult, ReliabilityPublish, ReliabilitySuiteOptions, StartReliabilityRun, StartReliabilityRunInput (+3 more)

### Community 55 - "package.json"
Cohesion: 0.15
Nodes (11): dependencies, ag-psd, playwright-core, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, prettier (+3 more)

### Community 56 - "Hosted Chrome session over CDP"
Cohesion: 0.19
Nodes (17): FR-2: free-text instruction of up to 500 characters, FR-4: three worked example instructions that fill the box on click, NFR-4: twenty simultaneous runs without queueing, then a queue with a stated position, Required FREE_DAILY_BUDGET_USD (no default daily ceiling), Browser provider shortlist (Browserbase, Anchor, Hyperbrowser, Steel), Browserbase, Export-then-destroy session disposal, Fifteen-minute run ceiling (+9 more)

### Community 60 - "live-run.ts"
Cohesion: 0.12
Nodes (14): browserbase, ceiling, client, cost, events, imagePath, INSTRUCTION, last (+6 more)

### Community 71 - "Driving mechanism"
Cohesion: 0.29
Nodes (6): Driving mechanism, Findings from building it, Limits, Result, Running it, What a run does

### Community 72 - "run-routes.ts"
Cohesion: 0.08
Nodes (17): RunRequest, MAX_RUN_REQUEST_BODY_BYTES, RunRouteDependencies, claimed(), Entry, imageDigest(), MAX_WARM_SESSIONS, WARM_SESSION_TTL_MS (+9 more)

### Community 73 - "browserbase-editor-session.ts"
Cohesion: 0.15
Nodes (13): CreatePhotopeaEditorSessionOptions, BrowserbaseEditorSessionOptions, BrowserbaseSessions, closedError(), comparableOrigin(), CONNECT_TIMEOUT_MS, connectOverCdp(), installNetworkAllowList() (+5 more)

### Community 74 - "ResponsesModel"
Cohesion: 0.21
Nodes (6): errorCode(), isObject(), narrationOf(), ResponsesApiError, ResponsesModel, safeCode()

### Community 75 - "computer tool (GA)"
Cohesion: 0.67
Nodes (4): Code-execution tool over a persistent Playwright session, computer tool (GA), ComputerAction type, Spike A0: code execution or the computer tool

### Community 77 - "Competition survey (twenty-six products plus a four-product follow-up)"
Cohesion: 0.26
Nodes (13): Adobe Photoshop API v2, autoRetouch, BRIA AI, Commercial gate (risk 1: the commercial case vs the survey), Competition survey (twenty-six products plus a four-product follow-up), Adobe Firefly Creative Production (Remove Background preset, masked layered PSD), Adobe Firefly Services (enterprise access), Flat-output competitors (Photoroom, Clipdrop, Pixelcut, Claid, Pixelbin, remove.bg, Evoto, Imagen AI, Aftershoot, BoxBrownie) (+5 more)

### Community 78 - "RunRoutes"
Cohesion: 0.22
Nodes (8): apiError(), boundedFormData(), json(), jsonObject(), registryError(), RequestTooLargeError, RunRoutes, RunStartError

### Community 79 - "session.ts"
Cohesion: 0.07
Nodes (29): KEY_NAMES, playwrightKey(), PNG_SIGNATURE, PSD_SIGNATURE, ag-psd, SessionState, cloneLayerInfo(), cloneLayerTree() (+21 more)

### Community 80 - "Sample product photograph (sample-photo.png)"
Cohesion: 0.19
Nodes (14): Target users: e-commerce photo teams, real-estate photographers, freelance retouchers, EXAMPLES, *.png, Sample product photograph (sample-photo.png), Brushed metal cap, Cast shadow, Cobalt glass bottle, Dust specks (+6 more)

### Community 81 - "BrowserbaseClient"
Cohesion: 0.22
Nodes (6): BrowserbaseClient, BrowserbaseError, BrowserbaseLiveView, Fetch, requiredString(), RecordedRequest

### Community 82 - "Stream-per-directory repository layout"
Cohesion: 0.40
Nodes (6): Surgical Changes, Atomic commits, Rebase merge, never squash, Server-side repository setup (gh api merge settings), Single feat/launch-application branch, squash-merged by the coordinator, Stream-per-directory repository layout

### Community 83 - "establishVisitorIdentity"
Cohesion: 0.32
Nodes (10): Signed visitor cookie and HMAC visitor key (TRUST_PROXY_HOPS), clientAddress(), establishVisitorIdentity(), hmac(), readCookie(), signVisitorId(), validSignedId(), VisitorIdentity (+2 more)

### Community 84 - "RunHandle"
Cohesion: 0.24
Nodes (8): RunHandle, collect(), endOf(), EventOf, ofType(), RunContractSubject, testRunContract(), request

### Community 85 - "PhotopeaEditorSession"
Cohesion: 0.30
Nodes (3): PhotopeaEditorSession, closeWithWork(), documentCalls()

### Community 86 - "responses-model.test.ts"
Cohesion: 0.25
Nodes (3): SCREENSHOT, Sent, USAGE

### Community 87 - "Native steering"
Cohesion: 0.29
Nodes (6): Completed work survived the correction, Limits, Native steering, Result, Running it, The correction, and what the socket saw

### Community 88 - "RunEvent"
Cohesion: 0.24
Nodes (8): ManagedRun server adapter (cache metrics, stop reason, releaseSecrets), RunEvent, EventLog, fakeRun(), copyResult(), RunEventEnvelope, managedFakeRun(), controlledRun()

### Community 89 - "Codex proxy run"
Cohesion: 0.33
Nodes (5): Codex proxy run, How it runs, Limits, Result, Running it

### Community 90 - "Evidence"
Cohesion: 0.50
Nodes (3): Evidence, Folders, Layout

### Community 91 - "runAgent"
Cohesion: 0.21
Nodes (5): cut(), runAgent(), TokenUsage, ASTRA_PRICING, Spend

### Community 92 - "createRecordedFakeEditorSession"
Cohesion: 0.14
Nodes (21): FR-28: flattened PNG preview alongside the PSD, EditorSession interface (Contract 1), FakeEditorSession, ORIGINAL, createRecordedFakeEditorSession(), EditorRecording, document-preview.png (flattened document preview fixture), Minimalist long-exposure seascape with a small rocky island on the horizon (+13 more)

### Community 93 - "agent-run.test.ts"
Cohesion: 0.15
Nodes (3): agentRuntime(), runtimes, samplePath

### Community 94 - "Agent instructions"
Cohesion: 0.40
Nodes (4): Agent instructions, Instructions, Project documents, References

### Community 95 - "Agent run"
Cohesion: 0.40
Nodes (4): Agent run, Limits, Result, Running it

### Community 96 - "Photopea production export"
Cohesion: 0.50
Nodes (3): Photopea production export, Result, Running it

### Community 97 - "workflow.test.ts"
Cohesion: 0.50
Nodes (3): WorkflowDefinition, WorkflowJob, WorkflowStep

### Community 100 - "image-upload.ts"
Cohesion: 0.17
Nodes (18): detectFormat(), ERROR_MESSAGES, EXIF_SIGNATURE, ImageUploadError, ImageUploadErrorCode, isStandaloneJpegMarker(), JPEG_SOF_MARKERS, JPEG_SOI (+10 more)

### Community 101 - "Contract tests"
Cohesion: 0.24
Nodes (16): FR-10: live view of the editor (at least one frame per 2 s, at most 3 s behind), FR-13: cancel at any point and keep the partial result, FR-14: survive a page reload by resuming the live view, Read-only sandboxed live-view iframe (pointer-events none, tabindex -1), Contract tests, fakeRun(), Fakes-first development, Live frame pump (+8 more)

### Community 102 - "editor/index.ts"
Cohesion: 0.11
Nodes (18): ImageFormat, assertCompleteLayerTree(), LayerCompletionError, LayerCompletionErrorCode, PhotopeaBridgeOptions, PhotopeaProtocolError, PhotopeaProtocolErrorCode, PhotopeaDocumentExporterOptions (+10 more)

### Community 103 - "Four run limits (step cap, spend cap, free runs, daily ceiling)"
Cohesion: 0.16
Nodes (26): FR-11: progress as step count against the cap with plain-words current action, FR-12: stop at the step cap and return a layered partial result, FR-35: three free runs per visitor, enforced server-side, FR-37: global daily spend ceiling that stops free-allowance runs, FR-38: paid credit top-ups (P2), NFR-2: no single run exceeds $8 of model spend, Aggressive prompt caching (4x unit-cost swing), Metered credits business model (+18 more)

### Community 104 - "Ten-image reliability suite design"
Cohesion: 0.17
Nodes (11): Acceptance mapping, Corpus contract, Execution flow, Expected file layout, Goals, Nightly workflow and spending guard, Non-goals, Results and visibility (+3 more)

### Community 105 - "photopea-document-loader.test.ts"
Cohesion: 0.26
Nodes (5): MAX_IMAGE_BYTES, expectMalformed(), withApp1(), jpeg(), png()

### Community 106 - "measure.ts"
Cohesion: 0.20
Nodes (13): cookieFrom(), filename, image, imageBlob(), imagePath, Measurement, output, summary (+5 more)

### Community 107 - "Photopea"
Cohesion: 0.39
Nodes (8): Risk: the scripting escape hatch, Document-count snapshot before file delivery, Per-bridge FIFO for complete document opens, Editor adapter, Photopea, Photopea Action Manager stub (stringIDToTypeID lookup table), Scripted vs GUI-driven split (the line that protects the premise), Photopea tool bar (marquee, lasso, magic wand, brush, pen, type tools)

### Community 108 - "PhotopeaDocumentLoader"
Cohesion: 0.20
Nodes (11): Browserbase probe command (creation-to-ready latency), Filename verification through Document.source, browserbase:probe, Browserbase probe usage against a deployed /photopea-host, ValidatedImageUpload, PhotopeaDocumentError, PhotopeaDocumentLoader, readDocumentCount() (+3 more)

### Community 109 - "Computer use (primitive)"
Cohesion: 0.35
Nodes (11): Three product properties: editable output, visible work, steerable work, Astra Hackathon, Computer use (primitive), Computer use x mid-turn steering (Round 9), Hosted-browser computer use (Round 2), Ideation kill gates (scope, crowding), Mid-turn steering (primitive), Steerable book-length localization (+3 more)

### Community 110 - "Launch day runbook"
Cohesion: 0.22
Nodes (8): Changing a limit in a hurry, Launch day runbook, Rotating the server key, See also, The clock, The freeze, and the no-deploy rule, When the providers misbehave, Where to look when something is wrong

### Community 111 - "Layered PSD export implementation plan"
Cohesion: 0.18
Nodes (10): Global constraints, Issue #17 parallel boundary, Layered PSD export implementation plan, Task 1: Migrate the recursive layer contract, Task 2: Parse exported PSD metadata, Task 3: Enforce names and completed-tree policy, Task 4: Build the correlated Photopea export transaction, Task 5: Translate computer actions (+2 more)

### Community 112 - "playwright-core"
Cohesion: 0.10
Nodes (12): Compact base64 upload transfer, playwright-core, bridge, fixturePath, samplePath, session, viewport, decodePhotopeaWireMessage() (+4 more)

### Community 113 - "scripted-model.ts"
Cohesion: 0.29
Nodes (7): ScriptedModel, ModelTurn, Observation, CLICK, SCRIPT, ScriptedModelOptions, wait()

### Community 114 - "Ten-image reliability suite implementation plan"
Cohesion: 0.22
Nodes (8): Global constraints, Task 1: Add and validate the representative corpus, Task 2: Run cases sequentially and validate their PSDs, Task 3: Persist and format inspectable reports, Task 4: Add the paid production command, Task 5: Publish the guarded nightly result, Task 6: Run final verification and prepare review, Ten-image reliability suite implementation plan

### Community 115 - "FR-20: apply a typed mid-run correction without discarding completed work"
Cohesion: 0.27
Nodes (10): FR-20: apply a typed mid-run correction without discarding completed work, FR-21: acknowledge a correction visibly within three seconds, FR-22: show accepted corrections in a visible list, FR-23: correction that undoes work already done (P2), Orchestrator, Native steering via response.steer, OpenAI Responses API (gpt-6-astra), Single long-lived server process (not serverless) (+2 more)

### Community 116 - "Warm editor session"
Cohesion: 0.40
Nodes (4): Limits, Result, Running it, Warm editor session

### Community 117 - "FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs"
Cohesion: 0.48
Nodes (6): FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs, NFR-5: no server API key reaches the browser; user keys never logged, persisted or sent beyond OpenAI, NFR-6: uploaded images deleted within twenty-four hours, Bring-your-own-key, User-supplied OpenAI key handling (bypasses admission, not per-run caps; never stored), Secrets and upload handling

### Community 118 - "GPT-6 Astra Challenge (OpenAI x Product Hunt)"
Cohesion: 0.39
Nodes (8): Launch audience risk (no waitlist), Open question: official contest rules, Photopea licence question (answered: automated and commercial use permitted), Before-committing checks (deadline and prize terms, Photopea terms and trademark, waitlist), GPT-6 Astra Challenge (OpenAI x Product Hunt), Issue 23 contest-rules investigation (official Product Hunt surface only), Photopea Distributor account, Spike B0: buy the Distributor account and re-read the terms

### Community 120 - "Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle)"
Cohesion: 0.33
Nodes (8): FR-1: accept one JPEG/PNG image up to 20 MB and 6000 px, FR-3: reject invalid input with a specific reason, FR-5: one sample image usable without uploading, Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle), API error shape { code, message }, Upload form (picker and drop, inline rejections, three example instructions, bundled sample photograph), EXIF orientation-aware expected dimensions, Upload validation before session creation

### Community 121 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): $schema, semi, singleQuote, trailingComma

### Community 122 - "fake-editor-session.test.ts"
Cohesion: 0.22
Nodes (7): createSession(), documentOperations, frameA, frameB, MutableLayerInfo, nestedLayers, psd

### Community 123 - "Superpowers"
Cohesion: 0.50
Nodes (3): Plans, Specs, Superpowers

## Ambiguous Edges - Review These
- `EXAMPLES` → `Cobalt glass bottle`  [AMBIGUOUS]
  src/web/assets/sample-photo.png · relation: conceptually_related_to

## Knowledge Gaps
- **436 isolated node(s):** `$schema`, `singleQuote`, `semi`, `trailingComma`, `INSTRUCTION` (+431 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 739 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `EXAMPLES` and `Cobalt glass bottle`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `playwright-core` connect `playwright-core` to `photopea-editor-session.ts`, `Issue #15 installed-Chrome upload measurement`, `editor/index.ts`, `browserbase-probe.ts`, `live-frames.browser.test.ts`, `browserbase-editor-session.ts`, `photopea-action-runner.ts`, `photopea-document-exporter.test.ts`, `helper.ts`, `harness.ts`, `session.ts`, `Sample product photograph (sample-photo.png)`, `startFramePump`, `browserbase-network.integration.test.ts`, `trap-probe.ts`, `package.json`, `agent-run.test.ts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `LayerInfo` connect `session.ts` to `photopea-editor-session.ts`, `app.ts`, `photopea-document-exporter.ts`, `PhotopeaPageSession`, `editor/index.ts`, `Contract tests`, `run-routes.ts`, `agent/contract.ts`, `harness.ts`, `FakeEditorSession`, `PhotopeaEditorSession`, `layer-names.ts`, `fake-editor-session.test.ts`, `createRecordedFakeEditorSession`, `agent-run.test.ts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `SteerLedger` connect `SteerLedger` to `responses-model.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `LayerInfo` (e.g. with `Layers panel: Retouched copy above Original photograph` and `LayerInfo type`) actually correct?**
  _`LayerInfo` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `singleQuote`, `semi` to the rest of the system?**
  _436 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `photopea-editor-session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09425287356321839 - nodes in this community are weakly interconnected._