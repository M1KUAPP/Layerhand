// The agent loop's model port on the OpenAI Responses API, for GPT-6 Astra
// (docs/TRD.md § The agent loop). It drives the editor with either mechanism
// spike A0 compares: the `computer` tool, whose actions the loop carries out,
// or a `run_code` function tool, whose code the adapter runs itself against
// the editor's browser page before the loop takes its next screenshot. Over a
// WebSocket it also steers the response in flight (docs/TRD.md § Steering). A
// call that meets a rate limit, a server error, or no answer is sent again.
import type { Button, ComputerAction, Pt } from '../editor/session'
import { ModelUnavailableError, type AgentModel, type ModelTurn, type Observation } from './model'
import { openResponsesSocket, ResponsesSocket, type SteeringEvent } from './responses-socket'
import { retryAfterMs, retryWaitMs, sleep } from './retry'
import { SteerLedger } from './steer-ledger'

export type DrivingMechanism = 'computer' | 'code'
export type ReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
/** `websocket` sends every step over one socket for the run, so a correction can steer the call in flight. */
export type ModelTransport = 'http' | 'websocket'

export interface CodeResult {
  /** What the code logged, in order. */
  logs: string[]
  /** Set when the code threw or ran out of time. */
  error?: string
}

/** Runs model-written JavaScript against the page that shows the editor. */
export interface CodeRunner {
  run(code: string, signal: AbortSignal): Promise<CodeResult>
}

export interface ResponsesModelOptions {
  /**
   * Or a function read at every call, so a run can release its key while
   * something still holds the model. A call made without a key sends nothing.
   */
  apiKey: string | (() => string | undefined)
  /** The user's instruction. Sent as its own user message, never in the system prompt. */
  instruction: string
  stepCap: number
  mechanism: DrivingMechanism
  /** Required for the `code` mechanism. */
  codeRunner?: CodeRunner
  model?: string
  /** Astra rejects `none` with HTTP 400, so the effort is always explicit. */
  reasoningEffort?: ReasoningEffort
  endpoint?: string
  fetch?: typeof fetch
  /** HTTP unless set. A socket that cannot open, or fails, leaves the run on HTTP. */
  transport?: ModelTransport
  socketEndpoint?: string
  connectTimeoutMs?: number
  /** How long a response that ended with an accepted steer waits for its successor. */
  successorTimeoutMs?: number
  /**
   * How long one attempt at a call may go unanswered before it is sent again:
   * over HTTP, from the request to the whole response; over the WebSocket,
   * without any traffic. One minute unless set.
   */
  callTimeoutMs?: number
  /** Waits before a retry, and rejects with the signal's reason once it aborts. Tests pass one that does not wait. */
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>
  /** Sees each steering and response event, for a run that records what steering did (NFR-8). */
  onSteeringEvent?: (event: SteeringEvent) => void
}

export class ResponsesApiError extends Error {
  readonly status: number
  readonly code: string | undefined
  /** How long the server asked a retry to wait, when it said. */
  readonly retryAfterMs: number | undefined

  constructor(status: number, code?: string, retryAfterMs?: number) {
    // Only the status and a short error code: a provider message can quote the request.
    super(`The Responses API returned HTTP ${status}${code ? ` (${code})` : ''}`)
    this.name = 'ResponsesApiError'
    this.status = status
    this.code = code
    this.retryAfterMs = retryAfterMs
  }

  /** A rate limit or a server error, which the same call sent again can get past. */
  get retryable(): boolean {
    return this.status === 429 || this.status >= 500
  }
}

/** An attempt that got no usable answer: the connection failed, or the call ran out of time. */
class CallUnanswered extends Error {
  constructor(timedOut: boolean) {
    // Not the network's own message, which could name the address.
    super(timedOut ? 'The Responses API did not answer in time' : 'The connection to the Responses API failed')
    this.name = 'CallUnanswered'
  }
}

const COMMON_PROMPT = [
  'You are retouching a photograph in Photopea, a web image editor shown in a 1440x900 browser viewport.',
  'The run is unattended: nobody is available to answer questions or review your work. Carry the task through to completion, checking the result on screen and iterating until the edit is done.',
  'Work non-destructively so the saved file stays editable. Put each edit on its own layer, prefer adjustment layers and masks, and name every layer you create in plain words that say what it does.',
  'The user may send a correction while you work. It applies from then on. Work already done stays in place unless you change it yourself.',
  'When the edit is finished, reply with a one-sentence summary and no tool call.',
  "Operate the editor through its interface, as a person would. Do not use Photopea's scripting interface: not its script dialog, and not postMessage."
]

