# Graph Report - agent-bundle (2026-09-17)

## Corpus Check

- 288 files · ~634,028 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 2612 nodes · 5289 edges · 156 communities (131 shown, 25 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 458 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `8acc33ca`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)

- app.ts
- corpus.ts
- tools.ts
- deployed-run.ts
- photopea-editor-session.ts
- ADR-0003: Export a parser-backed Photopea snapshot
- editor/index.ts
- agent-run.ts
- browserbase-editor-session.ts
- PhotopeaMessage
- test-server.ts
- photopea-action-runner.ts
- ArtifactStore
- trap-probe.ts
- Four run limits (step cap, spend cap, free runs, daily ceiling)
- live-frames.browser.test.ts
- PhotopeaDocumentLoader
- computer tool (GA)
- meter-store.ts
- responses-model-steering.test.ts
- run-routes.test.ts
- session.ts
- Launch acceptance checklist (evening of September 17)
- api.ts
- suite.test.ts
- live-steer.ts
- helper.ts
- Contract tests
- SteerLedger
- WarmSessionPool
- run.ts
- RunRoutes
- responses-model.ts
- Landing sections
- RunRegistry
- startFramePump
- landing/index.ts
- loop.test.ts
- Photopea
- run-log.test.ts
- run-reliability.ts
- image-upload.ts
- photopea-document-loader.test.ts
- state.ts
- Conventional Commits
- Swap Test
- Recorded Photopea editor frame (photopea-frame.png, 1440x900)
- agent-run.test.ts
- ResponsesModel
- PlaywrightPhotopeaTransport
- Design: Layerhand
- RunHandle
- ComputerAction
- layerhand-mcp/package.json
- BrowserbaseClient
- warm-editor/measure.ts
- Layered PSD output (the wedge)
- Sample product photograph (sample-photo.png)
- compilerOptions
- Agent bundle
- EditorSession
- package.json
- runtime.ts
- Ten-image reliability suite design
- page-routes.ts
- Layered PSD export implementation plan
- dispatch
- graphify CLI and knowledge graph (graphify-out/)
- devDependencies
- harness.ts
- Agent instructions
- Photopea round-trip
- Launch day runbook
- Ten-image reliability suite implementation plan
- compilerOptions
- RunRouteDependencies
- responses-model.test.ts
- Canvas UI
- scripts
- Driving mechanism
- Native steering
- photopea-document-exporter.test.ts
- Jakub Krehel's interface skills
- report.ts
- Atomic commits
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
- visitor-identity.ts
- Hugeicons
- Iconsax
- Landing video pipeline
- Isocons
- Its Hover
- FakeEditorSession
- plugin.json
- run-registry.test.ts
- RateLimiter
- RunApi
- Product Hunt listing
- run-registry-close.test.ts
- photopea-document-exporter.ts
- run-registry.ts
- Run memory
- audit.test.ts
- application.ts
- lint
- gcs-lifecycle-workflow.test.ts
- make-scrub-clip.sh
- run-routes.ts
- page-routes.test.ts
- run-memory/measure.ts
- layerhand-mcp
- suite.ts
- social-meta.ts
- Stream-per-directory repository layout
- retry.ts
- claude-marketplace.json
- workspace-screenshots.ts
- SKILL.md
- layerhand
- layerhand
- render-og-image.ts

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

- `Prettier owns syntax, not prose` --references--> `printWidth` [INFERRED]
  docs/agents/rules.md → .prettierrc.json
- `Local hook setup (bun install, then uv tool install graphifyy)` --references--> `prepare` [INFERRED]
  docs/references/git-workflow.md → package.json
- `Idempotent waitlist endpoint and CSV export (bun run waitlist:export)` --references--> `waitlist:export` [EXTRACTED]
  docs/references/launch-application-design.md → package.json
- `Prettier owns syntax, not prose` --references--> `lint-staged` [EXTRACTED]
  docs/agents/rules.md → package.json
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

## Communities (156 total, 25 thin omitted)

### Community 0 - "app.ts"

Cohesion: 0.11
Nodes (46): Accessibility baseline (keyboard file picker, visible focus, aria-live status, reduced motion), actionText(), announceNewCorrections(), api, applicationRoot, brandHeader(), button(), cancelText() (+38 more)

