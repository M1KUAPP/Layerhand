import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser } from 'playwright-core'

import { startTestApplication } from '../support/test-server'
import { openLanding } from './support'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip
const CARD_TITLES = [
  'Drop in a photograph',
  'Say what you want',
  'Watch it work, and correct it',
  'Download the layered PSD'
]

describeBrowser('landing steps section in Chromium', () => {
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

  test('shows the intro and all four card titles at 1440x900', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      const section = page.locator('section.steps#how-it-works[data-section="steps"]')
      expect(await section.locator('.steps__eyebrow').textContent()).toBe('How it works')
      expect(await section.locator('.steps__title').textContent()).toBe('Four steps, and you can step in on the third.')
      expect(await section.locator('.steps__card-title').allTextContents()).toEqual(CARD_TITLES)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('marks the first index entry active on arrival at 1440x900', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      const index = page.locator('ol.steps__index[aria-hidden="true"]')
      expect(await index.locator('.steps__index-item').count()).toBe(4)
      const active = await index
        .locator('.steps__index-item')
        .evaluateAll((items) => items.map((item) => item.hasAttribute('data-active')))
      expect(active).toEqual([true, false, false, false])
    } finally {
      await page.close()
    }
  }, 30_000)

  test('follows the card nearest the middle of the screen at 1440x900', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      const active = () =>
        page.locator('.steps__index-item').evaluateAll((items) => items.map((item) => item.hasAttribute('data-active')))
      await page.locator('.steps__card[data-step="3"]').evaluate((card) => card.scrollIntoView({ block: 'center' }))
      await page.waitForTimeout(400)
      expect(await active()).toEqual([false, false, false, true])
      await page.locator('.steps__card[data-step="0"]').evaluate((card) => card.scrollIntoView({ block: 'center' }))
      await page.waitForTimeout(400)
      expect(await active()).toEqual([true, false, false, false])
    } finally {
      await page.close()
    }
  }, 30_000)

  test('pins the intro beside the cards at 1440x900', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      expect(await page.locator('.steps__intro').evaluate((intro) => getComputedStyle(intro).position)).toBe('sticky')
    } finally {
      await page.close()
    }
  }, 30_000)

  test('hides the index and unpins the intro below 1280px', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1279, height: 800 } })
    try {
      expect(await page.locator('.steps__index').evaluate((index) => getComputedStyle(index).display)).toBe('none')
      expect(await page.locator('.steps__intro').evaluate((intro) => getComputedStyle(intro).position)).toBe('static')
    } finally {
      await page.close()
    }
  }, 30_000)
})
