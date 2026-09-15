import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright-core'
import sharp from 'sharp'

import web from '../../src/web/index.html'
import { runAgent } from '../../src/agent/loop'
import type { AgentModel, ModelTurn } from '../../src/agent/model'
import { FakeEditorSession } from '../../src/editor/fake-editor-session'
import { createApplication } from '../../src/server/application'
import { MemoryArtifactStore } from '../../src/server/artifact-store'
import { createDatabase, databaseReady } from '../../src/server/database'
import { SqlMeterStore, usdToMicroUsd } from '../../src/server/meter-store'
import { applyMigrations } from '../../src/server/migrations'
import { RunRegistry } from '../../src/server/run-registry'
import { MAX_RUN_REQUEST_BODY_BYTES, RunRoutes } from '../../src/server/run-routes'
import { SqlWaitlistStore } from '../../src/server/waitlist-store'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip

// FR-10: no worse than one frame every two seconds, and no more than three
// seconds behind the editor.
const MAX_FRAME_GAP_MS = 2_000
const MAX_FRAME_LAG_MS = 3_000

// Each model call takes longer than FR-10's widest gap between frames, as a
// real one often does, so one frame a step could not keep the view live.
const THINKING_MS = 3_000
const STEPS = 5
const USAGE = { inputTokens: 40_000, cachedInputTokens: 38_430, outputTokens: 750 }

/** Takes a step every THINKING_MS, then reports the edit done. */
function thinkingModel(): AgentModel {
  let calls = 0
  return {
    async next(_observation, signal): Promise<ModelTurn> {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, THINKING_MS)
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer)
            reject(signal.reason)
          },
          { once: true }
        )
      })
      calls += 1
      if (calls > STEPS) return { narration: 'Checking the result', actions: [], usage: USAGE, done: true }
      return {
        narration: `Retouching, pass ${calls}`,
        actions: [{ type: 'click', button: 'left', x: 720, y: 450 }],
        usage: USAGE,
        done: false
      }
    }
  }
}

/**
 * The launch application's routes and page, running the agent loop against
 * an editor whose every look differs from the last. The server keeps what the
 * loop publishes, and when each frame was captured.
 */
async function startApplication() {
  const database = createDatabase(':memory:')
  await applyMigrations(database)
  const looks = await Promise.all(
    Array.from({ length: 16 }, (_, i) =>
      sharp({ create: { width: 1440, height: 900, channels: 3, background: { r: i * 16, g: 128, b: 255 - i * 16 } } })
        .png()
        .toBuffer()
        .then((buffer) => new Uint8Array(buffer))
    )
  )
  const [psd, preview] = await Promise.all([
    Bun.file(new URL('../../src/editor/fixtures/layered-output.psd', import.meta.url)).bytes(),
    Bun.file(new URL('../../src/editor/fixtures/document-preview.png', import.meta.url)).bytes()
  ])
  const published = new Map<string, Uint8Array<ArrayBuffer>>()
  const capturedAt = new WeakMap<Uint8Array, number>()
  const frameCapturedAt = new Map<string, number>()
  let server: ReturnType<typeof Bun.serve> | undefined

  const registry = new RunRegistry()
  const routes = new RunRoutes({
    registry,
    meterStore: new SqlMeterStore(database, usdToMicroUsd(1_000)),
    artifactStore: new MemoryArtifactStore(),
    waitlistStore: new SqlWaitlistStore(database),
    sessionSecret: 'layerhand-live-frames-test-secret',
    trustProxyHops: 0,
    freeRunReservationMicroUsd: usdToMicroUsd(8),
    clientAddress: (request) => server?.requestIP(request)?.address ?? '127.0.0.1',
    now: () => new Date(),
    idGenerator: () => crypto.randomUUID(),
    runFactory(request) {
      const session = new FakeEditorSession({
        id: 'live-frames-session',
        viewport: { width: 1440, height: 900 },
        recording: {
          frames: [looks[0]!],
          psd,
          preview,
          layers: [{ name: 'Original photograph', kind: 'raster', visible: true, masks: [], children: [] }]
        }
      })
      let look = 0
      session.screenshot = async () => {
        const frame = looks[look++ % looks.length]!
        capturedAt.set(frame, Date.now())
        return frame
      }
      const handle = runAgent(request, {
        session,
        model: thinkingModel(),
        async publish(bytes, kind) {
          const path = `/test-artifacts/${crypto.randomUUID()}.${kind === 'psd' ? 'psd' : 'png'}`
          published.set(path, Uint8Array.from(bytes))
          const captured = capturedAt.get(bytes)
          if (kind === 'frame' && captured !== undefined) frameCapturedAt.set(path, captured)
          return new URL(path, server!.url).toString()
        }
      })
      return {
        handle,
        metrics: () => ({ cacheHitRate: null, stopReason: 'complete' }),
        releaseSecrets() {
          request.apiKey = undefined
        }
      }
    },
    stepCap: 15
  })
  const application = createApplication({ databaseReady: () => databaseReady(database), routes })

  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    maxRequestBodySize: MAX_RUN_REQUEST_BODY_BYTES,
    routes: { '/': web },
    fetch(request) {
      const path = new URL(request.url).pathname
      const bytes = published.get(path)
      if (!bytes) return application.fetch(request)
      const type = path.endsWith('.psd') ? 'image/vnd.adobe.photoshop' : 'image/png'
      return new Response(bytes, { headers: { 'content-type': type } })
    }
  })

  return {
    origin: server.url.origin,
    frameCapturedAt,
    async close() {
      await server?.stop(true)
      await database.close()
    }
  }
}

