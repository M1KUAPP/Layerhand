import { describe, expect, test } from 'bun:test'
import { createRecordedFakeEditorSession } from '../editor/fake-editor-session'
import type { ComputerAction } from '../editor/session'
import type { RunEvent, RunHandle, RunRequest, RunResult } from './contract'
import { collect, testRunContract } from './contract-tests'
import { runAgent, type PublishedKind } from './loop'
import type { AgentModel, ModelTurn, Observation, TokenUsage } from './model'

const request: RunRequest = {
  image: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
  filename: 'product.jpg',
  instruction: 'Remove the background, warm the highlights, and clean the reflections',
  stepCap: 40,
  budgetUsd: 8
}

const CLICK: ComputerAction = { type: 'click', button: 'left', x: 720, y: 450 }

// One step as docs/TRD.md prices it: the history read from the cache, one new
// 1440x900 frame of 1,570 tokens written to it, and 750 tokens of output. At
// $1, $12.50, and $50 per million, that is $0.095555 a call.
const USAGE: TokenUsage = { inputTokens: 40_000, cachedInputTokens: 38_430, outputTokens: 750 }

// The layers createRecordedFakeEditorSession() reports, and its PSD contains.
const RECORDED_LAYERS: RunResult['layers'] = [
  { name: 'Original photograph', kind: 'raster', visible: true, masks: [], children: [] },
  { name: 'Retouched copy', kind: 'raster', visible: true, masks: [], children: [] }
]

// Explicit loop-test metadata; the historical PSD above has no adjustment.
const EDITABLE_LAYERS: RunResult['layers'] = [
  { name: 'Original photograph', kind: 'raster', visible: true, masks: [], children: [] },
  {
    name: 'Tonal edits',
    kind: 'group',
    visible: true,
    masks: [],
    children: [{ name: 'Warm highlights', kind: 'adjustment', visible: true, masks: [], children: [] }]
  }
]

const step = (narration: string, actions: ComputerAction[] = [CLICK]): ModelTurn => ({
  narration,
  actions,
  usage: USAGE,
  done: false
})
const DONE: ModelTurn = {
  narration: 'Checking the result against the instruction',
  actions: [],
  usage: USAGE,
  done: true
}
const RETOUCH = [
  step('Selecting the product'),
  step('Masking out the background'),
  step('Warming the highlights with a curves layer'),
  step('Painting out the reflections')
]
const TEN_PASSES = Array.from({ length: 10 }, (_, i) => step(`Retouching, pass ${i + 1}`))

/**
 * Plays its script one turn per call, then reports the edit done. Each call
 * waits a timer tick, as a real one would, and rejects if the run aborts it.
 */
class ScriptedModel implements AgentModel {
  readonly observations: Observation[] = []
  readonly #script: (ModelTurn | Error)[]
  readonly #onCall: ((call: number) => void) | undefined

  constructor(script: (ModelTurn | Error)[], onCall?: (call: number) => void) {
    this.#script = script
    this.#onCall = onCall
  }

  async next(observation: Observation, signal: AbortSignal): Promise<ModelTurn> {
    const call = this.observations.push(observation) - 1
    this.#onCall?.(call)
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
    const turn = this.#script[call] ?? DONE
    if (turn instanceof Error) throw turn
    return turn
  }
}

/** A recorded editor session, a scripted model, and a publisher that keeps what it stores. */
async function fixture(script: (ModelTurn | Error)[] = RETOUCH, onCall?: (call: number) => void) {
  const published = new Map<string, Uint8Array>()
  return {
    session: await createRecordedFakeEditorSession(),
    model: new ScriptedModel(script, onCall),
    published,
    publish: async (bytes: Uint8Array, kind: PublishedKind) => {
      const url = `memory://${kind}/${published.size}`
      published.set(url, bytes)
      return url
    }
  }
}

type Fixture = Awaited<ReturnType<typeof fixture>>

