const DEFAULT_BASE_URL = 'https://api.browserbase.com'
const SESSION_TIMEOUT_SECONDS = 20 * 60
const REQUEST_TIMEOUT_MS = 10_000

type Fetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export interface BrowserbaseSession {
  id: string
  projectId: string
  connectUrl: string
}

export interface BrowserbaseLiveView {
  liveViewUrl: string
}

export class BrowserbaseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BrowserbaseError'
  }
}

function requiredString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export class BrowserbaseClient {
  readonly #apiKey: string
  readonly #fetch: Fetch
  readonly #baseUrl: string
  readonly #requestTimeoutMs: number

  constructor(
    apiKey: string,
    fetchImplementation: Fetch = fetch,
    baseUrl = DEFAULT_BASE_URL,
    requestTimeoutMs = REQUEST_TIMEOUT_MS
  ) {
    if (apiKey.length === 0) throw new BrowserbaseError('Browserbase API key is required')
    this.#apiKey = apiKey
    this.#fetch = fetchImplementation
    this.#baseUrl = baseUrl.replace(/\/$/, '')
    this.#requestTimeoutMs = requestTimeoutMs
  }

  async createSession(): Promise<BrowserbaseSession> {
    // Both default to on. Off, so no photo a run opens is recorded or logged
    // at Browserbase beyond the run itself (NFR-6).
    const value = await this.#request('/v1/sessions', {
      method: 'POST',
      body: JSON.stringify({
        timeout: SESSION_TIMEOUT_SECONDS,
        browserSettings: { recordSession: false, logSession: false }
      })
    })
    const record = value as Record<string, unknown>
    const id = requiredString(record.id)
    const projectId = requiredString(record.projectId)
    const connectUrl = requiredString(record.connectUrl)
    if (!id || !projectId || !connectUrl) {
      throw new BrowserbaseError('Browserbase returned an invalid response')
    }
    return { id, projectId, connectUrl }
  }

  async getLiveView(sessionId: string): Promise<BrowserbaseLiveView> {
    const value = await this.#request(`/v1/sessions/${encodeURIComponent(sessionId)}/debug`, {
      method: 'GET'
    })
    const liveViewUrl = requiredString((value as Record<string, unknown>).debuggerFullscreenUrl)
    if (!liveViewUrl) throw new BrowserbaseError('Browserbase returned an invalid response')
    return { liveViewUrl }
  }

  async releaseSession(sessionId: string): Promise<void> {
    await this.#request(`/v1/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'POST',
      body: JSON.stringify({ status: 'REQUEST_RELEASE' })
    })
  }

  async #request(path: string, init: RequestInit): Promise<unknown> {
    let response: Response
    try {
      response = await this.#fetch(`${this.#baseUrl}${path}`, {
        ...init,
        // Bounds reading the body as well, so a stalled request cannot hold a release or a shutdown.
        signal: AbortSignal.timeout(this.#requestTimeoutMs),
        headers: {
          'content-type': 'application/json',
          'x-bb-api-key': this.#apiKey
        }
      })
    } catch {
      throw new BrowserbaseError('Browserbase session request failed')
    }

    if (!response.ok) {
      throw new BrowserbaseError(`Browserbase session request failed (${response.status})`)
    }

    try {
      return await response.json()
    } catch {
      throw new BrowserbaseError('Browserbase returned an invalid response')
    }
  }
}
