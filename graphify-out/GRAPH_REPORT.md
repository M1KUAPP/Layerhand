# Graph Report - astra  (2026-09-15)

## Corpus Check
- 109 files · ~150,698 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1113 nodes · 2571 edges · 59 communities (56 shown, 2 thin omitted)
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 473 edges (avg confidence: 0.87)
- Token cost: 1,059,388 input · 0 output

## Community Hubs (Navigation)
- Git Workflow & Repo Tooling
- Run Contract & API Client
- Run Routes & Visitor Admission
- Single-Page Workbench UI
- Run Cost, Limits & Metering
- Artifact Storage
- Image Upload Validation
- Browserbase Client & Probe
- Config, Scripts & Health
- Meter Store & Reservations
- Playwright Photopea Transport
- Photopea Bridge Tests
- Launch Design, Testing & Deploy
- Launch Criteria & Go/No-Go
- Waitlist Store & Migrations
- Contracts, Steering & Live View
- Sample Photo & Upload Form
- Server Runtime Composition
- Photopea Protocol & Traps
- Recorded Editor Fixtures
- Layerhand Pitch & Model Leverage
- Live Photopea Loader Probes
- Session Types & Viewport
- TRD Top-Level Sections
- FakeEditorSession Internals
- Photopea Transport Interface
- Ideation Rounds
- Markdown Layout Rules
- TypeScript Compiler Options
- Competition & Commercial Gate
- Layered PSD Wedge & Launch Copy
- Product Brief Sections
- Swap Test & Primitives
- Application Security Headers
- Markdown Style Basics
- Document Loader Verification
- Fake Session Test Fixtures
- Route Dependencies & Waitlist
- Agent Behavioral Guidelines
- ComputerAction Session Types
- PRD Sections
- Computer Use & Fallbacks
- Markdown Link Rules
- Markdown Code Rules
- Agent Entry Points & Skills
- PRD Requirement Groups
- TRD Browser Runtime
- EditorSession Interface
- Markdown Heading Rules
- TRD Editor Adapter
- Agent Tooling Decision (A0)
- Editor Session Contract Tests
- Non-Goals & Exclusions
- Competition Sections
- TRD Cost Control
- TRD Agent Loop
- Line Limit & Exceptions
- TRD Three Contracts

