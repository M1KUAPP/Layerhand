# Graph Report - astra (2026-09-17)

## Corpus Check

- 268 files · ~624,746 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 36 file(s) not represented in the graph (top: (none) 10, .ndjson 10, .css 7)

## Summary

- 2452 nodes · 5296 edges · 147 communities (121 shown, 25 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 481 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `87aa0e63`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)

- app.ts
- corpus.ts
- createGlassObject
- deployed-run.ts
- photopea-editor-session.ts
- ADR-0003: Export a parser-backed Photopea snapshot
- photopea-document-exporter.ts
- agent-run.ts
- browserbase-editor-session.ts
- PhotopeaMessage
- playwright-core
- photopea-action-runner.ts
- artifact-store.ts
- trap-probe.ts
- Four run limits (step cap, spend cap, free runs, daily ceiling)
- createLaunchRuntime
- PhotopeaBridge
- Single-container continuous deployment
- run-routes.test.ts
- responses-model-steering.test.ts
- LayerInfo
- editor/index.ts
- Launch acceptance checklist (evening of September 17)
- api.ts
- suite.ts
- live-steer.ts
- harness.ts
- Contract tests
- SteerLedger
- WarmSessionPool
- run.ts
- run-routes.ts
- responses-model.ts
- Landing sections
- RunRegistry
- startFramePump
- glass.ts
- loop.test.ts
- Hosted Chrome session over CDP
- run-log.test.ts
- run-reliability.ts
- image-upload.ts
- photopea-document-loader.test.ts
- state.ts
- Conventional Commits
- Swap Test
- FakeEditorSession
- agent-run.test.ts
- ResponsesModel
- PlaywrightPhotopeaTransport
- Design: Layerhand
- RunHandle
- photopea-page-session.ts
- ComputerAction
- BrowserbaseClient
- warm-editor/measure.ts
- Layered PSD output (the wedge)
- Sample product photograph (sample-photo.png)
- compilerOptions
- live-run.ts
- EditorSession
- package.json
- config.ts
- Ten-image reliability suite design
- page-routes.ts
- Layered PSD export implementation plan
- SSE sequence-id replay and sessionStorage reconnect
- bun (package manager and script runner)
- devDependencies
- retain-photopea-production-export.ts
- GPT-6 Astra Challenge (OpenAI x Product Hunt)
- Photopea round-trip
- Launch day runbook
- Ten-image reliability suite implementation plan
- landing/index.ts
- RunRouteDependencies
- responses-model.test.ts
- Canvas UI
- scripts
- Driving mechanism
- Native steering
- photopea-document-exporter.test.ts
- Jakub Krehel's interface skills
- report.ts
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
- Design research
- Jakub Antalik
- establishVisitorIdentity
- Hugeicons
- Iconsax
- Landing video pipeline
- Isocons
- Its Hover
- Photopea
- runtime.ts
- SqlMeterStore
- RateLimiter
- RunApi
- Product Hunt listing
- run-registry-close.test.ts
- photopea-document-loader.ts
- run-queue.test.ts
- Run memory
- audit.test.ts
- limits.test.ts
- lint
- gcs-lifecycle-workflow.test.ts
- make-scrub-clip.sh
- Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle)
- scrub.ts
- drawer.ts
- ExpectedSession
- hero.ts
- assets.d.ts

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

- `Atomic free admission with microdollar spend reservations` --conceptually_related_to--> `FREE_LIMIT` [INFERRED]
  docs/references/launch-application-design.md → src/server/meter-store.ts
- `startRequest()` --shares_data_with--> `document-preview.png (flattened document preview fixture)` [INFERRED]
  test/server/run-routes.test.ts → src/editor/fixtures/document-preview.png
- `openInput()` --references--> `Sample product photograph (sample-photo.png)` [INFERRED]
  test/web/application.browser.test.ts → src/web/assets/sample-photo.png
- `Prettier owns syntax, not prose` --references--> `printWidth` [INFERRED]
  docs/agents/rules.md → .prettierrc.json
