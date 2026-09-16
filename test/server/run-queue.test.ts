// NFR-4: past a cap on concurrent runs, runs wait in line with a stated place
// and start by themselves, first in, first out.
import { describe, expect, test } from 'bun:test'

import type { RunEvent } from '../../src/agent/contract'
import type { ManagedRun } from '../../src/server/managed-run'
import { RunRegistry, RunStartRefused, type RunStreamEvent, type TerminalRun } from '../../src/server/run-registry'

const STARTED: RunEvent = { type: 'started', runId: 'inner', viewport: { width: 1440, height: 900 } }
const DONE: RunEvent = {
  type: 'done',
  result: { psdUrl: 'memory://psd', previewUrl: 'memory://preview', layers: [], complete: true }
}

/** A run that stays in flight until it is finished or cancelled, as a real one does for minutes. */
function runInFlight() {
  let finish: () => void = () => undefined
  const finished = new Promise<void>((resolve) => {
    finish = resolve
  })
  const managedRun: ManagedRun = {
    handle: {
      events: {
        async *[Symbol.asyncIterator]() {
          yield STARTED
          await finished
          yield DONE
        }
      },
      async steer() {},
      async cancel() {
        finish()
      }
    },
    metrics: () => ({ cacheHitRate: null, stopReason: 'complete' }),
    releaseSecrets() {}
  }
  return { managedRun, finish }
}

/** Enqueues a run in flight, and records each time the registry starts it. */
function enqueueInFlight(registry: RunRegistry, runId: string, starts: string[] = []) {
  const run = runInFlight()
  const snapshot = registry.enqueue({
    runId,
    instruction: 'Retouch this',
    start: async () => {
      starts.push(runId)
      return run.managedRun
    }
  })
  return { ...run, snapshot }
}

/** A run's events, up to and including the first that `last` accepts. */
async function eventsUntil(
  registry: RunRegistry,
  runId: string,
  last: (event: RunStreamEvent) => boolean
): Promise<RunStreamEvent[]> {
  const seen: RunStreamEvent[] = []
  for await (const { event } of registry.events(runId)) {
    seen.push(event)
    if (last(event)) break
  }
  return seen
}

const started = (event: RunStreamEvent) => event.type === 'started'
const placed = (position: number) => (event: RunStreamEvent) => event.type === 'queued' && event.position === position

