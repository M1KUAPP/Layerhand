import { afterEach, describe, expect, test } from 'bun:test'

import type { RunEvent, RunRequest } from '../../src/agent/contract'
import { ScriptedModel } from '../../src/agent/scripted-model'
import { createRecordedFakeEditorSession } from '../../src/editor/fake-editor-session'
import { managedAgentRun } from '../../src/server/agent-run'
import type { ManagedRun } from '../../src/server/managed-run'
import { createLaunchRuntime, type LaunchRuntime } from '../../src/server/runtime'

const samplePath = new URL('../../src/editor/fixtures/document-preview.png', import.meta.url)
const MODEL_DELAY_MS = 40
const runtimes: LaunchRuntime[] = []

afterEach(async () => {
  await Promise.all(runtimes.splice(0).map((runtime) => runtime.close()))
})

async function agentRuntime(): Promise<LaunchRuntime> {
  const runtime = await createLaunchRuntime({
    env: { NODE_ENV: 'development', RUN_MODE: 'agent' },
    clientAddress: () => '203.0.113.30',
    fakeRunIntervalMs: MODEL_DELAY_MS,
    writeRunLog: () => undefined
  })
  runtimes.push(runtime)
  return runtime
}

async function startRun(runtime: LaunchRuntime): Promise<string> {
  const form = new FormData()
  form.set('image', new File([Bun.file(samplePath)], 'source.png', { type: 'image/png' }), 'source.png')
  form.set('filename', 'source.png')
  form.set('instruction', 'Remove the background')
  const response = await runtime.application.fetch(
    new Request('http://layerhand.test/api/runs', { method: 'POST', body: form })
  )
  expect(response.status).toBe(201)
  return ((await response.json()) as { runId: string }).runId
}

function steer(runtime: LaunchRuntime, runId: string, text: string): Promise<Response> {
  return runtime.application.fetch(
    new Request(`http://layerhand.test/api/runs/${runId}/steer`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text })
    })
  )
}

async function untilStep(runtime: LaunchRuntime, runId: string, n: number): Promise<void> {
  for await (const { event } of runtime.registry.events(runId)) {
    if (event.type === 'step' && event.n === n) return
  }
  throw new Error(`The run ended before step ${n}`)
}

async function eventsOf(runtime: LaunchRuntime, runId: string): Promise<RunEvent[]> {
  await runtime.registry.waitForTerminal(runId)
  const events: RunEvent[] = []
  for await (const { event } of runtime.registry.events(runId)) events.push(event)
  return events
}

const narrationsAfter = (events: RunEvent[], index: number) =>
  events.slice(index + 1).flatMap((event) => (event.type === 'step' ? [event.narration] : []))

