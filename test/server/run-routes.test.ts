import { beforeAll, describe, expect, test } from 'bun:test'

import { fakeRun } from '../../src/agent/fake-run'
import type { RunEvent, RunRequest } from '../../src/agent/contract'
import { createApplication } from '../../src/server/application'
import type { ArtifactPutRequest, ArtifactStore, StoredArtifact } from '../../src/server/artifact-store'
import type { AdmissionRequest, AdmissionResult, MeterReservation, MeterStore } from '../../src/server/meter-store'
import { usdToMicroUsd } from '../../src/server/meter-store'
import { RunRegistry } from '../../src/server/run-registry'
import { RunRoutes } from '../../src/server/run-routes'
import { MemoryWaitlistStore } from '../../src/server/waitlist-store'
import { WarmSessionPool, type WarmEditorSession } from '../../src/server/warm-session-pool'

let png: Uint8Array

beforeAll(async () => {
  png = await Bun.file(new URL('../../src/editor/fixtures/document-preview.png', import.meta.url)).bytes()
})

class RecordingMeter implements MeterStore {
  readonly calls: string[] = []
  refuse?: Exclude<AdmissionResult, { accepted: true }>
  readonly reservation: MeterReservation = {
    visitorKey: 'opaque-visitor',
    dayUtc: '2026-09-15',
    reservedMicroUsd: usdToMicroUsd(10),
    freeTier: true
  }

  async admit(request: AdmissionRequest): Promise<AdmissionResult> {
    this.calls.push(`admit:${request.byok}`)
    return this.refuse ?? { accepted: true, reservation: this.reservation }
  }

  async reconcile(reservation: MeterReservation, actualMicroUsd: number): Promise<void> {
    expect(reservation).toBe(this.reservation)
    this.calls.push(`reconcile:${actualMicroUsd}`)
  }

  async release(reservation: MeterReservation): Promise<void> {
    expect(reservation).toBe(this.reservation)
    this.calls.push('release')
  }
}

class RecordingArtifacts implements ArtifactStore {
  readonly calls: string[] = []
  failDelete = false
  failPut = false

  async put(request: ArtifactPutRequest): Promise<StoredArtifact> {
    this.calls.push(`put:${request.kind}:${request.bytes.byteLength}`)
    if (this.failPut) throw new Error('storage put failed')
    return { key: 'upload/random.png' }
  }

  async presign(key: string): Promise<string> {
    this.calls.push(`presign:${key}`)
    return `https://artifacts.example/${key}`
  }

  async delete(key: string): Promise<void> {
    this.calls.push(`delete:${key}`)
    if (this.failDelete) throw new Error('storage delete failed')
  }
}

function startRequest(
  options: { image?: Blob; instruction?: string; apiKey?: string; uploadId?: string; cookie?: string } = {}
) {
  const form = new FormData()
  const pngBuffer = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer
  form.set('image', options.image ?? new File([pngBuffer], 'photo.png', { type: 'image/png' }), 'photo.png')
  form.set('filename', 'photo.png')
  form.set('instruction', options.instruction ?? 'Remove the background')
  if (options.apiKey) form.set('apiKey', options.apiKey)
  if (options.uploadId) form.set('uploadId', options.uploadId)
  return new Request('https://layerhand.test/api/runs', {
    method: 'POST',
    body: form,
    ...(options.cookie ? { headers: { cookie: options.cookie } } : {})
  })
}

function uploadRequest(filename = 'photo.png') {
  const form = new FormData()
  const pngBuffer = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer
  form.set('image', new File([pngBuffer], filename, { type: 'image/png' }), filename)
  form.set('filename', filename)
  return new Request('https://layerhand.test/api/uploads', { method: 'POST', body: form })
}

/** The visitor cookie a response set, as a request would send it back. */
function visitorCookie(response: Response): string {
  return (response.headers.get('set-cookie') ?? '').split(';')[0] ?? ''
}

