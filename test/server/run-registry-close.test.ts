import { describe, expect, test } from 'bun:test'

import type { RunEvent, RunHandle } from '../../src/agent/contract'
import type { ManagedRun } from '../../src/server/managed-run'
import { RunRegistry, RunRegistryError, type TerminalRun } from '../../src/server/run-registry'
import { createLaunchRuntime } from '../../src/server/runtime'
import { WarmSessionPool } from '../../src/server/warm-session-pool'

const samplePath = new URL('../../src/editor/fixtures/document-preview.png', import.meta.url)

const STARTED: RunEvent = { type: 'started', runId: 'inner', viewport: { width: 1440, height: 900 } }
const CANCELLED: RunEvent = {
  type: 'done',
  result: { psdUrl: 'memory://psd', previewUrl: 'memory://preview', layers: [], complete: false }
}
const ABANDONED: RunEvent = {
  type: 'error',
  reason: 'The run stopped because of an unexpected error',
  recoverable: false
}

/** A run that goes on until it is cancelled, or, if it ignores that, until it is abandoned. */
function runInFlight(
  behaviour: { ignoresCancel?: boolean; ignoresAbandon?: boolean; cancelHangs?: boolean; abandonHangs?: boolean } = {}
) {
  const calls = { cancel: 0, abandon: 0, released: 0 }
  let end: (event: RunEvent) => void = () => undefined
  const ended = new Promise<RunEvent>((resolve) => {
    end = resolve
  })
  const handle: RunHandle = {
    events: {
      async *[Symbol.asyncIterator]() {
        yield STARTED
        yield await ended
      }
    },
    async steer() {},
    async cancel() {
      calls.cancel += 1
      if (behaviour.cancelHangs) await new Promise(() => undefined)
      if (!behaviour.ignoresCancel) end(CANCELLED)
    }
  }
  const managedRun: ManagedRun = {
    handle,
    metrics: () => ({ cacheHitRate: null, stopReason: 'cancelled' }),
    releaseSecrets: () => {
      calls.released += 1
    },
    async abandon() {
      calls.abandon += 1
      // As an abandon waiting on a Browserbase request that never answers.
      if (behaviour.abandonHangs) await new Promise(() => undefined)
      if (!behaviour.ignoresAbandon) end(ABANDONED)
    }
  }
  return { managedRun, calls }
}

function registryWithLog() {
  const terminal: TerminalRun[] = []
  const registry = new RunRegistry({ onTerminal: (run) => void terminal.push(run) })
  return { registry, terminal }
}

describe('RunRegistry.close', () => {
  test('cancels every run in flight and waits for each to end and be recorded', async () => {
    const { registry, terminal } = registryWithLog()
    const first = runInFlight()
    const second = runInFlight()
    registry.register({ runId: 'first', instruction: 'Warm it', managedRun: first.managedRun })
    registry.register({ runId: 'second', instruction: 'Cool it', managedRun: second.managedRun })

    await registry.close(1_000)

    expect([first.calls, second.calls]).toEqual([
      { cancel: 1, abandon: 0, released: 1 },
      { cancel: 1, abandon: 0, released: 1 }
    ])
    expect(terminal.map((run) => run.runId).sort()).toEqual(['first', 'second'])
    expect((await registry.getSnapshot('first'))?.status).toBe('cancelled')
  })

  test('prefers shutdown() over handle.cancel() when the managed run tells them apart', async () => {
    const { registry, terminal } = registryWithLog()
    const calls: string[] = []
    let end: (event: RunEvent) => void = () => undefined
    const ended = new Promise<RunEvent>((resolve) => {
      end = resolve
    })
    const shutdownDone: RunEvent = {
      type: 'done',
      result: {
        psdUrl: 'memory://psd',
        previewUrl: 'memory://preview',
        layers: [],
        complete: false,
        stopReason: 'shutdown'
      }
    }
    const managedRun: ManagedRun = {
      handle: {
        events: {
          async *[Symbol.asyncIterator]() {
            yield STARTED
            yield await ended
          }
        },
        async steer() {},
        async cancel() {
          calls.push('cancel')
          end(CANCELLED)
        }
      },
      metrics: () => ({ cacheHitRate: null, stopReason: 'shutdown' }),
      releaseSecrets: () => {},
      async shutdown() {
        calls.push('shutdown')
        end(shutdownDone)
      }
    }
    registry.register({ runId: 'distinguishable', instruction: 'Warm it', managedRun })

    await registry.close(1_000)

    expect(calls).toEqual(['shutdown'])
    expect(terminal.map((run) => run.metrics.stopReason)).toEqual(['shutdown'])
    // The page's reload path reads this, not just the run log (#125).
    expect((await registry.getSnapshot('distinguishable'))?.stopReason).toBe('shutdown')
  })

  test('abandons a run that has not ended within the grace period', async () => {
    const { registry, terminal } = registryWithLog()
    const stuck = runInFlight({ ignoresCancel: true })
    registry.register({ runId: 'stuck', instruction: 'Warm it', managedRun: stuck.managedRun })

    await registry.close(20)

    expect(stuck.calls).toEqual({ cancel: 1, abandon: 1, released: 1 })
    expect(terminal.map((run) => run.runId)).toEqual(['stuck'])
    expect((await registry.getSnapshot('stuck'))?.status).toBe('failed')
  })

  test('releases the secrets of a run that ends neither when cancelled nor when abandoned', async () => {
    const { registry, terminal } = registryWithLog()
    const hung = runInFlight({ ignoresCancel: true, ignoresAbandon: true })
    registry.register({ runId: 'hung', instruction: 'Warm it', managedRun: hung.managedRun })

    await registry.close(20)

    expect(hung.calls).toEqual({ cancel: 1, abandon: 1, released: 1 })
    expect(terminal).toEqual([])
  })

  test('leaves a run that already ended alone', async () => {
    const { registry } = registryWithLog()
    const finished = runInFlight()
    registry.register({ runId: 'finished', instruction: 'Warm it', managedRun: finished.managedRun })
    await finished.managedRun.handle.cancel()
    await registry.waitForTerminal('finished')

    await registry.close(20)

    expect(finished.calls).toEqual({ cancel: 1, abandon: 0, released: 1 })
  })
})

