# Graph Report - astra (2026-09-17)

## Corpus Check

- 266 files · ~619,498 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 36 file(s) not represented in the graph (top: (none) 10, .ndjson 10, .css 7)

## Summary

- 2432 nodes · 5243 edges · 144 communities (116 shown, 27 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 482 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `573fe020`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)

- app.ts
- image-upload.ts
- createGlassObject
- deployed-run.ts
- photopea-editor-session.test.ts
- ADR-0003: Export a parser-backed Photopea snapshot
- editor/index.ts
- Spend
- browserbase-editor-session.ts
- PhotopeaMessage
- playwright-core
- photopea-action-runner.ts
- runtime.ts
- trap-probe.ts
- Four run limits (step cap, spend cap, free runs, daily ceiling)
- live-frames.browser.test.ts
- PhotopeaDocumentLoader
- FR-20: apply a typed mid-run correction without discarding completed work
- run-routes.ts
- responses-model-steering.test.ts
- agent-run.ts
- photopea-editor-session.ts
- Launch acceptance checklist (evening of September 17)
- api.ts
- run-reliability.ts
- live-steer.ts
- photopea-document-exporter.ts
- Single-page web application
- SteerLedger
- run-registry-close.test.ts
- run.ts
- RunRoutes
- responses-model.ts
- Landing sections
- RunRegistry
- startFramePump
- SqlMeterStore
- loop.test.ts
- Photopea
- run-registry.ts
- FakeEditorSession
- suite.ts
- PhotopeaDocumentBridge
- state.ts
- Conventional Commits
- Swap Test
- Recorded Photopea editor frame (photopea-frame.png, 1440x900)
- agent-run.test.ts
- ResponsesModel
- PlaywrightPhotopeaTransport
- Design: Layerhand
- Layered PSD output (the wedge)
- ComputerAction
- model.ts
- BrowserbaseClient
- measure.ts
- Hosted Chrome session over CDP
- helper.ts
- compilerOptions
- browserbase-probe.ts
- managedAgentRun
- package.json
- application.ts
- Ten-image reliability suite design
- page-routes.ts
- Layered PSD export implementation plan
- dispatch
- graphify CLI and knowledge graph (graphify-out/)
- devDependencies
- Agent instructions
- Photopea round-trip
- Launch day runbook
- Ten-image reliability suite implementation plan
- harness.ts
- computer tool (GA)
- responses-model.test.ts
- Canvas UI
- bun (package manager and script runner)
- Driving mechanism
- Native steering
- photopea-document-exporter.test.ts
- Jakub Krehel's interface skills
- page-routes.test.ts
- Stream-per-directory repository layout
- Codex proxy run
- Agent run
- Warm editor session
- Agent instructions
- MotionSites
- Photopea production export
- Evidence
- Superpowers
- workflow.test.ts
- Goal-Driven Execution
- Code Search
- Gitiles
- Google Developer Documentation Style Guide
- Simplicity First
- Think Before Coding
- Merge rules kept by convention (branch rulesets and protection unavailable)
- Better/Best Rule
- Code spans for inline code and escaping
- CommonMark spec
- Google docguide philosophy
- Explicit link paths (relative only within the same directory)
- Informative link titles
- Lazy list numbering and 4-space nested indent
- Preserve original product name capitalization
- Single H1 heading
- Unique, complete heading names
- Container build and smoke-test workflow
- Production deploy workflow
- 10-image reliability test workflow
- Test and typecheck workflow
- .husky/pre-push hook
- OpenAI image generation tool
- design/README.md
- Design research
- Jakub Antalik
- run-registry.test.ts
- Hugeicons
- Iconsax
- Landing video pipeline
- Isocons
- Its Hover
- RunApi
- EditorSession
- run-memory/measure.ts
- fake-editor-session.test.ts
- workspace-screenshots.ts
- Product Hunt listing
- Conventional lint workflow
- footer.browser.test.ts
- application.browser.test.ts
- Run memory
- audit.test.ts
- editor-session.contract.ts
- .prettierrc.json
- gcs-lifecycle-workflow.test.ts
- make-scrub-clip.sh
- render-og-image.ts
- #app main mount point (aria-live polite, aria-busy)
- playwright-auxiliary-mouse.test.ts

## God Nodes (most connected - your core abstractions)

1. `RunRegistry` - 47 edges
2. `createLaunchRuntime()` - 41 edges
3. `playwright-core` - 39 edges
4. `LayerInfo` - 37 edges
5. `ResponsesModel` - 32 edges
6. `EditorSession` - 31 edges
7. `PhotopeaMessage` - 30 edges
8. `PhotopeaBridge` - 29 edges
9. `ManagedRun` - 29 edges
10. `ComputerAction` - 28 edges

## Surprising Connections (you probably didn't know these)

- `Prettier owns syntax, not prose` --references--> `printWidth` [INFERRED]
  docs/agents/rules.md → .prettierrc.json