describe('steering the agent loop through the HTTP surface', () => {
  test('a correction typed mid-run changes the steps that follow', async () => {
    const runtime = await agentRuntime()
    const untouched = await eventsOf(runtime, await startRun(runtime))
    const runId = await startRun(runtime)

    await untilStep(runtime, runId, 1)
    expect((await steer(runtime, runId, 'Keep the shadow')).status).toBe(202)
    const events = await eventsOf(runtime, runId)

    const ack = events.findIndex((event) => event.type === 'correction_ack')
    expect(events[ack]).toEqual({ type: 'correction_ack', text: 'Keep the shadow' })
    expect(narrationsAfter(events, ack)).toContain('Applying the correction: Keep the shadow')
    expect(narrationsAfter(untouched, 0)).not.toContain('Applying the correction: Keep the shadow')
    expect(events.at(-1)).toMatchObject({ type: 'done', result: { complete: true } })
  })

  test('the page receives the acknowledgement within three seconds', async () => {
    const runtime = await agentRuntime()
    const runId = await startRun(runtime)
    await untilStep(runtime, runId, 1)
    const stream = await runtime.application.fetch(new Request(`http://layerhand.test/api/runs/${runId}/events`))
    const reader = stream.body!.pipeThrough(new TextDecoderStream()).getReader()

    const sentAt = performance.now()
    await steer(runtime, runId, 'Keep the shadow')
    let received = ''
    while (!received.includes('event: correction_ack\n')) {
      const { value, done } = await reader.read()
      if (done) throw new Error('The event stream ended without an acknowledgement')
      received += value
    }
    const elapsedMs = performance.now() - sentAt
    await reader.cancel()

    expect(received).toContain('data: {"type":"correction_ack","text":"Keep the shadow"}')
    expect(elapsedMs).toBeLessThan(3_000)
    await runtime.registry.waitForTerminal(runId)
  })

  test('two corrections in one run both land', async () => {
    const runtime = await agentRuntime()
    const runId = await startRun(runtime)

    await untilStep(runtime, runId, 1)
    expect((await steer(runtime, runId, 'Keep the shadow')).status).toBe(202)
    expect((await steer(runtime, runId, 'Leave the label alone')).status).toBe(202)
    const events = await eventsOf(runtime, runId)

    const acks = events.flatMap((event, index) => (event.type === 'correction_ack' ? [index] : []))
    expect(acks).toHaveLength(2)
    const narrations = narrationsAfter(events, acks[1]!)
    expect(narrations.indexOf('Applying the correction: Keep the shadow')).toBeGreaterThanOrEqual(0)
    expect(narrations.indexOf('Applying the correction: Leave the label alone')).toBeGreaterThan(
      narrations.indexOf('Applying the correction: Keep the shadow')
    )
    const snapshot = await runtime.application.fetch(new Request(`http://layerhand.test/api/runs/${runId}`))
    expect((await snapshot.json()).corrections).toEqual(['Keep the shadow', 'Leave the label alone'])
  })

  test('a correction sent after the run has ended is refused with a reason', async () => {
    const runtime = await agentRuntime()
    const runId = await startRun(runtime)
    await runtime.registry.waitForTerminal(runId)

    const response = await steer(runtime, runId, 'Keep the shadow')

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ code: 'run_ended', message: 'The run has already ended.' })
  })

  test('refuses an unknown run mode', async () => {
    await expect(
      createLaunchRuntime({ env: { NODE_ENV: 'development', RUN_MODE: 'real' }, clientAddress: () => '203.0.113.30' })
    ).rejects.toThrow('RUN_MODE must be agent or fake')
  })
})

describe('managed agent run', () => {
  const request = (overrides: Partial<RunRequest> = {}): RunRequest => ({
    image: Uint8Array.of(0x89, 0x50, 0x4e, 0x47),
    filename: 'source.png',
    instruction: 'Remove the background',
    stepCap: 15,
    budgetUsd: 8,
    apiKey: 'sk-user-secret-value',
    ...overrides
  })

  async function finish(managed: ManagedRun): Promise<RunEvent[]> {
    const events: RunEvent[] = []
    for await (const event of managed.handle.events) events.push(event)
    return events
  }

  async function run(overrides: Partial<RunRequest> = {}) {
    const runRequest = request(overrides)
    const managed = managedAgentRun(runRequest, {
      session: await createRecordedFakeEditorSession(),
      model: new ScriptedModel({ delayMs: 1 }),
      publish: async (_bytes, kind) => `memory://${kind}`
    })
    return { runRequest, managed }
  }

  test('reports a finished edit as complete, with the share of input read from cache', async () => {
    const { managed } = await run()

    await finish(managed)

    const { cacheHitRate, stopReason } = managed.metrics()
    expect(stopReason).toBe('complete')
    // Five calls resending 1..5 frames, of which all but the newest are cached: 10 of 15.
    expect(cacheHitRate).toBeCloseTo(10 / 15)
  })

  test('names the cap that stopped an incomplete run', async () => {
    const stepCapped = await run({ stepCap: 2 })
    const spendCapped = await run({ budgetUsd: 0.05 })

    await Promise.all([finish(stepCapped.managed), finish(spendCapped.managed)])

    expect(stepCapped.managed.metrics().stopReason).toBe('step_cap')
    expect(spendCapped.managed.metrics().stopReason).toBe('spend_cap')
  })

  test('reports a cancel, and releases the key', async () => {
    const { managed, runRequest } = await run()

    await managed.handle.cancel()
    const events = await finish(managed)
    managed.releaseSecrets()

    expect(events.at(-1)).toMatchObject({ type: 'done', result: { complete: false } })
    expect(managed.metrics().stopReason).toBe('cancelled')
    expect(runRequest.apiKey).toBeUndefined()
  })
})
