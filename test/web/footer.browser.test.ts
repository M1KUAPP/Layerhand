import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser } from 'playwright-core'

import { openLanding } from './landing/support'
import { startTestApplication } from './support/test-server'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip

describeBrowser('sitewide footer in Chromium', () => {
  let browser: Browser
  let application: Awaited<ReturnType<typeof startTestApplication>>

  beforeAll(async () => {
    application = await startTestApplication({ fakeRunIntervalMs: 1_000 })
    browser = await chromium.launch({ headless: true })
  }, 30_000)

  afterAll(async () => {
    try {
      await browser?.close()
    } finally {
      await application?.close()
    }
  }, 30_000)

  test('carries the line, the credits and the source link', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      const footer = page.locator('#site-footer')
      await expect(footer.count()).resolves.toBe(1)
      await expect(footer.locator('.site-footer__line').textContent()).resolves.toBe('A layered PSD, not a flat JPEG.')
      await expect(footer.locator('.site-footer__wordmark').textContent()).resolves.toBe('Layerhand')
      await expect(
        footer.locator('.site-footer__credits').evaluate((node) => node.textContent?.replace(/\s+/g, ' ').trim())
      ).resolves.toBe(
        'Built on GPT-6 Astra for the GPT-6 Astra Challenge. Layerhand drives Photopea, a web image editor, and is not affiliated with it.'
      )
      await expect(footer.getByRole('link', { name: 'GPT-6 Astra Challenge' }).getAttribute('href')).resolves.toBe(
        'https://www.producthunt.com/contests/gpt-6-astra-challenge'
      )
      await expect(footer.getByRole('link', { name: 'Photopea' }).getAttribute('href')).resolves.toBe(
        'https://www.photopea.com/'
      )
      await expect(footer.getByRole('link', { name: 'Source on GitHub' }).getAttribute('href')).resolves.toBe(
        'https://github.com/M1KUAPP/astra'
      )
      // The landing no longer renders a footer of its own.
      await expect(page.locator('footer').count()).resolves.toBe(1)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('stays the same footer when the view changes', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      await page.getByRole('button', { name: 'Retouch a photo' }).click()
      await page.locator('#app[data-view="input"]').waitFor()
      await expect(page.locator('#site-footer .site-footer__line').isVisible()).resolves.toBe(true)
    } finally {
      await page.close()
    }
  }, 30_000)
})