- `Accessibility baseline (keyboard file picker, visible focus, aria-live status, reduced motion)` --conceptually_related_to--> `chooseFile()` [INFERRED]
  docs/references/launch-application-design.md → src/web/app.ts
- `openInput()` --references--> `Sample product photograph (sample-photo.png)` [INFERRED]
  test/web/application.browser.test.ts → src/web/assets/sample-photo.png
- `Bun full-stack HTML import (src/server/index.ts serves src/web/index.html)` --conceptually_related_to--> `build` [INFERRED]
  docs/references/launch-application-design.md → package.json
- `Contract tests` --references--> `testRunContract()` [INFERRED]
  docs/TRD.md → src/agent/contract-tests.ts

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
- **Run admission pipeline: validate the image, establish the visitor, admit against the meter, store the upload, then start the run** — docs_references_launch_application_design_admission_order, src_editor_image_upload_validateimageupload, src_server_visitor_identity_establishvisitoridentity, src_server_meter_store_meterstore_admit, src_server_artifact_store_artifactstore_put, src_server_run_routes_runroutes_start [INFERRED 0.85]
- **Original photograph and Retouched copy layer pair: shown, recorded, and asserted** — src_editor_fixtures_photopea_frame_layers_panel, src_editor_fixtures_photopea_frame_history_panel, src_editor_fake_editor_session_createrecordedfakeeditorsession, test_editor_recorded_fake_editor_session_test [INFERRED 0.95]
- **Use-the-sample-photograph flow, from button to run upload (FR-5)** — docs_prd_fr_5, src_web_app_renderinput, src_web_app_choosesample, src_web_assets_sample_photo_image, src_web_app_choosefile, src_web_api_runapi_start, test_web_application_browser_test_openinput [INFERRED 0.95]

## Communities (144 total, 27 thin omitted)

### Community 0 - "app.ts"

Cohesion: 0.14
Nodes (39): actionText(), announceNewCorrections(), api, brandHeader(), button(), cancelText(), chooseFile(), chooseSample() (+31 more)

### Community 1 - "image-upload.ts"

Cohesion: 0.06
Nodes (54): FR-1: accept one JPEG/PNG image up to 20 MB and 6000 px, FR-5: one sample image usable without uploading, Target users: e-commerce photo teams, real-estate photographers, freelance retouchers, Upload form (picker and drop, inline rejections, three example instructions, bundled sample photograph), EXIF orientation-aware expected dimensions, Upload validation before session creation, ReliabilityCommandDependencies, detectFormat() (+46 more)

### Community 2 - "createGlassObject"

Cohesion: 0.05
Nodes (55): three, DrawerLayer, icon(), LAYERS, node(), renderDrawer(), renderLayer(), createGlassObject() (+47 more)

### Community 3 - "deployed-run.ts"

Cohesion: 0.06
Nodes (45): acceptanceOutcome(), apiUrl(), cookieFrom(), dataPng(), DeployedRunDependencies, DeployedRunError, DeployedRunEvidence, DeployedRunOptions (+37 more)

### Community 4 - "photopea-editor-session.test.ts"

Cohesion: 0.09
Nodes (7): PhotopeaExportSnapshot, PhotopeaEditorSession, PhotopeaSessionWork, closeWithWork(), documentCalls(), fixture(), screenshot()

### Community 5 - "ADR-0003: Export a parser-backed Photopea snapshot"

Cohesion: 0.05
Nodes (42): ADR-0001: Define a provider-neutral editor session, Alternatives considered, Consequences, Context, Decision, Expose Photopea or Playwright directly, Let the agent loop own browser interaction, References (+34 more)

### Community 6 - "editor/index.ts"

Cohesion: 0.07
Nodes (46): EditorRecording, SessionState, ADJUSTMENT_DEFAULT_NAMES, ADJUSTMENT_LABELS, assertLayerNames(), buildLayerRenamePlan(), DEFAULT_ADJUSTMENT_NAMES, fallbackName() (+38 more)

### Community 7 - "Spend"

Cohesion: 0.21
Nodes (4): TokenUsage, ASTRA_PRICING, Spend, TokenPricing

### Community 8 - "browserbase-editor-session.ts"

Cohesion: 0.15
Nodes (13): PHOTOPEA_ASSET_ORIGIN, browserbaseEditorSession, BrowserbaseSessions, closedError(), comparableOrigin(), CONNECT_TIMEOUT_MS, connectOverCdp(), installNetworkAllowList() (+5 more)

### Community 9 - "PhotopeaMessage"

Cohesion: 0.07
Nodes (14): FILE_TRANSFER_MS_PER_MIB, PhotopeaBridge, PhotopeaProtocolError, PhotopeaProtocolErrorCode, PHOTOPEA_CONFIGURATION, PhotopeaConfiguration, PhotopeaEnvironment, PhotopeaEnvironmentParameters (+6 more)

### Community 10 - "playwright-core"

