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
const PSD_HINT = 'Switch a layer off. The others stay exactly as they were.'
const JPEG_HINT = 'A flat JPEG is one layer. Every edit is baked in, and nothing is left to switch.'

describeBrowser('landing layer switcher in Chromium', () => {
  let browser: Browser
  let application: Awaited<ReturnType<typeof startTestApplication>>

  beforeAll(async () => {
    application = await startTestApplication()
    browser = await chromium.launch({ headless: true })
  }, 30_000)

  afterAll(async () => {
    try {
      await browser?.close()
    } finally {
      await application?.close()
    }
  }, 30_000)

  for (const viewport of VIEWPORTS) {
    const size = `${viewport.width}x${viewport.height}`

    test(`shows the copy and all four PSD layers on arrival at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        const section = page.locator('section.switcher#layers[data-section="switcher"]')
        expect(await section.locator('.switcher__eyebrow').textContent()).toBe('Why layers')
        expect(await section.locator('.switcher__line').allTextContents()).toEqual([
          'A flat JPEG keeps the result. ',
          'A PSD keeps the work.'
        ])
        expect(await section.locator('.switcher__body').textContent()).toBe(
          'Retouching is a stack of separate decisions, from the photograph at the bottom to the last adjustment on top. Layerhand hands the stack back as it was built, so one decision can change without redoing the rest.'
        )
        expect(
          await section.getByRole('button', { name: 'Layered PSD', exact: true }).getAttribute('aria-pressed')
        ).toBe('true')
        expect(await section.getByRole('button', { name: 'Flat JPEG', exact: true }).getAttribute('aria-pressed')).toBe(
          'false'
        )
        expect(await section.locator('.switcher__file').textContent()).toBe('sample-photo.psd')
        expect(await section.locator('.switcher__count').textContent()).toBe('4')
        expect(await section.locator('.switcher__hint').textContent()).toBe(PSD_HINT)
        expect(
          await section
            .locator('button.switcher__eye')
            .evaluateAll((eyes) =>
              eyes.map((eye) => ({ name: eye.getAttribute('aria-label'), pressed: eye.getAttribute('aria-pressed') }))
            )
        ).toEqual([
          { name: 'Show Darken corners softly', pressed: 'true' },
          { name: 'Show Warm colours', pressed: 'true' },
          { name: 'Show Brighten photograph', pressed: 'true' },
          { name: 'Show Original photograph', pressed: 'true' }
        ])
        for (const layer of ['corners', 'warm', 'brighten', 'original']) {
          expect(await section.locator('.switcher__stage').getAttribute(`data-${layer}`)).toBe('on')
        }
      } finally {
        await page.close()
      }
    }, 30_000)

    test(`switches warmth off and on without changing other layers at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        const section = page.locator('#layers')
        const eye = section.getByRole('button', { name: 'Show Warm colours', exact: true })
        const stage = section.locator('.switcher__stage')
        const row = section.locator('li.switcher__layer[data-layer="warm"]')
        const opacity = () =>
          section.locator('.switcher__warm').evaluate((element) => getComputedStyle(element).opacity)
        expect(Number(await opacity())).toBeGreaterThan(0)
        await eye.click()
        expect(await eye.getAttribute('aria-pressed')).toBe('false')
        expect(await stage.getAttribute('data-warm')).toBe('off')
        expect(await row.getAttribute('data-hidden')).toBe('true')
        await page.waitForTimeout(350)
        expect(await opacity()).toBe('0')
        for (const layer of ['corners', 'brighten', 'original']) {
          expect(await stage.getAttribute(`data-${layer}`)).toBe('on')
        }
        await eye.click()
        expect(await eye.getAttribute('aria-pressed')).toBe('true')
        expect(await stage.getAttribute('data-warm')).toBe('on')
        expect(await row.getAttribute('data-hidden')).toBe('false')
        await page.waitForTimeout(350)
        expect(Number(await opacity())).toBeGreaterThan(0)
      } finally {
        await page.close()
      }
    }, 30_000)

    test(`flattens the preview but restores the earlier PSD choices at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        const section = page.locator('#layers')
        const jpeg = section.getByRole('button', { name: 'Flat JPEG', exact: true })
        const psd = section.getByRole('button', { name: 'Layered PSD', exact: true })
        const eye = section.getByRole('button', { name: 'Show Warm colours', exact: true })
        const list = section.locator('ol.switcher__layers')
        const flat = section.locator('.switcher__flat')
        const opacity = () =>
          section.locator('.switcher__warm').evaluate((element) => getComputedStyle(element).opacity)
        await eye.click()
        await page.waitForTimeout(350)
        expect(await opacity()).toBe('0')
        const before = await section
          .locator('.switcher__eye')
          .evaluateAll((eyes) => eyes.map((eye) => eye.getAttribute('aria-pressed')))
        await jpeg.click()
        expect(await jpeg.getAttribute('aria-pressed')).toBe('true')
        expect(await psd.getAttribute('aria-pressed')).toBe('false')
        expect(await section.locator('.switcher__file').textContent()).toBe('sample-photo.jpg')
        expect(await section.locator('.switcher__count').textContent()).toBe('1')
        expect(await section.locator('.switcher__hint').textContent()).toBe(JPEG_HINT)
        expect(await list.isVisible()).toBe(false)
        expect(await list.getAttribute('inert')).toBe('')
        expect(await flat.isVisible()).toBe(true)
        expect(await flat.textContent()).toContain('Background')
        await page.waitForTimeout(350)
        expect(Number(await opacity())).toBeGreaterThan(0)
        await psd.click()
        expect(await psd.getAttribute('aria-pressed')).toBe('true')
        expect(await jpeg.getAttribute('aria-pressed')).toBe('false')
        expect(await section.locator('.switcher__file').textContent()).toBe('sample-photo.psd')
        expect(await section.locator('.switcher__count').textContent()).toBe('4')
        expect(await section.locator('.switcher__hint').textContent()).toBe(PSD_HINT)
        expect(await list.isVisible()).toBe(true)
        expect(await list.getAttribute('inert')).toBeNull()
        expect(await flat.isVisible()).toBe(false)
        expect(
          await section
            .locator('.switcher__eye')
            .evaluateAll((eyes) => eyes.map((eye) => eye.getAttribute('aria-pressed')))
        ).toEqual(before)
        expect(await section.locator('.switcher__stage').getAttribute('data-warm')).toBe('off')
        expect(await section.locator('[data-layer="warm"]').getAttribute('data-hidden')).toBe('true')
        await page.waitForTimeout(350)
        expect(await opacity()).toBe('0')
      } finally {
        await page.close()
      }
    }, 30_000)
  }

  test('stacks the panel below the photograph without sideways scroll at 390x844', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 390, height: 844 } })
    try {
      await page.locator('#layers').scrollIntoViewIfNeeded()
      const stage = await page.locator('.switcher__stage').boundingBox()
      const panel = await page.locator('.switcher__panel').boundingBox()
      expect(stage).not.toBeNull()
      expect(panel).not.toBeNull()
      expect(panel!.y).toBeGreaterThanOrEqual(stage!.y + stage!.height)
      expect(await page.evaluate(() => document.documentElement.scrollWidth === window.innerWidth)).toBe(true)
    } finally {
      await page.close()
    }
  }, 30_000)
})
