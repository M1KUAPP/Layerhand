import { expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTools, type ToolsConfig } from '../src/tools'
import { startStubServer, STUB_PNG, STUB_PSD, type StubServer } from './stub-server'

async function withStub<T>(
  run: (stub: StubServer, tools: ReturnType<typeof createTools>, outputDir: string) => Promise<T>,
  config: Partial<ToolsConfig> = {},
  snapshot?: Parameters<typeof startStubServer>[0]
): Promise<T> {
  const stub = startStubServer(snapshot)
  const outputDir = await mkdtemp(join(tmpdir(), 'layerhand-mcp-'))
  try {
    const tools = createTools({ apiKey: 'sk-test', baseUrl: stub.url, outputDir, ...config })
    return await run(stub, tools, outputDir)
  } finally {
    stub.close()
    await rm(outputDir, { recursive: true, force: true })
  }
}

function parse(result: { content: { text: string }[] }) {
  return JSON.parse(result.content[0]!.text) as Record<string, unknown>
}

test('start_run sends the multipart fields and client header, and returns the handle and watch URL', async () => {
  await withStub(async (stub, tools, outputDir) => {
    const imagePath = join(outputDir, 'photo.png')
    await writeFile(imagePath, STUB_PNG)

    const result = await tools.start_run({ image_path: imagePath, instruction: 'Warm it up.' })

    expect(result.isError).toBeUndefined()
    const request = stub.requests[0]!
    expect(request.method).toBe('POST')
    expect(request.path).toBe('/api/runs')
    expect(request.headers['x-layerhand-client']).toBe('layerhand-mcp/0.1.0')
    const form = request.form!
    expect(form.get('filename')).toBe('photo.png')
    expect(form.get('instruction')).toBe('Warm it up.')
    expect(form.get('apiKey')).toBe('sk-test')
    const image = form.get('image') as { arrayBuffer(): Promise<ArrayBuffer> }
    expect(image).toBeInstanceOf(Blob)
    expect(new Uint8Array(await image.arrayBuffer())).toEqual(STUB_PNG)

    const body = parse(result)
    expect(body.handle).toBe(`${stub.runId}.${stub.runToken}`)
    expect(body.run_id).toBe(stub.runId)
    expect(body.watch_url).toBe(`${stub.url}/?watch=${stub.runId}`)
    expect(body.next).toContain('wait_run')
  })
})

test('start_run without OPENAI_API_KEY is a tool error and sends nothing', async () => {
  await withStub(
    async (stub, tools) => {
      const result = await tools.start_run({ image_path: '/nonexistent/photo.png', instruction: 'Warm it up.' })
      expect(result.isError).toBe(true)
      expect(result.content[0]!.text).toContain('OPENAI_API_KEY')
      expect(stub.requests).toHaveLength(0)
    },
    { apiKey: undefined }
  )
})

test('a malformed handle is a tool error and sends nothing', async () => {
  await withStub(async (stub, tools) => {
    const result = await tools.wait_run({ handle: 'not-a-handle' })
    expect(result.isError).toBe(true)
    expect(stub.requests).toHaveLength(0)
  })
})

test('wait_run returns early when the run is terminal', async () => {
  const slept: number[] = []
  await withStub(
    async (stub, tools) => {
      const result = await tools.wait_run({ handle: `${stub.runId}.${stub.runToken}` })
      const body = parse(result)
      expect(result.isError).toBeUndefined()
      expect(body.status).toBe('complete')
      expect(body.done).toBe(true)
      expect(stub.requests).toHaveLength(1)
      expect(slept).toHaveLength(0)
    },
    { sleep: async (ms) => void slept.push(ms) },
    { status: 'complete' }
  )
})