Cohesion: 0.18
Nodes (13): playwright-core, LAYER_GLYPHS, LAYER_NAMES, VIEWPORTS, VIEWPORTS, VIEWPORTS, VIEWPORTS, VIEWPORTS (+5 more)

### Community 11 - "photopea-action-runner.ts"

Cohesion: 0.10
Nodes (13): AuxiliaryButton, AuxiliaryMouse, KEY_ALIASES, normalizeKey(), PhotopeaActionPage, PhotopeaActionRunnerOptions, unknownKey(), buttonState() (+5 more)

### Community 12 - "runtime.ts"

Cohesion: 0.06
Nodes (29): Single-container continuous deployment, ScriptedModel, artifactPublisher(), Application, ArtifactPutRequest, ArtifactStore, StoredArtifact, Steering (+21 more)

### Community 13 - "trap-probe.ts"

Cohesion: 0.09
Nodes (27): InputFixtureEvidence, persistInputFixture(), recordOutputPath(), temporaryDirectories, jpeg, OUTPUT_DIRECTORY, PHOTOPEA_URL, SerializedMessage (+19 more)

### Community 14 - "Four run limits (step cap, spend cap, free runs, daily ceiling)"

Cohesion: 0.12
Nodes (34): FR-11: progress as step count against the cap with plain-words current action, FR-12: stop at the step cap and return a layered partial result, FR-35: three free runs per visitor, enforced server-side, FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs, FR-37: global daily spend ceiling that stops free-allowance runs, FR-38: paid credit top-ups (P2), NFR-2: no single run exceeds $8 of model spend, NFR-5: no server API key reaches the browser; user keys never logged, persisted or sent beyond OpenAI (+26 more)

### Community 15 - "live-frames.browser.test.ts"

Cohesion: 0.09
Nodes (28): Bun SQL metering and waitlist tables (visitor_usage, daily_usage, waitlist_emails), createApplication(), ArtifactKind, createArtifactKey(), EXTENSIONS, MemoryArtifactStore, createDatabase(), databaseReady() (+20 more)

### Community 16 - "PhotopeaDocumentLoader"

Cohesion: 0.10
Nodes (27): NFR-3: a run starts within five seconds of the button, Browserbase probe command (creation-to-ready latency), Document-count snapshot before file delivery, Per-bridge FIFO for complete document opens, Filename verification through Document.source, Unique app.echoToOE sentinel per scripted call, Issue #15 installed-Chrome upload measurement, Photopea postMessage protocol (+19 more)

### Community 17 - "FR-20: apply a typed mid-run correction without discarding completed work"

Cohesion: 0.18
Nodes (21): FR-13: cancel at any point and keep the partial result, FR-14: survive a page reload by resuming the live view, FR-15: show the running session cost in credits, FR-20: apply a typed mid-run correction without discarding completed work, FR-21: acknowledge a correction visibly within three seconds, FR-22: show accepted corrections in a visible list, FR-23: correction that undoes work already done (P2), Contract tests (+13 more)

### Community 18 - "run-routes.ts"

Cohesion: 0.06
Nodes (26): serve(), RUN_CEILING_MS, ADDRESS_LIMIT, AdmissionRequest, AdmissionResult, BUDGET_RESERVED, DAILY_LIMIT, DEFAULT_FREE_RUNS_PER_ADDRESS_PER_DAY (+18 more)

### Community 19 - "responses-model-steering.test.ts"

Cohesion: 0.08
Nodes (19): ResponsesModelOptions, CLICK, Connection, created(), Inbox, Json, observe(), rateLimitedEvent (+11 more)

### Community 20 - "agent-run.ts"

Cohesion: 0.10
Nodes (27): ManagedRun server adapter (cache metrics, stop reason, releaseSecrets), RunEvent, RunHandle, RunRequest, RunResult, collect(), endOf(), EventOf (+19 more)

### Community 21 - "photopea-editor-session.ts"

Cohesion: 0.09
Nodes (18): bridge, fixturePath, samplePath, server, session, viewport, MAX_IMAGE_EDGE, PhotopeaActionRunner (+10 more)

### Community 22 - "Launch acceptance checklist (evening of September 17)"

Cohesion: 0.15
Nodes (26): leonxlnx/taste-skill skill collection, FR-30: public landing page with the differentiator and a silent demo loop, FR-31: email capture live and collecting before launch day, FR-32: thirty-second silent demo recording usable on Product Hunt, Launch acceptance checklist (evening of September 17), Launch schedule (September 12-18, launch Friday 12:01am PT), NFR-1: reliability, eight of ten test runs complete unattended with a valid layered file, Risk: reliability of long GUI control (+18 more)

### Community 23 - "api.ts"

Cohesion: 0.21
Nodes (24): RunStatus, boolean(), decodeRunEvent(), decodeRunSnapshot(), eventId(), EventSourceFactory, Fetch, integer() (+16 more)

### Community 24 - "run-reliability.ts"

