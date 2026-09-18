# Graph Report - feat-mcp-frame (2026-09-18)

## Corpus Check

- 339 files · ~692,380 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 46 file(s) not represented in the graph (top: .css 14, (none) 11, .ndjson 10)

## Summary

- 2981 nodes · 6048 edges · 196 communities (158 shown, 37 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 492 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `3292023d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)

- app.ts
- ResponsesSocket
- client.ts
- deployed-run.ts
- photopea-editor-session.test.ts
- ADR-0003: Export a parser-backed Photopea snapshot
- FakeEditorSession
- Sample product photograph (sample-photo.png)
- browserbase-editor-session.ts
- AgentModel
- playwright-core
- photopea-action-runner.ts
- artifact-store.ts
- trap-probe.ts
- Four run limits (step cap, spend cap, free runs, daily ceiling)
- live-frames.browser.test.ts
- PhotopeaMessage
- createRecordedFakeEditorSession
- run-routes.test.ts
- responses-model-steering.test.ts
- agent/contract.ts
- editor/index.ts
- Launch acceptance checklist (evening of September 17)
- api.ts
- Product non-goals (no image generation, no batch/API/integrations, no accounts beyond metering, no mobile, no own editor, no presets)
- live-steer.ts
- helper.ts
- FR-20: apply a typed mid-run correction without discarding completed work
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
- Photopea
- managed-run.ts
- suite.ts
- image-upload.ts
- config.ts
- landing/index.ts
- Conventional Commits
- Swap Test
- EditorSession
- agent-run.ts
- ResponsesModel
- PlaywrightPhotopeaTransport
- Design: Layerhand
- state.test.ts
- Demo recorder
- layerhand-mcp/package.json
- speak.py
- warm-editor/measure.ts
- Layered PSD output (the wedge)
- record.mjs
- compilerOptions
- Agent bundle
- createGlassObject
- package.json
- runtime.ts
- Ten-image reliability suite design
- page-routes.ts
- Layered PSD export implementation plan
- BrowserbaseClient
- bun (package manager and script runner)
- devDependencies
- BatchSpeechTests
- harness.ts
- Photopea round-trip
- Launch day runbook
- Ten-image reliability suite implementation plan
- compilerOptions
- live-run.ts
- responses-model.test.ts
- Canvas UI
- scripts
- Driving mechanism
- Native steering
- photopea-document-exporter.test.ts
- Jakub Krehel's interface skills
- PhotopeaDocumentLoader
- Stream-per-directory repository layout
- Codex proxy run
- Agent run
- Warm editor session
- corpus.ts
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
- live-runner.test.ts
- plugin.json
- tools.ts
- mcp-artifacts.ts
- RunApi
- Product Hunt listing
- run-reliability.ts
- photopea-document-exporter.ts
- agent-run.test.ts
- Run memory
- audit.test.ts
- application.ts
- lint
- gcs-lifecycle-workflow.test.ts
- drawer.ts
- photopea-page-session.ts
- Landing polish
- run-memory/measure.ts
- layerhand-mcp
- Global constraints
- Landing polish implementation plan
- hero.ts
- SqlMeterStore
- switcher.ts
- subtitles.py
- SKILL.md
- layerhand
- layerhand
- render-og-image.ts
- report.ts
- tools.test.ts
- LandingContext
- replay.browser.test.ts
- workbench.browser.test.ts
- application.browser.test.ts
- playback.browser.test.ts
- steps.ts
- stack.browser.test.ts
- faq.ts
- footer.browser.test.ts
- SubtitleLayoutTests
- createTools
- retain-photopea-production-export.ts
- schedule.py
- Agent instructions
- render.mjs
- NarrateIntegrationTests
- .test_rejects_audio_that_outlives_its_visual_beat
- install.test.ts
- computer tool (GA)
- drawer.browser.test.ts
- NarrationManifestTests
- manifest.py
- narrate.sh
- assemble.sh
- page-routes.test.ts
- page.ts
- profiles.ts
- social-meta.ts
- Photoshop agent export
- claude-marketplace.json
- workspace-screenshots.ts
- RunStreamEvent
- Agent instructions
- api.test.ts
- surfaces.browser.test.ts
- mcp-page-routes.test.ts
- test-server.ts
- hero.browser.test.ts
- glass-facts.test.ts

## God Nodes (most connected - your core abstractions)

1. `playwright-core` - 48 edges
2. `RunRegistry` - 47 edges
3. `createLaunchRuntime()` - 41 edges
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
- `htmlFile` --references--> `index.html (Layerhand single-page shell)` [INFERRED]
  test/web/dom.test.ts → src/web/index.html
- `Prettier owns syntax, not prose` --references--> `printWidth` [INFERRED]
  docs/agents/rules.md → .prettierrc.json
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
- **Run admission pipeline: validate the image, establish the visitor, admit against the meter, store the upload, then start the run** — docs_references_launch_application_design_admission_order, src_editor_image_upload_validateimageupload, src_server_visitor_identity_establishvisitoridentity, src_server_meter_store_meterstore_admit, src_server_artifact_store_artifactstore_put, src_server_run_routes_runroutes_start [INFERRED 0.85]
- **Original photograph and Retouched copy layer pair: shown, recorded, and asserted** — src_editor_fixtures_photopea_frame_layers_panel, src_editor_fixtures_photopea_frame_history_panel, src_editor_fake_editor_session_createrecordedfakeeditorsession, test_editor_recorded_fake_editor_session_test [INFERRED 0.95]
- **Use-the-sample-photograph flow, from button to run upload (FR-5)** — docs_prd_fr_5, src_web_app_renderinput, src_web_app_choosesample, src_web_assets_sample_photo_image, src_web_app_choosefile, src_web_api_runapi_start, test_web_application_browser_test_openinput [INFERRED 0.95]

## Communities (196 total, 37 thin omitted)

### Community 0 - "app.ts"

Cohesion: 0.06
Nodes (87): FR-14: survive a page reload by resuming the live view, Single-screen core flow, Accessibility baseline (keyboard file picker, visible focus, aria-live status, reduced motion), Five-state pure client reducer (landing, input, running, result, error), RunRegistry background event pump with sixty-minute terminal retention, SSE sequence-id replay and sessionStorage reconnect, Run registry, Single-page web application (+79 more)

### Community 1 - "ResponsesSocket"

Cohesion: 0.13
Nodes (13): failedResponseStatus(), hasToolCall(), HeaderedWebSocket, isObject(), Json, openResponsesSocket(), REPORTED, ResponsesSocket (+5 more)

### Community 2 - "client.ts"

Cohesion: 0.16
Nodes (9): ApiError, imageContentType(), LayerhandClient, LayerhandClientOptions, LayerInfo, RunResult, RunStatus, RunStopReason (+1 more)

### Community 3 - "deployed-run.ts"

Cohesion: 0.13
Nodes (24): acceptanceOutcome(), apiUrl(), cookieFrom(), dataPng(), DeployedRunDependencies, DeployedRunError, DeployedRunEvidence, DeployedRunOptions (+16 more)

### Community 4 - "photopea-editor-session.test.ts"

Cohesion: 0.09
Nodes (7): PhotopeaExportSnapshot, PhotopeaEditorSession, PhotopeaSessionWork, closeWithWork(), documentCalls(), fixture(), screenshot()

### Community 5 - "ADR-0003: Export a parser-backed Photopea snapshot"

Cohesion: 0.05
Nodes (42): ADR-0001: Define a provider-neutral editor session, Alternatives considered, Consequences, Context, Decision, Expose Photopea or Playwright directly, Let the agent loop own browser interaction, References (+34 more)

### Community 6 - "FakeEditorSession"

Cohesion: 0.13
Nodes (10): cloneAction(), copyBytes(), FakeEditorSession, createSession(), documentOperations, frameA, frameB, MutableLayerInfo (+2 more)

### Community 7 - "Sample product photograph (sample-photo.png)"

Cohesion: 0.14
Nodes (21): FR-1: accept one JPEG/PNG image up to 20 MB and 6000 px, FR-4: three worked example instructions that fill the box on click, FR-5: one sample image usable without uploading, Thirty-second silent demo storyboard, Upload form (picker and drop, inline rejections, three example instructions, bundled sample photograph), EXAMPLES, *.css, *.jpg (+13 more)

### Community 8 - "browserbase-editor-session.ts"

Cohesion: 0.06
Nodes (29): MAX_IMAGE_EDGE, CreatePhotopeaEditorSessionOptions, createPhotopeaHostHtml(), PHOTOPEA_ASSET_ORIGIN, PHOTOPEA_ORIGIN, PhotopeaEnvironment, PhotopeaEnvironmentParameters, BrowserbaseLiveView (+21 more)

### Community 9 - "AgentModel"

Cohesion: 0.20
Nodes (8): ScriptedModel, AgentModel, ModelTurn, Observation, CLICK, SCRIPT, ScriptedModelOptions, wait()

### Community 10 - "playwright-core"

Cohesion: 0.21
Nodes (11): playwright-core, CLAIMS, VIEWPORTS, VIEWPORTS, VIEWPORTS, CARD_TITLES, LandingPageOptions, openLanding() (+3 more)

### Community 11 - "photopea-action-runner.ts"

Cohesion: 0.08
Nodes (16): AuxiliaryButton, AuxiliaryMouse, KEY_ALIASES, normalizeKey(), PhotopeaActionPage, PhotopeaActionRunner, unknownKey(), createPhotopeaEditorSession() (+8 more)

### Community 12 - "artifact-store.ts"

Cohesion: 0.06
Nodes (17): callTool(), DataArtifactStore, fetch(), LaunchRuntime, packageDir, RuntimeModule, samplePhoto, Snapshot (+9 more)

### Community 13 - "trap-probe.ts"

Cohesion: 0.09
Nodes (27): InputFixtureEvidence, persistInputFixture(), recordOutputPath(), temporaryDirectories, jpeg, OUTPUT_DIRECTORY, PHOTOPEA_URL, SerializedMessage (+19 more)

### Community 14 - "Four run limits (step cap, spend cap, free runs, daily ceiling)"

Cohesion: 0.14
Nodes (32): FR-12: stop at the step cap and return a layered partial result, FR-35: three free runs per visitor, enforced server-side, FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs, FR-37: global daily spend ceiling that stops free-allowance runs, FR-38: paid credit top-ups (P2), NFR-2: no single run exceeds $8 of model spend, NFR-5: no server API key reaches the browser; user keys never logged, persisted or sent beyond OpenAI, NFR-6: uploaded images deleted within twenty-four hours (+24 more)

### Community 15 - "live-frames.browser.test.ts"

Cohesion: 0.08
Nodes (32): Bun SQL metering and waitlist tables (visitor_usage, daily_usage, waitlist_emails), Idempotent waitlist endpoint and CSV export (bun run waitlist:export), RUN_CEILING_MS, createApplication(), createDatabase(), databaseReady(), usdToMicroUsd(), applyMigrations() (+24 more)

### Community 16 - "PhotopeaMessage"

Cohesion: 0.07
Nodes (18): Unique app.echoToOE sentinel per scripted call, Photopea postMessage protocol, Photopea known traps, Reusable Photopea bridge boot, Spike B1: verify the image-in, PSD-out round trip, FILE_TRANSFER_MS_PER_MIB, PhotopeaBridge, PhotopeaBridgeOptions (+10 more)

### Community 17 - "createRecordedFakeEditorSession"

Cohesion: 0.15
Nodes (19): FR-28: flattened PNG preview alongside the PSD, EditorSession interface (Contract 1), FakeEditorSession, LayerInfo type, RunResult type (Contract 2), ORIGINAL, createRecordedFakeEditorSession(), document-preview.png (flattened document preview fixture) (+11 more)

### Community 18 - "run-routes.test.ts"

Cohesion: 0.09
Nodes (14): ADDRESS_LIMIT, AdmissionRequest, AdmissionResult, BUDGET_RESERVED, DAILY_LIMIT, DEFAULT_FREE_RUNS_PER_ADDRESS_PER_DAY, FREE_LIMIT, MeterReservation (+6 more)

### Community 19 - "responses-model-steering.test.ts"

Cohesion: 0.08
Nodes (19): ResponsesModelOptions, CLICK, Connection, created(), Inbox, Json, observe(), rateLimitedEvent (+11 more)

### Community 20 - "agent/contract.ts"

Cohesion: 0.10
Nodes (17): ManagedRun server adapter (cache metrics, stop reason, releaseSecrets), RunEvent, RunResult, EventLog, END, fakeRun(), FakeRunOptions, SCRIPT (+9 more)

### Community 21 - "editor/index.ts"

Cohesion: 0.08
Nodes (36): EditorRecording, SessionState, cloneLayerInfo(), cloneLayerTree(), assertCompleteLayerTree(), LayerCompletionError, LayerCompletionErrorCode, PhotopeaActionRunnerOptions (+28 more)

### Community 22 - "Launch acceptance checklist (evening of September 17)"

Cohesion: 0.15
Nodes (25): leonxlnx/taste-skill skill collection, FR-30: public landing page with the differentiator and a silent demo loop, FR-31: email capture live and collecting before launch day, FR-32: thirty-second silent demo recording usable on Product Hunt, Launch acceptance checklist (evening of September 17), Launch schedule (September 12-18, launch Friday 12:01am PT), NFR-1: reliability, eight of ten test runs complete unattended with a valid layered file, Risk: reliability of long GUI control (+17 more)

### Community 23 - "api.ts"

Cohesion: 0.30
Nodes (21): boolean(), decodeRunEvent(), decodeRunSnapshot(), eventId(), EventSourceFactory, Fetch, integer(), invalidResponse() (+13 more)

### Community 24 - "Product non-goals (no image generation, no batch/API/integrations, no accounts beyond metering, no mobile, no own editor, no presets)"

Cohesion: 0.20
Nodes (7): FR-16: per-user history of past runs (P2, deferred by the non-goals), NFR-7: page works at 1280 px and above; mobile out of scope, Requirement-level exclusions (no accounts, no in-app editing, no undo, PSD-only output, no internationalisation), Product non-goals (no image generation, no batch/API/integrations, no accounts beyond metering, no mobile, no own editor, no presets), #desktop-required notice (workbench needs a desktop at least 1280 pixels wide), cssFile, htmlFile

### Community 25 - "live-steer.ts"

Cohesion: 0.08
Nodes (24): at(), browserbase, ceiling, client, correction, cost, events, imagePath (+16 more)

### Community 26 - "helper.ts"

Cohesion: 0.12
Nodes (13): api, codeLog, host, [imagePath, outputArgument, portArgument], output, port, runner, screenshot() (+5 more)

### Community 27 - "FR-20: apply a typed mid-run correction without discarding completed work"

Cohesion: 0.17
Nodes (22): FR-10: live view of the editor (at least one frame per 2 s, at most 3 s behind), FR-11: progress as step count against the cap with plain-words current action, FR-13: cancel at any point and keep the partial result, FR-15: show the running session cost in credits, FR-20: apply a typed mid-run correction without discarding completed work, FR-21: acknowledge a correction visibly within three seconds, FR-22: show accepted corrections in a visible list, FR-23: correction that undoes work already done (P2) (+14 more)

### Community 28 - "SteerLedger"

Cohesion: 0.07
Nodes (9): connected(), stubSocket(), Entry, Settlement, SteerEntry, SteerLedger, SteerState, drain() (+1 more)

### Community 29 - "WarmSessionPool"

Cohesion: 0.10
Nodes (14): OpenAiKeyCheck, RunRouteDependencies, claimed(), Entry, imageDigest(), MAX_WARM_SESSIONS, WARM_SESSION_TTL_MS, WarmEditorSession (+6 more)

### Community 30 - "run.ts"

Cohesion: 0.10
Nodes (23): capCredits, codeLines, codex, decoder, estimateCredits(), events, exported, findSessionLog() (+15 more)

### Community 31 - "run-routes.ts"

Cohesion: 0.09
Nodes (23): FR-3: reject invalid input with a specific reason, Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle), API error shape { code, message }, validateImageUpload(), RateLimiter, RateLimiterOptions, RunStartRefused, apiError() (+15 more)

### Community 32 - "responses-model.ts"

Cohesion: 0.11
Nodes (23): BUTTONS, COMMON_PROMPT, correctionText(), describeCodeResult(), Json, keys(), ModelTransport, number() (+15 more)

### Community 33 - "Landing sections"

Cohesion: 0.07
Nodes (28): Drawer, Drawer content, Drawer copy, Drawer DOM outline, Drawer done looks like, Footer copy, Glass, Glass copy (+20 more)

### Community 34 - "RunRegistry"

Cohesion: 0.06
Nodes (28): measure(), ManagedRun, copyResult(), copySnapshot(), EnqueueRun, initialSnapshot(), isLive(), LiveRun (+20 more)

### Community 35 - "startFramePump"

Cohesion: 0.12
Nodes (12): FRAME_INTERVAL_MS, FramePump, FramePumpOptions, startFramePump(), Phase, pumpFor(), retouch(), select() (+4 more)

### Community 36 - "glass.ts"

Cohesion: 0.13
Nodes (14): three, FACTS, flatArt(), FormerDef, GLASS_DEFAULTS, GlassModules, GlassObjectElements, GlassObjectInstance (+6 more)

### Community 37 - "loop.test.ts"

Cohesion: 0.09
Nodes (12): CLICK, DONE, EDITABLE_LAYERS, editableFixture(), fixture(), RECORDED_LAYERS, request, RETOUCH (+4 more)

### Community 38 - "Photopea"

Cohesion: 0.15
Nodes (23): FR-2: free-text instruction of up to 500 characters, NFR-4: twenty simultaneous runs without queueing, then a queue with a stated position, Risk: the scripting escape hatch, Required FREE_DAILY_BUDGET_USD (no default daily ceiling), ag-psd fallback, Browser provider shortlist (Browserbase, Anchor, Hyperbrowser, Steel), Browserbase, Editor adapter (+15 more)

### Community 39 - "managed-run.ts"

Cohesion: 0.12
Nodes (20): NFR-8: per-run observability (step count, token spend, outcome, failure reason), RunLogRecord one-line completion log, Per-run structured log line, RunStopReason, ManagedRunMetrics, CODES, describeFailure(), Operation (+12 more)

### Community 40 - "suite.ts"

Cohesion: 0.16
Nodes (12): ReliabilityCase, loadCaseImage(), ReliabilityCaseResult, ReliabilityPublish, ReliabilitySuiteOptions, runReliabilitySuite(), StartReliabilityRun, StartReliabilityRunInput (+4 more)

### Community 41 - "image-upload.ts"

Cohesion: 0.08
Nodes (23): EXIF orientation-aware expected dimensions, Upload validation before session creation, detectFormat(), ERROR_MESSAGES, EXIF_SIGNATURE, ImageUploadError, ImageUploadErrorCode, isStandaloneJpegMarker() (+15 more)

### Community 42 - "config.ts"

Cohesion: 0.19
Nodes (15): Environment configuration names (DATABASE_URL, SESSION_SECRET, FREE_DAILY_BUDGET_USD, S3_*, BROWSERBASE_API_KEY, OPENAI_API_KEY, TRUST_PROXY_HOPS), Environment, EnvironmentName, parsePositiveDecimal(), parsePositiveInteger(), parseTrustedProxyHops(), readConfig(), readRunLimits() (+7 more)

### Community 43 - "landing/index.ts"

Cohesion: 0.15
Nodes (14): loadIconFont(), NAV, node(), renderLanding(), renderNav(), startEntranceGate(), node(), renderInstall() (+6 more)

### Community 44 - "Conventional Commits"

Cohesion: 0.21
Nodes (17): Branch naming (<type>/<short-description>), Breaking change marker (! and BREAKING CHANGE footer), Conventional commit types (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test), Conventional Commits, gh pr create --fill-first, Conventional issue and pull request titles, Bug report issue form, Issue template chooser config (blank issues disabled) (+9 more)

### Community 45 - "Swap Test"

Cohesion: 0.15
Nodes (24): AGENTS.md (agent instruction entry point), AGENTS.md as the single agent entry point, .agents/skills/ skills directory, Three product properties: editable output, visible work, steerable work, Keyboard-only accessibility agent, astra-challenge skill, Astra Hackathon, Async tool calling (primitive) (+16 more)

### Community 46 - "EditorSession"

Cohesion: 0.22
Nodes (4): EditorSession, managedAgentRun(), FailureRecorder, watchedSession()

### Community 47 - "agent-run.ts"

Cohesion: 0.13
Nodes (16): AgentLoopDependencies, appliedNatively(), cut(), graphemes, PublishedKind, QueuedCorrection, runAgent(), NativeSteer (+8 more)

### Community 48 - "ResponsesModel"

Cohesion: 0.13
Nodes (10): CallUnanswered, errorCode(), isObject(), narrationOf(), ResponsesApiError, ResponsesModel, safeCode(), usageOf() (+2 more)

### Community 49 - "PlaywrightPhotopeaTransport"

Cohesion: 0.13
Nodes (11): Compact base64 upload transfer, decodePhotopeaWireMessage(), FILE_SLICE_BYTES, LayerhandWindow, PhotopeaPageMessage, PhotopeaQueueHead, PhotopeaWireMessage, PlaywrightPhotopeaTransport (+3 more)

### Community 50 - "Design: Layerhand"

Cohesion: 0.06
Nodes (33): Acceptance, Back button, Back to top, Colour, Common questions, Decisions, Design: Layerhand, Do and do not (+25 more)

### Community 51 - "state.test.ts"

Cohesion: 0.20
Nodes (10): RunHandle, RunRequest, collect(), endOf(), EventOf, ofType(), RunContractSubject, testRunContract() (+2 more)

### Community 52 - "Demo recorder"

Cohesion: 0.11
Nodes (18): Capture, Chatterbox TTS for cloned voice (optional), Deliverable verification, Demo recorder, Environment configuration, Harness structure, Install, Kokoro TTS for default synthetic voice (+10 more)

### Community 53 - "layerhand-mcp/package.json"

Cohesion: 0.09
Nodes (22): bin, layerhand-mcp, description, devDependencies, @modelcontextprotocol/sdk, @types/bun, typescript, zod (+14 more)

### Community 54 - "speak.py"

Cohesion: 0.20
Nodes (13): chatterbox_cache_path(), chatterbox_runtime(), ChatterboxRenderer, in_chatterbox_venv(), KokoroRenderer, main(), Path, Synthesize Layerhand's demo narration with Kokoro or a cloned Chatterbox voice.… (+5 more)

### Community 55 - "warm-editor/measure.ts"

Cohesion: 0.20
Nodes (13): cookieFrom(), filename, image, imageBlob(), imagePath, Measurement, output, summary (+5 more)

### Community 56 - "Layered PSD output (the wedge)"

Cohesion: 0.11
Nodes (29): FR-25: PSD opens without error in Photoshop, Affinity Photo and GIMP, FR-26: every layer named in human words, FR-27: masks and adjustment layers remain editable, FR-33: Product Hunt assets (tagline, description, gallery images, first maker comment), Adobe Photoshop API v2, autoRetouch, BRIA AI, Commercial gate (risk 1: the commercial case vs the survey) (+21 more)

### Community 57 - "record.mjs"

Cohesion: 0.07
Nodes (21): auditCapture(), REQUIRED_BEATS, scrollDuration(), scrollTarget(), smoothScrollTo(), auditLayerNames(), isHumanLayerName(), normaliseName() (+13 more)

### Community 58 - "compilerOptions"

Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleDetection, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck (+5 more)

### Community 59 - "Agent bundle"

Cohesion: 0.08
Nodes (23): Agent bundle, `cancel_run`, Client header, Code layout, Configuration, `get_result`, Handles, Not in this change (+15 more)

### Community 60 - "createGlassObject"

Cohesion: 0.19
Nodes (19): createGlassObject(), applyFit(), applyOptions(), buildModel(), buildRoom(), clearAsset(), clearModel(), dedupeClosingPoint() (+11 more)

### Community 61 - "package.json"

Cohesion: 0.13
Nodes (13): dependencies, ag-psd, playwright-core, three, @types/bun, typescript, @commitlint/cli, @commitlint/config-conventional (+5 more)

### Community 62 - "runtime.ts"

Cohesion: 0.08
Nodes (25): Single-container continuous deployment, ScriptedModel, artifactPublisher(), Application, ArtifactStore, checkOpenAiKey(), Fetch, RunRegistryOptions (+17 more)

### Community 63 - "Ten-image reliability suite design"

Cohesion: 0.17
Nodes (11): Acceptance mapping, Corpus contract, Execution flow, Expected file layout, Goals, Nightly workflow and spending guard, Non-goals, Results and visibility (+3 more)

### Community 64 - "page-routes.ts"

Cohesion: 0.16
Nodes (18): BROTLI_OPTIONS, bundledFiles(), favicon(), isCompressibleText(), marketplaceDocument(), mcpPluginRoutes(), PageFile, PageRoute (+10 more)

### Community 65 - "Layered PSD export implementation plan"

Cohesion: 0.18
Nodes (10): Global constraints, Issue #17 parallel boundary, Layered PSD export implementation plan, Task 1: Migrate the recursive layer contract, Task 2: Parse exported PSD metadata, Task 3: Enforce names and completed-tree policy, Task 4: Build the correlated Photopea export transaction, Task 5: Translate computer actions (+2 more)

### Community 66 - "BrowserbaseClient"

Cohesion: 0.22
Nodes (6): BrowserbaseClient, BrowserbaseError, Fetch, requiredString(), AgentConfig, RecordedRequest

### Community 67 - "bun (package manager and script runner)"

Cohesion: 0.27
Nodes (10): Run bun run graph after modifying code, graphify CLI and knowledge graph (graphify-out/), Query the graph before reading source, Refresh doc and concept nodes with /graphify --update, RTK condensed command output, rtk proxy fallback, bun (package manager and script runner), graphify-labs/graphify skill collection (+2 more)

### Community 68 - "devDependencies"

Cohesion: 0.18
Nodes (11): devDependencies, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, prettier, sharp, @types/bun (+3 more)

### Community 70 - "harness.ts"

Cohesion: 0.12
Nodes (14): DEFAULT_IMAGES, INSTRUCTION, logPath, outputDirectory, records, registry, RunRecord, server (+6 more)

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

Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleDetection, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck (+5 more)

### Community 75 - "live-run.ts"

Cohesion: 0.11
Nodes (15): acceptance, browserbase, ceiling, client, cost, events, imagePath, last (+7 more)

### Community 76 - "responses-model.test.ts"

Cohesion: 0.13
Nodes (5): ModelUnavailableError, SCREENSHOT, Sent, USAGE, next()

### Community 77 - "Canvas UI"

Cohesion: 0.15
Nodes (13): Browser support, Canvas UI, Components, Cursor and click effects, How an effect is built, How it works, Installing, Peel (+5 more)

### Community 78 - "scripts"

Cohesion: 0.13
Nodes (17): Bun full-stack HTML import (src/server/index.ts serves src/web/index.html), Bun 1.4.2 runtime pin (lockfile version 2, frozen installs), Two-stage non-root container pinned to Bun 1.4.2, scripts, build, dev, graph, lint:fix (+9 more)

### Community 79 - "Driving mechanism"

Cohesion: 0.29
Nodes (6): Driving mechanism, Findings from building it, Limits, Result, Running it, What a run does

### Community 80 - "Native steering"

Cohesion: 0.29
Nodes (6): Completed work survived the correction, Limits, Native steering, Result, Running it, The correction, and what the socket saw

### Community 81 - "photopea-document-exporter.test.ts"

Cohesion: 0.08
Nodes (20): ag-psd, PhotopeaDocumentExporter, PhotopeaDocumentBridge, marker, adjustmentKinds, exporter(), LiveLayer, MemoryBridge (+12 more)

### Community 82 - "Jakub Krehel's interface skills"

Cohesion: 0.17
Nodes (12): Colour, How the skills are built, Jakub Krehel's interface skills, Layout, Motion and accessibility, See also, The collection, The user-invoked skills (+4 more)

### Community 83 - "PhotopeaDocumentLoader"

Cohesion: 0.12
Nodes (23): NFR-3: a run starts within five seconds of the button, Browserbase probe command (creation-to-ready latency), Document-count snapshot before file delivery, Per-bridge FIFO for complete document opens, Filename verification through Document.source, Issue #15 installed-Chrome upload measurement, Pre-warmed editor sessions, Spike B2: Browserbase signup and cold-start measurement (+15 more)

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

### Community 88 - "corpus.ts"

Cohesion: 0.18
Nodes (14): isValidHttpsUrl(), isValidRelativeImagePath(), loadReliabilityCorpus(), parseAndValidateCase(), RawCase, ReliabilityCategory, ReliabilityCorpusError, ReliabilityCorpusErrorCode (+6 more)

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

### Community 126 - "live-runner.test.ts"

Cohesion: 0.20
Nodes (6): ReliabilityCommandConfig, ReliabilityCommandDependencies, ReliabilityFailureCode, liveAgentRun(), validEnv, live()

### Community 127 - "plugin.json"

Cohesion: 0.15
Nodes (12): author, name, url, interface, description, extensions, com.openai, category (+4 more)

### Community 128 - "tools.ts"

Cohesion: 0.15
Nodes (13): handle, server, tools, CancelRunInput, DONE, GetResultInput, parseDataUrl(), StartRunInput (+5 more)

### Community 129 - "mcp-artifacts.ts"

Cohesion: 0.22
Nodes (13): outdir, DIST_FILES, loadMcpArtifacts(), mcpArtifacts, packFromSource(), PKG_ROOT, readPackageFile(), readPackedFiles() (+5 more)

### Community 130 - "RunApi"

Cohesion: 0.31
Nodes (3): accepted(), responseJson(), RunApi

### Community 131 - "Product Hunt listing"

Cohesion: 0.25
Nodes (7): Description, First maker comment, Gallery, Links, Product Hunt listing, Tagline, Topics

### Community 132 - "run-reliability.ts"

Cohesion: 0.32
Nodes (10): parseOutputRoot(), parsePositiveDecimal(), parsePositiveInteger(), readReliabilityCommandConfig(), REQUIRED_ENV_VARS, runReliabilityCommand(), ConfigurationError, readSteering() (+2 more)

### Community 133 - "photopea-document-exporter.ts"

Cohesion: 0.11
Nodes (31): selectBytes(), selectPngExport(), selectPsdExport(), validPng(), ADJUSTMENT_DEFAULT_NAMES, ADJUSTMENT_LABELS, assertLayerNames(), buildLayerRenamePlan() (+23 more)

### Community 134 - "agent-run.test.ts"

Cohesion: 0.13
Nodes (6): DEFAULT_RUN_LIMITS, agentRuntime(), run(), runtimes, runTokens, samplePath

### Community 135 - "Run memory"

Cohesion: 0.40
Nodes (4): Limits, Result, Run memory, Running it

### Community 136 - "audit.test.ts"

Cohesion: 0.60
Nodes (4): collectLandingFiles(), cssFiles(), FileText, tsFiles()

### Community 137 - "application.ts"

Cohesion: 0.16
Nodes (10): /health readiness endpoint (process and database readiness), HTTP surface aligned with Contract 3 plus /health, Security and error-handling rules (textContent not innerHTML, restrictive CSP, egress policy, export before release), APPLICATION_CSP, ApplicationDependencies, BASE_SECURITY_HEADERS, json(), PHOTOPEA_HOST_CSP (+2 more)

### Community 138 - "lint"

Cohesion: 0.20
Nodes (11): Prettier owns syntax, not prose, Lint workflow (formatting), Formatting job, .husky/pre-commit hook, lint-staged, lint, printWidth, $schema (+3 more)

### Community 139 - "gcs-lifecycle-workflow.test.ts"

Cohesion: 0.50
Nodes (3): WorkflowDefinition, WorkflowJob, WorkflowStep

### Community 140 - "drawer.ts"

Cohesion: 0.23
Nodes (13): countUp(), DrawerLayer, DrawerStat, icon(), LAYERS, LOG_AFTER, LOG_BEFORE, logStep() (+5 more)

### Community 141 - "photopea-page-session.ts"

Cohesion: 0.17
Nodes (6): KEY_NAMES, layerInfo(), PhotopeaPageSession, playwrightKey(), PNG_SIGNATURE, PSD_SIGNATURE

### Community 142 - "Landing polish"

Cohesion: 0.14
Nodes (13): Acceptance, Landing polish, Motion that shows the product working, Pointer response, Rules every change keeps, Scope, Scroll reveals, Self-playing demos (+5 more)

### Community 143 - "run-memory/measure.ts"

Cohesion: 0.24
Nodes (9): follow(), Followed, frameBytes, measure(), megabytes(), runs, serve(), stepMs (+1 more)

### Community 144 - "layerhand-mcp"

Cohesion: 0.25
Nodes (7): Configuration, Cost, Install in Claude Code, Install in Codex, layerhand-mcp, Privacy, Tools

### Community 145 - "Global constraints"

Cohesion: 0.33
Nodes (5): Documentation drift implementation plan, Global constraints, Task 1: Correct the operating documentation, Task 2: Repair the issue links, Task 3: Publish the reviewed change

### Community 146 - "Landing polish implementation plan"

Cohesion: 0.15
Nodes (12): Dispatch, Global constraints, Landing polish implementation plan, Task 1: Workbench input view, Task 2: Stacked sections, Task 3: Hero replay, Task 4: Run log playback and switcher demo, Task 5: Questions section (+4 more)

### Community 147 - "hero.ts"

Cohesion: 0.31
Nodes (12): enter(), FACTS, icon(), mountReplay(), node(), renderHero(), renderTicker(), renderWindow() (+4 more)

### Community 148 - "SqlMeterStore"

Cohesion: 0.33
Nodes (3): AdmissionDenied, assertMicroUsd(), SqlMeterStore

### Community 149 - "switcher.ts"

Cohesion: 0.33
Nodes (9): HINTS, icon(), LayerKey, LAYERS, Mode, node(), renderSwitcher(), SwitcherLayer (+1 more)

### Community 150 - "subtitles.py"

Cohesion: 0.27
Nodes (10): build(), cards(), Builds the burned-in subtitle track from the same lines.json the narration…, Split into lines of similar length, never mid-word. Two things depend on this…, Group wrapped lines into cards of at most MAX_LINES., ts(), wav_ms(), wrap() (+2 more)

### Community 151 - "SKILL.md"

Cohesion: 0.40
Nodes (4): Before you start, Rules, The loop, When to use it

### Community 152 - "layerhand"

Cohesion: 0.50
Nodes (3): OPENAI_API_KEY, node, layerhand

### Community 154 - "render-og-image.ts"

Cohesion: 0.50
Nodes (3): OUTPUTS, ROOT, server

### Community 155 - "report.ts"

Cohesion: 0.29
Nodes (12): formatCacheRate(), formatCost(), formatReliabilityMarkdown(), formatReliabilityTerminal(), formatStatus(), redactSecrets(), SECRET_PATTERNS, SerializableReliabilityCaseResult (+4 more)

### Community 156 - "tools.test.ts"

Cohesion: 0.24
Nodes (8): RunSnapshot, ToolsConfig, RecordedRequest, startStubServer(), STUB_PNG, STUB_PSD, StubServer, withStub()

### Community 157 - "LandingContext"

Cohesion: 0.28
Nodes (4): LandingContext, icon(), node(), renderWaitlist()

### Community 158 - "replay.browser.test.ts"

Cohesion: 0.25
Nodes (5): INSTRUCTION, LAYERS, stepNumber(), stepText(), VIEWPORT

### Community 159 - "workbench.browser.test.ts"

Cohesion: 0.40
Nodes (3): rgba(), rgbaOf(), SCHEMES

### Community 160 - "application.browser.test.ts"

Cohesion: 0.29
Nodes (6): gotoLanding(), LONG_INSTRUCTION, openInput(), REAL_FRAME_URL, samplePath, ViewportBox

### Community 161 - "playback.browser.test.ts"

Cohesion: 0.29
Nodes (3): STAT_VALUES, STEP_SENTENCES, VIEWPORT

### Community 162 - "steps.ts"

Cohesion: 0.47
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

### Community 166 - "SubtitleLayoutTests"

Cohesion: 0.38
Nodes (3): Path, SubtitleLayoutTests, write_silence()

### Community 167 - "createTools"

Cohesion: 0.41
Nodes (13): createTools(), cancel_run(), get_result(), progress(), start_run(), steer_run(), wait_run(), writeFrame() (+5 more)

### Community 168 - "retain-photopea-production-export.ts"

Cohesion: 0.25
Nodes (6): bridge, fixturePath, samplePath, server, session, viewport

### Community 169 - "schedule.py"

Cohesion: 0.47
Nodes (5): deconflict(), duration_ms(), main(), Prevent narration collisions and reject speech that crosses a visual beat. A…, Push starts later so no line is still speaking when the next begins. Pure so it…

### Community 170 - "Agent instructions"

Cohesion: 0.40
Nodes (4): Agent instructions, Instructions, Project documents, References

### Community 171 - "render.mjs"

Cohesion: 0.33
Nodes (5): failures, page, rawSlides, require, SLIDES

### Community 173 - ".test_rejects_audio_that_outlives_its_visual_beat"

Cohesion: 0.60
Nodes (3): NarrationScheduleTests, Path, write_silence()

### Community 175 - "computer tool (GA)"

Cohesion: 0.40
Nodes (6): Code-execution tool over a persistent Playwright session, computer tool (GA), ComputerAction type, Orchestrator, OpenAI Responses API (gpt-6-astra), Spike A0: code execution or the computer tool

### Community 176 - "drawer.browser.test.ts"

Cohesion: 0.40
Nodes (3): LAYER_GLYPHS, LAYER_NAMES, VIEWPORTS

### Community 182 - "page-routes.test.ts"

Cohesion: 0.25
Nodes (7): binaryRoutesThePageLoads(), expectEverythingSecured(), expectPageFilesServed(), filesThePageLoads(), serve(), servers, textRoutesThePageLoads()

### Community 183 - "page.ts"

Cohesion: 0.58
Nodes (7): escapeHtml(), mcpPageHtml(), mcpClaudeManual(), mcpCodexManual(), mcpOrigin(), mcpOtherManual(), mcpSetupPrompt()

### Community 184 - "profiles.ts"

Cohesion: 0.29
Nodes (6): AgentRunAcceptanceCriteria, AgentRunMeasurement, CACHE_ACCEPTANCE, evaluateAgentRunAcceptance(), PROFILES, THREE_EDIT

### Community 185 - "social-meta.ts"

Cohesion: 0.36
Nodes (4): attribute(), SOCIAL_IMAGE_PATHS, socialMetaTags(), withSocialMeta()

### Community 186 - "Photoshop agent export"

Cohesion: 0.29
Nodes (6): Digests, Files, Limits, Method, Photoshop agent export, Result

### Community 187 - "claude-marketplace.json"

Cohesion: 0.29
Nodes (6): description, name, owner, name, plugins, $schema

### Community 188 - "workspace-screenshots.ts"

Cohesion: 0.53
Nodes (5): capture(), chooseSample(), shot(), startRun(), VIEWPORTS

### Community 190 - "Agent instructions"

Cohesion: 0.40
Nodes (4): Agent instructions, Instructions, Project documents, References

### Community 195 - "test-server.ts"

Cohesion: 0.33
Nodes (3): EXPECTED_QUESTIONS, EXPECTED_SPANS, TestApplicationOptions

## Ambiguous Edges - Review These

- `EXAMPLES` → `Cobalt glass bottle` [AMBIGUOUS]
  src/web/assets/sample-photo.png · relation: conceptually_related_to

## Knowledge Gaps

- **865 isolated node(s):** `$schema`, `singleQuote`, `semi`, `trailingComma`, `running` (+860 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1304 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `EXAMPLES` and `Cobalt glass bottle`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `playwright-core` connect `playwright-core` to `photopea-editor-session.test.ts`, `agent-run.test.ts`, `browserbase-editor-session.ts`, `photopea-action-runner.ts`, `trap-probe.ts`, `photopea-page-session.ts`, `live-frames.browser.test.ts`, `PhotopeaMessage`, `editor/index.ts`, `render-og-image.ts`, `helper.ts`, `replay.browser.test.ts`, `workbench.browser.test.ts`, `application.browser.test.ts`, `playback.browser.test.ts`, `startFramePump`, `stack.browser.test.ts`, `footer.browser.test.ts`, `retain-photopea-production-export.ts`, `drawer.browser.test.ts`, `PlaywrightPhotopeaTransport`, `workspace-screenshots.ts`, `package.json`, `surfaces.browser.test.ts`, `test-server.ts`, `hero.browser.test.ts`, `harness.ts`, `photopea-document-exporter.test.ts`, `PhotopeaDocumentLoader`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `LayerInfo` connect `editor/index.ts` to `app.ts`, `photopea-editor-session.test.ts`, `photopea-document-exporter.ts`, `harness.ts`, `FakeEditorSession`, `agent-run.test.ts`, `photopea-page-session.ts`, `createRecordedFakeEditorSession`, `agent/contract.ts`, `api.ts`, `WarmSessionPool`, `api.test.ts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `Swap Test` connect `Swap Test` to `Layered PSD output (the wedge)`, `Photopea`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `LayerInfo` (e.g. with `Layers panel: Retouched copy above Original photograph` and `LayerInfo type`) actually correct?**
  _`LayerInfo` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `singleQuote`, `semi` to the rest of the system?**
  _865 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.056856187290969896 - nodes in this community are weakly interconnected._