### Community 1 - "corpus.ts"

Cohesion: 0.16
Nodes (15): ReliabilityCommandDependencies, isValidHttpsUrl(), isValidRelativeImagePath(), loadReliabilityCorpus(), parseAndValidateCase(), RawCase, ReliabilityCategory, ReliabilityCorpusError (+7 more)

### Community 2 - "tools.ts"

Cohesion: 0.06
Nodes (30): ApiError, imageContentType(), LayerhandClient, LayerhandClientOptions, LayerInfo, RunResult, RunSnapshot, RunStatus (+22 more)

### Community 3 - "deployed-run.ts"

Cohesion: 0.06
Nodes (45): acceptanceOutcome(), apiUrl(), cookieFrom(), dataPng(), DeployedRunDependencies, DeployedRunError, DeployedRunEvidence, DeployedRunOptions (+37 more)

### Community 4 - "photopea-editor-session.ts"

Cohesion: 0.07
Nodes (8): PhotopeaExportSnapshot, createPhotopeaEditorSession(), PhotopeaEditorSession, PhotopeaSessionWork, createPlaywrightAuxiliaryMouse(), closeWithWork(), documentCalls(), screenshot()

### Community 5 - "ADR-0003: Export a parser-backed Photopea snapshot"

Cohesion: 0.05
Nodes (42): ADR-0001: Define a provider-neutral editor session, Alternatives considered, Consequences, Context, Decision, Expose Photopea or Playwright directly, Let the agent loop own browser interaction, References (+34 more)

### Community 6 - "editor/index.ts"

Cohesion: 0.10
Nodes (36): EditorRecording, ADJUSTMENT_DEFAULT_NAMES, ADJUSTMENT_LABELS, assertLayerNames(), buildLayerRenamePlan(), DEFAULT_ADJUSTMENT_NAMES, fallbackName(), firstFreeName() (+28 more)

### Community 7 - "agent-run.ts"

Cohesion: 0.12
Nodes (17): AgentLoopDependencies, appliedNatively(), cut(), graphemes, PublishedKind, QueuedCorrection, runAgent(), ModelUnavailableError (+9 more)

### Community 8 - "browserbase-editor-session.ts"

Cohesion: 0.09
Nodes (28): serve(), createRecordedFakeEditorSession(), SessionState, CreatePhotopeaEditorSessionOptions, BrowserbaseLiveView, BrowserbaseSession, Fetch, browserbaseEditorSession (+20 more)

### Community 9 - "PhotopeaMessage"

Cohesion: 0.06
Nodes (15): PhotopeaBridge, PhotopeaBridgeOptions, PhotopeaProtocolError, PhotopeaProtocolErrorCode, PhotopeaConfiguration, PhotopeaEnvironment, PhotopeaEnvironmentParameters, PhotopeaMessage (+7 more)

### Community 10 - "test-server.ts"

Cohesion: 0.15
Nodes (16): expectFold(), footerView(), scrollAndSettle(), VIEWPORTS, LAYER_GLYPHS, LAYER_NAMES, VIEWPORTS, VIEWPORTS (+8 more)

### Community 11 - "photopea-action-runner.ts"

Cohesion: 0.08
Nodes (16): AuxiliaryButton, AuxiliaryMouse, KEY_ALIASES, normalizeKey(), PhotopeaActionPage, PhotopeaActionRunner, PhotopeaActionRunnerOptions, unknownKey() (+8 more)

### Community 12 - "ArtifactStore"

Cohesion: 0.05
Nodes (21): Single-container continuous deployment, DataArtifactStore, fetch(), LaunchRuntime, packageDir, RuntimeModule, samplePhoto, Snapshot (+13 more)

### Community 13 - "trap-probe.ts"

Cohesion: 0.10
Nodes (27): InputFixtureEvidence, persistInputFixture(), recordOutputPath(), temporaryDirectories, jpeg, OUTPUT_DIRECTORY, PHOTOPEA_URL, SerializedMessage (+19 more)

### Community 14 - "Four run limits (step cap, spend cap, free runs, daily ceiling)"