Cohesion: 0.09
Nodes (39): Environment configuration names (DATABASE_URL, SESSION_SECRET, FREE_DAILY_BUDGET_USD, S3_*, BROWSERBASE_API_KEY, OPENAI_API_KEY, TRUST_PROXY_HOPS), parseOutputRoot(), parsePositiveDecimal(), parsePositiveInteger(), readReliabilityCommandConfig(), ReliabilityCommandConfig, REQUIRED_ENV_VARS, runReliabilityCommand() (+31 more)

### Community 25 - "live-steer.ts"

Cohesion: 0.08
Nodes (24): at(), browserbase, ceiling, client, correction, cost, events, imagePath (+16 more)

### Community 26 - "photopea-document-exporter.ts"

Cohesion: 0.15
Nodes (20): selectBytes(), selectPngExport(), selectPsdExport(), validPng(), ImageFormat, expectedTree(), noDocumentError(), PhotopeaDocumentExporterOptions (+12 more)

### Community 27 - "Single-page web application"

Cohesion: 0.12
Nodes (18): FR-10: live view of the editor (at least one frame per 2 s, at most 3 s behind), FR-16: per-user history of past runs (P2, deferred by the non-goals), FR-29: list the layers on the page after the run, NFR-7: page works at 1280 px and above; mobile out of scope, Requirement-level exclusions (no accounts, no in-app editing, no undo, PSD-only output, no internationalisation), Single-screen core flow, Product non-goals (no image generation, no batch/API/integrations, no accounts beyond metering, no mobile, no own editor, no presets), Bun full-stack HTML import (src/server/index.ts serves src/web/index.html) (+10 more)

### Community 28 - "SteerLedger"

Cohesion: 0.05
Nodes (22): failedResponseStatus(), hasToolCall(), HeaderedWebSocket, isObject(), Json, openResponsesSocket(), REPORTED, ResponsesSocket (+14 more)

### Community 29 - "run-registry-close.test.ts"

Cohesion: 0.07
Nodes (17): claimed(), Entry, imageDigest(), MAX_WARM_SESSIONS, WARM_SESSION_TTL_MS, WarmEditorSession, WarmSessionPool, WarmSessionPoolOptions (+9 more)

### Community 30 - "run.ts"

Cohesion: 0.10
Nodes (23): capCredits, codeLines, codex, decoder, estimateCredits(), events, exported, findSessionLog() (+15 more)

### Community 31 - "RunRoutes"

Cohesion: 0.05
Nodes (45): FR-3: reject invalid input with a specific reason, Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle), API error shape { code, message }, Bun 1.4.2 runtime pin (lockfile version 2, frozen installs), /health readiness endpoint (process and database readiness), HTTP surface aligned with Contract 3 plus /health, Signed visitor cookie and HMAC visitor key (TRUST_PROXY_HOPS), Two-stage non-root container pinned to Bun 1.4.2 (+37 more)

### Community 32 - "responses-model.ts"

Cohesion: 0.10
Nodes (25): QueuedCorrection, NativeSteer, BUTTONS, COMMON_PROMPT, correctionText(), describeCodeResult(), Json, keys() (+17 more)

### Community 33 - "Landing sections"

Cohesion: 0.06
Nodes (32): Drawer, Drawer content, Drawer copy, Drawer DOM outline, Drawer done looks like, Footer copy, Glass, Glass copy (+24 more)

### Community 34 - "RunRegistry"

Cohesion: 0.11
Nodes (13): RunRegistry background event pump with sixty-minute terminal retention, ManagedRun, copyResult(), copySnapshot(), EnqueueRun, initialSnapshot(), isLive(), RegisterRun (+5 more)

### Community 35 - "startFramePump"

Cohesion: 0.12
Nodes (12): FRAME_INTERVAL_MS, FramePump, FramePumpOptions, startFramePump(), Phase, pumpFor(), retouch(), select() (+4 more)

### Community 36 - "SqlMeterStore"

Cohesion: 0.33
Nodes (3): AdmissionDenied, assertMicroUsd(), SqlMeterStore

### Community 37 - "loop.test.ts"

Cohesion: 0.09
Nodes (12): CLICK, DONE, EDITABLE_LAYERS, editableFixture(), fixture(), RECORDED_LAYERS, request, RETOUCH (+4 more)

### Community 38 - "Photopea"

Cohesion: 0.53
Nodes (6): Risk: the scripting escape hatch, Editor adapter, Photopea, Photopea Action Manager stub (stringIDToTypeID lookup table), Scripted vs GUI-driven split (the line that protects the premise), Photopea tool bar (marquee, lasso, magic wand, brush, pen, type tools)

### Community 39 - "run-registry.ts"

Cohesion: 0.08
Nodes (28): NFR-8: per-run observability (step count, token spend, outcome, failure reason), RunLogRecord one-line completion log, Per-run structured log line, RunStopReason, ManagedRunMetrics, CODES, Operation, RunFailure (+20 more)

### Community 40 - "FakeEditorSession"

