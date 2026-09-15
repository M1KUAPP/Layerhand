import { beforeAll, describe, expect, test } from 'bun:test'

import { fakeRun } from '../../src/agent/fake-run'
import type { RunRequest } from '../../src/agent/contract'
import { createApplication } from '../../src/server/application'
import type { ArtifactPutRequest, ArtifactStore, StoredArtifact } from '../../src/server/artifact-store'
import type { AdmissionRequest, AdmissionResult, MeterReservation, MeterStore } from '../../src/server/meter-store'
import { usdToMicroUsd } from '../../src/server/meter-store'
import { RunRegistry } from '../../src/server/run-registry'
import { RunRoutes } from '../../src/server/run-routes'
import { MemoryWaitlistStore } from '../../src/server/waitlist-store'

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

  async put(request: ArtifactPutRequest): Promise<StoredArtifact> {
    this.calls.push(`put:${request.kind}:${request.bytes.byteLength}`)
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

function startRequest(options: { image?: Blob; instruction?: string; apiKey?: string } = {}) {
  const form = new FormData()
  const pngBuffer = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer
  form.set('image', options.image ?? new File([pngBuffer], 'photo.png', { type: 'image/png' }), 'photo.png')
  form.set('filename', 'photo.png')
  form.set('instruction', options.instruction ?? 'Remove the background')
  if (options.apiKey) form.set('apiKey', options.apiKey)
  return new Request('https://layerhand.test/api/runs', { method: 'POST', body: form })
}

function fixture(overrides: { meter?: RecordingMeter } = {}) {
  const meter = overrides.meter ?? new RecordingMeter()
  const artifacts = new RecordingArtifacts()
  const registry = new RunRegistry()
  const runRequests: RunRequest[] = []
  let releasedSecrets = 0
  let nextId = 0
  let failRunFactory = false
  const routes = new RunRoutes({
    registry,
    meterStore: meter,
    artifactStore: artifacts,
    waitlistStore: new MemoryWaitlistStore(),
    sessionSecret: 'session-secret',
    trustProxyHops: 0,
    freeRunReservationMicroUsd: usdToMicroUsd(10),
    clientAddress: () => '203.0.113.10',
    now: () => new Date('2026-09-15T12:00:00.000Z'),
    idGenerator: () => `public-run-${++nextId}`,
    runFactory(request) {
      if (failRunFactory) return Promise.reject(new Error('run factory failed'))
      runRequests.push(request)
      return {
        handle: fakeRun(request, { intervalMs: 1 }),
        metrics: () => ({ cacheHitRate: null, stopReason: 'complete' }),
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
    released: () => releasedSecrets,
    failNextRunStart: () => {
      failRunFactory = true
    }
  }
}

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
