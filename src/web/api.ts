import type { RunResult, RunStopReason } from '../agent/contract'
import type { LayerInfo, LayerMaskInfo } from '../editor/contract'
import type { RunSnapshot, RunStatus, RunStreamEvent } from '../server/run-registry'

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

interface EventSourceLike {
  addEventListener(type: string, listener: (event: Event) => void): void
  close(): void
}

type EventSourceFactory = (url: string) => EventSourceLike

export class RunApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status = 0) {
    super(message)
    this.name = 'RunApiError'
    this.code = code
    this.status = status
  }
}

function invalidResponse(): never {
  throw new RunApiError('invalid_response', 'The server returned an invalid response.')
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    invalidResponse()
  }
  return value as Record<string, unknown>
}

function string(value: unknown): string {
  if (typeof value !== 'string') invalidResponse()
  return value
}

function nullableString(value: unknown): string | null {
  if (value === null) return null
  return string(value)
}

function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    invalidResponse()
  }
  return value
}

function integer(value: unknown): number {
  const parsed = number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    invalidResponse()
  }
  return parsed
}

/** A place in line, which counts from 1. */
function place(value: unknown): number {
  const parsed = integer(value)
  if (parsed < 1) invalidResponse()
  return parsed
}

function eventId(value: unknown): number {
  const parsed = number(value)
  if (!Number.isSafeInteger(parsed) || parsed < -1) {
    invalidResponse()
  }
  return parsed
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') invalidResponse()
  return value
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) invalidResponse()
  return value.map(string)
}

function layerMask(value: unknown): LayerMaskInfo {
  const source = record(value)
  const kind = string(source.kind)
  if (kind !== 'pixel' && kind !== 'vector') invalidResponse()
  return { kind, enabled: boolean(source.enabled) }
}

function layer(value: unknown): LayerInfo {
  const source = record(value)
  const kind = string(source.kind)
  if (kind !== 'raster' && kind !== 'adjustment' && kind !== 'group') invalidResponse()
  if (!Array.isArray(source.masks) || !Array.isArray(source.children)) invalidResponse()
  return {
    name: string(source.name),
    kind,
    visible: boolean(source.visible),
    masks: source.masks.map(layerMask),
    children: source.children.map(layer)
  }
}

const RUN_STOP_REASONS = ['complete', 'step_cap', 'spend_cap', 'time_limit', 'shutdown', 'cancelled', 'failed']

function stopReason(value: unknown): RunStopReason {
  const parsed = string(value)
  if (!RUN_STOP_REASONS.includes(parsed)) invalidResponse()
  return parsed as RunStopReason
}

function runResult(value: unknown): RunResult {
  const source = record(value)
  if (!Array.isArray(source.layers)) invalidResponse()
  const result: RunResult = {
    psdUrl: string(source.psdUrl),
    previewUrl: string(source.previewUrl),
    layers: source.layers.map(layer),
    complete: boolean(source.complete)
  }
  if (source.stopReason !== undefined) result.stopReason = stopReason(source.stopReason)
  return result
}

function status(value: unknown): RunStatus {
  const parsed = string(value)
  if (!['queued', 'running', 'complete', 'incomplete', 'cancelled', 'failed'].includes(parsed)) {
    throw new RunApiError('invalid_response', 'The server returned an invalid response.')
  }
  return parsed as RunStatus
}

export function decodeRunSnapshot(value: unknown): RunSnapshot {
  const source = record(value)
  const parsed: RunSnapshot = {
    runId: string(source.runId),
    status: status(source.status),
    steps: integer(source.steps),
    cap: source.cap === null ? null : integer(source.cap),
    narration: nullableString(source.narration),
    frameUrl: nullableString(source.frameUrl),
    costUsd: number(source.costUsd),
    tokensIn: integer(source.tokensIn),
    tokensOut: integer(source.tokensOut),
    lastEventId: eventId(source.lastEventId),
    corrections: stringArray(source.corrections),
    recoverableErrors: stringArray(source.recoverableErrors)
  }
  if (source.queuePosition !== undefined) parsed.queuePosition = place(source.queuePosition)
  if (source.result !== undefined) parsed.result = runResult(source.result)
  if (source.failureReason !== undefined) parsed.failureReason = string(source.failureReason)
  if (source.stopReason !== undefined) parsed.stopReason = stopReason(source.stopReason)
  if (parsed.status !== 'queued' && parsed.status !== 'running' && parsed.status !== 'failed' && !parsed.result) {
    throw new RunApiError('invalid_response', 'The server returned an invalid response.')
  }
  return parsed
}

