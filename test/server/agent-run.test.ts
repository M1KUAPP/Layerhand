import { afterEach, describe, expect, test } from 'bun:test'
import type { BrowserContext, Page } from 'playwright-core'

import type { RunEvent, RunRequest } from '../../src/agent/contract'
import { ScriptedModel } from '../../src/agent/scripted-model'
import { createRecordedFakeEditorSession } from '../../src/editor/fake-editor-session'
import type { ComputerAction, EditorSession, LayerInfo } from '../../src/editor/session'
import { ModelUnavailableError, type AgentModel } from '../../src/agent/model'
import { ResponsesModel } from '../../src/agent/responses-model'
import { liveAgentRun, managedAgentRun, type LiveAgentDependencies } from '../../src/server/agent-run'
import { DEFAULT_RUN_LIMITS } from '../../src/server/config'
import type { ManagedRun } from '../../src/server/managed-run'
import type { RunStreamEvent } from '../../src/server/run-registry'
import { createLaunchRuntime, type LaunchRuntime } from '../../src/server/runtime'

const samplePath = new URL('../../src/editor/fixtures/document-preview.png', import.meta.url)
const MODEL_DELAY_MS = 40
const runtimes: LaunchRuntime[] = []

afterEach(async () => {
  await Promise.all(runtimes.splice(0).map((runtime) => runtime.close()))
})

async function agentRuntime(): Promise<LaunchRuntime> {
  const runtime = await createLaunchRuntime({
    env: { NODE_ENV: 'development', RUN_MODE: 'scripted' },
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

async function eventsOf(runtime: LaunchRuntime, runId: string): Promise<RunStreamEvent[]> {
  await runtime.registry.waitForTerminal(runId)
  const events: RunStreamEvent[] = []
  for await (const { event } of runtime.registry.events(runId)) events.push(event)
  return events
}

const narrationsAfter = (events: RunStreamEvent[], index: number) =>
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
    // The recorded session's retouched layer carries an enabled mask (#133),
    // so finishing the scripted turns satisfies the editable-output policy.
    expect(events.at(-1)).toMatchObject({ type: 'done', result: { complete: true } })
    expect(events.filter((event) => event.type === 'error')).toEqual([])
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
    // The first correction can reach the model before the second is acknowledged.
    const narrations = narrationsAfter(events, acks[0]!)
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
    ).rejects.toThrow('RUN_MODE must be agent, scripted, or fake')
  })

  test('refuses agent mode without a Browserbase key or a public address', async () => {
    const clientAddress = () => '203.0.113.30'
    await expect(
      createLaunchRuntime({
        env: { NODE_ENV: 'development', RUN_MODE: 'agent', PUBLIC_URL: 'https://layerhand.test' },
        clientAddress
      })
    ).rejects.toThrow('RUN_MODE=agent needs BROWSERBASE_API_KEY')
    await expect(
      createLaunchRuntime({
        env: { NODE_ENV: 'development', RUN_MODE: 'agent', BROWSERBASE_API_KEY: 'bb-key' },
        clientAddress
      })
    ).rejects.toThrow('RUN_MODE=agent needs PUBLIC_URL')
    await expect(
      createLaunchRuntime({
        env: { NODE_ENV: 'development', RUN_MODE: 'agent', BROWSERBASE_API_KEY: 'bb-key', PUBLIC_URL: 'ftp://x' },
        clientAddress
      })
    ).rejects.toThrow('PUBLIC_URL must be an HTTP or HTTPS address')
  })

  test('refuses a steering mode it does not know', async () => {
    await expect(
      createLaunchRuntime({
        env: {
          NODE_ENV: 'development',
          RUN_MODE: 'agent',
          BROWSERBASE_API_KEY: 'bb-key',
          PUBLIC_URL: 'https://layerhand.test',
          STEERING: 'sideways'
        },
        clientAddress: () => '203.0.113.30'
      })
    ).rejects.toThrow('STEERING must be native or boundary')
  })

  test('composes agent mode without reaching Browserbase before a run starts', async () => {
    const runtime = await createLaunchRuntime({
      env: {
        NODE_ENV: 'development',
        RUN_MODE: 'agent',
        BROWSERBASE_API_KEY: 'bb-key',
        PUBLIC_URL: 'https://layerhand.test'
      },
      clientAddress: () => '203.0.113.30',
      writeRunLog: () => undefined
    })
    runtimes.push(runtime)

    const health = await runtime.application.fetch(new Request('http://layerhand.test/health'))
    expect(health.status).toBe(200)
  })
})