- `Bun full-stack HTML import (src/server/index.ts serves src/web/index.html)` --conceptually_related_to--> `build` [INFERRED]
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
- **Run admission pipeline: validate the image, establish the visitor, admit against the meter, store the upload, then start the run** — docs_references_launch_application_design_admission_order, src_editor_image_upload_validateimageupload, src_server_visitor_identity_establishvisitoridentity, src_server_meter_store_meterstore_admit, src_server_artifact_store_artifactstore_put, src_server_run_routes_runroutes_start [INFERRED 0.85]
- **Original photograph and Retouched copy layer pair: shown, recorded, and asserted** — src_editor_fixtures_photopea_frame_layers_panel, src_editor_fixtures_photopea_frame_history_panel, src_editor_fake_editor_session_createrecordedfakeeditorsession, test_editor_recorded_fake_editor_session_test [INFERRED 0.95]
- **Use-the-sample-photograph flow, from button to run upload (FR-5)** — docs_prd_fr_5, src_web_app_renderinput, src_web_app_choosesample, src_web_assets_sample_photo_image, src_web_app_choosefile, src_web_api_runapi_start, test_web_application_browser_test_openinput [INFERRED 0.95]

## Communities (147 total, 25 thin omitted)

### Community 0 - "app.ts"

Cohesion: 0.12
Nodes (46): Accessibility baseline (keyboard file picker, visible focus, aria-live status, reduced motion), actionText(), announceNewCorrections(), api, applicationRoot, brandHeader(), button(), cancelText() (+38 more)

### Community 1 - "corpus.ts"

Cohesion: 0.18
Nodes (14): isValidHttpsUrl(), isValidRelativeImagePath(), loadReliabilityCorpus(), parseAndValidateCase(), RawCase, ReliabilityCategory, ReliabilityCorpusError, ReliabilityCorpusErrorCode (+6 more)

### Community 2 - "createGlassObject"

Cohesion: 0.19
Nodes (19): createGlassObject(), applyFit(), applyOptions(), buildModel(), buildRoom(), clearAsset(), clearModel(), dedupeClosingPoint() (+11 more)

### Community 3 - "deployed-run.ts"

Cohesion: 0.10
Nodes (30): acceptanceOutcome(), apiUrl(), cookieFrom(), dataPng(), DeployedRunDependencies, DeployedRunError, DeployedRunEvidence, DeployedRunOptions (+22 more)

### Community 4 - "photopea-editor-session.ts"

Cohesion: 0.09
Nodes (9): PhotopeaExportSnapshot, createPhotopeaEditorSession(), PhotopeaEditorSession, PhotopeaSessionWork, createPlaywrightAuxiliaryMouse(), closeWithWork(), documentCalls(), fixture() (+1 more)

### Community 5 - "ADR-0003: Export a parser-backed Photopea snapshot"

Cohesion: 0.05
Nodes (42): ADR-0001: Define a provider-neutral editor session, Alternatives considered, Consequences, Context, Decision, Expose Photopea or Playwright directly, Let the agent loop own browser interaction, References (+34 more)

### Community 6 - "photopea-document-exporter.ts"

Cohesion: 0.08
Nodes (39): selectBytes(), selectPngExport(), selectPsdExport(), validPng(), ADJUSTMENT_DEFAULT_NAMES, ADJUSTMENT_LABELS, assertLayerNames(), buildLayerRenamePlan() (+31 more)

### Community 7 - "agent-run.ts"

Cohesion: 0.09
Nodes (19): AgentLoopDependencies, appliedNatively(), cut(), graphemes, PublishedKind, QueuedCorrection, runAgent(), AgentModel (+11 more)

### Community 8 - "browserbase-editor-session.ts"

Cohesion: 0.08
Nodes (25): MAX_IMAGE_EDGE, CreatePhotopeaEditorSessionOptions, PHOTOPEA_ASSET_ORIGIN, BrowserbaseLiveView, BrowserbaseSession, browserbaseEditorSession, BrowserbaseEditorSessionOptions, BrowserbaseSessions (+17 more)

### Community 9 - "PhotopeaMessage"

Cohesion: 0.08
Nodes (11): FILE_TRANSFER_MS_PER_MIB, PhotopeaBridgeOptions, PhotopeaProtocolError, PhotopeaProtocolErrorCode, PhotopeaConfiguration, PhotopeaMessage, ControlledTransport, LateSentinelTransport (+3 more)

### Community 10 - "playwright-core"

Cohesion: 0.08
Nodes (30): playwright-core, OUTPUTS, ROOT, server, capture(), chooseSample(), shot(), startRun() (+22 more)

### Community 11 - "photopea-action-runner.ts"

Cohesion: 0.08
Nodes (14): AuxiliaryButton, AuxiliaryMouse, KEY_ALIASES, normalizeKey(), PhotopeaActionPage, PhotopeaActionRunner, PhotopeaActionRunnerOptions, unknownKey() (+6 more)

### Community 12 - "artifact-store.ts"

