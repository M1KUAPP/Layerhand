import { describe, expect, test } from 'bun:test'

import type { RunHandle, RunRequest, RunStopReason } from '../../src/agent/contract'
import { collect } from '../../src/agent/contract-tests'
import { runAgent } from '../../src/agent/loop'
import type { AgentModel } from '../../src/agent/model'
import { createRecordedFakeEditorSession } from '../../src/editor/fake-editor-session'
import type { RunSnapshot } from '../../src/server/run-registry'
import {
  initialClientState,
  reduceClientState,
  correctionStatuses,
  formatCredits,
  resultOutcomeText,
  isCurrentRun
} from '../../src/web/state'

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
    expect(failed).toEqual({
      view: 'error',
      message: 'The server could not be reached.',
      runId: 'run-1',
      reconnectable: true
    })
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

  test('marks a correction stranded by a cancel as never having reached the agent (#124)', () => {
    let state = reduceClientState(initialClientState(), {
      type: 'started',
      runId: 'run-1',
      instruction: 'Clean the reflections.'
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 0,
      event: { type: 'correction_ack', text: 'Keep the label unchanged' }
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 1,
      event: { type: 'error', reason: 'The run stopped before correction 1 reached the agent.', recoverable: true }
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 2,
      event: { type: 'done', result: { ...result, complete: false, stopReason: 'cancelled' } }
    })

    expect(state.view).toBe('result')
    if (state.view !== 'result') throw new Error('unreachable')
    expect(correctionStatuses(state.progress)).toEqual([{ text: 'Keep the label unchanged', delivered: false }])
  })

  test('leaves a correction with no stranding error marked as delivered', () => {
    let state = reduceClientState(initialClientState(), {
      type: 'started',
      runId: 'run-1',
      instruction: 'Clean the reflections.'
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 0,
      event: { type: 'correction_ack', text: 'Keep the label unchanged' }
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 1,
      event: { type: 'done', result: { ...result, complete: true } }
    })

    expect(state.view).toBe('result')
    if (state.view !== 'result') throw new Error('unreachable')
    expect(correctionStatuses(state.progress)).toEqual([{ text: 'Keep the label unchanged', delivered: true }])
  })

  test('marks exactly the corrections a stranding error names, by number, after one the run delivered', () => {
    let state = reduceClientState(initialClientState(), {
      type: 'started',
      runId: 'run-1',
      instruction: 'Clean the reflections.'
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 0,
      event: { type: 'correction_ack', text: 'Keep the label unchanged' }
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 1,
      event: { type: 'step', n: 2, cap: 15, narration: 'Warming the highlights' }
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 2,
      event: { type: 'correction_ack', text: 'Warmer' }
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 3,
      event: { type: 'correction_ack', text: 'Less contrast' }
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 4,
      event: {
        type: 'error',
        reason: 'The run stopped before corrections 2 and 3 reached the agent.',
        recoverable: true
      }
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 5,
      event: { type: 'done', result: { ...result, complete: false, stopReason: 'cancelled' } }
    })

    expect(state.view).toBe('result')
    if (state.view !== 'result') throw new Error('unreachable')
    expect(correctionStatuses(state.progress)).toEqual([
      { text: 'Keep the label unchanged', delivered: true },
      { text: 'Warmer', delivered: false },
      { text: 'Less contrast', delivered: false }
    ])
  })

  test('marks by the number named, not by position from the end (#124)', () => {
    // The exact bug a reviewer found: correction 1 is still queued when the
    // run stops, while correction 2 already reached the agent (a native
    // steer applied it). Marking "the last N" would blame 2, not 1.
    let state = reduceClientState(initialClientState(), {
      type: 'started',
      runId: 'run-1',
      instruction: 'Clean the reflections.'
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 0,
      event: { type: 'correction_ack', text: 'A: sent before response.created' }
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 1,
      event: { type: 'correction_ack', text: 'B: natively applied' }
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 2,
      event: { type: 'error', reason: 'The run stopped before correction 1 reached the agent.', recoverable: true }
    })
    state = reduceClientState(state, {
      type: 'event',
      id: 3,
      event: { type: 'done', result: { ...result, complete: false, stopReason: 'cancelled' } }
    })

    expect(state.view).toBe('result')
    if (state.view !== 'result') throw new Error('unreachable')
    expect(correctionStatuses(state.progress)).toEqual([
      { text: 'A: sent before response.created', delivered: false },
      { text: 'B: natively applied', delivered: true }
    ])
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

    // A run the server ended for good is not worth reconnecting to (#126);
    // only a connection dropped from under a still-live run is.
    expect(fatal).toMatchObject({
      view: 'error',
      message: 'The editor stopped responding',
      reconnectable: false
    })
    expect(connection).toMatchObject({
      view: 'error',
      message: 'The live connection could not be restored.',
      reconnectable: true
    })
  })

  test('marks a run the server reports failed as not reconnectable (#126)', () => {
    const failed = reduceClientState(initialClientState(), {
      type: 'snapshot',
      snapshot: runningSnapshot({ status: 'failed', failureReason: 'The editor stopped responding.' })
    })
    const noResult = reduceClientState(initialClientState(), {
      type: 'snapshot',
      snapshot: runningSnapshot({ status: 'incomplete' })
    })

    expect(failed).toEqual({
      view: 'error',
      message: 'The editor stopped responding.',
      runId: 'run-1',
      reconnectable: false
    })
    expect(noResult).toEqual({
      view: 'error',
      message: 'The run ended without a result.',
      runId: 'run-1',
      reconnectable: false
    })
  })

  test('marks a run the server refuses outright as not reconnectable (#126)', () => {
    // restoreRun's catch dispatches this for a `RunApiError` (a stated
    // server answer, such as a run that has aged out of the registry),
    // never for a dropped connection, so reconnecting cannot just repeat
    // the same refusal.
    const state = reduceClientState(initialClientState(), {
      type: 'run_unavailable',
      message: 'The requested run does not exist.'
    })

    expect(state).toEqual({
      view: 'error',
      message: 'The requested run does not exist.',
      reconnectable: false
    })
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

  test('isCurrentRun matches only the run a slow cancel or correction was sent for (#123)', () => {
    const running = reduceClientState(initialClientState(), {
      type: 'started',
      runId: 'run-1',
      instruction: 'Clean the reflections.'
    })
    expect(isCurrentRun(running, 'run-1')).toBe(true)
    // A new run started while an old request was still in flight must not
    // have that request's late response attributed to it (#123).
    expect(isCurrentRun(running, 'run-2')).toBe(false)

    const done = reduceClientState(running, {
      type: 'event',
      id: 0,
      event: { type: 'done', result: { ...result, complete: false, stopReason: 'cancelled' } }
    })
    expect(isCurrentRun(done, 'run-1')).toBe(true)
    expect(isCurrentRun(done, 'run-2')).toBe(false)

    expect(isCurrentRun(initialClientState(), 'run-1')).toBe(false)
  })
})

