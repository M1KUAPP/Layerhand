# Graph Report - astra (2026-09-16)

## Corpus Check

- 224 files · ~597,869 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 26 file(s) not represented in the graph (top: (none) 10, .ndjson 10, .psd 3)

## Summary

- 2091 nodes · 4547 edges · 123 communities (96 shown, 25 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 470 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `1879ab2a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)

- app.ts
- image-upload.ts
- ResponsesSocket
- deployed-run.ts
- photopea-editor-session.ts
- ADR-0003: Export a parser-backed Photopea snapshot
- editor/index.ts
- agent-run.ts
- browserbase-editor-session.ts
- PhotopeaBridge
- page-routes.ts
- playwright-core
- artifact-store.ts
- trap-probe.ts
- Four run limits (step cap, spend cap, free runs, daily ceiling)
- SqlWaitlistStore
- photopea-document-loader.ts
- FR-20: apply a typed mid-run correction without discarding completed work
- runtime.ts
- responses-model-steering.test.ts
- RunEvent
- corpus.ts
- Launch acceptance checklist (evening of September 17)
- Sample product photograph (sample-photo.png)
- run-reliability.ts
- live-steer.ts
- run-registry.ts
- server/index.ts
- SteerLedger
- WarmSessionPool
- run.ts
- run-routes.ts
- responses-model.ts
- browserbase-probe.ts
- RunRegistry
- startFramePump
- run-routes.test.ts
- loop.test.ts
- photopea-document-exporter.ts
- run-log.test.ts
- EditorSession
- scripts
- photopea-document-loader.test.ts
- Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle)
- Conventional Commits
- Swap Test
- session.ts
- ResponsesModel
- ComputerAction
- Design: Layerhand
- Layered PSD output (the wedge)
- PhotopeaMessage
- .prettierrc.json
- BrowserbaseClient
- measure.ts
- Photopea
- photopea-transport.ts
- compilerOptions
- agent/contract.ts
- RunRouteDependencies
- package.json
- live-frames.browser.test.ts
- Ten-image reliability suite design
- helper.ts
- Layered PSD export implementation plan
- bun (package manager and script runner)
- devDependencies
- Agent instructions
- Photopea round-trip
- Launch day runbook
- Ten-image reliability suite implementation plan
- harness.ts
- Single-container continuous deployment
- responses-model.test.ts
- Canvas UI
- Pull request template
- Driving mechanism
- Native steering
- photopea-document-exporter.test.ts
- Jakub Krehel's interface skills
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
- Hugeicons
- Iconsax
- Landing video pipeline
- Isocons
- Its Hover
- RecordingBridge

## God Nodes (most connected - your core abstractions)

1. `createLaunchRuntime()` - 38 edges
2. `LayerInfo` - 37 edges
3. `RunRegistry` - 33 edges
4. `EditorSession` - 31 edges
5. `RunEvent` - 30 edges
6. `PhotopeaMessage` - 29 edges
7. `PhotopeaBridge` - 28 edges
8. `playwright-core` - 27 edges
9. `ComputerAction` - 26 edges
10. `ResponsesModel` - 25 edges

## Surprising Connections (you probably didn't know these)

- `Prettier owns syntax, not prose` --references--> `printWidth` [INFERRED]
  docs/agents/rules.md → .prettierrc.json
- `Bun full-stack HTML import (src/server/index.ts serves src/web/index.html)` --conceptually_related_to--> `build` [INFERRED]
  docs/references/launch-application-design.md → package.json
- `Contract tests` --references--> `testRunContract()` [INFERRED]
  docs/TRD.md → src/agent/contract-tests.ts
- `RunRequest` --implements--> `RunRequest type (Contract 2)` [INFERRED]
  src/agent/contract.ts → docs/TRD.md
- `RunEvent` --implements--> `RunEvent stream type (Contract 2)` [INFERRED]
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

## Communities (123 total, 25 thin omitted)

### Community 0 - "app.ts"

Cohesion: 0.06
Nodes (75): Accessibility baseline (keyboard file picker, visible focus, aria-live status, reduced motion), Five-state pure client reducer (landing, input, running, result, error), SSE sequence-id replay and sessionStorage reconnect, RunStatus, accepted(), boolean(), decodeRunEvent(), decodeRunSnapshot() (+67 more)

### Community 1 - "image-upload.ts"

Cohesion: 0.16
Nodes (20): EXIF orientation-aware expected dimensions, Upload validation before session creation, detectFormat(), ERROR_MESSAGES, EXIF_SIGNATURE, ImageUploadError, ImageUploadErrorCode, isStandaloneJpegMarker() (+12 more)

### Community 2 - "ResponsesSocket"

Cohesion: 0.14
Nodes (12): hasToolCall(), HeaderedWebSocket, isObject(), Json, openResponsesSocket(), REPORTED, ResponsesSocket, ResponsesSocketOptions (+4 more)

### Community 3 - "deployed-run.ts"

Cohesion: 0.06
Nodes (45): acceptanceOutcome(), apiUrl(), cookieFrom(), dataPng(), DeployedRunDependencies, DeployedRunError, DeployedRunEvidence, DeployedRunOptions (+37 more)

### Community 4 - "photopea-editor-session.ts"

Cohesion: 0.09
Nodes (9): PhotopeaExportSnapshot, createPhotopeaEditorSession(), PhotopeaEditorSession, PhotopeaSessionWork, createPlaywrightAuxiliaryMouse(), closeWithWork(), documentCalls(), fixture() (+1 more)

### Community 5 - "ADR-0003: Export a parser-backed Photopea snapshot"

Cohesion: 0.05
Nodes (42): ADR-0001: Define a provider-neutral editor session, Alternatives considered, Consequences, Context, Decision, Expose Photopea or Playwright directly, Let the agent loop own browser interaction, References (+34 more)

### Community 6 - "editor/index.ts"

Cohesion: 0.10
Nodes (34): EditorRecording, SessionState, ADJUSTMENT_DEFAULT_NAMES, ADJUSTMENT_LABELS, assertLayerNames(), buildLayerRenamePlan(), DEFAULT_ADJUSTMENT_NAMES, fallbackName() (+26 more)

### Community 7 - "agent-run.ts"

Cohesion: 0.11
Nodes (17): AgentLoopDependencies, cut(), graphemes, PublishedKind, TokenUsage, ASTRA_PRICING, Spend, TokenPricing (+9 more)

### Community 8 - "browserbase-editor-session.ts"

Cohesion: 0.14
Nodes (16): CreatePhotopeaEditorSessionOptions, PHOTOPEA_ASSET_ORIGIN, BrowserbaseSession, browserbaseEditorSession, BrowserbaseEditorSessionOptions, BrowserbaseSessions, closedError(), comparableOrigin() (+8 more)

### Community 9 - "PhotopeaBridge"

Cohesion: 0.06
Nodes (29): NFR-3: a run starts within five seconds of the button, Browserbase probe command (creation-to-ready latency), Compact base64 upload transfer, Document-count snapshot before file delivery, Per-bridge FIFO for complete document opens, Unique app.echoToOE sentinel per scripted call, Issue #15 installed-Chrome upload measurement, Photopea postMessage protocol (+21 more)

### Community 10 - "page-routes.ts"

Cohesion: 0.17
Nodes (11): PAGE_SHELL_PATH, PageRouteOptions, pageRoutes(), attribute(), SOCIAL_IMAGE_PATHS, socialMetaTags(), withSocialMeta(), connect() (+3 more)

### Community 11 - "playwright-core"

Cohesion: 0.08
Nodes (15): playwright-core, AuxiliaryButton, AuxiliaryMouse, KEY_ALIASES, normalizeKey(), PhotopeaActionPage, PhotopeaActionRunner, PhotopeaActionRunnerOptions (+7 more)

### Community 12 - "artifact-store.ts"

Cohesion: 0.08
Nodes (14): artifactPublisher(), ArtifactKind, ArtifactPutRequest, ArtifactStore, createArtifactKey(), EXTENSIONS, MemoryArtifactStore, StoredArtifact (+6 more)

### Community 13 - "trap-probe.ts"

Cohesion: 0.09
Nodes (27): InputFixtureEvidence, persistInputFixture(), recordOutputPath(), temporaryDirectories, jpeg, OUTPUT_DIRECTORY, PHOTOPEA_URL, SerializedMessage (+19 more)

### Community 14 - "Four run limits (step cap, spend cap, free runs, daily ceiling)"

Cohesion: 0.07
Nodes (53): FR-11: progress as step count against the cap with plain-words current action, FR-12: stop at the step cap and return a layered partial result, FR-16: per-user history of past runs (P2, deferred by the non-goals), FR-35: three free runs per visitor, enforced server-side, FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs, FR-37: global daily spend ceiling that stops free-allowance runs, FR-38: paid credit top-ups (P2), NFR-2: no single run exceeds $8 of model spend (+45 more)

### Community 15 - "SqlWaitlistStore"

Cohesion: 0.12
Nodes (17): HTTP surface aligned with Contract 3 plus /health, Bun SQL metering and waitlist tables (visitor_usage, daily_usage, waitlist_emails), Idempotent waitlist endpoint and CSV export (bun run waitlist:export), waitlist:export, createDatabase(), csvField(), formatWaitlistCsv(), main() (+9 more)

### Community 16 - "photopea-document-loader.ts"

Cohesion: 0.33
Nodes (7): Filename verification through Document.source, ImageFormat, ValidatedImageUpload, LoadedPhotopeaDocument, PhotopeaDocumentError, readDocumentCount(), verifyDocument()

### Community 17 - "FR-20: apply a typed mid-run correction without discarding completed work"

Cohesion: 0.15
Nodes (27): FR-10: live view of the editor (at least one frame per 2 s, at most 3 s behind), FR-13: cancel at any point and keep the partial result, FR-14: survive a page reload by resuming the live view, FR-15: show the running session cost in credits, FR-20: apply a typed mid-run correction without discarding completed work, FR-21: acknowledge a correction visibly within three seconds, FR-22: show accepted corrections in a visible list, FR-23: correction that undoes work already done (P2) (+19 more)

### Community 18 - "runtime.ts"

Cohesion: 0.07
Nodes (25): liveAgentRun(), Application, DEFAULT_RUN_LIMITS, Steering, databaseReady(), applyMigrations(), RunRegistryOptions, AgentConfig (+17 more)

### Community 19 - "responses-model-steering.test.ts"

Cohesion: 0.09
Nodes (18): ResponsesModelOptions, CLICK, Connection, created(), Inbox, Json, observe(), SCREENSHOT (+10 more)

### Community 20 - "RunEvent"

Cohesion: 0.24
Nodes (9): ManagedRun server adapter (cache metrics, stop reason, releaseSecrets), RunEvent, EventLog, fakeRun(), runAgent(), copyResult(), RunEventEnvelope, managedFakeRun() (+1 more)

### Community 21 - "corpus.ts"

Cohesion: 0.18
Nodes (14): isValidHttpsUrl(), isValidRelativeImagePath(), loadReliabilityCorpus(), parseAndValidateCase(), RawCase, ReliabilityCategory, ReliabilityCorpusError, ReliabilityCorpusErrorCode (+6 more)

### Community 22 - "Launch acceptance checklist (evening of September 17)"

Cohesion: 0.20
Nodes (20): leonxlnx/taste-skill skill collection, FR-30: public landing page with the differentiator and a silent demo loop, FR-31: email capture live and collecting before launch day, FR-32: thirty-second silent demo recording usable on Product Hunt, Launch acceptance checklist (evening of September 17), Launch schedule (September 12-18, launch Friday 12:01am PT), NFR-1: reliability, eight of ten test runs complete unattended with a valid layered file, Day-2 technical go/no-go (kill switch) (+12 more)

### Community 23 - "Sample product photograph (sample-photo.png)"

Cohesion: 0.18
Nodes (15): Target users: e-commerce photo teams, real-estate photographers, freelance retouchers, EXAMPLES, *.png, Sample product photograph (sample-photo.png), Brushed metal cap, Cast shadow, Cobalt glass bottle, Dust specks (+7 more)

### Community 24 - "run-reliability.ts"

Cohesion: 0.06
Nodes (51): Environment configuration names (DATABASE_URL, SESSION_SECRET, FREE_DAILY_BUDGET_USD, S3_*, BROWSERBASE_API_KEY, OPENAI_API_KEY, TRUST_PROXY_HOPS), parseOutputRoot(), parsePositiveDecimal(), parsePositiveInteger(), readReliabilityCommandConfig(), ReliabilityCommandConfig, ReliabilityCommandDependencies, REQUIRED_ENV_VARS (+43 more)

### Community 25 - "live-steer.ts"

Cohesion: 0.08
Nodes (24): at(), browserbase, ceiling, client, correction, cost, events, imagePath (+16 more)

### Community 26 - "run-registry.ts"

Cohesion: 0.13
Nodes (16): NFR-8: per-run observability (step count, token spend, outcome, failure reason), RunLogRecord one-line completion log, Per-run structured log line, ManagedRun, ManagedRunMetrics, RunFailure, initialSnapshot(), RegisterRun (+8 more)

### Community 27 - "server/index.ts"

Cohesion: 0.19
Nodes (9): FR-29: list the layers on the page after the run, NFR-7: page works at 1280 px and above; mobile out of scope, Bun full-stack HTML import (src/server/index.ts serves src/web/index.html), Desktop workbench layout (1280 px minimum, desktop-required message below), #desktop-required notice (workbench needs a desktop at least 1280 pixels wide), index.html (Layerhand single-page shell), appFile, cssFile (+1 more)

### Community 28 - "SteerLedger"

Cohesion: 0.08
Nodes (9): connected(), stubSocket(), Entry, Settlement, SteerEntry, SteerLedger, SteerState, drain() (+1 more)

### Community 29 - "WarmSessionPool"

Cohesion: 0.13
Nodes (12): claimed(), Entry, imageDigest(), MAX_WARM_SESSIONS, WARM_SESSION_TTL_MS, WarmEditorSession, WarmSessionPool, WarmSessionPoolOptions (+4 more)

### Community 30 - "run.ts"

Cohesion: 0.10
Nodes (23): capCredits, codeLines, codex, decoder, estimateCredits(), events, exported, findSessionLog() (+15 more)

### Community 31 - "run-routes.ts"

Cohesion: 0.20
Nodes (10): apiError(), boundedFormData(), json(), jsonObject(), MAX_RUN_REQUEST_BODY_BYTES, registryError(), RequestTooLargeError, RunRoutes (+2 more)

### Community 32 - "responses-model.ts"

Cohesion: 0.13
Nodes (19): BUTTONS, COMMON_PROMPT, correctionText(), describeCodeResult(), Json, keys(), ModelTransport, number() (+11 more)

### Community 33 - "browserbase-probe.ts"

Cohesion: 0.21
Nodes (9): Spike B2: Browserbase signup and cold-start measurement, BrowserbaseLiveView, BrowserbaseProbeClient, BrowserbaseProbeEvidence, BrowserbaseProbeOptions, createReadOnlyLiveView(), main(), runBrowserbaseProbe() (+1 more)

### Community 34 - "RunRegistry"

Cohesion: 0.22
Nodes (6): measure(), RunRegistry background event pump with sixty-minute terminal retention, copySnapshot(), RunRegistry, RunRegistryError, within()

### Community 35 - "startFramePump"

Cohesion: 0.12
Nodes (12): FRAME_INTERVAL_MS, FramePump, FramePumpOptions, startFramePump(), Phase, pumpFor(), retouch(), select() (+4 more)

### Community 36 - "run-routes.test.ts"

Cohesion: 0.11
Nodes (16): RUN_CEILING_MS, AdmissionDenied, AdmissionRequest, AdmissionResult, assertMicroUsd(), DAILY_LIMIT, MeterReservation, MeterStore (+8 more)

### Community 37 - "loop.test.ts"

Cohesion: 0.07
Nodes (20): CLICK, DONE, EDITABLE_LAYERS, editableFixture(), fixture(), RECORDED_LAYERS, request, RETOUCH (+12 more)

### Community 38 - "photopea-document-exporter.ts"

Cohesion: 0.19
Nodes (15): selectBytes(), selectPngExport(), selectPsdExport(), validPng(), expectedTree(), noDocumentError(), PhotopeaDocumentExporterOptions, renameScript() (+7 more)

### Community 39 - "run-log.test.ts"

Cohesion: 0.17
Nodes (13): RunStopReason, RunFailureCode, createRunLogger(), failureReason(), redact(), RunLoggerOptions, runLogLine, RunLogStore (+5 more)

### Community 40 - "EditorSession"

Cohesion: 0.06
Nodes (30): FR-28: flattened PNG preview alongside the PSD, EditorSession interface (Contract 1), FakeEditorSession, ORIGINAL, cloneAction(), copyBytes(), createRecordedFakeEditorSession(), FakeEditorSession (+22 more)

### Community 41 - "scripts"

Cohesion: 0.18
Nodes (15): Bun 1.4.2 runtime pin (lockfile version 2, frozen installs), /health readiness endpoint (process and database readiness), Two-stage non-root container pinned to Bun 1.4.2, scripts, build, dev, graph, lint:fix (+7 more)

### Community 42 - "photopea-document-loader.test.ts"

Cohesion: 0.26
Nodes (5): MAX_IMAGE_BYTES, expectMalformed(), withApp1(), jpeg(), png()

### Community 43 - "Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle)"

Cohesion: 0.38
Nodes (6): FR-1: accept one JPEG/PNG image up to 20 MB and 6000 px, FR-3: reject invalid input with a specific reason, FR-5: one sample image usable without uploading, Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle), API error shape { code, message }, Upload form (picker and drop, inline rejections, three example instructions, bundled sample photograph)

### Community 44 - "Conventional Commits"

Cohesion: 0.23
Nodes (15): Branch naming (<type>/<short-description>), Conventional commit types (build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test), Conventional Commits, gh pr create --fill-first, Conventional issue and pull request titles, Bug report issue form, Issue template chooser config (blank issues disabled), Feature request issue form (+7 more)

### Community 45 - "Swap Test"

Cohesion: 0.14
Nodes (24): Contest outcome against the four inferred criteria, GPT-6 Astra, Risk: reliability of long GUI control, OSWorld V2-Offline benchmark, Astra cannot generate an image (text-output-only irony), Keyboard-only accessibility agent, Astra Hackathon, Async tool calling (primitive) (+16 more)

### Community 46 - "session.ts"

Cohesion: 0.09
Nodes (20): LayerhandWindow, PhotopeaPageMessage, PhotopeaWireMessage, PlaywrightPhotopeaTransportOptions, Button, LayerKind, LayerMaskInfo, LayerMaskKind (+12 more)

### Community 48 - "ResponsesModel"

Cohesion: 0.21
Nodes (6): errorCode(), isObject(), narrationOf(), ResponsesApiError, ResponsesModel, safeCode()

### Community 49 - "ComputerAction"

Cohesion: 0.17
Nodes (7): KEY_NAMES, layerInfo(), PhotopeaPageSession, playwrightKey(), PNG_SIGNATURE, PSD_SIGNATURE, ComputerAction

### Community 50 - "Design: Layerhand"

Cohesion: 0.11
Nodes (18): Acceptance, Colour, Decisions, Design: Layerhand, Do and do not, Fallbacks, Hero: layered parallax, Icons (+10 more)

### Community 51 - "Layered PSD output (the wedge)"

Cohesion: 0.14
Nodes (24): FR-25: PSD opens without error in Photoshop, Affinity Photo and GIMP, FR-26: every layer named in human words, FR-27: masks and adjustment layers remain editable, FR-33: Product Hunt assets (tagline, description, gallery images, first maker comment), Adobe Photoshop API v2, autoRetouch, BRIA AI, Commercial gate (risk 1: the commercial case vs the survey) (+16 more)

### Community 52 - "PhotopeaMessage"

Cohesion: 0.11
Nodes (7): PhotopeaConfiguration, PhotopeaMessage, ControlledTransport, LateSentinelTransport, MemoryTransport, MemoryBridge, ImageTransport

### Community 53 - ".prettierrc.json"

Cohesion: 0.40
Nodes (4): $schema, semi, singleQuote, trailingComma

### Community 54 - "BrowserbaseClient"

Cohesion: 0.24
Nodes (5): BrowserbaseClient, BrowserbaseError, Fetch, requiredString(), RecordedRequest

### Community 55 - "measure.ts"

Cohesion: 0.20
Nodes (13): cookieFrom(), filename, image, imageBlob(), imagePath, Measurement, output, summary (+5 more)

### Community 56 - "Photopea"

Cohesion: 0.15
Nodes (22): FR-2: free-text instruction of up to 500 characters, FR-4: three worked example instructions that fill the box on click, Photopea licence question (answered: automated and commercial use permitted), Risk: the scripting escape hatch, ag-psd fallback, Browser provider shortlist (Browserbase, Anchor, Hyperbrowser, Steel), Browserbase, Editor adapter (+14 more)

### Community 57 - "photopea-transport.ts"

Cohesion: 0.12
Nodes (12): server, bridge, fixturePath, samplePath, server, session, viewport, createPhotopeaHostHtml() (+4 more)

### Community 58 - "compilerOptions"

Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleDetection, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck (+5 more)

### Community 59 - "agent/contract.ts"

Cohesion: 0.13
Nodes (13): RunHandle, RunRequest, RunResult, collect(), endOf(), EventOf, ofType(), RunContractSubject (+5 more)

### Community 61 - "package.json"

Cohesion: 0.15
Nodes (11): dependencies, ag-psd, playwright-core, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, prettier (+3 more)

### Community 62 - "live-frames.browser.test.ts"

Cohesion: 0.14
Nodes (11): Security and error-handling rules (textContent not innerHTML, restrictive CSP, egress policy, export before release), APPLICATION_CSP, ApplicationDependencies, BASE_SECURITY_HEADERS, createApplication(), json(), PHOTOPEA_HOST_CSP, secured() (+3 more)

### Community 63 - "Ten-image reliability suite design"

Cohesion: 0.17
Nodes (11): Acceptance mapping, Corpus contract, Execution flow, Expected file layout, Goals, Nightly workflow and spending guard, Non-goals, Results and visibility (+3 more)

### Community 64 - "helper.ts"

Cohesion: 0.20
Nodes (9): api, codeLog, host, [imagePath, outputArgument, portArgument], output, port, runner, screenshot() (+1 more)

### Community 65 - "Layered PSD export implementation plan"

Cohesion: 0.18
Nodes (10): Global constraints, Issue #17 parallel boundary, Layered PSD export implementation plan, Task 1: Migrate the recursive layer contract, Task 2: Parse exported PSD metadata, Task 3: Enforce names and completed-tree policy, Task 4: Build the correlated Photopea export transaction, Task 5: Translate computer actions (+2 more)

### Community 67 - "bun (package manager and script runner)"

Cohesion: 0.27
Nodes (10): Run bun run graph after modifying code, graphify CLI and knowledge graph (graphify-out/), Query the graph before reading source, Refresh doc and concept nodes with /graphify --update, RTK condensed command output, rtk proxy fallback, bun (package manager and script runner), graphify-labs/graphify skill collection (+2 more)

### Community 68 - "devDependencies"

Cohesion: 0.20
Nodes (10): devDependencies, @commitlint/cli, @commitlint/config-conventional, husky, lint-staged, prettier, sharp, @types/bun (+2 more)

### Community 70 - "Agent instructions"

Cohesion: 0.25
Nodes (8): AGENTS.md (agent instruction entry point), AGENTS.md as the single agent entry point, .agents/skills/ skills directory, astra-challenge skill, Agent instructions, Instructions, Project documents, References

### Community 71 - "Photopea round-trip"

Cohesion: 0.22
Nodes (8): Digests, Files, Limits, Photopea round-trip, Photoshop verification, Result, Running it, Timing definitions

### Community 72 - "Launch day runbook"

Cohesion: 0.22
Nodes (8): Changing a limit in a hurry, Launch day runbook, Rotating the server key, See also, The clock, The freeze, and the no-deploy rule, When the providers misbehave, Where to look when something is wrong

### Community 73 - "Ten-image reliability suite implementation plan"

Cohesion: 0.22
Nodes (8): Global constraints, Task 1: Add and validate the representative corpus, Task 2: Run cases sequentially and validate their PSDs, Task 3: Persist and format inspectable reports, Task 4: Add the paid production command, Task 5: Publish the guarded nightly result, Task 6: Run final verification and prepare review, Ten-image reliability suite implementation plan

### Community 74 - "harness.ts"

Cohesion: 0.12
Nodes (15): AsyncFunction, pageCodeRunner(), DEFAULT_IMAGES, INSTRUCTION, logPath, outputDirectory, records, registry (+7 more)

### Community 75 - "Single-container continuous deployment"

Cohesion: 0.20
Nodes (9): Code-execution tool over a persistent Playwright session, computer tool (GA), ComputerAction type, Orchestrator, OpenAI Responses API (gpt-6-astra), Single-container continuous deployment, Single long-lived server process (not serverless), Spike A0: code execution or the computer tool (+1 more)

### Community 76 - "responses-model.test.ts"

Cohesion: 0.25
Nodes (3): SCREENSHOT, Sent, USAGE

### Community 77 - "Canvas UI"

Cohesion: 0.15
Nodes (13): Browser support, Canvas UI, Components, Cursor and click effects, How an effect is built, How it works, Installing, Peel (+5 more)

### Community 78 - "Pull request template"

Cohesion: 0.28
Nodes (9): Prettier owns syntax, not prose, Breaking change marker (! and BREAKING CHANGE footer), Pull request template, Lint workflow (formatting), Formatting job, .husky/pre-commit hook, lint-staged, lint (+1 more)

### Community 79 - "Driving mechanism"

Cohesion: 0.29
Nodes (6): Driving mechanism, Findings from building it, Limits, Result, Running it, What a run does

### Community 80 - "Native steering"

Cohesion: 0.29
Nodes (6): Completed work survived the correction, Limits, Native steering, Result, Running it, The correction, and what the socket saw

### Community 81 - "photopea-document-exporter.test.ts"

Cohesion: 0.10
Nodes (20): ag-psd, PhotopeaDocumentExporter, PhotopeaDocumentBridge, PhotopeaEditorSessionDependencies, adjustmentKinds, exporter(), LiveLayer, namedPsd() (+12 more)

### Community 82 - "Jakub Krehel's interface skills"

Cohesion: 0.17
Nodes (12): Colour, How the skills are built, Jakub Krehel's interface skills, Layout, Motion and accessibility, See also, The collection, The user-invoked skills (+4 more)

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

## Ambiguous Edges - Review These

- `EXAMPLES` → `Cobalt glass bottle` [AMBIGUOUS]
  src/web/assets/sample-photo.png · relation: conceptually_related_to

## Knowledge Gaps

- **548 isolated node(s):** `$schema`, `singleQuote`, `semi`, `trailingComma`, `running` (+543 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 856 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `EXAMPLES` and `Cobalt glass bottle`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `playwright-core` connect `playwright-core` to `helper.ts`, `browserbase-probe.ts`, `startFramePump`, `photopea-editor-session.ts`, `browserbase-editor-session.ts`, `PhotopeaBridge`, `harness.ts`, `trap-probe.ts`, `session.ts`, `browserbase-network.integration.test.ts`, `ComputerAction`, `photopea-document-exporter.test.ts`, `runtime.ts`, `Sample product photograph (sample-photo.png)`, `photopea-transport.ts`, `package.json`, `live-frames.browser.test.ts`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `LayerInfo` connect `editor/index.ts` to `app.ts`, `photopea-editor-session.ts`, `photopea-document-exporter.ts`, `EditorSession`, `harness.ts`, `session.ts`, `ComputerAction`, `FR-20: apply a typed mid-run correction without discarding completed work`, `runtime.ts`, `agent/contract.ts`, `WarmSessionPool`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `SqlMeterStore` connect `run-routes.test.ts` to `runtime.ts`, `live-frames.browser.test.ts`, `SqlWaitlistStore`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `LayerInfo` (e.g. with `Layers panel: Retouched copy above Original photograph` and `LayerInfo type`) actually correct?**
  _`LayerInfo` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `singleQuote`, `semi` to the rest of the system?**
  _548 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.062038073908174694 - nodes in this community are weakly interconnected._
