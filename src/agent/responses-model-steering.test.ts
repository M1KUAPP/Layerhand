// Native steering over the Responses API WebSocket (#9), against a local
// server that plays each event sequence from OpenAI's steering guide.
import { afterEach, describe, expect, test } from 'bun:test'
import { ResponsesApiError, ResponsesModel, type ResponsesModelOptions } from './responses-model'
import type { SteeringEvent } from './responses-socket'

const KEY = 'sk-test-key-that-must-not-leak'
const SCREENSHOT = Uint8Array.of(0x89, 0x50, 0x4e, 0x47)
const USAGE = { input_tokens: 2_000, input_tokens_details: { cached_tokens: 1_500 }, output_tokens: 120 }
const CLICK = { type: 'click', button: 'left', x: 1300, y: 120 }

type Json = Record<string, any>

/** Hands out items in arrival order, waiting when there is none. */
class Inbox<T> {
  readonly #items: T[] = []
  readonly #waiting: ((item: T) => void)[] = []

  push(item: T): void {
    const waiter = this.#waiting.shift()
    if (waiter) waiter(item)
    else this.#items.push(item)
  }

  next(): Promise<T> {
    if (this.#items.length > 0) return Promise.resolve(this.#items.shift()!)
    return new Promise((resolve) => this.#waiting.push(resolve))
  }
}

interface Connection {
  authorization: string | null
  received: Inbox<Json>
  closed: Promise<void>
  send(event: Json): void
  close(): void
}

const servers: { stop(closeActiveConnections?: boolean): unknown }[] = []

// Not awaited: after the server itself closes a socket, Bun's stop() can wait on it forever.
afterEach(() => {
  for (const server of servers.splice(0)) void server.stop(true)
})

/** A stand-in for the Responses API WebSocket, which each test drives event by event. */
function scriptedSocketServer() {
  const connections = new Inbox<Connection>()
  const sockets = new Map<unknown, { connection: Connection; closed(): void }>()
  let authorization: string | null = null
  const server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    fetch(request, server) {
      authorization = request.headers.get('authorization')
      return server.upgrade(request) ? undefined : new Response('Upgrade required', { status: 426 })
    },
    websocket: {
      open(ws) {
        let closed!: () => void
        const connection: Connection = {
          authorization,
          received: new Inbox(),
          closed: new Promise((resolve) => (closed = resolve)),
          send: (event) => void ws.send(JSON.stringify(event)),
          close: () => ws.close()
        }
        sockets.set(ws, { connection, closed })
        connections.push(connection)
      },
      message(ws, message) {
        sockets.get(ws)?.connection.received.push(JSON.parse(String(message)))
      },
      close(ws) {
        sockets.get(ws)?.closed()
      }
    }
  })
  servers.push(server)
  return { url: `ws://127.0.0.1:${server.port}/v1/responses`, connections }
}

type Sent = { body: Json }

/** Answers each HTTP request with the next scripted payload. */
function scriptedFetch(responses: Json[] = []) {
  const sent: Sent[] = []
  const fetch = (async (_url: string, init: RequestInit) => {
    sent.push({ body: JSON.parse(String(init.body)) })
    const next = responses[sent.length - 1]
    if (!next) throw new Error('No scripted response left')
    return Response.json(next)
  }) as unknown as typeof globalThis.fetch
  return { fetch, sent }
}

