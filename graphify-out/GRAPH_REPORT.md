# Graph Report - reliability-suite  (2026-09-15)

## Corpus Check
- 204 files · ~571,647 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 30 file(s) not represented in the graph (top: (none) 12, .ndjson 10, .lock 3)

## Summary
- 1880 nodes · 4238 edges · 103 communities (82 shown, 21 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 468 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6d5296af`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- photopea-editor-session.test.ts
- responses-model.ts
- app.ts
- editor/index.ts
- artifact-store.ts
- loop.test.ts
- browserbase-probe.ts
- live-frames.browser.test.ts
- ComputerAction
- playwright-core
- photopea-document-exporter.test.ts
- Goal-Driven Execution
- Launch acceptance checklist (evening of September 17)
- run-routes.test.ts
- PhotopeaBridge
- image-upload.ts
- createLaunchRuntime
- startFramePump
- PhotopeaMessage
- FakeEditorSession
- Four run limits (step cap, spend cap, free runs, daily ceiling)
- photopea-document-exporter.ts
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
- FR-20: apply a typed mid-run correction without discarding completed work
- CommonMark spec
- run-routes.ts
- AgentModel
- run.ts
- runtime.ts
- run-log.test.ts
- Conventional Commits
- Swap Test
- run-registry.ts
- agent/contract.ts
- Agent instructions
- scripts
- live-runner.test.ts
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
- retain-photopea-production-export.ts
- ResponsesModel
- Single-container continuous deployment
- agent-run.test.ts
- .prettierrc.json
- helper.ts
- photopea-editor-session.ts
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
- Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle)
- run-failure.ts
- Codex proxy run
- Agent instructions
- Agent run
- Photopea production export evidence
- workflow.test.ts
- Explicit link paths (relative only within the same directory)
- .husky/pre-push hook
- photopea-document-loader.ts
- browserbaseEditorSession
- LaunchRuntimeOptions

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
- `Atomic free admission with microdollar spend reservations` --conceptually_related_to--> `FREE_LIMIT`  [INFERRED]
  docs/references/launch-application-design.md → src/server/meter-store.ts
- `startRequest()` --shares_data_with--> `document-preview.png (flattened document preview fixture)`  [INFERRED]
  test/server/run-routes.test.ts → src/editor/fixtures/document-preview.png
- `openInput()` --references--> `Sample product photograph (sample-photo.png)`  [INFERRED]
  test/web/application.browser.test.ts → src/web/assets/sample-photo.png
- `Prettier owns syntax, not prose` --references--> `printWidth`  [INFERRED]
  docs/agents/rules.md → .prettierrc.json
- `Bun full-stack HTML import (src/server/index.ts serves src/web/index.html)` --conceptually_related_to--> `build`  [INFERRED]
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

## Communities (103 total, 21 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, prettier, sharp, @types/bun (+2 more)

### Community 1 - "photopea-editor-session.test.ts"
Cohesion: 0.11
Nodes (5): PhotopeaEditorSession, closeWithWork(), documentCalls(), fixture(), screenshot()

### Community 2 - "responses-model.ts"
Cohesion: 0.12
Nodes (21): BUTTONS, COMMON_PROMPT, correctionText(), describeCodeResult(), Json, keys(), ModelTransport, number() (+13 more)

### Community 3 - "app.ts"
Cohesion: 0.06
Nodes (73): Accessibility baseline (keyboard file picker, visible focus, aria-live status, reduced motion), Five-state pure client reducer (landing, input, running, result, error), SSE sequence-id replay and sessionStorage reconnect, RunResult, RunSnapshot, accepted(), boolean(), decodeRunEvent() (+65 more)

### Community 4 - "editor/index.ts"
Cohesion: 0.10
Nodes (32): EditorRecording, SessionState, cloneLayerInfo(), cloneLayerTree(), assertCompleteLayerTree(), LayerCompletionError, LayerCompletionErrorCode, AdjustmentType (+24 more)

### Community 5 - "artifact-store.ts"
Cohesion: 0.08
Nodes (14): artifactPublisher(), ArtifactKind, ArtifactPutRequest, ArtifactStore, createArtifactKey(), EXTENSIONS, MemoryArtifactStore, StoredArtifact (+6 more)

### Community 6 - "loop.test.ts"
Cohesion: 0.10
Nodes (11): CLICK, DONE, EDITABLE_LAYERS, editableFixture(), fixture(), RECORDED_LAYERS, request, RETOUCH (+3 more)

### Community 7 - "browserbase-probe.ts"
Cohesion: 0.22
Nodes (9): BrowserbaseLiveView, BrowserbaseSession, BrowserbaseProbeClient, BrowserbaseProbeEvidence, BrowserbaseProbeOptions, createReadOnlyLiveView(), main(), runBrowserbaseProbe() (+1 more)

### Community 8 - "live-frames.browser.test.ts"
Cohesion: 0.09
Nodes (24): Bun SQL metering and waitlist tables (visitor_usage, daily_usage, waitlist_emails), createDatabase(), databaseReady(), usdToMicroUsd(), applyMigrations(), csvField(), formatWaitlistCsv(), main() (+16 more)

### Community 9 - "ComputerAction"
Cohesion: 0.10
Nodes (8): KEY_NAMES, layerInfo(), PhotopeaPageSession, playwrightKey(), PNG_SIGNATURE, PSD_SIGNATURE, ComputerAction, ExpectedSession

### Community 10 - "playwright-core"
Cohesion: 0.09
Nodes (16): playwright-core, AuxiliaryButton, AuxiliaryMouse, KEY_ALIASES, normalizeKey(), PhotopeaActionPage, PhotopeaActionRunnerOptions, unknownKey() (+8 more)

### Community 11 - "photopea-document-exporter.test.ts"
Cohesion: 0.09
Nodes (18): PhotopeaDocumentExporter, PhotopeaDocumentBridge, adjustmentKinds, exporter(), LiveLayer, MemoryBridge, namedPsd(), psd() (+10 more)

### Community 13 - "Launch acceptance checklist (evening of September 17)"
Cohesion: 0.15
Nodes (26): leonxlnx/taste-skill skill collection, FR-30: public landing page with the differentiator and a silent demo loop, FR-31: email capture live and collecting before launch day, FR-32: thirty-second silent demo recording usable on Product Hunt, Launch acceptance checklist (evening of September 17), Launch schedule (September 12-18, launch Friday 12:01am PT), NFR-1: reliability, eight of ten test runs complete unattended with a valid layered file, Risk: reliability of long GUI control (+18 more)

### Community 14 - "run-routes.test.ts"
Cohesion: 0.12
Nodes (13): AdmissionDenied, AdmissionRequest, AdmissionResult, assertMicroUsd(), DAILY_LIMIT, FREE_LIMIT, MeterReservation, MeterStore (+5 more)

### Community 15 - "PhotopeaBridge"
Cohesion: 0.08
Nodes (27): NFR-3: a run starts within five seconds of the button, Browserbase probe command (creation-to-ready latency), Compact base64 upload transfer, Document-count snapshot before file delivery, Per-bridge FIFO for complete document opens, Unique app.echoToOE sentinel per scripted call, Issue #15 installed-Chrome upload measurement, Photopea postMessage protocol (+19 more)

### Community 16 - "image-upload.ts"
Cohesion: 0.05
Nodes (48): detectFormat(), ERROR_MESSAGES, EXIF_SIGNATURE, ImageUploadError, ImageUploadErrorCode, isStandaloneJpegMarker(), JPEG_SOF_MARKERS, JPEG_SOI (+40 more)

### Community 17 - "createLaunchRuntime"
Cohesion: 0.15
Nodes (10): MAX_RUN_REQUEST_BODY_BYTES, createLaunchRuntime(), LaunchRuntime, opened, runtimeWithBudget(), samplePath, SPEND_CAPS, openInput() (+2 more)

### Community 18 - "startFramePump"
Cohesion: 0.12
Nodes (12): FRAME_INTERVAL_MS, FramePump, FramePumpOptions, startFramePump(), Phase, pumpFor(), retouch(), select() (+4 more)

### Community 19 - "PhotopeaMessage"
Cohesion: 0.09
Nodes (7): PhotopeaConfiguration, PhotopeaMessage, PhotopeaTransport, ControlledTransport, LateSentinelTransport, MemoryTransport, ImageTransport

### Community 20 - "FakeEditorSession"
Cohesion: 0.07
Nodes (27): FR-28: flattened PNG preview alongside the PSD, EditorSession interface (Contract 1), FakeEditorSession, LayerInfo type, ORIGINAL, cloneAction(), copyBytes(), FakeEditorSession (+19 more)

### Community 21 - "Four run limits (step cap, spend cap, free runs, daily ceiling)"
Cohesion: 0.15
Nodes (30): FR-11: progress as step count against the cap with plain-words current action, FR-12: stop at the step cap and return a layered partial result, FR-35: three free runs per visitor, enforced server-side, FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs, FR-37: global daily spend ceiling that stops free-allowance runs, FR-38: paid credit top-ups (P2), NFR-2: no single run exceeds $8 of model spend, NFR-5: no server API key reaches the browser; user keys never logged, persisted or sent beyond OpenAI (+22 more)

### Community 22 - "photopea-document-exporter.ts"
Cohesion: 0.10
Nodes (31): selectBytes(), selectPngExport(), selectPsdExport(), validPng(), ADJUSTMENT_DEFAULT_NAMES, ADJUSTMENT_LABELS, assertLayerNames(), buildLayerRenamePlan() (+23 more)

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

### Community 30 - "Layered PSD output (the wedge)"
Cohesion: 0.13
Nodes (26): FR-25: PSD opens without error in Photoshop, Affinity Photo and GIMP, FR-26: every layer named in human words, FR-27: masks and adjustment layers remain editable, FR-33: Product Hunt assets (tagline, description, gallery images, first maker comment), Adobe Photoshop API v2, autoRetouch, BRIA AI, Commercial gate (risk 1: the commercial case vs the survey) (+18 more)

### Community 32 - "live-steer.ts"
Cohesion: 0.08
Nodes (24): at(), browserbase, ceiling, client, correction, cost, events, imagePath (+16 more)

### Community 33 - "FR-20: apply a typed mid-run correction without discarding completed work"
Cohesion: 0.11
Nodes (35): FR-10: live view of the editor (at least one frame per 2 s, at most 3 s behind), FR-13: cancel at any point and keep the partial result, FR-14: survive a page reload by resuming the live view, FR-15: show the running session cost in credits, FR-20: apply a typed mid-run correction without discarding completed work, FR-21: acknowledge a correction visibly within three seconds, FR-22: show accepted corrections in a visible list, FR-23: correction that undoes work already done (P2) (+27 more)

### Community 35 - "run-routes.ts"
Cohesion: 0.23
Nodes (9): /health readiness endpoint (process and database readiness), HTTP surface aligned with Contract 3 plus /health, Idempotent waitlist endpoint and CSV export (bun run waitlist:export), apiError(), json(), jsonObject(), registryError(), RunRoutes (+1 more)

### Community 36 - "AgentModel"
Cohesion: 0.18
Nodes (9): ScriptedModel, AgentModel, ModelTurn, Observation, CLICK, SCRIPT, ScriptedModel, ScriptedModelOptions (+1 more)

### Community 37 - "run.ts"
Cohesion: 0.10
Nodes (23): capCredits, codeLines, codex, decoder, estimateCredits(), events, exported, findSessionLog() (+15 more)

### Community 38 - "runtime.ts"
Cohesion: 0.12
Nodes (30): Environment configuration names (DATABASE_URL, SESSION_SECRET, FREE_DAILY_BUDGET_USD, S3_*, BROWSERBASE_API_KEY, OPENAI_API_KEY, TRUST_PROXY_HOPS), parseOutputRoot(), parsePositiveDecimal(), parsePositiveInteger(), readReliabilityCommandConfig(), REQUIRED_ENV_VARS, runReliabilityCommand(), ConfigurationError (+22 more)

### Community 39 - "run-log.test.ts"
Cohesion: 0.17
Nodes (13): RunStopReason, RunFailureCode, createRunLogger(), failureReason(), redact(), RunLoggerOptions, runLogLine, RunLogStore (+5 more)

### Community 40 - "Conventional Commits"
Cohesion: 0.21
Nodes (17): Branch naming (<type>/<short-description>), Breaking change marker (! and BREAKING CHANGE footer), Conventional commit types (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test), Conventional Commits, gh pr create --fill-first, Conventional issue and pull request titles, Bug report issue form, Issue template chooser config (blank issues disabled) (+9 more)

### Community 41 - "Swap Test"
Cohesion: 0.15
Nodes (23): Contest outcome against the four inferred criteria, GPT-6 Astra, OSWorld V2-Offline benchmark, Astra cannot generate an image (text-output-only irony), Keyboard-only accessibility agent, Astra Hackathon, Async tool calling (primitive), Computer use (primitive) (+15 more)

### Community 42 - "run-registry.ts"
Cohesion: 0.11
Nodes (20): NFR-6: uploaded images deleted within twenty-four hours, NFR-8: per-run observability (step count, token spend, outcome, failure reason), RunLogRecord one-line completion log, Per-run structured log line, Secrets and upload handling, ManagedRun, ManagedRunMetrics, RunFailure (+12 more)

### Community 43 - "agent/contract.ts"
Cohesion: 0.18
Nodes (9): ManagedRun server adapter (cache metrics, stop reason, releaseSecrets), RunEvent, EventLog, fakeRun(), FakeRunOptions, SCRIPT, managedFakeRun(), controlledRun() (+1 more)

### Community 44 - "Agent instructions"
Cohesion: 0.25
Nodes (8): AGENTS.md (agent instruction entry point), AGENTS.md as the single agent entry point, .agents/skills/ skills directory, astra-challenge skill, Agent instructions, Instructions, Project documents, References

### Community 45 - "scripts"
Cohesion: 0.19
Nodes (14): Bun 1.4.2 runtime pin (lockfile version 2, frozen installs), Two-stage non-root container pinned to Bun 1.4.2, scripts, build, dev, lint:fix, reliability, start (+6 more)

### Community 46 - "live-runner.test.ts"
Cohesion: 0.22
Nodes (5): ReliabilityCommandConfig, ReliabilityCommandDependencies, ReliabilityFailureCode, liveAgentRun(), validEnv

### Community 47 - "agent-run.ts"
Cohesion: 0.14
Nodes (15): AgentLoopDependencies, cut(), graphemes, PublishedKind, runAgent(), TokenUsage, ASTRA_PRICING, Spend (+7 more)

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
Cohesion: 0.18
Nodes (9): Security and error-handling rules (textContent not innerHTML, restrictive CSP, egress policy, export before release), Application, APPLICATION_CSP, ApplicationDependencies, BASE_SECURITY_HEADERS, createApplication(), json(), PHOTOPEA_HOST_CSP (+1 more)

### Community 53 - "Photopea round-trip evidence"
Cohesion: 0.25
Nodes (7): Digests, Evidence limits, Files, Photopea round-trip evidence, Photoshop verification, Reproduction, Timing definitions

### Community 54 - "suite.ts"
Cohesion: 0.17
Nodes (11): ReliabilityCase, loadCaseImage(), ReliabilityCaseResult, ReliabilityPublish, ReliabilitySuiteOptions, runReliabilitySuite(), StartReliabilityRun, StartReliabilityRunInput (+3 more)

### Community 55 - "package.json"
Cohesion: 0.13
Nodes (13): dependencies, ag-psd, playwright-core, ag-psd, sharp, @commitlint/cli, @commitlint/config-conventional, husky (+5 more)

### Community 56 - "Photopea"
Cohesion: 0.16
Nodes (21): FR-16: per-user history of past runs (P2, deferred by the non-goals), NFR-4: twenty simultaneous runs without queueing, then a queue with a stated position, Requirement-level exclusions (no accounts, no in-app editing, no undo, PSD-only output, no internationalisation), Product non-goals (no image generation, no batch/API/integrations, no accounts beyond metering, no mobile, no own editor, no presets), Risk: the scripting escape hatch, ag-psd fallback, Browser provider shortlist (Browserbase, Anchor, Hyperbrowser, Steel), Browserbase (+13 more)

### Community 60 - "live-run.ts"
Cohesion: 0.12
Nodes (14): browserbase, ceiling, client, cost, events, imagePath, INSTRUCTION, last (+6 more)

### Community 71 - "Driving mechanism evidence"
Cohesion: 0.40
Nodes (4): Driving mechanism evidence, Findings from building it, Running it, What a run does

### Community 72 - "WarmSessionPool"
Cohesion: 0.11
Nodes (13): RunRouteDependencies, claimed(), Entry, imageDigest(), MAX_WARM_SESSIONS, WARM_SESSION_TTL_MS, WarmEditorSession, WarmSessionPool (+5 more)

### Community 73 - "retain-photopea-production-export.ts"
Cohesion: 0.11
Nodes (16): host, server, bridge, fixturePath, samplePath, server, session, viewport (+8 more)

### Community 74 - "ResponsesModel"
Cohesion: 0.21
Nodes (6): errorCode(), isObject(), narrationOf(), ResponsesApiError, ResponsesModel, safeCode()

### Community 75 - "Single-container continuous deployment"
Cohesion: 0.20
Nodes (9): Code-execution tool over a persistent Playwright session, computer tool (GA), ComputerAction type, Orchestrator, OpenAI Responses API (gpt-6-astra), Single-container continuous deployment, Single long-lived server process (not serverless), Spike A0: code execution or the computer tool (+1 more)

### Community 76 - "agent-run.test.ts"
Cohesion: 0.14
Nodes (6): createRecordedFakeEditorSession(), agentRuntime(), live(), run(), runtimes, samplePath

### Community 77 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): $schema, semi, singleQuote, trailingComma

### Community 78 - "helper.ts"
Cohesion: 0.15
Nodes (11): AsyncFunction, pageCodeRunner(), api, codeLog, [imagePath, outputArgument, portArgument], output, port, runner (+3 more)

### Community 79 - "photopea-editor-session.ts"
Cohesion: 0.11
Nodes (17): PhotopeaActionRunner, PhotopeaExportSnapshot, createPhotopeaEditorSession(), CreatePhotopeaEditorSessionOptions, PhotopeaEditorSessionDependencies, PhotopeaSessionWork, LayerhandWindow, PhotopeaPageMessage (+9 more)

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
Cohesion: 0.20
Nodes (4): CodeRunner, SCREENSHOT, Sent, USAGE

### Community 87 - "Native steering"
Cohesion: 0.33
Nodes (5): Completed work survived the correction, Native steering, Result, Running it, The correction, and what the socket saw

### Community 88 - "Global constraints"
Cohesion: 0.22
Nodes (8): Global constraints, Task 1: Add and validate the representative corpus, Task 2: Run cases sequentially and validate their PSDs, Task 3: Persist and format inspectable reports, Task 4: Add the paid production command, Task 5: Publish the guarded nightly result, Task 6: Run final verification and prepare review, Ten-image reliability suite implementation plan

### Community 90 - "harness.ts"
Cohesion: 0.17
Nodes (11): DEFAULT_IMAGES, INSTRUCTION, logPath, outputDirectory, records, registry, RunRecord, stepCap (+3 more)

### Community 91 - "Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle)"
Cohesion: 0.24
Nodes (13): FR-1: accept one JPEG/PNG image up to 20 MB and 6000 px, FR-2: free-text instruction of up to 500 characters, FR-3: reject invalid input with a specific reason, FR-4: three worked example instructions that fill the box on click, FR-5: one sample image usable without uploading, Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle), API error shape { code, message }, Upload form (picker and drop, inline rejections, three example instructions, bundled sample photograph) (+5 more)

### Community 92 - "run-failure.ts"
Cohesion: 0.31
Nodes (6): CODES, describeFailure(), FailureRecorder, Operation, redactDiagnostic(), watchedSession()

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
Cohesion: 0.33
Nodes (7): Filename verification through Document.source, ImageFormat, ValidatedImageUpload, LoadedPhotopeaDocument, PhotopeaDocumentError, readDocumentCount(), verifyDocument()

### Community 101 - "browserbaseEditorSession"
Cohesion: 0.25
Nodes (5): browserbaseEditorSession, BrowserbaseSessions, closedError(), connectOverCdp(), RemoteBrowser

## Ambiguous Edges - Review These
- `EXAMPLES` → `Cobalt glass bottle`  [AMBIGUOUS]
  src/web/assets/sample-photo.png · relation: conceptually_related_to

## Knowledge Gaps
- **426 isolated node(s):** `$schema`, `singleQuote`, `semi`, `trailingComma`, `INSTRUCTION` (+421 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 714 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `EXAMPLES` and `Cobalt glass bottle`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `playwright-core` connect `playwright-core` to `photopea-editor-session.test.ts`, `browserbase-probe.ts`, `live-frames.browser.test.ts`, `retain-photopea-production-export.ts`, `ComputerAction`, `photopea-document-exporter.test.ts`, `agent-run.test.ts`, `helper.ts`, `photopea-editor-session.ts`, `PhotopeaBridge`, `createLaunchRuntime`, `startFramePump`, `package.json`, `harness.ts`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `LayerInfo` connect `editor/index.ts` to `photopea-editor-session.test.ts`, `app.ts`, `WarmSessionPool`, `ComputerAction`, `agent/contract.ts`, `agent-run.test.ts`, `photopea-editor-session.ts`, `FakeEditorSession`, `photopea-document-exporter.ts`, `harness.ts`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `SteerLedger` connect `SteerLedger` to `responses-model.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `LayerInfo` (e.g. with `Layers panel: Retouched copy above Original photograph` and `LayerInfo type`) actually correct?**
  _`LayerInfo` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `singleQuote`, `semi` to the rest of the system?**
  _426 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `photopea-editor-session.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11182795698924732 - nodes in this community are weakly interconnected._