Cohesion: 0.08
Nodes (14): artifactPublisher(), ArtifactKind, ArtifactPutRequest, ArtifactStore, createArtifactKey(), EXTENSIONS, MemoryArtifactStore, StoredArtifact (+6 more)

### Community 13 - "trap-probe.ts"

Cohesion: 0.09
Nodes (27): InputFixtureEvidence, persistInputFixture(), recordOutputPath(), temporaryDirectories, jpeg, OUTPUT_DIRECTORY, PHOTOPEA_URL, SerializedMessage (+19 more)

### Community 14 - "Four run limits (step cap, spend cap, free runs, daily ceiling)"

Cohesion: 0.15
Nodes (30): FR-11: progress as step count against the cap with plain-words current action, FR-12: stop at the step cap and return a layered partial result, FR-35: three free runs per visitor, enforced server-side, FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs, FR-37: global daily spend ceiling that stops free-allowance runs, FR-38: paid credit top-ups (P2), NFR-2: no single run exceeds $8 of model spend, NFR-5: no server API key reaches the browser; user keys never logged, persisted or sent beyond OpenAI (+22 more)

### Community 15 - "createLaunchRuntime"

Cohesion: 0.11
Nodes (28): /health readiness endpoint (process and database readiness), HTTP surface aligned with Contract 3 plus /health, Bun SQL metering and waitlist tables (visitor_usage, daily_usage, waitlist_emails), Idempotent waitlist endpoint and CSV export (bun run waitlist:export), ScriptedModel, createApplication(), createDatabase(), databaseReady() (+20 more)

### Community 16 - "PhotopeaBridge"

Cohesion: 0.09
Nodes (25): NFR-3: a run starts within five seconds of the button, Browserbase probe command (creation-to-ready latency), Document-count snapshot before file delivery, Per-bridge FIFO for complete document opens, Unique app.echoToOE sentinel per scripted call, Image resolution vs screenshot viewport, Issue #15 installed-Chrome upload measurement, Photopea postMessage protocol (+17 more)

### Community 17 - "Single-container continuous deployment"

Cohesion: 0.29
Nodes (8): Code-execution tool over a persistent Playwright session, computer tool (GA), ComputerAction type, Orchestrator, OpenAI Responses API (gpt-6-astra), Single-container continuous deployment, Single long-lived server process (not serverless), Spike A0: code execution or the computer tool

### Community 18 - "run-routes.test.ts"

Cohesion: 0.07
Nodes (21): RUN_CEILING_MS, ADDRESS_LIMIT, AdmissionRequest, AdmissionResult, BUDGET_RESERVED, DAILY_LIMIT, DEFAULT_FREE_RUNS_PER_ADDRESS_PER_DAY, FREE_LIMIT (+13 more)

### Community 19 - "responses-model-steering.test.ts"

Cohesion: 0.08
Nodes (17): CLICK, Connection, created(), Inbox, Json, observe(), rateLimitedEvent, SCREENSHOT (+9 more)

### Community 20 - "LayerInfo"

Cohesion: 0.10
Nodes (17): RunEvent, RunResult, EventLog, END, fakeRun(), FakeRunOptions, SCRIPT, request (+9 more)

### Community 21 - "editor/index.ts"

Cohesion: 0.10
Nodes (27): cloneLayerInfo(), cloneLayerTree(), assertCompleteLayerTree(), LayerCompletionError, LayerCompletionErrorCode, PhotopeaEditorSessionDependencies, PHOTOPEA_CONFIGURATION, PHOTOPEA_ORIGIN (+19 more)

### Community 22 - "Launch acceptance checklist (evening of September 17)"

Cohesion: 0.20
Nodes (18): leonxlnx/taste-skill skill collection, FR-30: public landing page with the differentiator and a silent demo loop, FR-31: email capture live and collecting before launch day, FR-32: thirty-second silent demo recording usable on Product Hunt, Launch acceptance checklist (evening of September 17), Launch schedule (September 12-18, launch Friday 12:01am PT), NFR-1: reliability, eight of ten test runs complete unattended with a valid layered file, Risk: reliability of long GUI control (+10 more)

### Community 23 - "api.ts"

Cohesion: 0.21
Nodes (23): boolean(), decodeRunEvent(), decodeRunSnapshot(), eventId(), EventSourceFactory, Fetch, integer(), invalidResponse() (+15 more)

### Community 24 - "suite.ts"

Cohesion: 0.15
Nodes (13): toLayerInfoTree(), ReliabilityCase, loadCaseImage(), ReliabilityCaseResult, ReliabilityPublish, ReliabilitySuiteOptions, runReliabilitySuite(), StartReliabilityRun (+5 more)

