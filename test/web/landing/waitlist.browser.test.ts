import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser } from 'playwright-core'

import { startTestApplication } from '../support/test-server'
import { openLanding } from './support'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip

describeBrowser('waitlist and footer in Chromium', () => {
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

  test('shows copy, form and footer at 1440x900', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      // Eyebrow, headline, body
      await expect(page.locator('.waitlist__eyebrow').textContent()).resolves.toBe('Launch updates')
      await expect(page.locator('.waitlist__title').textContent()).resolves.toBe('Get the launch recording.')
      await expect(page.locator('.waitlist__body').textContent()).resolves.toContain('Leave an email address')

      // Label visible
      const label = page.locator('.waitlist__label')
      await expect(label.isVisible()).resolves.toBe(true)
      await expect(label.textContent()).resolves.toBe('Email address')

      // Button visible
      await expect(page.getByRole('button', { name: 'Email me the recording' }).isVisible()).resolves.toBe(true)

      // Footer wordmark
      await expect(page.locator('.waitlist__wordmark').textContent()).resolves.toBe('Layerhand')

      // Footer credits with links
      const credit1 = page.locator('.waitlist__credit').first()
      await expect(credit1.textContent()).resolves.toContain('GPT-6 Astra Challenge')
      const credit1Link = page.locator('.waitlist__credit .waitlist__link').first()
      await expect(credit1Link.textContent()).resolves.toBe('GPT-6 Astra Challenge')
      await expect(credit1Link.getAttribute('href')).resolves.toBe(
        'https://www.producthunt.com/contests/gpt-6-astra-challenge'
      )

      // Source on GitHub link
      const source = page.locator('.waitlist__source')
      await expect(source.getAttribute('href')).resolves.toBe('https://github.com/M1KUAPP/astra')
      await expect(source.textContent()).resolves.toContain('Source on GitHub')

      // #updates exists
      await expect(page.locator('#updates').count()).resolves.toBe(1)
    } finally {
      await page.close()
    }
  })

  test('shows copy, form and footer at 1280x800', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1280, height: 800 } })
    try {
      await expect(page.locator('.waitlist__eyebrow').textContent()).resolves.toBe('Launch updates')
      await expect(page.locator('.waitlist__title').textContent()).resolves.toBe('Get the launch recording.')
      await expect(page.getByRole('button', { name: 'Email me the recording' }).isVisible()).resolves.toBe(true)
      await expect(page.locator('.waitlist__wordmark').textContent()).resolves.toBe('Layerhand')
      await expect(page.locator('.waitlist__source').getAttribute('href')).resolves.toBe(
        'https://github.com/M1KUAPP/astra'
      )
    } finally {
      await page.close()
    }
  })

  test('submitting a new address shows thanks and clears input', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      const input = page.locator('#waitlist-email')
      const button = page.getByRole('button', { name: 'Email me the recording' })

      await input.fill('alaskantuna@example.com')
      await button.click()
      await page.locator('.waitlist__status-text', { hasText: 'Thanks.' }).waitFor()
      await expect(page.locator('.waitlist__status-text').textContent()).resolves.toBe(
        'Thanks. The recording will come to that address.'
      )
      await expect(input.inputValue()).resolves.toBe('')
    } finally {
      await page.close()
    }
  })

  test('submitting the same address shows repeat status and keeps input', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      const input = page.locator('#waitlist-email')
      const button = page.getByRole('button', { name: 'Email me the recording' })

      await input.fill('alaskantuna2@example.com')
      await button.click()
      await page
        .locator('.waitlist__status-text', { hasText: 'Thanks. The recording will come to that address.' })
        .waitFor()
      await expect(page.locator('.waitlist__status-text').textContent()).resolves.toBe(
        'Thanks. The recording will come to that address.'
      )

      await input.fill('alaskantuna2@example.com')
      await button.click()
      await page.locator('.waitlist__status-text', { hasText: 'That address is already signed up.' }).waitFor()
      await expect(page.locator('.waitlist__status-text').textContent()).resolves.toBe(
        'That address is already signed up.'
      )
      await expect(input.inputValue()).resolves.toBe('alaskantuna2@example.com')
    } finally {
      await page.close()
    }
  })

  test('hero link to updates targets #updates', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      const updatesLink = page.locator('a[href="#updates"]')
      await expect(updatesLink.count()).resolves.toBeGreaterThan(0)
      await expect(updatesLink.first().getAttribute('href')).resolves.toBe('#updates')
    } finally {
      await page.close()
    }
  })
})
