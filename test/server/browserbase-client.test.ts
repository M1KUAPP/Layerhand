import { describe, expect, test } from 'bun:test'

import { BrowserbaseClient, BrowserbaseError } from '../../src/server/browserbase-client'

interface RecordedRequest {
  url: string
  init: RequestInit
}

function jsonResponse(value: unknown, status = 200): Response {
  return Response.json(value, { status })
}

function recordingFetch(responses: Response[]) {
  const requests: RecordedRequest[] = []
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    requests.push({ url: String(input), init })
    const response = responses.shift()
    if (!response) throw new Error('Unexpected request')
    return response
  }
  return { fetch, requests }
}

describe('BrowserbaseClient', () => {
  test('creates a twenty-minute session without requiring a project id', async () => {
    const apiKey = 'bb-secret-value'
    const transport = recordingFetch([
      jsonResponse(
        {
          id: 'session-1',
          projectId: 'project-1',
          connectUrl: 'wss://connect.example/secret-token'
        },
        201
      )
    ])
    const client = new BrowserbaseClient(apiKey, transport.fetch)

    const session = await client.createSession()

    expect(session).toEqual({
      id: 'session-1',
      projectId: 'project-1',
      connectUrl: 'wss://connect.example/secret-token'
    })
    expect(transport.requests).toHaveLength(1)
    const request = transport.requests[0]!
    expect(request.url).toBe('https://api.browserbase.com/v1/sessions')
    expect(request.init.method).toBe('POST')
    expect(new Headers(request.init.headers).get('x-bb-api-key')).toBe(apiKey)
    expect(new Headers(request.init.headers).get('content-type')).toBe('application/json')
    expect(JSON.parse(String(request.init.body))).toEqual({
      timeout: 1200,
      browserSettings: { recordSession: false, logSession: false }
    })
  })

  test('returns only the public live-view URL from the debug endpoint', async () => {
    const transport = recordingFetch([
      jsonResponse({
        debuggerFullscreenUrl: 'https://live.browserbase.example/session-1',
        debuggerUrl: 'https://debug.browserbase.example/session-1',
        pages: [],
        wsUrl: 'wss://debug.browserbase.example/private'
      })
    ])
    const client = new BrowserbaseClient('bb-key', transport.fetch)

    const urls = await client.getLiveView('session-1')

    expect(urls).toEqual({ liveViewUrl: 'https://live.browserbase.example/session-1' })
    expect(Object.keys(urls)).toEqual(['liveViewUrl'])
    expect(transport.requests[0]!.url).toBe('https://api.browserbase.com/v1/sessions/session-1/debug')
    expect(transport.requests[0]!.init.method).toBe('GET')
  })

  test('requests session release explicitly', async () => {
    const transport = recordingFetch([jsonResponse({ id: 'session-1', status: 'COMPLETED' })])
    const client = new BrowserbaseClient('bb-key', transport.fetch)

    await client.releaseSession('session-1')

    expect(transport.requests[0]!.url).toBe('https://api.browserbase.com/v1/sessions/session-1')
    expect(transport.requests[0]!.init.method).toBe('POST')
    expect(JSON.parse(String(transport.requests[0]!.init.body))).toEqual({
      status: 'REQUEST_RELEASE'
    })
  })

  test('redacts provider response bodies, keys, and connection URLs', async () => {
    const secret = 'bb-secret-value'
    const connectUrl = 'wss://connect.example/private-token'
    const transport = recordingFetch([new Response(`provider rejected ${secret} at ${connectUrl}`, { status: 401 })])
    const client = new BrowserbaseClient(secret, transport.fetch)

    let error: unknown
    try {
      await client.createSession()
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(BrowserbaseError)
    expect(String(error)).toContain('Browserbase session request failed (401)')
    expect(String(error)).not.toContain(secret)
    expect(String(error)).not.toContain(connectUrl)
  })

  test('rejects malformed success payloads without echoing them', async () => {
    const leaked = 'wss://connect.example/private-token'
    const transport = recordingFetch([jsonResponse({ id: 'session-1', connectUrl: leaked })])
    const client = new BrowserbaseClient('bb-key', transport.fetch)

    let error: unknown
    try {
      await client.createSession()
    } catch (caught) {
      error = caught
    }

    expect(String(error)).toContain('Browserbase returned an invalid response')
    expect(String(error)).not.toContain(leaked)
  })

  test('gives up on a request that never answers', async () => {
    // Answers only when the request is aborted, as a stalled connection would.
    const stalled = async (_input: string | URL | Request, init: RequestInit = {}) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
      })
    const client = new BrowserbaseClient('bb-key', stalled, undefined, 20)

    const startedAt = performance.now()
    await expect(client.releaseSession('session-1')).rejects.toThrow('Browserbase session request failed')

    expect(performance.now() - startedAt).toBeLessThan(1_000)
  })
})
