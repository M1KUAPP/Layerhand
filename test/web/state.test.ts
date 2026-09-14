import { describe, expect, test } from 'bun:test'

import type { RunSnapshot } from '../../src/server/run-registry'
import { initialClientState, reduceClientState, formatCredits } from '../../src/web/state'

const result = {
  psdUrl: '/result.psd',
  previewUrl: '/preview.png',
  complete: true,
  layers: [
    { name: 'Original photograph', kind: 'raster' as const, visible: true },
    { name: 'Warm highlights', kind: 'adjustment' as const, visible: true }
  ]
}

function runningSnapshot(overrides: Partial<RunSnapshot> = {}): RunSnapshot {
  return {
    runId: 'run-1',
    status: 'running',
    steps: 1,
    cap: 15,
    narration: 'Selecting the product',
    frameUrl: '/frame-1.png',
    costUsd: 0.21105,
    tokensIn: 1570,
    tokensOut: 750,
    lastEventId: -1,
    corrections: [],
    recoverableErrors: [],
    ...overrides
  }
}

describe('client run reducer', () => {
  test('moves through landing, input, and running without retaining secrets', () => {
    const input = reduceClientState(initialClientState(), { type: 'edit' })
    const running = reduceClientState(input, { type: 'started', runId: 'run-1' })

    expect(input).toEqual({ view: 'input' })
    expect(running).toMatchObject({ view: 'running', progress: { runId: 'run-1' } })
    expect(JSON.stringify(running)).not.toContain('apiKey')
  })

  test('reduces ordered events and ignores duplicate event ids', () => {
    let state = reduceClientState(initialClientState(), { type: 'started', runId: 'run-1' })
    state = reduceClientState(state, {
      type: 'event',
      id: 0,
      event: { type: 'step', n: 2, cap: 15, narration: 'Masking the background' }
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 1,
      event: { type: 'frame', pngUrl: '/frame-1.png' }
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 2,
      event: { type: 'frame', pngUrl: '/frame-2.png' }
    })
    const duplicate = reduceClientState(state, {
      type: 'event',
      id: 2,
      event: { type: 'correction_ack', text: 'This must be ignored' }
    })

    expect(duplicate).toBe(state)
    expect(state).toMatchObject({
      view: 'running',
      progress: {
        steps: 2,
        cap: 15,
        narration: 'Masking the background',
        frameUrl: '/frame-2.png',
        lastEventId: 2,
        corrections: []
      }
    })
  })

  test('keeps correction acknowledgements and recoverable errors visible', () => {
    let state = reduceClientState(initialClientState(), { type: 'started', runId: 'run-1' })
    state = reduceClientState(state, {
      type: 'event',
      id: 3,
      event: { type: 'correction_ack', text: 'Keep the label unchanged' }
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 4,
      event: { type: 'error', reason: 'The live view missed a frame', recoverable: true }
    })

    expect(state).toMatchObject({
      view: 'running',
      progress: {
        corrections: ['Keep the label unchanged'],
        recoverableErrors: ['The live view missed a frame']
      }
    })
  })

  test('hydrates reload snapshots and maps terminal outcomes', () => {
    const running = reduceClientState(initialClientState(), {
      type: 'snapshot',
      snapshot: runningSnapshot()
    })
    const incomplete = reduceClientState(running, {
      type: 'snapshot',
      snapshot: runningSnapshot({ status: 'incomplete', result: { ...result, complete: false } })
    })
    const cancelled = reduceClientState(running, {
      type: 'snapshot',
      snapshot: runningSnapshot({ status: 'cancelled', result: { ...result, complete: false } })
    })

    expect(running).toMatchObject({ view: 'running', progress: { frameUrl: '/frame-1.png' } })
    expect(incomplete).toMatchObject({ view: 'result', outcome: 'incomplete' })
    expect(cancelled).toMatchObject({ view: 'result', outcome: 'cancelled' })
  })

  test('ignores the replay prefix already represented by a snapshot', () => {
    const snapshot = {
      ...runningSnapshot({ corrections: ['Keep the label unchanged'] }),
      lastEventId: 8
    }
    let state = reduceClientState(initialClientState(), { type: 'snapshot', snapshot })
    state = reduceClientState(state, {
      type: 'event',
      id: 8,
      event: { type: 'correction_ack', text: 'Keep the label unchanged' }
    })

    expect(state).toMatchObject({
      view: 'running',
      progress: { lastEventId: 8, corrections: ['Keep the label unchanged'] }
    })
  })

  test('marks a locally cancelled run and preserves its partial result', () => {
    let state = reduceClientState(initialClientState(), { type: 'started', runId: 'run-1' })
    state = reduceClientState(state, { type: 'cancel_requested' })
    state = reduceClientState(state, {
      type: 'event',
      id: 7,
      event: { type: 'done', result: { ...result, complete: false } }
    })

    expect(state).toMatchObject({
      view: 'result',
      outcome: 'cancelled',
      result: { ...result, complete: false }
    })
  })

  test('turns fatal run and connection failures into a specific error state', () => {
    const running = reduceClientState(initialClientState(), { type: 'started', runId: 'run-1' })
    const fatal = reduceClientState(running, {
      type: 'event',
      id: 5,
      event: { type: 'error', reason: 'The editor stopped responding', recoverable: false }
    })
    const connection = reduceClientState(running, {
      type: 'connection_failed',
      message: 'The live connection could not be restored.'
    })

    expect(fatal).toMatchObject({ view: 'error', message: 'The editor stopped responding' })
    expect(connection).toMatchObject({ view: 'error', message: 'The live connection could not be restored.' })
  })

  test('formats running USD cost as stable display credits', () => {
    expect(formatCredits(0)).toBe('0.00 credits')
    expect(formatCredits(0.21105)).toBe('0.21 credits')
  })
})