interface FrameLoad {
  src: string
  at: number
}

/** When each frame of the live view finished loading in the page, oldest first. */
function frameLoads(page: Page): Promise<FrameLoad[]> {
  return page.evaluate(() => (window as unknown as { __frameLoads: FrameLoad[] }).__frameLoads.slice())
}

describeBrowser('live view in Google Chrome', () => {
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

  test('shows frames at the rate and lag FR-10 asks for, and picks them up again after a reload', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    try {
      await page.addInitScript(() => {
        const loads: { src: string; at: number }[] = []
        ;(window as unknown as { __frameLoads: typeof loads }).__frameLoads = loads
        document.addEventListener(
          'load',
          (event) => {
            const target = event.target
            if (target instanceof HTMLImageElement && target.alt === 'Current editor frame') {
              loads.push({ src: target.src, at: Date.now() })
            }
          },
          true
        )
      })
      await page.goto(application.origin)
      await page.getByRole('button', { name: 'Retouch a photo' }).click()
      await page.getByRole('button', { name: 'Use the sample photograph' }).click()
      await page.getByAltText('Selected source: layerhand-sample.png').waitFor()
      await page.getByRole('textbox', { name: 'Retouching instruction' }).fill('Warm the highlights')
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.locator('[data-view="running"]').waitFor()

      await Bun.sleep(3 * THINKING_MS)
      const beforeReload = await frameLoads(page)
      await page.reload()
      await page.locator('[data-view="running"]').waitFor()
      expect(await page.locator('#run-step').textContent()).not.toStartWith('0 ')
      await page.getByRole('heading', { name: 'Your layered file is ready.' }).waitFor({ timeout: 30_000 })
      const afterReload = await frameLoads(page)

      for (const loads of [beforeReload, afterReload]) {
        expect(loads.length).toBeGreaterThanOrEqual(3)
        loads.slice(1).forEach((load, i) => expect(load.at - loads[i]!.at).toBeLessThanOrEqual(MAX_FRAME_GAP_MS))
        for (const load of loads) {
          const captured = application.frameCapturedAt.get(new URL(load.src).pathname)
          expect(captured).toBeDefined()
          expect(load.at - captured!).toBeLessThanOrEqual(MAX_FRAME_LAG_MS)
        }
      }
    } finally {
      await page.close()
    }
  }, 60_000)
})