describe('live agent run', () => {
  const CONNECT_URL = 'wss://connect.browserbase.test/?signingKey=secret-signing-key'
  const USAGE = { input_tokens: 2_000, input_tokens_details: { cached_tokens: 1_500 }, output_tokens: 120 }
  const CLICK = { type: 'click', button: 'left', x: 1300, y: 120 }
  const COMPUTER_TURN = {
    id: 'resp_1',
    output: [
      {
        type: 'message',
        role: 'assistant',
        phase: 'commentary',
        content: [{ type: 'output_text', text: 'Opening the Adjustments panel' }]
      },
      { type: 'computer_call', call_id: 'call_1', actions: [CLICK], pending_safety_checks: [] }
    ],
    usage: USAGE
  }
  const FINAL_TURN = { id: 'resp_2', output: [], usage: USAGE }
  // Test-only editable metadata, so a finished edit passes the completion policy.
  const EDITABLE: LayerInfo[] = [
    { name: 'Warm highlights', kind: 'adjustment', visible: true, masks: [], children: [] }
  ]

  async function live(
    apiKey: string | undefined,
    responses: (Record<string, unknown> | Response)[],
    overrides: Partial<RunRequest> = {},
    steering: Pick<LiveAgentDependencies, 'steering' | 'socketEndpoint'> = {}
  ) {
    const recorded = await createRecordedFakeEditorSession()
    const authorizations: (string | null)[] = []
    const browser = { created: [] as string[], released: [] as string[], closed: 0, hostUrls: [] as string[] }
    const fetch = (async (_url: string, init: RequestInit) => {
      authorizations.push(new Headers(init.headers).get('authorization'))
      const next = responses[authorizations.length - 1]
      if (!next) throw new Error('No scripted response left')
      return next instanceof Response ? next : Response.json(next)
    }) as unknown as typeof globalThis.fetch
    const runRequest: RunRequest = {
      image: Uint8Array.of(0x89, 0x50, 0x4e, 0x47),
      filename: 'source.png',
      instruction: 'Warm the highlights',
      stepCap: 15,
      budgetUsd: 8,
      apiKey,
      ...overrides
    }
    const managed = liveAgentRun(runRequest, {
      hostUrl: 'https://layerhand.test/photopea-host',
      serverApiKey: 'sk-server-secret-value',
      publish: async (_bytes, kind) => `memory://${kind}`,
      fetch,
      ...steering,
      sessions: {
        async createSession() {
          browser.created.push('bb-1')
          return { id: 'bb-1', projectId: 'project', connectUrl: CONNECT_URL }
        },
        async releaseSession(id) {
          browser.released.push(id)
        }
      },
      async connect() {
        const context = {
          async route() {},
          async routeWebSocket() {}
        } as unknown as BrowserContext
        return {
          page: { context: () => context } as Page,
          async close() {
            browser.closed += 1
          }
        }
      },
      createEditorSession(_page, options): EditorSession {
        browser.hostUrls.push(options.hostUrl)
        return {
          id: options.id,
          viewport: recorded.viewport,
          open: (image, filename) => recorded.open(image, filename),
          screenshot: () => recorded.screenshot(),
          act: (actions) => recorded.act(actions),
          layers: async () => structuredClone(EDITABLE),
          exportPsd: () => recorded.exportPsd(),
          exportPreview: () => recorded.exportPreview(),
          // Releases even when closing fails, as the Photopea session does.
          async close() {
            try {
              await recorded.close()
            } finally {
              await options.release()
            }
          }
        }
      }
    })
    return { managed, runRequest, recorded, authorizations, browser }
  }

  async function finish(managed: ManagedRun): Promise<RunEvent[]> {
    const events: RunEvent[] = []
    for await (const event of managed.handle.events) events.push(event)
    return events
  }

  test("drives Photopea with the computer tool on the user's key, then releases the browser and the key", async () => {
    const run = await live('sk-user-secret-value', [COMPUTER_TURN, FINAL_TURN])

    const events = await finish(run.managed)
    run.managed.releaseSecrets()

    expect(events.at(-1)).toMatchObject({ type: 'done', result: { complete: true } })
    expect(events).toContainEqual({ type: 'step', n: 1, cap: 15, narration: 'Opening the Adjustments panel' })
    expect(run.recorded.actionBatches).toEqual([[CLICK as ComputerAction]])
    expect(run.authorizations).toEqual(['Bearer sk-user-secret-value', 'Bearer sk-user-secret-value'])
    expect(run.browser).toEqual({
      created: ['bb-1'],
      released: ['bb-1'],
      closed: 1,
      hostUrls: ['https://layerhand.test/photopea-host']
    })
    expect(run.managed.metrics().stopReason).toBe('complete')
    const streamed = JSON.stringify(events)
    expect(streamed).not.toContain('signingKey')
    expect(streamed).not.toContain('sk-user')
    expect(run.runRequest.apiKey).toBeUndefined()
  })

  test('pays with the server key when the user supplied none', async () => {
    const run = await live(undefined, [FINAL_TURN])

    await finish(run.managed)

    expect(run.authorizations).toEqual(['Bearer sk-server-secret-value'])
  })

  test('with native steering, sends each step over one WebSocket, and closes it once the run releases its secrets', async () => {
    const creates: Record<string, unknown>[] = []
    let socketClosed!: () => void
    const closed = new Promise<void>((resolve) => (socketClosed = resolve))
    const server = Bun.serve({
      port: 0,
      hostname: '127.0.0.1',
      fetch: (request, server) =>
        server.upgrade(request) ? undefined : new Response('Upgrade required', { status: 426 }),
      websocket: {
        message(ws, message) {
          creates.push(JSON.parse(String(message)))
          ws.send(JSON.stringify({ type: 'response.created', response: { id: 'resp_ws', output: [] } }))
          ws.send(JSON.stringify({ type: 'response.completed', response: { ...FINAL_TURN, id: 'resp_ws' } }))
        },
        close: () => socketClosed()
      }
    })
    try {
      const run = await live(
        'sk-user-secret-value',
        [],
        {},
        { steering: 'native', socketEndpoint: `ws://127.0.0.1:${server.port}/v1/responses` }
      )

      const events = await finish(run.managed)
      run.managed.releaseSecrets()
      await closed

      expect(events.at(-1)).toMatchObject({ type: 'done', result: { complete: true } })
      expect(creates).toEqual([expect.objectContaining({ type: 'response.create', store: true })])
      expect(run.authorizations).toEqual([])
    } finally {
      void server.stop(true)
    }
  })

  test('releases the browser when the model fails', async () => {
    const run = await live('sk-user-secret-value', [
      Response.json({ error: { code: 'invalid_value' } }, { status: 400 })
    ])

    const events = await finish(run.managed)

    expect(events.at(-1)).toMatchObject({ type: 'error', recoverable: false })
    expect(run.managed.metrics().stopReason).toBe('failed')
    expect(run.browser.released).toEqual(['bb-1'])
    expect(run.browser.closed).toBe(1)
  })

  test('a cancelled run exports its partial file, then releases the browser', async () => {
    const run = await live('sk-user-secret-value', [COMPUTER_TURN, FINAL_TURN])

    await run.managed.handle.cancel()
    const events = await finish(run.managed)

    expect(events.at(-1)).toMatchObject({ type: 'done', result: { complete: false, psdUrl: 'memory://psd' } })
    expect(run.managed.metrics().stopReason).toBe('cancelled')
    expect(run.browser).toMatchObject({ released: ['bb-1'], closed: 1 })
  })

  test('a run stopped by either cap exports its partial file, then releases the browser', async () => {
    const stepCapped = await live('sk-user-secret-value', [COMPUTER_TURN], { stepCap: 1 })
    // One call costs about $0.014, so a second would pass $0.02.
    const spendCapped = await live('sk-user-secret-value', [COMPUTER_TURN], { budgetUsd: 0.02 })

    const [stepEvents, spendEvents] = await Promise.all([finish(stepCapped.managed), finish(spendCapped.managed)])

    for (const [events, capped, reason] of [
      [stepEvents, stepCapped, 'step_cap'],
      [spendEvents, spendCapped, 'spend_cap']
    ] as const) {
      // The result on the wire carries the same reason as metrics(), so the
      // page can show it instead of always blaming the step cap (#125).
      expect(events.at(-1)).toMatchObject({
        type: 'done',
        result: { complete: false, psdUrl: 'memory://psd', stopReason: reason }
      })
      expect(capped.managed.metrics().stopReason).toBe(reason)
      expect(capped.browser).toMatchObject({ released: ['bb-1'], closed: 1 })
    }
  })
})