/** A warm editor session that records only what the routes do with it. */
function warmSessionStub(id: string) {
  let abandoned = 0
  return {
    session: {
      id,
      viewport: { width: 1440, height: 900 },
      open: async () => undefined,
      screenshot: async () => png,
      act: async () => undefined,
      layers: async () => [],
      exportPsd: async () => png,
      exportPreview: async () => png,
      close: async () => undefined,
      abandon: async () => void (abandoned += 1)
    } satisfies WarmEditorSession,
    get abandoned() {
      return abandoned
    }
  }
}

function fixture(overrides: { meter?: RecordingMeter; warm?: boolean; failAtStep?: number } = {}) {
  const meter = overrides.meter ?? new RecordingMeter()
  const artifacts = new RecordingArtifacts()
  const registry = new RunRegistry()
  const runRequests: RunRequest[] = []
  const warmed: ReturnType<typeof warmSessionStub>[] = []
  const claimed: (WarmEditorSession | undefined)[] = []
  let releasedSecrets = 0
  let nextId = 0
  let failRunFactory = false
  const warmSessions = overrides.warm
    ? new WarmSessionPool({
        create: () => {
          const stub = warmSessionStub(`warm-${warmed.length + 1}`)
          warmed.push(stub)
          return stub.session
        },
        idGenerator: () => `upload-${warmed.length + 1}`
      })
    : undefined
  const routes = new RunRoutes({
    registry,
    ...(warmSessions ? { warmSessions } : {}),
    meterStore: meter,
    artifactStore: artifacts,
    waitlistStore: new MemoryWaitlistStore(),
    sessionSecret: 'session-secret',
    trustProxyHops: 0,
    freeRunReservationMicroUsd: usdToMicroUsd(10),
    clientAddress: () => '203.0.113.10',
    now: () => new Date('2026-09-15T12:00:00.000Z'),
    idGenerator: () => `public-run-${++nextId}`,
    runFactory(request, warmSession) {
      claimed.push(warmSession)
      if (failRunFactory) return Promise.reject(new Error('run factory failed'))
      runRequests.push(request)
      return {
        handle: fakeRun(request, {
          intervalMs: 1,
          ...(overrides.failAtStep !== undefined ? { failAtStep: overrides.failAtStep } : {})
        }),
        metrics: () => ({ cacheHitRate: null, stopReason: overrides.failAtStep !== undefined ? 'failed' : 'complete' }),
        releaseSecrets() {
          request.apiKey = undefined
          releasedSecrets += 1
        }
      }
    }
  })
  const app = createApplication({
    databaseReady: async () => true,
    routes
  })
  return {
    app,
    routes,
    registry,
    meter,
    artifacts,
    runRequests,
    warmSessions,
    warmed,
    claimed,
    released: () => releasedSecrets,
    failNextRunStart: () => {
      failRunFactory = true
    }
  }
}

