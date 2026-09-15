// The agent loop's model port on the OpenAI Responses API, for GPT-6 Astra
// (docs/TRD.md § The agent loop). It drives the editor with either mechanism
// spike A0 compares: the `computer` tool, whose actions the loop carries out,
// or a `run_code` function tool, whose code the adapter runs itself against
// the editor's browser page before the loop takes its next screenshot.
import type { Button, ComputerAction, Pt } from '../editor/session'
import type { AgentModel, ModelTurn, Observation } from './model'

export type DrivingMechanism = 'computer' | 'code'
export type ReasoningEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

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
  apiKey: string
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
}

export class ResponsesApiError extends Error {
  readonly status: number
  readonly code: string | undefined

  constructor(status: number, code?: string) {
    // Only the status and a short error code: a provider message can quote the request.
    super(`The Responses API returned HTTP ${status}${code ? ` (${code})` : ''}`)
    this.name = 'ResponsesApiError'
    this.status = status
    this.code = code
  }
}

const COMMON_PROMPT = [
  'You are retouching a photograph in Photopea, a web image editor shown in a 1440x900 browser viewport.',
  'The run is unattended: nobody is available to answer questions or review your work. Carry the task through to completion, checking the result on screen and iterating until the edit is done.',
  'Work non-destructively so the saved file stays editable. Put each edit on its own layer, prefer adjustment layers and masks, and name every layer you create in plain words that say what it does.',
  'The user may send a correction while you work. It applies from then on. Work already done stays in place unless you change it yourself.',
  'When the edit is finished, reply with a one-sentence summary and no tool call.'
]

const PROMPTS: Readonly<Record<DrivingMechanism, string>> = {
  computer: [
    ...COMMON_PROMPT,
    'Before each computer call, write one sentence under 80 characters saying what the step does.'
  ].join('\n\n'),
  code: [
    ...COMMON_PROMPT,
    "Each run_code call is one step. Operate the editor through page.mouse and page.keyboard, as a person using its interface would. Do not use Photopea's scripting interface or postMessage."
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
    case 'keypress':
      return { type: 'keypress', keys: keys(source.keys) ?? [] }
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

async function errorCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json()
    const code = isObject(body) && isObject(body.error) ? body.error.code : undefined
    return typeof code === 'string' && /^[a-z0-9_.-]{1,64}$/.test(code) ? code : undefined
  } catch {
    return undefined
  }
}

export class ResponsesModel implements AgentModel {
  readonly #options: Required<Omit<ResponsesModelOptions, 'codeRunner'>> & { codeRunner?: CodeRunner }
  #previousResponseId: string | undefined
  #pending: PendingCall | undefined
  #safetyChecksAcknowledged = 0

  constructor(options: ResponsesModelOptions) {
    if (options.mechanism === 'code' && !options.codeRunner) {
      throw new Error('The code mechanism needs a code runner')
    }
    this.#options = {
      model: 'gpt-6-astra',
      reasoningEffort: 'low',
      endpoint: 'https://api.openai.com/v1/responses',
      fetch: globalThis.fetch,
      ...options
    }
  }

  /** Safety checks the model raised and the unattended run acknowledged. */
  get safetyChecksAcknowledged(): number {
    return this.#safetyChecksAcknowledged
  }

  async next({ screenshot, corrections }: Observation, signal: AbortSignal): Promise<ModelTurn> {
    const { apiKey, endpoint, mechanism, model, reasoningEffort } = this.#options
    const response = await this.#options.fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        instructions: PROMPTS[mechanism],
        tools: TOOLS[mechanism],
        parallel_tool_calls: false,
        reasoning: { effort: reasoningEffort },
        ...(this.#previousResponseId ? { previous_response_id: this.#previousResponseId } : {}),
        input: this.#input(screenshot, corrections)
      }),
      signal
    })
    if (!response.ok) throw new ResponsesApiError(response.status, await errorCode(response))
    const payload: unknown = await response.json()
    if (!isObject(payload) || typeof payload.id !== 'string') throw new ResponsesApiError(response.status)
    if (isObject(payload.error)) {
      const code = payload.error.code
      throw new ResponsesApiError(response.status, typeof code === 'string' ? code : undefined)
    }

    let narration = ''
    let actions: ComputerAction[] = []
    let pending: PendingCall | undefined
    for (const item of Array.isArray(payload.output) ? payload.output : []) {
      if (!isObject(item)) continue
      if (item.type === 'message' && !narration && Array.isArray(item.content)) {
        const said = item.content
          .flatMap((part) => (isObject(part) && typeof part.text === 'string' ? [part.text] : []))
          .join(' ')
          .trim()
        narration = said.split('\n')[0]!.trim()
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

    this.#previousResponseId = payload.id
    this.#pending = pending
    const usage = isObject(payload.usage) ? payload.usage : {}
    const details = isObject(usage.input_tokens_details) ? usage.input_tokens_details : {}
    const count = (value: unknown) => (typeof value === 'number' ? value : 0)
    return {
      narration,
      actions,
      usage: {
        inputTokens: count(usage.input_tokens),
        cachedInputTokens: count(details.cached_tokens),
        outputTokens: count(usage.output_tokens)
      },
      done: pending === undefined
    }
  }

  #input(screenshot: Uint8Array, corrections: string[]): object[] {
    const image = { type: 'input_image', image_url: pngDataUrl(screenshot), detail: 'original' }
    const input: object[] = []
    const pending = this.#pending
    if (!this.#previousResponseId) {
      input.push(userMessage(text(this.#options.instruction)))
      input.push(userMessage(text(`You have at most ${this.#options.stepCap} steps. This is the editor now.`), image))
    } else if (pending?.kind === 'computer') {
      this.#safetyChecksAcknowledged += pending.safetyChecks.length
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
    for (const correction of corrections) input.push(userMessage(text(`Correction from the user: ${correction}`)))
    return input
  }
}