test('wait_run writes a data: frame to disk and returns its path without frame bytes in the result', async () => {
  const frameBase64 = Buffer.from(STUB_PNG).toString('base64')
  let time = 0
  await withStub(
    async (stub, tools, outputDir) => {
      const result = await tools.wait_run({ handle: `${stub.runId}.${stub.runToken}`, wait_seconds: 1 })
      const body = parse(result)
      expect(body.done).toBe(false)
      expect(body.frame_path).toBe(join(outputDir, stub.runId, 'latest-frame.png'))
      expect(new Uint8Array(await readFile(body.frame_path as string))).toEqual(STUB_PNG)
      expect(result.content[0]!.text).not.toContain(frameBase64)
      // One poll, one sleep past the one-second wait, then the last poll returns.
      expect(stub.requests).toHaveLength(2)
    },
    {
      now: () => time,
      sleep: async (ms) => {
        time += ms
      }
    },
    { status: 'running', frameUrl: `data:image/png;base64,${frameBase64}` }
  )
})

test('steer_run and cancel_run send the bearer token', async () => {
  await withStub(async (stub, tools) => {
    const handle = `${stub.runId}.${stub.runToken}`

    const steered = await tools.steer_run({ handle, text: 'More warmth.' })
    expect(steered.isError).toBeUndefined()
    expect(parse(steered).accepted).toBe(true)
    expect(stub.requests[0]!.path).toBe(`/api/runs/${stub.runId}/steer`)
    expect(stub.requests[0]!.headers['authorization']).toBe(`Bearer ${stub.runToken}`)
    expect(stub.requests[0]!.json).toEqual({ text: 'More warmth.' })

    const cancelled = await tools.cancel_run({ handle })
    expect(cancelled.isError).toBeUndefined()
    const body = parse(cancelled)
    expect(body.accepted).toBe(true)
    expect(body.next).toContain('wait_run')
    expect(body.next).toContain('get_result')
    expect(stub.requests[1]!.path).toBe(`/api/runs/${stub.runId}/cancel`)
    expect(stub.requests[1]!.headers['authorization']).toBe(`Bearer ${stub.runToken}`)
  })
})

test('an API error becomes isError with code: message', async () => {
  await withStub(async (stub, tools) => {
    stub.error = { status: 404, code: 'run_not_found', message: 'The requested run does not exist.' }
    const result = await tools.wait_run({ handle: `${stub.runId}.${stub.runToken}` })
    expect(result.isError).toBe(true)
    expect(result.content[0]!.text).toBe('run_not_found: The requested run does not exist.')
  })
})

test('get_result on a running run is a tool error', async () => {
  await withStub(
    async (stub, tools) => {
      const result = await tools.get_result({ handle: `${stub.runId}.${stub.runToken}` })
      expect(result.isError).toBe(true)
      expect(result.content[0]!.text).toBe('The run is still going. Call wait_run first.')
      expect(stub.requests).toHaveLength(1)
    },
    {},
    { status: 'running' }
  )
})

test('get_result downloads both files, resolving a relative URL against the base', async () => {
  const layers = [{ name: 'Original', kind: 'raster', visible: true, masks: [], children: [] }]
  await withStub(
    async (stub, tools, outputDir) => {
      const result = await tools.get_result({ handle: `${stub.runId}.${stub.runToken}` })
      expect(result.isError).toBeUndefined()
      const body = parse(result)
      const psdPath = join(outputDir, stub.runId, 'layerhand.psd')
      const previewPath = join(outputDir, stub.runId, 'preview.png')
      expect(body.psd_path).toBe(psdPath)
      expect(body.preview_path).toBe(previewPath)
      expect(body.complete).toBe(true)
      expect(body.stop_reason).toBe('complete')
      expect(body.layers).toEqual(layers)
      expect(new Uint8Array(await readFile(psdPath))).toEqual(STUB_PSD)
      expect(new Uint8Array(await readFile(previewPath))).toEqual(STUB_PNG)
      const paths = stub.requests.map((request) => request.path)
      expect(paths).toContain('/files/run.psd')
      expect(paths).toContain('/files/preview.png')
    },
    {},
    {
      status: 'complete',
      result: {
        psdUrl: '/files/run.psd',
        previewUrl: '/files/preview.png',
        layers,
        complete: true,
        stopReason: 'complete'
      }
    }
  )
})
