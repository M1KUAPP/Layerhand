import { describe, expect, test } from 'bun:test'

import { fakeRun } from '../../src/agent/fake-run'
import type { RunEvent, RunHandle, RunResult } from '../../src/agent/contract'
import type { LayerInfo } from '../../src/editor/session'
import type { ManagedRun } from '../../src/server/managed-run'
import { RunRegistry, RunRegistryError, type RunEventEnvelope } from '../../src/server/run-registry'

const RESULT: RunResult = {
  psdUrl: 'https://artifacts.example/result.psd',
  previewUrl: 'https://artifacts.example/preview.png',
  layers: [{ name: 'Original photograph', kind: 'raster', visible: true, masks: [], children: [] }],
  complete: true
}

function scriptedRun(events: RunEvent[], hooks: { release?: () => void } = {}): ManagedRun {
  const handle: RunHandle = {
    events: {
      async *[Symbol.asyncIterator]() {
        for (const event of events) yield event
      }
    },
    async steer() {},
    async cancel() {}
  }
  return {
    handle,
    metrics: () => ({ cacheHitRate: 0.75, stopReason: 'complete' }),
    releaseSecrets: hooks.release ?? (() => undefined)
  }
}

async function collect<T>(events: AsyncIterable<T>): Promise<T[]> {
  const collected: T[] = []
  for await (const event of events) collected.push(event)
  return collected
}

const STARTED: RunEvent = { type: 'started', runId: 'private', viewport: { width: 1440, height: 900 } }

// The largest mean frame docs/TRD.md § Frames measured, as the server
// publishes it: a PNG in a data URL.
const FRAME_PNG_BYTES = 840_000
const frame = (n: number): RunEvent => ({
  type: 'frame',
  pngUrl: `data:image/png;base64,${Buffer.alloc(FRAME_PNG_BYTES, n).toString('base64')}`
})
const FRAME_URL_LENGTH = (frame(0) as Extract<RunEvent, { type: 'frame' }>).pngUrl.length

/** A run that shows the editor `frames` times, taking a step after each, then finishes. */
function framedRun(frames: number): RunEvent[] {
  const steps = Array.from({ length: frames }, (_, i): RunEvent[] => [
    frame(i + 1),
    { type: 'step', n: i + 1, cap: 40, narration: `Retouching, pass ${i + 1}` }
  ])
  return [STARTED, ...steps.flat(), { type: 'done', result: RESULT }]
}

/**
 * Registers a run that holds an upload, as a real run's request does, and
 * returns a weak reference to the upload, so the caller holds none of its own.
 */
function registerRunHoldingUpload(registry: RunRegistry, runId: string): WeakRef<Uint8Array> {
  const request = { image: new Uint8Array(1024 * 1024) }
  const managedRun = scriptedRun([STARTED, { type: 'done', result: RESULT }], {
    release: () => void request.image.byteLength
  })
  registry.register({ runId, instruction: 'Retouch this', managedRun })
  return new WeakRef(request.image)
}

/**
 * A managed run whose `handle.events` is driven by explicit `push()` calls
 * instead of a fixed script, so a test can hold a live subscriber's queue at
 * an exact, known state between pushes (#101).
 */
function manualRun(): { managedRun: ManagedRun; push: (event: RunEvent) => Promise<void> } {
  const queue: RunEvent[] = []
  let wake: (() => void) | undefined
  const handle: RunHandle = {
    events: {
      async *[Symbol.asyncIterator]() {
        while (true) {
          while (queue.length > 0) yield queue.shift()!
          await new Promise<void>((resolve) => {
            wake = resolve
          })
        }
      }
    },
    async steer() {},
    async cancel() {}
  }
  return {
    managedRun: {
      handle,
      metrics: () => ({ cacheHitRate: null, stopReason: 'complete' }),
      releaseSecrets() {}
    },
    // Resolves once the pump has had a full microtask checkpoint to read the
    // event and call `#append`, so the caller's next push sees its effect.
    async push(event: RunEvent) {
      queue.push(event)
      wake?.()
      wake = undefined
      await Bun.sleep(0)
    }
  }
}

/** How many of the objects a full collection leaves alive. */
async function survivors(references: WeakRef<object>[]): Promise<number> {
  await Bun.sleep(0)
  Bun.gc(true)
  await Bun.sleep(0)
  return references.filter((reference) => reference.deref() !== undefined).length
}