async function editableFixture(...args: Parameters<typeof fixture>): Promise<Fixture> {
  const run = await fixture(...args)
  const layers = run.session.layers.bind(run.session)
  run.session.layers = async () => {
    await layers()
    return structuredClone(EDITABLE_LAYERS)
  }
  return run
}

async function fixtureBytes(name: string): Promise<Uint8Array> {
  return new Uint8Array(await Bun.file(new URL(`../editor/fixtures/${name}`, import.meta.url)).arrayBuffer())
}

function ofType<T extends RunEvent['type']>(events: RunEvent[], type: T): Extract<RunEvent, { type: T }>[] {
  return events.filter((event): event is Extract<RunEvent, { type: T }> => event.type === type)
}

function resultOf(events: RunEvent[]): RunResult {
  const last = events.at(-1)
  if (last?.type !== 'done') throw new Error(`Expected the run to finish, but it ended with ${JSON.stringify(last)}`)
  return last.result
}

// Reads the layer count from a PSD's layer info section, which is enough to
// tell the layered file the session exported from a flat one.
function psdLayerCount(psd: Uint8Array | undefined): number {
  if (!psd) throw new Error('Nothing was published at that URL')
  expect(new TextDecoder().decode(psd.subarray(0, 4))).toBe('8BPS')
  const view = new DataView(psd.buffer, psd.byteOffset, psd.byteLength)
  let offset = 26 // The file header.
  offset += 4 + view.getUint32(offset) // Colour mode data.
  offset += 4 + view.getUint32(offset) // Image resources.
  const layerInfoLength = view.getUint32(offset) === 0 ? 0 : view.getUint32(offset + 4)
  return layerInfoLength === 0 ? 0 : Math.abs(view.getInt16(offset + 8))
}

const correctionsSeen = (run: Fixture) => run.model.observations.map((observation) => observation.corrections)

testRunContract({
  name: 'runAgent',
  request,
  start: async (request) => runAgent(request, await editableFixture()),
  startFailing: async (request) =>
    runAgent(request, await fixture([step('Selecting the product'), new Error('The model stopped responding')]))
})

