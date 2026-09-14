import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser } from 'playwright-core'
import { PHOTOPEA_CONFIGURATION, PhotopeaBridge, PlaywrightPhotopeaTransport } from '../../src/editor'

const localChrome = process.env.LAYERHAND_CHROME_INTEGRATION === '1'
const describeChrome = localChrome ? describe : describe.skip

describeChrome('Photopea transport with a local host in Google Chrome', () => {
  let browser: Browser

  beforeAll(async () => {
    browser = await chromium.launch({ channel: 'chrome', headless: true })
  })

  afterAll(async () => {
    await browser?.close()
  })

  test('applies the viewport to an injected page before the host initializes', async () => {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
    await page.route('http://layerhand.test/editor', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<script>document.title = innerWidth + "x" + innerHeight</script>'
      })
    )

    try {
      const transport = new PlaywrightPhotopeaTransport(page, { hostUrl: 'http://layerhand.test/editor' })
      await transport.boot(PHOTOPEA_CONFIGURATION)

      expect(page.viewportSize()).toEqual({ width: 1440, height: 900 })
      expect(await page.title()).toBe('1440x900')
    } finally {
      await page.close()
    }
  })

  test('reinitializes an already loaded host when a transport boot is requested', async () => {
    const page = await browser.newPage()
    let loads = 0
    await page.route('http://layerhand.test/editor', (route) => {
      loads += 1
      return route.fulfill({
        contentType: 'text/html',
        body: '<script>window.__layerhandPhotopeaMessages = [{ type: "text", value: "done" }]</script>'
      })
    })

    try {
      const transport = new PlaywrightPhotopeaTransport(page, { hostUrl: 'http://layerhand.test/editor' })
      await transport.boot(PHOTOPEA_CONFIGURATION)
      await transport.nextMessage(100)

      await transport.boot(PHOTOPEA_CONFIGURATION)

      expect(loads).toBe(2)
      expect(await transport.nextMessage(100)).toEqual({ type: 'text', value: 'done' })
    } finally {
      await page.close()
    }
  })

  test('a boot retry cannot consume stale readiness left by timeout cleanup', async () => {
    const page = await browser.newPage()
    let loads = 0
    await page.route('http://layerhand.test/editor', (route) => {
      loads += 1
      // Only cleanup reloads are ready; each requested boot must time out.
      const messages = loads % 2 === 0 ? [{ type: 'text', value: 'done' }] : []
      return route.fulfill({
        contentType: 'text/html',
        body: `<script>window.__layerhandPhotopeaMessages = ${JSON.stringify(messages)}</script>`
      })
    })

    try {
      const transport = new PlaywrightPhotopeaTransport(page, { hostUrl: 'http://layerhand.test/editor' })
      const bridge = new PhotopeaBridge(transport, { commandTimeoutMs: 500 })
      await expect(bridge.boot()).rejects.toMatchObject({ code: 'photopea_timeout' })
      expect(
        await page.evaluate(
          () => (window as unknown as { __layerhandPhotopeaMessages: unknown }).__layerhandPhotopeaMessages
        )
      ).toEqual([{ type: 'text', value: 'done' }])

      await expect(bridge.boot()).rejects.toMatchObject({ code: 'photopea_timeout' })

      expect(loads).toBe(4)
    } finally {
      await page.close()
    }
  }, 15_000)
})
