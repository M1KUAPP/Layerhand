import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright-core'

import { startTestApplication } from './support/test-server'
import { openLanding } from './landing/support'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 }
]
const CLAIMS = [
  'Named layers',
  'Editable masks',
  'Adjustment layers',
  'Correct it mid-run',
  'Driven in Photopea',
  'Built on GPT-6 Astra',
  'Opens in Photoshop'
]

async function scrollAndSettle(page: Page, top: number): Promise<void> {
  await page.evaluate(
    (y) =>
      new Promise<void>((resolve) => {
        window.scrollTo(0, y)
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }),
    top
  )
  await page.waitForTimeout(300)
}

describeBrowser('landing page chrome in Chromium', () => {
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

    test(`places the branded primary navigation first at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        const header = page.locator('#app > .site-header:first-child')
        expect(await header.getAttribute('data-over')).toBe('hero')
        expect(await header.getByRole('button', { name: 'Return to Layerhand', exact: true }).count()).toBe(1)
        const nav = header.getByRole('navigation', { name: 'Primary', exact: true })
        expect(
          await nav
            .getByRole('link')
            .evaluateAll((links) => links.map((link) => ({ name: link.textContent, href: link.getAttribute('href') })))
        ).toEqual([
          { name: 'How it works', href: '#how-it-works' },
          { name: 'The layers', href: '#layers' },
          { name: 'A real run', href: '#real-run' },
          { name: 'Updates', href: '#updates' }
        ])
        await nav.getByRole('button', { name: 'Try it free', exact: true }).click()
        await page.locator('#app[data-view="input"]').waitFor()
      } finally {
        await page.close()
      }
    }, 30_000)

    test(`fills the sticky header after scrolling past 24px at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        const root = page.locator('html')
        const header = page.locator('.site-header')
        const background = () => header.evaluate((element) => getComputedStyle(element).backgroundColor)
        expect(await root.getAttribute('data-scrolled')).toBe('false')
        expect(await background()).toBe('rgba(0, 0, 0, 0)')
        await scrollAndSettle(page, 24)
        expect(await root.getAttribute('data-scrolled')).toBe('false')
        await scrollAndSettle(page, 25)
        expect(await root.getAttribute('data-scrolled')).toBe('true')
        await scrollAndSettle(page, 300)
        expect(await root.getAttribute('data-scrolled')).toBe('true')
        expect(await background()).not.toBe('rgba(0, 0, 0, 0)')
        expect(await header.evaluate((element) => getComputedStyle(element).position)).toBe('sticky')
        const box = await header.boundingBox()
        expect(box).not.toBeNull()
        expect(Math.abs(box!.y)).toBeLessThanOrEqual(1)
      } finally {
        await page.close()
      }
    }, 30_000)

    for (const reducedMotion of [false, true]) {
      test(`offers Back to top only beyond one viewport at ${size}, reduced motion ${reducedMotion}`, async () => {
        const page = await openLanding(browser, application.origin, { viewport, reducedMotion })
        try {
          const button = page.locator('button#to-top')
          expect(await button.evaluate((element) => element.closest('#app'))).toBeNull()
          expect(await button.getAttribute('aria-hidden')).toBe('true')
          expect(await button.evaluate((element: HTMLButtonElement) => element.tabIndex)).toBe(-1)
          expect(await button.evaluate((element) => getComputedStyle(element).visibility)).toBe('hidden')
          await scrollAndSettle(page, viewport.height)
          expect(await page.locator('html').getAttribute('data-far')).toBe('false')
          expect(await button.getAttribute('aria-hidden')).toBe('true')
          await scrollAndSettle(page, viewport.height + 100)
          expect(await page.locator('html').getAttribute('data-far')).toBe('true')
          expect(await button.getAttribute('aria-hidden')).toBeNull()
          expect(await button.evaluate((element: HTMLButtonElement) => element.tabIndex)).toBe(0)
          expect(await button.evaluate((element) => getComputedStyle(element).visibility)).toBe('visible')
          await page.getByRole('button', { name: 'Back to top', exact: true }).click()
          await page.waitForFunction(() => window.scrollY === 0, undefined, { timeout: 5000 })
          await page.waitForTimeout(300)
          expect(await page.locator('html').getAttribute('data-far')).toBe('false')
          expect(await button.getAttribute('aria-hidden')).toBe('true')
          expect(await button.evaluate((element: HTMLButtonElement) => element.tabIndex)).toBe(-1)
          expect(await button.evaluate((element) => getComputedStyle(element).visibility)).toBe('hidden')
        } finally {
          await page.close()
        }
      }, 30_000)
    }
  }

  test('hides navigation links but retains the CTA below 1280px', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1279, height: 800 } })
    try {
      const nav = page.getByRole('navigation', { name: 'Primary', exact: true })
      expect(await nav.locator('.site-nav__links').evaluate((element) => getComputedStyle(element).display)).toBe(
        'none'
      )
      expect(await nav.getByRole('button', { name: 'Try it free', exact: true }).isVisible()).toBe(true)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('repeats the ticker claims with only the first list exposed', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      const lists = page.locator('.ticker ul.ticker__list')
      expect(await lists.count()).toBe(2)
      expect(await lists.nth(0).getAttribute('aria-hidden')).toBeNull()
      expect(await lists.nth(1).getAttribute('aria-hidden')).toBe('true')
      for (const list of await lists.all()) {
        expect(await list.locator('li').allTextContents()).toEqual(CLAIMS)
      }
    } finally {
      await page.close()
    }
  }, 30_000)

  test('pauses and resumes the moving ticker with its named button', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      page.setDefaultTimeout(5000)
      const ticker = page.locator('.ticker')
      const toggle = ticker.locator('.ticker__toggle')
      const state = () =>
        ticker.locator('.ticker__track').evaluate((element) => getComputedStyle(element).animationPlayState)
      expect(await ticker.getAttribute('data-paused')).toBe('false')
      expect(await state()).toBe('running')
      await toggle.click()
      expect(await ticker.getAttribute('data-paused')).toBe('true')
      expect(await ticker.getByRole('button', { name: 'Play the moving list', exact: true }).count()).toBe(1)
      expect(await state()).toBe('paused')
      // The toggle sits at the foot of the pinned hero shell, so any page
      // scroll slides the landing body over it, and the hover lift leaves
      // its box animating for a moment after the first click.
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(300)
      await toggle.click()
      expect(await ticker.getAttribute('data-paused')).toBe('false')
      expect(await ticker.getByRole('button', { name: 'Pause the moving list', exact: true }).count()).toBe(1)
      // Hover and keyboard focus also pause the ticker independently of the toggle.
      await page.mouse.move(0, 0)
      await page.getByRole('button', { name: 'Retouch a photo', exact: true }).focus()
      expect(await state()).toBe('running')
    } finally {
      await page.close()
    }
  }, 30_000)

  test('keeps the ticker still and hides its toggle under reduced motion', async () => {
    const page = await openLanding(browser, application.origin, {
      viewport: { width: 1440, height: 900 },
      reducedMotion: true
    })
    try {
      expect(await page.locator('.ticker__track').evaluate((element) => getComputedStyle(element).animationName)).toBe(
        'none'
      )
      expect(await page.locator('.ticker__toggle').isVisible()).toBe(false)
    } finally {
      await page.close()
    }
  }, 30_000)
})