Cohesion: 0.12
Nodes (33): FR-12: stop at the step cap and return a layered partial result, FR-35: three free runs per visitor, enforced server-side, FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs, FR-37: global daily spend ceiling that stops free-allowance runs, FR-38: paid credit top-ups (P2), NFR-2: no single run exceeds $8 of model spend, NFR-5: no server API key reaches the browser; user keys never logged, persisted or sent beyond OpenAI, NFR-6: uploaded images deleted within twenty-four hours (+25 more)

### Community 15 - "live-frames.browser.test.ts"

Cohesion: 0.08
Nodes (31): Bun SQL metering and waitlist tables (visitor_usage, daily_usage, waitlist_emails), Idempotent waitlist endpoint and CSV export (bun run waitlist:export), createApplication(), createDatabase(), databaseReady(), usdToMicroUsd(), applyMigrations(), csvField() (+23 more)

### Community 16 - "PhotopeaDocumentLoader"

Cohesion: 0.06
Nodes (29): NFR-3: a run starts within five seconds of the button, Browserbase probe command (creation-to-ready latency), Document-count snapshot before file delivery, Per-bridge FIFO for complete document opens, Filename verification through Document.source, Unique app.echoToOE sentinel per scripted call, Issue #15 installed-Chrome upload measurement, Photopea postMessage protocol (+21 more)

### Community 17 - "computer tool (GA)"

Cohesion: 0.33
Nodes (7): Code-execution tool over a persistent Playwright session, computer tool (GA), ComputerAction type, Orchestrator, OpenAI Responses API (gpt-6-astra), Single long-lived server process (not serverless), Spike A0: code execution or the computer tool

### Community 18 - "meter-store.ts"

Cohesion: 0.13
Nodes (11): ADDRESS_LIMIT, AdmissionDenied, AdmissionRequest, AdmissionResult, assertMicroUsd(), BUDGET_RESERVED, DAILY_LIMIT, MeterReservation (+3 more)

### Community 19 - "responses-model-steering.test.ts"

Cohesion: 0.08
Nodes (19): ResponsesModelOptions, CLICK, Connection, created(), Inbox, Json, observe(), rateLimitedEvent (+11 more)

### Community 20 - "run-routes.test.ts"

Cohesion: 0.10
Nodes (15): ManagedRun server adapter (cache metrics, stop reason, releaseSecrets), RunEvent, RunResult, EventLog, END, frame(), fakeRun(), FakeRunOptions (+7 more)

### Community 21 - "session.ts"

Cohesion: 0.10
Nodes (14): Button, LayerKind, LayerMaskInfo, LayerMaskKind, ActionVariantKeyChecks, Assert, Assertions, ExpectedAction (+6 more)

### Community 22 - "Launch acceptance checklist (evening of September 17)"

Cohesion: 0.16
Nodes (25): leonxlnx/taste-skill skill collection, FR-30: public landing page with the differentiator and a silent demo loop, FR-31: email capture live and collecting before launch day, FR-32: thirty-second silent demo recording usable on Product Hunt, Launch acceptance checklist (evening of September 17), Launch schedule (September 12-18, launch Friday 12:01am PT), NFR-1: reliability, eight of ten test runs complete unattended with a valid layered file, Risk: reliability of long GUI control (+17 more)

### Community 23 - "api.ts"

Cohesion: 0.21
Nodes (22): boolean(), decodeRunEvent(), decodeRunSnapshot(), eventId(), EventSourceFactory, Fetch, integer(), invalidResponse() (+14 more)

### Community 24 - "suite.test.ts"

Cohesion: 0.20
Nodes (4): ReliabilityPublish, passingPsdUrl, sampleImageUrl, ScriptedRunOptions

### Community 25 - "live-steer.ts"

Cohesion: 0.08
Nodes (24): at(), browserbase, ceiling, client, correction, cost, events, imagePath (+16 more)

### Community 26 - "helper.ts"

Cohesion: 0.12
Nodes (12): api, codeLog, host, [imagePath, outputArgument, portArgument], output, port, runner, session (+4 more)

### Community 27 - "Contract tests"

Cohesion: 0.12
Nodes (26): FR-10: live view of the editor (at least one frame per 2 s, at most 3 s behind), FR-11: progress as step count against the cap with plain-words current action, FR-13: cancel at any point and keep the partial result, FR-14: survive a page reload by resuming the live view, FR-15: show the running session cost in credits, FR-29: list the layers on the page after the run, NFR-7: page works at 1280 px and above; mobile out of scope, Single-screen core flow (+18 more)

