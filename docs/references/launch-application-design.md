# Launch application design

This document defines the shared architecture for the open Layerhand launch
issues assigned to AlaskanTuna. It covers issues 22 through 31 while keeping
the existing agent and editor contracts stable.

The work is split into independently testable packages. A package may ship
code before an external checkpoint is available, but an issue is closed only
when every item in its GitHub acceptance checklist has evidence.

Contents:

1.  [Goals](#goals)
1.  [Non-goals](#non-goals)
1.  [Delivery structure](#delivery-structure)
1.  [Runtime and build](#runtime-and-build)
1.  [Server composition](#server-composition)
1.  [Run registry and event delivery](#run-registry-and-event-delivery)
1.  [Input and admission order](#input-and-admission-order)
1.  [Metering and waitlist persistence](#metering-and-waitlist-persistence)
1.  [Artifact storage](#artifact-storage)
1.  [Browserbase boundary](#browserbase-boundary)
1.  [Single-page experience](#single-page-experience)
1.  [Observability](#observability)
1.  [Security and error handling](#security-and-error-handling)
1.  [Testing strategy](#testing-strategy)
1.  [Worker allocation](#worker-allocation)
1.  [External checkpoints and issue closure](#external-checkpoints-and-issue-closure)
1.  [References](#references)

## Goals

- Deliver every P0 repository change before the P1 observability work.
- Build the browser, server, and web streams around the existing
  `EditorSession`, `RunHandle`, and `fakeRun()` contracts.
- Keep Browserbase CDP URLs, OpenAI keys, storage credentials, and signing
  secrets on the server.
- Make the complete web flow testable without Browserbase or OpenAI access.
- Produce one container that serves the API and the single-page application.
- Leave precise checkpoints for work that requires a human account, billing,
  a secret, a domain, or authenticated Product Hunt access.

## Non-goals

- Implementing the real Astra agent loop owned by the agent stream.
- Replacing Photopea or changing the editor contracts.
- Adding accounts, mobile support, routing, payment, run history, or in-app
  image editing.
- Reimplementing the demo recording tracked by issue 20.
- Choosing or purchasing a deployment, database, object-storage, or domain
  provider without an existing team account.

## Delivery structure

The work uses one isolated `feat/launch-application` branch and one pull
request. Commits remain atomic by behavior even though the pull request spans
several issues. The user-authorized merge method for this branch is squash.

The implementation is divided into four plans:

1.  External gates and application foundation: issues 22, 23, and 24.
1.  Admission and persistence: issue 29 and the storage needed by issue 30.
1.  Single-page run flow: issues 25 through 28 and the visible part of issue 30.
1.  Completion observability: issue 31.

Issue 31 remains the final implementation package because it is P1. The
foundation exposes a terminal-run callback so adding its log sink does not
require changing the run lifecycle later.

## Runtime and build

The application runs on Bun 1.4.2. That version is required because the
committed `bun.lock` uses lockfile version 2, which Bun 1.3 cannot read.
Install and container builds use `bun install --frozen-lockfile`; they must
fail rather than regenerate an unreadable lockfile.

`src/server/index.ts` imports `src/web/index.html` and serves it with
`Bun.serve`. Bun bundles the HTML, TypeScript, CSS, fonts, and image assets for
production with one `bun build --target=bun` command. No React, router, CSS
framework, or second development server is added.

The container is a two-stage build pinned to Bun 1.4.2. It exposes one port,
runs as a non-root user, stores no secret in an image layer, and starts the
compiled server. A health endpoint reports process and database readiness but
never returns configuration values.

## Server composition

`createApplication()` constructs the HTTP application from explicit
dependencies:

```ts
interface ApplicationDependencies {
  runFactory: (request: RunRequest) => ManagedRun
  meterStore: MeterStore
  waitlistStore: WaitlistStore
  artifactStore: ArtifactStore
  runLogger: RunLogger
  clock: Clock
  idGenerator: () => string
}

interface ManagedRun {
  handle: RunHandle
  metrics: () => {
    cacheHitRate: number | null
    stopReason: 'complete' | 'step_cap' | 'spend_cap' | 'cancelled' | 'failed'
  }
  releaseSecrets: () => void
}
```

Production wiring uses Browserbase, Bun SQL, Bun S3, and the real run factory
when those are available. Tests inject `fakeRun()`, an in-memory SQL database,
an in-memory artifact store, a recording logger, and a deterministic clock.
No route imports a concrete provider.

Configuration uses these exact environment names: `DATABASE_URL`,
`SESSION_SECRET`, `FREE_DAILY_BUDGET_USD`, `S3_ENDPOINT`, `S3_REGION`,
`S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
`BROWSERBASE_API_KEY`, `OPENAI_API_KEY`, and `TRUST_PROXY_HOPS`.
`.env.example` documents names and formats without containing working
credentials.

The HTTP surface stays exactly aligned with contract 3 in
[the technical design](/docs/TRD.md#contract-3-the-http-surface):

| Method | Path                   | Response                                     |
| ------ | ---------------------- | -------------------------------------------- |
| `POST` | `/api/runs`            | Validate and admit a run; return its `runId` |
| `GET`  | `/api/runs/:id/events` | Replay and follow server-sent `RunEvent`s    |
| `POST` | `/api/runs/:id/steer`  | Accept one correction                        |
| `POST` | `/api/runs/:id/cancel` | Cancel and retain the partial result         |
| `GET`  | `/api/runs/:id`        | Return the current replayable run snapshot   |
| `POST` | `/api/waitlist`        | Validate and store one email address         |
| `GET`  | `/health`              | Return process and database readiness        |

API errors use `{ code, message }`. Codes are stable machine values and
messages name the reason in plain language. A route never returns a stack,
credential, raw provider error, or Browserbase connection URL.

## Run registry and event delivery

`RunRegistry` owns active handles and starts one background event pump per
run. The pump stores the ordered event history, maintains a current snapshot,
and broadcasts new events to subscribers. It does not depend on a connected
page, so browser disconnects cannot pause a run.

Each server-sent event carries its zero-based sequence as the SSE `id`. A new
subscriber receives the retained history and then follows live events. A page
reload restores the `runId` from `sessionStorage`, requests the current
snapshot, and reconnects with `EventSource`. Duplicate event IDs are ignored
by the client reducer.

The registry retains terminal metadata for sixty minutes for launch-day
reconnects but does not provide user history. Terminal handling calls
`releaseSecrets()` in `finally`, including when reconciliation or logging
fails. The registry accepts a terminal callback for quota reconciliation and
the later structured log line.

`ManagedRun` is a server adapter, not a change to contract 2. It supplies
cache metrics that `RunEvent` does not expose and gives the registry one
idempotent hook for dropping secret references on every terminal path. It also
reports why an incomplete run stopped, which `RunResult.complete` cannot
distinguish. The cancel route marks the run cancelled before calling
`RunHandle.cancel()`. The fake adapter reports a `null` cache-hit rate; the
real adapter reports the measured rate and differentiates step and spend caps.

## Input and admission order

`POST /api/runs` accepts multipart form data with `image`, `filename`,
`instruction`, and optional `apiKey` fields. Processing is ordered to avoid
paid work for invalid or refused requests:

1.  Enforce the request-body ceiling.
1.  Validate instruction presence and the 500-character limit.
1.  Validate JPEG or PNG magic bytes, byte length, and dimensions with the
    existing `validateImageUpload()` function.
1.  Establish the signed visitor identity.
1.  Atomically admit or refuse the run through `MeterStore`.
1.  Persist the upload under an unguessable object key.
1.  Create the `RunHandle` and return its `runId`.

An admission or persistence failure never starts a browser session. A failure
after quota reservation releases the reservation before returning.

## Metering and waitlist persistence

Bun SQL supplies one database interface for production PostgreSQL and
in-memory SQLite tests. Production startup requires `DATABASE_URL`; tests use
`:memory:`. Migrations create four focused tables:

- `visitor_usage` stores an HMAC-derived visitor key and accepted free runs.
- `daily_usage` stores integer microdollars spent per UTC day. Its reserved
  column holds only what revisions before `meter_reservations` reserved.
- `meter_reservations` stores each free run's reservation in integer
  microdollars, with its UTC day and the time it was made.
- `waitlist_emails` stores a normalized unique email and creation time.

A signed, `HttpOnly`, `Secure`, `SameSite=Lax` cookie contains a random visitor
identifier. The database key is an HMAC of that identifier and the normalized
client address; neither raw address nor signing secret is stored.

The server trusts forwarded addresses only when `TRUST_PROXY_HOPS` is a
positive integer. It selects the address at that exact hop depth and rejects a
shorter chain. With zero trusted hops, it uses the direct socket address and
ignores forwarding headers.

Free admission uses one transaction. It refuses the fourth accepted run or a
run whose reservation would exceed `FREE_DAILY_BUDGET_USD`. A reservation is
the run's configured spend cap, represented as integer microdollars. Terminal
completion atomically replaces the reservation with measured spend. A
reservation counts for twenty minutes at most, the run ceiling plus five, so
one whose server died before its run ended stops holding back other free runs.

A user-supplied OpenAI key bypasses free-run and daily-budget admission. It
does not bypass the per-run step or spend cap. The key is passed directly to
`RunRequest.apiKey`, retained only by the active run closure, redacted by
construction from all serializable state, and released at terminal completion.

Production has no default daily dollar ceiling. Startup fails when
`FREE_DAILY_BUDGET_USD` is absent or invalid. The team-approved value and its
concurrency arithmetic must be committed to the TRD before issue 29 closes.

The waitlist endpoint normalizes the domain and trims surrounding whitespace,
rejects malformed or oversized input, and treats an existing address as a
successful idempotent submission. `bun run waitlist:export` writes a CSV to
standard output for a team member to redirect wherever they choose.

## Artifact storage

`ArtifactStore` exposes put, presign, and delete operations. Production uses
Bun's `S3Client`, which supports S3-compatible services without another SDK.
Tests and local development use an in-memory implementation.

Uploads, previews, and PSDs use random object keys with no user-controlled path
segments. Download URLs expire after one hour. Production startup requires the
S3 endpoint, region, bucket, access key, and secret key. The bucket must also
have a provider lifecycle policy that deletes objects after twenty-four hours;
the repository cannot claim that policy exists until its live configuration is
inspected.

## Browserbase boundary

`BrowserbaseClient` uses the documented REST surface to create a session with
a twenty-minute provider timeout, fetch debug URLs, and request release. It
returns a server-only `connectUrl` and a separate `liveViewUrl`.

Only server code receives `connectUrl`. Playwright connects to it over CDP and
hands its page to the existing Photopea transport. Logs, API responses, client
state, and HTML never contain it.

The probe command creates one session, loads Photopea, runs the existing image
open path, fetches the live-view URL, measures creation-to-ready latency, and
always requests release in `finally`. It refuses to run without
`BROWSERBASE_API_KEY` and never prints the key or CDP URL.

The probe page embeds the documented fullscreen live view in a sandboxed
iframe. Read-only mode sets `pointer-events: none` and `tabindex="-1"`; the
automated acceptance test verifies that pointer and keyboard focus cannot
reach the frame. Full issue acceptance still requires a billed Browserbase
account and one observed live session.

## Single-page experience

The page has five reducer states: `landing`, `input`, `running`, `result`, and
`error`. State changes never navigate. The reducer is pure and receives only
validated API payloads, which makes reconnect, cap, cancellation, correction,
and failure behavior deterministic in tests.

At 1280 pixels and wider, the landing and input state use a two-column layout:
a narrow explanation and form beside the silent demo. The running state gives
the editor frame most of the viewport, with step, cap, narration, and credits
in a compact status rail. The correction field stays visible below the live
frame for the entire run. The result state places the flattened preview first,
then the human-named layer list and PSD download.

Below 1280 pixels, the application displays a clear desktop-required message
instead of squeezing or hiding controls. The file picker remains keyboard
accessible, drag-and-drop is an enhancement, focus is visible, status changes
use an `aria-live` region, and reduced-motion preferences disable transitions.

The visual direction is an editorial photo-workbench rather than a generic
dashboard: near-black `#11110f`, warm paper `#f3f0e8`, muted gray `#9d9b94`,
and one electric chartreuse accent `#c7ff4a`. It uses system sans-serif type,
square corners, thin rules, no gradients, no decorative cards, and motion no
longer than 180 milliseconds.

The upload form supports both picker and drop, shows each rejection beside the
field, offers three one-click example instructions, and includes a bundled
sample photograph generated for this project with the image-generation tool.
Its generation prompt and provenance are recorded beside the asset; it is
never copied from a competitor.

The optional API-key field uses password presentation and autocomplete off. Its
value remains only in the form element until submission, is cleared as soon as
the start response arrives, and is never stored in `sessionStorage`, reducer
state, analytics, or an error message.

The landing video autoplays muted, loops, and has no audio track. Until issue
20 supplies the approved recording, the asset slot and its tests may merge,
but issue 30 remains open.

## Observability

At terminal completion, `RunLogger` emits exactly one JSON object on one line:

```ts
interface RunLogRecord {
  runId: string
  steps: number
  capHit: boolean
  tokensIn: number
  tokensOut: number
  costUsd: number
  cacheHitRate: number | null
  durationMs: number
  outcome: 'complete' | 'incomplete' | 'cancelled' | 'failed'
  failureReason: string | null
  instruction: string
}
```

The instruction is truncated to 200 characters. Frames and API keys are not
fields and cannot be serialized accidentally. Tests pass a recording sink;
production writes to standard output for the deployment platform's log query.

## Security and error handling

- Configuration parsing reports missing variable names, never values.
- User strings enter the DOM through `textContent`, not `innerHTML`.
- Responses set a restrictive content security policy and deny framing except
  where the Browserbase live view requires its own iframe source.
- Browser sessions can reach only the configured Photopea and application
  origins when the chosen provider account supports an egress policy.
- Every completion, cancellation, timeout, and error path exports first when
  possible and then releases the browser session in `finally`.
- Recoverable `RunEvent` errors remain visible without ending the SSE stream.
- Unrecoverable errors end once and preserve a specific public reason while
  retaining the full provider cause only in redacted server diagnostics.

## Testing strategy

Every behavior follows red-green-refactor. New production code starts only
after its focused test fails for the expected missing behavior.

The test layers are:

1.  Pure reducer, validation, identity, quota, and serialization tests.
1.  HTTP integration tests against an ephemeral `Bun.serve` port and injected
    fakes, including reconnect, actual limit hits, and secret-redaction checks.
1.  Browser tests at 1440x900, 1280x800, and 1279x800 for upload, running,
    correction, reload, result, download, and desktop-required states.
1.  Opt-in Browserbase and S3 integration tests guarded by explicit environment
    variables and skipped otherwise.
1.  Container build, health check, full test suite, typecheck, and lint before
    the pull request is eligible to merge.

Worker reports and exit codes are not verification. The coordinator inspects
every diff, checks ownership boundaries, reruns the relevant tests, and runs
the complete verification suite before pushing or merging.

## Worker allocation

Six Devin and six Antigravity workers are ceilings, not targets. The initial
allocation uses at most three simultaneous workers because only three output
areas are independent after shared interfaces are locked:

- Devin SWE-2 Max owns one bounded server or persistence package and its tests.
- Devin SWE-2 Max owns one bounded web reducer or DOM package and its tests.
- Antigravity Gemini 3.8 Flash audits the locked contract or completed diff and
  writes no production file during that review.

The coordinator owns shared interfaces, package and build configuration,
migrations, security decisions, integration, GitHub state, and all merges.
Workers run in isolated directories or worktrees with explicit path allowlists.
No two write tasks own the same file, and a pilot validates each new command
shape before fanout grows.

## External checkpoints and issue closure

The following facts are absent from both the local environment and GitHub
repository configuration:

- Browserbase billing and `BROWSERBASE_API_KEY` for issue 22.
- Authenticated Product Hunt rules content for issue 23 if it remains private.
- A deployment account, database, object-storage bucket, secrets, and domain
  for issue 24.
- An OpenAI key and team-approved daily ceiling for issue 29.
- The issue 20 demo asset and a live waitlist store for issue 30.
- A live platform log query for issue 31.

For each missing checkpoint, the coordinator posts an issue comment containing
the command run, the evidence already available, and the smallest human action
remaining. It does not close a partial issue.

Issue 23 is investigated only from the official Product Hunt contest surface.
The resulting document records the repository, licence, video, team-size,
region, age, intellectual-property, deadline, and timezone rules with direct
links. If the official surface remains authenticated, the issue comment asks a
team member to paste or screenshot that exact section rather than substituting
third-party summaries.

The pull request closes issues 25 through 28 only when their complete browser
acceptance tests pass. It references issues 22, 23, 24, 29, 30, and 31 until
their external evidence exists; any of those may be changed to closing links
before merge if the evidence arrives.

After independent diff review, a clean full verification run, and green GitHub
checks, the coordinator squash-merges the pull request into `main` and deletes
the remote feature branch without another approval prompt. A failing check, a
breaking contract change, or an unresolved security finding blocks the merge.

## References

- [Layerhand product requirements](/docs/PRD.md)
- [Layerhand technical design](/docs/TRD.md)
- [Bun full-stack HTML imports](https://bun.sh/docs/bundler/fullstack)
- [Bun HTTP server](https://bun.sh/docs/runtime/http/server)
- [Bun SQL](https://bun.sh/docs/runtime/sql)
- [Bun S3-compatible storage](https://bun.sh/docs/runtime/s3)
- [Browserbase session creation](https://docs.browserbase.com/reference/api/create-a-session)
- [Browserbase live-view embedding](https://docs.browserbase.com/platform/browser/observability/session-live-view)
- [Browserbase session release](https://docs.browserbase.com/reference/api/update-a-session)
