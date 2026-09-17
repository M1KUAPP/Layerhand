// Contract 3's HTTP surface, redeclared so this package builds on its own.

export type RunStatus = 'queued' | 'running' | 'complete' | 'incomplete' | 'cancelled' | 'failed'

export type RunStopReason = 'complete' | 'step_cap' | 'spend_cap' | 'time_limit' | 'shutdown' | 'cancelled' | 'failed'

export interface LayerInfo {
  name: string
  kind: string
  visible: boolean
  masks: unknown[]
  children: LayerInfo[]
}

export interface RunResult {
  psdUrl: string
  previewUrl: string
  layers: LayerInfo[]
  complete: boolean
  stopReason?: RunStopReason
}

export interface RunSnapshot {
  runId: string
  status: RunStatus
  steps: number
  cap: number | null
  narration: string | null
  frameUrl: string | null
  costUsd: number
  queuePosition?: number
  corrections: string[]
  recoverableErrors: string[]
  result?: RunResult
  stopReason?: RunStopReason
  failureReason?: string
}

export interface StartedRun {
  runId: string
  runToken: string
}

/** The server's `{ code, message }` error body, kept whole so a tool can quote it. */
export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export interface LayerhandClientOptions {
  baseUrl: string
  version: string
  fetch?: typeof fetch
}

export class LayerhandClient {
  readonly #baseUrl: string
  readonly #version: string
  readonly #fetch: typeof fetch

  constructor(options: LayerhandClientOptions) {
    this.#baseUrl = options.baseUrl
    this.#version = options.version
    this.#fetch = options.fetch ?? fetch
  }

  async startRun(request: {
    image: Uint8Array
    filename: string
    instruction: string
    apiKey: string
  }): Promise<StartedRun> {
    const form = new FormData()
    form.append('image', new Blob([request.image], { type: imageContentType(request.filename) }), request.filename)
    form.append('filename', request.filename)
    form.append('instruction', request.instruction)
    form.append('apiKey', request.apiKey)
    const response = await this.#send('POST', '/api/runs', { form })
    const body = (await response.json()) as Partial<StartedRun>
    if (typeof body.runId !== 'string' || typeof body.runToken !== 'string') {
      throw new ApiError('unexpected_response', 'The server answered without a run id and token.', response.status)
    }
    return { runId: body.runId, runToken: body.runToken }
  }

  async getRun(runId: string): Promise<RunSnapshot> {
    const response = await this.#send('GET', `/api/runs/${encodeURIComponent(runId)}`)
    return (await response.json()) as RunSnapshot
  }

  async steer(runId: string, runToken: string, text: string): Promise<void> {
    await this.#send('POST', `/api/runs/${encodeURIComponent(runId)}/steer`, { json: { text }, token: runToken })
  }

  async cancel(runId: string, runToken: string): Promise<void> {
    await this.#send('POST', `/api/runs/${encodeURIComponent(runId)}/cancel`, { token: runToken })
  }

  /** Fetches a result or frame URL; a relative path resolves against the server. */
  async download(url: string): Promise<Uint8Array> {
    const response = await this.#send('GET', url)
    return new Uint8Array(await response.arrayBuffer())
  }

  async #send(
    method: string,
    path: string,
    options: { form?: FormData; json?: unknown; token?: string } = {}
  ): Promise<Response> {
    const headers: Record<string, string> = { 'x-layerhand-client': `layerhand-mcp/${this.#version}` }
    if (options.token) headers.authorization = `Bearer ${options.token}`
    let body: string | FormData | undefined
    if (options.form) {
      body = options.form
    } else if (options.json !== undefined) {
      body = JSON.stringify(options.json)
      headers['content-type'] = 'application/json'
    }
    const response = await this.#fetch(new URL(path, this.#baseUrl), { method, headers, body })
    if (!response.ok) throw await apiError(response)
    return response
  }
}

async function apiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as { code?: unknown; message?: unknown }
    if (typeof body.code === 'string' && typeof body.message === 'string') {
      return new ApiError(body.code, body.message, response.status)
    }
  } catch {
    // A refusal without the usual body still reports its status.
  }
  return new ApiError(`http_${response.status}`, `The server answered ${response.status}.`, response.status)
}

function imageContentType(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  return 'application/octet-stream'
}
