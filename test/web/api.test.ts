import { describe, expect, test } from 'bun:test'

import { RunApi, RunApiError, decodeRunEvent, decodeRunSnapshot } from '../../src/web/api'
import type { LayerInfo } from '../../src/editor'
import type { RunSnapshot } from '../../src/server/run-registry'

const snapshot = {
  runId: 'run-1',
  status: 'running',
  steps: 1,
  cap: 15,
  narration: 'Selecting the product',
  frameUrl: '/frame.png',
  costUsd: 0.04,
  tokensIn: 1570,
  tokensOut: 750,
  lastEventId: 3,
  corrections: [],
  recoverableErrors: []
} satisfies RunSnapshot

const nestedLayers: LayerInfo[] = [
  {
    name: 'Retouching group',
    kind: 'group',
    visible: true,
    masks: [],
    children: [
      {
        name: 'Background isolation',
        kind: 'raster',
        visible: true,
        masks: [{ kind: 'pixel', enabled: true }],
        children: []
      }
    ]
  }
]

function completeSnapshot(layers: unknown) {
  return {
    ...snapshot,
    status: 'complete',
    result: {
      psdUrl: '/result.psd',
      previewUrl: '/result.png',
      layers,
      complete: true
    }
  }
}

describe('browser API validation', () => {
  test('accepts complete snapshot and event payloads', () => {
    expect(decodeRunSnapshot(snapshot)).toEqual(snapshot)
    expect(decodeRunEvent({ type: 'frame', pngUrl: '/frame.png' })).toEqual({
      type: 'frame',
      pngUrl: '/frame.png'
    })
  })

  test('rejects malformed provider-shaped payloads', () => {
    expect(() => decodeRunSnapshot({ ...snapshot, costUsd: 'secret' })).toThrow(RunApiError)
    expect(() => decodeRunEvent({ type: 'done', result: { previewUrl: 4 } })).toThrow(RunApiError)
    expect(() => decodeRunEvent({ type: 'unknown', apiKey: 'sk-secret' })).toThrow(RunApiError)
  })

  test('decodes a queued run, its place in line, and each change of place', () => {
    const queued = {
      ...snapshot,
      status: 'queued',
      steps: 0,
      cap: null,
      narration: null,
      frameUrl: null,
      lastEventId: 0,
      queuePosition: 2
    } satisfies RunSnapshot

    expect(decodeRunSnapshot(queued)).toEqual(queued)
    expect(decodeRunEvent({ type: 'queued', position: 2 })).toEqual({ type: 'queued', position: 2 })
    expect(() => decodeRunSnapshot({ ...queued, queuePosition: 'second' })).toThrow(RunApiError)
    expect(() => decodeRunEvent({ type: 'queued', position: 0 })).toThrow(RunApiError)
  })

  test('delivers a change of place in line from the event stream', () => {
    const listeners = new Map<string, (event: Event) => void>()
    const api = new RunApi(fetch, () => ({
      addEventListener: (type, listener) => void listeners.set(type, listener),
      close() {}
    }))
    const received: unknown[] = []

    api.subscribe(
      'run-1',
      (id, event) => received.push({ id, event }),
      () => received.push('connection failed')
    )
    listeners.get('queued')?.(
      new MessageEvent('queued', { data: JSON.stringify({ type: 'queued', position: 1 }), lastEventId: '4' })
    )

    expect(received).toEqual([{ id: 4, event: { type: 'queued', position: 1 } }])
  })

  test('decodes recursive layer trees', () => {
    expect(decodeRunSnapshot(completeSnapshot(nestedLayers)).result?.layers).toEqual(nestedLayers)
  })

  test('rejects invalid recursive layer values', () => {
    expect(() =>
      decodeRunSnapshot(
        completeSnapshot([{ name: 'Mask layer', kind: 'mask', visible: true, masks: [], children: [] }])
      )
    ).toThrow(RunApiError)
    expect(() =>
      decodeRunSnapshot(
        completeSnapshot([
          { name: 'Original', kind: 'raster', visible: true, masks: [{ kind: 'unknown', enabled: true }], children: [] }
        ])
      )
    ).toThrow(RunApiError)
    expect(() =>
      decodeRunSnapshot(
        completeSnapshot([
          { name: 'Original', kind: 'raster', visible: true, masks: [{ kind: 'pixel', enabled: 'yes' }], children: [] }
        ])
      )
    ).toThrow(RunApiError)
    expect(() =>
      decodeRunSnapshot(
        completeSnapshot([{ name: 'Original', kind: 'raster', visible: true, masks: {}, children: [] }])
      )
    ).toThrow(RunApiError)
    expect(() =>
      decodeRunSnapshot(
        completeSnapshot([{ name: 'Original', kind: 'raster', visible: true, masks: [], children: {} }])
      )
    ).toThrow(RunApiError)
    expect(() =>
      decodeRunSnapshot(
        completeSnapshot([
          {
            name: 'Retouching group',
            kind: 'group',
            visible: true,
            masks: [],
            children: [{ name: 'Broken', kind: 'raster', visible: true, masks: [], children: [{}] }]
          }
        ])
      )
    ).toThrow(RunApiError)
  })

  test('warms an editor for a chosen image, and reports a server with none to warm', async () => {
    const calls: string[] = []
    const responses = [
      Response.json({ uploadId: 'upload-1', warming: true }, { status: 201 }),
      Response.json({ uploadId: null, warming: false }, { status: 201 })
    ]
    const api = new RunApi(async (input) => {
      calls.push(String(input))
      return responses.shift()!
    })
    const form = new FormData()
    form.set('filename', 'photo.png')

    await expect(api.warmUpload(form)).resolves.toEqual({ uploadId: 'upload-1' })
    await expect(api.warmUpload(form)).resolves.toEqual({ uploadId: null })

    expect(calls).toEqual(['/api/uploads', '/api/uploads'])
  })

  test('starts, restores, steers, cancels, and joins through stable routes', async () => {
    const calls: { url: string; init?: RequestInit }[] = []
    const responses = [
      Response.json({ runId: 'run-9', runToken: 'token-9' }, { status: 201 }),
      Response.json(snapshot),
      Response.json({ accepted: true }, { status: 202 }),
      Response.json({ accepted: true }, { status: 202 }),
      Response.json({ created: true, email: 'person@example.com' }, { status: 201 })
    ]
    const api = new RunApi(async (input, init) => {
      calls.push({ url: String(input), init })
      return responses.shift()!
    })
    const form = new FormData()
    form.set('instruction', 'Remove the background')

    await expect(api.start(form)).resolves.toEqual({ runId: 'run-9', runToken: 'token-9' })
    await expect(api.snapshot('run-9')).resolves.toEqual(snapshot)
    await expect(api.steer('run-9', 'token-9', 'Keep the label')).resolves.toEqual({ accepted: true })
    await expect(api.cancel('run-9', 'token-9')).resolves.toEqual({ accepted: true })
    await expect(api.joinWaitlist('Person@example.com')).resolves.toEqual({
      created: true,
      email: 'person@example.com'
    })

    expect(calls.map(({ url }) => url)).toEqual([
      '/api/runs',
      '/api/runs/run-9',
      '/api/runs/run-9/steer',
      '/api/runs/run-9/cancel',
      '/api/waitlist'
    ])
    expect(calls[2]?.init?.body).toBe(JSON.stringify({ text: 'Keep the label' }))
    expect(calls[2]?.init?.headers).toMatchObject({ authorization: 'Bearer token-9' })
    expect(calls[3]?.init?.headers).toMatchObject({ authorization: 'Bearer token-9' })
  })

  test('refuses a start response that carries no run token', async () => {
    const api = new RunApi(async () => Response.json({ runId: 'run-9' }, { status: 201 }))

    await expect(api.start(new FormData())).rejects.toEqual(
      new RunApiError('invalid_response', 'The server returned an invalid response.')
    )
  })

  test('surfaces only the stable public API error', async () => {
    const api = new RunApi(async () =>
      Response.json(
        { code: 'daily_budget_reached', message: 'Add your own key to continue.', provider: 'private' },
        { status: 429 }
      )
    )

    await expect(api.cancel('run-1', 'token-1')).rejects.toEqual(
      new RunApiError('daily_budget_reached', 'Add your own key to continue.', 429)
    )
  })
})