describe('RunRegistry', () => {
  test('pumps once, rewrites the public run id, and replays ordered events', async () => {
    let iterations = 0
    const managed = scriptedRun([
      { type: 'started', runId: 'private-run-id', viewport: { width: 1440, height: 900 } },
      { type: 'step', n: 1, cap: 15, narration: 'Selecting the subject' },
      { type: 'cost', usd: 1.25, tokensIn: 100, tokensOut: 50 },
      { type: 'done', result: RESULT }
    ])
    const originalEvents = managed.handle.events
    managed.handle.events = {
      async *[Symbol.asyncIterator]() {
        iterations += 1
        yield* originalEvents
      }
    }
    const registry = new RunRegistry()

    registry.register({ runId: 'public-run-id', instruction: 'Retouch this', managedRun: managed })
    await registry.waitForTerminal('public-run-id')
    const replay = await collect(registry.events('public-run-id'))

    expect(iterations).toBe(1)
    expect(replay.map((entry) => entry.id)).toEqual([0, 1, 2, 3])
    expect(replay[0]!.event).toEqual({
      type: 'started',
      runId: 'public-run-id',
      viewport: { width: 1440, height: 900 }
    })
    expect((await registry.getSnapshot('public-run-id'))?.status).toBe('complete')
  })

  test('resumes strictly after the supplied event id', async () => {
    const registry = new RunRegistry()
    registry.register({
      runId: 'run-1',
      instruction: 'Retouch this',
      managedRun: scriptedRun([
        { type: 'started', runId: 'private', viewport: { width: 1440, height: 900 } },
        { type: 'step', n: 1, cap: 15, narration: 'Selecting' },
        { type: 'done', result: RESULT }
      ])
    })
    await registry.waitForTerminal('run-1')

    const resumed = await collect(registry.events('run-1', 0))

    expect(resumed.map((entry) => entry.id)).toEqual([1, 2])
  })

  test('replays only the latest frame, on a reload and after a last event id alike', async () => {
    const registry = new RunRegistry()
    registry.register({ runId: 'run-1', instruction: 'Retouch this', managedRun: scriptedRun(framedRun(3)) })
    await registry.waitForTerminal('run-1')

    const reload = await collect(registry.events('run-1'))
    const reconnect = await collect(registry.events('run-1', 2))

    // Frames 1 and 2 were replaced, so ids 1 and 3 are gaps.
    expect(reload.map((entry) => entry.id)).toEqual([0, 2, 4, 5, 6, 7])
    expect(reload.filter((entry) => entry.event.type === 'frame')).toEqual([{ id: 5, event: frame(3) }])
    expect(reconnect.map((entry) => entry.id)).toEqual([4, 5, 6, 7])
    expect((await registry.getSnapshot('run-1'))?.lastEventId).toBe(7)
  })

  test('drops a superseded frame from a live subscriber queue, keeping every other event', async () => {
    const registry = new RunRegistry()
    const { managedRun, push } = manualRun()
    registry.register({ runId: 'run-1', instruction: 'Retouch this', managedRun })

    // Starts the subscriber before any event exists, so it is live rather
    // than replaying from history.
    const iterator = registry.events('run-1')[Symbol.asyncIterator]()
    const first = iterator.next()
    await push(STARTED)
    const firstResult = await first
    if (firstResult.done) throw new Error('the subscriber ended before any event arrived')

    // Every push below lands while the subscriber still has not read: two
    // frames are pushed while an earlier, still-queued frame is waiting.
    await push(frame(1))
    await push({ type: 'step', n: 1, cap: 40, narration: 'Retouching, pass 1' })
    await push(frame(2)) // frame(1) is still queued and unread: it should be dropped
    await push({ type: 'step', n: 2, cap: 40, narration: 'Retouching, pass 2' })
    await push(frame(3)) // frame(2) is still queued and unread: it should be dropped
    await push({ type: 'done', result: RESULT })
    await registry.waitForTerminal('run-1')

    const rest: RunEventEnvelope[] = []
    for (let result = await iterator.next(); !result.done; result = await iterator.next()) {
      rest.push(result.value)
    }
    const received = [firstResult.value, ...rest]

    expect(received.map((entry) => entry.id)).toEqual([0, 2, 4, 5, 6])
    expect(received.filter((entry) => entry.event.type === 'frame')).toEqual([{ id: 5, event: frame(3) }])
    expect(received.filter((entry) => entry.event.type !== 'frame').map((entry) => entry.event)).toEqual([
      { type: 'started', runId: 'run-1', viewport: { width: 1440, height: 900 } },
      { type: 'step', n: 1, cap: 40, narration: 'Retouching, pass 1' },
      { type: 'step', n: 2, cap: 40, narration: 'Retouching, pass 2' },
      { type: 'done', result: RESULT }
    ])
  })

  test('keeps no more of a finished run than its latest frame and its other events', async () => {
    const registry = new RunRegistry()
    registry.register({ runId: 'run-1', instruction: 'Retouch this', managedRun: scriptedRun(framedRun(20)) })
    await registry.waitForTerminal('run-1')

    const replay = await collect(registry.events('run-1'))
    const snapshot = await registry.getSnapshot('run-1')
    // The snapshot's frame is the replayed frame, so each distinct frame counts once.
    const frames = new Set(replay.flatMap(({ event }) => (event.type === 'frame' ? [event.pngUrl] : [])))
    if (snapshot?.frameUrl) frames.add(snapshot.frameUrl)
    const frameBytes = [...frames].reduce((total, url) => total + url.length, 0)
    const otherBytes =
      JSON.stringify(replay.filter(({ event }) => event.type !== 'frame')).length +
      JSON.stringify({ ...snapshot, frameUrl: null }).length

    expect(frameBytes + otherBytes).toBeLessThan(FRAME_URL_LENGTH + 64 * 1024)
  })

  test('lets go of finished runs, and with them the uploads they held', async () => {
    const registry = new RunRegistry()
    const runIds = Array.from({ length: 20 }, (_, i) => `run-${i}`)
    const uploads = runIds.map((runId) => registerRunHoldingUpload(registry, runId))
    await Promise.all(runIds.map((runId) => registry.waitForTerminal(runId)))

    expect(await registry.getSnapshot('run-0')).toMatchObject({ status: 'complete' })
    // Every upload stays while the registry holds its run. The collector scans
    // the stack conservatively, so a stale pointer can still keep one or two.
    expect(await survivors(uploads)).toBeLessThanOrEqual(2)
  })

  test('keeps recoverable errors in history without ending the run', async () => {
    const registry = new RunRegistry()
    registry.register({
      runId: 'run-1',
      instruction: 'Retouch this',
      managedRun: scriptedRun([
        { type: 'started', runId: 'private', viewport: { width: 1440, height: 900 } },
        { type: 'error', reason: 'One frame was missed', recoverable: true },
        { type: 'done', result: RESULT }
      ])
    })

    await registry.waitForTerminal('run-1')
    const snapshot = await registry.getSnapshot('run-1')

    expect(snapshot?.status).toBe('complete')
    expect(snapshot?.recoverableErrors).toEqual(['One frame was missed'])
    expect(snapshot?.lastEventId).toBe(2)
  })

  test('finalizes once and releases secrets even when the terminal hook fails', async () => {
    let released = 0
    let terminalCalls = 0
    const registry = new RunRegistry({
      onTerminal: async () => {
        terminalCalls += 1
        throw new Error('meter unavailable')
      }
    })
    registry.register({
      runId: 'run-1',
      instruction: 'Retouch this',
      managedRun: scriptedRun(
        [
          { type: 'started', runId: 'private', viewport: { width: 1440, height: 900 } },
          { type: 'done', result: RESULT },
          { type: 'done', result: RESULT }
        ],
        { release: () => (released += 1) }
      )
    })

    await registry.waitForTerminal('run-1')

    expect(terminalCalls).toBe(1)
    expect(released).toBe(1)
    expect((await registry.getSnapshot('run-1'))?.result).toEqual(RESULT)
  })

  test('acknowledges steering during a run and refuses it after terminal', async () => {
    const request = {
      image: Uint8Array.of(1),
      filename: 'photo.png',
      instruction: 'Retouch this',
      stepCap: 15,
      budgetUsd: 10
    }
    const registry = new RunRegistry()
    registry.register({
      runId: 'run-1',
      instruction: request.instruction,
      managedRun: {
        handle: fakeRun(request, { intervalMs: 2 }),
        metrics: () => ({ cacheHitRate: null, stopReason: 'complete' }),
        releaseSecrets() {}
      }
    })

    await registry.steer('run-1', 'Keep the label unchanged')
    await registry.waitForTerminal('run-1')
    const snapshot = await registry.getSnapshot('run-1')

    expect(snapshot?.corrections).toEqual(['Keep the label unchanged'])
    await expect(registry.steer('run-1', 'Too late')).rejects.toBeInstanceOf(RunRegistryError)
  })

  test('refuses a correction the run turns away while it is finishing', async () => {
    const registry = new RunRegistry()
    const managed = scriptedRun([{ type: 'started', runId: 'private', viewport: { width: 1440, height: 900 } }])
    managed.handle.events = {
      async *[Symbol.asyncIterator]() {
        yield { type: 'started', runId: 'private', viewport: { width: 1440, height: 900 } }
        await new Promise(() => {})
      }
    }
    managed.handle.steer = async () => {
      throw new Error('The run is stopping, so the correction was not applied')
    }
    registry.register({ runId: 'run-1', instruction: 'Retouch this', managedRun: managed })

    const refusal = registry.steer('run-1', 'Keep the shadow')

    await expect(refusal).rejects.toBeInstanceOf(RunRegistryError)
    await expect(refusal).rejects.toMatchObject({
      code: 'run_ended',
      message: 'The run is finishing, so the correction was not applied.'
    })
  })

  test('marks cancellation before retaining the partial result', async () => {
    const request = {
      image: Uint8Array.of(1),
      filename: 'photo.png',
      instruction: 'Retouch this',
      stepCap: 15,
      budgetUsd: 10
    }
    const registry = new RunRegistry()
    registry.register({
      runId: 'run-1',
      instruction: request.instruction,
      managedRun: {
        handle: fakeRun(request, { intervalMs: 10_000 }),
        metrics: () => ({ cacheHitRate: null, stopReason: 'cancelled' }),
        releaseSecrets() {}
      }
    })

    await registry.cancel('run-1')
    await registry.waitForTerminal('run-1')

    const snapshot = await registry.getSnapshot('run-1')
    expect(snapshot?.status).toBe('cancelled')
    expect(snapshot?.result?.complete).toBe(false)
  })

  test('expires terminal metadata after sixty minutes', async () => {
    let now = 0
    const registry = new RunRegistry({ now: () => now })
    registry.register({
      runId: 'run-1',
      instruction: 'Retouch this',
      managedRun: scriptedRun([
        { type: 'started', runId: 'private', viewport: { width: 1440, height: 900 } },
        { type: 'done', result: RESULT }
      ])
    })
    await registry.waitForTerminal('run-1')

    now = 60 * 60 * 1000 - 1
    expect(await registry.getSnapshot('run-1')).toBeDefined()
    now += 2
    expect(await registry.getSnapshot('run-1')).toBeUndefined()
  })

  test('returns recursively defensive result layers', async () => {
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
    const result: RunResult = {
      psdUrl: 'https://artifacts.example/result.psd',
      previewUrl: 'https://artifacts.example/preview.png',
      layers: nestedLayers,
      complete: true
    }
    const expected = structuredClone(nestedLayers)
    const registry = new RunRegistry()
    registry.register({
      runId: 'run-1',
      instruction: 'Retouch this',
      managedRun: scriptedRun([{ type: 'done', result }])
    })
    await registry.waitForTerminal('run-1')

    const snapshot = await registry.getSnapshot('run-1')
    const callerChild = result.layers[0]!.children[0]! as unknown as { name: string; masks: { enabled: boolean }[] }
    const returnedChild = snapshot!.result!.layers[0]!.children[0]! as unknown as {
      name: string
      masks: { enabled: boolean }[]
    }
    callerChild.name = 'Changed by caller'
    callerChild.masks[0]!.enabled = false
    returnedChild.name = 'Changed by reader'
    returnedChild.masks[0]!.enabled = false

    expect((await registry.getSnapshot('run-1'))?.result?.layers).toEqual(expected)
  })
})
