import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright-core'

import { startTestApplication } from '../support/test-server'
import { openLanding, transformsOf } from './support'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 }
]

const LEDE =
  'Layerhand retouches your photograph in Photopea while you watch. Correct it as it works, then download a PSD with each edit on its own named layer.'
const POSTER_ALT =
  'Unretouched studio photograph of a cobalt-blue glass bottle with a brushed-metal cap on a creased paper backdrop.'

function scrollAndSettle(page: Page): Promise<void> {
  return page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.scrollTo(0, 400)
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
  )
}

describeBrowser('landing hero in Chromium', () => {
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

    test(`renders the tagline, calls to action and framed poster at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        expect(await page.locator('.hero__eyebrow').textContent()).toBe('AI retouching')
        expect(await page.locator('.hero__title').textContent()).toBe('A layered PSD, not a flat JPEG.')
        expect(await page.locator('.hero__lede').textContent()).toBe(LEDE)
        expect(await page.locator('.hero__cta').textContent()).toBe('Retouch a photo')
        const updates = page.locator('.hero__updates')
        expect(await updates.textContent()).toBe('Get launch updates by email')
        expect(await updates.getAttribute('href')).toBe('#updates')
        expect(await page.locator('.hero__note').textContent()).toBe(
          'Three free runs. No account needed. Uploads are deleted within 24 hours.'
        )
        expect(await page.locator('.hero__note-desktop').count()).toBe(1)
        expect(await page.locator('.hero__note-desktop').isVisible()).toBe(false)
        expect(await page.locator('img.hero__photo').evaluate((image: HTMLImageElement) => image.currentSrc)).toMatch(
          /\.jpg$/
        )
        expect(await page.locator('.hero__caption').textContent()).toBe(
          'Before retouching: the sample photograph, which you can try in the workbench.'
        )
        expect(await page.locator('img.hero__photo').getAttribute('alt')).toBe(POSTER_ALT)
      } finally {
        await page.close()
      }
    })

    test(`starts a run from the hero at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        await page.getByRole('button', { name: 'Retouch a photo' }).click()
        await page.locator('[data-view="input"]').waitFor()
      } finally {
        await page.close()
      }
    })

    test(`fills the first viewport at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        const hero = await page.locator('.hero').boundingBox()
        expect(hero).not.toBeNull()
        expect(hero!.height).toBeGreaterThanOrEqual(viewport.height)
        for (const selector of ['.hero__title', '.hero__lede', '.hero__cta']) {
          const box = await page.locator(selector).boundingBox()
          expect(box).not.toBeNull()
          expect(box!.y).toBeGreaterThanOrEqual(0)
          expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
        }
      } finally {
        await page.close()
      }
    })

    test(`drifts the photograph and plate on scroll at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        const photoBefore = await transformsOf(page, '.hero__photo')
        const plateBefore = await transformsOf(page, '.hero__plate')
        const titleBefore = await transformsOf(page, '.hero__title')
        await scrollAndSettle(page)
        expect(await transformsOf(page, '.hero__photo')).not.toEqual(photoBefore)
        expect(await transformsOf(page, '.hero__plate')).not.toEqual(plateBefore)
        expect(await transformsOf(page, '.hero__title')).toEqual(titleBefore)
      } finally {
        await page.close()
      }
    })

    test(`holds the hero still under reduced motion at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport, reducedMotion: true })
      try {
        const photoBefore = await transformsOf(page, '.hero__photo')
        const plateBefore = await transformsOf(page, '.hero__plate')
        await scrollAndSettle(page)
        expect(await transformsOf(page, '.hero__photo')).toEqual(photoBefore)
        expect(await transformsOf(page, '.hero__plate')).toEqual(plateBefore)
      } finally {
        await page.close()
      }
    })
  }

  test('stacks the copy above the plate without sideways scroll at 390x844', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 390, height: 844 } })
    try {
      await page.evaluate(() => {
        const app = document.querySelector<HTMLElement>('#app')
        const gate = document.querySelector<HTMLElement>('#desktop-required')
        if (app) app.style.display = 'block'
        if (gate) gate.style.display = 'none'
      })
      const result = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        copyBottom: document.querySelector('.hero__copy')!.getBoundingClientRect().bottom,
        mediaTop: document.querySelector('.hero__media')!.getBoundingClientRect().top
      }))
      expect(result.scrollWidth).toBe(result.innerWidth)
      expect(result.copyBottom).toBeLessThanOrEqual(result.mediaTop)
      const note = page.locator('.hero__note-desktop')
      expect(await note.count()).toBe(1)
      expect(await note.isVisible()).toBe(true)
      expect(await note.textContent()).toBe('The workbench needs a desktop at least 1280 px wide.')
    } finally {
      await page.close()
    }
  })
})