describe('RunRegistry.close, bounded', () => {
  test('keeps to its budget when a cancel and an abandon both hang', async () => {
    const { registry } = registryWithLog()
    const hung = runInFlight({ cancelHangs: true, abandonHangs: true })
    registry.register({ runId: 'hung', instruction: 'Warm it', managedRun: hung.managedRun })

    const startedAt = performance.now()
    await registry.close(30)

    // Two phases of 30 ms, with room for a slow machine, and nowhere near forever.
    expect(performance.now() - startedAt).toBeLessThan(1_000)
    expect(hung.calls).toEqual({ cancel: 1, abandon: 1, released: 1 })
  })

  test('refuses a run registered while it is closing, and after', async () => {
    const { registry } = registryWithLog()
    const stuck = runInFlight({ ignoresCancel: true })
    registry.register({ runId: 'stuck', instruction: 'Warm it', managedRun: stuck.managedRun })

    const closing = registry.close(30)
    const late = runInFlight()
    let refusal: unknown
    try {
      registry.register({ runId: 'late', instruction: 'Cool it', managedRun: late.managedRun })
    } catch (error) {
      refusal = error
    }
    await closing

    expect(refusal).toBeInstanceOf(RunRegistryError)
    expect((refusal as RunRegistryError).code).toBe('shutting_down')
    expect(await registry.getSnapshot('late')).toBeUndefined()
    expect(() =>
      registry.register({ runId: 'later', instruction: 'Cool it', managedRun: runInFlight().managedRun })
    ).toThrow('The server is shutting down')
  })
})

describe('shutting the runtime down', () => {
  test('ends a run in flight and records it before the database closes', async () => {
    const records: string[] = []
    const runtime = await createLaunchRuntime({
      env: { NODE_ENV: 'development', RUN_MODE: 'scripted' },
      clientAddress: () => '203.0.113.31',
      // Slow enough that the run is still going when the runtime closes.
      fakeRunIntervalMs: 60_000,
      writeRunLog: (record) => records.push(record)
    })
    const form = new FormData()
    form.set('image', new File([Bun.file(samplePath)], 'source.png', { type: 'image/png' }), 'source.png')
    form.set('filename', 'source.png')
    form.set('instruction', 'Remove the background')
    const response = await runtime.application.fetch(
      new Request('http://layerhand.test/api/runs', { method: 'POST', body: form })
    )
    const { runId } = (await response.json()) as { runId: string }

    await runtime.close()

    expect(records).toHaveLength(1)
    // A shutdown gets its own outcome (#112): the page still shows 'cancelled'
    // status, because nobody here asked for the run to stop.
    expect(JSON.parse(records[0]!)).toMatchObject({ runId, outcome: 'shutdown' })
    expect((await runtime.registry.getSnapshot(runId))?.status).toBe('cancelled')
  })

  test('ends and records a run in flight while a warm session is still being released', async () => {
    // A release as slow as a Browserbase request that takes its full ten
    // seconds: it finishes only when the test lets it.
    let finishRelease: () => void = () => undefined
    const releasing = new Promise<void>((resolve) => {
      finishRelease = resolve
    })
    let released = 0
    const warmSessions = new WarmSessionPool({
      create: () => ({
        id: 'warm-session',
        viewport: { width: 1440, height: 900 },
        open: async () => undefined,
        screenshot: async () => new Uint8Array(),
        act: async () => undefined,
        layers: async () => [],
        exportPsd: async () => new Uint8Array(),
        exportPreview: async () => new Uint8Array(),
        close: async () => undefined,
        async abandon() {
          released += 1
          await releasing
        }
      })
    })
    const records: string[] = []
    const runtime = await createLaunchRuntime({
      env: { NODE_ENV: 'development', RUN_MODE: 'scripted' },
      clientAddress: () => '203.0.113.32',
      // Slow enough that the run is still going when the runtime closes.
      fakeRunIntervalMs: 60_000,
      warmSessions,
      writeRunLog: (record) => records.push(record)
    })
    await warmSessions.warm('visitor', new Uint8Array(await Bun.file(samplePath).arrayBuffer()), 'source.png')
    const form = new FormData()
    form.set('image', new File([Bun.file(samplePath)], 'source.png', { type: 'image/png' }), 'source.png')
    form.set('filename', 'source.png')
    form.set('instruction', 'Remove the background')
    const response = await runtime.application.fetch(
      new Request('http://layerhand.test/api/runs', { method: 'POST', body: form })
    )
    const { runId } = (await response.json()) as { runId: string }

    const closing = runtime.close()
    try {
      // Well inside the four seconds a cancelled run is given, and nowhere near Cloud Run's ten.
      await Promise.race([runtime.registry.waitForTerminal(runId), Bun.sleep(2_000)])

      expect(records).toHaveLength(1)
      expect(JSON.parse(records[0]!)).toMatchObject({ runId, outcome: 'shutdown' })
      expect(released).toBe(1)
    } finally {
      finishRelease()
      await closing
    }
  })
})
