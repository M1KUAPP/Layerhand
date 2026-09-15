import { describe, expect, test } from 'bun:test'

import type { RunEvent, RunHandle } from '../../src/agent/contract'
import type { ManagedRun } from '../../src/server/managed-run'
import { RunRegistry, type TerminalRun } from '../../src/server/run-registry'
import { createLaunchRuntime } from '../../src/server/runtime'

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
function runInFlight(behaviour: { ignoresCancel?: boolean; ignoresAbandon?: boolean } = {}) {
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
    expect(JSON.parse(records[0]!)).toMatchObject({ runId, outcome: 'cancelled' })
    expect((await runtime.registry.getSnapshot(runId))?.status).toBe('cancelled')
  })
})
