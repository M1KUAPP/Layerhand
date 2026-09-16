// A Photopea editor in a Browserbase browser of its own, one per run (#66).
// The browser is created when the run opens its image, so a run starts
// without waiting on Browserbase and a failure to create one ends the run
// like any other error. Closing the editor releases the browser, and the loop
// closes the editor on every ending. The CDP address never leaves this module:
// it carries a signing key, so no error from connecting repeats it.
import { chromium, type Page } from 'playwright-core'

import { createPhotopeaEditorSession, type CreatePhotopeaEditorSessionOptions } from '../editor/photopea-editor-session'
import { PHOTOPEA_ASSET_ORIGIN, PHOTOPEA_ORIGIN } from '../editor/photopea-transport'
import type { EditorSession, Viewport } from '../editor/session'
import type { BrowserbaseSession } from './browserbase-client'

export interface BrowserbaseSessions {
  createSession(): Promise<BrowserbaseSession>
  releaseSession(sessionId: string): Promise<void>
}

export interface RemoteBrowser {
  page: Page
  close(): Promise<void>
}

export interface BrowserbaseEditorSessionOptions {
  id: string
  /** The Photopea host page. Browserbase's browser loads it, so it must be public. */
  hostUrl: string
  sessions: BrowserbaseSessions
  connect?: (connectUrl: string) => Promise<RemoteBrowser>
  createEditorSession?: (page: Page, options: CreatePhotopeaEditorSessionOptions) => EditorSession
}

const VIEWPORT: Viewport = { width: 1440, height: 900 }

/** A CDP connection that has not opened by then never will; the run fails and releases the session. */
export const CONNECT_TIMEOUT_MS = 30_000

export async function connectOverCdp(connectUrl: string): Promise<RemoteBrowser> {
  const browser = await chromium.connectOverCDP(connectUrl, { timeout: CONNECT_TIMEOUT_MS })
  try {
    const context = browser.contexts()[0]
    if (!context) throw new Error('Browserbase did not create a browser context')
    const page = context.pages()[0] ?? (await context.newPage())
    return { page, close: () => browser.close() }
  } catch (error) {
    await browser.close().catch(() => undefined)
    throw error
  }
}

export interface BrowserbaseEditorSession extends EditorSession {
  /**
   * Closes the browser and releases the Browserbase session at once, without
   * waiting for editor work in progress, which then fails. Nothing can be
   * exported afterwards.
   */
  abandon(): Promise<void>
}

const closedError = () => new Error('The editor session is closed')

function comparableOrigin(rawUrl: string): string | undefined {
  try {
    const url = new URL(rawUrl)
    if (url.protocol === 'ws:') url.protocol = 'http:'
    if (url.protocol === 'wss:') url.protocol = 'https:'
    return url.origin
  } catch {
    return undefined
  }
}

async function installNetworkAllowList(page: Page, hostUrl: string): Promise<void> {
  const interactiveOrigins = new Set([new URL(hostUrl).origin, PHOTOPEA_ORIGIN])
  const httpOrigins = new Set([...interactiveOrigins, PHOTOPEA_ASSET_ORIGIN])
  const allowed = (url: string, origins: ReadonlySet<string>) => {
    const origin = comparableOrigin(url)
    return origin !== undefined && origins.has(origin)
  }
  const context = page.context()
  await context.route('**/*', async (route) => {
    if (!allowed(route.request().url(), httpOrigins)) return route.abort('blockedbyclient')
    // Both `continue` and fulfilled redirects can follow later hops without
    // routing them again, so only a final response is returned to Chromium.
    // A fetch that cannot reach an allowed host aborts the request instead
    // of leaving it unfulfilled until the page's own navigation times out.
    const response = await route.fetch({ maxRedirects: 0 }).catch(() => undefined)
    if (!response) return route.abort('failed')
    const status = response.status()
    if (status >= 300 && status < 400 && status !== 304) return route.abort('blockedbyclient')
    return route.fulfill({ response }).catch(() => route.abort('failed'))
  })
  await context.routeWebSocket('**/*', (route) => {
    if (allowed(route.url(), interactiveOrigins)) {
      route.connectToServer()
      return
    }
    return route.close({ code: 1008, reason: 'Network origin is not allowed' })
  })
}

export function browserbaseEditorSession({
  id,
  hostUrl,
  sessions,
  connect = connectOverCdp,
  createEditorSession = createPhotopeaEditorSession
}: BrowserbaseEditorSessionOptions): BrowserbaseEditorSession {
  let editor: Promise<EditorSession> | undefined
  let closed: Promise<void> | undefined
  let abandoned = false
  let creating: Promise<BrowserbaseSession> | undefined
  let remote: BrowserbaseSession | undefined
  let browser: RemoteBrowser | undefined
  let closedBrowser: RemoteBrowser | undefined
  let released: Promise<void> | undefined

  // Once, whichever asks first: the editor closing, a failed start, or abandon.
  // The browser is closed first, and the session is released even if that fails.
  const release = (): Promise<void> => {
    if (!remote) return Promise.resolve()
    const sessionId = remote.id
    released ??= (async () => {
      closedBrowser = browser
      try {
        await browser?.close()
      } finally {
        await sessions.releaseSession(sessionId)
      }
    })()
    return released
  }

  const start = async (): Promise<EditorSession> => {
    creating = sessions.createSession()
    remote = await creating
    try {
      if (abandoned) throw closedError()
      try {
        browser = await connect(remote.connectUrl)
      } catch {
        throw new Error('The editor browser could not be reached')
      }
      if (abandoned) throw closedError()
      await installNetworkAllowList(browser.page, hostUrl)
      if (abandoned) throw closedError()
      return createEditorSession(browser.page, { id, hostUrl, viewport: VIEWPORT, release })
    } catch (error) {
      await release().catch(() => undefined)
      // An abandon while connecting released the session before this browser existed.
      if (browser !== closedBrowser) await browser?.close().catch(() => undefined)
      throw error
    }
  }

  const started = (): Promise<EditorSession> => {
    if (closed || abandoned) return Promise.reject(closedError())
    editor ??= start()
    return editor
  }

  return {
    async abandon() {
      abandoned = true
      // A session being created is released as soon as it exists; connecting is not waited for.
      await creating?.catch(() => undefined)
      await release()
    },
    id,
    viewport: { ...VIEWPORT },
    open: async (image, filename) => (await started()).open(image, filename),
    screenshot: async () => (await started()).screenshot(),
    act: async (actions) => (await started()).act(actions),
    layers: async () => (await started()).layers(),
    exportPsd: async () => (await started()).exportPsd(),
    exportPreview: async () => (await started()).exportPreview(),
    close() {
      // An editor that failed to start has already released its browser.
      closed ??= (async () => {
        const opened = await editor?.catch(() => undefined)
        await opened?.close()
      })()
      return closed
    }
  }
}
