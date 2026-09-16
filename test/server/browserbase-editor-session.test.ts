import { describe, expect, test } from 'bun:test'
import type { BrowserContext, Page, Route, WebSocketRoute } from 'playwright-core'

import type { CreatePhotopeaEditorSessionOptions } from '../../src/editor/photopea-editor-session'
import { createRecordedFakeEditorSession } from '../../src/editor/fake-editor-session'
import { PHOTOPEA_ASSET_ORIGIN, PHOTOPEA_ORIGIN } from '../../src/editor/photopea-transport'
import {
  browserbaseEditorSession,
  type BrowserbaseEditorSession,
  type BrowserbaseSessions
} from '../../src/server/browserbase-editor-session'

const CONNECT_URL = 'wss://connect.browserbase.test/?signingKey=secret-signing-key'
const HOST_URL = 'https://layerhand.test/photopea-host'
const IMAGE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47)

interface Harness {
  session: BrowserbaseEditorSession
  created: string[]
  released: string[]
  browserClosed: number
  editorOptions: CreatePhotopeaEditorSessionOptions[]
  networkInstalledBeforeEditor: boolean
  httpRoute?: (route: Route) => Promise<unknown> | unknown
  webSocketRoute?: (route: WebSocketRoute) => Promise<unknown> | unknown
}

interface Behaviour {
  connect?: boolean
  editor?: boolean
  browserClose?: boolean
  /** Editor actions hang until the browser closes, as a stuck CDP call does. */
  hangingActions?: boolean
  /** Connecting waits for this. */
  connectGate?: Promise<void>
  /** Called as connecting begins. */
  onConnect?: () => void
}

async function harness(behaviour: Behaviour = {}): Promise<Harness> {
  const recorded = await createRecordedFakeEditorSession()
  const state: Omit<Harness, 'session'> = {
    created: [],
    released: [],
    browserClosed: 0,
    editorOptions: [],
    networkInstalledBeforeEditor: false
  }
  const onBrowserClose: (() => void)[] = []
  let browserOpen = true
  const sessions: BrowserbaseSessions = {
    async createSession() {
      const id = `bb-${state.created.length + 1}`
      state.created.push(id)
      return { id, projectId: 'project', connectUrl: CONNECT_URL }
    },
    async releaseSession(id) {
      state.released.push(id)
    }
  }
  const context = {
    async route(_url: string | RegExp | ((url: URL) => boolean), handler: Harness['httpRoute']) {
      state.httpRoute = handler
    },
    async routeWebSocket(_url: string | RegExp | ((url: URL) => boolean), handler: Harness['webSocketRoute']) {
      state.webSocketRoute = handler
    }
  } as unknown as BrowserContext
  const page = { context: () => context } as Page
  const session = browserbaseEditorSession({
    id: 'run-editor',
    hostUrl: HOST_URL,
    sessions,
    async connect(connectUrl) {
      behaviour.onConnect?.()
      await behaviour.connectGate
      if (behaviour.connect) throw new Error(`Could not connect to ${connectUrl}`)
      return {
        page,
        async close() {
          state.browserClosed += 1
          browserOpen = false
          for (const fail of onBrowserClose.splice(0)) fail()
          if (behaviour.browserClose) throw new Error('The browser did not close')
        }
      }
    },
    createEditorSession(_page, options) {
      state.networkInstalledBeforeEditor = state.httpRoute !== undefined && state.webSocketRoute !== undefined
      state.editorOptions.push(options)
      if (behaviour.editor) throw new Error('Photopea host URL must use HTTP or HTTPS.')
      // The recorded editor, releasing its browser on close even when closing fails, as the Photopea session does.
      return {
        id: options.id,
        viewport: recorded.viewport,
        open: (image, filename) => recorded.open(image, filename),
        screenshot: () => recorded.screenshot(),
        // A call on a closed browser fails at once, as it does in Playwright.
        act: (actions) =>
          !behaviour.hangingActions
            ? recorded.act(actions)
            : browserOpen
              ? new Promise((_resolve, reject) => onBrowserClose.push(() => reject(new Error('Target closed'))))
              : Promise.reject(new Error('Target closed')),
        layers: () => recorded.layers(),
        exportPsd: () => recorded.exportPsd(),
        exportPreview: () => recorded.exportPreview(),
        async close() {
          try {
            await recorded.close()
          } finally {
            await options.release()
          }
        }
      }
    }
  })
  return Object.assign(state, { session })
}

async function httpOutcome(h: Harness, url: string, responseStatus = 200): Promise<'fulfilled' | 'aborted'> {
  let outcome: 'fulfilled' | 'aborted' | undefined
  let fetchOptions: { maxRedirects?: number } | undefined
  const route = {
    request: () => ({ url: () => url }),
    fetch: async (options?: { maxRedirects?: number }) => {
      fetchOptions = options
      return { status: () => responseStatus }
    },
    fulfill: async () => {
      outcome = 'fulfilled'
    },
    abort: async () => {
      outcome = 'aborted'
    }
  } as unknown as Route
  await h.httpRoute?.(route)
  if (!outcome) throw new Error('The HTTP route did not decide the request')
  if (outcome === 'fulfilled') expect(fetchOptions).toEqual({ maxRedirects: 0 })
  return outcome
}

async function webSocketOutcome(h: Harness, url: string): Promise<'connected' | 'closed'> {
  let outcome: 'connected' | 'closed' | undefined
  const route = {
    url: () => url,
    connectToServer: () => {
      outcome = 'connected'
      return {} as WebSocketRoute
    },
    close: async () => {
      outcome = 'closed'
    }
  } as unknown as WebSocketRoute
  await h.webSocketRoute?.(route)
  if (!outcome) throw new Error('The WebSocket route did not decide the connection')
  return outcome
}