describe('warming an editor before the run', () => {
  test('warms a validated upload, and the run that follows takes that session', async () => {
    const target = fixture({ warm: true })

    const upload = await target.app.fetch(uploadRequest())
    const body = (await upload.json()) as { uploadId: string; warming: boolean }
    const started = await target.app.fetch(startRequest({ uploadId: body.uploadId, cookie: visitorCookie(upload) }))

    expect(upload.status).toBe(201)
    expect(body).toEqual({ uploadId: 'upload-1', warming: true })
    expect(upload.headers.get('set-cookie')).toContain('HttpOnly')
    expect(started.status).toBe(201)
    expect(target.claimed).toHaveLength(1)
    expect(target.claimed[0]?.id).toBe('warm-1')
    // Claimed once: the run owns it now, and it is no longer warm.
    expect(target.warmSessions?.size).toBe(0)
    expect(target.warmed[0]?.abandoned).toBe(0)
    expect(target.meter.calls[0]).toBe('admit:false')
  })

  test('refuses another visitor the warm session, and starts that run cold', async () => {
    const target = fixture({ warm: true })

    const upload = await target.app.fetch(uploadRequest())
    const { uploadId } = (await upload.json()) as { uploadId: string }
    // No cookie, so this is a different visitor.
    const started = await target.app.fetch(startRequest({ uploadId }))

    expect(started.status).toBe(201)
    expect(target.claimed[0]).toBeUndefined()
    expect(target.warmSessions?.size).toBe(1)
  })

  test('accepts an upload with nothing to warm, and the run starts as it always did', async () => {
    const target = fixture()

    const upload = await target.app.fetch(uploadRequest())
    const started = await target.app.fetch(startRequest({ uploadId: 'upload-1', cookie: visitorCookie(upload) }))

    expect(await upload.json()).toEqual({ uploadId: null, warming: false })
    expect(started.status).toBe(201)
    expect(target.claimed[0]).toBeUndefined()
  })

  test('releases the warm session when the run it was claimed for cannot start', async () => {
    const target = fixture({ warm: true })
    const upload = await target.app.fetch(uploadRequest())
    const { uploadId } = (await upload.json()) as { uploadId: string }
    target.failNextRunStart()

    const started = await target.app.fetch(startRequest({ uploadId, cookie: visitorCookie(upload) }))

    expect(started.status).toBe(500)
    expect(target.warmed[0]?.abandoned).toBe(1)
    expect(target.warmSessions?.size).toBe(0)
    expect(target.meter.calls).toContain('release')
  })

  test('releases the warm session when the run fails before the factory is reached', async () => {
    const target = fixture({ warm: true })
    const upload = await target.app.fetch(uploadRequest())
    const { uploadId } = (await upload.json()) as { uploadId: string }
    // Storing the upload fails, so no run is ever created to own the session.
    target.artifacts.failPut = true

    const started = await target.app.fetch(startRequest({ uploadId, cookie: visitorCookie(upload) }))

    expect(started.status).toBeGreaterThanOrEqual(400)
    expect(target.claimed).toEqual([])
    expect(target.warmed[0]?.abandoned).toBe(1)
    expect(target.meter.calls).toContain('release')
  })

  test('refuses an upload that is not an image', async () => {
    const target = fixture({ warm: true })
    const form = new FormData()
    form.set('image', new File([new Uint8Array([1, 2, 3])], 'note.txt', { type: 'text/plain' }), 'note.txt')
    form.set('filename', 'note.txt')

    const response = await target.app.fetch(
      new Request('https://layerhand.test/api/uploads', { method: 'POST', body: form })
    )

    expect(response.status).toBe(400)
    expect(target.warmSessions?.size).toBe(0)
  })
})

