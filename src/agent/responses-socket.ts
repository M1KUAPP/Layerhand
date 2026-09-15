// One WebSocket to the Responses API for the life of a run, so a correction
// can steer the response in flight (#9, docs/TRD.md § Steering). It sends each
// step as `response.create`, reads that step's responses through to the one
// the next step continues from, and reports every steering event to the
// ledger, which alone decides whether a correction was applied or must be
// replayed. Whatever the connection can no longer vouch for is settled for
// replay: a correction applied twice is harmless, and a lost one breaks FR-20.
import type { SteerLedger } from './steer-ledger'

type Json = Record<string, unknown>

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null

/** Every step uses one named lane, so the server runs them in order and echoes the lane on each event. */
export const STREAM_ID = 'layerhand'

export type StepResult =
  /** The step's responses in order. The last is the one the next step continues from. */
  | { responses: Json[] }
  /** The response failed, with a status and the provider's error code, never its message. */
  | { failed: { status: number; code: unknown } }
  /** The connection failed first. Every unsettled steer has been settled for replay. */
  | { lost: true }

interface Step {
  /** The response whose tool output this step returns, if any. */
  continuationOf: string | undefined
  responses: Json[]
  /** The response being generated, between its `response.created` and its end. */
  current: string | undefined
  /** A response that has ended and is owed a successor that carries a steer. */
  awaiting: string | undefined
  /** Responses a successor was created for. */
  succeeded: string[]
  timer: ReturnType<typeof setTimeout> | undefined
  settle(result: StepResult): void
  abandon(reason: unknown): void
}

// Bun's WebSocket client takes handshake headers. The DOM declaration this project also loads does not know that.
const HeaderedWebSocket = WebSocket as unknown as new (
  url: string,
  options: { headers: Record<string, string> }
) => WebSocket

/** Opens the socket, authenticating with the key in the handshake. Rejects if it does not open in time. */
export function openResponsesSocket(url: string, apiKey: string, timeoutMs: number): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new HeaderedWebSocket(url, { headers: { authorization: `Bearer ${apiKey}` } })
    const fail = () => {
      clearTimeout(timer)
      socket.close()
      // Neither the address nor the handshake is repeated: either could carry a secret.
      reject(new Error('The Responses API WebSocket did not open'))
    }
    const timer = setTimeout(fail, timeoutMs)
    socket.addEventListener(
      'open',
      () => {
        clearTimeout(timer)
        socket.removeEventListener('error', fail)
        socket.removeEventListener('close', fail)
        resolve(socket)
      },
      { once: true }
    )
    socket.addEventListener('error', fail, { once: true })
    socket.addEventListener('close', fail, { once: true })
  })
}

const text = (value: unknown) => (typeof value === 'string' ? value : undefined)

// The events worth reporting: every steering event, and the ones that end a response.
const REPORTED = new Set([
  'response.created',
  'response.completed',
  'response.incomplete',
  'response.failed',
  'response.steer.accepted',
  'response.steer.pending',
  'response.steer.failed',
  'error'
])

function hasToolCall(response: Json): boolean {
  const output = Array.isArray(response.output) ? response.output : []
  return output.some((item) => isObject(item) && (item.type === 'computer_call' || item.type === 'function_call'))
}

/** What a steering event was, with nothing a provider could quote a key or a request in. */
export interface SteeringEvent {
  /** The server event's own type, such as `response.steer.accepted`. */
  type: string
  responseId?: string
  steerId?: string
  /** Why a response ended incomplete, or why a steer is still queued. */
  reason?: string
  /** A steering failure's code, or a request error's. */
  code?: string
}

export interface ResponsesSocketOptions {
  successorTimeoutMs?: number
  /** Sees each steering and response event, in arrival order (NFR-8). */
  onEvent?: (event: SteeringEvent) => void
}