Cohesion: 0.23
Nodes (3): cloneAction(), copyBytes(), FakeEditorSession

### Community 41 - "suite.ts"

Cohesion: 0.13
Nodes (11): ReliabilityCase, ReliabilityCaseResult, ReliabilityFailureCode, ReliabilityPublish, ReliabilitySuiteOptions, StartReliabilityRun, StartReliabilityRunInput, validEnv (+3 more)

### Community 42 - "PhotopeaDocumentBridge"

Cohesion: 0.10
Nodes (5): PhotopeaDocumentBridge, MemoryBridge, RecordingBridge, jpeg(), png()

### Community 43 - "state.ts"

Cohesion: 0.21
Nodes (14): Five-state pure client reducer (landing, input, running, result, error), ClientAction, ClientState, emptyProgress(), fromSnapshot(), initialClientState(), isCurrentRun(), progressFromSnapshot() (+6 more)

### Community 44 - "Conventional Commits"

Cohesion: 0.36
Nodes (11): Branch naming (<type>/<short-description>), Breaking change marker (! and BREAKING CHANGE footer), Conventional commit types (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test), Conventional Commits, Conventional issue and pull request titles, Bug report issue form, Issue template chooser config (blank issues disabled), Feature request issue form (+3 more)

### Community 45 - "Swap Test"

Cohesion: 0.19
Nodes (20): Three product properties: editable output, visible work, steerable work, Keyboard-only accessibility agent, Astra Hackathon, Async tool calling (primitive), Computer use (primitive), Computer use x mid-turn steering (Round 9), Whole-corpus contradiction finder (runner-up), Hosted-browser computer use (Round 2) (+12 more)

### Community 46 - "Recorded Photopea editor frame (photopea-frame.png, 1440x900)"

Cohesion: 0.21
Nodes (13): FR-28: flattened PNG preview alongside the PSD, EditorSession interface (Contract 1), FakeEditorSession, ORIGINAL, document-preview.png (flattened document preview fixture), Minimalist long-exposure seascape with a small rocky island on the horizon, History panel: Open, Name Change, Duplicate Layer, Name Change, Recorded Photopea editor frame (photopea-frame.png, 1440x900) (+5 more)

### Community 47 - "agent-run.test.ts"

Cohesion: 0.12
Nodes (8): ModelUnavailableError, liveAgentRun(), agentRuntime(), live(), next(), runtimes, samplePath, steerableAstra()

### Community 48 - "ResponsesModel"

Cohesion: 0.15
Nodes (8): CallUnanswered, errorCode(), isObject(), narrationOf(), ResponsesModel, safeCode(), usageOf(), scriptedAstra()

### Community 49 - "PlaywrightPhotopeaTransport"

Cohesion: 0.13
Nodes (13): Compact base64 upload transfer, CreatePhotopeaEditorSessionOptions, decodePhotopeaWireMessage(), FILE_SLICE_BYTES, LayerhandWindow, PhotopeaPageMessage, PhotopeaQueueHead, PhotopeaWireMessage (+5 more)

### Community 50 - "Design: Layerhand"

Cohesion: 0.10
Nodes (19): Acceptance, Colour, Decisions, Design: Layerhand, Do and do not, Fallbacks, Hero: layered parallax, Icons (+11 more)

### Community 51 - "Layered PSD output (the wedge)"

Cohesion: 0.11
Nodes (30): FR-25: PSD opens without error in Photoshop, Affinity Photo and GIMP, FR-26: every layer named in human words, FR-27: masks and adjustment layers remain editable, FR-33: Product Hunt assets (tagline, description, gallery images, first maker comment), Adobe Photoshop API v2, autoRetouch, BRIA AI, Commercial gate (risk 1: the commercial case vs the survey) (+22 more)

### Community 52 - "ComputerAction"

Cohesion: 0.10
Nodes (8): KEY_NAMES, layerInfo(), PhotopeaPageSession, playwrightKey(), PNG_SIGNATURE, PSD_SIGNATURE, ComputerAction, ExpectedSession

### Community 53 - "model.ts"

Cohesion: 0.21
Nodes (8): ScriptedModel, AgentModel, ModelTurn, Observation, CLICK, SCRIPT, ScriptedModelOptions, wait()

### Community 54 - "BrowserbaseClient"

Cohesion: 0.24
Nodes (5): BrowserbaseClient, BrowserbaseError, Fetch, requiredString(), RecordedRequest

### Community 55 - "measure.ts"

Cohesion: 0.20
Nodes (13): cookieFrom(), filename, image, imageBlob(), imagePath, Measurement, output, summary (+5 more)

### Community 56 - "Hosted Chrome session over CDP"

Cohesion: 0.21
Nodes (16): FR-2: free-text instruction of up to 500 characters, FR-4: three worked example instructions that fill the box on click, NFR-4: twenty simultaneous runs without queueing, then a queue with a stated position, Required FREE_DAILY_BUDGET_USD (no default daily ceiling), Browser provider shortlist (Browserbase, Anchor, Hyperbrowser, Steel), Browserbase, Export-then-destroy session disposal, Fifteen-minute run ceiling (+8 more)

