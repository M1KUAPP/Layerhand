import { describe, expect, test } from 'bun:test'

import type { RunSnapshot } from '../../../src/server/run-registry'
import { runDeployedAgentAcceptance } from './deployed-run'
import { agentRunProfile } from './profiles'

const running: RunSnapshot = {
  runId: 'run-5',
  status: 'running',
  steps: 1,
  cap: 40,
  narration: 'Starting',
  frameUrl: null,
  costUsd: 0.05,
  tokensIn: 100,
  tokensOut: 10,
  lastEventId: 3,
  corrections: [],
  recoverableErrors: []
}

const complete: RunSnapshot = {
  ...running,
  status: 'complete',
  steps: 21,
  costUsd: 1.25,
  tokensIn: 300_000,
  tokensOut: 2_000,
  lastEventId: 65,
  result: {
    psdUrl: 'https://artifacts.example/result.psd',
    previewUrl: 'https://artifacts.example/preview.png',
    complete: true,
    layers: [{ name: 'Original photograph', kind: 'raster', visible: true, masks: [], children: [] }]
  }
}

describe('deployed agent acceptance run', () => {
  test('uses the public API and accepts only the matching persisted metrics', async () => {
    const requests: Request[] = []
    const snapshots = [running, complete]
    let logLookups = 0
    const result = await runDeployedAgentAcceptance(
      {
        baseUrl: 'https://layerhand.example',
        image: new Uint8Array([1, 2, 3]),
        filename: 'input.jpg',
        profile: agentRunProfile('cache-acceptance'),
        pollIntervalMs: 0,
        timeoutMs: 1_000
      },
      {
        fetch: async (input, init) => {
          const request = new Request(input, init)
          requests.push(request)
          if (request.url.endsWith('/api/runs') && request.method === 'POST') {
            return Response.json(
              { runId: 'run-5' },
              { status: 201, headers: { 'set-cookie': 'layerhand_visitor=signed; Secure; HttpOnly' } }
            )
          }
          if (request.url.endsWith('/api/runs/run-5')) return Response.json(snapshots.shift())
          if (request.url.endsWith('/result.psd')) return new Response(new Uint8Array([4, 5]))
          if (request.url.endsWith('/preview.png')) return new Response(new Uint8Array([6, 7]))
          throw new Error(`Unexpected request: ${request.method} ${request.url}`)
        },
        sleep: async () => undefined,
        readRunLog: async (runId) => {
          expect(runId).toBe('run-5')
          logLookups += 1
          return logLookups === 1 ? null : { outcome: 'complete', steps: 21, cacheHitRate: 0.87, failureCode: null }
        }
      }
    )

    const start = requests[0]!
    expect(start.url).toBe('https://layerhand.example/api/runs')
    const form = await start.formData()
    expect(form.get('filename')).toBe('input.jpg')
    expect(String(form.get('instruction')).replaceAll('\r\n', '\n')).toBe(
      agentRunProfile('cache-acceptance').instruction
    )
    expect(requests[1]?.headers.get('cookie')).toBe('layerhand_visitor=signed')
    expect(result.summary).toMatchObject({
      runId: 'run-5',
      outcome: 'complete',
      steps: 21,
      cacheHitRate: 0.87,
      browserReleaseEvidence: 'runtime-release-attempt-before-done',
      acceptance: { passed: true }
    })
    expect(result.psd).toEqual(new Uint8Array([4, 5]))
    expect(result.preview).toEqual(new Uint8Array([6, 7]))
  })

  test('returns diagnostic evidence when persisted cache metrics never appear', async () => {
    const result = await runDeployedAgentAcceptance(
      {
        baseUrl: 'https://layerhand.example',
        image: new Uint8Array([1]),
        filename: 'input.jpg',
        profile: agentRunProfile('cache-acceptance'),
        pollIntervalMs: 0,
        timeoutMs: 1_000,
        runLogAttempts: 2
      },
      {
        fetch: async (input, init) => {
          const request = new Request(input, init)
          if (request.method === 'POST') return Response.json({ runId: 'run-5' }, { status: 201 })
          if (request.url.endsWith('/result.psd')) return new Response(new Uint8Array([4]))
          if (request.url.endsWith('/preview.png')) return new Response(new Uint8Array([5]))
          return Response.json(complete)
        },
        sleep: async () => undefined,
        readRunLog: async () => null
      }
    )

    expect(result.summary).toMatchObject({
      runId: 'run-5',
      steps: 21,
      cacheHitRate: null,
      harnessError: 'Persisted metrics did not appear for run run-5',
      acceptance: { passed: false, checks: { cacheHitRate: false } }
    })
  })
})
