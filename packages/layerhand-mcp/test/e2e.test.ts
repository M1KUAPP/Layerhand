import { afterAll, beforeAll, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { ArtifactPutRequest, ArtifactStore, StoredArtifact } from '../../../src/server/artifact-store'
import { createArtifactKey } from '../../../src/server/artifact-store'

const packageDir = fileURLToPath(new URL('..', import.meta.url))
const samplePhoto = fileURLToPath(new URL('../../../src/web/assets/sample-photo.png', import.meta.url))

interface LaunchRuntime {
  application: { fetch(request: Request): Promise<Response> }
  close(): Promise<void>
}

interface RuntimeModule {
  createLaunchRuntime(options: {
    env?: Record<string, string | undefined>
    clientAddress(request: Request): string
    artifactStore?: ArtifactStore
    writeRunLog?(record: string): void
  }): Promise<LaunchRuntime>
}

// The server's graph is typechecked by the root tsconfig, whose lib set this
// package does not share, so it is imported where tsc does not follow: only
// the shapes the test uses are declared here.
async function serverModule<T>(path: string): Promise<T> {
  return (await import(new URL(path, import.meta.url).href)) as T
}

// The memory store signs URLs on a host nothing serves; a data: URL carries
// the bytes, so the client downloads them exactly as it would a signed URL.
class DataArtifactStore implements ArtifactStore {
  readonly #objects = new Map<string, { contentType: ArtifactPutRequest['contentType']; bytes: Uint8Array }>()

  async put(request: ArtifactPutRequest): Promise<StoredArtifact> {
    const key = createArtifactKey(request, () => crypto.randomUUID())
    this.#objects.set(key, { contentType: request.contentType, bytes: Uint8Array.from(request.bytes) })
    return { key }
  }

  async presign(key: string): Promise<string> {
    const object = this.#objects.get(key)
    if (!object) throw new Error('Artifact does not exist')
    return `data:${object.contentType};base64,${Buffer.from(object.bytes).toString('base64')}`
  }

  async delete(key: string): Promise<void> {
    this.#objects.delete(key)
  }
}

interface Snapshot {
  status: string
  corrections: string[]
}

let runtime: LaunchRuntime | undefined
let server: ReturnType<typeof Bun.serve> | undefined
let client: Client | undefined
let origin: string
let outputDir: string
let handle = ''

async function callTool(name: string, args: Record<string, unknown>) {
  const result = await client!.callTool({ name, arguments: args })
  const content = result.content as { text: string }[] | undefined
  const text = content?.[0]?.text ?? ''
  let body: Record<string, unknown> = {}
  try {
    body = JSON.parse(text) as Record<string, unknown>
  } catch {
    // A tool error's text is `code: message`, not JSON.
  }
  return { isError: result.isError === true, body, text }
}

async function snapshot(runId: string): Promise<Snapshot> {
  const response = await fetch(`${origin}/api/runs/${runId}`)
  return (await response.json()) as Snapshot
}

beforeAll(async () => {
  const build = Bun.spawnSync({ cmd: ['bun', 'run', 'build'], cwd: packageDir })
  if (build.exitCode !== 0) throw new Error(`bun run build exited ${build.exitCode}: ${build.stderr}`)

  const { createLaunchRuntime } = await serverModule<RuntimeModule>('../../../src/server/runtime.ts')
  const { MAX_RUN_REQUEST_BODY_BYTES } = await serverModule<{ MAX_RUN_REQUEST_BODY_BYTES: number }>(
    '../../../src/server/run-routes.ts'
  )

  runtime = await createLaunchRuntime({
    env: { NODE_ENV: 'development', RUN_MODE: 'scripted' },
    clientAddress(request) {
      return server?.requestIP(request)?.address ?? '127.0.0.1'
    },
    artifactStore: new DataArtifactStore(),
    writeRunLog: () => undefined
  })
  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    maxRequestBodySize: MAX_RUN_REQUEST_BODY_BYTES,
    fetch: runtime.application.fetch
  })
  origin = server.url.origin
  outputDir = await mkdtemp(join(tmpdir(), 'layerhand-e2e-'))

  client = new Client({ name: 'layerhand-e2e', version: '0.0.0' })
  await client.connect(
    new StdioClientTransport({
      command: 'node',
      args: ['dist/layerhand-mcp.js'],
      cwd: packageDir,
      env: {
        LAYERHAND_URL: origin,
        OPENAI_API_KEY: 'sk-test-e2e-placeholder',
        LAYERHAND_OUTPUT_DIR: outputDir,
        PATH: process.env.PATH ?? ''
      }
    })
  )
})

afterAll(async () => {
  await client?.close()
  await server?.stop(true)
  await runtime?.close()
  await rm(outputDir, { recursive: true, force: true })
  await rm(join(packageDir, 'dist'), { recursive: true, force: true })
})

test('a run is started, steered, waited on, and downloaded through the built server', async () => {
  const { tools } = await client!.listTools()
  expect(tools.map((tool) => tool.name).sort()).toEqual([
    'cancel_run',
    'get_result',
    'start_run',
    'steer_run',
    'wait_run'
  ])

  const started = await callTool('start_run', {
    image_path: samplePhoto,
    instruction: 'Warm the photo up.'
  })
  expect(started.isError).toBe(false)
  handle = started.body.handle as string
  const runId = started.body.run_id as string
  expect(started.body.watch_url).toBe(`${origin}/?watch=${runId}`)

  // A correction lands only once the run is going, so wait out the queue.
  for (let attempt = 0; attempt < 50 && (await snapshot(runId)).status !== 'running'; attempt++) {
    await Bun.sleep(100)
  }
  expect((await snapshot(runId)).status).toBe('running')

  const steered = await callTool('steer_run', { handle, text: 'keep the shadow' })
  expect(steered.isError).toBe(false)
  expect(steered.body.accepted).toBe(true)

  let waited: Record<string, unknown> | undefined
  for (let attempt = 0; attempt < 20 && waited?.done !== true; attempt++) {
    const reply = await callTool('wait_run', { handle, wait_seconds: 10 })
    expect(reply.isError).toBe(false)
    waited = reply.body
  }
  expect(waited?.done).toBe(true)

  const result = await callTool('get_result', { handle })
  expect(result.isError).toBe(false)
  const psd = await readFile(result.body.psd_path as string)
  expect(psd.subarray(0, 4).toString('latin1')).toBe('8BPS')
  const preview = await readFile(result.body.preview_path as string)
  expect(preview.byteLength).toBeGreaterThan(0)

  expect((await snapshot(runId)).corrections).toContain('keep the shadow')
}, 120_000)

test('a handle with a changed token is refused', async () => {
  const cut = handle.lastIndexOf('.')
  const token = handle.slice(cut + 1)
  const forged = `${handle.slice(0, cut)}.${token.startsWith('A') ? 'B' : 'A'}${token.slice(1)}`

  const steered = await callTool('steer_run', { handle: forged, text: 'more contrast' })
  expect(steered.isError).toBe(true)
  expect(steered.text).toContain('run_token_refused')
})
