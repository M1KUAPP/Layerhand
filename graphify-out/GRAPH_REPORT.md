# Graph Report - astra (2026-09-16)

## Corpus Check

- 213 files · ~580,755 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 25 file(s) not represented in the graph (top: .ndjson 10, (none) 9, .psd 3)

## Summary

- 1958 nodes · 4400 edges · 100 communities (79 shown, 21 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 470 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `38d7240c`
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
- runtime.ts
- run.ts
- photopea-action-runner.ts
- photopea-document-exporter.test.ts
- Goal-Driven Execution
- Launch acceptance checklist (evening of September 17)
- run-routes.test.ts
- ResponsesSocket
- corpus.ts
- run-reliability.ts
- startFramePump
- PhotopeaMessage
- EditorSession
- SteerLedger
- LayerInfo
- trap-probe.ts
- responses-model-steering.test.ts
- report.ts
- ADR-0003: Export a parser-backed Photopea snapshot
- Gitiles
- compilerOptions
- RunRegistry
- Layered PSD output (the wedge)
- Google Developer Documentation Style Guide
- live-steer.ts
- PhotopeaExportSnapshot
- CommonMark spec
- live-runner.test.ts
- BrowserbaseSessions
- photopea-page-session.ts
- config.ts
- Conventional Commits
- RunRouteDependencies
- run-registry.ts
- Agent instructions
- scripts
- run-log.test.ts
- bun (package manager and script runner)
- browserbase-network.integration.test.ts
- application.ts
- Photopea round-trip
- suite.ts
- package.json
- Photopea
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
- session.ts
- BrowserbaseClient
- Stream-per-directory repository layout
- harness.ts
- Native steering
- Codex proxy run
- Evidence
- agent-run.ts
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
- measure.ts
- editor/index.ts
- FR-20: apply a typed mid-run correction without discarding completed work
- Launch day runbook
- Layered PSD export implementation plan
- photopea-editor-session.ts
- Ten-image reliability suite implementation plan
- Warm editor session
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

- `Atomic free admission with microdollar spend reservations` --conceptually_related_to--> `FREE_LIMIT` [INFERRED]
  docs/references/launch-application-design.md → src/server/meter-store.ts
- `Prettier owns syntax, not prose` --references--> `printWidth` [INFERRED]
  docs/agents/rules.md → .prettierrc.json
- `Bun full-stack HTML import (src/server/index.ts serves src/web/index.html)` --conceptually_related_to--> `build` [INFERRED]
  docs/references/launch-application-design.md → package.json
- `Idempotent waitlist endpoint and CSV export (bun run waitlist:export)` --references--> `waitlist:export` [EXTRACTED]
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
- **Five client reducer states and the app.ts renderers that draw them** — docs_references_launch_application_design_client_reducer_states, src_web_state_reduceclientstate, src_web_app_renderlanding, src_web_app_renderinput, src_web_app_renderrunning, src_web_app_renderresult, src_web_app_rendererror [INFERRED 0.85]
- **Run admission pipeline: validate the image, establish the visitor, admit against the meter, store the upload, then start the run** — docs_references_launch_application_design_admission_order, src_editor_image_upload_validateimageupload, src_server_visitor_identity_establishvisitoridentity, src_server_meter_store_meterstore_admit, src_server_artifact_store_artifactstore_put, src_server_run_routes_runroutes_start [INFERRED 0.85]
- **Original photograph and Retouched copy layer pair: shown, recorded, and asserted** — src_editor_fixtures_photopea_frame_layers_panel, src_editor_fixtures_photopea_frame_history_panel, src_editor_fake_editor_session_createrecordedfakeeditorsession, test_editor_recorded_fake_editor_session_test [INFERRED 0.95]
- **Use-the-sample-photograph flow, from button to run upload (FR-5)** — docs_prd_fr_5, src_web_app_renderinput, src_web_app_choosesample, src_web_assets_sample_photo_image, src_web_app_choosefile, src_web_api_runapi_start, test_web_application_browser_test_openinput [INFERRED 0.95]

## Communities (100 total, 21 thin omitted)

### Community 0 - "devDependencies"

Cohesion: 0.20
Nodes (10): devDependencies, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, prettier, sharp, @types/bun (+2 more)

### Community 1 - "photopea-editor-session.test.ts"

Cohesion: 0.11
Nodes (5): PhotopeaEditorSession, closeWithWork(), documentCalls(), fixture(), screenshot()

### Community 2 - "responses-model.ts"

Cohesion: 0.09
Nodes (24): BUTTONS, COMMON_PROMPT, correctionText(), describeCodeResult(), Json, keys(), ModelTransport, number() (+16 more)

### Community 3 - "app.ts"

Cohesion: 0.06
Nodes (72): Accessibility baseline (keyboard file picker, visible focus, aria-live status, reduced motion), Five-state pure client reducer (landing, input, running, result, error), SSE sequence-id replay and sessionStorage reconnect, RunStatus, accepted(), boolean(), decodeRunEvent(), decodeRunSnapshot() (+64 more)

### Community 4 - "photopea-document-exporter.ts"

Cohesion: 0.15
Nodes (20): selectBytes(), selectPngExport(), selectPsdExport(), validPng(), cloneLayerInfo(), cloneLayerTree(), expectedTree(), noDocumentError() (+12 more)

### Community 5 - "artifact-store.ts"

Cohesion: 0.08
Nodes (15): Single-container continuous deployment, artifactPublisher(), ArtifactKind, ArtifactPutRequest, ArtifactStore, createArtifactKey(), EXTENSIONS, MemoryArtifactStore (+7 more)

### Community 6 - "loop.test.ts"

Cohesion: 0.08
Nodes (19): CLICK, DONE, EDITABLE_LAYERS, editableFixture(), fixture(), RECORDED_LAYERS, request, RETOUCH (+11 more)

### Community 7 - "browserbase-probe.ts"

Cohesion: 0.19
Nodes (11): Spike B2: Browserbase signup and cold-start measurement, BrowserbaseLiveView, BrowserbaseSession, connectOverCdp(), BrowserbaseProbeClient, BrowserbaseProbeEvidence, BrowserbaseProbeOptions, createReadOnlyLiveView() (+3 more)

### Community 8 - "runtime.ts"

Cohesion: 0.09
Nodes (35): /health readiness endpoint (process and database readiness), HTTP surface aligned with Contract 3 plus /health, Bun SQL metering and waitlist tables (visitor_usage, daily_usage, waitlist_emails), Idempotent waitlist endpoint and CSV export (bun run waitlist:export), createApplication(), createDatabase(), databaseReady(), usdToMicroUsd() (+27 more)

### Community 9 - "run.ts"

Cohesion: 0.10
Nodes (23): capCredits, codeLines, codex, decoder, estimateCredits(), events, exported, findSessionLog() (+15 more)

### Community 10 - "photopea-action-runner.ts"

Cohesion: 0.09
Nodes (14): AuxiliaryButton, AuxiliaryMouse, KEY_ALIASES, normalizeKey(), PhotopeaActionPage, PhotopeaActionRunnerOptions, unknownKey(), buttonState() (+6 more)

### Community 11 - "photopea-document-exporter.test.ts"

Cohesion: 0.16
Nodes (15): ag-psd, AdjustmentType, adjustmentKinds, exporter(), LiveLayer, namedPsd(), psd(), adjustments (+7 more)

### Community 13 - "Launch acceptance checklist (evening of September 17)"

Cohesion: 0.20
Nodes (20): leonxlnx/taste-skill skill collection, FR-30: public landing page with the differentiator and a silent demo loop, FR-31: email capture live and collecting before launch day, FR-32: thirty-second silent demo recording usable on Product Hunt, Launch acceptance checklist (evening of September 17), Launch schedule (September 12-18, launch Friday 12:01am PT), NFR-1: reliability, eight of ten test runs complete unattended with a valid layered file, Day-2 technical go/no-go (kill switch) (+12 more)

### Community 14 - "run-routes.test.ts"

Cohesion: 0.09
Nodes (16): AdmissionDenied, AdmissionRequest, AdmissionResult, assertMicroUsd(), DAILY_LIMIT, FREE_LIMIT, MeterReservation, MeterStore (+8 more)

### Community 15 - "ResponsesSocket"

Cohesion: 0.14
Nodes (12): hasToolCall(), HeaderedWebSocket, isObject(), Json, openResponsesSocket(), REPORTED, ResponsesSocket, ResponsesSocketOptions (+4 more)

### Community 16 - "corpus.ts"

Cohesion: 0.20
Nodes (12): ReliabilityCommandDependencies, isValidHttpsUrl(), isValidRelativeImagePath(), loadReliabilityCorpus(), parseAndValidateCase(), RawCase, ReliabilityCategory, ReliabilityCorpusError (+4 more)

### Community 17 - "run-reliability.ts"

Cohesion: 0.23
Nodes (13): Security and error-handling rules (textContent not innerHTML, restrictive CSP, egress policy, export before release), parseOutputRoot(), parsePositiveDecimal(), parsePositiveInteger(), readReliabilityCommandConfig(), REQUIRED_ENV_VARS, runReliabilityCommand(), APPLICATION_CSP (+5 more)

### Community 18 - "startFramePump"

Cohesion: 0.14
Nodes (8): FRAME_INTERVAL_MS, FramePump, FramePumpOptions, startFramePump(), ManualClock, numbered(), settle(), start()

### Community 19 - "PhotopeaMessage"

Cohesion: 0.07
Nodes (9): PhotopeaDocumentBridge, PhotopeaConfiguration, PhotopeaMessage, ControlledTransport, LateSentinelTransport, MemoryTransport, MemoryBridge, ImageTransport (+1 more)

### Community 20 - "EditorSession"

Cohesion: 0.05
Nodes (38): FR-28: flattened PNG preview alongside the PSD, EditorSession interface (Contract 1), FakeEditorSession, ORIGINAL, cloneAction(), copyBytes(), createRecordedFakeEditorSession(), EditorRecording (+30 more)

### Community 21 - "SteerLedger"

Cohesion: 0.08
Nodes (9): connected(), stubSocket(), Entry, Settlement, SteerEntry, SteerLedger, SteerState, drain() (+1 more)

### Community 22 - "LayerInfo"

Cohesion: 0.11
Nodes (24): ADJUSTMENT_DEFAULT_NAMES, ADJUSTMENT_LABELS, assertLayerNames(), buildLayerRenamePlan(), DEFAULT_ADJUSTMENT_NAMES, fallbackName(), firstFreeName(), flattenLayers() (+16 more)

### Community 23 - "trap-probe.ts"

Cohesion: 0.09
Nodes (27): InputFixtureEvidence, persistInputFixture(), recordOutputPath(), temporaryDirectories, jpeg, OUTPUT_DIRECTORY, PHOTOPEA_URL, SerializedMessage (+19 more)

### Community 24 - "responses-model-steering.test.ts"

Cohesion: 0.09
Nodes (16): CLICK, Connection, created(), Inbox, Json, observe(), SCREENSHOT, scriptedFetch() (+8 more)

### Community 25 - "report.ts"

Cohesion: 0.29
Nodes (12): formatCacheRate(), formatCost(), formatReliabilityMarkdown(), formatReliabilityTerminal(), formatStatus(), redactSecrets(), SECRET_PATTERNS, SerializableReliabilityCaseResult (+4 more)

### Community 26 - "ADR-0003: Export a parser-backed Photopea snapshot"

Cohesion: 0.05
Nodes (42): ADR-0001: Define a provider-neutral editor session, Alternatives considered, Consequences, Context, Decision, Expose Photopea or Playwright directly, Let the agent loop own browser interaction, References (+34 more)

### Community 28 - "compilerOptions"

Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleDetection, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck (+5 more)

### Community 29 - "RunRegistry"

Cohesion: 0.13
Nodes (12): measure(), NFR-8: per-run observability (step count, token spend, outcome, failure reason), RunLogRecord one-line completion log, RunRegistry background event pump with sixty-minute terminal retention, Per-run structured log line, copyResult(), copySnapshot(), initialSnapshot() (+4 more)

### Community 30 - "Layered PSD output (the wedge)"

Cohesion: 0.14
Nodes (18): FR-25: PSD opens without error in Photoshop, Affinity Photo and GIMP, FR-26: every layer named in human words, FR-27: masks and adjustment layers remain editable, FR-33: Product Hunt assets (tagline, description, gallery images, first maker comment), Contest outcome against the four inferred criteria, Flat-output competitors (Photoroom, Clipdrop, Pixelcut, Claid, Pixelbin, remove.bg, Evoto, Imagen AI, Aftershoot, BoxBrownie), Flat-output problem in AI retouching, GPT-6 Astra (+10 more)

### Community 32 - "live-steer.ts"

Cohesion: 0.08
Nodes (24): at(), browserbase, ceiling, client, correction, cost, events, imagePath (+16 more)

### Community 35 - "live-runner.test.ts"

Cohesion: 0.29
Nodes (3): ReliabilityCommandConfig, ReliabilityFailureCode, validEnv

### Community 37 - "photopea-page-session.ts"

Cohesion: 0.10
Nodes (14): api, codeLog, [imagePath, outputArgument, portArgument], output, port, runner, screenshot(), session (+6 more)

### Community 38 - "config.ts"

Cohesion: 0.18
Nodes (15): Environment configuration names (DATABASE_URL, SESSION_SECRET, FREE_DAILY_BUDGET_USD, S3_*, BROWSERBASE_API_KEY, OPENAI_API_KEY, TRUST_PROXY_HOPS), DEFAULT_RUN_LIMITS, Environment, EnvironmentName, parsePositiveDecimal(), parsePositiveInteger(), parseTrustedProxyHops(), readConfig() (+7 more)

### Community 40 - "Conventional Commits"

Cohesion: 0.21
Nodes (17): Branch naming (<type>/<short-description>), Breaking change marker (! and BREAKING CHANGE footer), Conventional commit types (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test), Conventional Commits, gh pr create --fill-first, Conventional issue and pull request titles, Bug report issue form, Issue template chooser config (blank issues disabled) (+9 more)

### Community 42 - "RunRouteDependencies"

Cohesion: 0.22
Nodes (3): RunRouteDependencies, WaitlistStore, WarmEditorSession

### Community 43 - "run-registry.ts"

Cohesion: 0.08
Nodes (28): ManagedRun server adapter (cache metrics, stop reason, releaseSecrets), RunEvent, RunHandle, RunRequest, RunResult, collect(), endOf(), EventOf (+20 more)

### Community 44 - "Agent instructions"

Cohesion: 0.25
Nodes (8): AGENTS.md (agent instruction entry point), AGENTS.md as the single agent entry point, .agents/skills/ skills directory, astra-challenge skill, Agent instructions, Instructions, Project documents, References

### Community 45 - "scripts"

Cohesion: 0.14
Nodes (16): Bun 1.4.2 runtime pin (lockfile version 2, frozen installs), Two-stage non-root container pinned to Bun 1.4.2, scripts, build, dev, graph, lint:fix, reliability (+8 more)

### Community 47 - "run-log.test.ts"

Cohesion: 0.17
Nodes (13): RunStopReason, RunFailureCode, createRunLogger(), failureReason(), redact(), RunLoggerOptions, runLogLine, RunLogStore (+5 more)

### Community 49 - "bun (package manager and script runner)"

Cohesion: 0.13
Nodes (20): graphify CLI and knowledge graph (graphify-out/), Query the graph before reading source, Run graphify update after modifying code, RTK condensed command output, rtk proxy fallback, bun (package manager and script runner), Prettier owns syntax, not prose, graphify-labs/graphify skill collection (+12 more)

### Community 51 - "browserbase-network.integration.test.ts"

Cohesion: 0.07
Nodes (20): FR-29: list the layers on the page after the run, NFR-7: page works at 1280 px and above; mobile out of scope, Bun full-stack HTML import (src/server/index.ts serves src/web/index.html), Desktop workbench layout (1280 px minimum, desktop-required message below), PAGE_SHELL_PATH, PageRouteOptions, pageRoutes(), attribute() (+12 more)

### Community 52 - "application.ts"

Cohesion: 0.12
Nodes (10): Application, ApplicationDependencies, BASE_SECURITY_HEADERS, json(), secured(), LaunchRuntime, opened, runtimeWithBudget() (+2 more)

### Community 53 - "Photopea round-trip"

Cohesion: 0.22
Nodes (8): Digests, Files, Limits, Photopea round-trip, Photoshop verification, Result, Running it, Timing definitions

### Community 54 - "suite.ts"

Cohesion: 0.18
Nodes (9): ReliabilityCase, ReliabilityCaseResult, ReliabilityPublish, ReliabilitySuiteOptions, StartReliabilityRun, StartReliabilityRunInput, passingPsdUrl, sampleImageUrl (+1 more)

### Community 55 - "package.json"

Cohesion: 0.15
Nodes (11): dependencies, ag-psd, playwright-core, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, prettier (+3 more)

### Community 56 - "Photopea"

Cohesion: 0.19
Nodes (17): Photopea licence question (answered: automated and commercial use permitted), Risk: the scripting escape hatch, ag-psd fallback, Browser provider shortlist (Browserbase, Anchor, Hyperbrowser, Steel), Browserbase, Editor adapter, Embedded Photopea driven by the user (fallback product), Export-then-destroy session disposal (+9 more)

### Community 60 - "deployed-run.ts"

Cohesion: 0.06
Nodes (45): acceptanceOutcome(), apiUrl(), cookieFrom(), dataPng(), DeployedRunDependencies, DeployedRunError, DeployedRunEvidence, DeployedRunOptions (+37 more)

### Community 71 - "Driving mechanism"

Cohesion: 0.29
Nodes (6): Driving mechanism, Findings from building it, Limits, Result, Running it, What a run does

### Community 72 - "WarmSessionPool"

Cohesion: 0.08
Nodes (20): FR-3: reject invalid input with a specific reason, API error shape { code, message }, apiError(), boundedFormData(), json(), jsonObject(), registryError(), RequestTooLargeError (+12 more)

### Community 73 - "browserbase-editor-session.ts"

Cohesion: 0.16
Nodes (12): CreatePhotopeaEditorSessionOptions, PHOTOPEA_ASSET_ORIGIN, BrowserbaseEditorSessionOptions, closedError(), comparableOrigin(), CONNECT_TIMEOUT_MS, installNetworkAllowList(), RemoteBrowser (+4 more)

### Community 74 - "ResponsesModel"

Cohesion: 0.21
Nodes (6): errorCode(), isObject(), narrationOf(), ResponsesApiError, ResponsesModel, safeCode()

### Community 75 - "computer tool (GA)"

Cohesion: 0.33
Nodes (7): Code-execution tool over a persistent Playwright session, computer tool (GA), ComputerAction type, Orchestrator, OpenAI Responses API (gpt-6-astra), Single long-lived server process (not serverless), Spike A0: code execution or the computer tool

### Community 77 - "Swap Test"

Cohesion: 0.17
Nodes (20): Adobe Photoshop API v2, autoRetouch, BRIA AI, Commercial gate (risk 1: the commercial case vs the survey), Competition survey (twenty-six products plus a four-product follow-up), Adobe Firefly Creative Production (Remove Background preset, masked layered PSD), Adobe Firefly Services (enterprise access), Human retouching price ceiling ($0.39-$2.00 per image) (+12 more)

### Community 79 - "session.ts"

Cohesion: 0.09
Nodes (19): LayerhandWindow, PhotopeaPageMessage, PhotopeaWireMessage, PlaywrightPhotopeaTransportOptions, Button, LayerKind, LayerMaskInfo, LayerMaskKind (+11 more)

### Community 81 - "BrowserbaseClient"

Cohesion: 0.24
Nodes (5): BrowserbaseClient, BrowserbaseError, Fetch, requiredString(), RecordedRequest

### Community 82 - "Stream-per-directory repository layout"

Cohesion: 0.40
Nodes (6): Surgical Changes, Atomic commits, Rebase merge, never squash, Server-side repository setup (gh api merge settings), Single feat/launch-application branch, squash-merged by the coordinator, Stream-per-directory repository layout

### Community 86 - "harness.ts"

Cohesion: 0.11
Nodes (16): AsyncFunction, pageCodeRunner(), DEFAULT_IMAGES, INSTRUCTION, logPath, outputDirectory, records, registry (+8 more)

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

Cohesion: 0.07
Nodes (26): AgentLoopDependencies, cut(), graphemes, PublishedKind, runAgent(), AgentModel, TokenUsage, ASTRA_PRICING (+18 more)

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

Cohesion: 0.06
Nodes (47): FR-1: accept one JPEG/PNG image up to 20 MB and 6000 px, FR-5: one sample image usable without uploading, Target users: e-commerce photo teams, real-estate photographers, freelance retouchers, Upload form (picker and drop, inline rejections, three example instructions, bundled sample photograph), EXIF orientation-aware expected dimensions, Upload validation before session creation, detectFormat(), ERROR_MESSAGES (+39 more)

### Community 101 - "Contract tests"

Cohesion: 0.20
Nodes (19): FR-10: live view of the editor (at least one frame per 2 s, at most 3 s behind), FR-13: cancel at any point and keep the partial result, FR-14: survive a page reload by resuming the live view, FR-15: show the running session cost in credits, FR-21: acknowledge a correction visibly within three seconds, Single-screen core flow, Read-only sandboxed live-view iframe (pointer-events none, tabindex -1), Contract tests (+11 more)

### Community 102 - "PhotopeaBridge"

Cohesion: 0.09
Nodes (23): NFR-3: a run starts within five seconds of the button, Browserbase probe command (creation-to-ready latency), Document-count snapshot before file delivery, Per-bridge FIFO for complete document opens, Unique app.echoToOE sentinel per scripted call, Image resolution vs screenshot viewport, Issue #15 installed-Chrome upload measurement, Photopea postMessage protocol (+15 more)

### Community 103 - "Four run limits (step cap, spend cap, free runs, daily ceiling)"

Cohesion: 0.07
Nodes (55): FR-11: progress as step count against the cap with plain-words current action, FR-12: stop at the step cap and return a layered partial result, FR-16: per-user history of past runs (P2, deferred by the non-goals), FR-2: free-text instruction of up to 500 characters, FR-35: three free runs per visitor, enforced server-side, FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs, FR-37: global daily spend ceiling that stops free-allowance runs, FR-38: paid credit top-ups (P2) (+47 more)

### Community 104 - "Ten-image reliability suite design"

Cohesion: 0.17
Nodes (11): Acceptance mapping, Corpus contract, Execution flow, Expected file layout, Goals, Nightly workflow and spending guard, Non-goals, Results and visibility (+3 more)

### Community 106 - "measure.ts"

Cohesion: 0.20
Nodes (13): cookieFrom(), filename, image, imageBlob(), imagePath, Measurement, output, summary (+5 more)

### Community 108 - "editor/index.ts"

Cohesion: 0.15
Nodes (16): Filename verification through Document.source, ImageFormat, ValidatedImageUpload, PhotopeaBridgeOptions, PhotopeaProtocolError, PhotopeaProtocolErrorCode, PhotopeaDocumentExporterOptions, LoadedPhotopeaDocument (+8 more)

### Community 109 - "FR-20: apply a typed mid-run correction without discarding completed work"

Cohesion: 0.21
Nodes (18): FR-20: apply a typed mid-run correction without discarding completed work, FR-22: show accepted corrections in a visible list, FR-23: correction that undoes work already done (P2), Three product properties: editable output, visible work, steerable work, Keyboard-only accessibility agent, Astra Hackathon, Computer use (primitive), Computer use x mid-turn steering (Round 9) (+10 more)

### Community 110 - "Launch day runbook"

Cohesion: 0.22
Nodes (8): Changing a limit in a hurry, Launch day runbook, Rotating the server key, See also, The clock, The freeze, and the no-deploy rule, When the providers misbehave, Where to look when something is wrong

### Community 111 - "Layered PSD export implementation plan"

Cohesion: 0.18
Nodes (10): Global constraints, Issue #17 parallel boundary, Layered PSD export implementation plan, Task 1: Migrate the recursive layer contract, Task 2: Parse exported PSD metadata, Task 3: Enforce names and completed-tree policy, Task 4: Build the correlated Photopea export transaction, Task 5: Translate computer actions (+2 more)

### Community 112 - "photopea-editor-session.ts"

Cohesion: 0.08
Nodes (27): host, Compact base64 upload transfer, playwright-core, bridge, fixturePath, samplePath, server, session (+19 more)

### Community 114 - "Ten-image reliability suite implementation plan"

Cohesion: 0.22
Nodes (8): Global constraints, Task 1: Add and validate the representative corpus, Task 2: Run cases sequentially and validate their PSDs, Task 3: Persist and format inspectable reports, Task 4: Add the paid production command, Task 5: Publish the guarded nightly result, Task 6: Run final verification and prepare review, Ten-image reliability suite implementation plan

### Community 116 - "Warm editor session"

Cohesion: 0.40
Nodes (4): Limits, Result, Running it, Warm editor session

### Community 123 - "Superpowers"

Cohesion: 0.50
Nodes (3): Plans, Specs, Superpowers

## Ambiguous Edges - Review These

- `EXAMPLES` → `Cobalt glass bottle` [AMBIGUOUS]
  src/web/assets/sample-photo.png · relation: conceptually_related_to

## Knowledge Gaps

- **448 isolated node(s):** `$schema`, `singleQuote`, `semi`, `trailingComma`, `running` (+443 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 751 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `EXAMPLES` and `Cobalt glass bottle`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `playwright-core` connect `photopea-editor-session.ts` to `photopea-editor-session.test.ts`, `image-upload.ts`, `photopea-page-session.ts`, `PhotopeaBridge`, `browserbase-probe.ts`, `runtime.ts`, `browserbase-editor-session.ts`, `photopea-action-runner.ts`, `editor/index.ts`, `session.ts`, `browserbase-network.integration.test.ts`, `trap-probe.ts`, `harness.ts`, `package.json`, `agent-run.ts`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `LayerInfo` connect `LayerInfo` to `PhotopeaExportSnapshot`, `photopea-editor-session.test.ts`, `app.ts`, `photopea-document-exporter.ts`, `photopea-page-session.ts`, `Contract tests`, `WarmSessionPool`, `run-registry.ts`, `editor/index.ts`, `session.ts`, `photopea-editor-session.ts`, `EditorSession`, `harness.ts`, `agent-run.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `EditorSession` connect `EditorSession` to `photopea-editor-session.test.ts`, `photopea-page-session.ts`, `loop.test.ts`, `WarmSessionPool`, `browserbase-editor-session.ts`, `RunRouteDependencies`, `editor/index.ts`, `session.ts`, `photopea-editor-session.ts`, `browserbase-network.integration.test.ts`, `agent-run.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `LayerInfo` (e.g. with `Layers panel: Retouched copy above Original photograph` and `LayerInfo type`) actually correct?**
  _`LayerInfo` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `singleQuote`, `semi` to the rest of the system?**
  _448 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `photopea-editor-session.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11182795698924732 - nodes in this community are weakly interconnected._