// Feeds a real, stopped run's own events into reduceClientState/
// correctionStatuses, rather than hand-typed ones, so rewording the loop's
// stranding message cannot silently turn off the marking (#124).
describe('correctionStatuses against a real stopped run (#124)', () => {
  const request: RunRequest = {
    image: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
    filename: 'product.jpg',
    instruction: 'Warm the highlights',
    stepCap: 40,
    budgetUsd: 8
  }
  const USAGE = { inputTokens: 40_000, cachedInputTokens: 38_430, outputTokens: 750 }
  const CLICK = { type: 'click' as const, button: 'left' as const, x: 720, y: 450 }

  // Mirrors ResponsesSocket.steer(): no native steer while no response is
  // being generated (before response.created, or between a steered
  // response and its successor); one sent while a response is generating
  // is settled applied once that call answers.
  function nativeInterleavingModel(hooks: {
    beforeCreated?: (call: number) => void
    whileGenerating?: (call: number) => void
  }): AgentModel {
    let generating = false
    let inFlight: { applied: boolean }[] = []
    let calls = 0
    return {
      async next(_observation, signal) {
        const call = calls++
        inFlight = []
        generating = false
        hooks.beforeCreated?.(call)
        generating = true
        hooks.whileGenerating?.(call)
        await new Promise<void>((resolve, reject) => {
          if (signal.aborted) return reject(signal.reason)
          const timer = setTimeout(resolve, 0)
          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timer)
              reject(signal.reason)
            },
            { once: true }
          )
        })
        for (const steer of inFlight) steer.applied = true
        generating = false
        return { narration: `Step ${call + 1}`, actions: [CLICK], usage: USAGE, done: false }
      },
      steer() {
        if (!generating) return undefined
        const steer = { applied: false }
        inFlight.push(steer)
        return steer
      }
    }
  }

  for (const variant of ['cap', 'cancel'] as const) {
    test(`marks exactly the correction a real run left stranded, not the one applied after it (${variant})`, async () => {
      let handle!: RunHandle
      const steers: Promise<void>[] = []
      const session = await createRecordedFakeEditorSession()
      const model = nativeInterleavingModel({
        beforeCreated: (call) => {
          if (call === 0) steers.push(handle.steer('A: sent before response.created'))
        },
        whileGenerating: (call) => {
          if (call === 0) steers.push(handle.steer('B: natively applied'))
        }
      })
      if (variant === 'cancel') {
        const act = session.act.bind(session)
        session.act = async (actions) => {
          void handle.cancel()
          return act(actions)
        }
      }
      handle = runAgent(variant === 'cap' ? { ...request, stepCap: 1 } : request, {
        session,
        model,
        publish: async (_bytes, kind) => `memory://${kind}`,
        frameIntervalMs: 5
      })
      const events = await collect(handle)
      await Promise.all(steers)

      let state = reduceClientState(initialClientState(), {
        type: 'started',
        runId: 'run-1',
        instruction: request.instruction
      })
      events.forEach((event, id) => {
        if (event.type !== 'started') state = reduceClientState(state, { type: 'event', id, event })
      })

      expect(state.view).toBe('result')
      if (state.view !== 'result') throw new Error('unreachable')
      expect(correctionStatuses(state.progress)).toEqual([
        { text: 'A: sent before response.created', delivered: false },
        { text: 'B: natively applied', delivered: true }
      ])
    })
  }
})
