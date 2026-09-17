import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright-core'

import { startTestApplication } from '../support/test-server'
import { openLanding } from './support'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 }
]

function scrollAndSettle(page: Page): Promise<void> {
  return page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.scrollTo(0, 400)
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
  )
}

function translatesOf(page: Page): Promise<string[]> {
  return page
    .locator('.hero__plate, .hero__chip--steer, .hero__title')
    .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).translate))
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

    test(`renders the tagline, calls to action and editor frame at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        const hero = page.locator('section.hero[data-section="hero"]')
        expect(await hero.locator('.hero__eyebrow-label').textContent()).toBe('AI retouching')
        expect(await hero.locator('.hero__eyebrow-note').textContent()).toBe('Built on GPT-6 Astra')
        expect(await hero.locator('.hero__title').textContent()).toBe('A layered PSD, not a flat JPEG.')
        expect(await hero.locator('.hero__lede').textContent()).toBe(
          'Layerhand retouches your photograph in Photopea while you watch. Correct it as it works, then download a PSD with each edit on its own named layer.'
        )
        expect(await hero.locator('.hero__cta').textContent()).toBe('Retouch a photo')
        const updates = hero.locator('a.hero__updates')
        expect(await updates.textContent()).toBe('Get launch updates by email')
        expect(await updates.getAttribute('href')).toBe('#updates')
        expect(await hero.locator('.hero__fact').allTextContents()).toEqual([
          'Three free runs',
          'No account needed',
          'Uploads deleted within 24 hours'
        ])
        expect(await hero.locator('.hero__note-desktop').count()).toBe(1)
        expect(await hero.locator('.hero__note-desktop').isVisible()).toBe(false)
        const photo = hero.locator('img.hero__photo')
        expect(await photo.evaluate((image: HTMLImageElement) => image.currentSrc)).toContain('editor-frame')
        expect(await photo.getAttribute('alt')).toBe(
          'Photopea at the end of a Layerhand run on the sample photograph of a blue glass bottle. Its Layers panel lists Darken corners softly, Warm colours, Brighten photograph and Original photograph.'
        )
        expect(await hero.locator('.hero__caption').textContent()).toBe(
          'The last frame of a real run on the sample photograph, which you can try in the workbench.'
        )
      } finally {
        await page.close()
      }
    }, 30_000)

    test(`starts a run from the hero at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        await page.getByRole('button', { name: 'Retouch a photo', exact: true }).click()
        await page.locator('#app[data-view="input"]').waitFor()
      } finally {
        await page.close()
      }
    }, 30_000)

    test(`pins the hero and ticker in one viewport at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        const shell = page.locator('.hero-shell')
        expect(await shell.locator(':scope > section.hero[data-section="hero"] + .ticker').count()).toBe(1)
        expect(await shell.evaluate((element) => getComputedStyle(element).position)).toBe('sticky')
        const box = await shell.boundingBox()
        expect(box).not.toBeNull()
        expect(Math.abs(box!.height - viewport.height)).toBeLessThanOrEqual(1)
      } finally {
        await page.close()
      }
    }, 30_000)

    test(`drifts the plate and steering chip but not the title at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        const before = await translatesOf(page)
        expect(before).toHaveLength(3)
        await scrollAndSettle(page)
        const after = await translatesOf(page)
        // Document order is title, plate, then the chip inside the plate.
        expect(after[0]).toBe(before[0])
        expect(after[1]).not.toBe(before[1])
        expect(after[2]).not.toBe(before[2])
      } finally {
        await page.close()
      }
    }, 30_000)

    test(`holds the hero still under reduced motion at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport, reducedMotion: true })
      try {
        const before = await translatesOf(page)
        expect(before).toHaveLength(3)
        await scrollAndSettle(page)
        expect(await translatesOf(page)).toEqual(before)
      } finally {
        await page.close()
      }
    }, 30_000)
  }

  test('stacks the copy above the plate without sideways scroll at 390x844', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 390, height: 844 } })
    try {
      const result = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        copyBottom: document.querySelector('.hero__copy')!.getBoundingClientRect().bottom,
        mediaTop: document.querySelector('.hero__media')!.getBoundingClientRect().top
      }))
      expect(result.scrollWidth).toBe(result.innerWidth)
      expect(result.copyBottom).toBeLessThanOrEqual(result.mediaTop)
      expect(await page.locator('.hero-shell').evaluate((element) => getComputedStyle(element).position)).toBe(
        'relative'
      )
      const note = page.locator('.hero__note-desktop')
      expect(await note.isVisible()).toBe(true)
      expect(await note.textContent()).toBe('The workbench needs a desktop at least 1280 px wide.')
    } finally {
      await page.close()
    }
  }, 30_000)
})