### Community 25 - "live-steer.ts"

Cohesion: 0.08
Nodes (24): at(), browserbase, ceiling, client, correction, cost, events, imagePath (+16 more)

### Community 26 - "harness.ts"

Cohesion: 0.08
Nodes (24): api, codeLog, host, [imagePath, outputArgument, portArgument], output, port, runner, screenshot() (+16 more)

### Community 27 - "Contract tests"

Cohesion: 0.11
Nodes (28): FR-10: live view of the editor (at least one frame per 2 s, at most 3 s behind), FR-13: cancel at any point and keep the partial result, FR-14: survive a page reload by resuming the live view, FR-15: show the running session cost in credits, FR-29: list the layers on the page after the run, NFR-7: page works at 1280 px and above; mobile out of scope, Single-screen core flow, Bun full-stack HTML import (src/server/index.ts serves src/web/index.html) (+20 more)

### Community 28 - "SteerLedger"

Cohesion: 0.05
Nodes (22): failedResponseStatus(), hasToolCall(), HeaderedWebSocket, isObject(), Json, openResponsesSocket(), REPORTED, ResponsesSocket (+14 more)

### Community 29 - "WarmSessionPool"

Cohesion: 0.12
Nodes (12): claimed(), Entry, imageDigest(), MAX_WARM_SESSIONS, WARM_SESSION_TTL_MS, WarmEditorSession, WarmSessionPool, WarmSessionPoolOptions (+4 more)

### Community 30 - "run.ts"

Cohesion: 0.10
Nodes (23): capCredits, codeLines, codex, decoder, estimateCredits(), events, exported, findSessionLog() (+15 more)

### Community 31 - "run-routes.ts"

Cohesion: 0.17
Nodes (13): RunStartRefused, apiError(), boundedFormData(), boundedJson(), fromAllowedOrigin(), json(), MAX_RUN_REQUEST_BODY_BYTES, QUEUE_FULL (+5 more)

### Community 32 - "responses-model.ts"

Cohesion: 0.10
Nodes (25): BUTTONS, COMMON_PROMPT, correctionText(), describeCodeResult(), Json, keys(), ModelTransport, number() (+17 more)

### Community 33 - "Landing sections"

Cohesion: 0.06
Nodes (32): Drawer, Drawer content, Drawer copy, Drawer DOM outline, Drawer done looks like, Footer copy, Glass, Glass copy (+24 more)

### Community 34 - "RunRegistry"

Cohesion: 0.10
Nodes (16): measure(), RunRegistry background event pump with sixty-minute terminal retention, ManagedRun, copyResult(), copySnapshot(), EnqueueRun, initialSnapshot(), isLive() (+8 more)

### Community 35 - "startFramePump"

Cohesion: 0.12
Nodes (12): FRAME_INTERVAL_MS, FramePump, FramePumpOptions, startFramePump(), Phase, pumpFor(), retouch(), select() (+4 more)

### Community 36 - "glass.ts"

Cohesion: 0.13
Nodes (14): three, FACTS, flatArt(), FormerDef, GLASS_DEFAULTS, GlassModules, GlassObjectElements, GlassObjectInstance (+6 more)

### Community 37 - "loop.test.ts"

Cohesion: 0.09
Nodes (12): CLICK, DONE, EDITABLE_LAYERS, editableFixture(), fixture(), RECORDED_LAYERS, request, RETOUCH (+4 more)

### Community 38 - "Hosted Chrome session over CDP"

Cohesion: 0.22
Nodes (16): FR-2: free-text instruction of up to 500 characters, NFR-4: twenty simultaneous runs without queueing, then a queue with a stated position, External checkpoints and issue closure (Browserbase billing, contest rules, deployment account, OpenAI key and daily ceiling, demo asset and waitlist store, log query), Required FREE_DAILY_BUDGET_USD (no default daily ceiling), Browser provider shortlist (Browserbase, Anchor, Hyperbrowser, Steel), Browserbase, Export-then-destroy session disposal, Fifteen-minute run ceiling (+8 more)

### Community 39 - "run-log.test.ts"

Cohesion: 0.13
Nodes (19): NFR-8: per-run observability (step count, token spend, outcome, failure reason), RunLogRecord one-line completion log, Per-run structured log line, RunStopReason, ManagedRunMetrics, RunFailure, RunFailureCode, createRunLogger() (+11 more)

### Community 40 - "run-reliability.ts"