describe('managed agent run', () => {
  const blankNarrationModel: AgentModel = {
    async next() {
      return {
        narration: '   ',
        actions: [],
        usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1 },
        done: false
      }
    }
  }

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

  async function run(
    overrides: Partial<RunRequest> = {},
    layers?: readonly LayerInfo[],
    model: AgentModel = new ScriptedModel({ delayMs: 1 })
  ) {
    const runRequest = request(overrides)
    const session = await createRecordedFakeEditorSession()
    if (layers) {
      const recordedLayers = session.layers.bind(session)
      session.layers = async () => {
        await recordedLayers()
        return structuredClone([...layers])
      }
    }
    const managed = managedAgentRun(runRequest, {
      session,
      model,
      publish: async (_bytes, kind) => `memory://${kind}`
    })
    return { runRequest, managed }
  }

  test('reports a finished edit as complete, with the share of input read from cache', async () => {
    // Test-only editable metadata; this is not a claim about the recorded PSD.
    const { managed } = await run({}, [
      { name: 'Warm highlights', kind: 'adjustment', visible: true, masks: [], children: [] }
    ])

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

  test('shutdown() reports a reason distinct from a user cancel, and still exports the partial file', async () => {
    const { managed } = await run({ stepCap: 15 })

    await managed.shutdown?.()
    const events = await finish(managed)

    expect(events.at(-1)).toMatchObject({
      type: 'done',
      result: { complete: false, psdUrl: 'memory://psd', stopReason: 'shutdown' }
    })
    expect(managed.metrics().stopReason).toBe('shutdown')
  })

  test('records a run whose model stopped answering as failed on the model call, even at the step cap', async () => {
    const unanswered: AgentModel = {
      async next() {
        throw new ModelUnavailableError('The Responses API did not answer after 7 attempts')
      }
    }
    const { managed } = await run({ stepCap: 1 }, undefined, unanswered)

    const events = await finish(managed)

    expect(events.at(-1)).toMatchObject({ type: 'done', result: { complete: false } })
    expect(managed.metrics()).toMatchObject({
      stopReason: 'failed',
      failure: { code: 'model_call_failed', errorName: 'ModelUnavailableError' }
    })
  })

  describe('on a rate-limited Responses API', () => {
    const rateLimited = () =>
      Response.json({ error: { code: 'rate_limit_exceeded', message: 'Rate limit reached' } }, { status: 429 })
    const answer =
      (id: string, output: unknown[] = []) =>
      () =>
        Response.json({ id, output, usage: { input_tokens: 2_000, output_tokens: 120 } })
    const CLICK_STEP = [
      { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Opening the Adjustments panel' }] },
      { type: 'computer_call', call_id: 'call_1', actions: [{ type: 'wait' }], pending_safety_checks: [] }
    ]

    /** GPT-6 Astra answering from a script, whose last answer repeats, with retries that do not wait. */
    function scriptedAstra(script: (() => Response)[]) {
      let requests = 0
      const fetch = (async () =>
        script[Math.min(requests++, script.length - 1)]!()) as unknown as typeof globalThis.fetch
      const model = new ResponsesModel({
        apiKey: 'sk-user-secret-value',
        instruction: 'Remove the background',
        stepCap: 15,
        mechanism: 'computer',
        fetch,
        sleep: async () => undefined
      })
      return { model, requests: () => requests }
    }

    test('a call that meets a rate limit is sent again, and the run completes', async () => {
      const astra = scriptedAstra([rateLimited, answer('resp_1', CLICK_STEP), rateLimited, answer('resp_2')])
      const editable: LayerInfo[] = [
        { name: 'Warm highlights', kind: 'adjustment', visible: true, masks: [], children: [] }
      ]
      const { managed } = await run({}, editable, astra.model)

      const events = await finish(managed)

      expect(events.at(-1)).toMatchObject({ type: 'done', result: { complete: true } })
      expect(events.filter((event) => event.type === 'error')).toEqual([])
      expect(managed.metrics().stopReason).toBe('complete')
      expect(astra.requests()).toBe(4)
    })

    test('a model that stays rate limited ends the run with its partial file, logged as failed on the model call', async () => {
      const astra = scriptedAstra([answer('resp_1', CLICK_STEP), rateLimited])
      const { managed } = await run({}, undefined, astra.model)

      const events = await finish(managed)

      expect(events.slice(-2)).toMatchObject([
        { type: 'error', reason: 'The model stopped answering, so the run stopped', recoverable: true },
        { type: 'done', result: { complete: false, psdUrl: 'memory://psd' } }
      ])
      expect(managed.metrics()).toMatchObject({
        stopReason: 'failed',
        failure: { code: 'model_call_failed', errorName: 'ModelUnavailableError' }
      })
      // One answered call, then the next call's first attempt and its six retries.
      expect(astra.requests()).toBe(8)
    })
  })

  describe('with native steering', () => {
    const tokens = (input: number, cached: number, output: number) => ({
      input_tokens: input,
      input_tokens_details: { cached_tokens: cached },
      output_tokens: output
    })
    const answer = (id: string, usage: object) => ({
      type: 'response.completed',
      response: {
        id,
        output: [
          { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Retouching the product' }] },
          { type: 'computer_call', call_id: `call_${id}`, actions: [{ type: 'wait' }], pending_safety_checks: [] }
        ],
        usage
      }
    })

    /**
     * GPT-6 Astra over a stand-in for the Responses API WebSocket. Each call's
     * input grows by 1,500 tokens, as a screenshot history does, with all but
     * the newest read from the cache, and each answer writes 200 tokens. Call
     * `steerAt` waits for a correction, which the server applies natively.
     */
    function steerableAstra(steerAt: number) {
      const input = (call: number) => 2_700 + 1_500 * (call - 1)
      let calls = 0
      let reached!: () => void
      const steerable = new Promise<void>((resolve) => (reached = resolve))
      const server = Bun.serve({
        port: 0,
        hostname: '127.0.0.1',
        fetch: (request, server) =>
          server.upgrade(request) ? undefined : new Response('Upgrade required', { status: 426 }),
        websocket: {
          message(ws, message) {
            const send = (event: object) => void ws.send(JSON.stringify(event))
            const event = JSON.parse(String(message))
            if (event.type === 'response.create') {
              calls += 1
              send({ type: 'response.created', response: { id: `resp_${calls}`, output: [] } })
              if (calls === steerAt) return reached()
              send(answer(`resp_${calls}`, tokens(input(calls), calls === 1 ? 0 : input(calls - 1), 200)))
            } else if (event.type === 'response.steer') {
              const steered = String(event.previous_response_id)
              send({ type: 'response.steer.accepted', steer: { id: 'steer_1', previous_response_id: steered } })
              send({
                type: 'response.incomplete',
                response: {
                  id: steered,
                  incomplete_details: { reason: 'steered' },
                  output: [],
                  usage: tokens(input(calls), input(calls - 1), 100)
                }
              })
              send({ type: 'response.created', response: { id: `${steered}_successor`, output: [] } })
              send(answer(`${steered}_successor`, tokens(input(calls) + 150, input(calls), 200)))
            }
          }
        }
      })
      const model = new ResponsesModel({
        apiKey: 'sk-user-secret-value',
        instruction: 'Remove the background',
        stepCap: 40,
        mechanism: 'computer',
        transport: 'websocket',
        socketEndpoint: `ws://127.0.0.1:${server.port}/v1/responses`,
        fetch: (async () => {
          throw new Error('The run left the socket')
        }) as unknown as typeof globalThis.fetch,
        sleep: async () => undefined
      })
      /** Resolves once call `steerAt` is being generated, so a correction steers it. */
      const inFlight = async () => {
        await steerable
        for (let tries = 0; tries < 400 && !model.steerable; tries += 1) await Bun.sleep(5)
        expect(model.steerable).toBe(true)
      }
      return { model, inFlight, stop: () => void server.stop(true) }
    }

    test('a run steered at step 30 still reaches step 38 under a $3 spend cap', async () => {
      const astra = steerableAstra(30)
      try {
        const { managed } = await run({ stepCap: 40, budgetUsd: 3 }, undefined, astra.model)
        await astra.inFlight()
        await managed.handle.steer('Keep the shadow')

        const events = await finish(managed)

        // Without the correction, the same run stops at the $3 cap after step 39.
        expect(events.filter((event) => event.type === 'step').length).toBeGreaterThanOrEqual(38)
        expect(events.filter((event) => event.type === 'error')).toEqual([])
        expect(managed.metrics().stopReason).toBe('spend_cap')
        // The run goes further, but what it spent stays within the $3 cap (NFR-2).
        const spent = events.flatMap((event) => (event.type === 'cost' ? [event.usd] : []))
        expect(spent.at(-1)).toBeLessThanOrEqual(3)
        expect(astra.model.steering).toMatchObject({ applied: 1, indeterminate: 0 })
      } finally {
        astra.stop()
      }
    })

    test('does not report a correction steered into the last call the step cap allows as lost', async () => {
      const astra = steerableAstra(2)
      try {
        const { managed } = await run({ stepCap: 2 }, undefined, astra.model)
        await astra.inFlight()
        await managed.handle.steer('Keep the shadow')

        const events = await finish(managed)

        expect(events.filter((event) => event.type === 'correction_ack')).toHaveLength(1)
        expect(events.filter((event) => event.type === 'error')).toEqual([])
        expect(events.at(-1)).toMatchObject({ type: 'done', result: { complete: false } })
        expect(managed.metrics().stopReason).toBe('step_cap')
        expect(astra.model.steering).toMatchObject({ applied: 1, indeterminate: 0 })
      } finally {
        astra.stop()
      }
    })

    test('records the transport and how the correction settled, for the run log (NFR-8)', async () => {
      const astra = steerableAstra(2)
      try {
        const { managed } = await run({ stepCap: 2 }, undefined, astra.model)
        await astra.inFlight()
        await managed.handle.steer('Keep the shadow')

        await finish(managed)

        expect(managed.metrics()).toMatchObject({
          transport: 'websocket',
          steering: { applied: 1, replayed: 0, indeterminate: 0 }
        })
      } finally {
        astra.stop()
      }
    })
  })

  test('reports missing narration as failed at the final step', async () => {
    const { managed } = await run({ stepCap: 1 }, undefined, blankNarrationModel)

    await finish(managed)

    expect(managed.metrics().stopReason).toBe('failed')
  })

  test('reports missing narration as failed at the spend cap boundary', async () => {
    const { managed } = await run({ budgetUsd: 0.0000625 }, undefined, blankNarrationModel)

    await finish(managed)

    expect(managed.metrics().stopReason).toBe('failed')
  })

  test('offers a model that can steer each correction the loop acknowledged, and none it refused', async () => {
    const offered: string[] = []
    let calls = 0
    let inFlight!: () => void
    const started = new Promise<void>((resolve) => (inFlight = resolve))
    let answer!: () => void
    const answered = new Promise<void>((resolve) => (answer = resolve))
    const steeringModel: AgentModel = {
      async next() {
        calls += 1
        if (calls === 1) {
          inFlight()
          await answered
        }
        return {
          narration: 'Selecting the product',
          actions: [],
          usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1 },
          done: calls > 1
        }
      },
      steer(text) {
        offered.push(text)
        if (text === 'Leave the label') throw new Error('The socket is gone')
        return { applied: false }
      }
    }
    const { managed } = await run(
      {},
      [{ name: 'Warm highlights', kind: 'adjustment', visible: true, masks: [], children: [] }],
      steeringModel
    )

    await started
    await managed.handle.steer('Keep the shadow')
    await managed.handle.steer('Leave the label')
    answer()
    const events = await finish(managed)

    expect(offered).toEqual(['Keep the shadow', 'Leave the label'])
    expect(events.filter((event) => event.type === 'correction_ack')).toHaveLength(2)
    expect(managed.metrics().stopReason).toBe('complete')
    await expect(managed.handle.steer('Too late')).rejects.toThrow()
    expect(offered).toEqual(['Keep the shadow', 'Leave the label'])
  })

  test('closes a model that holds something, once, when the run ends', async () => {
    const scripted = new ScriptedModel({ delayMs: 1 })
    let closed = 0
    const closingModel: AgentModel = {
      next: (observation, signal) => scripted.next(observation, signal),
      close: () => void (closed += 1)
    }
    const { managed } = await run({}, undefined, closingModel)

    await finish(managed)

    expect(closed).toBe(1)
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

  test('ends a run whose model never answers at the ceiling, with its partial file, and closes the editor', async () => {
    const session = await createRecordedFakeEditorSession()
    let closed = 0
    const close = session.close.bind(session)
    session.close = async () => {
      closed += 1
      await close()
    }
    const silentModel: AgentModel = { next: () => new Promise(() => undefined) }
    const managed = managedAgentRun(
      request(),
      { session, model: silentModel, publish: async (_bytes, kind) => `memory://${kind}` },
      { ceilingMs: 50 }
    )

    const events = await finish(managed)

    expect(events.at(-1)).toMatchObject({ type: 'done', result: { complete: false, psdUrl: 'memory://psd' } })
    expect(managed.metrics().stopReason).toBe('time_limit')
    expect(closed).toBe(1)
  })

  test('abandons the browser when an editor call hangs past the ceiling and its grace period', async () => {
    const session = await createRecordedFakeEditorSession()
    let failAction: (error: Error) => void = () => undefined
    session.act = () =>
      new Promise((_resolve, reject) => {
        failAction = reject
      })
    let abandoned = 0
    const clickingModel: AgentModel = {
      async next() {
        return {
          narration: 'Clicking the Layers panel',
          actions: [{ type: 'wait' }],
          usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1 },
          done: false
        }
      }
    }
    const managed = managedAgentRun(
      request(),
      { session, model: clickingModel, publish: async (_bytes, kind) => `memory://${kind}` },
      {
        ceilingMs: 50,
        exportGraceMs: 50,
        async abandon() {
          abandoned += 1
          failAction(new Error('Target closed'))
        }
      }
    )

    const events = await finish(managed)

    expect(events.at(-1)).toMatchObject({ type: 'error', recoverable: false })
    expect(abandoned).toBe(1)
    expect(managed.metrics().stopReason).toBe('time_limit')
  })

  test('a run as long as the live one, nineteen steps, completes under the default step cap', async () => {
    let calls = 0
    const nineteenSteps: AgentModel = {
      async next() {
        calls += 1
        const done = calls > 19
        return {
          narration: done ? '' : `Step ${calls}`,
          actions: done ? [] : [{ type: 'wait' }],
          usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1 },
          done
        }
      }
    }
    const { managed } = await run(
      { stepCap: DEFAULT_RUN_LIMITS.stepCap },
      [{ name: 'Warm highlights', kind: 'adjustment', visible: true, masks: [], children: [] }],
      nineteenSteps
    )

    const events = await finish(managed)

    expect(events.filter((event) => event.type === 'step')).toHaveLength(19)
    expect(managed.metrics().stopReason).toBe('complete')
  })

  test('a run that fails on its own is recorded as failed, even when its events are read after the ceiling', async () => {
    const failingModel: AgentModel = {
      async next() {
        throw new Error('The model is unavailable')
      }
    }
    const session = await createRecordedFakeEditorSession()
    const late = managedAgentRun(
      request(),
      { session, model: failingModel, publish: async (_bytes, kind) => `memory://${kind}` },
      { ceilingMs: 20 }
    )

    // Nothing reads the events until well after the ceiling would have fired.
    await Bun.sleep(80)
    const events = await finish(late)

    expect(events.at(-1)).toMatchObject({ type: 'error', recoverable: false })
    expect(late.metrics().stopReason).toBe('failed')
    expect(late.metrics().failure?.code).toBe('model_call_failed')
  })

  test('abandons a browser whose recovery export cannot finish', async () => {
    const session = await createRecordedFakeEditorSession()
    session.exportPsd = () => new Promise<Uint8Array>(() => undefined)
    session.close = () => new Promise<void>(() => undefined)
    const failingModel: AgentModel = {
      async next() {
        throw new Error('The model is unavailable')
      }
    }
    let abandoned = 0
    const managed = managedAgentRun(
      request(),
      {
        session,
        model: failingModel,
        publish: async (_bytes, kind) => `memory://${kind}`,
        errorExportTimeoutMs: 10
      },
      {
        async abandon() {
          abandoned += 1
        }
      }
    )

    const events = await finish(managed)

    expect(events.at(-1)).toMatchObject({ type: 'error', recoverable: false })
    expect(abandoned).toBe(1)
  }, 500)

  test('keeps the model failure in metrics when its recovery export also fails', async () => {
    const session = await createRecordedFakeEditorSession()
    session.exportPsd = async () => {
      throw new Error('The recovery export failed')
    }
    const failingModel: AgentModel = {
      async next() {
        throw new Error('The model is unavailable')
      }
    }
    const managed = managedAgentRun(request(), {
      session,
      model: failingModel,
      publish: async (_bytes, kind) => `memory://${kind}`
    })

    await finish(managed)

    expect(managed.metrics().failure).toMatchObject({
      code: 'model_call_failed',
      message: 'The model is unavailable'
    })
  })

  test('keeps a fatal model failure after an earlier live-frame publish failure', async () => {
    const session = await createRecordedFakeEditorSession()
    let framePublishFailed = false
    const failingModel: AgentModel = {
      async next() {
        await Bun.sleep(20)
        throw new Error('The model is unavailable')
      }
    }
    const managed = managedAgentRun(request(), {
      session,
      model: failingModel,
      frameIntervalMs: 1,
      publish: async (_bytes, kind) => {
        if (kind === 'frame') {
          framePublishFailed = true
          throw new Error('The live frame store is unavailable')
        }
        return `memory://${kind}`
      }
    })

    await finish(managed)

    expect(framePublishFailed).toBe(true)
    expect(managed.metrics().failure).toMatchObject({
      code: 'model_call_failed',
      message: 'The model is unavailable'
    })
  })

  test('records which editor call a failed run failed on, redacted, while the page keeps the fixed reason', async () => {
    const session = await createRecordedFakeEditorSession()
    session.act = async () => {
      throw new Error(
        'keyboard.press failed near wss://connect.browserbase.test/?signingKey=secret for sk-proj-abcdefghijklmnop'
      )
    }
    const clickingModel: AgentModel = {
      async next() {
        return {
          narration: 'Clicking the Layers panel',
          actions: [{ type: 'wait' }],
          usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1 },
          done: false
        }
      }
    }
    const managed = managedAgentRun(request(), {
      session,
      model: clickingModel,
      publish: async (_bytes, kind) => `memory://${kind}`
    })

    const events = await finish(managed)

    expect(events.at(-1)).toEqual({
      type: 'error',
      reason: 'The run stopped because of an unexpected error',
      recoverable: false
    })
    const { stopReason, failure } = managed.metrics()
    expect(stopReason).toBe('failed')
    expect(failure).toMatchObject({
      code: 'editor_action_failed',
      errorName: 'Error',
      message: 'keyboard.press failed near [url] for [redacted]'
    })
    expect(failure!.stack.length).toBeLessThanOrEqual(3)
  })
})
