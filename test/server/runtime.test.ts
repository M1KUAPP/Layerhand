import { describe, expect, test } from 'bun:test'

import { createLaunchRuntime } from '../../src/server/runtime'

const samplePath = new URL('../../src/editor/fixtures/document-preview.png', import.meta.url)

function runRequest(): Request {
  const form = new FormData()
  form.set('image', new File([Bun.file(samplePath)], 'source.png', { type: 'image/png' }), 'source.png')
  form.set('filename', 'source.png')
  form.set('instruction', 'Remove the background')
  return new Request('http://layerhand.test/api/runs', { method: 'POST', body: form })
}

describe('launch runtime', () => {
  test('composes a ready development API with the scripted run', async () => {
    const runtime = await createLaunchRuntime({
      env: { NODE_ENV: 'development' },
      clientAddress: () => '203.0.113.20',
      fakeRunIntervalMs: 1
    })

    try {
      const health = await runtime.application.fetch(new Request('http://layerhand.test/health'))
      expect(await health.json()).toEqual({ status: 'ok', database: 'ready' })

      const response = await runtime.application.fetch(runRequest())
      expect(response.status).toBe(201)
      const { runId } = (await response.json()) as { runId: string }
      expect(runId).toMatch(/^[0-9a-f-]{36}$/)

      await runtime.registry.waitForTerminal(runId)
      const snapshot = await runtime.application.fetch(new Request(`http://layerhand.test/api/runs/${runId}`))
      expect(await snapshot.json()).toMatchObject({
        runId,
        status: 'complete',
        steps: 5,
        result: { complete: true }
      })
    } finally {
      await runtime.close()
    }
  })

  test('fails closed when production configuration is absent', async () => {
    await expect(
      createLaunchRuntime({
        env: { NODE_ENV: 'production' },
        clientAddress: () => '203.0.113.20'
      })
    ).rejects.toThrow('Missing required environment variables')
  })
})