Cohesion: 0.18
Nodes (15): parseOutputRoot(), parsePositiveDecimal(), parsePositiveInteger(), readReliabilityCommandConfig(), ReliabilityCommandConfig, ReliabilityCommandDependencies, REQUIRED_ENV_VARS, runReliabilityCommand() (+7 more)

### Community 41 - "image-upload.ts"

Cohesion: 0.19
Nodes (17): detectFormat(), ERROR_MESSAGES, EXIF_SIGNATURE, ImageUploadError, ImageUploadErrorCode, isStandaloneJpegMarker(), JPEG_SOF_MARKERS, JPEG_SOI (+9 more)

### Community 42 - "photopea-document-loader.test.ts"

Cohesion: 0.26
Nodes (5): MAX_IMAGE_BYTES, expectMalformed(), withApp1(), jpeg(), png()

### Community 43 - "state.ts"

Cohesion: 0.15
Nodes (19): Five-state pure client reducer (landing, input, running, result, error), describeStrandedCorrections(), joinNumbers(), strandedCorrectionNumbers(), ClientAction, ClientState, CorrectionStatus, correctionStatuses() (+11 more)

### Community 44 - "Conventional Commits"

Cohesion: 0.21
Nodes (17): Branch naming (<type>/<short-description>), Breaking change marker (! and BREAKING CHANGE footer), Conventional commit types (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test), Conventional Commits, gh pr create --fill-first, Conventional issue and pull request titles, Bug report issue form, Issue template chooser config (blank issues disabled) (+9 more)

### Community 45 - "Swap Test"

Cohesion: 0.15
Nodes (25): FR-20: apply a typed mid-run correction without discarding completed work, FR-21: acknowledge a correction visibly within three seconds, FR-22: show accepted corrections in a visible list, FR-23: correction that undoes work already done (P2), Three product properties: editable output, visible work, steerable work, Keyboard-only accessibility agent, Astra Hackathon, Async tool calling (primitive) (+17 more)

### Community 46 - "FakeEditorSession"

Cohesion: 0.06
Nodes (38): follow(), Followed, frameBytes, measure(), megabytes(), runs, serve(), stepMs (+30 more)

### Community 47 - "agent-run.test.ts"

Cohesion: 0.11
Nodes (8): ModelUnavailableError, DEFAULT_RUN_LIMITS, agentRuntime(), live(), next(), run(), runtimes, samplePath

### Community 48 - "ResponsesModel"

Cohesion: 0.12
Nodes (10): CallUnanswered, errorCode(), isObject(), narrationOf(), ResponsesApiError, ResponsesModel, safeCode(), usageOf() (+2 more)

### Community 49 - "PlaywrightPhotopeaTransport"

Cohesion: 0.15
Nodes (10): Compact base64 upload transfer, decodePhotopeaWireMessage(), FILE_SLICE_BYTES, LayerhandWindow, PhotopeaPageMessage, PhotopeaQueueHead, PhotopeaWireMessage, PlaywrightPhotopeaTransport (+2 more)

### Community 50 - "Design: Layerhand"

Cohesion: 0.10
Nodes (19): Acceptance, Colour, Decisions, Design: Layerhand, Do and do not, Fallbacks, Hero: layered parallax, Icons (+11 more)

### Community 51 - "RunHandle"

Cohesion: 0.31
Nodes (8): RunHandle, RunRequest, collect(), endOf(), EventOf, ofType(), RunContractSubject, testRunContract()

### Community 52 - "photopea-page-session.ts"

Cohesion: 0.18
Nodes (6): KEY_NAMES, layerInfo(), PhotopeaPageSession, playwrightKey(), PNG_SIGNATURE, PSD_SIGNATURE

### Community 53 - "ComputerAction"

Cohesion: 0.24
Nodes (8): ScriptedModel, ModelTurn, Observation, CLICK, SCRIPT, ScriptedModelOptions, wait(), ComputerAction

### Community 54 - "BrowserbaseClient"

Cohesion: 0.24
Nodes (5): BrowserbaseClient, BrowserbaseError, Fetch, requiredString(), RecordedRequest

### Community 55 - "warm-editor/measure.ts"

Cohesion: 0.20
Nodes (13): cookieFrom(), filename, image, imageBlob(), imagePath, Measurement, output, summary (+5 more)

### Community 56 - "Layered PSD output (the wedge)"

Cohesion: 0.12
Nodes (28): FR-25: PSD opens without error in Photoshop, Affinity Photo and GIMP, FR-26: every layer named in human words, FR-27: masks and adjustment layers remain editable, FR-33: Product Hunt assets (tagline, description, gallery images, first maker comment), Adobe Photoshop API v2, autoRetouch, BRIA AI, Commercial gate (risk 1: the commercial case vs the survey) (+20 more)