describe('Browserbase editor session', () => {
  test('creates no browser until the run opens its image, then opens Photopea in one', async () => {
    const h = await harness()
    expect(h.session.viewport).toEqual({ width: 1440, height: 900 })
    expect(h.created).toEqual([])

    await h.session.open(IMAGE, 'source.png')
    await h.session.screenshot()

    expect(h.created).toEqual(['bb-1'])
    expect(h.editorOptions).toHaveLength(1)
    expect(h.editorOptions[0]).toMatchObject({
      id: 'run-editor',
      hostUrl: HOST_URL,
      viewport: { width: 1440, height: 900 }
    })
    expect(h.networkInstalledBeforeEditor).toBe(true)
  })

  test('allows HTTP traffic only to the Layerhand host and Photopea origins', async () => {
    const h = await harness()
    await h.session.open(IMAGE, 'source.png')

    const cases = [
      [`${HOST_URL}?run=one`, 'fulfilled'],
      [`${PHOTOPEA_ORIGIN}/#editor`, 'fulfilled'],
      [`${PHOTOPEA_ASSET_ORIGIN}/code/pp/current.js`, 'fulfilled'],
      ['https://www.photopea.com.evil.test/collect', 'aborted'],
      ['https://tracker.test/collect', 'aborted']
    ] as const
    for (const [url, expected] of cases) expect(await httpOutcome(h, url)).toBe(expected)
  })

  test('does not return redirects to Chrome, where later hops bypass routing', async () => {
    const h = await harness()
    await h.session.open(IMAGE, 'source.png')

    expect(await httpOutcome(h, HOST_URL, 302)).toBe('aborted')
  })

  test('allows WebSockets only on the Layerhand host and Photopea origins', async () => {
    const h = await harness()
    await h.session.open(IMAGE, 'source.png')

    const cases = [
      ['wss://layerhand.test/live', 'connected'],
      ['wss://www.photopea.com/socket', 'connected'],
      ['wss://vecpea.com/socket', 'closed'],
      ['wss://www.photopea.com.evil.test/socket', 'closed'],
      ['wss://tracker.test/socket', 'closed']
    ] as const
    for (const [url, expected] of cases) expect(await webSocketOutcome(h, url)).toBe(expected)
  })

  test('closing the editor closes the browser and releases the session, once', async () => {
    const h = await harness()
    await h.session.open(IMAGE, 'source.png')

    await h.session.close()
    await h.session.close()

    expect(h.browserClosed).toBe(1)
    expect(h.released).toEqual(['bb-1'])
    await expect(h.session.screenshot()).rejects.toThrow('The editor session is closed')
  })

  test('releases the session when its browser cannot be reached, without repeating the address', async () => {
    const h = await harness({ connect: true })

    const failure = await h.session.open(IMAGE, 'source.png').catch((error: Error) => error)
    await h.session.close()

    expect(failure).toBeInstanceOf(Error)
    expect((failure as Error).message).toBe('The editor browser could not be reached')
    expect((failure as Error).message).not.toContain('signingKey')
    expect(h.released).toEqual(['bb-1'])
  })

  test('closes the browser and releases the session when the editor cannot be created', async () => {
    const h = await harness({ editor: true })

    await expect(h.session.open(IMAGE, 'source.png')).rejects.toThrow('Photopea host URL')
    await h.session.close()

    expect(h.browserClosed).toBe(1)
    expect(h.released).toEqual(['bb-1'])
  })

  test('releases the session even when the browser fails to close', async () => {
    const h = await harness({ browserClose: true })
    await h.session.open(IMAGE, 'source.png')

    await expect(h.session.close()).rejects.toThrow('The browser did not close')

    expect(h.released).toEqual(['bb-1'])
  })

  test('a session closed before it opened never creates a browser', async () => {
    const h = await harness()

    await h.session.close()

    await expect(h.session.open(IMAGE, 'source.png')).rejects.toThrow('The editor session is closed')
    expect(h.created).toEqual([])
  })

  test('abandon releases the session at once while an editor call hangs, and only once', async () => {
    const h = await harness({ hangingActions: true })
    await h.session.open(IMAGE, 'source.png')
    const acting = h.session.act([{ type: 'wait' }])
    // Lets the call reach the editor, so it is in progress when the browser goes.
    await Bun.sleep(1)

    await h.session.abandon()

    expect(h.released).toEqual(['bb-1'])
    expect(h.browserClosed).toBe(1)
    await expect(acting).rejects.toThrow('Target closed')
    await h.session.close()
    expect(h.released).toEqual(['bb-1'])
    expect(h.browserClosed).toBe(1)
    await expect(h.session.screenshot()).rejects.toThrow('The editor session is closed')
  })

  test('an abandon while connecting releases the session and closes the browser that connects after', async () => {
    let connected: () => void = () => undefined
    let connecting = false
    const h = await harness({
      connectGate: new Promise((resolve) => {
        connected = resolve
      }),
      onConnect: () => {
        connecting = true
      }
    })
    const opening = h.session.open(IMAGE, 'source.png').catch((error: Error) => error)
    while (!connecting) await Bun.sleep(1)

    await h.session.abandon()
    expect(h.released).toEqual(['bb-1'])
    connected()

    expect(((await opening) as Error).message).toBe('The editor session is closed')
    expect(h.browserClosed).toBe(1)
    expect(h.editorOptions).toEqual([])
    expect(h.released).toEqual(['bb-1'])
  })

  test('an abandoned session creates nothing afterwards', async () => {
    const h = await harness()

    await h.session.abandon()

    await expect(h.session.open(IMAGE, 'source.png')).rejects.toThrow('The editor session is closed')
    expect(h.created).toEqual([])
    expect(h.released).toEqual([])
  })
})
