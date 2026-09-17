# Agent bundle

What issue #136 builds: a thin client that lets Codex, Claude Code, and other
agent hosts run Layerhand from where they already work. The loop, the editor,
and the model stay on our server, so GPT-6 Astra is still what does the work
on every host. This spec settles the contract every piece is built against.

Contents:

1.  [Scope](#scope)
1.  [Server changes](#server-changes)
1.  [The MCP server](#the-mcp-server)
1.  [The skill and the plugins](#the-skill-and-the-plugins)
1.  [The website](#the-website)
1.  [Testing](#testing)
1.  [Not in this change](#not-in-this-change)

## Scope

- A run token, so steering or cancelling a run takes more than its id.
- A client header that marks a request as coming from the bundle. Such a run
  needs the user's own OpenAI key and is capped per address.
- A watch link that opens a run's live view without its controls.
- `layerhand-mcp`, an npm package that is at once a stdio MCP server, a
  Claude Code plugin, and a Codex plugin, with one skill.
- A Claude Code plugin marketplace served from our own site, and an install
  section on the landing page.

The branch is not merged before the launch on September 18: `main` deploys
itself, and the build is frozen.

## Server changes

### Run token

`src/server/run-token.ts` exports two functions:

```ts
export async function createRunToken(secret: string, runId: string): Promise<string>
export async function verifyRunToken(secret: string, runId: string, token: string): Promise<boolean>
```

The token is HMAC-SHA256 of `run:${runId}` under `SESSION_SECRET`, encoded as
base64url without padding. Verification compares in constant time and returns
false for a token of the wrong length. Nothing is stored: the secret alone
proves the token.

`POST /api/runs` answers `201 { runId, runToken }`.

`POST /api/runs/:id/steer` and `POST /api/runs/:id/cancel` require
`Authorization: Bearer <runToken>`, checked before the body is read and
before the run is looked up, so a refusal says nothing about whether the run
exists:

| Request                                    | Answer                         |
| ------------------------------------------ | ------------------------------ |
| No `Authorization` header, or not `Bearer` | 401 `run_token_required`       |
| A token that does not verify for this id   | 403 `run_token_refused`        |
| A token that verifies                      | As before: 202, 404, 409, etc. |

Messages: "This run needs its token to be steered or cancelled." and "This
token does not belong to this run."

`GET /api/runs/:id` and `GET /api/runs/:id/events` stay open by id, as they
are today, because the watch link needs them.

### Client header

A request carrying a non-empty `X-Layerhand-Client` header, such as
`layerhand-mcp/0.1.0`, is a bundle request. A value longer than 64 characters
is refused with 400 `invalid_client`.

A bundle request to `POST /api/runs` with no `apiKey` is refused with 400
`api_key_required`: "Runs from an agent need your own OpenAI API key." The
check comes after the form is validated and before the key is checked with
OpenAI.

### Per-address cap on bundle runs

At most `MAX_CLIENT_RUNS_PER_ADDRESS` bundle runs, default 2, may be queued or
running at once for one `addressKey`. One more is refused with 429
`client_runs_exceeded`: "This address already has 2 runs going from an agent.
Wait for one to finish." The number in the message is the configured cap.

- The count lives in memory in `RunRoutes`, a `Map<addressKey, number>`, as
  the rate limiter's does, because production runs one instance.
- The check and the take happen with no `await` between them, so concurrent
  requests cannot both pass.
- A taken slot is given back exactly once: in the run's `onTerminal`, or on
  any path that returns or throws without enqueuing the run. An entry that
  reaches zero is deleted.
- Runs from the page, without the header, are not counted.

`RunLimits` gains `maxClientRunsPerAddress`, read from
`MAX_CLIENT_RUNS_PER_ADDRESS` with `parsePositiveInteger`, wired through
`runtime.ts` into `RunRouteDependencies`, and listed in `.env.example`.

### Watch link

`/?watch=<runId>` opens the page straight into that run's live view, as a
reload of a stored run does, but view-only: no correction field, no send
button, and no cancel button, and a line saying "You are watching this run.
Corrections come from the agent that started it." The watched run is not
written to `sessionStorage`. When the run ends, the result view shows as
usual, downloads included.

### The page sends the token

`RunApi.start` returns `{ runId, runToken }`. The page stores the token in
`sessionStorage` next to the run id, under `layerhand.runToken`, clears it
wherever it clears the id, and sends it with every steer and cancel. A stored
run with no stored token, left by an older page, restores view-only.

## The MCP server

### Package

`packages/layerhand-mcp/` is its own package, outside the root's install and
test run:

- `package.json`: name `layerhand-mcp`, version `0.1.0`, `"type": "module"`,
  `bin: { "layerhand-mcp": "dist/layerhand-mcp.js" }`, license `UNLICENSED`
  until the team picks one.
- Its dependencies are all `devDependencies`. `bun run build` bundles
  `src/index.ts` for Node into the single file `dist/layerhand-mcp.js`, with a
  `#!/usr/bin/env node` banner, so `npx` installs nothing else.
- `bun test` and `bun run typecheck` run inside the package. The root
  `bunfig.toml` ignores `packages/**`, and the root `.dockerignore` leaves the
  package out of the server image.

### Configuration

Read from the environment, never from tool arguments, so a key never passes
through the model's context:

| Variable               | Default                                              |
| ---------------------- | ---------------------------------------------------- |
| `OPENAI_API_KEY`       | None. `start_run` fails with a stated message        |
| `LAYERHAND_URL`        | `https://layerhand-732371853772.us-central1.run.app` |
| `LAYERHAND_OUTPUT_DIR` | `layerhand` under the working directory              |

### Handles

A handle is `<runId>.<runToken>`. The run id is a UUID and the token is
base64url, so neither contains a period; the handle splits at the last one. A
handle that does not split into two non-empty parts is refused with a tool
error before any request is sent.

### Tools

Every tool returns one text content item holding a JSON object, with
snake_case keys. An API error `{ code, message }` becomes a tool result with
`isError: true` and the text `<code>: <message>`. Every request carries
`X-Layerhand-Client: layerhand-mcp/<version>`.

#### `start_run`

Input `{ image_path: string, instruction: string }`, the instruction 1 to
500 characters. Reads the image, sends `POST /api/runs` as multipart with
`image`, `filename` (the base name), `instruction`, and `apiKey`. Returns
`{ handle, run_id, watch_url, next }`, where `watch_url` is
`<LAYERHAND_URL>/?watch=<runId>` and `next` says to call `wait_run`.

#### `wait_run`

Input `{ handle: string, wait_seconds?: integer }`, 1 to 50, default 45.
Polls `GET /api/runs/:id` every two seconds and returns as soon as the run is
terminal, or when the wait is up. Returns `{ status, done, steps, cap,
narration, queue_position, cost_usd, corrections, recoverable_errors,
frame_path, stop_reason, failure_reason }`. `done` is true for `complete`,
`incomplete`, `cancelled`, and `failed`. When the snapshot carries a
`frameUrl` that is a `data:` URL, its bytes are written to
`<output dir>/<runId>/latest-frame.<png|jpg>` and `frame_path` is that path;
otherwise `frame_path` is null. Frame bytes never go into the result.

#### `steer_run`

Input `{ handle: string, text: string }`, 1 to 500 characters. Sends
`POST /api/runs/:id/steer` with the bearer token. Returns
`{ accepted: true }`.

#### `cancel_run`

Input `{ handle: string }`. Sends `POST /api/runs/:id/cancel` with the
bearer token. Returns `{ accepted: true, next }`, where `next` says to call
`wait_run` and then `get_result`, because a cancelled run still exports.

#### `get_result`

Input `{ handle: string, output_dir?: string }`. Reads the snapshot. A run
that is not done is a tool error: "The run is still going. Call wait_run
first." A done run without a `result` returns `{ status, failure_reason }`
with no files. Otherwise it downloads `result.psdUrl` and `result.previewUrl`,
resolved against `LAYERHAND_URL` when relative, to
`<dir>/<runId>/layerhand.psd` and `<dir>/<runId>/preview.png`, and returns
`{ psd_path, preview_path, complete, stop_reason, layers }`, with `layers` as
the server sent them.

### Code layout

- `src/client.ts`: `LayerhandClient`, the HTTP calls, taking a base URL, a
  version, and a `fetch` so tests can pass their own.
- `src/tools.ts`: `createTools(config)`, the five handlers as plain async
  functions from input to result, with no MCP types.
- `src/index.ts`: registers the handlers on an `McpServer` from
  `@modelcontextprotocol/sdk` with zod input schemas, and connects a
  `StdioServerTransport`. Nothing is written to standard output but the
  protocol.

## The skill and the plugins

All inside `packages/layerhand-mcp/`, so one npm package carries them:

- `skills/layerhand/SKILL.md`: when to reach for Layerhand, and the loop:
  start, share the watch link, wait and relay progress in a sentence, steer
  when the user corrects, fetch the result, report the files and the layer
  names. It never opens a frame unless the user asks to see progress.
- `.claude-plugin/plugin.json` and `.mcp.json`: the Claude Code plugin. The
  server runs as `node ${CLAUDE_PLUGIN_ROOT}/dist/layerhand-mcp.js`.
- `plugin.json` and `mcp.json`: the Codex plugin, in the Agent Plugins
  format. The server runs as `npx -y layerhand-mcp`.
- `README.md`: install for Claude Code and Codex, the variables above, and
  what a run costs the user.

`src/server/claude-marketplace.json` is the marketplace, named `layerhand`,
with one plugin, `layerhand`, whose source is the hosted zip at
`/plugins/layerhand.zip`. The server serves the catalog at
`GET /plugins/marketplace.json` with the security headers and
`content-type: application/json`, rewriting the archive URL to the public
origin.

The one-line installs:

```sh
claude plugin marketplace add https://<host>/plugins/marketplace.json && claude plugin install layerhand@layerhand
codex mcp add layerhand --env OPENAI_API_KEY="$OPENAI_API_KEY" -- npx -y https://<host>/plugins/layerhand-mcp.tgz
```

A Codex plugin marketplace needs a public repository, and this one is
private, so Codex installs the MCP server directly until it is public.

## The website

A dedicated page at `/mcp` holds a copy-paste setup prompt for Codex, Claude
Code, and other MCP hosts, with the per-platform commands collapsed in
`<details>` sections. The landing's "Run it from your agent" block, after
the waitlist, links there. The Claude marketplace at
`GET /plugins/marketplace.json` points at a hosted zip
(`GET /plugins/layerhand.zip`), and the stdio package is at
`GET /plugins/layerhand-mcp.tgz` and `GET /plugins/layerhand-mcp.js`, so
install does not wait on npm. The page uses only the tokens in
`tokens.css` and follows `docs/DESIGN.md`.

## Testing

- `test/server/run-routes.test.ts` covers each row of the token table, the
  client header, `api_key_required`, the cap refusing the third run, a slot
  given back when a run ends, and a slot given back when a start fails.
- `test/server/run-token.test.ts` covers a token verifying for its own id and
  no other, and a truncated token.
- `test/server/page-routes.test.ts` covers the marketplace route.
- The package's tests run each tool against a stub HTTP server.
- An end-to-end test starts the real server in scripted mode, and drives the
  built MCP server over stdio with the SDK's client: start a run, steer it,
  wait for it, and find a PSD beginning `8BPS` on disk.
- By hand: `claude -p` and `codex exec` against a local scripted server, and
  then one real Astra run on each host before the install section is live.

## Not in this change

- Publishing to npm, and the Codex plugin marketplace.
- A remote MCP server for Claude Desktop and claude.ai, a `.mcpb` extension,
  and install links for Cursor, VS Code, and Gemini CLI.
- Versioned paths. The routes keep their names; a breaking change later gets
  `/api/v2`.
