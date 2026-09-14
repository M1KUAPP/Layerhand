import { describe, expect, test } from 'bun:test'

import { RunApi, RunApiError, decodeRunEvent, decodeRunSnapshot } from '../../src/web/api'
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
  corrections: [],
  recoverableErrors: []
} satisfies RunSnapshot

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

  test('starts, restores, steers, cancels, and joins through stable routes', async () => {
    const calls: { url: string; init?: RequestInit }[] = []
    const responses = [
      Response.json({ runId: 'run-9' }, { status: 201 }),
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

    await expect(api.start(form)).resolves.toEqual({ runId: 'run-9' })
    await expect(api.snapshot('run-9')).resolves.toEqual(snapshot)
    await expect(api.steer('run-9', 'Keep the label')).resolves.toEqual({ accepted: true })
    await expect(api.cancel('run-9')).resolves.toEqual({ accepted: true })
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
  })

  test('surfaces only the stable public API error', async () => {
    const api = new RunApi(async () =>
      Response.json(
        { code: 'daily_budget_reached', message: 'Add your own key to continue.', provider: 'private' },
        { status: 429 }
      )
    )

    await expect(api.cancel('run-1')).rejects.toEqual(
      new RunApiError('daily_budget_reached', 'Add your own key to continue.', 429)
    )
  })
})
