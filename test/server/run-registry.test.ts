import { describe, expect, test } from 'bun:test'

import { fakeRun } from '../../src/agent/fake-run'
import type { RunEvent, RunHandle, RunResult } from '../../src/agent/contract'
import type { ManagedRun } from '../../src/server/managed-run'
import { RunRegistry, RunRegistryError } from '../../src/server/run-registry'

const RESULT: RunResult = {
  psdUrl: 'https://artifacts.example/result.psd',
  previewUrl: 'https://artifacts.example/preview.png',
  layers: [{ name: 'Original photograph', kind: 'raster', visible: true }],
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
})