### Community 28 - "SteerLedger"

Cohesion: 0.06
Nodes (21): failedResponseStatus(), hasToolCall(), HeaderedWebSocket, isObject(), Json, openResponsesSocket(), REPORTED, ResponsesSocket (+13 more)

### Community 29 - "WarmSessionPool"

Cohesion: 0.12
Nodes (10): claimed(), Entry, imageDigest(), WarmEditorSession, WarmSessionPool, WarmSessionPoolOptions, IMAGE, LAYERS (+2 more)

### Community 30 - "run.ts"

Cohesion: 0.09
Nodes (23): capCredits, codeLines, codex, decoder, estimateCredits(), events, exported, findSessionLog() (+15 more)

### Community 31 - "RunRoutes"

Cohesion: 0.31
Nodes (7): apiError(), boundedFormData(), boundedJson(), json(), rateLimitResponse(), registryError(), RunRoutes

### Community 32 - "responses-model.ts"

Cohesion: 0.12
Nodes (20): BUTTONS, CallUnanswered, COMMON_PROMPT, correctionText(), describeCodeResult(), Json, keys(), ModelTransport (+12 more)

### Community 33 - "Landing sections"

Cohesion: 0.06
Nodes (32): Drawer, Drawer content, Drawer copy, Drawer DOM outline, Drawer done looks like, Footer copy, Glass, Glass copy (+24 more)

### Community 34 - "RunRegistry"

Cohesion: 0.13
Nodes (7): measure(), RunRegistry background event pump with sixty-minute terminal retention, ManagedRun, copyResult(), copySnapshot(), isLive(), RunRegistry

### Community 35 - "startFramePump"

Cohesion: 0.12
Nodes (11): FramePump, FramePumpOptions, startFramePump(), Phase, pumpFor(), retouch(), select(), ManualClock (+3 more)

### Community 36 - "landing/index.ts"

Cohesion: 0.07
Nodes (39): DrawerLayer, icon(), LAYERS, node(), renderDrawer(), renderLayer(), createGlassObject(), FACTS (+31 more)

### Community 37 - "loop.test.ts"

Cohesion: 0.06
Nodes (20): CLICK, DONE, EDITABLE_LAYERS, editableFixture(), fixture(), RECORDED_LAYERS, request, RETOUCH (+12 more)

### Community 38 - "Photopea"

Cohesion: 0.12
Nodes (27): FR-16: per-user history of past runs (P2, deferred by the non-goals), FR-2: free-text instruction of up to 500 characters, NFR-4: twenty simultaneous runs without queueing, then a queue with a stated position, Requirement-level exclusions (no accounts, no in-app editing, no undo, PSD-only output, no internationalisation), Product non-goals (no image generation, no batch/API/integrations, no accounts beyond metering, no mobile, no own editor, no presets), Risk: the scripting escape hatch, Required FREE_DAILY_BUDGET_USD (no default daily ceiling), ag-psd fallback (+19 more)

### Community 39 - "run-log.test.ts"

Cohesion: 0.16
Nodes (13): RunFailureCode, createRunLogger(), failureReason(), redact(), RunLoggerOptions, runLogLine, RunLogStore, SqlRunLogStore (+5 more)

### Community 40 - "run-reliability.ts"

Cohesion: 0.18
Nodes (11): parseOutputRoot(), parsePositiveDecimal(), parsePositiveInteger(), readReliabilityCommandConfig(), ReliabilityCommandConfig, REQUIRED_ENV_VARS, runReliabilityCommand(), ReliabilityFailureCode (+3 more)

### Community 41 - "image-upload.ts"

Cohesion: 0.15
Nodes (22): FR-1: accept one JPEG/PNG image up to 20 MB and 6000 px, FR-3: reject invalid input with a specific reason, Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle), API error shape { code, message }, EXIF orientation-aware expected dimensions, Upload validation before session creation, detectFormat(), ERROR_MESSAGES (+14 more)

### Community 42 - "photopea-document-loader.test.ts"

Cohesion: 0.24
Nodes (6): ImageUploadError, expectMalformed(), withApp1(), expectUploadError(), jpeg(), png()

### Community 43 - "state.ts"

