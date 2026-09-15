// What the socket does when the connection stops behaving (#9): a send that
// would be swallowed, and a step nothing arrives for. Both settle every steer
// for replay rather than leaving the run waiting for its ceiling.
import { describe, expect, test } from 'bun:test'

import { ResponsesSocket } from './responses-socket'
import { SteerLedger } from './steer-ledger'

const OPEN = 1
const CLOSING = 2

/** A socket the test drives: it records what was sent and delivers events itself. */
function stubSocket() {
  const listeners = new Map<string, ((event: { data?: string }) => void)[]>()
  return {
    readyState: OPEN as number,
    sent: [] as string[],
    closed: 0,
    send(data: string) {
      this.sent.push(data)
    },
    close() {
      this.closed += 1
    },
    addEventListener(type: string, handler: (event: { data?: string }) => void) {
      listeners.set(type, [...(listeners.get(type) ?? []), handler])
    },
    removeEventListener() {},
    emit(type: string, event: { data?: string } = {}) {
      for (const handler of listeners.get(type) ?? []) handler(event)
    },
    deliver(message: object) {
      this.emit('message', { data: JSON.stringify(message) })
    }
  }
}

const created = (id: string) => ({ type: 'response.created', response: { id, output: [] } })
const steeredAway = (id: string, usage: object) => ({
  type: 'response.incomplete',
  response: { id, incomplete_details: { reason: 'steered' }, output: [], usage }
})

function connected(options: ConstructorParameters<typeof ResponsesSocket>[2] = {}) {
  const socket = stubSocket()
  const ledger = new SteerLedger()
  const responses = new ResponsesSocket(socket as unknown as WebSocket, ledger, options)
  return { socket, ledger, responses, signal: new AbortController().signal }
}

describe('ResponsesSocket when the connection stops behaving', () => {
  test('sends nothing on a socket that is not open, and gives the connection up', async () => {
    const { socket, responses, signal } = connected()
    socket.readyState = CLOSING

    const result = await responses.step({ input: [] }, undefined, signal)

    expect(result).toEqual({ lost: true, responses: [] })
    expect(socket.sent).toEqual([])
    expect(responses.usable).toBe(false)
  })

  test('gives up a step nothing arrives for, and replays its steer', async () => {
    const { socket, ledger, responses, signal } = connected({ stepIdleTimeoutMs: 20 })

    const step = responses.step({ input: [] }, undefined, signal)
    socket.deliver(created('resp_1'))
    expect(responses.steer('Correction from the user: Keep the shadow')).toBe(0)

    expect(await step).toEqual({ lost: true, responses: [] })
    expect(ledger.takeReplays()).toEqual(['Correction from the user: Keep the shadow'])
    expect(socket.closed).toBe(1)
    expect(responses.usable).toBe(false)
  })

  test('keeps a step alive while any traffic arrives', async () => {
    const { socket, responses, signal } = connected({ stepIdleTimeoutMs: 60 })

    const step = responses.step({ input: [] }, undefined, signal)
    for (let beat = 0; beat < 3; beat += 1) {
      await Bun.sleep(40)
      socket.deliver({ type: 'response.output_text.delta', delta: 'still working' })
    }
    socket.deliver(created('resp_1'))
    socket.deliver({ type: 'response.completed', response: { id: 'resp_1', output: [] } })

    expect(await step).toMatchObject({ responses: [{ id: 'resp_1' }] })
  })

  test('hands back the responses that ended before the connection did, because they were billed', async () => {
    const { socket, responses, signal } = connected()
    const usage = { input_tokens: 2_000, output_tokens: 120 }

    const step = responses.step({ input: [] }, undefined, signal)
    socket.deliver(created('resp_1'))
    socket.deliver(steeredAway('resp_1', usage))
    socket.emit('close')

    expect(await step).toEqual({ lost: true, responses: [expect.objectContaining({ id: 'resp_1', usage })] })
  })
})