### Community 57 - "Sample product photograph (sample-photo.png)"

Cohesion: 0.27
Nodes (12): Target users: e-commerce photo teams, real-estate photographers, freelance retouchers, EXAMPLES, Sample product photograph (sample-photo.png), Brushed metal cap, Cast shadow, Cobalt glass bottle, Dust specks, Glass reflections (+4 more)

### Community 58 - "compilerOptions"

Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleDetection, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck (+5 more)

### Community 59 - "live-run.ts"

Cohesion: 0.11
Nodes (15): acceptance, browserbase, ceiling, client, cost, events, imagePath, last (+7 more)

### Community 60 - "EditorSession"

Cohesion: 0.17
Nodes (8): EditorSession, managedAgentRun(), CODES, describeFailure(), FailureRecorder, Operation, redactDiagnostic(), watchedSession()

### Community 61 - "package.json"

Cohesion: 0.13
Nodes (13): dependencies, ag-psd, playwright-core, three, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged (+5 more)

### Community 62 - "config.ts"

Cohesion: 0.19
Nodes (15): Environment configuration names (DATABASE_URL, SESSION_SECRET, FREE_DAILY_BUDGET_USD, S3_*, BROWSERBASE_API_KEY, OPENAI_API_KEY, TRUST_PROXY_HOPS), Environment, EnvironmentName, parsePositiveDecimal(), parsePositiveInteger(), parseTrustedProxyHops(), readConfig(), readRunLimits() (+7 more)

### Community 63 - "Ten-image reliability suite design"

Cohesion: 0.17
Nodes (11): Acceptance mapping, Corpus contract, Execution flow, Expected file layout, Goals, Nightly workflow and spending guard, Non-goals, Results and visibility (+3 more)

### Community 64 - "page-routes.ts"

Cohesion: 0.06
Nodes (35): Security and error-handling rules (textContent not innerHTML, restrictive CSP, egress policy, export before release), Application, APPLICATION_CSP, ApplicationDependencies, BASE_SECURITY_HEADERS, json(), PHOTOPEA_HOST_CSP, secured() (+27 more)

### Community 65 - "Layered PSD export implementation plan"

Cohesion: 0.18
Nodes (10): Global constraints, Issue #17 parallel boundary, Layered PSD export implementation plan, Task 1: Migrate the recursive layer contract, Task 2: Parse exported PSD metadata, Task 3: Enforce names and completed-tree policy, Task 4: Build the correlated Photopea export transaction, Task 5: Translate computer actions (+2 more)

### Community 66 - "SSE sequence-id replay and sessionStorage reconnect"

Cohesion: 0.38
Nodes (3): SSE sequence-id replay and sessionStorage reconnect, RunStreamEvent, EventSourceLike

### Community 67 - "bun (package manager and script runner)"

Cohesion: 0.27
Nodes (10): Run bun run graph after modifying code, graphify CLI and knowledge graph (graphify-out/), Query the graph before reading source, Refresh doc and concept nodes with /graphify --update, RTK condensed command output, rtk proxy fallback, bun (package manager and script runner), graphify-labs/graphify skill collection (+2 more)

### Community 68 - "devDependencies"

Cohesion: 0.18
Nodes (11): devDependencies, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, prettier, sharp, @types/bun (+3 more)

### Community 69 - "retain-photopea-production-export.ts"

Cohesion: 0.11
Nodes (8): bridge, fixturePath, samplePath, server, session, viewport, createPhotopeaHostHtml(), FileMessage

### Community 70 - "GPT-6 Astra Challenge (OpenAI x Product Hunt)"

Cohesion: 0.18
Nodes (14): AGENTS.md (agent instruction entry point), AGENTS.md as the single agent entry point, .agents/skills/ skills directory, Open question: official contest rules, astra-challenge skill, Before-committing checks (deadline and prize terms, Photopea terms and trademark, waitlist), GPT-6 Astra Challenge (OpenAI x Product Hunt), Inferred judging rubric (WebMCP Challenge criteria) (+6 more)

### Community 71 - "Photopea round-trip"

Cohesion: 0.22
Nodes (8): Digests, Files, Limits, Photopea round-trip, Photoshop verification, Result, Running it, Timing definitions

### Community 72 - "Launch day runbook"

Cohesion: 0.18
Nodes (10): Changing a limit in a hurry, Launch day runbook, Request limits, Rolling back to the previous revision, Rotating the server key, See also, The clock, The freeze, and the no-deploy rule (+2 more)

