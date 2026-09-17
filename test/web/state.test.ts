import { describe, expect, test } from 'bun:test'

import type { RunStopReason } from '../../src/agent/contract'
import type { RunSnapshot } from '../../src/server/run-registry'
import { initialClientState, reduceClientState, formatCredits, resultOutcomeText } from '../../src/web/state'

const result = {
  psdUrl: '/result.psd',
  previewUrl: '/preview.png',
  complete: true,
  layers: [
    { name: 'Original photograph', kind: 'raster' as const, visible: true, masks: [], children: [] },
    { name: 'Warm highlights', kind: 'adjustment' as const, visible: true, masks: [], children: [] }
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
    const running = reduceClientState(input, { type: 'started', runId: 'run-1', instruction: 'Clean the reflections.' })

    expect(input).toEqual({ view: 'input' })
    expect(running).toMatchObject({
      view: 'running',
      progress: { runId: 'run-1', instruction: 'Clean the reflections.', cap: 40 }
    })
    expect(JSON.stringify(running)).not.toContain('apiKey')
  })

  test('restores through a dedicated view and keeps the stored instruction', () => {
    const restoring = reduceClientState(initialClientState(), { type: 'restoring', runId: 'run-1' })
    expect(restoring).toEqual({ view: 'restoring', runId: 'run-1' })

    const running = reduceClientState(restoring, {
      type: 'snapshot',
      snapshot: runningSnapshot({ cap: null }),
      instruction: 'Clean the reflections.'
    })
    expect(running).toMatchObject({
      view: 'running',
      progress: { instruction: 'Clean the reflections.', cap: 40 }
    })

    const failed = reduceClientState(restoring, {
      type: 'connection_failed',
      message: 'The server could not be reached.'
    })
    expect(failed).toEqual({ view: 'error', message: 'The server could not be reached.', runId: 'run-1' })
  })

  test('keeps the instruction when a reconnect snapshot has none', () => {
    let state = reduceClientState(initialClientState(), {
      type: 'started',
      runId: 'run-1',
      instruction: 'Clean the reflections.'
    })
    state = reduceClientState(state, { type: 'snapshot', snapshot: runningSnapshot() })

    expect(state).toMatchObject({ view: 'running', progress: { instruction: 'Clean the reflections.' } })
  })

  test('reduces ordered events and ignores duplicate event ids', () => {
    let state = reduceClientState(initialClientState(), {
      type: 'started',
      runId: 'run-1',
      instruction: 'Clean the reflections.'
    })
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
    let state = reduceClientState(initialClientState(), {
      type: 'started',
      runId: 'run-1',
      instruction: 'Clean the reflections.'
    })
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
      snapshot: runningSnapshot({
        status: 'incomplete',
        stopReason: 'step_cap',
        result: { ...result, complete: false }
      })
    })
    const cancelled = reduceClientState(running, {
      type: 'snapshot',
      snapshot: runningSnapshot({
        status: 'cancelled',
        stopReason: 'cancelled',
        result: { ...result, complete: false }
      })
    })

    expect(running).toMatchObject({ view: 'running', progress: { frameUrl: '/frame-1.png' } })
    expect(incomplete).toMatchObject({ view: 'result', outcome: 'step_cap' })
    expect(cancelled).toMatchObject({ view: 'result', outcome: 'cancelled' })
  })

  test('gives no reason for a reload snapshot missing one, rather than guessing the step cap', () => {
    const state = reduceClientState(initialClientState(), {
      type: 'snapshot',
      snapshot: runningSnapshot({ status: 'incomplete', result: { ...result, complete: false } })
    })

    expect(state).toMatchObject({ view: 'result', outcome: 'failed' })
  })

  test('agrees with a reload for a spend-cap stop, a shutdown, and a time limit', () => {
    for (const stopReason of ['spend_cap', 'shutdown', 'time_limit'] as const) {
      let live = reduceClientState(initialClientState(), {
        type: 'started',
        runId: 'run-1',
        instruction: 'Clean the reflections.'
      })
      live = reduceClientState(live, {
        type: 'event',
        id: 9,
        event: { type: 'done', result: { ...result, complete: false, stopReason } }
      })
      const reloaded = reduceClientState(initialClientState(), {
        type: 'snapshot',
        snapshot: runningSnapshot({ status: 'incomplete', stopReason, result: { ...result, complete: false } })
      })

      expect(live).toMatchObject({ view: 'result', outcome: stopReason })
      expect(reloaded).toMatchObject({ view: 'result', outcome: stopReason })
    }
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
    let state = reduceClientState(initialClientState(), {
      type: 'started',
      runId: 'run-1',
      instruction: 'Clean the reflections.'
    })
    state = reduceClientState(state, { type: 'cancel_requested' })
    state = reduceClientState(state, {
      type: 'event',
      id: 7,
      event: { type: 'done', result: { ...result, complete: false, stopReason: 'cancelled' } }
    })

    expect(state).toMatchObject({
      view: 'result',
      outcome: 'cancelled',
      result: { ...result, complete: false }
    })
  })

  test('turns fatal run and connection failures into a specific error state', () => {
    const running = reduceClientState(initialClientState(), {
      type: 'started',
      runId: 'run-1',
      instruction: 'Clean the reflections.'
    })
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

  test('shows a queued run in the running view with its place in line, until it starts', () => {
    const restored = reduceClientState(initialClientState(), {
      type: 'snapshot',
      snapshot: runningSnapshot({ status: 'queued', steps: 0, narration: null, frameUrl: null, queuePosition: 3 })
    })
    expect(restored).toMatchObject({ view: 'running', progress: { queuePosition: 3 } })

    let state = reduceClientState(initialClientState(), {
      type: 'started',
      runId: 'run-1',
      instruction: 'Clean the reflections.'
    })
    expect(state).toMatchObject({ view: 'running', progress: { queuePosition: null } })
    state = reduceClientState(state, { type: 'event', id: 0, event: { type: 'queued', position: 2 } })
    expect(state).toMatchObject({ view: 'running', progress: { queuePosition: 2 } })
    state = reduceClientState(state, { type: 'event', id: 1, event: { type: 'queued', position: 1 } })
    state = reduceClientState(state, {
      type: 'event',
      id: 2,
      event: { type: 'started', runId: 'run-1', viewport: { width: 1440, height: 900 } }
    })
    expect(state).toMatchObject({ view: 'running', progress: { queuePosition: null } })
  })

  test('returns to the form when the visitor leaves the queue', () => {
    let state = reduceClientState(initialClientState(), {
      type: 'started',
      runId: 'run-1',
      instruction: 'Clean the reflections.'
    })
    state = reduceClientState(state, { type: 'event', id: 0, event: { type: 'queued', position: 1 } })
    state = reduceClientState(state, { type: 'cancel_requested' })
    state = reduceClientState(state, {
      type: 'event',
      id: 1,
      event: { type: 'error', reason: 'You left the queue before the run started.', recoverable: false }
    })

    expect(state).toEqual({ view: 'input' })
  })

  test('formats running USD cost as stable display credits', () => {
    expect(formatCredits(0)).toBe('0.00 credits')
    expect(formatCredits(0.21105)).toBe('0.21 credits')
  })

  test('states the true stop reason for every outcome, never defaulting to the step cap (#125)', () => {
    const expected: Record<RunStopReason, string> = {
      complete: 'The requested retouch completed.',
      cancelled: 'You cancelled the run. Layerhand kept the work completed so far.',
      shutdown: 'The service restarted before the run finished. Layerhand kept the work completed so far.',
      step_cap: 'The step cap was reached. Layerhand kept the work completed so far.',
      spend_cap: 'The spend limit was reached. Layerhand kept the work completed so far.',
      time_limit: 'The time limit was reached. Layerhand kept the work completed so far.',
      failed: 'Layerhand kept the work completed so far.'
    }
    const reasons = Object.keys(expected) as RunStopReason[]
    for (const reason of reasons) {
      expect(resultOutcomeText(reason)).toBe(expected[reason])
    }

    // Only the run that actually hit the step cap should mention it (#125);
    // the rest name their own cap or, for shutdown and failed, none at all.
    for (const reason of reasons) {
      if (reason !== 'step_cap') expect(resultOutcomeText(reason)).not.toContain('step cap')
    }
    expect(resultOutcomeText('spend_cap')).toContain('spend limit')
    expect(resultOutcomeText('shutdown')).not.toMatch(/you|cap/i)
    expect(resultOutcomeText('failed')).not.toMatch(/cap/i)

    // A result an older server sent with no stop reason resolves to 'failed'
    // before resultOutcomeText ever sees it (the reducer fallback tested
    // above), so it gets the same cap-free text as an explicit failure.
    const noReasonSnapshot = runningSnapshot({ status: 'incomplete', result: { ...result, complete: false } })
    const state = reduceClientState(initialClientState(), { type: 'snapshot', snapshot: noReasonSnapshot })
    expect(state).toMatchObject({ view: 'result', outcome: 'failed' })
    expect(resultOutcomeText('failed')).toBe(expected.failed)
  })

  test('shows a notice and keeps the running view when a refusal arrives before done (#123)', () => {
    let state = reduceClientState(initialClientState(), {
      type: 'started',
      runId: 'run-1',
      instruction: 'Clean the reflections.'
    })
    state = reduceClientState(state, { type: 'cancel_requested' })
    state = reduceClientState(state, {
      type: 'action_refused',
      message: 'The run is finishing, so the correction was not applied.'
    })

    expect(state).toMatchObject({
      view: 'running',
      progress: {
        cancelRequested: true,
        recoverableErrors: ['The run is finishing, so the correction was not applied.']
      }
    })
  })

  test('shows a notice and keeps the result when a refusal arrives after done (#123)', () => {
    let state = reduceClientState(initialClientState(), {
      type: 'started',
      runId: 'run-1',
      instruction: 'Clean the reflections.'
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 0,
      event: { type: 'done', result: { ...result, complete: false, stopReason: 'cancelled' } }
    })
    // The correction's response arrives only after the cancel already ended
    // the run: the result must survive, not be replaced by an error (#123).
    state = reduceClientState(state, { type: 'action_refused', message: 'The run has already ended.' })

    expect(state).toMatchObject({
      view: 'result',
      outcome: 'cancelled',
      result: { ...result, complete: false },
      progress: { recoverableErrors: ['The run has already ended.'] }
    })
  })

  test('ignores a refusal once the view has left the run entirely (#123)', () => {
    const state = reduceClientState(initialClientState(), {
      type: 'action_refused',
      message: 'The run has already ended.'
    })

    expect(state).toEqual({ view: 'landing' })
  })
})