export class ResponsesSocket {
  readonly #socket: WebSocket
  readonly #ledger: SteerLedger
  readonly #successorTimeoutMs: number
  readonly #onEvent: ((event: SteeringEvent) => void) | undefined
  #step: Step | undefined
  #lost = false

  constructor(
    socket: WebSocket,
    ledger: SteerLedger,
    { successorTimeoutMs = 10_000, onEvent }: ResponsesSocketOptions = {}
  ) {
    this.#socket = socket
    this.#ledger = ledger
    this.#successorTimeoutMs = successorTimeoutMs
    this.#onEvent = onEvent
    socket.addEventListener('message', (event) => this.#receive(event.data))
    socket.addEventListener('close', () => this.#lose())
    socket.addEventListener('error', () => this.#lose())
  }

  /** False once the connection has failed or been closed. */
  get usable(): boolean {
    return !this.#lost
  }

  /** Whether a steer sent now would target a response being generated. */
  get steerable(): boolean {
    return !this.#lost && this.#ledger.nativeAvailable && this.#step?.current !== undefined
  }

  /** Sends one step, with the settings of a `response.create` body. */
  step(body: Json, continuationOf: string | undefined, signal: AbortSignal): Promise<StepResult> {
    if (this.#lost) return Promise.resolve({ lost: true })
    return new Promise<StepResult>((resolve, reject) => {
      const finish = () => {
        clearTimeout(step.timer)
        signal.removeEventListener('abort', onAbort)
        if (this.#step === step) this.#step = undefined
      }
      const step: Step = {
        continuationOf,
        responses: [],
        current: undefined,
        awaiting: undefined,
        succeeded: [],
        timer: undefined,
        settle(result) {
          finish()
          resolve(result)
        },
        abandon(reason) {
          finish()
          reject(reason)
        }
      }
      // A cancelled run sends nothing more, so the connection goes with it.
      const onAbort = () => {
        step.abandon(signal.reason)
        this.#lose()
      }
      signal.addEventListener('abort', onAbort, { once: true })
      this.#step = step
      try {
        this.#socket.send(JSON.stringify({ type: 'response.create', stream_id: STREAM_ID, store: true, ...body }))
      } catch {
        this.#lose()
      }
    })
  }

  /** Steers the response being generated. Returns the ledger entry's id, or undefined if nothing was sent. */
  steer(input: string): number | undefined {
    const parent = this.#step?.current
    if (!this.steerable || parent === undefined) return undefined
    try {
      this.#socket.send(JSON.stringify({ type: 'response.steer', previous_response_id: parent, input }))
    } catch {
      return undefined
    }
    return this.#ledger.sent(input, parent)
  }

  /** Closes the connection. Nothing sent on it can be vouched for afterwards. */
  close(): void {
    this.#lose()
  }

  #receive(data: unknown): void {
    let event: unknown
    try {
      event = JSON.parse(String(data))
    } catch {
      return
    }
    if (!isObject(event)) return
    const steer = isObject(event.steer) ? event.steer : {}
    const steerId = text(steer.id)
    const parentResponseId = text(steer.previous_response_id)
    const response = isObject(event.response) ? event.response : undefined
    this.#report(event, response, steerId)
    switch (event.type) {
      case 'response.steer.accepted':
        if (steerId && parentResponseId) this.#ledger.accepted(parentResponseId, steerId)
        return
      case 'response.steer.pending':
        if (!steerId) return
        // An unknown reason gives no path to the steer being applied, so it is replayed.
        if (event.reason === 'waiting_for_required_input') this.#ledger.pending(steerId)
        else this.#ledger.failed({ steerId, code: 'unknown_pending_reason' })
        this.#successorMayBeDue()
        return
      case 'response.steer.failed': {
        const code = (isObject(event.error) && text(event.error.code)) || 'unknown'
        this.#ledger.failed({
          ...(steerId ? { steerId } : {}),
          ...(parentResponseId ? { parentResponseId } : {}),
          code
        })
        this.#successorMayBeDue()
        return
      }
      case 'response.created':
        return this.#created(response)
      case 'response.completed':
      case 'response.incomplete':
        return this.#ended(response, event.type === 'response.incomplete')
      case 'response.failed': {
        const error = response && isObject(response.error) ? response.error : {}
        this.#step?.settle({ failed: { status: 500, code: error.code } })
        return
      }
      case 'error': {
        const error = isObject(event.error) ? event.error : {}
        if (error.code === 'websocket_connection_limit_reached') return this.#lose()
        const status = typeof event.status === 'number' ? event.status : 500
        this.#step?.settle({ failed: { status, code: error.code } })
        return
      }
    }
  }

  /** Reports one event: its type and the ids, reasons and codes it carries, and nothing else. */
  #report(event: Json, response: Json | undefined, steerId: string | undefined): void {
    if (!this.#onEvent || !REPORTED.has(String(event.type))) return
    const details = response && isObject(response.incomplete_details) ? response.incomplete_details : {}
    const error = isObject(event.error) ? event.error : response && isObject(response.error) ? response.error : {}
    const responseId = text(response?.id) ?? text((isObject(event.steer) ? event.steer : {}).previous_response_id)
    const reason = text(event.reason) ?? text(details.reason)
    const code = text(error.code)
    this.#onEvent({
      type: String(event.type),
      ...(responseId ? { responseId } : {}),
      ...(steerId ? { steerId } : {}),
      ...(reason ? { reason } : {}),
      ...(code ? { code } : {})
    })
  }

