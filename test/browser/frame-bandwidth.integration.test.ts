import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright-core'

import { startFramePump } from '../../src/browser/frame-pump'
import {
  PhotopeaBridge,
  PhotopeaDocumentLoader,
  PlaywrightPhotopeaTransport,
  createPhotopeaHostHtml
} from '../../src/editor'

const live = process.env.LAYERHAND_CHROME_INTEGRATION === '1'
const describeLive = live ? describe : describe.skip

interface Phase {
  seconds: number
  captures: number
  frames: number
  missed: number
  bytesPerSecond: number
  meanFrameBytes: number
  maxCaptureMs: number
}

/** Runs the live view's frame pump against the page, and totals what it would send. */
async function pumpFor(page: Page, ms: number, activity?: () => Promise<void>): Promise<Phase> {
  let captures = 0
  let frames = 0
  let missed = 0
  let bytes = 0
  let maxCaptureMs = 0
  const startedAt = performance.now()
  const pump = startFramePump({
    async capture() {
      captures += 1
      const capturing = performance.now()
      const frame = new Uint8Array(await page.screenshot({ type: 'png' }))
      maxCaptureMs = Math.max(maxCaptureMs, performance.now() - capturing)
      return frame
    },
    async publish(frame) {
      bytes += frame.byteLength
      return `frame-${frames}`
    },
    onFrame: () => {
      frames += 1
    },
    onMissedFrame: () => {
      missed += 1
    }
  })
  if (activity) {
    while (performance.now() - startedAt < ms) await activity()
  } else {
    await Bun.sleep(ms)
  }
  await pump.stop()
  const seconds = (performance.now() - startedAt) / 1000
  return {
    seconds: Math.round(seconds * 10) / 10,
    captures,
    frames,
    missed,
    bytesPerSecond: Math.round(bytes / seconds),
    meanFrameBytes: frames === 0 ? 0 : Math.round(bytes / frames),
    maxCaptureMs: Math.round(maxCaptureMs)
  }
}

/** Drags a rectangular selection over the photograph, as a mask or an adjustment often starts. */
async function select(page: Page): Promise<void> {
  await page.keyboard.press('m')
  await page.mouse.move(360, 260)
  await page.mouse.down()
  await page.mouse.move(820, 660, { steps: 15 })
  await page.mouse.up()
}

/** A brush stroke, then a selection held for a few seconds, as a retouch in progress makes. */
async function retouch(page: Page): Promise<void> {
  await page.keyboard.press('b')
  await page.mouse.move(420, 420)
  await page.mouse.down()
  for (let k = 0; k < 24; k++) await page.mouse.move(420 + k * 14, 420 + Math.sin(k / 3) * 40, { steps: 2 })
  await page.mouse.up()
  await Bun.sleep(1_500)
  await select(page)
  await Bun.sleep(4_000)
  await page.keyboard.press('ControlOrMeta+d')
  await Bun.sleep(1_500)
}

describeLive('live view bandwidth against Photopea in Google Chrome', () => {
  let browser: Browser
  let server: ReturnType<typeof Bun.serve>

  beforeAll(async () => {
    server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch: () =>
        new Response(createPhotopeaHostHtml(), {
          headers: { 'content-type': 'text/html; charset=utf-8' }
        })
    })
    browser = await chromium.launch({ channel: 'chrome', headless: true })
  })

  afterAll(async () => {
    try {
      await browser?.close()
    } finally {
      await server?.stop(true)
    }
  })

  test('measures the frames the live view sends while the editor idles, is worked, and holds a selection', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    try {
      const bridge = new PhotopeaBridge(
        new PlaywrightPhotopeaTransport(page, { hostUrl: new URL('/', server.url).toString() })
      )
      const sample = await Bun.file(new URL('../../src/web/assets/sample-photo.png', import.meta.url)).bytes()
      await new PhotopeaDocumentLoader(bridge).open(sample, 'layerhand-sample.png')
      await Bun.sleep(2_000)

      const idle = await pumpFor(page, 20_000)
      const worked = await pumpFor(page, 40_000, () => retouch(page))
      await select(page)
      const selected = await pumpFor(page, 20_000)
      await page.keyboard.press('ControlOrMeta+d')
      console.log(JSON.stringify({ event: 'live_frame_bandwidth', chrome: browser.version(), idle, worked, selected }))

      for (const phase of [idle, worked, selected]) {
        expect(phase.missed).toBe(0)
        // One capture a second, give or take the slack of a busy machine.
        expect(phase.captures).toBeGreaterThanOrEqual(Math.floor(phase.seconds * 0.8))
      }
      expect(idle.frames).toBeLessThan(idle.captures)
    } finally {
      await page.close()
    }
  }, 150_000)
})