### Community 73 - "Ten-image reliability suite implementation plan"

Cohesion: 0.22
Nodes (8): Global constraints, Task 1: Add and validate the representative corpus, Task 2: Run cases sequentially and validate their PSDs, Task 3: Persist and format inspectable reports, Task 4: Add the paid production command, Task 5: Publish the guarded nightly result, Task 6: Run final verification and prepare review, Ten-image reliability suite implementation plan

### Community 74 - "landing/index.ts"

Cohesion: 0.26
Nodes (7): LandingContext, loadIconFont(), renderLanding(), startEntranceGate(), icon(), node(), renderWaitlist()

### Community 75 - "RunRouteDependencies"

Cohesion: 0.20
Nodes (5): checkOpenAiKey(), Fetch, OpenAiKeyCheck, RunRouteDependencies, WaitlistStore

### Community 76 - "responses-model.test.ts"

Cohesion: 0.15
Nodes (4): CodeRunner, SCREENSHOT, Sent, USAGE

### Community 77 - "Canvas UI"

Cohesion: 0.15
Nodes (13): Browser support, Canvas UI, Components, Cursor and click effects, How an effect is built, How it works, Installing, Peel (+5 more)

### Community 78 - "scripts"

Cohesion: 0.14
Nodes (16): Bun 1.4.2 runtime pin (lockfile version 2, frozen installs), Two-stage non-root container pinned to Bun 1.4.2, scripts, build, dev, graph, lint:fix, reliability (+8 more)

### Community 79 - "Driving mechanism"

Cohesion: 0.29
Nodes (6): Driving mechanism, Findings from building it, Limits, Result, Running it, What a run does

### Community 80 - "Native steering"

Cohesion: 0.29
Nodes (6): Completed work survived the correction, Limits, Native steering, Result, Running it, The correction, and what the socket saw

### Community 81 - "photopea-document-exporter.test.ts"

Cohesion: 0.09
Nodes (19): ag-psd, PhotopeaDocumentExporter, PhotopeaDocumentBridge, adjustmentKinds, exporter(), LiveLayer, MemoryBridge, namedPsd() (+11 more)

### Community 82 - "Jakub Krehel's interface skills"

Cohesion: 0.17
Nodes (12): Colour, How the skills are built, Jakub Krehel's interface skills, Layout, Motion and accessibility, See also, The collection, The user-invoked skills (+4 more)

### Community 83 - "report.ts"

Cohesion: 0.29
Nodes (12): formatCacheRate(), formatCost(), formatReliabilityMarkdown(), formatReliabilityTerminal(), formatStatus(), redactSecrets(), SECRET_PATTERNS, SerializableReliabilityCaseResult (+4 more)

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

### Community 120 - "establishVisitorIdentity"

Cohesion: 0.36
Nodes (9): Signed visitor cookie and HMAC visitor key (TRUST_PROXY_HOPS), clientAddress(), establishVisitorIdentity(), hmac(), readCookie(), signVisitorId(), validSignedId(), VisitorIdentityError (+1 more)

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

### Community 126 - "Photopea"

Cohesion: 0.21
Nodes (14): FR-16: per-user history of past runs (P2, deferred by the non-goals), Requirement-level exclusions (no accounts, no in-app editing, no undo, PSD-only output, no internationalisation), Photopea licence question (answered: automated and commercial use permitted), Product non-goals (no image generation, no batch/API/integrations, no accounts beyond metering, no mobile, no own editor, no presets), Risk: the scripting escape hatch, ag-psd fallback, Editor adapter, Embedded Photopea driven by the user (fallback product) (+6 more)

### Community 127 - "runtime.ts"

Cohesion: 0.20
Nodes (9): Steering, RunRegistryOptions, AgentConfig, developmentNumber(), Environment, LaunchRuntimeOptions, publicOrigin(), readRunMode() (+1 more)

### Community 128 - "SqlMeterStore"

Cohesion: 0.33
Nodes (3): AdmissionDenied, assertMicroUsd(), SqlMeterStore

### Community 129 - "RateLimiter"

Cohesion: 0.20
Nodes (4): RateLimiter, RateLimiterOptions, createEndpointLimiter(), EndpointLimiter

### Community 130 - "RunApi"

Cohesion: 0.26
Nodes (5): accepted(), responseJson(), RunApi, isImageUploadError(), warmEditor()

### Community 131 - "Product Hunt listing"

Cohesion: 0.25
Nodes (7): Description, First maker comment, Gallery, Links, Product Hunt listing, Tagline, Topics