## God Nodes (most connected - your core abstractions)
1. `Project conventions (rules.md)` - 28 edges
2. `TRD: Layerhand` - 27 edges
3. `Product Hunt ideas: GPT-6 Astra Challenge` - 26 edges
4. `Launch application design` - 26 edges
5. `RunRegistry` - 25 edges
6. `Layerhand` - 23 edges
7. `FakeEditorSession` - 23 edges
8. `Sample product photograph (sample-photo.png)` - 23 edges
9. `PhotopeaMessage` - 22 edges
10. `createLaunchRuntime()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `openInput()` --references--> `Sample product photograph (sample-photo.png)`  [INFERRED]
  test/web/application.browser.test.ts → src/web/assets/sample-photo.png
- `Photopea tool bar (marquee, lasso, magic wand, brush, pen, type tools)` --conceptually_related_to--> `Scripted vs GUI-driven split (the line that protects the premise)`  [INFERRED]
  src/editor/fixtures/photopea-frame.png → docs/TRD.md
- `Prettier owns syntax, not prose` --references--> `printWidth`  [INFERRED]
  docs/agents/rules.md → .prettierrc.json
- `Server composition` --references--> `ApplicationDependencies`  [EXTRACTED]
  docs/references/launch-application-design.md → src/server/application.ts
- `Browserbase boundary` --conceptually_related_to--> `PlaywrightPhotopeaTransport`  [INFERRED]
  docs/references/launch-application-design.md → src/editor/playwright-photopea-transport.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agent instruction bundle loaded through AGENTS.md** — agents, claude, gemini, docs_agents_andrej_karpathy_skills, docs_agents_graphify, docs_agents_rtk, docs_agents_rules, docs_agents_skills, docs_references_git_workflow, docs_references_markdown_style, docs_product_product_layerhand, docs_prd_prd_layerhand, docs_trd_trd_layerhand, docs_producthunt_ideas_product_hunt_ideas_gpt_6_astra_challenge [EXTRACTED 1.00]
- **Markdown style rules summarized as the rules.md Writing convention** — docs_agents_rules, docs_references_markdown_style_character_line_limit, docs_references_markdown_style_atx_style_headings, docs_references_markdown_style_heading_capitalization, docs_references_markdown_style_single_h1_heading, docs_references_markdown_style_document_layout, docs_references_markdown_style_informative_link_titles [EXTRACTED 1.00]
- **Ideation synthesis that produced Layerhand** — docs_producthunt_ideas_computer_use, docs_producthunt_ideas_hosted_browser_computer_use, docs_producthunt_ideas_mid_turn_steering, docs_producthunt_ideas_computer_use_x_steering, docs_producthunt_ideas_web_software_unlock, docs_producthunt_ideas_text_only_inversion, docs_producthunt_ideas_swap_test, readme_layerhand [EXTRACTED 1.00]
- **Checks sharing the commitlint rule set** — commitlint_config, husky_commit_msg, github_workflows_conventional_lint, github_workflows_issue_title_lint [EXTRACTED 1.00]
- **Three contracts and fakes enabling a three-way parallel build** — docs_trd_editorsession, docs_trd_runrequest, docs_trd_runevent, docs_trd_runresult, docs_trd_runhandle, docs_trd_http_api_surface, docs_trd_fake_editor_session, docs_trd_fake_run, docs_trd_stub_http_server, docs_trd_contract_tests [EXTRACTED 1.00]
- **Four enforced run limits** — docs_trd_run_limits, docs_prd_fr_12, docs_prd_nfr_2, docs_prd_fr_35, docs_prd_fr_37 [EXTRACTED 1.00]
- **Photopea results verified by reading state back** — docs_trd_photopea_traps, docs_trd_echo_sentinel, docs_trd_document_count_snapshot, docs_trd_document_source_filename_verification [INFERRED 0.85]
- **Run admission pipeline: validate the image, establish the visitor, admit against the meter, store the upload, then start the run** — docs_references_launch_application_design_admission_order, src_editor_image_upload_validateimageupload, src_server_visitor_identity_establishvisitoridentity, src_server_meter_store_meterstore_admit, src_server_artifact_store_artifactstore_put, src_server_run_routes_runroutes_start [INFERRED 0.85]
- **Three product consequences of quadratic screenshot cost: hard step cap, aggressive caching, never unmetered** — docs_product_quadratic_screenshot_cost, docs_product_step_cap_product_parameter, docs_product_aggressive_caching, docs_product_metered_credits_model [EXTRACTED 1.00]
- **Five client reducer states and the app.ts renderers that draw them** — docs_references_launch_application_design_client_reducer_states, src_web_state_reduceclientstate, src_web_app_renderlanding, src_web_app_renderinput, src_web_app_renderrunning, src_web_app_renderresult, src_web_app_rendererror [INFERRED 0.85]
- **Recorded Photopea session fixtures loaded into one EditorRecording** — src_editor_fake_editor_session_createrecordedfakeeditorsession, src_editor_fake_editor_session_editorrecording, src_editor_fixtures_photopea_frame_image, src_editor_fixtures_document_preview_image [EXTRACTED 1.00]
- **Flattened document preview (FR-28) from contract to recorded fixture and its test** — docs_prd_fr_28, src_editor_session_editorsession_exportpreview, src_editor_fake_editor_session_fakeeditorsession_exportpreview, src_editor_fixtures_document_preview_image, test_editor_recorded_fake_editor_session_test [INFERRED 0.85]
- **Recorded Photopea session: editor frame, flattened preview, and layer metadata** — src_editor_fixtures_photopea_frame_image, src_editor_fixtures_document_preview_image, src_editor_fake_editor_session_editorrecording, src_editor_fake_editor_session_createrecordedfakeeditorsession [EXTRACTED 1.00]
- **Original photograph and Retouched copy layer pair: shown, recorded, and asserted** — src_editor_fixtures_photopea_frame_layers_panel, src_editor_fixtures_photopea_frame_history_panel, src_editor_fake_editor_session_createrecordedfakeeditorsession, test_editor_recorded_fake_editor_session_test [INFERRED 0.95]
- **Use-the-sample-photograph flow, from button to run upload (FR-5)** — docs_prd_fr_5, src_web_app_renderinput, src_web_app_choosesample, src_web_assets_sample_photo_image, src_web_app_choosefile, src_web_api_runapi_start, test_web_application_browser_test_openinput [INFERRED 0.95]

## Communities (59 total, 2 thin omitted)

### Community 0 - "Git Workflow & Repo Tooling"
Cohesion: 0.05
Nodes (77): Graphify, graphify CLI and knowledge graph (graphify-out/), Query the graph before reading source, Run graphify update after modifying code, RTK condensed command output, RTK, rtk proxy fallback, Project conventions (rules.md) (+69 more)

### Community 1 - "Run Contract & API Client"
Cohesion: 0.06
Nodes (51): NFR-8: per-run observability (step count, token spend, outcome, failure reason), RunLogRecord one-line completion log, LayerInfo type, Per-run structured log line, RunResult type (Contract 2), RunEvent, RunHandle, RunRequest (+43 more)

### Community 2 - "Run Routes & Visitor Admission"
Cohesion: 0.07
Nodes (30): FR-14: survive a page reload by resuming the live view, FR-3: reject invalid input with a specific reason, Run admission order (body ceiling, instruction, image, visitor identity, meter, upload, RunHandle), API error shape { code, message }, RunRegistry background event pump with sixty-minute terminal retention, Signed visitor cookie and HMAC visitor key (TRUST_PROXY_HOPS), SSE sequence-id replay and sessionStorage reconnect, Run registry (+22 more)

### Community 3 - "Single-Page Workbench UI"
Cohesion: 0.09
Nodes (53): FR-15: show the running session cost in credits, FR-29: list the layers on the page after the run, NFR-7: page works at 1280 px and above; mobile out of scope, Accessibility baseline (keyboard file picker, visible focus, aria-live status, reduced motion), Five-state pure client reducer (landing, input, running, result, error), Desktop workbench layout (1280 px minimum, desktop-required message below), Single-page web application, api (+45 more)

### Community 4 - "Run Cost, Limits & Metering"
Cohesion: 0.09
Nodes (46): FR-11: progress as step count against the cap with plain-words current action, FR-12: stop at the step cap and return a layered partial result, FR-2: free-text instruction of up to 500 characters, FR-35: three free runs per visitor, enforced server-side, FR-36: user-supplied OpenAI API key, session-only, never written to disk or logs, FR-37: global daily spend ceiling that stops free-allowance runs, FR-38: paid credit top-ups (P2), FR-4: three worked example instructions that fill the box on click (+38 more)

### Community 5 - "Artifact Storage"
Cohesion: 0.08
Nodes (14): NFR-6: uploaded images deleted within twenty-four hours, Artifact storage, ArtifactKind, ArtifactPutRequest, ArtifactStore, createArtifactKey(), EXTENSIONS, MemoryArtifactStore (+6 more)

### Community 6 - "Image Upload Validation"
Cohesion: 0.11
Nodes (26): FR-1: accept one JPEG/PNG image up to 20 MB and 6000 px, EXIF orientation-aware expected dimensions, Upload validation before session creation, detectFormat(), ERROR_MESSAGES, EXIF_SIGNATURE, ImageUploadError, ImageUploadErrorCode (+18 more)

### Community 7 - "Browserbase Client & Probe"
Cohesion: 0.12
Nodes (16): Browserbase boundary, Spike B2: Browserbase signup and cold-start measurement, BrowserbaseClient, BrowserbaseError, BrowserbaseLiveView, BrowserbaseSession, Fetch, requiredString() (+8 more)

### Community 8 - "Config, Scripts & Health"
Cohesion: 0.10
Nodes (29): Bun full-stack HTML import (src/server/index.ts serves src/web/index.html), Bun 1.4.2 runtime pin (lockfile version 2, frozen installs), Environment configuration names (DATABASE_URL, SESSION_SECRET, FREE_DAILY_BUDGET_USD, S3_*, BROWSERBASE_API_KEY, OPENAI_API_KEY, TRUST_PROXY_HOPS), /health readiness endpoint (process and database readiness), HTTP surface aligned with Contract 3 plus /health, Two-stage non-root container pinned to Bun 1.4.2, Idempotent waitlist endpoint and CSV export (bun run waitlist:export), scripts (+21 more)

### Community 9 - "Meter Store & Reservations"
Cohesion: 0.14
Nodes (14): AdmissionDenied, AdmissionRequest, AdmissionResult, assertMicroUsd(), DAILY_LIMIT, MeterReservation, MeterStore, SqlMeterStore (+6 more)

### Community 10 - "Playwright Photopea Transport"
Cohesion: 0.13
Nodes (14): Compact base64 upload transfer, playwright-core, PhotopeaBridgeOptions, PhotopeaProtocolError, PhotopeaProtocolErrorCode, createPhotopeaHostHtml(), PHOTOPEA_CONFIGURATION, PHOTOPEA_ORIGIN (+6 more)

### Community 11 - "Photopea Bridge Tests"
Cohesion: 0.10
Nodes (7): PhotopeaDocumentBridge, PhotopeaConfiguration, PhotopeaMessage, ControlledTransport, LateSentinelTransport, MemoryTransport, RecordingBridge

### Community 12 - "Launch Design, Testing & Deploy"
Cohesion: 0.09
Nodes (21): Goal-Driven Execution, obra/superpowers skill collection, Delivery structure, External checkpoints and issue closure, Goals, Input and admission order, Launch application design, Metering and waitlist persistence (+13 more)

### Community 13 - "Launch Criteria & Go/No-Go"
Cohesion: 0.16
Nodes (25): leonxlnx/taste-skill skill collection, FR-30: public landing page with the differentiator and a silent demo loop, FR-31: email capture live and collecting before launch day, FR-32: thirty-second silent demo recording usable on Product Hunt, Launch acceptance checklist (evening of September 17), Launch schedule (September 12-18, launch Friday 12:01am PT), NFR-1: reliability, eight of ten test runs complete unattended with a valid layered file, Single-screen core flow (+17 more)

### Community 14 - "Waitlist Store & Migrations"
Cohesion: 0.16
Nodes (13): Bun SQL metering and waitlist tables (visitor_usage, daily_usage, waitlist_emails), applyMigrations(), csvField(), formatWaitlistCsv(), main(), normalizeWaitlistEmail(), SqlWaitlistStore, WaitlistAddResult (+5 more)

### Community 15 - "Contracts, Steering & Live View"
Cohesion: 0.18
Nodes (22): FR-10: live view of the editor (at least one frame per 2 s, at most 3 s behind), FR-13: cancel at any point and keep the partial result, FR-20: apply a typed mid-run correction without discarding completed work, FR-21: acknowledge a correction visibly within three seconds, FR-22: show accepted corrections in a visible list, FR-23: correction that undoes work already done (P2), Three product properties: editable output, visible work, steerable work, Mid-turn steering (primitive) (+14 more)

### Community 16 - "Sample Photo & Upload Form"
Cohesion: 0.17
Nodes (18): FR-5: one sample image usable without uploading, Target users: e-commerce photo teams, real-estate photographers, freelance retouchers, Upload form (picker and drop, inline rejections, three example instructions, bundled sample photograph), EXAMPLES, *.png, Generation prompt, Sample product photograph (sample-photo.png), Brushed metal cap (+10 more)

### Community 17 - "Server Runtime Composition"
Cohesion: 0.17
Nodes (16): ManagedRun server adapter (cache metrics, stop reason, releaseSecrets), Server composition, fakeRun(), Application, createApplication(), createDatabase(), databaseReady(), RunStopReason (+8 more)

### Community 18 - "Photopea Protocol & Traps"
Cohesion: 0.21
Nodes (12): NFR-3: a run starts within five seconds of the button, Document-count snapshot before file delivery, Per-bridge FIFO for complete document opens, Unique app.echoToOE sentinel per scripted call, Photopea, Photopea Action Manager stub (stringIDToTypeID lookup table), Photopea postMessage protocol, Photopea known traps (+4 more)

### Community 19 - "Recorded Editor Fixtures"
Cohesion: 0.18
Nodes (15): FR-28: flattened PNG preview alongside the PSD, EditorSession interface (Contract 1), FakeEditorSession, ORIGINAL, createRecordedFakeEditorSession(), document-preview.png (flattened document preview fixture), Minimalist long-exposure seascape with a small rocky island on the horizon, History panel: Open, Name Change, Duplicate Layer, Name Change (+7 more)

### Community 20 - "Layerhand Pitch & Model Leverage"
Cohesion: 0.13
Nodes (17): Contest outcome against the four inferred criteria, GPT-6 Astra, Risk: reliability of long GUI control, OSWorld V2-Offline benchmark, Astra cannot generate an image (text-output-only irony), Keyboard-only accessibility agent, Steerable financial model built in Sheets, Idea shortlist scoring (+9 more)

### Community 21 - "Live Photopea Loader Probes"
Cohesion: 0.20
Nodes (13): Browserbase probe command (creation-to-ready latency), Image resolution vs screenshot viewport, Issue #15 installed-Chrome upload measurement, Screenshot policy: 1440x900, detail original, no downscaling, browserbase:probe, Browserbase probe usage against a deployed /photopea-host, sharp, PhotopeaDocumentLoader (+5 more)

### Community 22 - "Session Types & Viewport"
Cohesion: 0.15
Nodes (13): LayerhandWindow, PhotopeaWireMessage, PlaywrightPhotopeaTransportOptions, Button, Pt, Viewport, ActionVariantKeyChecks, Assert (+5 more)

### Community 23 - "TRD Top-Level Sections"
Cohesion: 0.12
Nodes (16): An agent driving a browser is an attack surface, Decisions deferred to spikes, Deployment, Fakes first, Input validation, Observability, Repository layout, Resolution: two different things (+8 more)

### Community 24 - "FakeEditorSession Internals"
Cohesion: 0.23
Nodes (3): cloneAction(), copyBytes(), FakeEditorSession

### Community 26 - "Ideation Rounds"
Cohesion: 0.13
Nodes (15): Before committing, Product Hunt ideas: GPT-6 Astra Challenge, Round 10 — The five-day filter, and the text-only inversion, Round 1 — Computer use, desktop-native, Round 2 — Computer use, hosted browser only, Round 3 — Million-token single-pass context, Round 4 — Async tool calling, Round 5 — Mid-turn steering (+7 more)

### Community 27 - "Markdown Layout Rules"
Cohesion: 0.20
Nodes (14): Better/Best Rule, Code spans for inline code and escaping, Google docguide philosophy, Document layout, Gitiles, Images, Informative link titles, Lazy list numbering and 4-space nested indent (+6 more)

### Community 28 - "TypeScript Compiler Options"
Cohesion: 0.14
Nodes (13): compilerOptions, lib, module, moduleDetection, moduleResolution, noEmit, noUncheckedIndexedAccess, skipLibCheck (+5 more)

### Community 29 - "Competition & Commercial Gate"
Cohesion: 0.26
Nodes (13): Adobe Photoshop API v2, autoRetouch, BRIA AI, Commercial gate (risk 1: the commercial case vs the survey), Competition survey (twenty-six products plus a four-product follow-up), Adobe Firefly Creative Production (Remove Background preset, masked layered PSD), Adobe Firefly Services (enterprise access), Flat-output competitors (Photoroom, Clipdrop, Pixelcut, Claid, Pixelbin, remove.bg, Evoto, Imagen AI, Aftershoot, BoxBrownie) (+5 more)

### Community 30 - "Layered PSD Wedge & Launch Copy"
Cohesion: 0.29
Nodes (12): FR-25: PSD opens without error in Photoshop, Affinity Photo and GIMP, FR-26: every layer named in human words, FR-27: masks and adjustment layers remain editable, FR-33: Product Hunt assets (tagline, description, gallery images, first maker comment), Judged-well criteria (differentiator stated after a silent viewing; layer stack survives a retoucher's inspection), Layered PSD output (the wedge), Remaining gap: no self-serve single-pass PSD known to be named, masked and adjustment-layered, First maker comment opening line (+4 more)

### Community 31 - "Product Brief Sections"
Cohesion: 0.17
Nodes (12): Business model, Non-goals, Open questions, Product: Layerhand, Risks and the kill switch, See also, Success criteria, The problem (+4 more)

### Community 32 - "Swap Test & Primitives"
Cohesion: 0.31
Nodes (11): Risk: the scripting escape hatch, Async tool calling (primitive), Whole-corpus contradiction finder (runner-up), Inferred judging rubric (WebMCP Challenge criteria), Million-token single-pass context (primitive), Persisted reasoning and notes (primitive), Programmatic tool calling and orchestration (primitive), Swap Test (+3 more)

### Community 33 - "Application Security Headers"
Cohesion: 0.22
Nodes (7): Security and error-handling rules (textContent not innerHTML, restrictive CSP, egress policy, export before release), APPLICATION_CSP, ApplicationDependencies, BASE_SECURITY_HEADERS, json(), PHOTOPEA_HOST_CSP, secured()

### Community 34 - "Markdown Style Basics"
Cohesion: 0.18
Nodes (11): Better is better than best, Capitalization, CommonMark spec, Lists, Markdown style guide, Nested list spacing, Place the `[TOC]` directive after the introduction, Table of contents (+3 more)

### Community 35 - "Document Loader Verification"
Cohesion: 0.31
Nodes (8): Filename verification through Document.source, ImageFormat, ValidatedImageUpload, LoadedPhotopeaDocument, PhotopeaDocumentError, readDocumentCount(), scriptString(), verifyDocument()

### Community 36 - "Fake Session Test Fixtures"
Cohesion: 0.22
Nodes (8): EditorRecording, SessionState, LayerInfo, createSession(), documentOperations, frameA, frameB, psd

### Community 37 - "Route Dependencies & Waitlist"
Cohesion: 0.18
Nodes (3): RunRouteDependencies, MemoryWaitlistStore, WaitlistStore

### Community 38 - "Agent Behavioral Guidelines"
Cohesion: 0.20
Nodes (9): 1. Think Before Coding, 2. Simplicity First, 3. Surgical Changes, 4. Goal-Driven Execution, Andrej Karpathy Skills, Simplicity First, Surgical Changes, Think Before Coding (+1 more)

### Community 39 - "ComputerAction Session Types"
Cohesion: 0.20
Nodes (3): ComputerAction type, ComputerAction, ExpectedSession

### Community 40 - "PRD Sections"
Cohesion: 0.25
Nodes (8): Deliberately excluded, Launch acceptance, Non-functional requirements, PRD: Layerhand, Schedule, See also, The core flow, Saved query: why Git workflow reference bridges conventions and ideation

### Community 41 - "Computer Use & Fallbacks"
Cohesion: 0.50
Nodes (8): Astra Hackathon, Computer use (primitive), Computer use x mid-turn steering (Round 9), Hosted-browser computer use (Round 2), Ideation kill gates (scope, crowding), Web-based professional software unlock, ag-psd fallback, Embedded Photopea driven by the user (fallback product)

### Community 42 - "Markdown Link Rules"
Cohesion: 0.25
Nodes (8): Avoid relative paths unless within the same directory, Define reference links after their first use, Links, Reference links, Use explicit paths for links within Markdown, Use informative Markdown link titles, Use reference links for long links, Use reference links to reduce duplication

### Community 43 - "Markdown Code Rules"
Cohesion: 0.25
Nodes (8): Code, Codeblocks, Declare the language, Escape newlines, Inline, Nest codeblocks within lists, Use code span for escaping, Use fenced code blocks instead of indented code blocks

### Community 44 - "Agent Entry Points & Skills"
Cohesion: 0.48
Nodes (7): AGENTS.md (agent instruction entry point), CLAUDE.md (symlink to AGENTS.md), AGENTS.md as the single agent entry point, .agents/skills/ skills directory, Skills (installed skill collections), astra-challenge skill, GEMINI.md (symlink to AGENTS.md)

### Community 45 - "PRD Requirement Groups"
Cohesion: 0.29
Nodes (7): Functional requirements, Input, Launch surface, Metering, Output, Steering, The run

### Community 46 - "TRD Browser Runtime"
Cohesion: 0.29
Nodes (7): Disposal, Frames, One ceiling: fifteen minutes, The browser runtime, The shortlist, What we need from it, Why there is one at all

### Community 48 - "Markdown Heading Rules"
Cohesion: 0.33
Nodes (6): Add spacing to headings, ATX-style headings, Capitalization of titles and headers, Headings, Use a single H1 heading, Use unique, complete names for headings

### Community 49 - "TRD Editor Adapter"
Cohesion: 0.33
Nodes (6): Advertising, Known traps, The editor adapter, The fallback, The line that protects the premise, The protocol

### Community 50 - "Agent Tooling Decision (A0)"
Cohesion: 0.40
Nodes (6): Code-execution tool over a persistent Playwright session, computer tool (GA), Editor adapter, Orchestrator, OpenAI Responses API (gpt-6-astra), Spike A0: code execution or the computer tool

### Community 51 - "Editor Session Contract Tests"
Cohesion: 0.47
Nodes (3): defineEditorSessionContract(), EditorSessionFactory, pngSignature

### Community 52 - "Non-Goals & Exclusions"
Cohesion: 0.60
Nodes (5): FR-16: per-user history of past runs (P2, deferred by the non-goals), Requirement-level exclusions (no accounts, no in-app editing, no undo, PSD-only output, no internationalisation), Product non-goals (no image generation, no batch/API/integrations, no accounts beyond metering, no mobile, no own editor, no presets), Non-goals, Saved query: are Layerhand's inferred relationships correct

### Community 53 - "Competition Sections"
Cohesion: 0.40
Nodes (5): Adobe is the serious threat, and it is already shipped, And the demand signal is missing, Competition, The claim, corrected, The price ceiling is the real problem

### Community 54 - "TRD Cost Control"
Cohesion: 0.40
Nodes (5): Cost control, Size the daily ceiling against concurrency, not one user, The concurrency ceiling is a rate limit, not a server, The four limits, Where the money goes

### Community 55 - "TRD Agent Loop"
Cohesion: 0.40
Nodes (5): How the editor is actually driven, Prompting, Screenshots, The agent loop, The loop

### Community 57 - "Line Limit & Exceptions"
Cohesion: 0.50
Nodes (4): Character line limit, Code Search, Exceptions, Fenced code blocks with a declared language

### Community 58 - "TRD Three Contracts"
Cohesion: 0.50
Nodes (4): Contract 1: editor session, Contract 2: run orchestration, Contract 3: the HTTP surface, The three contracts

## Ambiguous Edges - Review These
- `EXAMPLES` → `Cobalt glass bottle`  [AMBIGUOUS]
  src/web/assets/sample-photo.png · relation: conceptually_related_to

## Knowledge Gaps
- **232 isolated node(s):** `$schema`, `singleQuote`, `semi`, `trailingComma`, `What changed` (+227 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 348 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `EXAMPLES` and `Cobalt glass bottle`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `TRD: Layerhand` connect `TRD Top-Level Sections` to `Git Workflow & Repo Tooling`, `Run Cost, Limits & Metering`, `PRD Sections`, `Config, Scripts & Health`, `Agent Entry Points & Skills`, `Launch Design, Testing & Deploy`, `TRD Browser Runtime`, `TRD Editor Adapter`, `Layerhand Pitch & Model Leverage`, `TRD Cost Control`, `TRD Agent Loop`, `Project Document Files`, `TRD Three Contracts`, `Product Brief Sections`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **Why does `Launch application design` connect `Launch Design, Testing & Deploy` to `Run Cost, Limits & Metering`, `Artifact Storage`, `Browserbase Client & Probe`, `PRD Sections`, `Contracts, Steering & Live View`, `Sample Photo & Upload Form`, `Server Runtime Composition`, `Recorded Editor Fixtures`, `Non-Goals & Exclusions`, `TRD Top-Level Sections`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **Why does `AGENTS.md (agent instruction entry point)` connect `Agent Entry Points & Skills` to `Git Workflow & Repo Tooling`, `Agent Behavioral Guidelines`, `PRD Sections`, `Launch Criteria & Go/No-Go`, `Layerhand Pitch & Model Leverage`, `TRD Top-Level Sections`, `Ideation Rounds`, `Markdown Layout Rules`, `Product Brief Sections`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Project conventions (rules.md)` (e.g. with `Explicit link paths (relative only within the same directory)` and `Capitalization of titles and headings`) actually correct?**
  _`Project conventions (rules.md)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `singleQuote`, `semi` to the rest of the system?**
  _232 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Git Workflow & Repo Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.051425213047311194 - nodes in this community are weakly interconnected._