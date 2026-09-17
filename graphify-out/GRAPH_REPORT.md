# Graph Report - landing-polish (2026-09-18)

## Corpus Check

- 305 files · ~658,163 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 2749 nodes · 5506 edges · 171 communities (141 shown, 30 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 465 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `ad78d1fc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)

- app.ts
- corpus.test.ts
- run-routes.test.ts
- deployed-run.ts
- photopea-editor-session.ts
- ADR-0003: Export a parser-backed Photopea snapshot
- editor/index.ts
- loop.ts
- browserbase-editor-session.ts
- PhotopeaMessage
- test-server.ts
- photopea-action-runner.ts
- artifact-store.ts
- trap-probe.ts
- Four run limits (step cap, spend cap, free runs, daily ceiling)
- live-frames.browser.test.ts
- PhotopeaBridge
- computer tool (GA)
- meter-store.ts
- responses-model-steering.test.ts
- agent/contract.ts
- harness.ts
- Launch acceptance checklist (evening of September 17)
- api.ts
- run-reliability.ts
- live-steer.ts
- helper.ts
- FR-20: apply a typed mid-run correction without discarding completed work
- SteerLedger
- WarmSessionPool
- run.ts
- RunRoutes
- responses-model.ts
- Landing sections
- RunRegistry
- startFramePump
- glass.ts
- loop.test.ts
- Hosted Chrome session over CDP
- run-log.test.ts
- landing/index.ts
- image-upload.ts
- photopea-document-loader.test.ts
- state.ts
- Conventional Commits
- Swap Test
- EditorSession
- agent-run.test.ts
- ResponsesModel
- Landing polish
- DESIGN.md
- state.test.ts
- ComputerAction
- ModelTurn
- Landing polish implementation plan
- run-registry.test.ts
- Layered PSD output (the wedge)
- Sample product photograph (sample-photo.png)
- compilerOptions
- Layerhand README
- run-memory/measure.ts
- package.json
- config.ts
- Ten-image reliability suite design
- page-routes.ts
- Layered PSD export implementation plan
- dispatch
- bun (package manager and script runner)
- devDependencies
- photopea-document-exporter.ts
- Agent instructions
- Photopea round-trip
- Launch day runbook
- Ten-image reliability suite implementation plan
- LandingContext
- run-routes.ts
- responses-model.test.ts
- Canvas UI
- scripts
- Driving mechanism
- Native steering
- photopea-document-exporter.test.ts
- Jakub Krehel's interface skills
- application.ts
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
- visitor-identity.ts
- Hugeicons
- Iconsax
- Landing video pipeline
- Isocons
- Its Hover
- server/index.ts
- runtime.ts
- SqlMeterStore
- RateLimiter
- RunApi
- Product Hunt listing
- run-registry-close.test.ts
- switcher.ts
- run-registry.ts
- Run memory
- audit.test.ts
- fake-editor-session.test.ts
- lint
- gcs-lifecycle-workflow.test.ts
- replay.browser.test.ts
- retry.ts
- application.browser.test.ts
- Upload form (picker and drop, inline rejections, three example instructions, bundled sample photograph)
- playback.browser.test.ts
- drawer.ts
- workspace-screenshots.ts
- steps.ts
- hero.ts
- RecordingBridge
- stack.browser.test.ts
- assets.d.ts
- workbench.browser.test.ts
- faq.ts
- footer.browser.test.ts
- render-og-image.ts
- chrome.browser.test.ts
- faq.browser.test.ts
- hero.browser.test.ts
- #app main mount point (aria-live polite, aria-busy)
- footer.ts
- protocol.test.ts
- stack.browser.test.ts
- faq.ts
- footer.browser.test.ts
- drawer.browser.test.ts
- surfaces.browser.test.ts
- chrome.browser.test.ts
- faq.browser.test.ts
- install.test.ts

## God Nodes (most connected - your core abstractions)

1. `RunRegistry` - 40 edges
2. `LayerInfo` - 37 edges
3. `createLaunchRuntime()` - 33 edges
4. `EditorSession` - 31 edges
5. `PhotopeaMessage` - 30 edges
6. `ManagedRun` - 29 edges
7. `ComputerAction` - 28 edges
8. `ResponsesModel` - 27 edges
9. `RunEvent` - 25 edges
10. `SteerLedger` - 25 edges

## Surprising Connections (you probably didn't know these)

- `Atomic free admission with microdollar spend reservations` --conceptually_related_to--> `FREE_LIMIT` [INFERRED]
  docs/references/launch-application-design.md → src/server/meter-store.ts
- `Prettier owns syntax, not prose` --references--> `printWidth` [INFERRED]
  docs/agents/rules.md → .prettierrc.json
- `Bun full-stack HTML import (src/server/index.ts serves src/web/index.html)` --conceptually_related_to--> `build` [INFERRED]
  docs/references/launch-application-design.md → package.json
- `Idempotent waitlist endpoint and CSV export (bun run waitlist:export)` --references--> `waitlist:export` [EXTRACTED]
  docs/references/launch-application-design.md → package.json
- `Prettier owns syntax, not prose` --references--> `lint-staged` [EXTRACTED]
  docs/agents/rules.md → package.json

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

## Communities (171 total, 30 thin omitted)

### Community 0 - "app.ts"

Cohesion: 0.06
Nodes (82): Single-screen core flow, Accessibility baseline (keyboard file picker, visible focus, aria-live status, reduced motion), Five-state pure client reducer (landing, input, running, result, error), SSE sequence-id replay and sessionStorage reconnect, describeStrandedCorrections(), joinNumbers(), strandedCorrectionNumbers(), actionText() (+74 more)

### Community 1 - "corpus.test.ts"

Cohesion: 0.14
Nodes (12): failedResponseStatus(), hasToolCall(), HeaderedWebSocket, isObject(), Json, openResponsesSocket(), REPORTED, ResponsesSocket (+4 more)

### Community 2 - "run-routes.test.ts"

Cohesion: 0.06
Nodes (30): ApiError, imageContentType(), LayerhandClient, LayerhandClientOptions, LayerInfo, RunResult, RunSnapshot, RunStatus (+22 more)

### Community 3 - "deployed-run.ts"

Cohesion: 0.10
Nodes (28): acceptanceOutcome(), apiUrl(), cookieFrom(), dataPng(), DeployedRunDependencies, DeployedRunEvidence, DeployedRunOptions, DeployedRunSummary (+20 more)

### Community 4 - "photopea-editor-session.ts"

Cohesion: 0.07
Nodes (10): PhotopeaActionRunner, PhotopeaExportSnapshot, createPhotopeaEditorSession(), PhotopeaEditorSession, PhotopeaEditorSessionDependencies, PhotopeaSessionWork, createPlaywrightAuxiliaryMouse(), closeWithWork() (+2 more)

### Community 5 - "ADR-0003: Export a parser-backed Photopea snapshot"

Cohesion: 0.05
Nodes (42): ADR-0001: Define a provider-neutral editor session, Alternatives considered, Consequences, Context, Decision, Expose Photopea or Playwright directly, Let the agent loop own browser interaction, References (+34 more)

### Community 6 - "editor/index.ts"

Cohesion: 0.10
Nodes (35): ADJUSTMENT_DEFAULT_NAMES, ADJUSTMENT_LABELS, assertLayerNames(), buildLayerRenamePlan(), DEFAULT_ADJUSTMENT_NAMES, fallbackName(), firstFreeName(), flattenLayers() (+27 more)

### Community 7 - "loop.ts"

Cohesion: 0.14
Nodes (14): AgentLoopDependencies, appliedNatively(), cut(), graphemes, PublishedKind, QueuedCorrection, runAgent(), ModelUnavailableError (+6 more)

### Community 8 - "browserbase-editor-session.ts"

Cohesion: 0.07
Nodes (25): Spike B2: Browserbase signup and cold-start measurement, CreatePhotopeaEditorSessionOptions, BrowserbaseLiveView, BrowserbaseSession, browserbaseEditorSession, BrowserbaseEditorSessionOptions, BrowserbaseSessions, closedError() (+17 more)

### Community 9 - "PhotopeaMessage"

Cohesion: 0.14
Nodes (17): serve(), fakeRun(), SessionState, artifactPublisher(), createApplication(), ArtifactStore, createDatabase(), databaseReady() (+9 more)

### Community 10 - "test-server.ts"

Cohesion: 0.20
Nodes (10): VIEWPORTS, VIEWPORTS, VIEWPORTS, CARD_TITLES, LandingPageOptions, openLanding(), transformsOf(), VIEWPORTS (+2 more)

### Community 11 - "photopea-action-runner.ts"

Cohesion: 0.09
Nodes (14): AuxiliaryButton, AuxiliaryMouse, KEY_ALIASES, normalizeKey(), PhotopeaActionPage, PhotopeaActionRunnerOptions, unknownKey(), buttonState() (+6 more)

### Community 12 - "artifact-store.ts"

Cohesion: 0.06
Nodes (20): Single-container continuous deployment, DataArtifactStore, fetch(), LaunchRuntime, packageDir, RuntimeModule, samplePhoto, Snapshot (+12 more)

### Community 13 - "trap-probe.ts"

Cohesion: 0.10
Nodes (27): InputFixtureEvidence, persistInputFixture(), recordOutputPath(), temporaryDirectories, jpeg, OUTPUT_DIRECTORY, PHOTOPEA_URL, SerializedMessage (+19 more)

### Community 14 - "Four run limits (step cap, spend cap, free runs, daily ceiling)"

Cohesion: 0.15
Nodes (31): FR-12: stop at the step cap and return a layered partial result, FR-35: three free runs per visitor, enforced server-side, FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs, FR-37: global daily spend ceiling that stops free-allowance runs, FR-38: paid credit top-ups (P2), NFR-2: no single run exceeds $8 of model spend, NFR-5: no server API key reaches the browser; user keys never logged, persisted or sent beyond OpenAI, NFR-6: uploaded images deleted within twenty-four hours (+23 more)

### Community 15 - "live-frames.browser.test.ts"

Cohesion: 0.08
Nodes (22): HTTP surface aligned with Contract 3 plus /health, Bun SQL metering and waitlist tables (visitor_usage, daily_usage, waitlist_emails), Idempotent waitlist endpoint and CSV export (bun run waitlist:export), applyMigrations(), csvField(), formatWaitlistCsv(), main(), MemoryWaitlistStore (+14 more)

### Community 16 - "PhotopeaBridge"

Cohesion: 0.06
Nodes (14): Reusable Photopea bridge boot, PhotopeaBridge, PhotopeaBridgeOptions, PhotopeaProtocolError, PhotopeaProtocolErrorCode, PhotopeaConfiguration, PhotopeaMessage, PhotopeaTransport (+6 more)

### Community 17 - "computer tool (GA)"

Cohesion: 0.33
Nodes (7): Code-execution tool over a persistent Playwright session, computer tool (GA), ComputerAction type, Orchestrator, OpenAI Responses API (gpt-6-astra), Single long-lived server process (not serverless), Spike A0: code execution or the computer tool

### Community 18 - "meter-store.ts"

Cohesion: 0.09
Nodes (15): ADDRESS_LIMIT, AdmissionDenied, AdmissionRequest, AdmissionResult, BUDGET_RESERVED, DAILY_LIMIT, FREE_LIMIT, MeterReservation (+7 more)

### Community 19 - "responses-model-steering.test.ts"

Cohesion: 0.08
Nodes (19): ResponsesModelOptions, CLICK, Connection, created(), Inbox, Json, observe(), rateLimitedEvent (+11 more)

### Community 20 - "agent/contract.ts"

Cohesion: 0.10
Nodes (21): ManagedRun server adapter (cache metrics, stop reason, releaseSecrets), RunEvent, RunHandle, RunRequest, RunResult, collect(), endOf(), EventOf (+13 more)

### Community 21 - "harness.ts"

Cohesion: 0.09
Nodes (24): KEY_NAMES, PNG_SIGNATURE, PSD_SIGNATURE, PhotopeaEnvironment, PhotopeaEnvironmentParameters, LayerhandWindow, PhotopeaPageMessage, PhotopeaQueueHead (+16 more)

### Community 22 - "Launch acceptance checklist (evening of September 17)"

Cohesion: 0.16
Nodes (24): leonxlnx/taste-skill skill collection, FR-30: public landing page with the differentiator and a silent demo loop, FR-31: email capture live and collecting before launch day, FR-32: thirty-second silent demo recording usable on Product Hunt, Launch acceptance checklist (evening of September 17), Launch schedule (September 12-18, launch Friday 12:01am PT), NFR-1: reliability, eight of ten test runs complete unattended with a valid layered file, Risk: reliability of long GUI control (+16 more)

### Community 23 - "api.ts"

Cohesion: 0.33
Nodes (20): boolean(), decodeRunEvent(), decodeRunSnapshot(), eventId(), EventSourceFactory, Fetch, integer(), invalidResponse() (+12 more)

### Community 24 - "run-reliability.ts"

Cohesion: 0.15
Nodes (9): FR-11: progress as step count against the cap with plain-words current action, FR-15: show the running session cost in credits, NFR-7: page works at 1280 px and above; mobile out of scope, Bun full-stack HTML import (src/server/index.ts serves src/web/index.html), Desktop workbench layout (1280 px minimum, desktop-required message below), #desktop-required notice (workbench needs a desktop at least 1280 pixels wide), index.html (Layerhand single-page shell), cssFile (+1 more)

### Community 25 - "live-steer.ts"

Cohesion: 0.06
Nodes (30): at(), browserbase, ceiling, client, correction, cost, events, imagePath (+22 more)

### Community 26 - "helper.ts"

Cohesion: 0.07
Nodes (25): api, codeLog, host, [imagePath, outputArgument, portArgument], output, port, runner, session (+17 more)

### Community 27 - "FR-20: apply a typed mid-run correction without discarding completed work"

Cohesion: 0.17
Nodes (23): FR-10: live view of the editor (at least one frame per 2 s, at most 3 s behind), FR-13: cancel at any point and keep the partial result, FR-14: survive a page reload by resuming the live view, FR-20: apply a typed mid-run correction without discarding completed work, FR-21: acknowledge a correction visibly within three seconds, FR-22: show accepted corrections in a visible list, FR-23: correction that undoes work already done (P2), Read-only sandboxed live-view iframe (pointer-events none, tabindex -1) (+15 more)

### Community 28 - "SteerLedger"

Cohesion: 0.08
Nodes (9): connected(), stubSocket(), Entry, Settlement, SteerEntry, SteerLedger, SteerState, drain() (+1 more)

### Community 29 - "WarmSessionPool"

Cohesion: 0.13
Nodes (9): claimed(), Entry, imageDigest(), WarmEditorSession, WarmSessionPool, WarmSessionPoolOptions, IMAGE, LAYERS (+1 more)

### Community 30 - "run.ts"

Cohesion: 0.09
Nodes (23): capCredits, codeLines, codex, decoder, estimateCredits(), events, exported, findSessionLog() (+15 more)

### Community 31 - "RunRoutes"

Cohesion: 0.31
Nodes (7): apiError(), boundedFormData(), boundedJson(), json(), rateLimitResponse(), registryError(), RunRoutes

### Community 32 - "responses-model.ts"

Cohesion: 0.10
Nodes (24): BUTTONS, CallUnanswered, COMMON_PROMPT, correctionText(), describeCodeResult(), Json, keys(), ModelTransport (+16 more)

### Community 33 - "Landing sections"

Cohesion: 0.07
Nodes (28): Drawer, Drawer content, Drawer copy, Drawer DOM outline, Drawer done looks like, Footer copy, Glass, Glass copy (+20 more)

### Community 34 - "RunRegistry"

Cohesion: 0.15
Nodes (6): measure(), RunRegistry background event pump with sixty-minute terminal retention, copyResult(), copySnapshot(), isLive(), RunRegistry

### Community 35 - "startFramePump"

Cohesion: 0.14
Nodes (8): FramePump, FramePumpOptions, startFramePump(), pumpFor(), ManualClock, numbered(), settle(), start()

### Community 36 - "glass.ts"

Cohesion: 0.17
Nodes (14): createGlassObject(), FACTS, flatArt(), FormerDef, GLASS_DEFAULTS, GlassModules, GlassObjectElements, GlassObjectInstance (+6 more)

### Community 37 - "loop.test.ts"

Cohesion: 0.09
Nodes (11): CLICK, DONE, EDITABLE_LAYERS, editableFixture(), fixture(), RECORDED_LAYERS, request, RETOUCH (+3 more)

### Community 38 - "Hosted Chrome session over CDP"

Cohesion: 0.23
Nodes (15): FR-2: free-text instruction of up to 500 characters, FR-4: three worked example instructions that fill the box on click, NFR-4: twenty simultaneous runs without queueing, then a queue with a stated position, Browser provider shortlist (Browserbase, Anchor, Hyperbrowser, Steel), Browserbase, Export-then-destroy session disposal, Fifteen-minute run ceiling, Hosted Chrome session over CDP (+7 more)

### Community 39 - "run-log.test.ts"

Cohesion: 0.19
Nodes (11): RunStopReason, RunFailureCode, createRunLogger(), failureReason(), redact(), RunLoggerOptions, runLogLine, RunLogStore (+3 more)

### Community 40 - "landing/index.ts"

Cohesion: 0.11
Nodes (30): parseOutputRoot(), parsePositiveDecimal(), parsePositiveInteger(), readReliabilityCommandConfig(), ReliabilityCommandConfig, ReliabilityCommandDependencies, REQUIRED_ENV_VARS, runReliabilityCommand() (+22 more)

### Community 41 - "image-upload.ts"

Cohesion: 0.05
Nodes (56): FR-1: accept one JPEG/PNG image up to 20 MB and 6000 px, FR-5: one sample image usable without uploading, Target users: e-commerce photo teams, real-estate photographers, freelance retouchers, Upload form (picker and drop, inline rejections, three example instructions, bundled sample photograph), EXIF orientation-aware expected dimensions, Upload validation before session creation, detectFormat(), ERROR_MESSAGES (+48 more)

### Community 42 - "photopea-document-loader.test.ts"

Cohesion: 0.26
Nodes (12): FR-16: per-user history of past runs (P2, deferred by the non-goals), Requirement-level exclusions (no accounts, no in-app editing, no undo, PSD-only output, no internationalisation), Photopea licence question (answered: automated and commercial use permitted), Product non-goals (no image generation, no batch/API/integrations, no accounts beyond metering, no mobile, no own editor, no presets), Risk: the scripting escape hatch, Editor adapter, Photopea, Photopea Action Manager stub (stringIDToTypeID lookup table) (+4 more)

### Community 43 - "state.ts"

Cohesion: 0.17
Nodes (14): loadIconFont(), NAV, node(), renderLanding(), renderNav(), startEntranceGate(), node(), renderInstall() (+6 more)

### Community 44 - "Conventional Commits"

Cohesion: 0.21
Nodes (17): Branch naming (<type>/<short-description>), Breaking change marker (! and BREAKING CHANGE footer), Conventional commit types (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test), Conventional Commits, gh pr create --fill-first, Conventional issue and pull request titles, Bug report issue form, Issue template chooser config (blank issues disabled) (+9 more)

### Community 45 - "Swap Test"

Cohesion: 0.19
Nodes (20): Three product properties: editable output, visible work, steerable work, Keyboard-only accessibility agent, Astra Hackathon, Async tool calling (primitive), Computer use (primitive), Computer use x mid-turn steering (Round 9), Whole-corpus contradiction finder (runner-up), Hosted-browser computer use (Round 2) (+12 more)

### Community 46 - "EditorSession"

Cohesion: 0.07
Nodes (28): FR-28: flattened PNG preview alongside the PSD, EditorSession interface (Contract 1), FakeEditorSession, ORIGINAL, cloneAction(), copyBytes(), createRecordedFakeEditorSession(), EditorRecording (+20 more)

### Community 47 - "agent-run.test.ts"

Cohesion: 0.10
Nodes (11): ScriptedModel, agentRuntime(), live(), next(), run(), runtimes, runTokens, samplePath (+3 more)

### Community 48 - "ResponsesModel"

Cohesion: 0.19
Nodes (6): errorCode(), isObject(), narrationOf(), ResponsesModel, safeCode(), usageOf()

### Community 49 - "Landing polish"

Cohesion: 0.11
Nodes (11): Compact base64 upload transfer, bridge, fixturePath, samplePath, server, session, viewport, decodePhotopeaWireMessage() (+3 more)

### Community 50 - "DESIGN.md"

Cohesion: 0.06
Nodes (33): Acceptance, Back button, Back to top, Colour, Common questions, Decisions, Design: Layerhand, Do and do not (+25 more)

### Community 51 - "state.test.ts"

Cohesion: 0.24
Nodes (3): TokenUsage, ASTRA_PRICING, Spend

### Community 52 - "ComputerAction"

Cohesion: 0.14
Nodes (6): playwrightKey(), isScriptedTyping(), CLICK, typed(), ComputerAction, ExpectedSession

### Community 53 - "ModelTurn"

Cohesion: 0.07
Nodes (29): @modelcontextprotocol/sdk, bin, layerhand-mcp, description, devDependencies, @modelcontextprotocol/sdk, @types/bun, typescript (+21 more)

### Community 54 - "Landing polish implementation plan"

Cohesion: 0.20
Nodes (4): ReliabilityPublish, passingPsdUrl, sampleImageUrl, ScriptedRunOptions

### Community 55 - "run-registry.test.ts"

Cohesion: 0.20
Nodes (13): cookieFrom(), filename, image, imageBlob(), imagePath, Measurement, output, summary (+5 more)

### Community 56 - "Layered PSD output (the wedge)"

Cohesion: 0.10
Nodes (31): FR-25: PSD opens without error in Photoshop, Affinity Photo and GIMP, FR-26: every layer named in human words, FR-27: masks and adjustment layers remain editable, FR-29: list the layers on the page after the run, FR-33: Product Hunt assets (tagline, description, gallery images, first maker comment), Adobe Photoshop API v2, autoRetouch, BRIA AI (+23 more)

### Community 58 - "compilerOptions"

Cohesion: 0.10
Nodes (19): DOM, scripts/**/*.ts, compilerOptions, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 59 - "Layerhand README"

Cohesion: 0.08
Nodes (23): Agent bundle, `cancel_run`, Client header, Code layout, Configuration, `get_result`, Handles, Not in this change (+15 more)

### Community 60 - "run-memory/measure.ts"

Cohesion: 0.23
Nodes (6): CODES, describeFailure(), FailureRecorder, Operation, redactDiagnostic(), watchedSession()

### Community 61 - "package.json"

Cohesion: 0.20
Nodes (8): ag-psd, dependencies, ag-psd, playwright-core, three, lint-staged, playwright-core, three

### Community 62 - "config.ts"

Cohesion: 0.09
Nodes (35): liveAgentRun(), managedAgentRun(), Application, ConfigurationError, DEFAULT_RUN_LIMITS, Environment, EnvironmentName, parsePositiveDecimal() (+27 more)

### Community 63 - "Ten-image reliability suite design"

Cohesion: 0.17
Nodes (11): Acceptance mapping, Corpus contract, Execution flow, Expected file layout, Goals, Nightly workflow and spending guard, Non-goals, Results and visibility (+3 more)

### Community 64 - "page-routes.ts"

Cohesion: 0.07
Nodes (32): description, name, owner, name, plugins, $schema, BROTLI_OPTIONS, bundledFiles() (+24 more)

### Community 65 - "Layered PSD export implementation plan"

Cohesion: 0.18
Nodes (10): Global constraints, Issue #17 parallel boundary, Layered PSD export implementation plan, Task 1: Migrate the recursive layer contract, Task 2: Parse exported PSD metadata, Task 3: Enforce names and completed-tree policy, Task 4: Build the correlated Photopea export transaction, Task 5: Translate computer actions (+2 more)

### Community 67 - "bun (package manager and script runner)"

Cohesion: 0.24
Nodes (11): Run bun run graph after modifying code, graphify CLI and knowledge graph (graphify-out/), Query the graph before reading source, Refresh doc and concept nodes with /graphify --update, RTK condensed command output, rtk proxy fallback, bun (package manager and script runner), graphify-labs/graphify skill collection (+3 more)

### Community 68 - "devDependencies"

Cohesion: 0.10
Nodes (21): @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, devDependencies, @commitlint/cli, @commitlint/config-conventional, husky (+13 more)

### Community 69 - "photopea-document-exporter.ts"

Cohesion: 0.11
Nodes (15): acceptance, browserbase, ceiling, client, cost, events, imagePath, last (+7 more)

### Community 70 - "Agent instructions"

Cohesion: 0.50
Nodes (4): AGENTS.md (agent instruction entry point), AGENTS.md as the single agent entry point, .agents/skills/ skills directory, astra-challenge skill

### Community 71 - "Photopea round-trip"

Cohesion: 0.22
Nodes (8): Digests, Files, Limits, Photopea round-trip, Photoshop verification, Result, Running it, Timing definitions

### Community 72 - "Launch day runbook"

Cohesion: 0.18
Nodes (10): Changing a limit in a hurry, Launch day runbook, Request limits, Rolling back to the previous revision, Rotating the server key, See also, The clock, The freeze, and the no-deploy rule (+2 more)

### Community 73 - "Ten-image reliability suite implementation plan"

Cohesion: 0.22
Nodes (8): Global constraints, Task 1: Add and validate the representative corpus, Task 2: Run cases sequentially and validate their PSDs, Task 3: Persist and format inspectable reports, Task 4: Add the paid production command, Task 5: Publish the guarded nightly result, Task 6: Run final verification and prepare review, Ten-image reliability suite implementation plan

### Community 74 - "LandingContext"

Cohesion: 0.11
Nodes (17): compilerOptions, lib, module, moduleDetection, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck (+9 more)

### Community 75 - "run-routes.ts"

Cohesion: 0.14
Nodes (6): FR-3: reject invalid input with a specific reason, Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle), API error shape { code, message }, MeterStore, createEndpointLimiter(), RunRouteDependencies

### Community 76 - "responses-model.test.ts"

Cohesion: 0.14
Nodes (4): ResponsesApiError, SCREENSHOT, Sent, USAGE

### Community 77 - "Canvas UI"

Cohesion: 0.15
Nodes (13): Browser support, Canvas UI, Components, Cursor and click effects, How an effect is built, How it works, Installing, Peel (+5 more)

### Community 78 - "scripts"

Cohesion: 0.16
Nodes (14): Bun 1.4.2 runtime pin (lockfile version 2, frozen installs), Two-stage non-root container pinned to Bun 1.4.2, scripts, build, graph, lint:fix, reliability, start (+6 more)

### Community 79 - "Driving mechanism"

Cohesion: 0.29
Nodes (6): Driving mechanism, Findings from building it, Limits, Result, Running it, What a run does

### Community 80 - "Native steering"

Cohesion: 0.29
Nodes (6): Completed work survived the correction, Limits, Native steering, Result, Running it, The correction, and what the socket saw

### Community 81 - "photopea-document-exporter.test.ts"

Cohesion: 0.13
Nodes (13): adjustmentKinds, LiveLayer, MemoryBridge, namedPsd(), psd(), locateMaskThumbnail(), viewport, waitForMaskThumbnail() (+5 more)

### Community 82 - "Jakub Krehel's interface skills"

Cohesion: 0.17
Nodes (12): Colour, How the skills are built, Jakub Krehel's interface skills, Layout, Motion and accessibility, See also, The collection, The user-invoked skills (+4 more)

### Community 83 - "application.ts"

Cohesion: 0.10
Nodes (24): NFR-3: a run starts within five seconds of the button, Browserbase probe command (creation-to-ready latency), Document-count snapshot before file delivery, Per-bridge FIFO for complete document opens, Filename verification through Document.source, Unique app.echoToOE sentinel per scripted call, Issue #15 installed-Chrome upload measurement, Photopea postMessage protocol (+16 more)

### Community 84 - "Stream-per-directory repository layout"

Cohesion: 0.50
Nodes (5): Surgical Changes, Atomic commits, Rebase merge, never squash, Server-side repository setup (gh api merge settings), Single feat/launch-application branch, squash-merged by the coordinator

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

### Community 120 - "visitor-identity.ts"

Cohesion: 0.29
Nodes (10): Signed visitor cookie and HMAC visitor key (TRUST_PROXY_HOPS), clientAddress(), establishVisitorIdentity(), hmac(), readCookie(), signVisitorId(), validSignedId(), VisitorIdentity (+2 more)

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

### Community 126 - "server/index.ts"

Cohesion: 0.21
Nodes (8): ScriptedModel, AgentModel, ModelTurn, Observation, CLICK, SCRIPT, ScriptedModelOptions, wait()

### Community 127 - "runtime.ts"

Cohesion: 0.15
Nodes (12): author, name, url, interface, description, extensions, com.openai, category (+4 more)

### Community 128 - "SqlMeterStore"

Cohesion: 0.18
Nodes (7): RunEventEnvelope, frame(), framedRun(), registerRunHoldingUpload(), RESULT, scriptedRun(), STARTED

### Community 129 - "RateLimiter"

Cohesion: 0.28
Nodes (3): RateLimiter, RateLimiterOptions, EndpointLimiter

### Community 130 - "RunApi"

Cohesion: 0.31
Nodes (3): accepted(), responseJson(), RunApi

### Community 131 - "Product Hunt listing"

Cohesion: 0.25
Nodes (7): Description, First maker comment, Gallery, Links, Product Hunt listing, Tagline, Topics

### Community 132 - "run-registry-close.test.ts"

Cohesion: 0.15
Nodes (5): RunRegistryError, ABANDONED, CANCELLED, samplePath, STARTED

### Community 133 - "switcher.ts"

Cohesion: 0.10
Nodes (20): selectBytes(), selectPngExport(), selectPsdExport(), validPng(), ImageFormat, LayerRename, expectedTree(), noDocumentError() (+12 more)

### Community 134 - "run-registry.ts"

Cohesion: 0.09
Nodes (21): NFR-8: per-run observability (step count, token spend, outcome, failure reason), RunLogRecord one-line completion log, Per-run structured log line, ManagedRun, ManagedRunMetrics, RunFailure, EnqueueRun, initialSnapshot() (+13 more)

### Community 135 - "Run memory"

Cohesion: 0.40
Nodes (4): Limits, Result, Run memory, Running it

### Community 136 - "audit.test.ts"

Cohesion: 0.60
Nodes (4): collectLandingFiles(), cssFiles(), FileText, tsFiles()

### Community 137 - "fake-editor-session.test.ts"

Cohesion: 0.15
Nodes (13): Environment configuration names (DATABASE_URL, SESSION_SECRET, FREE_DAILY_BUDGET_USD, S3_*, BROWSERBASE_API_KEY, OPENAI_API_KEY, TRUST_PROXY_HOPS), /health readiness endpoint (process and database readiness), Security and error-handling rules (textContent not innerHTML, restrictive CSP, egress policy, export before release), dev, Local development (bun install --frozen-lockfile, bun run dev, localhost:3000, /health), APPLICATION_CSP, ApplicationDependencies, BASE_SECURITY_HEADERS (+5 more)

### Community 138 - "lint"

Cohesion: 0.22
Nodes (10): Prettier owns syntax, not prose, Lint workflow (formatting), Formatting job, .husky/pre-commit hook, lint, printWidth, $schema, semi (+2 more)

### Community 139 - "gcs-lifecycle-workflow.test.ts"

Cohesion: 0.50
Nodes (3): WorkflowDefinition, WorkflowJob, WorkflowStep

### Community 140 - "replay.browser.test.ts"

Cohesion: 0.23
Nodes (13): countUp(), DrawerLayer, DrawerStat, icon(), LAYERS, LOG_AFTER, LOG_BEFORE, logStep() (+5 more)

### Community 141 - "retry.ts"

Cohesion: 0.33
Nodes (6): fromAllowedOrigin(), QUEUE_FULL, RequestTooLargeError, createRunToken(), hmac(), verifyRunToken()

### Community 142 - "application.browser.test.ts"

Cohesion: 0.14
Nodes (13): Acceptance, Landing polish, Motion that shows the product working, Pointer response, Rules every change keeps, Scope, Scroll reveals, Self-playing demos (+5 more)

### Community 143 - "Upload form (picker and drop, inline rejections, three example instructions, bundled sample photograph)"

Cohesion: 0.28
Nodes (8): follow(), Followed, frameBytes, measure(), megabytes(), runs, stepMs, { values }

### Community 144 - "playback.browser.test.ts"

Cohesion: 0.25
Nodes (7): Configuration, Cost, Install in Claude Code, Install in Codex, layerhand-mcp, Privacy, Tools

### Community 145 - "drawer.ts"

Cohesion: 0.33
Nodes (5): Documentation drift implementation plan, Global constraints, Task 1: Correct the operating documentation, Task 2: Repair the issue links, Task 3: Publish the reviewed change

### Community 146 - "workspace-screenshots.ts"

Cohesion: 0.15
Nodes (12): Dispatch, Global constraints, Landing polish implementation plan, Task 1: Workbench input view, Task 2: Stacked sections, Task 3: Hero replay, Task 4: Run log playback and switcher demo, Task 5: Questions section (+4 more)

### Community 147 - "steps.ts"

Cohesion: 0.35
Nodes (12): enter(), FACTS, icon(), mountReplay(), node(), renderHero(), renderTicker(), renderWindow() (+4 more)

### Community 149 - "RecordingBridge"

Cohesion: 0.33
Nodes (9): HINTS, icon(), LayerKey, LAYERS, Mode, node(), renderSwitcher(), SwitcherLayer (+1 more)

### Community 150 - "stack.browser.test.ts"

Cohesion: 0.53
Nodes (5): capture(), chooseSample(), shot(), startRun(), VIEWPORTS

### Community 151 - "assets.d.ts"

Cohesion: 0.40
Nodes (4): Before you start, Rules, The loop, When to use it

### Community 152 - "workbench.browser.test.ts"

Cohesion: 0.50
Nodes (3): OPENAI_API_KEY, node, layerhand

### Community 153 - "faq.ts"

Cohesion: 0.50
Nodes (3): npx, layerhand-mcp, layerhand

### Community 154 - "footer.browser.test.ts"

Cohesion: 0.50
Nodes (3): OUTPUTS, ROOT, server

### Community 156 - "render-og-image.ts"

Cohesion: 0.25
Nodes (4): DeployedRunError, RunSnapshot, RunApiError, nestedLayers

### Community 157 - "chrome.browser.test.ts"

Cohesion: 0.28
Nodes (4): LandingContext, icon(), node(), renderWaitlist()

### Community 158 - "faq.browser.test.ts"

Cohesion: 0.25
Nodes (5): INSTRUCTION, LAYERS, stepNumber(), stepText(), VIEWPORT

### Community 159 - "hero.browser.test.ts"

Cohesion: 0.33
Nodes (4): name(), rgba(), rgbaOf(), SCHEMES

### Community 160 - "#app main mount point (aria-live polite, aria-busy)"

Cohesion: 0.29
Nodes (6): gotoLanding(), LONG_INSTRUCTION, openInput(), REAL_FRAME_URL, samplePath, ViewportBox

### Community 161 - "footer.ts"

Cohesion: 0.29
Nodes (3): STAT_VALUES, STEP_SENTENCES, VIEWPORT

### Community 162 - "protocol.test.ts"

Cohesion: 0.53
Nodes (5): node(), number(), renderSteps(), Step, STEPS

### Community 163 - "stack.browser.test.ts"

Cohesion: 0.40
Nodes (3): DESKTOP, frames(), scrollSectionTopTo()

### Community 164 - "faq.ts"

Cohesion: 0.50
Nodes (4): node(), QuestionItem, QUESTIONS, renderFaq()

### Community 165 - "footer.browser.test.ts"

Cohesion: 0.60
Nodes (4): expectFold(), footerView(), scrollAndSettle(), VIEWPORTS

### Community 166 - "drawer.browser.test.ts"

Cohesion: 0.40
Nodes (3): LAYER_GLYPHS, LAYER_NAMES, VIEWPORTS

## Ambiguous Edges - Review These

- `EXAMPLES` → `Cobalt glass bottle` [AMBIGUOUS]
  src/web/assets/sample-photo.png · relation: conceptually_related_to

## Knowledge Gaps

- **799 isolated node(s):** `$schema`, `singleQuote`, `semi`, `trailingComma`, `running` (+794 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `EXAMPLES` and `Cobalt glass bottle`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `LayerInfo` connect `editor/index.ts` to `app.ts`, `SqlMeterStore`, `photopea-editor-session.ts`, `switcher.ts`, `PhotopeaMessage`, `EditorSession`, `agent-run.test.ts`, `agent/contract.ts`, `harness.ts`, `ComputerAction`, `api.ts`, `Sample product photograph (sample-photo.png)`, `helper.ts`, `FR-20: apply a typed mid-run correction without discarding completed work`, `render-og-image.ts`, `WarmSessionPool`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `openResponsesSocket()` connect `corpus.test.ts` to `responses-model.ts`, `run-routes.test.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `fail()` connect `run-routes.test.ts` to `corpus.test.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `LayerInfo` (e.g. with `Layers panel: Retouched copy above Original photograph` and `LayerInfo type`) actually correct?**
  _`LayerInfo` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `singleQuote`, `semi` to the rest of the system?**
  _799 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05942571785268414 - nodes in this community are weakly interconnected._