const PROMPTS: Readonly<Record<DrivingMechanism, string>> = {
  computer: [
    ...COMMON_PROMPT,
    'Before each computer call, write one sentence under 80 characters saying what the step does.'
  ].join('\n\n'),
  code: [
    ...COMMON_PROMPT,
    'Each run_code call is one step. Use page.mouse and page.keyboard to operate the editor.'
  ].join('\n\n')
}

const RUN_CODE_TOOL = {
  type: 'function',
  name: 'run_code',
  description:
    'Run JavaScript in the persistent browser that shows Photopea. The code is the body of an async function with `page`, the Playwright Page for the 1440x900 viewport, in scope, so await is allowed. console.log(value) returns text to you. After the code runs you receive its logs and a screenshot of the editor.',
  parameters: {
    type: 'object',
    properties: {
      narration: { type: 'string', description: 'What this step does, in plain words, under 80 characters.' },
      code: { type: 'string', description: 'The JavaScript to run.' }
    },
    required: ['narration', 'code'],
    additionalProperties: false
  },
  strict: true
}

// Built once and never changed: any change to the tool array invalidates the prompt cache.
const TOOLS: Readonly<Record<DrivingMechanism, readonly object[]>> = {
  computer: Object.freeze([Object.freeze({ type: 'computer' })]),
  code: Object.freeze([RUN_CODE_TOOL])
}

const BUTTONS = new Set<Button>(['left', 'right', 'wheel', 'back', 'forward'])

type PendingCall =
  { kind: 'computer'; callId: string; safetyChecks: unknown[] } | { kind: 'code'; callId: string; result: CodeResult }

type Json = Record<string, unknown>

const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null
const pngDataUrl = (png: Uint8Array) => `data:image/png;base64,${Buffer.from(png).toString('base64')}`
const text = (value: string) => ({ type: 'input_text', text: value })
const userMessage = (...content: object[]) => ({ role: 'user', content })
// The same words whether a correction steers a response or waits for the next call.
const correctionText = (correction: string) => `Correction from the user: ${correction}`

function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('The model returned a malformed action')
  return value
}

function point(source: Json): Pt {
  return { x: number(source.x), y: number(source.y) }
}

function keys(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value) || value.some((key) => typeof key !== 'string')) {
    throw new Error('The model returned a malformed action')
  }
  return value as string[]
}

function withKeys<T extends object>(action: T, source: Json): T & { keys?: string[] } {
  const held = keys(source.keys)
  return held ? { ...action, keys: held } : action
}

export function toComputerAction(source: unknown): ComputerAction {
  if (!isObject(source)) throw new Error('The model returned a malformed action')
  switch (source.type) {
    case 'click': {
      const button = source.button as Button
      if (!BUTTONS.has(button)) throw new Error('The model returned a malformed action')
      return withKeys({ type: 'click', button, ...point(source) }, source)
    }
    case 'double_click':
    case 'move':
      return withKeys({ type: source.type, ...point(source) }, source)
    case 'drag': {
      if (!Array.isArray(source.path) || source.path.length === 0) {
        throw new Error('The model returned a malformed action')
      }
      return withKeys({ type: 'drag', path: source.path.map((p) => point(isObject(p) ? p : {})) }, source)
    }
    case 'scroll':
      return withKeys(
        { type: 'scroll', ...point(source), scroll_x: number(source.scroll_x), scroll_y: number(source.scroll_y) },
        source
      )
    case 'keypress': {
      const pressed = keys(source.keys)
      if (!pressed || pressed.length === 0) throw new Error('The model returned a malformed action')
      return { type: 'keypress', keys: pressed }
    }
    case 'type':
      if (typeof source.text !== 'string') throw new Error('The model returned a malformed action')
      return { type: 'type', text: source.text }
    case 'wait':
    case 'screenshot':
      return { type: source.type }
    default:
      throw new Error('The model returned an action the editor does not support')
  }
}

function describeCodeResult({ logs, error }: CodeResult): string {
  const parts = logs.length > 0 ? [`Logs:\n${logs.join('\n')}`] : ['The code logged nothing.']
  if (error) parts.push(`It failed: ${error}`)
  return parts.join('\n\n')
}

