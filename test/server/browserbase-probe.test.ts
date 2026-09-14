import { describe, expect, test } from 'bun:test'

import {
  createReadOnlyLiveView,
  runBrowserbaseProbe,
  type BrowserbaseProbeClient
} from '../../src/server/browserbase-probe'

function clientThat(records: string[]): BrowserbaseProbeClient {
  return {
    async createSession() {
      records.push('create')
      return {
        id: 'session-1',
        projectId: 'project-1',
        connectUrl: 'wss://connect.example/private-token'
      }
    },
    async getLiveView(id) {
      records.push(`live:${id}`)
      return { liveViewUrl: 'https://live.browserbase.example/session-1' }
    },
    async releaseSession(id) {
      records.push(`release:${id}`)
    }
  }
}

describe('runBrowserbaseProbe', () => {
  test('refuses to start without an API key', async () => {
    const records: string[] = []

    await expect(
      runBrowserbaseProbe({
        apiKey: '',
        client: clientThat(records),
        openPhotopea: async () => {
          records.push('open')
        }
      })
    ).rejects.toThrow('BROWSERBASE_API_KEY is required')

    expect(records).toEqual([])
  })

  test('measures readiness, exposes live view, and releases the session', async () => {
    const records: string[] = []
    const times = [100, 475]
    const lines: string[] = []

    const evidence = await runBrowserbaseProbe({
      apiKey: 'bb-secret-value',
      client: clientThat(records),
      now: () => times.shift()!,
      openPhotopea: async (connectUrl) => {
        records.push(`open:${connectUrl}`)
      },
      writeLine: (line) => lines.push(line)
    })

    expect(evidence).toEqual({
      sessionId: 'session-1',
      liveViewUrl: 'https://live.browserbase.example/session-1',
      coldStartMs: 375
    })
    expect(records).toEqual([
      'create',
      'open:wss://connect.example/private-token',
      'live:session-1',
      'release:session-1'
    ])
    expect(lines).toHaveLength(1)
    expect(JSON.parse(lines[0]!)).toEqual(evidence)
    expect(lines[0]).not.toContain('bb-secret-value')
    expect(lines[0]).not.toContain('connect.example')
  })

  test('releases the session when Photopea fails to become ready', async () => {
    const records: string[] = []

    await expect(
      runBrowserbaseProbe({
        apiKey: 'bb-key',
        client: clientThat(records),
        openPhotopea: async () => {
          records.push('open')
          throw new Error('Photopea failed')
        }
      })
    ).rejects.toThrow('Photopea failed')

    expect(records).toEqual(['create', 'open', 'release:session-1'])
  })

  test('renders an inert, unfocusable live-view iframe', () => {
    const html = createReadOnlyLiveView('https://live.browserbase.example/session-1')

    expect(html).toContain('sandbox="allow-scripts allow-same-origin"')
    expect(html).toContain('style="pointer-events: none"')
    expect(html).toContain('tabindex="-1"')
    expect(html).toContain('title="Layerhand live editor view"')
    expect(html).toContain('src="https://live.browserbase.example/session-1"')
  })

  test('rejects non-HTTPS live-view URLs', () => {
    expect(() => createReadOnlyLiveView('javascript:alert(1)')).toThrow('Browserbase live-view URL must use HTTPS')
  })
})
