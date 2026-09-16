import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser } from 'playwright-core'

import { startTestApplication } from '../support/test-server'
import { openLanding } from './support'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 }
]

describeBrowser('landing scrub section in Chromium', () => {
  let browser: Browser
  let application: Awaited<ReturnType<typeof startTestApplication>>

  beforeAll(async () => {
    application = await startTestApplication()
    browser = await chromium.launch({ headless: true })
  })

  afterAll(async () => {
    try {
      await browser?.close()
    } finally {
      await application?.close()
    }
  })

  for (const viewport of VIEWPORTS) {
    const size = `${viewport.width}x${viewport.height}`

    test(`shows the sheet copy and a named frame at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        const section = page.locator('[data-section="scrub"]')
        expect(await section.locator('.scrub__eyebrow').textContent()).toBe('Why layers')
        expect(await section.locator('.scrub__title').textContent()).toBe(
          'A flat JPEG keeps the result. A PSD keeps the work.'
        )
        const lines = section.locator('.scrub__line')
        expect(await lines.count()).toBe(2)
        expect(await lines.nth(0).textContent()).toBe('A flat JPEG keeps the result. ')
        expect(await lines.nth(1).textContent()).toBe('A PSD keeps the work.')
        expect(await section.locator('.scrub__body').textContent()).toBe(
          'Retouching is a stack of separate decisions, from the photograph at the bottom to the last adjustment on top. Layerhand hands the stack back as it was built, so one decision can change without redoing the rest.'
        )
        expect(await section.locator('.scrub__caption').textContent()).toBe(
          'An illustration. The layers from a real run come next.'
        )
        const namedFrame = section.getByRole('img', {
          name: 'Illustration of a photograph coming apart into separate layers'
        })
        expect(await namedFrame.count()).toBe(1)
      } finally {
        await page.close()
      }
    }, 30_000)

    test(`pins the stage while the track scrolls at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        const position = await page.locator('.scrub__stage').evaluate((element) => getComputedStyle(element).position)
        expect(position).toBe('sticky')
        const top = await page.evaluate(async () => {
          const track = document.querySelector('.scrub__track')
          const stage = document.querySelector('.scrub__stage')
          if (!track || !stage) return Number.NaN
          const trackTop = track.getBoundingClientRect().top + window.scrollY
          window.scrollTo(0, trackTop + window.innerHeight * 0.4)
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
          return stage.getBoundingClientRect().top
        })
        expect(Math.abs(top)).toBeLessThan(1)
      } finally {
        await page.close()
      }
    }, 30_000)

    test(`reaches the last frame at the end of the track at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        await page.evaluate(() => {
          const track = document.querySelector('.scrub__track')
          if (!track) return
          const trackTop = track.getBoundingClientRect().top + window.scrollY
          window.scrollTo(0, trackTop + track.getBoundingClientRect().height - window.innerHeight)
        })
        await page.waitForFunction(
          () => {
            const video = document.querySelector<HTMLVideoElement>('.scrub__video')
            if (video && Number.isFinite(video.duration) && video.duration - video.currentTime <= 0.2) return true
            const canvas = document.querySelector<HTMLCanvasElement>('.scrub__canvas')
            if (canvas && canvas.width > 0 && canvas.height > 0) {
              const context = canvas.getContext('2d')
              if (!context) return false
              const x = Math.floor(canvas.width / 2)
              const y = Math.floor(canvas.height / 2)
              return context.getImageData(x, y, 1, 1).data[3]! > 0
            }
            return false
          },
          undefined,
          { timeout: 15_000 }
        )
      } finally {
        await page.close()
      }
    }, 30_000)

    test(`builds only the poster under reduced motion at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport, reducedMotion: true })
      try {
        const section = page.locator('[data-section="scrub"]')
        expect(await section.locator('.scrub__poster').count()).toBe(1)
        const still = await section.locator('.scrub__poster').evaluate((img) => (img as HTMLImageElement).currentSrc)
        expect(still).toContain('scrub-end')
        expect(await section.locator('video').count()).toBe(0)
        expect(await section.locator('canvas').count()).toBe(0)
        const position = await section
          .locator('.scrub__stage')
          .evaluate((element) => getComputedStyle(element).position)
        expect(position).not.toBe('sticky')
      } finally {
        await page.close()
      }
    }, 30_000)
  }
})
