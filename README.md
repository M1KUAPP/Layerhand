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
values in the deployment platform's secret store.

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

## Architecture

One long-lived Bun process serves the single-page application and API. Agent
runs conform to `src/agent/contract.ts`; image-editor integrations conform to
`src/editor/contract.ts`. The product and technical decisions live in
`docs/PRODUCT.md`, `docs/PRD.md`, and `docs/TRD.md`.