const created = (id: string) => ({
  type: 'response.created',
  stream_id: 'layerhand',
  response: { id, status: 'in_progress', output: [] }
})
const said = (words: string) => ({
  type: 'message',
  role: 'assistant',
  content: [{ type: 'output_text', text: words }]
})
const computerCall = (callId: string) => ({
  type: 'computer_call',
  call_id: callId,
  actions: [CLICK],
  pending_safety_checks: []
})
const completed = (id: string, output: Json[] = []) => ({
  type: 'response.completed',
  stream_id: 'layerhand',
  response: { id, status: 'completed', output, usage: USAGE }
})
const steeredAway = (id: string) => ({
  type: 'response.incomplete',
  stream_id: 'layerhand',
  response: { id, status: 'incomplete', incomplete_details: { reason: 'steered' }, output: [], usage: USAGE }
})
const accepted = (steerId: string, parent: string) => ({
  type: 'response.steer.accepted',
  stream_id: 'layerhand',
  steer: { id: steerId, previous_response_id: parent }
})
const pending = (steerId: string, parent: string, callId: string) => ({
  type: 'response.steer.pending',
  stream_id: 'layerhand',
  steer: { id: steerId, previous_response_id: parent },
  reason: 'waiting_for_required_input',
  required_input: [{ type: 'computer_call_output', call_id: callId }]
})
const rateLimitedEvent = {
  type: 'error',
  status: 429,
  stream_id: 'layerhand',
  error: { type: 'invalid_request_error', code: 'rate_limit_exceeded', message: `Limit reached for ${KEY}` }
}
const failedResponse = (id: string) => ({
  type: 'response.failed',
  stream_id: 'layerhand',
  response: { id, status: 'failed', error: { code: 'server_error', message: `Failed for ${KEY}` }, output: [] }
})
const steerFailed = (parent: string, code: string) => ({
  type: 'response.steer.failed',
  stream_id: 'layerhand',
  steer: { previous_response_id: parent, input: 'Correction from the user: Keep the shadow' },
  error: { code, message: `Refused for ${KEY}`, type: 'invalid_request_error' }
})

const observe = (corrections: string[] = []) => ({ screenshot: SCREENSHOT, corrections })
const signal = () => new AbortController().signal
const correctionsIn = (input: Json[]) =>
  input.flatMap((item) =>
    item.role === 'user' && String(item.content[0].text).startsWith('Correction from the user: ')
      ? [item.content[0].text]
      : []
  )

async function until(condition: () => boolean): Promise<void> {
  for (let tries = 0; tries < 400 && !condition(); tries += 1) await Bun.sleep(5)
  if (!condition()) throw new Error('The condition never held')
}

function socketModel(url: string, overrides: Partial<ResponsesModelOptions> = {}, httpResponses: Json[] = []) {
  const http = scriptedFetch(httpResponses)
  const model = new ResponsesModel({
    apiKey: KEY,
    instruction: 'Warm the highlights',
    stepCap: 40,
    mechanism: 'computer',
    transport: 'websocket',
    socketEndpoint: url,
    fetch: http.fetch,
    ...overrides
  })
  return { model, http }
}

/** Starts the first step, opens its connection, and steers its response once it is being generated. */
async function steerFirstResponse(model: ResponsesModel, server: ReturnType<typeof scriptedSocketServer>) {
  const turn = model.next(observe(), signal())
  const connection = await server.connections.next()
  await connection.received.next()
  connection.send(created('resp_1'))
  await until(() => model.steerable)
  expect(model.steer('Keep the shadow')).toBe(true)
  const steer = await connection.received.next()
  return { turn, connection, steer }
}

