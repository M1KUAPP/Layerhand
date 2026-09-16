# Graph Report - astra-loop-validation (2026-09-16)

## Corpus Check

- 213 files · ~580,663 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 26 file(s) not represented in the graph (top: (none) 10, .ndjson 10, .psd 3)

## Summary

- 1957 nodes · 4399 edges · 114 communities (92 shown, 21 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 470 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `c0da5a35`
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
- run.ts
- photopea-editor-session.ts
- photopea-document-exporter.test.ts
- Goal-Driven Execution
- Launch acceptance checklist (evening of September 17)
- run-routes.test.ts
- ResponsesSocket
- validateImageUpload
- createLaunchRuntime
- startFramePump
- PhotopeaMessage
- FakeEditorSession
- SteerLedger
- editor/index.ts
- trap-probe.ts
- responses-model-steering.test.ts
- managedAgentRun
- ADR-0003: Export a parser-backed Photopea snapshot
- Gitiles
- compilerOptions
- RunRegistry
- Photopea
- Google Developer Documentation Style Guide
- live-steer.ts
- server/index.ts
- CommonMark spec
- Layerhand README
- responses-socket.ts
- photopea-page-session.ts
- runtime.ts
- editor-session.contract.ts
- Conventional Commits
- RunRouteDependencies
- agent/contract.ts
- Agent instructions
- scripts
- retain-photopea-production-export.ts
- harness.ts
- run-registry.ts
- bun (package manager and script runner)
- page-routes.ts
- application.ts
- Photopea round-trip
- suite.ts
- package.json
- Hosted Chrome session over CDP
- Code Search
- Simplicity First
- Think Before Coding
- deployed-run.ts
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
- WarmSessionPool
- browserbase-editor-session.ts
- ResponsesModel
- computer tool (GA)
- Swap Test
- run-routes.ts
- session.ts
- Sample product photograph (sample-photo.png)
- BrowserbaseClient
- Stream-per-directory repository layout
- establishVisitorIdentity
- RunHandle
- responses-model.test.ts
- Native steering
- Codex proxy run
- Evidence
- agent-run.ts
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
- PhotopeaBridge
- Four run limits (step cap, spend cap, free runs, daily ceiling)
- Ten-image reliability suite design
- photopea-document-loader.test.ts
- measure.ts
- PhotopeaDocumentLoader
- FR-20: apply a typed mid-run correction without discarding completed work
- Launch day runbook
- Layered PSD export implementation plan
- PlaywrightPhotopeaTransport
- Ten-image reliability suite implementation plan
- Warm editor session
- EditorSession
- Prettier owns syntax, not prose
- fake-editor-session.ts
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

- `openInput()` --references--> `Sample product photograph (sample-photo.png)` [INFERRED]
  test/web/application.browser.test.ts → src/web/assets/sample-photo.png
- `Photopea tool bar (marquee, lasso, magic wand, brush, pen, type tools)` --conceptually_related_to--> `Scripted vs GUI-driven split (the line that protects the premise)` [INFERRED]
  src/editor/fixtures/photopea-frame.png → docs/TRD.md
- `Prettier owns syntax, not prose` --references--> `printWidth` [INFERRED]
  docs/agents/rules.md → .prettierrc.json
- `Bun full-stack HTML import (src/server/index.ts serves src/web/index.html)` --conceptually_related_to--> `build` [INFERRED]
  docs/references/launch-application-design.md → package.json
- `Idempotent waitlist endpoint and CSV export (bun run waitlist:export)` --references--> `waitlist:export` [EXTRACTED]
  docs/references/launch-application-design.md → package.json

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

## Communities (114 total, 21 thin omitted)

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

Cohesion: 0.07
Nodes (71): Accessibility baseline (keyboard file picker, visible focus, aria-live status, reduced motion), Five-state pure client reducer (landing, input, running, result, error), SSE sequence-id replay and sessionStorage reconnect, accepted(), boolean(), decodeRunEvent(), decodeRunSnapshot(), eventId() (+63 more)

### Community 4 - "photopea-document-exporter.ts"

Cohesion: 0.16
Nodes (18): selectBytes(), selectPngExport(), selectPsdExport(), validPng(), expectedTree(), noDocumentError(), PhotopeaDocumentExporter, PhotopeaDocumentExporterOptions (+10 more)

### Community 5 - "artifact-store.ts"

Cohesion: 0.08
Nodes (14): artifactPublisher(), ArtifactKind, ArtifactPutRequest, ArtifactStore, createArtifactKey(), EXTENSIONS, MemoryArtifactStore, StoredArtifact (+6 more)

### Community 6 - "loop.test.ts"

Cohesion: 0.10
Nodes (11): CLICK, DONE, EDITABLE_LAYERS, editableFixture(), fixture(), RECORDED_LAYERS, request, RETOUCH (+3 more)

### Community 7 - "browserbase-probe.ts"

Cohesion: 0.18
Nodes (10): Spike B2: Browserbase signup and cold-start measurement, BrowserbaseLiveView, BrowserbaseSession, BrowserbaseProbeClient, BrowserbaseProbeEvidence, BrowserbaseProbeOptions, createReadOnlyLiveView(), main() (+2 more)

### Community 8 - "live-frames.browser.test.ts"

Cohesion: 0.09
Nodes (22): Bun SQL metering and waitlist tables (visitor_usage, daily_usage, waitlist_emails), Idempotent waitlist endpoint and CSV export (bun run waitlist:export), createApplication(), createDatabase(), databaseReady(), applyMigrations(), csvField(), formatWaitlistCsv() (+14 more)

### Community 9 - "run.ts"

Cohesion: 0.10
Nodes (23): capCredits, codeLines, codex, decoder, estimateCredits(), events, exported, findSessionLog() (+15 more)

### Community 10 - "photopea-editor-session.ts"

Cohesion: 0.08
Nodes (20): playwright-core, AuxiliaryButton, AuxiliaryMouse, KEY_ALIASES, normalizeKey(), PhotopeaActionPage, PhotopeaActionRunner, PhotopeaActionRunnerOptions (+12 more)

### Community 11 - "photopea-document-exporter.test.ts"

Cohesion: 0.16
Nodes (14): ag-psd, adjustmentKinds, LiveLayer, namedPsd(), psd(), locateMaskThumbnail(), viewport, waitForMaskThumbnail() (+6 more)

### Community 13 - "Launch acceptance checklist (evening of September 17)"

Cohesion: 0.16
Nodes (24): leonxlnx/taste-skill skill collection, FR-30: public landing page with the differentiator and a silent demo loop, FR-31: email capture live and collecting before launch day, FR-32: thirty-second silent demo recording usable on Product Hunt, Launch acceptance checklist (evening of September 17), Launch schedule (September 12-18, launch Friday 12:01am PT), NFR-1: reliability, eight of ten test runs complete unattended with a valid layered file, Single-screen core flow (+16 more)

### Community 14 - "run-routes.test.ts"

Cohesion: 0.12
Nodes (15): AdmissionDenied, AdmissionRequest, AdmissionResult, assertMicroUsd(), DAILY_LIMIT, MeterReservation, MeterStore, SqlMeterStore (+7 more)

### Community 15 - "ResponsesSocket"

Cohesion: 0.21
Nodes (5): hasToolCall(), isObject(), ResponsesSocket, Step, text()

### Community 16 - "validateImageUpload"

Cohesion: 0.18
Nodes (15): validateImageUpload(), isValidHttpsUrl(), isValidRelativeImagePath(), loadReliabilityCorpus(), parseAndValidateCase(), RawCase, ReliabilityCategory, ReliabilityCorpusError (+7 more)

### Community 17 - "createLaunchRuntime"

Cohesion: 0.11
Nodes (14): RunLogStore, SqlRunLogStore, MAX_RUN_REQUEST_BODY_BYTES, createLaunchRuntime(), developmentNumber(), LaunchRuntime, readRunMode(), opened (+6 more)

### Community 18 - "startFramePump"

Cohesion: 0.12
Nodes (12): FRAME_INTERVAL_MS, FramePump, FramePumpOptions, startFramePump(), Phase, pumpFor(), retouch(), select() (+4 more)

### Community 19 - "PhotopeaMessage"

Cohesion: 0.07
Nodes (9): PhotopeaDocumentBridge, PhotopeaConfiguration, PhotopeaMessage, ControlledTransport, LateSentinelTransport, MemoryTransport, MemoryBridge, ImageTransport (+1 more)

### Community 20 - "FakeEditorSession"

Cohesion: 0.23
Nodes (3): cloneAction(), copyBytes(), FakeEditorSession

### Community 21 - "SteerLedger"

Cohesion: 0.09
Nodes (7): Entry, Settlement, SteerEntry, SteerLedger, SteerState, drain(), UNSETTLED

### Community 22 - "editor/index.ts"

Cohesion: 0.13
Nodes (25): ADJUSTMENT_DEFAULT_NAMES, ADJUSTMENT_LABELS, assertLayerNames(), buildLayerRenamePlan(), DEFAULT_ADJUSTMENT_NAMES, fallbackName(), firstFreeName(), flattenLayers() (+17 more)

### Community 23 - "trap-probe.ts"

Cohesion: 0.09
Nodes (27): InputFixtureEvidence, persistInputFixture(), recordOutputPath(), temporaryDirectories, jpeg, OUTPUT_DIRECTORY, PHOTOPEA_URL, SerializedMessage (+19 more)

### Community 24 - "responses-model-steering.test.ts"

Cohesion: 0.09
Nodes (16): CLICK, Connection, created(), Inbox, Json, observe(), SCREENSHOT, scriptedFetch() (+8 more)

### Community 25 - "managedAgentRun"

Cohesion: 0.27
Nodes (7): managedAgentRun(), CODES, describeFailure(), FailureRecorder, Operation, redactDiagnostic(), watchedSession()

### Community 26 - "ADR-0003: Export a parser-backed Photopea snapshot"

Cohesion: 0.05
Nodes (42): ADR-0001: Define a provider-neutral editor session, Alternatives considered, Consequences, Context, Decision, Expose Photopea or Playwright directly, Let the agent loop own browser interaction, References (+34 more)

### Community 28 - "compilerOptions"

Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleDetection, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck (+5 more)

### Community 29 - "RunRegistry"

Cohesion: 0.20
Nodes (6): measure(), RunRegistry background event pump with sixty-minute terminal retention, copyResult(), copySnapshot(), RunRegistry, RunRegistryError

### Community 30 - "Photopea"

Cohesion: 0.16
Nodes (21): FR-25: PSD opens without error in Photoshop, Affinity Photo and GIMP, FR-26: every layer named in human words, FR-27: masks and adjustment layers remain editable, Flat-output competitors (Photoroom, Clipdrop, Pixelcut, Claid, Pixelbin, remove.bg, Evoto, Imagen AI, Aftershoot, BoxBrownie), Flat-output problem in AI retouching, Judged-well criteria (differentiator stated after a silent viewing; layer stack survives a retoucher's inspection), Layered PSD output (the wedge), Photopea licence question (answered: automated and commercial use permitted) (+13 more)

### Community 32 - "live-steer.ts"

Cohesion: 0.08
Nodes (24): at(), browserbase, ceiling, client, correction, cost, events, imagePath (+16 more)

### Community 33 - "server/index.ts"

Cohesion: 0.18
Nodes (10): FR-16: per-user history of past runs (P2, deferred by the non-goals), NFR-7: page works at 1280 px and above; mobile out of scope, Requirement-level exclusions (no accounts, no in-app editing, no undo, PSD-only output, no internationalisation), Product non-goals (no image generation, no batch/API/integrations, no accounts beyond metering, no mobile, no own editor, no presets), Bun full-stack HTML import (src/server/index.ts serves src/web/index.html), #desktop-required notice (workbench needs a desktop at least 1280 pixels wide), index.html (Layerhand single-page shell), appFile (+2 more)

### Community 35 - "Layerhand README"

Cohesion: 0.18
Nodes (12): Browserbase probe command (creation-to-ready latency), Bun 1.4.2 runtime pin (lockfile version 2, frozen installs), /health readiness endpoint (process and database readiness), HTTP surface aligned with Contract 3 plus /health, Two-stage non-root container pinned to Bun 1.4.2, Single-container continuous deployment, browserbase:probe, dev (+4 more)

### Community 36 - "responses-socket.ts"

Cohesion: 0.18
Nodes (9): HeaderedWebSocket, Json, openResponsesSocket(), REPORTED, ResponsesSocketOptions, StepResult, STREAM_ID, connected() (+1 more)

### Community 37 - "photopea-page-session.ts"

Cohesion: 0.17
Nodes (6): KEY_NAMES, layerInfo(), PhotopeaPageSession, playwrightKey(), PNG_SIGNATURE, PSD_SIGNATURE

### Community 38 - "runtime.ts"

Cohesion: 0.11
Nodes (32): Environment configuration names (DATABASE_URL, SESSION_SECRET, FREE_DAILY_BUDGET_USD, S3_*, BROWSERBASE_API_KEY, OPENAI_API_KEY, TRUST_PROXY_HOPS), parseOutputRoot(), parsePositiveDecimal(), parsePositiveInteger(), readReliabilityCommandConfig(), ReliabilityCommandDependencies, REQUIRED_ENV_VARS, runReliabilityCommand() (+24 more)

### Community 39 - "editor-session.contract.ts"

Cohesion: 0.48
Nodes (4): assertLayerTree(), defineEditorSessionContract(), EditorSessionFactory, pngSignature

### Community 40 - "Conventional Commits"

Cohesion: 0.21
Nodes (17): Branch naming (<type>/<short-description>), Breaking change marker (! and BREAKING CHANGE footer), Conventional commit types (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test), Conventional Commits, gh pr create --fill-first, Conventional issue and pull request titles, Bug report issue form, Issue template chooser config (blank issues disabled) (+9 more)

### Community 43 - "agent/contract.ts"

Cohesion: 0.18
Nodes (10): ManagedRun server adapter (cache metrics, stop reason, releaseSecrets), RunEvent, RunResult, EventLog, fakeRun(), FakeRunOptions, SCRIPT, managedFakeRun() (+2 more)

### Community 44 - "Agent instructions"

Cohesion: 0.25
Nodes (8): AGENTS.md (agent instruction entry point), AGENTS.md as the single agent entry point, .agents/skills/ skills directory, astra-challenge skill, Agent instructions, Instructions, Project documents, References

### Community 45 - "scripts"

Cohesion: 0.24
Nodes (11): Formatting job, scripts, build, lint, lint:fix, reliability, start, test (+3 more)

### Community 46 - "retain-photopea-production-export.ts"

Cohesion: 0.10
Nodes (18): api, codeLog, host, [imagePath, outputArgument, portArgument], output, port, runner, screenshot() (+10 more)

### Community 47 - "harness.ts"

Cohesion: 0.11
Nodes (23): DEFAULT_IMAGES, INSTRUCTION, logPath, outputDirectory, records, registry, RunRecord, stepCap (+15 more)

### Community 48 - "run-registry.ts"

Cohesion: 0.11
Nodes (18): NFR-8: per-run observability (step count, token spend, outcome, failure reason), RunLogRecord one-line completion log, Per-run structured log line, ManagedRun, ManagedRunMetrics, RunFailure, initialSnapshot(), RegisterRun (+10 more)

### Community 49 - "bun (package manager and script runner)"

Cohesion: 0.27
Nodes (11): graphify CLI and knowledge graph (graphify-out/), Query the graph before reading source, Run graphify update after modifying code, RTK condensed command output, rtk proxy fallback, bun (package manager and script runner), graphify-labs/graphify skill collection, Local hook setup (bun install, then uv tool install graphifyy) (+3 more)

### Community 51 - "page-routes.ts"

Cohesion: 0.17
Nodes (11): PAGE_SHELL_PATH, PageRouteOptions, pageRoutes(), attribute(), SOCIAL_IMAGE_PATHS, socialMetaTags(), withSocialMeta(), connect() (+3 more)

### Community 52 - "application.ts"

Cohesion: 0.22
Nodes (8): Security and error-handling rules (textContent not innerHTML, restrictive CSP, egress policy, export before release), Application, APPLICATION_CSP, ApplicationDependencies, BASE_SECURITY_HEADERS, json(), PHOTOPEA_HOST_CSP, secured()

### Community 53 - "Photopea round-trip"

Cohesion: 0.22
Nodes (8): Digests, Files, Limits, Photopea round-trip, Photoshop verification, Result, Running it, Timing definitions

### Community 54 - "suite.ts"

Cohesion: 0.09
Nodes (28): ReliabilityCommandConfig, toLayerInfoTree(), ReliabilityCase, formatCacheRate(), formatCost(), formatReliabilityMarkdown(), formatReliabilityTerminal(), formatStatus() (+20 more)

### Community 55 - "package.json"

Cohesion: 0.15
Nodes (11): dependencies, ag-psd, playwright-core, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, prettier (+3 more)

### Community 56 - "Hosted Chrome session over CDP"

Cohesion: 0.21
Nodes (16): FR-2: free-text instruction of up to 500 characters, FR-4: three worked example instructions that fill the box on click, NFR-4: twenty simultaneous runs without queueing, then a queue with a stated position, Required FREE_DAILY_BUDGET_USD (no default daily ceiling), Browser provider shortlist (Browserbase, Anchor, Hyperbrowser, Steel), Browserbase, Export-then-destroy session disposal, Fifteen-minute run ceiling (+8 more)

### Community 60 - "deployed-run.ts"

Cohesion: 0.06
Nodes (45): acceptanceOutcome(), apiUrl(), cookieFrom(), dataPng(), DeployedRunDependencies, DeployedRunError, DeployedRunEvidence, DeployedRunOptions (+37 more)

### Community 71 - "Driving mechanism"

Cohesion: 0.29
Nodes (6): Driving mechanism, Findings from building it, Limits, Result, Running it, What a run does

### Community 72 - "WarmSessionPool"

Cohesion: 0.13
Nodes (12): claimed(), Entry, imageDigest(), MAX_WARM_SESSIONS, WARM_SESSION_TTL_MS, WarmEditorSession, WarmSessionPool, WarmSessionPoolOptions (+4 more)

### Community 73 - "browserbase-editor-session.ts"

Cohesion: 0.15
Nodes (15): CreatePhotopeaEditorSessionOptions, PHOTOPEA_ASSET_ORIGIN, browserbaseEditorSession, BrowserbaseEditorSessionOptions, BrowserbaseSessions, closedError(), comparableOrigin(), CONNECT_TIMEOUT_MS (+7 more)

### Community 74 - "ResponsesModel"

Cohesion: 0.20
Nodes (6): errorCode(), isObject(), narrationOf(), ResponsesApiError, ResponsesModel, safeCode()

### Community 75 - "computer tool (GA)"

Cohesion: 0.33
Nodes (7): Code-execution tool over a persistent Playwright session, computer tool (GA), ComputerAction type, Orchestrator, OpenAI Responses API (gpt-6-astra), Single long-lived server process (not serverless), Spike A0: code execution or the computer tool

### Community 77 - "Swap Test"

Cohesion: 0.12
Nodes (26): FR-33: Product Hunt assets (tagline, description, gallery images, first maker comment), Adobe Photoshop API v2, autoRetouch, BRIA AI, Commercial gate (risk 1: the commercial case vs the survey), Competition survey (twenty-six products plus a four-product follow-up), Contest outcome against the four inferred criteria, Adobe Firefly Creative Production (Remove Background preset, masked layered PSD) (+18 more)

### Community 78 - "run-routes.ts"

Cohesion: 0.24
Nodes (8): apiError(), boundedFormData(), json(), jsonObject(), registryError(), RequestTooLargeError, RunRoutes, RunStartError

### Community 79 - "session.ts"

Cohesion: 0.08
Nodes (23): LayerhandWindow, PhotopeaPageMessage, PhotopeaWireMessage, PlaywrightPhotopeaTransportOptions, layerMasks(), parsedLayer(), ParsedPsdMetadata, READ_OPTIONS (+15 more)

### Community 80 - "Sample product photograph (sample-photo.png)"

Cohesion: 0.16
Nodes (19): FR-1: accept one JPEG/PNG image up to 20 MB and 6000 px, FR-3: reject invalid input with a specific reason, FR-5: one sample image usable without uploading, Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle), API error shape { code, message }, Upload form (picker and drop, inline rejections, three example instructions, bundled sample photograph), EXIF orientation-aware expected dimensions, Upload validation before session creation (+11 more)

### Community 81 - "BrowserbaseClient"

Cohesion: 0.24
Nodes (5): BrowserbaseClient, BrowserbaseError, Fetch, requiredString(), RecordedRequest

### Community 82 - "Stream-per-directory repository layout"

Cohesion: 0.40
Nodes (6): Surgical Changes, Atomic commits, Rebase merge, never squash, Server-side repository setup (gh api merge settings), Single feat/launch-application branch, squash-merged by the coordinator, Stream-per-directory repository layout

### Community 83 - "establishVisitorIdentity"

Cohesion: 0.32
Nodes (10): Signed visitor cookie and HMAC visitor key (TRUST_PROXY_HOPS), clientAddress(), establishVisitorIdentity(), hmac(), readCookie(), signVisitorId(), validSignedId(), VisitorIdentity (+2 more)

### Community 84 - "RunHandle"

Cohesion: 0.23
Nodes (9): RunHandle, RunRequest, collect(), endOf(), EventOf, ofType(), RunContractSubject, testRunContract() (+1 more)

### Community 86 - "responses-model.test.ts"

Cohesion: 0.13
Nodes (7): AsyncFunction, pageCodeRunner(), CodeResult, CodeRunner, SCREENSHOT, Sent, USAGE

### Community 87 - "Native steering"

Cohesion: 0.29
Nodes (6): Completed work survived the correction, Limits, Native steering, Result, Running it, The correction, and what the socket saw

### Community 89 - "Codex proxy run"

Cohesion: 0.33
Nodes (5): Codex proxy run, How it runs, Limits, Result, Running it

### Community 90 - "Evidence"

Cohesion: 0.50
Nodes (3): Evidence, Folders, Layout

### Community 91 - "agent-run.ts"

Cohesion: 0.14
Nodes (13): AgentLoopDependencies, cut(), graphemes, PublishedKind, runAgent(), TokenUsage, ASTRA_PRICING, Spend (+5 more)

### Community 92 - "createRecordedFakeEditorSession"

Cohesion: 0.17
Nodes (16): FR-28: flattened PNG preview alongside the PSD, EditorSession interface (Contract 1), ORIGINAL, createRecordedFakeEditorSession(), document-preview.png (flattened document preview fixture), Minimalist long-exposure seascape with a small rocky island on the horizon, History panel: Open, Name Change, Duplicate Layer, Name Change, Recorded Photopea editor frame (photopea-frame.png, 1440x900) (+8 more)

### Community 93 - "agent-run.test.ts"

Cohesion: 0.09
Nodes (13): ScriptedModel, AgentModel, ModelTurn, Observation, CLICK, SCRIPT, ScriptedModel, ScriptedModelOptions (+5 more)

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

Cohesion: 0.16
Nodes (17): detectFormat(), ERROR_MESSAGES, EXIF_SIGNATURE, ImageUploadError, ImageUploadErrorCode, isStandaloneJpegMarker(), JPEG_SOF_MARKERS, JPEG_SOI (+9 more)

### Community 101 - "Contract tests"

Cohesion: 0.18
Nodes (21): FR-10: live view of the editor (at least one frame per 2 s, at most 3 s behind), FR-11: progress as step count against the cap with plain-words current action, FR-13: cancel at any point and keep the partial result, FR-14: survive a page reload by resuming the live view, FR-15: show the running session cost in credits, FR-29: list the layers on the page after the run, Desktop workbench layout (1280 px minimum, desktop-required message below), Read-only sandboxed live-view iframe (pointer-events none, tabindex -1) (+13 more)

### Community 102 - "PhotopeaBridge"

Cohesion: 0.11
Nodes (15): NFR-3: a run starts within five seconds of the button, Unique app.echoToOE sentinel per scripted call, Photopea postMessage protocol, Photopea known traps, Reusable Photopea bridge boot, Pre-warmed editor sessions, Spike B1: verify the image-in, PSD-out round trip, PhotopeaBridge (+7 more)

### Community 103 - "Four run limits (step cap, spend cap, free runs, daily ceiling)"

Cohesion: 0.12
Nodes (34): FR-12: stop at the step cap and return a layered partial result, FR-35: three free runs per visitor, enforced server-side, FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs, FR-37: global daily spend ceiling that stops free-allowance runs, FR-38: paid credit top-ups (P2), NFR-2: no single run exceeds $8 of model spend, NFR-5: no server API key reaches the browser; user keys never logged, persisted or sent beyond OpenAI, NFR-6: uploaded images deleted within twenty-four hours (+26 more)

### Community 104 - "Ten-image reliability suite design"

Cohesion: 0.17
Nodes (11): Acceptance mapping, Corpus contract, Execution flow, Expected file layout, Goals, Nightly workflow and spending guard, Non-goals, Results and visibility (+3 more)

### Community 105 - "photopea-document-loader.test.ts"

Cohesion: 0.26
Nodes (5): MAX_IMAGE_BYTES, expectMalformed(), withApp1(), jpeg(), png()

### Community 106 - "measure.ts"

Cohesion: 0.20
Nodes (13): cookieFrom(), filename, image, imageBlob(), imagePath, Measurement, output, summary (+5 more)

### Community 108 - "PhotopeaDocumentLoader"

Cohesion: 0.14
Nodes (16): Document-count snapshot before file delivery, Per-bridge FIFO for complete document opens, Filename verification through Document.source, Issue #15 installed-Chrome upload measurement, sharp, ImageFormat, ValidatedImageUpload, LoadedPhotopeaDocument (+8 more)

### Community 109 - "FR-20: apply a typed mid-run correction without discarding completed work"

Cohesion: 0.20
Nodes (19): FR-20: apply a typed mid-run correction without discarding completed work, FR-21: acknowledge a correction visibly within three seconds, FR-22: show accepted corrections in a visible list, FR-23: correction that undoes work already done (P2), Three product properties: editable output, visible work, steerable work, Keyboard-only accessibility agent, Astra Hackathon, Computer use (primitive) (+11 more)

### Community 110 - "Launch day runbook"

Cohesion: 0.22
Nodes (8): Changing a limit in a hurry, Launch day runbook, Rotating the server key, See also, The clock, The freeze, and the no-deploy rule, When the providers misbehave, Where to look when something is wrong

### Community 111 - "Layered PSD export implementation plan"

Cohesion: 0.18
Nodes (10): Global constraints, Issue #17 parallel boundary, Layered PSD export implementation plan, Task 1: Migrate the recursive layer contract, Task 2: Parse exported PSD metadata, Task 3: Enforce names and completed-tree policy, Task 4: Build the correlated Photopea export transaction, Task 5: Translate computer actions (+2 more)

### Community 112 - "PlaywrightPhotopeaTransport"

Cohesion: 0.18
Nodes (5): Compact base64 upload transfer, decodePhotopeaWireMessage(), PlaywrightPhotopeaTransport, FileMessage, PageFakeState

### Community 114 - "Ten-image reliability suite implementation plan"

Cohesion: 0.22
Nodes (8): Global constraints, Task 1: Add and validate the representative corpus, Task 2: Run cases sequentially and validate their PSDs, Task 3: Persist and format inspectable reports, Task 4: Add the paid production command, Task 5: Publish the guarded nightly result, Task 6: Run final verification and prepare review, Ten-image reliability suite implementation plan

### Community 116 - "Warm editor session"

Cohesion: 0.40
Nodes (4): Limits, Result, Running it, Warm editor session

### Community 121 - "Prettier owns syntax, not prose"

Cohesion: 0.25
Nodes (7): Prettier owns syntax, not prose, lint-staged, printWidth, $schema, semi, singleQuote, trailingComma

### Community 122 - "fake-editor-session.ts"

Cohesion: 0.16
Nodes (11): EditorRecording, SessionState, cloneLayerInfo(), cloneLayerTree(), createSession(), documentOperations, frameA, frameB (+3 more)

### Community 123 - "Superpowers"

Cohesion: 0.50
Nodes (3): Plans, Specs, Superpowers

## Ambiguous Edges - Review These

- `EXAMPLES` → `Cobalt glass bottle` [AMBIGUOUS]
  src/web/assets/sample-photo.png · relation: conceptually_related_to

## Knowledge Gaps

- **447 isolated node(s):** `$schema`, `singleQuote`, `semi`, `trailingComma`, `running` (+442 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 750 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `EXAMPLES` and `Cobalt glass bottle`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `playwright-core` connect `photopea-editor-session.ts` to `photopea-editor-session.test.ts`, `browserbase-probe.ts`, `live-frames.browser.test.ts`, `photopea-document-exporter.test.ts`, `createLaunchRuntime`, `startFramePump`, `trap-probe.ts`, `photopea-page-session.ts`, `browserbase-network.integration.test.ts`, `retain-photopea-production-export.ts`, `harness.ts`, `package.json`, `browserbase-editor-session.ts`, `session.ts`, `responses-model.test.ts`, `agent-run.test.ts`, `PhotopeaBridge`, `PhotopeaDocumentLoader`, `PlaywrightPhotopeaTransport`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `LayerInfo` connect `editor/index.ts` to `photopea-editor-session.test.ts`, `app.ts`, `photopea-document-exporter.ts`, `photopea-page-session.ts`, `Contract tests`, `editor-session.contract.ts`, `WarmSessionPool`, `photopea-editor-session.ts`, `agent/contract.ts`, `session.ts`, `harness.ts`, `FakeEditorSession`, `fake-editor-session.ts`, `createRecordedFakeEditorSession`, `agent-run.test.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `validateImageUpload()` connect `validateImageUpload` to `image-upload.ts`, `photopea-document-loader.test.ts`, `PhotopeaDocumentLoader`, `run-routes.ts`, `Sample product photograph (sample-photo.png)`, `editor/index.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `LayerInfo` (e.g. with `Layers panel: Retouched copy above Original photograph` and `LayerInfo type`) actually correct?**
  _`LayerInfo` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `singleQuote`, `semi` to the rest of the system?**
  _447 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `photopea-editor-session.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08771929824561403 - nodes in this community are weakly interconnected._