Cohesion: 0.15
Nodes (18): Five-state pure client reducer (landing, input, running, result, error), describeStrandedCorrections(), joinNumbers(), strandedCorrectionNumbers(), ClientState, CorrectionStatus, correctionStatuses(), emptyProgress() (+10 more)

### Community 44 - "Conventional Commits"

Cohesion: 0.26
Nodes (14): Branch naming (<type>/<short-description>), Breaking change marker (! and BREAKING CHANGE footer), Conventional commit types (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test), Conventional Commits, gh pr create --fill-first, Conventional issue and pull request titles, Bug report issue form, Issue template chooser config (blank issues disabled) (+6 more)

### Community 45 - "Swap Test"

Cohesion: 0.14
Nodes (27): FR-20: apply a typed mid-run correction without discarding completed work, FR-21: acknowledge a correction visibly within three seconds, FR-22: show accepted corrections in a visible list, FR-23: correction that undoes work already done (P2), Three product properties: editable output, visible work, steerable work, Keyboard-only accessibility agent, Astra Hackathon, Async tool calling (primitive) (+19 more)

### Community 46 - "Recorded Photopea editor frame (photopea-frame.png, 1440x900)"

Cohesion: 0.16
Nodes (16): FR-28: flattened PNG preview alongside the PSD, EditorSession interface (Contract 1), FakeEditorSession, ORIGINAL, document-preview.png (flattened document preview fixture), Minimalist long-exposure seascape with a small rocky island on the horizon, History panel: Open, Name Change, Duplicate Layer, Name Change, Recorded Photopea editor frame (photopea-frame.png, 1440x900) (+8 more)

### Community 47 - "agent-run.test.ts"

Cohesion: 0.13
Nodes (6): agentRuntime(), live(), next(), runtimes, runTokens, samplePath

### Community 48 - "ResponsesModel"

Cohesion: 0.19
Nodes (6): errorCode(), isObject(), narrationOf(), ResponsesModel, safeCode(), usageOf()

### Community 49 - "PlaywrightPhotopeaTransport"

Cohesion: 0.14
Nodes (11): Compact base64 upload transfer, decodePhotopeaWireMessage(), LayerhandWindow, PhotopeaPageMessage, PhotopeaQueueHead, PhotopeaWireMessage, PlaywrightPhotopeaTransport, PlaywrightPhotopeaTransportOptions (+3 more)

### Community 50 - "Design: Layerhand"

Cohesion: 0.10
Nodes (19): Acceptance, Colour, Decisions, Design: Layerhand, Do and do not, Fallbacks, Hero: layered parallax, Icons (+11 more)

### Community 51 - "RunHandle"

Cohesion: 0.25
Nodes (9): RunHandle, RunRequest, collect(), endOf(), EventOf, ofType(), RunContractSubject, testRunContract() (+1 more)

### Community 52 - "ComputerAction"

Cohesion: 0.10
Nodes (13): KEY_NAMES, layerInfo(), PhotopeaPageSession, playwrightKey(), PNG_SIGNATURE, PSD_SIGNATURE, ComputerAction, documentOperations (+5 more)

### Community 53 - "layerhand-mcp/package.json"

Cohesion: 0.07
Nodes (29): @modelcontextprotocol/sdk, bin, layerhand-mcp, description, devDependencies, @modelcontextprotocol/sdk, @types/bun, typescript (+21 more)

### Community 54 - "BrowserbaseClient"

Cohesion: 0.21
Nodes (4): BrowserbaseClient, BrowserbaseError, requiredString(), RecordedRequest

### Community 55 - "warm-editor/measure.ts"

Cohesion: 0.20
Nodes (13): cookieFrom(), filename, image, imageBlob(), imagePath, Measurement, output, summary (+5 more)

### Community 56 - "Layered PSD output (the wedge)"

Cohesion: 0.12
Nodes (28): FR-25: PSD opens without error in Photoshop, Affinity Photo and GIMP, FR-26: every layer named in human words, FR-27: masks and adjustment layers remain editable, FR-33: Product Hunt assets (tagline, description, gallery images, first maker comment), Adobe Photoshop API v2, autoRetouch, BRIA AI, Commercial gate (risk 1: the commercial case vs the survey) (+20 more)

### Community 57 - "Sample product photograph (sample-photo.png)"

