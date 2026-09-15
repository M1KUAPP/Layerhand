import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core'

import type { EditorSession } from '../../src/editor/session'
import { browserbaseEditorSession } from '../../src/server/browserbase-editor-session'

const localChrome = process.env.LAYERHAND_CHROME_INTEGRATION === '1'
const describeChrome = localChrome ? describe : describe.skip

describeChrome('Browserbase network boundary in Google Chrome', () => {
  let browser: Browser
  let redirectServer: ReturnType<typeof Bun.serve>
  let blockedServer: ReturnType<typeof Bun.serve>
  let allowedHits = 0
  let blockedHits = 0
  let allowedSocketOpens = 0
  let blockedSocketOpens = 0

  beforeAll(async () => {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
      // Fulfilled loopback responses have no address-space metadata, so
      // Chrome would otherwise reject this local-only WebSocket fixture.
      args: ['--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessRespectPreflightResults']
    })
    blockedServer = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch(request, server) {
        if (request.headers.get('upgrade') === 'websocket') {
          return server.upgrade(request, { data: undefined })
            ? undefined
            : new Response('Upgrade required', { status: 426 })
        }
        blockedHits += 1
        return new Response('should not be reached')
      },
      websocket: {
        open() {
          blockedSocketOpens += 1
        },
        message() {}
      }
    })
    redirectServer = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch(request, server) {
        if (request.headers.get('upgrade') === 'websocket') {
          return server.upgrade(request, { data: undefined })
            ? undefined
            : new Response('Upgrade required', { status: 426 })
        }
        allowedHits += 1
        if (new URL(request.url).pathname !== '/redirect') return new Response('<h1>allowed</h1>')
        return new Response(null, {
          status: 302,
          headers: { location: `http://127.0.0.1:${blockedServer.port}/blocked` }
        })
      },
      websocket: {
        open() {
          allowedSocketOpens += 1
        },
        message() {}
      }
    })
  })

  afterAll(async () => {
    redirectServer?.stop(true)
    blockedServer?.stop(true)
    await browser?.close()
  })

  test('allows its host while direct and redirected requests cannot reach another origin', async () => {
    let context: BrowserContext | undefined
    let page: Page | undefined
    const hostUrl = `http://127.0.0.1:${redirectServer.port}/editor`
    const session = browserbaseEditorSession({
      id: 'redirect-boundary',
      hostUrl,
      sessions: {
        async createSession() {
          return { id: 'local', projectId: 'local', connectUrl: 'unused' }
        },
        async releaseSession() {}
      },
      async connect() {
        context = await browser.newContext()
        page = await context.newPage()
        return { page, close: () => context!.close() }
      },
      createEditorSession(page, options): EditorSession {
        return {
          id: options.id,
          viewport: options.viewport ?? { width: 1440, height: 900 },
          open: async () => void (await page.goto(options.hostUrl, { timeout: 3_000 })),
          screenshot: async () => Uint8Array.of(),
          act: async () => undefined,
          layers: async () => [],
          exportPsd: async () => Uint8Array.of(),
          exportPreview: async () => Uint8Array.of(),
          close: options.release
        }
      }
    })

    try {
      await session.open(Uint8Array.of(1), 'source.png')
      expect(allowedHits).toBe(1)

      const openSocket = (url: string) =>
        page!.evaluate(
          (address) =>
            new Promise<'opened' | 'blocked' | 'timed_out'>((resolve) => {
              const socket = new WebSocket(address)
              let settled = false
              const finish = (outcome: 'opened' | 'blocked' | 'timed_out') => {
                if (settled) return
                settled = true
                clearTimeout(timer)
                resolve(outcome)
              }
              const timer = setTimeout(() => finish('timed_out'), 2_000)
              socket.onopen = () => {
                finish('opened')
                socket.close()
              }
              socket.onerror = () => finish('blocked')
              socket.onclose = () => finish('blocked')
            }),
          url
        )

      expect(await openSocket(`ws://127.0.0.1:${redirectServer.port}/socket`)).toBe('opened')
      expect(await openSocket(`ws://127.0.0.1:${blockedServer.port}/socket`)).toBe('blocked')
      expect(allowedSocketOpens).toBe(1)
      expect(blockedSocketOpens).toBe(0)

      await expect(page!.goto(`http://127.0.0.1:${redirectServer.port}/redirect`, { timeout: 3_000 })).rejects.toThrow(
        'ERR_BLOCKED_BY_CLIENT'
      )
      await expect(page!.goto(`http://127.0.0.1:${blockedServer.port}/direct`, { timeout: 3_000 })).rejects.toThrow(
        'ERR_BLOCKED_BY_CLIENT'
      )

      expect(allowedHits).toBe(2)
      expect(blockedHits).toBe(0)
    } finally {
      await session.abandon()
    }
  }, 15_000)
})
