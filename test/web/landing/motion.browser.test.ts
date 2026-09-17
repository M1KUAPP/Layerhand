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
})