describe('run HTTP contract', () => {
  test('validates, admits, stores, and starts without returning a user key', async () => {
    const target = fixture()
    const sentinel = 'sk-user-secret'

    const response = await target.app.fetch(startRequest({ apiKey: sentinel }))
    const text = await response.text()

    expect(response.status).toBe(201)
    expect(JSON.parse(text)).toEqual({ runId: 'public-run-1' })
    expect(text).not.toContain(sentinel)
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(target.meter.calls[0]).toBe('admit:true')
    expect(target.artifacts.calls[0]).toStartWith('put:upload:')
    expect(target.runRequests[0]?.apiKey).toBe(sentinel)

    await target.registry.waitForTerminal('public-run-1')
    expect(target.released()).toBe(1)
    expect(target.runRequests[0]?.apiKey).toBeUndefined()
    expect(target.meter.calls).toContain('reconcile:211050')
    expect(target.artifacts.calls).toContain('delete:upload/random.png')
  })

  test('gives back the free run when it fails while opening the editor', async () => {
    // Zero steps ever ran, so nothing was ever spent (#116): the editor
    // failed to open before the first model call, unlike a run that fails
    // after making progress, which still used up its free run.
    const target = fixture({ failAtStep: 0 })

    const start = await target.app.fetch(startRequest())
    const { runId } = (await start.json()) as { runId: string }
    await target.registry.waitForTerminal(runId)

    const snapshot = await target.app.fetch(new Request(`https://layerhand.test/api/runs/${runId}`))
    expect((await snapshot.json()).status).toBe('failed')
    expect(target.meter.calls).toContain('release')
    expect(target.meter.calls.some((call) => call.startsWith('reconcile:'))).toBe(false)
  })

  test('rejects oversized metadata and malformed images before admission', async () => {
    const target = fixture()
    const oversized = new Request('https://layerhand.test/api/runs', {
      method: 'POST',
      headers: { 'content-length': String(21 * 1024 * 1024) },
      body: 'small body with a dishonest but rejectable declared length'
    })

    const oversizedResponse = await target.app.fetch(oversized)
    const malformedResponse = await target.app.fetch(
      startRequest({ image: new Blob(['not an image']), instruction: 'Retouch this' })
    )

    expect(oversizedResponse.status).toBe(413)
    expect(await oversizedResponse.json()).toEqual({
      code: 'request_too_large',
      message: 'The upload exceeds the 20 MB request limit.'
    })
    expect(malformedResponse.status).toBe(400)
    expect((await malformedResponse.json()).code).toBe('unsupported_image_format')
    expect(target.meter.calls).toEqual([])
    expect(target.artifacts.calls).toEqual([])
  })

  test('refuses a chunked body past the limit before it is buffered', async () => {
    const target = fixture()
    // A body with no declared length, which only counting its bytes can refuse.
    const chunked = (path: string) => {
      let sent = 0
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          sent += 1
          controller.enqueue(new Uint8Array(1024 * 1024))
          if (sent >= 64) controller.close()
        }
      })
      const request = new Request(`https://layerhand.test${path}`, {
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data; boundary=layerhand' },
        body,
        duplex: 'half'
      } as RequestInit)
      return { request, sent: () => sent }
    }

    const upload = chunked('/api/uploads')
    const start = chunked('/api/runs')
    const uploadResponse = await target.app.fetch(upload.request)
    const startResponse = await target.app.fetch(start.request)

    for (const response of [uploadResponse, startResponse]) {
      expect(response.status).toBe(413)
      expect(await response.json()).toEqual({
        code: 'request_too_large',
        message: 'The upload exceeds the 20 MB request limit.'
      })
    }
    // Both reads stopped just past the 20 MB limit rather than taking all 64.
    expect(upload.sent()).toBeLessThan(24)
    expect(start.sent()).toBeLessThan(24)
    expect(target.meter.calls).toEqual([])
  })

  test('returns a stated limit response without starting paid work', async () => {
    const meter = new RecordingMeter()
    meter.refuse = {
      accepted: false,
      code: 'daily_budget_reached',
      message: "Today's free-run budget is used up. Add your own OpenAI API key to continue."
    }
    const target = fixture({ meter })

    const response = await target.app.fetch(startRequest())

    expect(response.status).toBe(429)
    expect(await response.json()).toEqual(meter.refuse)
    expect(target.artifacts.calls).toEqual([])
    expect(target.runRequests).toEqual([])
  })

  test('releases admission even when later cleanup also fails', async () => {
    const target = fixture()
    target.failNextRunStart()
    target.artifacts.failDelete = true

    const response = await target.app.fetch(startRequest())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      code: 'run_start_failed',
      message: 'The run could not be started. Try again in a moment.'
    })
    expect(target.artifacts.calls).toContain('delete:upload/random.png')
    expect(target.meter.calls).toContain('release')
  })

  test('replays SSE, returns snapshots, and exposes steering and cancellation', async () => {
    const target = fixture()
    const start = await target.app.fetch(startRequest())
    const { runId } = (await start.json()) as { runId: string }

    const steer = await target.app.fetch(
      new Request(`https://layerhand.test/api/runs/${runId}/steer`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'Keep the label unchanged' })
      })
    )
    expect(steer.status).toBe(202)
    expect(await steer.json()).toEqual({ accepted: true })

    await target.registry.waitForTerminal(runId)
    const snapshot = await target.app.fetch(new Request(`https://layerhand.test/api/runs/${runId}`))
    const snapshotBody = await snapshot.json()
    expect(snapshotBody.status).toBe('complete')
    expect(snapshotBody.corrections).toEqual(['Keep the label unchanged'])
    expect(snapshotBody.lastEventId).toBeGreaterThan(0)

    const events = await target.app.fetch(new Request(`https://layerhand.test/api/runs/${runId}/events`))
    const eventText = await events.text()
    expect(events.headers.get('content-type')).toContain('text/event-stream')
    expect(eventText).toContain('id: 0\n')
    expect(eventText).toContain('"type":"done"')

    const cancel = await target.app.fetch(
      new Request(`https://layerhand.test/api/runs/${runId}/cancel`, { method: 'POST' })
    )
    expect(cancel.status).toBe(409)
    expect((await cancel.json()).code).toBe('run_ended')
  })

  test('stores waitlist submissions idempotently through Contract 3', async () => {
    const target = fixture()
    const request = () =>
      new Request('https://layerhand.test/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: ' Ada@Example.COM ' })
      })

    const first = await target.app.fetch(request())
    const duplicate = await target.app.fetch(request())

    expect(first.status).toBe(201)
    expect(await first.json()).toEqual({ email: 'Ada@example.com', created: true })
    expect(duplicate.status).toBe(200)
    expect(await duplicate.json()).toEqual({ email: 'Ada@example.com', created: false })
  })
})

