import { beforeAll, describe, expect, test } from 'bun:test'

import { fakeRun } from '../../src/agent/fake-run'
import type { RunEvent, RunRequest } from '../../src/agent/contract'
import { createApplication } from '../../src/server/application'
import type { ArtifactPutRequest, ArtifactStore, StoredArtifact } from '../../src/server/artifact-store'
import type { ManagedRun } from '../../src/server/managed-run'
import type { AdmissionRequest, AdmissionResult, MeterReservation, MeterStore } from '../../src/server/meter-store'
import { usdToMicroUsd } from '../../src/server/meter-store'
import { RunRegistry } from '../../src/server/run-registry'
import { RunRoutes } from '../../src/server/run-routes'
import type { OpenAiKeyCheck } from '../../src/server/openai-key'
import { MemoryWaitlistStore } from '../../src/server/waitlist-store'
import { WarmSessionPool, type WarmEditorSession } from '../../src/server/warm-session-pool'

let png: Uint8Array

beforeAll(async () => {
  png = await Bun.file(new URL('../../src/editor/fixtures/document-preview.png', import.meta.url)).bytes()
})

class RecordingMeter implements MeterStore {
  readonly calls: string[] = []
  refuse?: Exclude<AdmissionResult, { accepted: true }>
  /** How many admissions are held back by budget other runs have reserved, before the rest answer as usual. */
  heldBack = 0
  readonly reservation: MeterReservation = {
    visitorKey: 'opaque-visitor',
    addressKey: 'opaque-address',
    dayUtc: '2026-09-15',
    reservedMicroUsd: usdToMicroUsd(10),
    freeTier: true
  }

  async admit(request: AdmissionRequest): Promise<AdmissionResult> {
    this.calls.push(`admit:${request.byok}`)
    if (this.heldBack > 0) {
      this.heldBack -= 1
      return { accepted: false, code: 'budget_reserved', message: 'Free runs in progress have reserved the budget.' }
    }
    return this.refuse ?? { accepted: true, reservation: this.reservation }
  }