describe('ResponsesModel over a WebSocket', () => {
  test('sends each step on one socket, on the bearer key, stored, in one lane, continuing from the last response', async () => {
    const server = scriptedSocketServer()
    const { model, http } = socketModel(server.url)

    const firstTurn = model.next(observe(), signal())
    const connection = await server.connections.next()
    const first = await connection.received.next()
    connection.send(created('resp_1'))
    connection.send(completed('resp_1', [said('Opening the Adjustments panel'), computerCall('call_1')]))
    const turn = await firstTurn
    const secondTurn = model.next(observe(), signal())
    const second = await connection.received.next()
    connection.send(created('resp_2'))
    connection.send(completed('resp_2', [said('The highlights are warmer.')]))

    expect(turn).toEqual({
      narration: 'Opening the Adjustments panel',
      actions: [CLICK as never],
      usage: { inputTokens: 2_000, cachedInputTokens: 1_500, outputTokens: 120 },
      done: false
    })
    expect(await secondTurn).toMatchObject({ narration: 'The highlights are warmer.', done: true })
    expect(connection.authorization).toBe(`Bearer ${KEY}`)
    expect(first).toMatchObject({
      type: 'response.create',
      stream_id: 'layerhand',
      store: true,
      model: 'gpt-6-astra',
      tools: [{ type: 'computer' }],
      parallel_tool_calls: false,
      reasoning: { effort: 'low' }
    })
    expect(first.previous_response_id).toBeUndefined()
    expect(first.input[0]).toEqual({ role: 'user', content: [{ type: 'input_text', text: 'Warm the highlights' }] })
    expect(second.previous_response_id).toBe('resp_1')
    expect(second.input[0]).toMatchObject({ type: 'computer_call_output', call_id: 'call_1' })
    // A changed tool array or prompt would invalidate the prompt cache.
    expect(JSON.stringify(second.tools)).toBe(JSON.stringify(first.tools))
    expect(second.instructions).toBe(first.instructions)
    expect(JSON.stringify([first, second])).not.toContain(KEY)
    expect(http.sent).toEqual([])
  })

  test('a correction that steers the response in flight is applied once, and never replayed', async () => {
    const server = scriptedSocketServer()
    const { model } = socketModel(server.url)

    const { turn, connection, steer } = await steerFirstResponse(model, server)
    connection.send(accepted('steer_1', 'resp_1'))
    connection.send(steeredAway('resp_1'))
    connection.send(created('resp_2'))
    connection.send(completed('resp_2', [said('Masking around the shadow'), computerCall('call_2')]))
    const first = await turn
    const next = model.next(observe(['Keep the shadow']), signal())
    const continuation = await connection.received.next()
    connection.send(created('resp_3'))
    connection.send(completed('resp_3'))
    await next

    expect(steer).toEqual({
      type: 'response.steer',
      previous_response_id: 'resp_1',
      input: 'Correction from the user: Keep the shadow'
    })
    // Both responses were billed.
    expect(first).toMatchObject({
      narration: 'Masking around the shadow',
      done: false,
      usage: { inputTokens: 4_000, cachedInputTokens: 3_000, outputTokens: 240 }
    })
    expect(continuation.previous_response_id).toBe('resp_2')
    expect(correctionsIn(continuation.input)).toEqual([])
    expect(model.steering).toEqual({ available: true, applied: 1, indeterminate: 0 })
  })

  test('a steer accepted while its response needs tool output rides the continuation, and is not replayed', async () => {
    const server = scriptedSocketServer()
    const { model } = socketModel(server.url)

    const { turn, connection } = await steerFirstResponse(model, server)
    connection.send(accepted('steer_1', 'resp_1'))
    connection.send(completed('resp_1', [said('Opening the Adjustments panel'), computerCall('call_1')]))
    connection.send(pending('steer_1', 'resp_1', 'call_1'))
    expect(await turn).toMatchObject({ done: false })
    const next = model.next(observe(['Keep the shadow']), signal())
    const continuation = await connection.received.next()
    connection.send(created('resp_2'))
    connection.send(completed('resp_2'))
    await next

    expect(continuation.previous_response_id).toBe('resp_1')
    expect(continuation.input).toHaveLength(1)
    expect(continuation.input[0]).toMatchObject({ type: 'computer_call_output', call_id: 'call_1' })
    expect(model.steering.applied).toBe(1)
  })

  test.each([
    'response_already_completed',
    'response_not_active',
    'response_not_found',
    'successor_creation_failed',
    'too_many_pending_steers',
    'invalid_input'
  ])('a steer refused with %s is replayed with the next call, once', async (code) => {
    const server = scriptedSocketServer()
    const { model } = socketModel(server.url)

    const { turn, connection } = await steerFirstResponse(model, server)
    connection.send(steerFailed('resp_1', code))
    connection.send(completed('resp_1', [said('Opening the Adjustments panel'), computerCall('call_1')]))
    await turn
    const next = model.next(observe(['Keep the shadow']), signal())
    const continuation = await connection.received.next()
    connection.send(created('resp_2'))
    connection.send(completed('resp_2'))
    await next

    expect(correctionsIn(continuation.input)).toEqual(['Correction from the user: Keep the shadow'])
    expect(model.steering).toEqual({ available: true, applied: 0, indeterminate: 0 })
  })

  test('steering_not_supported replays the steer and turns native steering off for the run', async () => {
    const server = scriptedSocketServer()
    const { model } = socketModel(server.url)

    const { turn, connection } = await steerFirstResponse(model, server)
    connection.send(steerFailed('resp_1', 'steering_not_supported'))
    connection.send(completed('resp_1', [said('Opening the Adjustments panel'), computerCall('call_1')]))
    await turn
    const next = model.next(observe(['Keep the shadow']), signal())
    const continuation = await connection.received.next()
    connection.send(created('resp_2'))

    expect(correctionsIn(continuation.input)).toEqual(['Correction from the user: Keep the shadow'])
    expect(model.steering.available).toBe(false)
    expect(model.steer('Leave the label')).toBe(false)
    connection.send(completed('resp_2'))
    await next
  })

  test('a steer nothing answered before its response completed is replayed', async () => {
    const server = scriptedSocketServer()
    const { model } = socketModel(server.url)

    const { turn, connection } = await steerFirstResponse(model, server)
    connection.send(completed('resp_1', [said('Opening the Adjustments panel'), computerCall('call_1')]))
    await turn
    const next = model.next(observe(['Keep the shadow']), signal())
    const continuation = await connection.received.next()
    connection.send(created('resp_2'))
    connection.send(completed('resp_2'))
    await next

    expect(correctionsIn(continuation.input)).toEqual(['Correction from the user: Keep the shadow'])
  })

  test('a finished response with an accepted steer waits for the successor that carries it', async () => {
    const server = scriptedSocketServer()
    const { model } = socketModel(server.url)

    const { turn, connection } = await steerFirstResponse(model, server)
    let settled = false
    void turn.then(() => (settled = true))
    connection.send(accepted('steer_1', 'resp_1'))
    connection.send(completed('resp_1', [said('The highlights are warmer.')]))
    await Bun.sleep(30)
    expect(settled).toBe(false)
    connection.send(created('resp_2'))
    connection.send(completed('resp_2', [computerCall('call_2')]))
    const first = await turn
    const next = model.next(observe(['Keep the shadow']), signal())
    const continuation = await connection.received.next()
    connection.send(created('resp_3'))
    connection.send(completed('resp_3'))
    await next

    // The successor acted without a word, so the narration comes from the response it continued.
    expect(first).toMatchObject({ narration: 'The highlights are warmer.', done: false })
    expect(continuation.previous_response_id).toBe('resp_2')
    expect(correctionsIn(continuation.input)).toEqual([])
    expect(model.steering.applied).toBe(1)
  })

  test('a dropped connection replays the steer the server held, and sends the step again over HTTP', async () => {
    const server = scriptedSocketServer()
    const { model, http } = socketModel(server.url, {}, [{ id: 'resp_2', output: [], usage: USAGE }])

    const { turn, connection } = await steerFirstResponse(model, server)
    connection.send(accepted('steer_1', 'resp_1'))
    connection.send(completed('resp_1', [said('Opening the Adjustments panel'), computerCall('call_1')]))
    await turn
    const next = model.next(observe(['Keep the shadow']), signal())
    const overSocket = await connection.received.next()
    connection.close()

    expect(await next).toMatchObject({ done: true })
    // The server held the steer for this continuation, so the socket did not repeat it.
    expect(correctionsIn(overSocket.input)).toEqual([])
    expect(http.sent).toHaveLength(1)
    const resent = http.sent[0]!.body
    expect(resent.previous_response_id).toBe('resp_1')
    expect(resent.input[0]).toMatchObject({ type: 'computer_call_output', call_id: 'call_1' })
    expect(correctionsIn(resent.input)).toEqual(['Correction from the user: Keep the shadow'])
    expect(model.steering).toEqual({ available: false, applied: 0, indeterminate: 1 })
    expect(model.steer('Leave the label')).toBe(false)
  })

  test('bills the responses that ended before the connection failed', async () => {
    const server = scriptedSocketServer()
    const { model, http } = socketModel(server.url, {}, [{ id: 'resp_http', output: [], usage: USAGE }])

    const turn = model.next(observe(), signal())
    const connection = await server.connections.next()
    await connection.received.next()
    connection.send(created('resp_1'))
    connection.send(steeredAway('resp_1'))
    connection.close()

    // The steered response and the one that replaced it were both billed.
    expect(await turn).toMatchObject({ usage: { inputTokens: 4_000, cachedInputTokens: 3_000, outputTokens: 240 } })
    expect(http.sent).toHaveLength(1)
  })

  test('a correction a call already carried is not steered again', async () => {
    const server = scriptedSocketServer()
    const { model } = socketModel(server.url)

    const turn = model.next(observe(['Keep the shadow']), signal())
    const connection = await server.connections.next()
    await connection.received.next()
    connection.send(created('resp_1'))
    await until(() => model.steerable)

    expect(model.steer('Keep the shadow')).toBe(false)
    expect(model.steer('Leave the label')).toBe(true)
    connection.send(completed('resp_1'))
    await turn
  })

  test('a successor that never comes abandons the socket and sends the step again over HTTP', async () => {
    const server = scriptedSocketServer()
    const { model, http } = socketModel(server.url, { successorTimeoutMs: 30 }, [
      { id: 'resp_http', output: [said('Opening the Adjustments panel'), computerCall('call_1')], usage: USAGE }
    ])

    const { turn, connection } = await steerFirstResponse(model, server)
    connection.send(accepted('steer_1', 'resp_1'))
    connection.send(completed('resp_1', [said('The highlights are warmer.')]))

    expect(await turn).toMatchObject({ narration: 'Opening the Adjustments panel', done: false })
    await connection.closed
    expect(http.sent[0]!.body.previous_response_id).toBeUndefined()
    expect(model.steering).toEqual({ available: false, applied: 0, indeterminate: 1 })
  })

  test('a response nobody asked for abandons the socket, and the next step goes over HTTP', async () => {
    const server = scriptedSocketServer()
    const { model, http } = socketModel(server.url, {}, [{ id: 'resp_2', output: [], usage: USAGE }])

    const turn = model.next(observe(), signal())
    const connection = await server.connections.next()
    await connection.received.next()
    connection.send(created('resp_1'))
    connection.send(completed('resp_1', [said('Opening the Adjustments panel'), computerCall('call_1')]))
    await turn
    connection.send(created('resp_unrequested'))
    await connection.closed
    await model.next(observe(), signal())

    expect(http.sent).toHaveLength(1)
    expect(http.sent[0]!.body.previous_response_id).toBe('resp_1')
  })

  test('stays on HTTP when the socket cannot open', async () => {
    const closed = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: () => new Response('gone') })
    const url = `ws://127.0.0.1:${closed.port}/v1/responses`
    await closed.stop(true)
    const { model, http } = socketModel(url, {}, [{ id: 'resp_1', output: [], usage: USAGE }])

    expect(await model.next(observe(), signal())).toMatchObject({ done: true })
    expect(http.sent).toHaveLength(1)
    expect(model.steer('Keep the shadow')).toBe(false)
    expect(model.steering.available).toBe(false)
  })

  test('an error event refusing the step fails it with its status and code, never its message', async () => {
    const server = scriptedSocketServer()
    const { model } = socketModel(server.url)

    const turn = model.next(observe(), signal())
    const connection = await server.connections.next()
    await connection.received.next()
    connection.send({
      type: 'error',
      status: 400,
      stream_id: 'layerhand',
      error: { type: 'invalid_request_error', code: 'invalid_value', message: `Refused for ${KEY}` }
    })
    const failure = await turn.catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(ResponsesApiError)
    expect(failure).toMatchObject({ status: 400, code: 'invalid_value' })
    expect(String((failure as Error).message)).not.toContain(KEY)
  })

  test.each([
    ['a rate limit', [rateLimitedEvent]],
    ['a failed response', [created('resp_failed'), failedResponse('resp_failed')]]
  ])('a step that meets %s is sent again on the same socket, which stays open for steering', async (_, failure) => {
    const server = scriptedSocketServer()
    const waits: number[] = []
    const { model, http } = socketModel(server.url, { sleep: async (ms) => void waits.push(ms) })

    const turn = model.next(observe(), signal())
    const connection = await server.connections.next()
    const first = await connection.received.next()
    for (const event of failure) connection.send(event)
    const again = await connection.received.next()
    connection.send(created('resp_1'))
    connection.send(completed('resp_1', [said('Opening the Adjustments panel'), computerCall('call_1')]))

    expect(await turn).toMatchObject({ narration: 'Opening the Adjustments panel', done: false })
    expect(again).toEqual(first)
    expect(waits).toHaveLength(1)
    expect(http.sent).toEqual([])
    expect(model.steering.available).toBe(true)
  })

  test('a steer the server held for a continuation that failed is replayed when the continuation is sent again', async () => {
    const server = scriptedSocketServer()
    const { model } = socketModel(server.url, { sleep: async () => undefined })

    const { turn, connection } = await steerFirstResponse(model, server)
    connection.send(accepted('steer_1', 'resp_1'))
    connection.send(completed('resp_1', [said('Opening the Adjustments panel'), computerCall('call_1')]))
    connection.send(pending('steer_1', 'resp_1', 'call_1'))
    await turn
    const next = model.next(observe(['Keep the shadow']), signal())
    const continuation = await connection.received.next()
    connection.send(created('resp_2'))
    connection.send(failedResponse('resp_2'))
    const again = await connection.received.next()
    connection.send(created('resp_3'))
    connection.send(completed('resp_3'))
    await next

    // The server held the steer for the first attempt, and the failed response may have spent it.
    expect(correctionsIn(continuation.input)).toEqual([])
    expect(again.previous_response_id).toBe('resp_1')
    expect(correctionsIn(again.input)).toEqual(['Correction from the user: Keep the shadow'])
  })

  test('a step with no traffic for a whole call timeout is sent again over HTTP', async () => {
    const server = scriptedSocketServer()
    const { model, http } = socketModel(server.url, { callTimeoutMs: 30 }, [
      { id: 'resp_http', output: [], usage: USAGE }
    ])

    const turn = model.next(observe(), signal())
    const connection = await server.connections.next()
    await connection.received.next()

    expect(await turn).toMatchObject({ done: true })
    await connection.closed
    expect(http.sent).toHaveLength(1)
  })

  test('a cancelled call rejects with the abort reason and closes the socket', async () => {
    const server = scriptedSocketServer()
    const { model } = socketModel(server.url)
    const aborter = new AbortController()

    const turn = model.next(observe(), aborter.signal)
    const connection = await server.connections.next()
    await connection.received.next()
    connection.send(created('resp_1'))
    aborter.abort(new Error('cancelled'))

    await expect(turn).rejects.toThrow('cancelled')
    await connection.closed
  })

  test('reports each steering event, with its ids, reason and code and nothing else', async () => {
    const server = scriptedSocketServer()
    const seen: SteeringEvent[] = []
    const { model } = socketModel(server.url, { onSteeringEvent: (event) => void seen.push(event) })

    const { turn, connection } = await steerFirstResponse(model, server)
    connection.send(accepted('steer_1', 'resp_1'))
    connection.send(steeredAway('resp_1'))
    connection.send(created('resp_2'))
    connection.send(completed('resp_2', [computerCall('call_2')]))
    await turn

    expect(seen).toEqual([
      { type: 'response.created', responseId: 'resp_1' },
      { type: 'response.steer.accepted', responseId: 'resp_1', steerId: 'steer_1' },
      { type: 'response.incomplete', responseId: 'resp_1', reason: 'steered' },
      { type: 'response.created', responseId: 'resp_2' },
      { type: 'response.completed', responseId: 'resp_2' }
    ])
  })

  test('reports a refused steer with its code, and never the provider message', async () => {
    const server = scriptedSocketServer()
    const seen: SteeringEvent[] = []
    const { model } = socketModel(server.url, { onSteeringEvent: (event) => void seen.push(event) })

    const { turn, connection } = await steerFirstResponse(model, server)
    connection.send(steerFailed('resp_1', 'too_many_pending_steers'))
    connection.send(completed('resp_1', [computerCall('call_1')]))
    await turn

    expect(seen).toContainEqual({
      type: 'response.steer.failed',
      responseId: 'resp_1',
      code: 'too_many_pending_steers'
    })
    expect(JSON.stringify(seen)).not.toContain(KEY)
  })

  test('closing the model closes its socket', async () => {
    const server = scriptedSocketServer()
    const { model } = socketModel(server.url)

    const turn = model.next(observe(), signal())
    const connection = await server.connections.next()
    await connection.received.next()
    connection.send(created('resp_1'))
    connection.send(completed('resp_1'))
    await turn
    model.close()

    await connection.closed
    expect(model.steering.available).toBe(false)
  })
})