### Community 57 - "helper.ts"

Cohesion: 0.20
Nodes (9): api, codeLog, host, [imagePath, outputArgument, portArgument], output, port, runner, screenshot() (+1 more)

### Community 58 - "compilerOptions"

Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleDetection, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck (+5 more)

### Community 59 - "browserbase-probe.ts"

Cohesion: 0.22
Nodes (9): BrowserbaseLiveView, BrowserbaseSession, BrowserbaseProbeClient, BrowserbaseProbeEvidence, BrowserbaseProbeOptions, createReadOnlyLiveView(), main(), runBrowserbaseProbe() (+1 more)

### Community 60 - "managedAgentRun"

Cohesion: 0.29
Nodes (7): createRecordedFakeEditorSession(), managedAgentRun(), describeFailure(), FailureRecorder, redactDiagnostic(), run(), watchedSession()

### Community 61 - "package.json"

Cohesion: 0.13
Nodes (13): dependencies, ag-psd, playwright-core, three, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged (+5 more)

### Community 62 - "application.ts"

Cohesion: 0.20
Nodes (8): Security and error-handling rules (textContent not innerHTML, restrictive CSP, egress policy, export before release), APPLICATION_CSP, ApplicationDependencies, BASE_SECURITY_HEADERS, json(), PHOTOPEA_HOST_CSP, secured(), SECURITY_HEADERS

### Community 63 - "Ten-image reliability suite design"

Cohesion: 0.17
Nodes (11): Acceptance mapping, Corpus contract, Execution flow, Expected file layout, Goals, Nightly workflow and spending guard, Non-goals, Results and visibility (+3 more)

### Community 64 - "page-routes.ts"

Cohesion: 0.17
Nodes (12): bundledFiles(), favicon(), PageFile, PageRoute, PageRouteOptions, pageRoutes(), securedResponse(), attribute() (+4 more)

### Community 65 - "Layered PSD export implementation plan"

Cohesion: 0.18
Nodes (10): Global constraints, Issue #17 parallel boundary, Layered PSD export implementation plan, Task 1: Migrate the recursive layer contract, Task 2: Parse exported PSD metadata, Task 3: Enforce names and completed-tree policy, Task 4: Build the correlated Photopea export transaction, Task 5: Translate computer actions (+2 more)

### Community 66 - "dispatch"

Cohesion: 0.24
Nodes (9): SSE sequence-id replay and sessionStorage reconnect, RunStreamEvent, EventSourceLike, close(), dispatch(), followRun(), reconnectRun(), restoreRun() (+1 more)

### Community 67 - "graphify CLI and knowledge graph (graphify-out/)"

Cohesion: 0.33
Nodes (7): Run bun run graph after modifying code, graphify CLI and knowledge graph (graphify-out/), Query the graph before reading source, Refresh doc and concept nodes with /graphify --update, RTK condensed command output, rtk proxy fallback, graphify-labs/graphify skill collection

### Community 68 - "devDependencies"

Cohesion: 0.18
Nodes (11): devDependencies, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, prettier, sharp, @types/bun (+3 more)

### Community 70 - "Agent instructions"

Cohesion: 0.25
Nodes (8): AGENTS.md (agent instruction entry point), AGENTS.md as the single agent entry point, .agents/skills/ skills directory, astra-challenge skill, Agent instructions, Instructions, Project documents, References

### Community 71 - "Photopea round-trip"

Cohesion: 0.22
Nodes (8): Digests, Files, Limits, Photopea round-trip, Photoshop verification, Result, Running it, Timing definitions

### Community 72 - "Launch day runbook"

Cohesion: 0.18
Nodes (10): Changing a limit in a hurry, Launch day runbook, Request limits, Rolling back to the previous revision, Rotating the server key, See also, The clock, The freeze, and the no-deploy rule (+2 more)

### Community 73 - "Ten-image reliability suite implementation plan"

Cohesion: 0.22
Nodes (8): Global constraints, Task 1: Add and validate the representative corpus, Task 2: Run cases sequentially and validate their PSDs, Task 3: Persist and format inspectable reports, Task 4: Add the paid production command, Task 5: Publish the guarded nightly result, Task 6: Run final verification and prepare review, Ten-image reliability suite implementation plan

### Community 74 - "harness.ts"

Cohesion: 0.09
Nodes (19): AsyncFunction, pageCodeRunner(), DEFAULT_IMAGES, INSTRUCTION, logPath, measure(), outputDirectory, records (+11 more)

### Community 75 - "computer tool (GA)"

Cohesion: 0.67
Nodes (4): Code-execution tool over a persistent Playwright session, computer tool (GA), ComputerAction type, Spike A0: code execution or the computer tool

### Community 76 - "responses-model.test.ts"