  #created(response: Json | undefined): void {
    const step = this.#step
    const id = text(response?.id)
    // A response nobody here asked for, such as a successor for a steer
    // already settled for replay, would take the step's place in the lane.
    if (!step || !id || step.current !== undefined || (step.responses.length > 0 && !step.awaiting)) {
      return this.#lose()
    }
    if (step.awaiting) {
      clearTimeout(step.timer)
      step.succeeded.push(step.awaiting)
      step.awaiting = undefined
    }
    step.current = id
  }

  #ended(response: Json | undefined, incomplete: boolean): void {
    const step = this.#step
    const id = text(response?.id)
    if (!step || !response || !id || id !== step.current) return this.#lose()
    step.current = undefined
    step.responses.push(response)
    const details = isObject(response.incomplete_details) ? response.incomplete_details : {}
    const steered = incomplete && details.reason === 'steered'
    // A response that needs its tool output keeps its accepted steers for the
    // continuation. One that does not is followed by a successor carrying them.
    if (!hasToolCall(response) && (steered || this.#ledger.awaitingSuccessor(id))) {
      step.awaiting = id
      step.timer = setTimeout(() => this.#lose(), this.#successorTimeoutMs)
      return
    }
    this.#adopt(step)
  }

  /** A refused steer can leave an ended response owed nothing, and then no successor is coming. */
  #successorMayBeDue(): void {
    const step = this.#step
    if (!step?.awaiting || step.current !== undefined || this.#ledger.awaitingSuccessor(step.awaiting)) return
    clearTimeout(step.timer)
    step.awaiting = undefined
    this.#adopt(step)
  }

  /**
   * Ends the step on its last response. Only now, with every event through
   * that response read, are its steers settled: the continuation and the
   * successors apply theirs, and a steer still unanswered is replayed.
   */
  #adopt(step: Step): void {
    if (step.continuationOf) this.#ledger.continuationSent(step.continuationOf)
    for (const parent of step.succeeded) this.#ledger.successorCreated(parent)
    for (const response of step.responses) this.#ledger.parentCompleted(String(response.id))
    step.settle({ responses: step.responses })
  }

  #lose(): void {
    if (this.#lost) return
    this.#lost = true
    try {
      this.#socket.close()
    } catch {
      // Already closed.
    }
    this.#ledger.disconnected(() => 'indeterminate')
    this.#step?.settle({ lost: true })
  }
}
