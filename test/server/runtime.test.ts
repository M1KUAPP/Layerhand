import { describe, expect, test } from 'bun:test'
import { SQL } from 'bun'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
      fakeRunIntervalMs: 1,
      writeRunLog: () => undefined
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

  test('records one line per finished run to the log and the database', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'layerhand-run-log-'))
    const databaseUrl = `sqlite://${join(directory, 'layerhand.db')}`
    const records: string[] = []
    const runtime = await createLaunchRuntime({
      env: { NODE_ENV: 'development', DATABASE_URL: databaseUrl },
      clientAddress: () => '203.0.113.20',
      fakeRunIntervalMs: 1,
      writeRunLog: (record) => records.push(record)
    })

    try {
      const response = await runtime.application.fetch(runRequest())
      const { runId } = (await response.json()) as { runId: string }
      await runtime.registry.waitForTerminal(runId)

      expect(records).toHaveLength(1)
      expect(JSON.parse(records[0]!)).toMatchObject({ runId, steps: 5, outcome: 'complete', capHit: false })
      const database = new SQL(databaseUrl)
      try {
        const rows = await database`SELECT run_id, outcome FROM run_log`
        expect(rows).toEqual([{ run_id: runId, outcome: 'complete' }])
      } finally {
        await database.close()
      }
    } finally {
      await runtime.close()
      await rm(directory, { recursive: true, force: true })
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
