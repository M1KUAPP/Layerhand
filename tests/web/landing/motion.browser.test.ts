import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser } from 'playwright-core'

import { startTestApplication } from '../support/test-server'
import { openLanding } from './support'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip

describeBrowser('landing motion in Chromium', () => {
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

  test('a target below the fold waits: .glass__title has data-reveal="pending" and opacity 0 until scrolled into view', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      const title = page.locator('.glass__title')
      expect(await title.getAttribute('data-reveal')).toBe('pending')
      expect(await title.evaluate((element) => getComputedStyle(element).opacity)).toBe('0')

      await title.scrollIntoViewIfNeeded()
      await page.waitForTimeout(1500)

      expect(await title.evaluate((element) => getComputedStyle(element).opacity)).toBe('1')
      expect(await title.getAttribute('data-reveal')).toBe('shown')
    } finally {
      await page.close()
    }
  }, 30_000)

  test('under reduced motion, no element has data-reveal="pending" and .glass__title has opacity 1 at once', async () => {
    const page = await openLanding(browser, application.origin, {
      viewport: { width: 1440, height: 900 },
      reducedMotion: true
    })
    try {
      expect(await page.locator('[data-reveal="pending"]').count()).toBe(0)
      const title = page.locator('.glass__title')
      expect(await title.evaluate((element) => getComputedStyle(element).opacity)).toBe('1')
    } finally {
      await page.close()
    }
  }, 30_000)

  test('the spotlight follows the pointer and moving to the ticker area and out of the shell removes data-spot', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      const shell = page.locator('.hero-shell')
      await page.mouse.move(400, 400)
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => resolve())
            })
          })
      )
      expect(await shell.getAttribute('data-spot')).toBe('on')
      const spotX = await shell.evaluate((element) => element.style.getPropertyValue('--spot-x'))
      expect(spotX).toBe('400px')

      const ticker = page.locator('.ticker')
      await ticker.hover()
      const steps = page.locator('.steps')
      await steps.hover()
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => resolve())
            })
          })
      )
      expect(await shell.getAttribute('data-spot')).toBeNull()
    } finally {
      await page.close()
    }
  }, 30_000)

  test('a card lifts under the pointer at 1440x900', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      const card = page.locator('.steps__card').first()
      await card.scrollIntoViewIfNeeded()
      await page.waitForTimeout(1500)
      await card.hover()
      await page.waitForTimeout(300)
      const translate = await card.evaluate((element) => getComputedStyle(element).translate)
      expect(translate).toBe('0px -4px')
    } finally {
      await page.close()
    }
  }, 30_000)

  test('under reduced motion, hovering the card leaves translate at none', async () => {
    const page = await openLanding(browser, application.origin, {
      viewport: { width: 1440, height: 900 },
      reducedMotion: true
    })
    try {
      const card = page.locator('.steps__card').first()
      await card.scrollIntoViewIfNeeded()
      await card.hover()
      await page.waitForTimeout(300)
      const translate = await card.evaluate((element) => getComputedStyle(element).translate)
      expect(translate).toBe('none')
    } finally {
      await page.close()
    }
  }, 30_000)
})
