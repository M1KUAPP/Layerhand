import type { RunSnapshot } from '../src/client'

export interface RecordedRequest {
  method: string
  path: string
  headers: Record<string, string>
  form?: Awaited<ReturnType<Request['formData']>>
  json?: unknown
  body?: string
}

// '8BPS' and the PNG magic, so a test can tell a real download from a mistake.
export const STUB_PSD = new Uint8Array([0x38, 0x42, 0x50, 0x53, 0x00, 0x01, 0x00, 0x00])
export const STUB_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02, 0x03])

export interface StubServer {
  url: string
  runId: string
  runToken: string
  /** What `GET /api/runs/:id` answers; a test changes it between polls. */
  snapshot: RunSnapshot
  /** When set, every API route answers with it. */
  error?: { status: number; code: string; message: string }
  requests: RecordedRequest[]
  close(): void
}

/**
 * Contract 3 over `Bun.serve` on a free port: start, snapshot, steer, cancel,
 * and a PSD and PNG to download. Every request is recorded so a test can
 * assert on its headers and body.
 */
export function startStubServer(snapshot: Partial<RunSnapshot> = {}): StubServer {
  const runId = '11111111-2222-3333-4444-555555555555'
  const stub: StubServer = {
    url: '',
    runId,
    runToken: 'dG9rZW4tZm9yLXRoZS1zdHViLXJ1bg',
    snapshot: {
      runId,
      status: 'running',
      steps: 4,
      cap: 15,
      narration: 'Adjusting the white balance.',
      frameUrl: null,
      costUsd: 0.37,
      corrections: [],
      recoverableErrors: [],
      ...snapshot
    },
    requests: [],
    close: () => server.stop()
  }

  const server = Bun.serve({
    port: 0,
    async fetch(request: Request): Promise<Response> {
      const url = new URL(request.url)
      const recorded: RecordedRequest = {
        method: request.method,
        path: url.pathname,
        headers: Object.fromEntries(request.headers)
      }
      const contentType = request.headers.get('content-type') ?? ''
      if (contentType.includes('multipart/form-data')) {
        recorded.form = await request.formData()
      } else if (contentType.includes('application/json')) {
        recorded.json = await request.json()
      } else if (request.method !== 'GET') {
        recorded.body = await request.text()
      }
      stub.requests.push(recorded)

      if (stub.error) {
        return Response.json({ code: stub.error.code, message: stub.error.message }, { status: stub.error.status })
      }
      if (request.method === 'POST' && url.pathname === '/api/runs') {
        return Response.json({ runId: stub.runId, runToken: stub.runToken }, { status: 201 })
      }
      const run = /^\/api\/runs\/[^/]+(?:\/(steer|cancel))?$/.exec(url.pathname)
      if (run && request.method === 'GET' && !run[1]) return Response.json(stub.snapshot)
      if (run && request.method === 'POST' && run[1]) {
        return Response.json({ accepted: true }, { status: 202 })
      }
      if (request.method === 'GET' && url.pathname.endsWith('.psd')) {
        return new Response(STUB_PSD, { headers: { 'content-type': 'application/octet-stream' } })
      }
      if (request.method === 'GET' && url.pathname.endsWith('.png')) {
        return new Response(STUB_PNG, { headers: { 'content-type': 'image/png' } })
      }
      return Response.json({ code: 'not_found', message: 'Nothing is served here.' }, { status: 404 })
    }
  })
  stub.url = `http://localhost:${server.port}`
  return stub
}
