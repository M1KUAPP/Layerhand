import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser } from 'playwright-core'

import web from '../../src/web/index.html'
import { ScriptedModel } from '../../src/agent/scripted-model'
import { FakeEditorSession } from '../../src/editor/fake-editor-session'
import { artifactPublisher, managedAgentRun } from '../../src/server/agent-run'
import { createApplication } from '../../src/server/application'
import { MemoryArtifactStore } from '../../src/server/artifact-store'
import { createDatabase, databaseReady } from '../../src/server/database'
import { SqlMeterStore, usdToMicroUsd } from '../../src/server/meter-store'
import { applyMigrations } from '../../src/server/migrations'
import { pageRoutes } from '../../src/server/page-routes'
import { RunRegistry } from '../../src/server/run-registry'
import { MAX_RUN_REQUEST_BODY_BYTES, RunRoutes } from '../../src/server/run-routes'
import { SqlWaitlistStore } from '../../src/server/waitlist-store'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip

// Where MemoryArtifactStore presigns what a run stores: another origin, over
// https:, as the bucket's presigned addresses are in production.
const ARTIFACT_ORIGIN = 'https://artifacts.layerhand.invalid'

interface PageRecord {
  loaded: { alt: string; src: string }[]
  broken: { alt: string; src: string }[]
  violations: { directive: string; blocked: string }[]
}

/**
 * The launch application's page and routes, with runs that publish as agent
 * runs do: each frame of the live view as a data: URL, and the preview and
 * the PSD as presigned https: URLs.
 */
async function startApplication() {
  const database = createDatabase(':memory:')
  await applyMigrations(database)
  const fixture = (name: string) => Bun.file(new URL(`../../src/editor/fixtures/${name}`, import.meta.url)).bytes()
  const [frame, psd, preview] = await Promise.all([
    fixture('photopea-frame.png'),
    fixture('layered-output.psd'),
    fixture('document-preview.png')
  ])
  const artifacts = new MemoryArtifactStore()
  let server: ReturnType<typeof Bun.serve> | undefined

  const routes = new RunRoutes({
    registry: new RunRegistry(),
    meterStore: new SqlMeterStore(database, usdToMicroUsd(1_000)),
    artifactStore: artifacts,
    waitlistStore: new SqlWaitlistStore(database),
    sessionSecret: 'layerhand-page-security-test-secret',
    trustProxyHops: 0,
    freeRunReservationMicroUsd: usdToMicroUsd(3),
    clientAddress: (request) => server?.requestIP(request)?.address ?? '127.0.0.1',
    now: () => new Date(),
    idGenerator: () => crypto.randomUUID(),
    runFactory: (request) =>
      managedAgentRun(request, {
        session: new FakeEditorSession({
          id: 'page-security-session',
          viewport: { width: 1440, height: 900 },
          recording: {
            frames: [frame],
            psd,
            preview,
            // A finished run must return an editable layer, or it fails.
            layers: [
              { name: 'Original photograph', kind: 'raster', visible: true, masks: [], children: [] },
              { name: 'Warm highlights', kind: 'adjustment', visible: true, masks: [], children: [] }
            ]
          }
        }),
        model: new ScriptedModel({ delayMs: 400 }),
        publish: artifactPublisher(artifacts)
      }),
    stepCap: 15
  })
  const application = createApplication({ databaseReady: () => databaseReady(database), routes })
  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    maxRequestBodySize: MAX_RUN_REQUEST_BODY_BYTES,
    routes: await pageRoutes(web),
    fetch: application.fetch
  })

  return {
    origin: server.url.origin,
    artifacts,
    async close() {
      await server?.stop(true)
      await database.close()
    }
  }
}

describeBrowser('the page under its security headers, in Google Chrome', () => {
  let browser: Browser
  let application: Awaited<ReturnType<typeof startApplication>>

  beforeAll(async () => {
    application = await startApplication()
    browser = await chromium.launch({ channel: 'chrome', headless: true })
  })

  afterAll(async () => {
    try {
      await browser?.close()
    } finally {
      await application?.close()
    }
  })

  test('shows the live view and the preview, and downloads the PSD, with nothing blocked (#114)', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    try {
      await page.addInitScript(() => {
        const record = { loaded: [], broken: [], violations: [] } as PageRecord
        ;(window as unknown as { __record: PageRecord }).__record = record
        const image = (event: Event) =>
          event.target instanceof HTMLImageElement
            ? { alt: event.target.alt, src: event.target.src.slice(0, 64) }
            : undefined
        document.addEventListener('load', (event) => void (image(event) && record.loaded.push(image(event)!)), true)
        document.addEventListener('error', (event) => void (image(event) && record.broken.push(image(event)!)), true)
        document.addEventListener('securitypolicyviolation', (event) => {
          record.violations.push({ directive: event.effectiveDirective, blocked: event.blockedURI })
        })
      })
      // The bucket, answering for the files the run stored.
      await page.route(
        (url) => url.origin === ARTIFACT_ORIGIN,
        async (route) => {
          const key = decodeURI(new URL(route.request().url()).pathname.slice(1))
          const bytes = application.artifacts.bytesForTesting(key)
          if (!bytes) return route.fulfill({ status: 404 })
          const contentType = key.endsWith('.psd') ? 'image/vnd.adobe.photoshop' : 'image/png'
          await route.fulfill({ contentType, body: Buffer.from(bytes) })
        }
      )
      const withoutPolicy: string[] = []
      page.on('response', (response) => {
        const policy = response.headers()['content-security-policy'] ?? ''
        if (response.url().startsWith(application.origin) && !policy.includes("frame-ancestors 'none'")) {
          withoutPolicy.push(new URL(response.url()).pathname)
        }
      })

      await page.goto(application.origin)
      await page.getByRole('button', { name: 'Retouch a photo' }).click()
      await page.getByRole('button', { name: 'Use the sample photograph' }).click()
      await page.getByAltText('Selected source: layerhand-sample.png').waitFor()
      await page.getByRole('textbox', { name: 'Retouching instruction' }).fill('Warm the highlights')
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.getByRole('heading', { name: 'Your layered file is ready.' }).waitFor({ timeout: 20_000 })
      await page.getByAltText('Flattened preview of the retouched photograph').waitFor()

      const pendingDownload = page.waitForEvent('download')
      await page.getByRole('link', { name: 'Download layered PSD' }).click()
      const download = await pendingDownload
      const bytes = await Bun.file((await download.path())!).bytes()
      expect(new TextDecoder().decode(bytes.subarray(0, 4))).toBe('8BPS')

      // A blocked image fires error rather than load, so wait for either.
      await page.waitForFunction(() => {
        const { loaded, broken } = (window as unknown as { __record: PageRecord }).__record
        return [...loaded, ...broken].some((image) => image.alt.startsWith('Flattened'))
      })
      const record = await page.evaluate(() => (window as unknown as { __record: PageRecord }).__record)
      const loaded = (alt: string) => record.loaded.filter((image) => image.alt === alt).map((image) => image.src)
      expect(record.violations).toEqual([])
      expect(record.broken).toEqual([])
      expect(loaded('Current editor frame')[0]).toStartWith('data:image/png;base64,')
      expect(loaded('Flattened preview of the retouched photograph')[0]).toStartWith(`${ARTIFACT_ORIGIN}/preview/`)
      expect(withoutPolicy).toEqual([])
    } finally {
      await page.close()
    }
  }, 60_000)
})