Cohesion: 0.14
Nodes (4): ResponsesApiError, SCREENSHOT, Sent, USAGE

### Community 77 - "Canvas UI"

Cohesion: 0.15
Nodes (13): Browser support, Canvas UI, Components, Cursor and click effects, How an effect is built, How it works, Installing, Peel (+5 more)

### Community 78 - "bun (package manager and script runner)"

Cohesion: 0.36
Nodes (9): bun (package manager and script runner), Prettier owns syntax, not prose, Local hook setup (bun install, then uv tool install graphifyy), Lint workflow (formatting), Formatting job, .husky/pre-commit hook, lint-staged, lint (+1 more)

### Community 79 - "Driving mechanism"

Cohesion: 0.29
Nodes (6): Driving mechanism, Findings from building it, Limits, Result, Running it, What a run does

### Community 80 - "Native steering"

Cohesion: 0.29
Nodes (6): Completed work survived the correction, Limits, Native steering, Result, Running it, The correction, and what the socket saw

### Community 81 - "photopea-document-exporter.test.ts"

Cohesion: 0.17
Nodes (14): ag-psd, adjustmentKinds, exporter(), LiveLayer, namedPsd(), psd(), adjustments, expectInvalidPsd() (+6 more)

### Community 82 - "Jakub Krehel's interface skills"

Cohesion: 0.17
Nodes (12): Colour, How the skills are built, Jakub Krehel's interface skills, Layout, Motion and accessibility, See also, The collection, The user-invoked skills (+4 more)

### Community 83 - "page-routes.test.ts"

Cohesion: 0.32
Nodes (5): expectEverythingSecured(), expectPageFilesServed(), filesThePageLoads(), serve(), servers

### Community 84 - "Stream-per-directory repository layout"

Cohesion: 0.40
Nodes (6): Surgical Changes, Atomic commits, Rebase merge, never squash, Server-side repository setup (gh api merge settings), Single feat/launch-application branch, squash-merged by the coordinator, Stream-per-directory repository layout

### Community 85 - "Codex proxy run"

Cohesion: 0.33
Nodes (5): Codex proxy run, How it runs, Limits, Result, Running it

### Community 86 - "Agent run"

Cohesion: 0.40
Nodes (4): Agent run, Limits, Result, Running it

### Community 87 - "Warm editor session"

Cohesion: 0.40
Nodes (4): Limits, Result, Running it, Warm editor session

### Community 88 - "Agent instructions"

Cohesion: 0.40
Nodes (4): Agent instructions, Instructions, Project documents, References

### Community 89 - "MotionSites"

Cohesion: 0.18
Nodes (11): Animated backgrounds, How a prompt is written, Layered parallax hero, MotionSites, Scroll-scrubbed video, See also, The free lessons, Three.js scroll scene (+3 more)

### Community 90 - "Photopea production export"

Cohesion: 0.50
Nodes (3): Photopea production export, Result, Running it

### Community 91 - "Evidence"

Cohesion: 0.50
Nodes (3): Evidence, Folders, Layout

### Community 92 - "Superpowers"

Cohesion: 0.50
Nodes (3): Plans, Specs, Superpowers

### Community 93 - "workflow.test.ts"

Cohesion: 0.50
Nodes (3): WorkflowDefinition, WorkflowJob, WorkflowStep

### Community 118 - "Design research"

Cohesion: 0.20
Nodes (10): Constraints from our stack, Design research, Iconography, Motion, Open questions, See also, Sources, The typeface question (+2 more)

### Community 119 - "Jakub Antalik"

Cohesion: 0.22
Nodes (9): Jakub Antalik, Libraries.dev, See also, Selected work, The customisation panel, The drawer, The page, Transitions.dev (+1 more)

### Community 120 - "run-registry.test.ts"

Cohesion: 0.18
Nodes (7): RunEventEnvelope, frame(), framedRun(), registerRunHoldingUpload(), RESULT, scriptedRun(), STARTED

### Community 121 - "Hugeicons"

Cohesion: 0.25
Nodes (8): An icon's page, Browsing and search, For agents, Getting icons without an account, Hugeicons, See also, The free style, Why it fits

### Community 122 - "Iconsax"

Cohesion: 0.25
Nodes (8): An icon's panel, Browsing and configuring, Free against Pro, Iconsax, See also, The free set, Where the browser lives, Why it is the alternative

### Community 123 - "Landing video pipeline"

Cohesion: 0.25
Nodes (8): Encoding for the page, Generating in Gemini, Landing video pipeline, Removing the watermark, See also, The agent's checklist, What Gemini outputs, Writing the prompt

### Community 124 - "Isocons"

Cohesion: 0.29
Nodes (7): An icon's panel, Isocons, See also, Styling controls, The catalogue, The exported SVG, Why it fits

### Community 125 - "Its Hover"

Cohesion: 0.29
Nodes (7): Examples, How an icon is built, Its Hover, See also, The library, Using it without React, What it covers

### Community 126 - "RunApi"