### Community 132 - "run-registry-close.test.ts"

Cohesion: 0.17
Nodes (5): ABANDONED, CANCELLED, registryWithLog(), samplePath, STARTED

### Community 133 - "photopea-document-loader.ts"

Cohesion: 0.33
Nodes (7): Filename verification through Document.source, ImageFormat, ValidatedImageUpload, LoadedPhotopeaDocument, PhotopeaDocumentError, readDocumentCount(), verifyDocument()

### Community 134 - "run-queue.test.ts"

Cohesion: 0.25
Nodes (5): DONE, enqueueInFlight(), eventsUntil(), runInFlight(), STARTED

### Community 135 - "Run memory"

Cohesion: 0.40
Nodes (4): Limits, Result, Run memory, Running it

### Community 136 - "audit.test.ts"

Cohesion: 0.60
Nodes (4): collectLandingFiles(), cssFiles(), FileText, tsFiles()

### Community 137 - "limits.test.ts"

Cohesion: 0.29
Nodes (5): LaunchRuntime, opened, runtimeWithBudget(), samplePath, SPEND_CAPS

### Community 138 - "lint"

Cohesion: 0.20
Nodes (11): Prettier owns syntax, not prose, Lint workflow (formatting), Formatting job, .husky/pre-commit hook, lint-staged, lint, printWidth, $schema (+3 more)

### Community 139 - "gcs-lifecycle-workflow.test.ts"

Cohesion: 0.50
Nodes (3): WorkflowDefinition, WorkflowJob, WorkflowStep

### Community 143 - "Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle)"

Cohesion: 0.29
Nodes (9): FR-1: accept one JPEG/PNG image up to 20 MB and 6000 px, FR-3: reject invalid input with a specific reason, FR-4: three worked example instructions that fill the box on click, FR-5: one sample image usable without uploading, Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle), API error shape { code, message }, Upload form (picker and drop, inline rejections, three example instructions, bundled sample photograph), EXIF orientation-aware expected dimensions (+1 more)

### Community 144 - "scrub.ts"

Cohesion: 0.48
Nodes (5): Scrub clip, node(), renderScrub(), seeked(), startScrub()

### Community 145 - "drawer.ts"

Cohesion: 0.57
Nodes (6): DrawerLayer, icon(), LAYERS, node(), renderDrawer(), renderLayer()

### Community 148 - "hero.ts"

Cohesion: 0.60
Nodes (5): enter(), icon(), node(), renderHero(), TITLE_LINES

### Community 151 - "assets.d.ts"

Cohesion: 0.50
Nodes (3): *.jpg, *.mp4, *.png

## Ambiguous Edges - Review These

- `EXAMPLES` → `Cobalt glass bottle` [AMBIGUOUS]
  src/web/assets/sample-photo.png · relation: conceptually_related_to

## Knowledge Gaps

- **656 isolated node(s):** `$schema`, `singleQuote`, `semi`, `trailingComma`, `running` (+651 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1014 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `EXAMPLES` and `Cobalt glass bottle`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `playwright-core` connect `playwright-core` to `startFramePump`, `photopea-editor-session.ts`, `retain-photopea-production-export.ts`, `browserbase-editor-session.ts`, `photopea-action-runner.ts`, `trap-probe.ts`, `agent-run.test.ts`, `PhotopeaBridge`, `PlaywrightPhotopeaTransport`, `photopea-document-exporter.test.ts`, `createLaunchRuntime`, `photopea-page-session.ts`, `editor/index.ts`, `harness.ts`, `package.json`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `LayerInfo` connect `LayerInfo` to `app.ts`, `photopea-editor-session.ts`, `photopea-document-exporter.ts`, `FakeEditorSession`, `agent-run.test.ts`, `ExpectedSession`, `photopea-page-session.ts`, `editor/index.ts`, `api.ts`, `harness.ts`, `Contract tests`, `WarmSessionPool`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `RunRegistry` connect `RunRegistry` to `run-registry-close.test.ts`, `run-queue.test.ts`, `run-log.test.ts`, `limits.test.ts`, `RunRouteDependencies`, `createLaunchRuntime`, `run-routes.test.ts`, `LayerInfo`, `harness.ts`, `Contract tests`, `run-routes.ts`, `runtime.ts`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `LayerInfo` (e.g. with `Layers panel: Retouched copy above Original photograph` and `LayerInfo type`) actually correct?**
  _`LayerInfo` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `singleQuote`, `semi` to the rest of the system?**
  _656 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11879432624113476 - nodes in this community are weakly interconnected._