// A short machine code is safe to report; anything longer could quote the request.
function safeCode(code: unknown): string | undefined {
  return typeof code === 'string' && /^[a-z0-9_.-]{1,64}$/.test(code) ? code : undefined
}

async function errorCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json()
    return safeCode(isObject(body) && isObject(body.error) ? body.error.code : undefined)
  } catch {
    return undefined
  }
}

/** The first line of what a response said, as a step's narration. */
function narrationOf(output: unknown[]): string {
  for (const item of output) {
    if (!isObject(item) || item.type !== 'message' || !Array.isArray(item.content)) continue
    const said = item.content
      .flatMap((part) => (isObject(part) && typeof part.text === 'string' ? [part.text] : []))
      .join(' ')
      .trim()
    return said.split('\n')[0]!.trim()
  }
  return ''
}

export class ResponsesModel implements AgentModel {
  readonly #options: Required<Omit<ResponsesModelOptions, 'codeRunner' | 'onSteeringEvent'>> & {
    codeRunner?: CodeRunner
    onSteeringEvent?: (event: SteeringEvent) => void
  }
  #previousResponseId: string | undefined
  #pending: PendingCall | undefined
  #safetyChecksAcknowledged = 0
  readonly #ledger = new SteerLedger()
  #socket: ResponsesSocket | undefined
  #socketTried = false
  // Corrections are numbered in the order the loop acknowledged them: steer()
  // offers them in that order, and calls pass them in that order.
  #offered = 0
  #passed = 0
  /** The ledger entry for each correction sent as a native steer, by its number. */
  readonly #steered = new Map<number, number>()

  constructor(options: ResponsesModelOptions) {
    if (options.mechanism === 'code' && !options.codeRunner) {
      throw new Error('The code mechanism needs a code runner')
    }
    this.#options = {
      model: 'gpt-6-astra',
      reasoningEffort: 'low',
      endpoint: 'https://api.openai.com/v1/responses',
      fetch: globalThis.fetch,
      transport: 'http',
      socketEndpoint: 'wss://api.openai.com/v1/responses',
      connectTimeoutMs: 10_000,
      successorTimeoutMs: 10_000,
      // Recorded runs spent 3 to 20 seconds a step, the editor's actions included.
      callTimeoutMs: 60_000,
      sleep,
      ...options
    }
  }

  /** Safety checks the model raised and the unattended run acknowledged. */
  get safetyChecksAcknowledged(): number {
    return this.#safetyChecksAcknowledged
  }

  /** Whether a correction offered now would steer the response in flight. */
  get steerable(): boolean {
    return this.#socket?.steerable ?? false
  }

  /**
   * Whether native steering is still possible for this run, how many
   * corrections it delivered, and how many settlements the connection could
   * not decide, which were replayed.
   */
  get steering(): { available: boolean; applied: number; indeterminate: number } {
    return {
      available: (this.#socket?.usable ?? false) && this.#ledger.nativeAvailable,
      applied: this.#ledger.applied().length,
      indeterminate: this.#ledger.indeterminate
    }
  }

  steer(correction: string): boolean {
    const index = this.#offered++
    // A call already carried it, which happens when a call starts between the acknowledgement and the offer.
    if (index < this.#passed || !this.#socket) return false
    const id = this.#socket.steer(correctionText(correction))
    if (id === undefined) return false
    this.#steered.set(index, id)
    return true
  }

  /** Closes the socket, if there is one. The run has ended. */
  close(): void {
    this.#socket?.close()
  }

  async next({ screenshot, corrections }: Observation, signal: AbortSignal): Promise<ModelTurn> {
    const first = this.#passed
    this.#passed += corrections.length
    const offered = corrections.map((correction, index) => ({ correction, id: this.#steered.get(first + index) }))
    const apiKey = this.#apiKey()
    const pending = this.#pending
    if (pending?.kind === 'computer') this.#safetyChecksAcknowledged += pending.safetyChecks.length
    // A correction one attempt carried goes with every later one: an attempt that failed delivered nothing.
    let carried = offered.map(() => false)
    const input = (continuationOf: string | undefined) => {
      carried = offered.map(({ id }, index) => carried[index]! || this.#carries(id, continuationOf))
      return this.#input(
        screenshot,
        offered.flatMap(({ correction }, index) => (carried[index] ? [correction] : []))
      )
    }
    // Every response the call was billed for, in order, the answer last.
    const responses: Json[] = []

    const attempt = async (): Promise<void> => {
      const socket = this.#options.transport === 'websocket' ? await this.#connect(apiKey) : undefined
      if (socket) {
        const continuationOf = pending ? this.#previousResponseId : undefined
        const result = await socket.step(this.#body(input(continuationOf)), continuationOf, signal)
        if ('failed' in result) throw new ResponsesApiError(result.failed.status, safeCode(result.failed.code))
        responses.push(...result.responses)
        if (!('lost' in result)) return
        // The connection failed before the step ended, so the step is sent
        // again over HTTP with every correction the socket could not vouch
        // for. The editor has not acted on anything the lost responses said.
      }
      responses.push(await this.#overHttp(this.#apiKey(), input(undefined), signal))
    }
    for (let attempts = 1; ; attempts += 1) {
      try {
        await attempt()
        break
      } catch (error) {
        await this.#beforeRetry(error, attempts, signal)
      }
    }
    return this.#turn(responses, signal)
  }

  /** Read by every call, and again before each request over HTTP, so a key the run has released is sent nowhere. */
  #apiKey(): string {
    const apiKey = typeof this.#options.apiKey === 'function' ? this.#options.apiKey() : this.#options.apiKey
    if (!apiKey) throw new Error('The run has no API key')
    return apiKey
  }

  /**
   * Waits before the next attempt at a call. Rethrows a failure that sending
   * the call again cannot get past, and gives up once the retries have run out
   * or the server asks for a longer wait than any retry makes.
   */
  async #beforeRetry(error: unknown, attempts: number, signal: AbortSignal): Promise<void> {
    if (signal.aborted) throw signal.reason
    if (!(error instanceof CallUnanswered) && !(error instanceof ResponsesApiError && error.retryable)) throw error
    const asked = error instanceof ResponsesApiError ? error.retryAfterMs : undefined
    const wait = retryWaitMs(attempts - 1, asked, Math.random())
    if (wait === undefined) {
      const tries = `${attempts} ${attempts === 1 ? 'attempt' : 'attempts'}`
      throw new ModelUnavailableError(`Gave up on the model after ${tries}: ${error.message}`, { cause: error })
    }
    await this.#options.sleep(wait, signal)
  }

  /**
   * Whether this call carries a correction as a user message. The ledger
   * decides: never one native steering applied, nor one the server holds for
   * the response this call continues, and always one settled for replay. One
   * nothing has settled goes in, because twice is harmless and never is not.
   */
  #carries(id: number | undefined, continuationOf: string | undefined): boolean {
    if (id === undefined || this.#ledger.takeReplay(id)) return true
    const { state, parentResponseId } = this.#ledger.entry(id)
    if (state === 'applied') return false
    return !(parentResponseId === continuationOf && (state === 'accepted' || state === 'pending'))
  }

  async #connect(apiKey: string): Promise<ResponsesSocket | undefined> {
    if (!this.#socketTried) {
      this.#socketTried = true
      try {
        const socket = await openResponsesSocket(this.#options.socketEndpoint, apiKey, this.#options.connectTimeoutMs)
        this.#socket = new ResponsesSocket(socket, this.#ledger, {
          successorTimeoutMs: this.#options.successorTimeoutMs,
          // A step answers with traffic as it goes, so silence for a whole call timeout is no answer.
          stepIdleTimeoutMs: this.#options.callTimeoutMs,
          ...(this.#options.onSteeringEvent ? { onEvent: this.#options.onSteeringEvent } : {})
        })
      } catch {
        // The run carries on over HTTP, with corrections at the step boundary.
      }
    }
    return this.#socket?.usable ? this.#socket : undefined
  }

  #body(input: object[]): Json {
    const { mechanism, model, reasoningEffort } = this.#options
    return {
      model,
      instructions: PROMPTS[mechanism],
      tools: TOOLS[mechanism],
      parallel_tool_calls: false,
      reasoning: { effort: reasoningEffort },
      ...(this.#previousResponseId ? { previous_response_id: this.#previousResponseId } : {}),
      input
    }
  }

  /** One attempt at the call over HTTP, within the call timeout. Returns the response. */
  async #overHttp(apiKey: string, input: object[], signal: AbortSignal): Promise<Json> {
    const bounded = AbortSignal.any([signal, AbortSignal.timeout(this.#options.callTimeoutMs)])
    const { response, payload } = await this.#options
      .fetch(this.#options.endpoint, {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify(this.#body(input)),
        signal: bounded
      })
      .then(async (response) => ({ response, payload: response.ok ? ((await response.json()) as unknown) : undefined }))
      .catch((error: unknown) => {
        if (signal.aborted) throw error
        throw new CallUnanswered(bounded.aborted)
      })
    if (!response.ok) {
      const asked = retryAfterMs(response.headers.get('retry-after'), Date.now())
      throw new ResponsesApiError(response.status, await errorCode(response), asked)
    }
    if (!isObject(payload) || typeof payload.id !== 'string') throw new ResponsesApiError(response.status)
    if (isObject(payload.error)) throw new ResponsesApiError(response.status, safeCode(payload.error.code))
    return payload
  }

  /**
   * Builds the step from its responses: the last one, which a steer may have
   * continued from earlier ones, gives the actions, and every one was billed.
   */
  async #turn(responses: Json[], signal: AbortSignal): Promise<ModelTurn> {
    const { mechanism } = this.#options
    const last = responses.at(-1)!
    let narration = ''
    let actions: ComputerAction[] = []
    let pending: PendingCall | undefined
    const output = Array.isArray(last.output) ? last.output : []
    for (const item of output) {
      if (!isObject(item)) continue
      if (item.type === 'message' && !narration) {
        narration = narrationOf([item])
      } else if (item.type === 'computer_call' && mechanism === 'computer' && typeof item.call_id === 'string') {
        const batch = Array.isArray(item.actions) ? item.actions : item.action ? [item.action] : []
        actions = batch.map(toComputerAction)
        const safetyChecks = Array.isArray(item.pending_safety_checks) ? item.pending_safety_checks : []
        pending = { kind: 'computer', callId: item.call_id, safetyChecks }
      } else if (item.type === 'function_call' && item.name === 'run_code' && typeof item.call_id === 'string') {
        let args: Json = {}
        try {
          const parsed: unknown = JSON.parse(String(item.arguments))
          if (isObject(parsed)) args = parsed
        } catch {
          // Reported back to the model below, so it can try again.
        }
        if (typeof args.narration === 'string' && args.narration.trim()) narration = args.narration.trim()
        const result =
          typeof args.code === 'string'
            ? await this.#options.codeRunner!.run(args.code, signal)
            : { logs: [], error: 'The call did not carry a code string.' }
        pending = { kind: 'code', callId: item.call_id, result }
      }
    }
    // A successor can act without a word, when the response it continues already said what it was doing.
    for (const earlier of responses.slice(0, -1).reverse()) {
      if (narration) break
      narration = narrationOf(Array.isArray(earlier.output) ? earlier.output : [])
    }

    this.#previousResponseId = String(last.id)
    this.#pending = pending
    const count = (value: unknown) => (typeof value === 'number' ? value : 0)
    const usage = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 }
    for (const response of responses) {
      const used = isObject(response.usage) ? response.usage : {}
      const details = isObject(used.input_tokens_details) ? used.input_tokens_details : {}
      usage.inputTokens += count(used.input_tokens)
      usage.cachedInputTokens += count(details.cached_tokens)
      usage.outputTokens += count(used.output_tokens)
    }
    return { narration, actions, usage, done: pending === undefined }
  }

  #input(screenshot: Uint8Array, corrections: string[]): object[] {
    const image = { type: 'input_image', image_url: pngDataUrl(screenshot), detail: 'original' }
    const input: object[] = []
    const pending = this.#pending
    if (!this.#previousResponseId) {
      input.push(userMessage(text(this.#options.instruction)))
      input.push(userMessage(text(`You have at most ${this.#options.stepCap} steps. This is the editor now.`), image))
    } else if (pending?.kind === 'computer') {
      input.push({
        type: 'computer_call_output',
        call_id: pending.callId,
        ...(pending.safetyChecks.length > 0 ? { acknowledged_safety_checks: pending.safetyChecks } : {}),
        output: { type: 'computer_screenshot', image_url: image.image_url, detail: 'original' }
      })
    } else if (pending?.kind === 'code') {
      input.push({
        type: 'function_call_output',
        call_id: pending.callId,
        output: [text(describeCodeResult(pending.result)), image]
      })
    } else {
      input.push(userMessage(text('This is the editor now.'), image))
    }
    for (const correction of corrections) input.push(userMessage(text(correctionText(correction))))
    return input
  }
}
