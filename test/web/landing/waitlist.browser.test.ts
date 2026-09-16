import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser } from 'playwright-core'

import { startTestApplication } from '../support/test-server'
import { openLanding } from './support'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip

describeBrowser('waitlist in Chromium', () => {
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

  test('shows copy and form at 1440x900', async () => {
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

      // #updates exists
      await expect(page.locator('#updates').count()).resolves.toBe(1)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('shows copy and form at 1280x800', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1280, height: 800 } })
    try {
      await expect(page.locator('.waitlist__eyebrow').textContent()).resolves.toBe('Launch updates')
      await expect(page.locator('.waitlist__title').textContent()).resolves.toBe('Get the launch recording.')
      await expect(page.getByRole('button', { name: 'Email me the recording' }).isVisible()).resolves.toBe(true)
    } finally {
      await page.close()
    }
  }, 30_000)

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
  }, 30_000)

  test('a mistyped address keeps the server reason', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      const input = page.locator('#waitlist-email')
      // Passes the browser's type=email check; the server wants two labels.
      await input.fill('name@gmail')
      await page.getByRole('button', { name: 'Email me the recording' }).click()
      await page.locator('.waitlist__status-text', { hasText: 'Enter a valid email address.' }).waitFor()
      await expect(input.inputValue()).resolves.toBe('name@gmail')
    } finally {
      await page.close()
    }
  }, 30_000)

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
  }, 30_000)

  test('hero link to updates targets #updates', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      const updatesLink = page.locator('a[href="#updates"]')
      await expect(updatesLink.count()).resolves.toBeGreaterThan(0)
      await expect(updatesLink.first().getAttribute('href')).resolves.toBe('#updates')
    } finally {
      await page.close()
    }
  }, 30_000)
})