Cohesion: 0.31
Nodes (3): accepted(), responseJson(), RunApi

### Community 128 - "run-memory/measure.ts"

Cohesion: 0.28
Nodes (8): follow(), Followed, frameBytes, measure(), megabytes(), runs, stepMs, { values }

### Community 129 - "fake-editor-session.test.ts"

Cohesion: 0.22
Nodes (7): createSession(), documentOperations, frameA, frameB, MutableLayerInfo, nestedLayers, psd

### Community 130 - "workspace-screenshots.ts"

Cohesion: 0.53
Nodes (5): capture(), chooseSample(), shot(), startRun(), VIEWPORTS

### Community 131 - "Product Hunt listing"

Cohesion: 0.25
Nodes (7): Description, First maker comment, Gallery, Links, Product Hunt listing, Tagline, Topics

### Community 132 - "Conventional lint workflow"

Cohesion: 0.33
Nodes (6): gh pr create --fill-first, Conventional lint workflow, Commit messages job, Pull request title job, Pass untrusted titles through the environment, .husky/commit-msg hook

### Community 133 - "footer.browser.test.ts"

Cohesion: 0.60
Nodes (4): expectFold(), footerView(), scrollAndSettle(), VIEWPORTS

### Community 134 - "application.browser.test.ts"

Cohesion: 0.29
Nodes (5): LONG_INSTRUCTION, openInput(), REAL_FRAME_URL, samplePath, ViewportBox

### Community 135 - "Run memory"

Cohesion: 0.40
Nodes (4): Limits, Result, Run memory, Running it

### Community 136 - "audit.test.ts"

Cohesion: 0.60
Nodes (4): collectLandingFiles(), cssFiles(), FileText, tsFiles()

### Community 137 - "editor-session.contract.ts"

Cohesion: 0.48
Nodes (4): assertLayerTree(), defineEditorSessionContract(), EditorSessionFactory, pngSignature

### Community 138 - ".prettierrc.json"

Cohesion: 0.33
Nodes (5): printWidth, $schema, semi, singleQuote, trailingComma

### Community 139 - "gcs-lifecycle-workflow.test.ts"

Cohesion: 0.50
Nodes (3): WorkflowDefinition, WorkflowJob, WorkflowStep

### Community 141 - "render-og-image.ts"

Cohesion: 0.50
Nodes (3): OUTPUTS, ROOT, server

### Community 142 - "#app main mount point (aria-live polite, aria-busy)"

Cohesion: 0.67
Nodes (3): Accessibility baseline (keyboard file picker, visible focus, aria-live status, reduced motion), applicationRoot, #app main mount point (aria-live polite, aria-busy)

## Ambiguous Edges - Review These

- `EXAMPLES` → `Cobalt glass bottle` [AMBIGUOUS]
  src/web/assets/sample-photo.png · relation: conceptually_related_to

## Knowledge Gaps

- **653 isolated node(s):** `$schema`, `singleQuote`, `semi`, `trailingComma`, `running` (+648 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1008 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `EXAMPLES` and `Cobalt glass bottle`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `LayerInfo` connect `editor/index.ts` to `app.ts`, `fake-editor-session.test.ts`, `photopea-editor-session.test.ts`, `FakeEditorSession`, `editor-session.contract.ts`, `harness.ts`, `Recorded Photopea editor frame (photopea-frame.png, 1440x900)`, `agent-run.test.ts`, `ComputerAction`, `agent-run.ts`, `photopea-editor-session.ts`, `api.ts`, `run-registry.test.ts`, `photopea-document-exporter.ts`, `Single-page web application`, `run-registry-close.test.ts`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `playwright-core` connect `playwright-core` to `workspace-screenshots.ts`, `photopea-editor-session.test.ts`, `footer.browser.test.ts`, `application.browser.test.ts`, `browserbase-editor-session.ts`, `PhotopeaMessage`, `photopea-action-runner.ts`, `trap-probe.ts`, `render-og-image.ts`, `playwright-auxiliary-mouse.test.ts`, `PhotopeaDocumentLoader`, `live-frames.browser.test.ts`, `photopea-editor-session.ts`, `startFramePump`, `agent-run.test.ts`, `PlaywrightPhotopeaTransport`, `ComputerAction`, `helper.ts`, `browserbase-probe.ts`, `package.json`, `browserbase-network.integration.test.ts`, `harness.ts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `ResponsesModel` connect `ResponsesModel` to `responses-model.ts`, `harness.ts`, `responses-model.test.ts`, `agent-run.test.ts`, `responses-model-steering.test.ts`, `agent-run.ts`, `model.ts`, `live-steer.ts`, `SteerLedger`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `LayerInfo` (e.g. with `Layers panel: Retouched copy above Original photograph` and `LayerInfo type`) actually correct?**
  _`LayerInfo` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `singleQuote`, `semi` to the rest of the system?**
  _653 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13658536585365855 - nodes in this community are weakly interconnected._