Cohesion: 0.10
Nodes (24): FR-4: three worked example instructions that fill the box on click, FR-5: one sample image usable without uploading, Target users: e-commerce photo teams, real-estate photographers, freelance retouchers, Upload form (picker and drop, inline rejections, three example instructions, bundled sample photograph), EXAMPLES, validateFile(), *.jpg, *.mp4 (+16 more)

### Community 58 - "compilerOptions"

Cohesion: 0.10
Nodes (19): DOM, scripts/**/*.ts, compilerOptions, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 59 - "Agent bundle"

Cohesion: 0.08
Nodes (23): Agent bundle, `cancel_run`, Client header, Code layout, Configuration, `get_result`, Handles, Not in this change (+15 more)

### Community 60 - "EditorSession"

Cohesion: 0.16
Nodes (9): EditorSession, managedAgentRun(), CODES, describeFailure(), FailureRecorder, Operation, redactDiagnostic(), run() (+1 more)

### Community 61 - "package.json"

Cohesion: 0.20
Nodes (8): ag-psd, dependencies, ag-psd, playwright-core, three, lint-staged, playwright-core, three

### Community 62 - "runtime.ts"

Cohesion: 0.08
Nodes (37): Environment configuration names (DATABASE_URL, SESSION_SECRET, FREE_DAILY_BUDGET_USD, S3_*, BROWSERBASE_API_KEY, OPENAI_API_KEY, TRUST_PROXY_HOPS), liveAgentRun(), Application, ConfigurationError, DEFAULT_RUN_LIMITS, Environment, EnvironmentName, parsePositiveDecimal() (+29 more)

### Community 63 - "Ten-image reliability suite design"

Cohesion: 0.17
Nodes (11): Acceptance mapping, Corpus contract, Execution flow, Expected file layout, Goals, Nightly workflow and spending guard, Non-goals, Results and visibility (+3 more)

### Community 64 - "page-routes.ts"

Cohesion: 0.15
Nodes (16): BROTLI_OPTIONS, bundledFiles(), favicon(), isCompressibleText(), PageFile, PageRoute, PageRouteOptions, pageRoutes() (+8 more)

### Community 65 - "Layered PSD export implementation plan"

Cohesion: 0.18
Nodes (10): Global constraints, Issue #17 parallel boundary, Layered PSD export implementation plan, Task 1: Migrate the recursive layer contract, Task 2: Parse exported PSD metadata, Task 3: Enforce names and completed-tree policy, Task 4: Build the correlated Photopea export transaction, Task 5: Translate computer actions (+2 more)

### Community 66 - "dispatch"

Cohesion: 0.24
Nodes (9): SSE sequence-id replay and sessionStorage reconnect, RunStreamEvent, EventSourceLike, close(), dispatch(), followRun(), reconnectRun(), restoreRun() (+1 more)

### Community 67 - "graphify CLI and knowledge graph (graphify-out/)"

Cohesion: 0.32
Nodes (8): Run bun run graph after modifying code, graphify CLI and knowledge graph (graphify-out/), Query the graph before reading source, Refresh doc and concept nodes with /graphify --update, RTK condensed command output, rtk proxy fallback, graphify-labs/graphify skill collection, Local hook setup (bun install, then uv tool install graphifyy)

### Community 68 - "devDependencies"

Cohesion: 0.10
Nodes (21): @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, devDependencies, @commitlint/cli, @commitlint/config-conventional, husky (+13 more)

### Community 69 - "harness.ts"

Cohesion: 0.12
Nodes (15): DEFAULT_IMAGES, INSTRUCTION, logPath, outputDirectory, records, registry, RunRecord, server (+7 more)

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

### Community 74 - "compilerOptions"

Cohesion: 0.11
Nodes (17): compilerOptions, lib, module, moduleDetection, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck (+9 more)

### Community 75 - "RunRouteDependencies"

Cohesion: 0.15
Nodes (6): checkOpenAiKey(), Fetch, OpenAiKeyCheck, createEndpointLimiter(), RunRouteDependencies, WaitlistStore

### Community 76 - "responses-model.test.ts"

Cohesion: 0.14
Nodes (4): ResponsesApiError, SCREENSHOT, Sent, USAGE

### Community 77 - "Canvas UI"

