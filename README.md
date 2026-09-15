# Layerhand

Layerhand is a photographic retouching agent for the OpenAI × Product Hunt
GPT-6 Astra Challenge. It works inside a real image editor, streams visible
progress, accepts corrections during a run, and returns a layered PSD rather
than only a flattened image.

## Requirements

- [Bun 1.4.2](https://bun.sh/)
- Docker for the production-container smoke test
- Chromium for opt-in browser integration tests

The Bun version is pinned because the committed lockfile uses lockfile version 2. Copy `.env.example` to `.env` only for local development. Store production
secrets as GitHub secrets, as the
[Git workflow](/docs/references/git-workflow.md#secrets) asks.
[Deploy](#deploy) names the one exception, `OPENAI_API_KEY`.

Use Bun 1.4.2 for anything that connects to Browserbase: under Bun 1.3.14,
Playwright's `connectOverCDP` never opens its WebSocket.

## Run locally

```sh
bun install --frozen-lockfile
bun run dev
```

The page is served at `http://localhost:3000`; readiness is available at
`/health`.

## Verify

```sh
bun test
bun run typecheck
bun run lint
bun run build
bash test/server/container-smoke.sh
```

Tests requiring live providers are opt-in and skip without their explicit
environment variables.

## Browserbase probe

After a public deployment exposes `/photopea-host`, put the Browserbase key in
the local environment and run:

```sh
bun run browserbase:probe -- https://example.com/photopea-host
```

The command prints the session id, public live-view URL, and cold-start time.
It never prints the API key or private CDP connection URL and requests session
release in a `finally` block.

## Container

```sh
docker build -t layerhand .
docker run --rm -p 3000:3000 layerhand
```

The image uses Bun 1.4.2 in separate build and runtime stages and runs as the
non-root `bun` user. It receives no secret while building.

## Deploy

`.github/workflows/deploy.yml` builds the production image on every push
to `main` and deploys it to Google Cloud Run: service `layerhand` in
project `layerhand-astra-2026`, region `us-central1`. It builds the image
but pushes and deploys nothing until the repository variable
`DEPLOY_PLATFORM` is `cloud-run`.

- **Authentication** is Workload Identity Federation, restricted to this
  repository, so no Google key exists.
- **The image** goes to
  `us-central1-docker.pkg.dev/layerhand-astra-2026/layerhand/app:<commit>`.
- **Instances.** The service runs at most one instance, and scales to zero
  when idle. CPU stays on while no request is open, because a run continues
  after its start request returns. Requests may last 60 minutes.
- **Secrets** come from Secret Manager at deploy time:
  - `OPENAI_API_KEY`
  - `BROWSERBASE_API_KEY`
  - `SESSION_SECRET`
  - `DATABASE_URL`
  - `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`, an HMAC key for the
    bucket

  All but `OPENAI_API_KEY` are team secrets, whose source is this
  repository's GitHub secrets. The deploy job copies each one into Secret
  Manager before deploying, and only when it changed. `OPENAI_API_KEY` is a
  personal key that lives only in Secret Manager.

- **Plain variables** are set in the workflow:
  - `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, and `TRUST_PROXY_HOPS`;
  - `RUN_MODE`, which is `agent`: the real agent runs. It needs
    `PUBLIC_URL`, set to the service's own address, because Browserbase's
    browser loads `/photopea-host` from it. `fake` and `scripted` are for
    development;
  - `FREE_DAILY_BUDGET_USD`, a placeholder of 10 until the ceiling is
    agreed (#29). It bounds the server's OpenAI key, a personal balance, to
    $10 a day;
  - `RUN_STEP_CAP`, 40, and `FREE_RUN_SPEND_CAP_USD`, 3: the model calls one
    run may make, and what it may spend. A free run reserves its spend cap
    from the daily ceiling.
- **Storage** is the GCS bucket `layerhand-artifacts-732371853772`, through
  its S3 interoperability endpoint, with a 24-hour delete rule (NFR-6).

In production the container refuses to start unless all eleven variables
that `src/server/config.ts` requires are set.

**The database is the Neon project `layerhand`**, in the M1KUAPP
organisation and region `aws-us-east-2`. It is not paused when it goes
without queries, so it needs no keep-alive request.

## Architecture

One long-lived Bun process serves the single-page application and API. Agent
runs conform to `src/agent/contract.ts`; image-editor integrations conform to
`src/editor/contract.ts`. The product and technical decisions live in
`docs/PRODUCT.md`, `docs/PRD.md`, and `docs/TRD.md`.
