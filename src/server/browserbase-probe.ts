import { chromium } from 'playwright-core'

import { PhotopeaBridge } from '../editor/photopea-bridge'
import { PhotopeaDocumentLoader } from '../editor/photopea-document-loader'
import { PlaywrightPhotopeaTransport } from '../editor/playwright-photopea-transport'
import { BrowserbaseClient, type BrowserbaseLiveView, type BrowserbaseSession } from './browserbase-client'
import { browserbaseEditorSession } from './browserbase-editor-session'

const SAMPLE_PNG = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAKCAIAAAAy3EnLAAAAEklEQVR42mO4SSJgGNUwNDUAAH0VlvD5ZoSnAAAAAElFTkSuQmCC',
    'base64'
  )
)

export interface BrowserbaseProbeClient {
  createSession(): Promise<BrowserbaseSession>
  getLiveView(sessionId: string): Promise<BrowserbaseLiveView>
  releaseSession(sessionId: string): Promise<void>
}

export interface BrowserbaseProbeEvidence {
  sessionId: string
  liveViewUrl: string
  coldStartMs: number
}

export interface BrowserbaseProbeOptions {
  apiKey: string | undefined
  client: BrowserbaseProbeClient
  openPhotopea: (connectUrl: string) => Promise<void>
  now?: () => number
  writeLine?: (line: string) => void
}

export async function runBrowserbaseProbe({
  apiKey,
  client,
  openPhotopea,
  now = () => performance.now(),
  writeLine = console.log
}: BrowserbaseProbeOptions): Promise<BrowserbaseProbeEvidence> {
  if (!apiKey) throw new Error('BROWSERBASE_API_KEY is required')

  const startedAt = now()
  const session = await client.createSession()
  try {
    await openPhotopea(session.connectUrl)
    const { liveViewUrl } = await client.getLiveView(session.id)
    const evidence = {
      sessionId: session.id,
      liveViewUrl,
      coldStartMs: now() - startedAt
    }
    writeLine(JSON.stringify(evidence))
    return evidence
  } finally {
    await client.releaseSession(session.id)
  }
}

export function createReadOnlyLiveView(liveViewUrl: string): string {
  const url = new URL(liveViewUrl)
  if (url.protocol !== 'https:') throw new Error('Browserbase live-view URL must use HTTPS')
  const escapedUrl = liveViewUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
  return `<iframe title="Layerhand live editor view" src="${escapedUrl}" sandbox="allow-scripts allow-same-origin" style="pointer-events: none" tabindex="-1"></iframe>`
}

export async function probePhotopeaOverCdp(connectUrl: string, hostUrl: string): Promise<void> {
  const browser = await chromium.connectOverCDP(connectUrl)
  try {
    const context = browser.contexts()[0]
    if (!context) throw new Error('Browserbase did not create a browser context')
    const page = context.pages()[0] ?? (await context.newPage())
    const transport = new PlaywrightPhotopeaTransport(page, { hostUrl })
    const bridge = new PhotopeaBridge(transport)
    const loader = new PhotopeaDocumentLoader(bridge)
    await loader.open(SAMPLE_PNG, 'layerhand-probe.png')
  } finally {
    await browser.close()
  }
}

async function main(): Promise<void> {
  const apiKey = process.env.BROWSERBASE_API_KEY
  const hostUrl = process.argv[2]
  if (!hostUrl) throw new Error('Usage: bun run browserbase:probe -- https://<app>/photopea-host')
  if (!apiKey) throw new Error('BROWSERBASE_API_KEY is required')
  const client = new BrowserbaseClient(apiKey ?? '')
  let sessionId: string | undefined
  const editor = browserbaseEditorSession({
    id: crypto.randomUUID(),
    hostUrl,
    sessions: {
      async createSession() {
        const session = await client.createSession()
        sessionId = session.id
        return session
      },
      releaseSession: (id) => client.releaseSession(id)
    }
  })
  const startedAt = performance.now()
  try {
    await editor.open(SAMPLE_PNG, 'layerhand-probe.png')
    const screenshot = await editor.screenshot()
    console.log(
      JSON.stringify({
        sessionId,
        coldStartMs: Math.round(performance.now() - startedAt),
        viewport: editor.viewport,
        screenshotBytes: screenshot.byteLength
      })
    )
  } finally {
    await editor.close().catch(() => undefined)
  }
}

if (import.meta.main) {
  await main()
}