Cohesion: 0.15
Nodes (13): Browser support, Canvas UI, Components, Cursor and click effects, How an effect is built, How it works, Installing, Peel (+5 more)

### Community 78 - "scripts"

Cohesion: 0.12
Nodes (19): Bun full-stack HTML import (src/server/index.ts serves src/web/index.html), Bun 1.4.2 runtime pin (lockfile version 2, frozen installs), /health readiness endpoint (process and database readiness), HTTP surface aligned with Contract 3 plus /health, Two-stage non-root container pinned to Bun 1.4.2, scripts, build, dev (+11 more)

### Community 79 - "Driving mechanism"

Cohesion: 0.29
Nodes (6): Driving mechanism, Findings from building it, Limits, Result, Running it, What a run does

### Community 80 - "Native steering"

Cohesion: 0.29
Nodes (6): Completed work survived the correction, Limits, Native steering, Result, Running it, The correction, and what the socket saw

### Community 81 - "photopea-document-exporter.test.ts"

Cohesion: 0.12
Nodes (13): adjustmentKinds, LiveLayer, MemoryBridge, namedPsd(), psd(), locateMaskThumbnail(), viewport, waitForMaskThumbnail() (+5 more)

### Community 82 - "Jakub Krehel's interface skills"

Cohesion: 0.17
Nodes (12): Colour, How the skills are built, Jakub Krehel's interface skills, Layout, Motion and accessibility, See also, The collection, The user-invoked skills (+4 more)

### Community 83 - "report.ts"

Cohesion: 0.29
Nodes (12): formatCacheRate(), formatCost(), formatReliabilityMarkdown(), formatReliabilityTerminal(), formatStatus(), redactSecrets(), SECRET_PATTERNS, SerializableReliabilityCaseResult (+4 more)

### Community 84 - "Atomic commits"

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

### Community 126 - "FakeEditorSession"

Cohesion: 0.23
Nodes (3): cloneAction(), copyBytes(), FakeEditorSession

### Community 127 - "plugin.json"

Cohesion: 0.15
Nodes (12): author, name, url, interface, description, extensions, com.openai, category (+4 more)

### Community 128 - "run-registry.test.ts"

Cohesion: 0.18
Nodes (7): RunEventEnvelope, frame(), framedRun(), registerRunHoldingUpload(), RESULT, scriptedRun(), STARTED

### Community 129 - "RateLimiter"

Cohesion: 0.28
Nodes (3): RateLimiter, RateLimiterOptions, EndpointLimiter

### Community 130 - "RunApi"

Cohesion: 0.33
Nodes (3): accepted(), responseJson(), RunApi

### Community 131 - "Product Hunt listing"

Cohesion: 0.25
Nodes (7): Description, First maker comment, Gallery, Links, Product Hunt listing, Tagline, Topics

### Community 132 - "run-registry-close.test.ts"

Cohesion: 0.14
Nodes (6): RunRegistryError, ABANDONED, CANCELLED, registryWithLog(), samplePath, STARTED

### Community 133 - "photopea-document-exporter.ts"

Cohesion: 0.10
Nodes (19): selectBytes(), selectPngExport(), selectPsdExport(), validPng(), ImageFormat, expectedTree(), noDocumentError(), PhotopeaDocumentExporter (+11 more)

### Community 134 - "run-registry.ts"

Cohesion: 0.10
Nodes (21): NFR-8: per-run observability (step count, token spend, outcome, failure reason), RunLogRecord one-line completion log, Per-run structured log line, RunStopReason, ManagedRunMetrics, RunFailure, EnqueueRun, initialSnapshot() (+13 more)

### Community 135 - "Run memory"

Cohesion: 0.40
Nodes (4): Limits, Result, Run memory, Running it

### Community 136 - "audit.test.ts"

Cohesion: 0.60
Nodes (4): collectLandingFiles(), cssFiles(), FileText, tsFiles()

### Community 137 - "application.ts"

Cohesion: 0.24
Nodes (8): Security and error-handling rules (textContent not innerHTML, restrictive CSP, egress policy, export before release), APPLICATION_CSP, ApplicationDependencies, BASE_SECURITY_HEADERS, json(), PHOTOPEA_HOST_CSP, secured(), SECURITY_HEADERS

### Community 138 - "lint"