describe('runAgent', () => {
  test('rejects a model-finished all-raster tree with one unrecoverable error and no result', async () => {
    const run = await fixture([DONE])
    run.session.layers = async () => [
      { name: 'Original photograph', kind: 'raster', visible: true, masks: [], children: [] }
    ]
    const events = await collect(runAgent(request, run))
    expect(ofType(events, 'error')).toEqual([
      { type: 'error', reason: 'The run stopped because of an unexpected error', recoverable: false }
    ])
    expect(ofType(events, 'done')).toEqual([])
    expect(events.at(-1)?.type).toBe('error')
    expect([...run.published.keys()].every((url) => url.startsWith('memory://frame/'))).toBe(true)
    await expect(run.session.screenshot()).rejects.toThrow('Editor session is closed')
  })

  test('accepts a model-finished tree with an effectively visible adjustment as complete', async () => {
    const run = await editableFixture([DONE])
    const events = await collect(runAgent(request, run))
    expect(ofType(events, 'error')).toEqual([])
    expect(resultOf(events)).toMatchObject({ complete: true, layers: EDITABLE_LAYERS })
  })

  test('exports a raster-only step-capped result as incomplete', async () => {
    const run = await fixture(TEN_PASSES)
    const events = await collect(runAgent({ ...request, stepCap: 1 }, run))
    expect(ofType(events, 'error')).toEqual([])
    expect(resultOf(events)).toMatchObject({ complete: false, layers: RECORDED_LAYERS })
    expect(psdLayerCount(run.published.get(resultOf(events).psdUrl))).toBe(2)
  })

  test('opens the upload, then shows the model the editor', async () => {
    const run = await fixture()
    await collect(runAgent(request, run))
    expect(run.session.openedImage).toEqual(request.image)
    expect(run.session.openedFilename).toBe('product.jpg')
    expect(run.model.observations[0]?.screenshot).toEqual(await fixtureBytes('photopea-frame.png'))
  })

  test('carries out the actions of every step in order, then finishes complete', async () => {
    const drag: ComputerAction = {
      type: 'drag',
      path: [
        { x: 10, y: 10 },
        { x: 50, y: 60 }
      ]
    }
    const run = await editableFixture([
      step('Selecting the product'),
      step('Masking out the background', [drag, CLICK])
    ])
    const events = await collect(runAgent(request, run))
    expect(run.session.actionBatches).toEqual([[CLICK], [drag, CLICK]])
    expect(ofType(events, 'step')).toEqual([
      { type: 'step', n: 1, cap: 40, narration: 'Selecting the product' },
      { type: 'step', n: 2, cap: 40, narration: 'Masking out the background' }
    ])
    expect(resultOf(events)).toMatchObject({ complete: true, layers: EDITABLE_LAYERS })
  })

  test('counts a turn that is not done as a step, even without editor actions', async () => {
    const run = await editableFixture([step('Running a curves adjustment from a script', [])])
    const events = await collect(runAgent(request, run))
    expect(ofType(events, 'step')).toEqual([
      { type: 'step', n: 1, cap: 40, narration: 'Running a curves adjustment from a script' }
    ])
    expect(run.session.actionBatches).toEqual([])
    expect(ofType(events, 'frame')).toHaveLength(2)
    expect(run.model.observations).toHaveLength(2)
    expect(resultOf(events).complete).toBe(true)
  })

  test('shows the editor before the first step and after every step', async () => {
    const run = await fixture()
    const frames = ofType(await collect(runAgent(request, run)), 'frame')
    const screenshot = await fixtureBytes('photopea-frame.png')
    expect(frames).toHaveLength(RETOUCH.length + 1)
    for (const frame of frames) expect(run.published.get(frame.pngUrl)).toEqual(screenshot)
  })

  test('adds the usage of every response to the running cost', async () => {
    const run = await fixture()
    const costs = ofType(await collect(runAgent(request, run)), 'cost')
    // Five calls: four steps, and the call that reported the edit done.
    expect(costs.map((cost) => cost.tokensIn)).toEqual([40_000, 80_000, 120_000, 160_000, 200_000])
    expect(costs.map((cost) => cost.tokensOut)).toEqual([750, 1_500, 2_250, 3_000, 3_750])
    costs.forEach((cost, i) => expect(cost.usd).toBeCloseTo(0.095555 * (i + 1), 9))
  })

  test('stops at the step cap with the layered file made so far', async () => {
    const run = await fixture(TEN_PASSES)
    const events = await collect(runAgent({ ...request, stepCap: 3 }, run))
    expect(ofType(events, 'step').map((event) => event.n)).toEqual([1, 2, 3])
    expect(run.model.observations).toHaveLength(3)
    const result = resultOf(events)
    expect(result.complete).toBe(false)
    expect(psdLayerCount(run.published.get(result.psdUrl))).toBe(2)
    expect(run.published.get(result.previewUrl)).toEqual(await fixtureBytes('document-preview.png'))
    expect(result.layers).toEqual(RECORDED_LAYERS)
  })

  test('stops before a model call could pass the spend cap, with the layered file made so far', async () => {
    const run = await fixture(TEN_PASSES)
    const events = await collect(runAgent({ ...request, budgetUsd: 1 }, run))
    // Each call costs $0.095555, but the next one is priced as if none of its
    // 40,000 input tokens were cached: $0.5375. After five calls, $0.477775
    // spent plus that estimate would pass $1.
    expect(run.model.observations).toHaveLength(5)
    expect(ofType(events, 'cost').at(-1)?.usd).toBeCloseTo(0.477775, 9)
    const result = resultOf(events)
    expect(result.complete).toBe(false)
    expect(psdLayerCount(run.published.get(result.psdUrl))).toBe(2)
    expect(result.layers).toEqual(RECORDED_LAYERS)
  })

  test('takes the spend cap from the request', async () => {
    const callsWithin = async (budgetUsd: number) => {
      const run = await fixture(TEN_PASSES)
      await collect(runAgent({ ...request, budgetUsd }, run))
      return run.model.observations.length
    }
    // $0.095555 a call, with the next call estimated at $0.5375.
    expect(await callsWithin(0.7)).toBe(2)
    expect(await callsWithin(0.8)).toBe(3)
  })

  test('stays within the spend cap when the history grows and the cache misses', async () => {
    // Input grows by ten tokens a call, at $0.01 a token uncached and $0.001
    // cached. The fifth call would miss the cache.
    const turn = (inputTokens: number, cachedInputTokens: number): ModelTurn => ({
      ...step('Retouching'),
      usage: { inputTokens, cachedInputTokens, outputTokens: 0 }
    })
    const run = await fixture([turn(100, 0), turn(110, 100), turn(120, 110), turn(130, 120), turn(140, 0)])
    const pricing = { usdPerInputToken: 0.01, usdPerCachedInputToken: 0.001, usdPerOutputToken: 0 }
    const events = await collect(runAgent({ ...request, budgetUsd: 3 }, { ...run, pricing }))
    // Four calls spend $1.63. A fifth, estimated at 140 uncached tokens, would
    // bring the total to $3.03, which is exactly what it would have cost.
    expect(run.model.observations).toHaveLength(4)
    const spent = ofType(events, 'cost').at(-1)?.usd
    expect(spent).toBeCloseTo(1.63, 9)
    expect(spent).toBeLessThanOrEqual(3)
    expect(resultOf(events).complete).toBe(false)
  })

  test('refuses a correction during the actions of the last step the spend cap allows', async () => {
    let handle!: RunHandle
    let late: Promise<void> | undefined
    const run = await fixture(TEN_PASSES)
    const act = run.session.act.bind(run.session)
    run.session.act = async (actions) => {
      if (run.model.observations.length === 2) {
        late = handle.steer('keep the shadow')
        late.catch(() => undefined)
      }
      await act(actions)
    }
    handle = runAgent({ ...request, budgetUsd: 0.7 }, run)
    const events = await collect(handle)
    await expect(late).rejects.toThrow()
    expect(ofType(events, 'correction_ack')).toEqual([])
  })

  test('counts every model call against the step cap', async () => {
    let handle!: RunHandle
    const run = await fixture([], () => {
      handle.steer('one more thing').catch(() => undefined)
    })
    handle = runAgent({ ...request, stepCap: 3 }, run)
    const events = await collect(handle)
    expect(run.model.observations).toHaveLength(3)
    expect(resultOf(events).complete).toBe(false)
  })

  test('marks the edit incomplete when the cap strands a correction sent during the finishing call', async () => {
    let handle!: RunHandle
    const steers: Promise<void>[] = []
    const run = await fixture([], (call) => {
      if (call === 0) steers.push(handle.steer('keep the shadow'))
    })
    handle = runAgent({ ...request, stepCap: 1 }, run)
    const events = await collect(handle)
    await Promise.all(steers)
    expect(run.model.observations).toHaveLength(1)
    expect(ofType(events, 'error')).toMatchObject([{ type: 'error', recoverable: true }])
    expect(resultOf(events).complete).toBe(false)
  })

  test('exports the untouched upload when the step cap allows no model call', async () => {
    const run = await fixture()
    const events = await collect(runAgent({ ...request, stepCap: 0 }, run))
    expect(run.model.observations).toEqual([])
    expect(resultOf(events)).toMatchObject({ complete: false, layers: RECORDED_LAYERS })
  })

  test('gives the model a correction at the next step boundary', async () => {
    let handle!: RunHandle
    const steers: Promise<void>[] = []
    const run = await fixture(RETOUCH, (call) => {
      if (call === 1) steers.push(handle.steer('keep the shadow'))
    })
    handle = runAgent(request, run)
    const events = await collect(handle)
    await Promise.all(steers)
    expect(correctionsSeen(run)).toEqual([[], [], ['keep the shadow'], [], []])
    expect(ofType(events, 'correction_ack')).toEqual([{ type: 'correction_ack', text: 'keep the shadow' }])
  })

  test('delivers every correction a run receives', async () => {
    let handle!: RunHandle
    const steers: Promise<void>[] = []
    const run = await fixture(RETOUCH, (call) => {
      if (call === 0) steers.push(handle.steer('keep the shadow'))
      if (call === 2) steers.push(handle.steer('warmer'), handle.steer('less contrast'))
    })
    handle = runAgent(request, run)
    await collect(handle)
    await Promise.all(steers)
    expect(correctionsSeen(run)).toEqual([[], ['keep the shadow'], [], ['warmer', 'less contrast'], []])
  })

  test('asks the model again when a correction arrives during its last call', async () => {
    let handle!: RunHandle
    const steers: Promise<void>[] = []
    const run = await editableFixture([], (call) => {
      if (call === 0) steers.push(handle.steer('keep the shadow'))
    })
    handle = runAgent(request, run)
    const events = await collect(handle)
    await Promise.all(steers)
    expect(correctionsSeen(run)).toEqual([[], ['keep the shadow']])
    expect(resultOf(events).complete).toBe(true)
  })

  test('refuses a correction during the actions of the last step the cap allows', async () => {
    let handle!: RunHandle
    let late: Promise<void> | undefined
    const run = await fixture(TEN_PASSES)
    const act = run.session.act.bind(run.session)
    run.session.act = async (actions) => {
      late = handle.steer('keep the shadow')
      late.catch(() => undefined)
      await act(actions)
    }
    handle = runAgent({ ...request, stepCap: 1 }, run)
    const events = await collect(handle)
    await expect(late).rejects.toThrow()
    expect(ofType(events, 'correction_ack')).toEqual([])
  })

  test('reports a correction that arrives too late for any call the cap allows', async () => {
    let handle!: RunHandle
    const steers: Promise<void>[] = []
    const run = await fixture(TEN_PASSES, (call) => {
      if (call === 0) steers.push(handle.steer('keep the shadow'))
    })
    handle = runAgent({ ...request, stepCap: 1 }, run)
    const events = await collect(handle)
    await Promise.all(steers)
    expect(ofType(events, 'correction_ack')).toHaveLength(1)
    expect(ofType(events, 'error')).toMatchObject([{ type: 'error', recoverable: true }])
    expect(resultOf(events).complete).toBe(false)
  })

  test('never acknowledges a correction that it then neither sends nor reports', async () => {
    // Steers at each microtask depth around the turn that finishes the edit.
    for (let depth = 0; depth < 10; depth++) {
      let handle!: RunHandle
      let accepted: Promise<boolean> | undefined
      const sent: string[][] = []
      const run = await fixture()
      const finishing: AgentModel = {
        async next(observation) {
          sent.push(observation.corrections)
          await Bun.sleep(0)
          if (sent.length === 1) {
            let tick = Promise.resolve()
            for (let i = 0; i < depth; i++) tick = tick.then(() => undefined)
            accepted = tick
              .then(() => handle.steer('keep the shadow'))
              .then(
                () => true,
                () => false
              )
          }
          return DONE
        }
      }
      handle = runAgent(request, { ...run, model: finishing })
      const events = await collect(handle)
      const acknowledged = ofType(events, 'correction_ack').length === 1
      const delivered = sent.flat().includes('keep the shadow')
      const reported = ofType(events, 'error').some((event) => event.recoverable)
      expect(accepted).toBeDefined()
      expect({ depth, acknowledged }).toEqual({ depth, acknowledged: (await accepted) === true })
      if (acknowledged)
        expect({ depth, deliveredOrReported: delivered || reported }).toEqual({ depth, deliveredOrReported: true })
    }
  })

  test('refuses a correction once the model will not be asked again', async () => {
    let handle!: RunHandle
    let late: Promise<void> | undefined
    const run = await editableFixture([step('Selecting the product')])
    handle = runAgent(request, {
      ...run,
      publish: (bytes, kind) => {
        if (kind === 'psd') late = handle.steer('too late')
        return run.publish(bytes, kind)
      }
    })
    const events = await collect(handle)
    await expect(late).rejects.toThrow()
    expect(ofType(events, 'correction_ack')).toEqual([])
  })

  test('abandons the model call in flight when cancelled, and keeps the partial result', async () => {
    let handle!: RunHandle
    let cancelled: Promise<void> | undefined
    const run = await fixture()
    const unanswered: AgentModel = {
      next: (_observation, signal) => {
        const abandoned = new Promise<never>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        })
        cancelled = handle.cancel()
        return abandoned
      }
    }
    handle = runAgent(request, { ...run, model: unanswered })
    const events = await collect(handle)
    await cancelled
    const result = resultOf(events)
    expect(result.complete).toBe(false)
    expect(psdLayerCount(run.published.get(result.psdUrl))).toBe(2)
  })

  test('cancels even when the model call in flight never settles', async () => {
    let handle!: RunHandle
    const run = await fixture()
    const unanswering: AgentModel = {
      next: () => {
        void handle.cancel()
        return new Promise<never>(() => {})
      }
    }
    handle = runAgent(request, { ...run, model: unanswering })
    const events = await collect(handle)
    expect(resultOf(events).complete).toBe(false)
    await expect(run.session.screenshot()).rejects.toThrow('Editor session is closed')
  }, 2000)

  test('resolves cancel without waiting for the export', async () => {
    let handle!: RunHandle
    let settled: string | undefined
    const run = await fixture([step('Selecting the product')])
    const exportPsd = run.session.exportPsd.bind(run.session)
    run.session.exportPsd = async () => {
      settled = await Promise.race([handle.cancel().then(() => 'resolved'), Bun.sleep(50).then(() => 'waiting')])
      return exportPsd()
    }
    handle = runAgent(request, run)
    await collect(handle)
    expect(settled).toBe('resolved')
  })

  test('keeps the upload when cancelled while it is still opening', async () => {
    let handle!: RunHandle
    const run = await fixture()
    const open = run.session.open.bind(run.session)
    run.session.open = async (image, filename) => {
      await Bun.sleep(0)
      await handle.cancel()
      await open(image, filename)
    }
    handle = runAgent(request, run)
    const events = await collect(handle)
    expect(run.model.observations).toEqual([])
    expect(resultOf(events).complete).toBe(false)
  }, 2000)

  test('reports a correction that a cancel leaves unsent', async () => {
    let handle!: RunHandle
    const steers: Promise<void>[] = []
    const run = await fixture(RETOUCH, (call) => {
      if (call !== 0) return
      steers.push(handle.steer('keep the shadow'))
      void handle.cancel()
    })
    handle = runAgent(request, run)
    const events = await collect(handle)
    await Promise.all(steers)
    expect(ofType(events, 'correction_ack')).toHaveLength(1)
    expect(ofType(events, 'error')).toMatchObject([{ type: 'error', recoverable: true }])
    expect(resultOf(events).complete).toBe(false)
  })

  test('does not act on a turn that returns after a cancel', async () => {
    let handle!: RunHandle
    let cancelled: Promise<void> | undefined
    const run = await fixture()
    const unheeding: AgentModel = {
      next: async () => {
        cancelled ??= handle.cancel()
        return step('Selecting the product')
      }
    }
    handle = runAgent(request, { ...run, model: unheeding })
    const events = await collect(handle)
    await cancelled
    expect(run.session.actionBatches).toEqual([])
    expect(ofType(events, 'step')).toEqual([])
    expect(ofType(events, 'cost')).toHaveLength(1)
    expect(resultOf(events).complete).toBe(false)
  })

  const endings: Record<string, (run: Fixture) => Promise<RunEvent[]>> = {
    finishes: (run) => collect(runAgent(request, run)),
    'reaches its step cap': (run) => collect(runAgent({ ...request, stepCap: 1 }, run)),
    'is cancelled': (run) => {
      const handle = runAgent(request, run)
      return collect(handle, (event) => {
        if (event.type === 'step') void handle.cancel()
      })
    },
    fails: (run) =>
      collect(runAgent(request, { ...run, model: new ScriptedModel([new Error('The model stopped responding')]) })),
    'cannot export its file': (run) => {
      run.session.exportPsd = async () => {
        throw new Error('The export timed out')
      }
      return collect(runAgent(request, run))
    }
  }

  for (const [ending, end] of Object.entries(endings)) {
    test(`closes the editor session when the run ${ending}`, async () => {
      const run = await editableFixture()
      await end(run)
      await expect(run.session.screenshot()).rejects.toThrow('Editor session is closed')
    })
  }

  test('fails the run when its file cannot be exported', async () => {
    const run = await fixture()
    run.session.exportPsd = async () => {
      throw new Error('The export timed out')
    }
    const events = await collect(runAgent(request, run))
    expect(events.at(-1)).toMatchObject({ type: 'error', recoverable: false })
    expect(ofType(events, 'done')).toEqual([])
  })

  test('keeps the exported file when the session fails to close', async () => {
    const run = await editableFixture([step('Selecting the product')])
    run.session.close = async () => {
      throw new Error('The browser provider timed out')
    }
    const events = await collect(runAgent(request, run))
    expect(psdLayerCount(run.published.get(resultOf(events).psdUrl))).toBe(2)
  })

  test('reports a missed frame and carries on', async () => {
    const run = await editableFixture([step('Selecting the product')])
    let frames = 0
    const events = await collect(
      runAgent(request, {
        ...run,
        publish: async (bytes, kind) => {
          if (kind === 'frame' && frames++ === 0) throw new Error('The bucket is unavailable')
          return run.publish(bytes, kind)
        }
      })
    )
    expect(ofType(events, 'error')).toMatchObject([{ type: 'error', recoverable: true }])
    expect(ofType(events, 'frame')).toHaveLength(1)
    expect(resultOf(events).complete).toBe(true)
  })

  test('keeps provider messages out of the failure reason', async () => {
    const run = await fixture([new Error('401 Incorrect API key provided: sk-proj-a1b2c3')])
    const events = await collect(runAgent(request, run))
    expect(events.at(-1)).toMatchObject({ type: 'error', recoverable: false })
    expect(JSON.stringify(events)).not.toContain('sk-proj-a1b2c3')
  })

  test('stops a run whose step comes without narration, keeping the file made so far', async () => {
    const run = await fixture([step('Selecting the product'), step('   ')])
    const events = await collect(runAgent(request, run))
    expect(ofType(events, 'step').map((event) => event.narration)).toEqual(['Selecting the product'])
    expect(run.session.actionBatches).toEqual([[CLICK]])
    expect(ofType(events, 'error')).toMatchObject([
      { type: 'error', recoverable: true, reason: expect.stringContaining('without describing') }
    ])
    const result = resultOf(events)
    expect(result.complete).toBe(false)
    expect(psdLayerCount(run.published.get(result.psdUrl))).toBe(2)
  })

  test('cuts a long narration to eighty characters', async () => {
    const long = 'Painting out the reflections on the left side of the bottle, then softening the edge of the mask'
    const run = await fixture([step(long)])
    const [narrated] = ofType(await collect(runAgent(request, run)), 'step')
    expect(narrated?.narration).toBe('Painting out the reflections on the left side of the bottle, then softening the…')
  })

  test('cuts narration between whole characters, never through an emoji', async () => {
    const artist = '\u{1F469}\u200D\u{1F3A8}' // Woman artist: three code points, one character.
    const run = await fixture([step('a'.repeat(78) + artist + 'b'.repeat(10))])
    const [narrated] = ofType(await collect(runAgent(request, run)), 'step')
    expect(narrated?.narration).toBe('a'.repeat(78) + artist + '…')
  })
})