describe('event stream keep-alive', () => {
  test('keeps the SSE stream open across a fifteen-second gap between events (#113)', async () => {
    const registry = new RunRegistry()
    const routes = new RunRoutes({
      registry,
      meterStore: new RecordingMeter(),
      artifactStore: new RecordingArtifacts(),
      waitlistStore: new MemoryWaitlistStore(),
      sessionSecret: 'session-secret',
      trustProxyHops: 0,
      freeRunReservationMicroUsd: usdToMicroUsd(10),
      clientAddress: () => '203.0.113.10',
      now: () => new Date('2026-09-15T12:00:00.000Z'),
      idGenerator: () => 'events-run',
      runFactory: () => ({
        handle: {
          events: (async function* (): AsyncGenerator<RunEvent> {
            yield { type: 'started', runId: 'events-run', viewport: { width: 1440, height: 900 } }
            // The gap the issue reproduces: quiet long enough that Bun's
            // default ten-second idle timeout would close the connection
            // without a heartbeat.
            await new Promise((resolve) => setTimeout(resolve, 15_000))
            yield {
              type: 'done',
              result: {
                psdUrl: 'https://artifacts.example/psd',
                previewUrl: 'https://artifacts.example/preview',
                layers: [],
                complete: true
              }
            }
          })(),
          steer: async () => undefined,
          cancel: async () => undefined
        },
        metrics: () => ({ cacheHitRate: null, stopReason: 'complete' }),
        releaseSecrets() {}
      })
    })
    const app = createApplication({ databaseReady: async () => true, routes })
    // A real Bun.serve, not the in-process app.fetch the other tests use:
    // only a live connection is subject to Bun's idle timeout, and none is
    // set here, matching src/server/index.ts.
    const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: app.fetch })

    try {
      const start = await app.fetch(startRequest())
      const { runId } = (await start.json()) as { runId: string }

      const response = await fetch(`${server.url.origin}/api/runs/${runId}/events`)
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let text = ''
      try {
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          text += decoder.decode(value, { stream: true })
        }
      } catch {
        // A connection Bun closed mid-stream surfaces as a read error here;
        // the text collected before that is still evidence either way.
      }

      expect(text).toContain('"type":"started"')
      expect(text).toContain('"type":"done"')
    } finally {
      server.stop(true)
    }
  }, 20_000)
})