export function decodeRunEvent(value: unknown): RunStreamEvent {
  const source = record(value)
  switch (string(source.type)) {
    case 'queued':
      return { type: 'queued', position: place(source.position) }
    case 'started': {
      const viewport = record(source.viewport)
      return {
        type: 'started',
        runId: string(source.runId),
        viewport: { width: integer(viewport.width), height: integer(viewport.height) }
      }
    }
    case 'step':
      return {
        type: 'step',
        n: integer(source.n),
        cap: integer(source.cap),
        narration: string(source.narration)
      }
    case 'frame':
      return { type: 'frame', pngUrl: string(source.pngUrl) }
    case 'correction_ack':
      return { type: 'correction_ack', text: string(source.text) }
    case 'cost':
      return {
        type: 'cost',
        usd: number(source.usd),
        tokensIn: integer(source.tokensIn),
        tokensOut: integer(source.tokensOut)
      }
    case 'done':
      return { type: 'done', result: runResult(source.result) }
    case 'error':
      return { type: 'error', reason: string(source.reason), recoverable: boolean(source.recoverable) }
    default:
      throw new RunApiError('invalid_response', 'The server returned an invalid response.')
  }
}

async function responseJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new RunApiError('invalid_response', 'The server returned an invalid response.', response.status)
  }
}

async function accepted(response: Response): Promise<Record<string, unknown>> {
  const value = record(await responseJson(response))
  if (!response.ok) {
    const code = typeof value.code === 'string' ? value.code : 'request_failed'
    const message = typeof value.message === 'string' ? value.message : 'The request failed.'
    throw new RunApiError(code, message, response.status)
  }
  return value
}

export class RunApi {
  readonly #fetch: Fetch
  readonly #eventSource: EventSourceFactory

  constructor(
    fetchImplementation: Fetch = globalThis.fetch.bind(globalThis),
    eventSourceFactory: EventSourceFactory = (url) => new EventSource(url)
  ) {
    this.#fetch = fetchImplementation
    this.#eventSource = eventSourceFactory
  }

  async start(form: FormData): Promise<{ runId: string }> {
    const value = await accepted(await this.#fetch('/api/runs', { method: 'POST', body: form }))
    return { runId: string(value.runId) }
  }

  /**
   * Warms an editor for a chosen image, so the run starts with it already
   * open (#70). A server with no browser to warm answers with no id, and the
   * run starts cold.
   */
  async warmUpload(form: FormData): Promise<{ uploadId: string | null }> {
    const value = await accepted(await this.#fetch('/api/uploads', { method: 'POST', body: form }))
    return { uploadId: typeof value.uploadId === 'string' ? value.uploadId : null }
  }

  async snapshot(runId: string): Promise<RunSnapshot> {
    const response = await this.#fetch(`/api/runs/${encodeURIComponent(runId)}`)
    if (!response.ok) await accepted(response)
    return decodeRunSnapshot(await responseJson(response))
  }

  async steer(runId: string, text: string): Promise<{ accepted: true }> {
    return this.#acknowledgement(`/api/runs/${encodeURIComponent(runId)}/steer`, { text })
  }

  async cancel(runId: string): Promise<{ accepted: true }> {
    return this.#acknowledgement(`/api/runs/${encodeURIComponent(runId)}/cancel`)
  }

  async joinWaitlist(email: string): Promise<{ created: boolean; email: string }> {
    const value = await accepted(
      await this.#fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email })
      })
    )
    return { created: boolean(value.created), email: string(value.email) }
  }

  subscribe(
    runId: string,
    onEvent: (id: number, event: RunStreamEvent) => void,
    onConnectionError: () => void
  ): { close(): void } {
    const source = this.#eventSource(`/api/runs/${encodeURIComponent(runId)}/events`)
    for (const type of ['queued', 'started', 'step', 'frame', 'correction_ack', 'cost', 'done']) {
      source.addEventListener(type, (event) => this.#receiveEvent(event, onEvent, onConnectionError))
    }
    source.addEventListener('error', (event) => {
      if ('data' in event) this.#receiveEvent(event, onEvent, onConnectionError)
      else onConnectionError()
    })
    return { close: () => source.close() }
  }

  async #acknowledgement(path: string, body?: Record<string, unknown>): Promise<{ accepted: true }> {
    const response = await this.#fetch(path, {
      method: 'POST',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    })
    const value = await accepted(response)
    if (value.accepted !== true) {
      throw new RunApiError('invalid_response', 'The server returned an invalid response.', response.status)
    }
    return { accepted: true }
  }

  #receiveEvent(
    event: Event,
    onEvent: (id: number, event: RunStreamEvent) => void,
    onConnectionError: () => void
  ): void {
    try {
      const message = event as MessageEvent<string>
      const id = Number(message.lastEventId)
      if (!Number.isSafeInteger(id) || id < 0) throw new Error('invalid event id')
      onEvent(id, decodeRunEvent(JSON.parse(message.data)))
    } catch {
      onConnectionError()
    }
  }
}