Cohesion: 0.22
Nodes (10): Prettier owns syntax, not prose, Lint workflow (formatting), Formatting job, .husky/pre-commit hook, lint, printWidth, $schema, semi (+2 more)

### Community 139 - "gcs-lifecycle-workflow.test.ts"

Cohesion: 0.50
Nodes (3): WorkflowDefinition, WorkflowJob, WorkflowStep

### Community 141 - "run-routes.ts"

Cohesion: 0.33
Nodes (6): fromAllowedOrigin(), QUEUE_FULL, RequestTooLargeError, createRunToken(), hmac(), verifyRunToken()

### Community 142 - "page-routes.test.ts"

Cohesion: 0.29
Nodes (6): binaryRoutesThePageLoads(), expectEverythingSecured(), expectPageFilesServed(), filesThePageLoads(), servers, textRoutesThePageLoads()

### Community 143 - "run-memory/measure.ts"

Cohesion: 0.28
Nodes (8): follow(), Followed, frameBytes, measure(), megabytes(), runs, stepMs, { values }

### Community 144 - "layerhand-mcp"

Cohesion: 0.25
Nodes (7): Configuration, Cost, Install in Claude Code, Install in Codex, layerhand-mcp, Privacy, Tools

### Community 145 - "suite.ts"

Cohesion: 0.46
Nodes (7): toLayerInfoTree(), ReliabilityCase, loadCaseImage(), ReliabilityCaseResult, ReliabilitySuiteOptions, runReliabilitySuite(), StartReliabilityRunInput

### Community 146 - "social-meta.ts"

Cohesion: 0.36
Nodes (4): attribute(), SOCIAL_IMAGE_PATHS, socialMetaTags(), withSocialMeta()

### Community 147 - "Stream-per-directory repository layout"

Cohesion: 0.38
Nodes (6): bun (package manager and script runner), Stream-per-directory repository layout, Conventional lint workflow, Commit messages job, .husky/commit-msg hook, prepare

### Community 148 - "retry.ts"

Cohesion: 0.43
Nodes (4): retryAfterMs(), retryWaitMs(), sleep(), RETRIES

### Community 149 - "claude-marketplace.json"

Cohesion: 0.29
Nodes (6): description, name, owner, name, plugins, $schema

### Community 150 - "workspace-screenshots.ts"

Cohesion: 0.53
Nodes (5): capture(), chooseSample(), shot(), startRun(), VIEWPORTS

### Community 151 - "SKILL.md"

Cohesion: 0.40
Nodes (4): Before you start, Rules, The loop, When to use it

### Community 152 - "layerhand"

Cohesion: 0.50
Nodes (3): OPENAI_API_KEY, node, layerhand

### Community 153 - "layerhand"

Cohesion: 0.50
Nodes (3): npx, layerhand-mcp, layerhand

### Community 154 - "render-og-image.ts"

Cohesion: 0.50
Nodes (3): OUTPUTS, ROOT, server

## Ambiguous Edges - Review These

- `EXAMPLES` → `Cobalt glass bottle` [AMBIGUOUS]
  src/web/assets/sample-photo.png · relation: conceptually_related_to

## Knowledge Gaps

- **737 isolated node(s):** `$schema`, `singleQuote`, `semi`, `trailingComma`, `running` (+732 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `EXAMPLES` and `Cobalt glass bottle`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `LayerInfo` connect `editor/index.ts` to `app.ts`, `run-registry.test.ts`, `photopea-editor-session.ts`, `harness.ts`, `photopea-document-exporter.ts`, `browserbase-editor-session.ts`, `Recorded Photopea editor frame (photopea-frame.png, 1440x900)`, `agent-run.test.ts`, `run-routes.test.ts`, `session.ts`, `ComputerAction`, `api.ts`, `Contract tests`, `WarmSessionPool`, `FakeEditorSession`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `openResponsesSocket()` connect `SteerLedger` to `responses-model.ts`, `tools.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `fail()` connect `tools.ts` to `SteerLedger`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `LayerInfo` (e.g. with `Layers panel: Retouched copy above Original photograph` and `LayerInfo type`) actually correct?**
  _`LayerInfo` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `singleQuote`, `semi` to the rest of the system?**
  _737 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1125886524822695 - nodes in this community are weakly interconnected._