describe('RunRegistry queue', () => {
  test('starts runs up to the cap at once, and queues the next until a slot frees', async () => {
    const registry = new RunRegistry({ maxConcurrentRuns: 2 })
    const starts: string[] = []

    const first = enqueueInFlight(registry, 'first', starts)
    const second = enqueueInFlight(registry, 'second', starts)
    const third = enqueueInFlight(registry, 'third', starts)

    expect((await first.snapshot).status).toBe('running')
    expect((await second.snapshot).status).toBe('running')
    expect(await third.snapshot).toMatchObject({ status: 'queued', queuePosition: 1 })
    expect(starts).toEqual(['first', 'second'])

    first.finish()
    const events = await eventsUntil(registry, 'third', started)

    expect(starts).toEqual(['first', 'second', 'third'])
    expect(events).toEqual([
      { type: 'queued', position: 1 },
      { ...STARTED, runId: 'third' }
    ])
    const snapshot = await registry.getSnapshot('third')
    expect(snapshot?.status).toBe('running')
    expect(snapshot?.queuePosition).toBeUndefined()
  })

  test('starts waiting runs in the order they came, and tells each its new place', async () => {
    const registry = new RunRegistry({ maxConcurrentRuns: 1 })
    const starts: string[] = []
    const a = enqueueInFlight(registry, 'a', starts)
    const b = enqueueInFlight(registry, 'b', starts)
    const c = enqueueInFlight(registry, 'c', starts)
    const d = enqueueInFlight(registry, 'd', starts)

    expect((await d.snapshot).queuePosition).toBe(3)

    a.finish()
    await eventsUntil(registry, 'd', placed(2))
    b.finish()
    await eventsUntil(registry, 'd', placed(1))
    c.finish()
    const events = await eventsUntil(registry, 'd', started)

    expect(starts).toEqual(['a', 'b', 'c', 'd'])
    expect(events).toEqual([
      { type: 'queued', position: 3 },
      { type: 'queued', position: 2 },
      { type: 'queued', position: 1 },
      { ...STARTED, runId: 'd' }
    ])
  })

  test('keeps the place of a run told to wait, starts runs behind it, and tries it again when a run ends', async () => {
    const registry = new RunRegistry({ maxConcurrentRuns: 2 })
    const first = enqueueInFlight(registry, 'first')
    let ready = false
    const waiter = runInFlight()
    const waiting = registry.enqueue({
      runId: 'waiter',
      instruction: 'Retouch this',
      start: async () => (ready ? waiter.managedRun : undefined)
    })
    const behind = enqueueInFlight(registry, 'behind')

    expect(await waiting).toMatchObject({ status: 'queued', queuePosition: 1 })
    expect((await behind.snapshot).status).toBe('running')
    expect((await registry.getSnapshot('waiter'))?.status).toBe('queued')

    ready = true
    first.finish()
    await eventsUntil(registry, 'waiter', started)

    expect((await registry.getSnapshot('waiter'))?.status).toBe('running')
  })

  test('tries a run told to wait again after a while, even when no run ends', async () => {
    const registry = new RunRegistry({ retryWaitingMs: 5 })
    let ready = false
    const waiter = runInFlight()
    await registry.enqueue({
      runId: 'waiter',
      instruction: 'Retouch this',
      start: async () => (ready ? waiter.managedRun : undefined)
    })

    ready = true
    await eventsUntil(registry, 'waiter', started)

    expect((await registry.getSnapshot('waiter'))?.status).toBe('running')
  })

  test('ends a run that cannot start with the reason its start gave, or a fixed one', async () => {
    const terminal: TerminalRun[] = []
    const registry = new RunRegistry({ onTerminal: (run) => void terminal.push(run) })

    await registry.enqueue({
      runId: 'refused',
      instruction: 'Retouch this',
      start: async () => {
        throw new RunStartRefused("Today's free-run budget is used up.")
      }
    })
    await registry.enqueue({
      runId: 'broken',
      instruction: 'Retouch this',
      start: async () => {
        throw new Error('provider detail that must not reach the page')
      }
    })
    await registry.waitForTerminal('refused')
    await registry.waitForTerminal('broken')

    expect(await registry.getSnapshot('refused')).toMatchObject({
      status: 'failed',
      failureReason: "Today's free-run budget is used up."
    })
    expect(await registry.getSnapshot('broken')).toMatchObject({
      status: 'failed',
      failureReason: 'The run could not be started. Try again in a moment.'
    })
    expect(terminal.map((run) => [run.runId, run.metrics.stopReason])).toEqual([
      ['refused', 'failed'],
      ['broken', 'failed']
    ])
  })

  test('ends a waiting run on cancel without starting it, and moves the runs behind it up', async () => {
    const terminal: TerminalRun[] = []
    const registry = new RunRegistry({ maxConcurrentRuns: 1, onTerminal: (run) => void terminal.push(run) })
    const starts: string[] = []
    enqueueInFlight(registry, 'first', starts)
    enqueueInFlight(registry, 'leaving', starts)
    enqueueInFlight(registry, 'staying', starts)

    await registry.cancel('leaving')
    await registry.waitForTerminal('leaving')
    await eventsUntil(registry, 'staying', placed(1))

    expect(starts).toEqual(['first'])
    expect(await registry.getSnapshot('leaving')).toMatchObject({
      status: 'failed',
      failureReason: 'You left the queue before the run started.'
    })
    expect(terminal.map((run) => [run.runId, run.metrics.stopReason])).toEqual([['leaving', 'cancelled']])
  })

  test('cancels a run that was cancelled while it was starting, as soon as it starts', async () => {
    const registry = new RunRegistry()
    let entered: () => void = () => undefined
    const starting = new Promise<void>((resolve) => {
      entered = resolve
    })
    let open: () => void = () => undefined
    const opened = new Promise<void>((resolve) => {
      open = resolve
    })
    const run = runInFlight()
    const enqueued = registry.enqueue({
      runId: 'slow',
      instruction: 'Retouch this',
      start: async () => {
        entered()
        await opened
        return run.managedRun
      }
    })

    await starting
    await registry.cancel('slow')
    open()
    await enqueued
    await registry.waitForTerminal('slow')

    expect((await registry.getSnapshot('slow'))?.status).toBe('cancelled')
  })

  test('refuses a correction for a run that has not started', async () => {
    const registry = new RunRegistry({ maxConcurrentRuns: 1 })
    enqueueInFlight(registry, 'first')
    await enqueueInFlight(registry, 'waiting').snapshot

    await expect(registry.steer('waiting', 'Keep the shadow')).rejects.toMatchObject({
      code: 'run_queued',
      message: 'The run has not started yet, so the correction was not applied.'
    })
  })

  test('ends waiting runs on shutdown without starting them, and records each', async () => {
    const terminal: TerminalRun[] = []
    const registry = new RunRegistry({ maxConcurrentRuns: 1, onTerminal: (run) => void terminal.push(run) })
    const starts: string[] = []
    enqueueInFlight(registry, 'first', starts)
    await enqueueInFlight(registry, 'waiting', starts).snapshot

    await registry.close(1_000)

    expect(starts).toEqual(['first'])
    expect(await registry.getSnapshot('waiting')).toMatchObject({
      status: 'failed',
      failureReason: 'The server restarted before the run started. Start it again.'
    })
    expect(terminal.find((run) => run.runId === 'waiting')?.metrics.stopReason).toBe('cancelled')
    expect(terminal.map((run) => run.runId).sort()).toEqual(['first', 'waiting'])
  })
})