  async renew(reservation: MeterReservation): Promise<AdmissionResult> {
    expect(reservation).toBe(this.reservation)
    this.calls.push('renew')
    return { accepted: true, reservation }
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

/**
 * A managed run whose model stopped answering after retries (Task 104, not
 * yet merged): the loop treats that like a cap, so it ends with a `done`
 * event and an incomplete result rather than an unrecoverable error. The
 * manager still reports the run failed, and nothing was ever spent.
 */
function stoppedModelRun(): ManagedRun {
  return {
    handle: {
      events: {
        async *[Symbol.asyncIterator]() {
          yield { type: 'started', runId: 'stopped-run', viewport: { width: 1440, height: 900 } } satisfies RunEvent
          yield {
            type: 'error',
            reason: 'The model stopped answering, so the run stopped',
            recoverable: true
          } satisfies RunEvent
          yield {
            type: 'done',
            result: { psdUrl: 'psd-url', previewUrl: 'preview-url', layers: [], complete: false }
          } satisfies RunEvent
        }
      },
      async steer() {},
      async cancel() {}
    },
    metrics: () => ({ cacheHitRate: null, stopReason: 'failed' }),
    releaseSecrets() {}
  }
}

function fixture(
  overrides: {
    meter?: RecordingMeter
    warm?: boolean
    failAtStep?: number
    managedRun?: ManagedRun
    paused?: boolean
    maxConcurrentRuns?: number
    retryWaitingMs?: number
    runIntervalMs?: number
    checkApiKey?: (apiKey: string) => Promise<OpenAiKeyCheck>
  } = {}
) {
  const meter = overrides.meter ?? new RecordingMeter()
  const artifacts = new RecordingArtifacts()
  const registry = new RunRegistry({
    ...(overrides.maxConcurrentRuns === undefined ? {} : { maxConcurrentRuns: overrides.maxConcurrentRuns }),
    ...(overrides.retryWaitingMs === undefined ? {} : { retryWaitingMs: overrides.retryWaitingMs })
  })
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
    ...(overrides.checkApiKey ? { checkApiKey: overrides.checkApiKey } : {}),
    meterStore: meter,
    artifactStore: artifacts,
    waitlistStore: new MemoryWaitlistStore(),
    sessionSecret: 'session-secret',
    trustProxyHops: 0,
    freeRunReservationMicroUsd: usdToMicroUsd(10),
    clientAddress: () => '203.0.113.10',
    now: () => new Date('2026-09-15T12:00:00.000Z'),
    idGenerator: () => `public-run-${++nextId}`,
    runsPaused: overrides.paused,
    runFactory(request, warmSession) {
      claimed.push(warmSession)
      if (failRunFactory) return Promise.reject(new Error('run factory failed'))
      runRequests.push(request)
      if (overrides.managedRun) return overrides.managedRun
      return {
        handle: fakeRun(request, {
          intervalMs: overrides.runIntervalMs ?? 1,
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
    const { runId } = (await started.json()) as { runId: string }
    await target.registry.waitForTerminal(runId)

    expect(started.status).toBe(201)
    expect(await target.registry.getSnapshot(runId)).toMatchObject({
      status: 'failed',
      failureReason: 'The run could not be started. Try again in a moment.'
    })
    expect(target.warmed[0]?.abandoned).toBe(1)
    expect(target.warmSessions?.size).toBe(0)
    expect(target.meter.calls).toContain('release')
  })

  test('leaves the warm session for a retry when the upload cannot be stored', async () => {
    const target = fixture({ warm: true })
    const upload = await target.app.fetch(uploadRequest())
    const { uploadId } = (await upload.json()) as { uploadId: string }
    // Storing the upload fails, so no run is ever created to claim the session.
    target.artifacts.failPut = true

    const started = await target.app.fetch(startRequest({ uploadId, cookie: visitorCookie(upload) }))

    expect(started.status).toBeGreaterThanOrEqual(400)
    expect(target.claimed).toEqual([])
    // Still warm, so a retry can claim it, and released by the pool if none does.
    expect(target.warmSessions?.size).toBe(1)
    expect(target.warmed[0]?.abandoned).toBe(0)
    expect(target.meter.calls).toContain('release')
  })

  test('does not warm an editor while paused', async () => {
    const target = fixture({ warm: true, paused: true })

    const upload = await target.app.fetch(uploadRequest())

    expect(upload.status).toBe(201)
    expect(await upload.json()).toEqual({ uploadId: null, warming: false })
    expect(target.warmSessions?.size).toBe(0)
  })

  test('claims the warm session when a queued run starts, not while it waits', async () => {
    const target = fixture({ warm: true, maxConcurrentRuns: 1, runIntervalMs: 60_000 })
    const first = (await (await target.app.fetch(startRequest())).json()) as { runId: string }
    const upload = await target.app.fetch(uploadRequest())
    const { uploadId } = (await upload.json()) as { uploadId: string }

    const second = await target.app.fetch(startRequest({ uploadId, cookie: visitorCookie(upload) }))
    const { runId } = (await second.json()) as { runId: string }
    expect(await target.registry.getSnapshot(runId)).toMatchObject({ status: 'queued', queuePosition: 1 })
    expect(target.warmSessions?.size).toBe(1)

    await target.registry.cancel(first.runId)
    for await (const { event } of target.registry.events(runId)) if (event.type === 'started') break

    expect(target.claimed.map((session) => session?.id)).toEqual([undefined, 'warm-1'])
    // Its reservation counts from when it started, not from when it joined the line.
    expect(target.meter.calls).toEqual(['admit:false', 'renew', 'admit:false', 'reconcile:0', 'renew'])
    expect(target.warmSessions?.size).toBe(0)
    await target.registry.cancel(runId)
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

  test('turns away a key OpenAI refuses before anything is stored, reserved, or opened for it', async () => {
    const checked: string[] = []
    const target = fixture({
      checkApiKey: async (apiKey) => {
        checked.push(apiKey)
        return 'refused'
      }
    })

    const response = await target.app.fetch(startRequest({ apiKey: 'sk-mistyped-key-000000' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      code: 'invalid_api_key',
      message: 'OpenAI did not accept this API key. Check the key and try again.'
    })
    expect(checked).toEqual(['sk-mistyped-key-000000'])
    expect(target.meter.calls).toEqual([])
    expect(target.artifacts.calls).toEqual([])
    expect(target.runRequests).toEqual([])
  })

  test('asks for a retry when OpenAI cannot check a key, and checks no key for a free run', async () => {
    const checked: string[] = []
    const target = fixture({
      checkApiKey: async (apiKey) => {
        checked.push(apiKey)
        return 'unchecked'
      }
    })

    const unchecked = await target.app.fetch(startRequest({ apiKey: 'sk-visitor-own-key-000000' }))
    const free = await target.app.fetch(startRequest())

    expect(unchecked.status).toBe(503)
    expect(await unchecked.json()).toEqual({
      code: 'api_key_unchecked',
      message: 'OpenAI could not be reached to check this API key. Try again in a moment.'
    })
    expect(free.status).toBe(201)
    expect(checked).toEqual(['sk-visitor-own-key-000000'])
    expect(target.runRequests).toHaveLength(1)
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

  test('gives back the free run when the model stops answering before any cost', async () => {
    // Task 104 (not yet merged): a model call that fails after retries ends
    // the run like a cap, with a `done` event and an incomplete result, so
    // `snapshot.status` reads `incomplete` rather than `failed`. The manager
    // still reports the run failed, and it happened before any cost (#116).
    const target = fixture({ managedRun: stoppedModelRun() })

    const start = await target.app.fetch(startRequest())
    const { runId } = (await start.json()) as { runId: string }
    await target.registry.waitForTerminal(runId)

    const snapshot = await target.app.fetch(new Request(`https://layerhand.test/api/runs/${runId}`))
    expect((await snapshot.json()).status).toBe('incomplete')
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

  test('refuses to start a run while paused, before admission (#118)', async () => {
    const target = fixture({ paused: true })

    const response = await target.app.fetch(startRequest())

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      code: 'runs_paused',
      message: 'New runs are paused right now. Try again shortly.'
    })
    expect(target.meter.calls).toEqual([])
    expect(target.artifacts.calls).toEqual([])
    expect(target.runRequests).toEqual([])
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
    const { runId } = (await response.json()) as { runId: string }
    await target.registry.waitForTerminal(runId)

    expect(response.status).toBe(201)
    expect((await target.registry.getSnapshot(runId))?.status).toBe('failed')
    expect(target.artifacts.calls).toContain('delete:upload/random.png')
    expect(target.meter.calls).toContain('release')
  })

  test('queues a free run held back only by reserved budget, and starts it once that budget comes back', async () => {
    const meter = new RecordingMeter()
    // Held back when it is submitted, and again when the queue first tries it.
    meter.heldBack = 2
    const target = fixture({ meter, retryWaitingMs: 5 })

    const response = await target.app.fetch(startRequest())
    const { runId } = (await response.json()) as { runId: string }

    expect(response.status).toBe(201)
    expect(await target.registry.getSnapshot(runId)).toMatchObject({ status: 'queued', queuePosition: 1 })
    expect(target.runRequests).toEqual([])

    await target.registry.waitForTerminal(runId)

    expect((await target.registry.getSnapshot(runId))?.status).toBe('complete')
    expect(target.runRequests).toHaveLength(1)
    expect(meter.calls).toEqual(['admit:false', 'admit:false', 'admit:false', 'reconcile:211050'])
  })

  test("ends a waiting free run with the stated message once the day's spending leaves no room for it", async () => {
    const meter = new RecordingMeter()
    meter.heldBack = 1
    meter.refuse = {
      accepted: false,
      code: 'daily_budget_reached',
      message: "Today's free-run budget is used up. Add your own OpenAI API key to continue."
    }
    const target = fixture({ meter })

    const response = await target.app.fetch(startRequest())
    const { runId } = (await response.json()) as { runId: string }
    await target.registry.waitForTerminal(runId)

    expect(response.status).toBe(201)
    expect(await target.registry.getSnapshot(runId)).toMatchObject({
      status: 'failed',
      failureReason: meter.refuse.message
    })
    expect(target.runRequests).toEqual([])
    // It never held a reservation, so there is nothing to give back.
    expect(meter.calls).toEqual(['admit:false', 'admit:false'])
    expect(target.artifacts.calls).toContain('delete:upload/random.png')
  })

  test('turns away a run that would wait in a full line before anything is stored or reserved', async () => {
    const target = fixture({ maxConcurrentRuns: 1, runIntervalMs: 60_000 })
    const runIds: string[] = []
    // One run in flight, and twice as many waiting.
    for (let run = 0; run < 3; run++) {
      runIds.push(((await (await target.app.fetch(startRequest())).json()) as { runId: string }).runId)
    }
    const meterCalls = [...target.meter.calls]
    const artifactCalls = [...target.artifacts.calls]

    const refused = await target.app.fetch(startRequest())

    expect(refused.status).toBe(429)
    expect(await refused.json()).toEqual({
      code: 'queue_full',
      message: 'Layerhand is busy, and the line to start a run is full. Try again in a few minutes.'
    })
    expect(target.meter.calls).toEqual(meterCalls)
    expect(target.artifacts.calls).toEqual(artifactCalls)
    for (const runId of runIds.reverse()) await target.registry.cancel(runId)
  })

  test('turns away a free run that would wait for budget in a full line, but starts one on its own key', async () => {
    const meter = new RecordingMeter()
    // Two free runs, each held back when submitted and when first tried, then a third when submitted.
    meter.heldBack = 5
    const target = fixture({ meter, maxConcurrentRuns: 1 })
    await target.app.fetch(startRequest())
    await target.app.fetch(startRequest())

    const refused = await target.app.fetch(startRequest())
    const ownKey = await target.app.fetch(startRequest({ apiKey: 'sk-visitor-own-key-000000' }))

    expect(refused.status).toBe(429)
    expect(((await refused.json()) as { code: string }).code).toBe('queue_full')
    expect(ownKey.status).toBe(201)
    expect(target.artifacts.calls.filter((call) => call.startsWith('put:'))).toHaveLength(3)
  })

  test('gives back the free run and the upload of a run that leaves the queue', async () => {
    const target = fixture({ maxConcurrentRuns: 1, runIntervalMs: 60_000 })
    const first = (await (await target.app.fetch(startRequest())).json()) as { runId: string }
    const second = (await (await target.app.fetch(startRequest())).json()) as { runId: string }

    const cancel = await target.app.fetch(
      new Request(`https://layerhand.test/api/runs/${second.runId}/cancel`, { method: 'POST' })
    )
    await target.registry.waitForTerminal(second.runId)

    expect(cancel.status).toBe(202)
    expect(target.runRequests).toHaveLength(1)
    expect(target.meter.calls).toEqual(['admit:false', 'renew', 'admit:false', 'release'])
    expect(target.artifacts.calls).toContain('delete:upload/random.png')
    await target.registry.cancel(first.runId)
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

/**
 * A routes instance for the checks below, which do not need warming,
 * failure injection, or any of `fixture()`'s other knobs — just a working
 * HTTP surface with a controllable clock (#115).
 */
function testRoutes(overrides: { now?: () => Date } = {}) {
  const registry = new RunRegistry()
  const meter = new RecordingMeter()
  const artifacts = new RecordingArtifacts()
  let nextId = 0
  const routes = new RunRoutes({
    registry,
    meterStore: meter,
    artifactStore: artifacts,
    waitlistStore: new MemoryWaitlistStore(),
    sessionSecret: 'session-secret',
    trustProxyHops: 0,
    freeRunReservationMicroUsd: usdToMicroUsd(10),
    clientAddress: () => '203.0.113.10',
    now: overrides.now ?? (() => new Date('2026-09-15T12:00:00.000Z')),
    idGenerator: () => `public-run-${++nextId}`,
    runFactory: (request) => ({
      handle: fakeRun(request, { intervalMs: 1 }),
      metrics: () => ({ cacheHitRate: null, stopReason: 'complete' }),
      releaseSecrets() {}
    })
  })
  return { app: createApplication({ databaseReady: async () => true, routes }), registry, meter }
}

function waitlistRequest(headers: HeadersInit = {}): Request {
  return new Request('https://layerhand.test/api/waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ email: 'ada@example.com' })
  })
}

describe('cross-origin protection (#115)', () => {
  test('refuses a state-changing request whose Origin names another site', async () => {
    const { app } = testRoutes()

    const response = await app.fetch(waitlistRequest({ origin: 'https://evil.example' }))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      code: 'origin_refused',
      message: 'This request did not come from the Layerhand page.'
    })
  })

  test('refuses a state-changing request whose Sec-Fetch-Site is not same-origin', async () => {
    const { app } = testRoutes()

    const response = await app.fetch(waitlistRequest({ 'sec-fetch-site': 'cross-site' }))

    expect(response.status).toBe(403)
  })

  test('allows a same-origin request naming its own origin and Sec-Fetch-Site', async () => {
    const { app } = testRoutes()

    const response = await app.fetch(
      waitlistRequest({ origin: 'https://layerhand.test', 'sec-fetch-site': 'same-origin' })
    )

    expect(response.status).toBe(201)
  })

  test('allows a request carrying neither header, a non-browser client', async () => {
    const { app } = testRoutes()

    const response = await app.fetch(waitlistRequest())

    expect(response.status).toBe(201)
  })

  test('leaves a GET request unaffected', async () => {
    const { app } = testRoutes()

    const response = await app.fetch(
      new Request('https://layerhand.test/api/runs/missing', { headers: { origin: 'https://evil.example' } })
    )

    expect(response.status).toBe(404)
  })
})
