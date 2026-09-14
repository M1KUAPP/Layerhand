import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright-core'

import { startTestApplication } from './support/test-server'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip
const EXAMPLE = 'Clean the reflections without changing the label.'

async function openInput(page: Page, origin: string): Promise<void> {
  await page.goto(origin)
  await page.getByRole('button', { name: 'Retouch a photo' }).click()
  await page.getByRole('button', { name: 'Use the sample photograph' }).click()
  await page.getByAltText('Selected source: layerhand-sample.png').waitFor()
}

describeBrowser('launch application in Chromium', () => {
  let browser: Browser
  let application: Awaited<ReturnType<typeof startTestApplication>>

  beforeAll(async () => {
    application = await startTestApplication({ fakeRunIntervalMs: 1_000 })
    browser = await chromium.launch({ headless: true })
  })

  afterAll(async () => {
    try {
      await browser?.close()
    } finally {
      await application?.close()
    }
  })

  test('runs, steers, reloads without replay duplicates, and downloads a PSD', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    try {
      await page.goto(application.origin)
      await page.getByRole('button', { name: 'Retouch a photo' }).click()
      await page.getByRole('button', { name: EXAMPLE }).click()
      await expect(page.getByRole('textbox', { name: 'Retouching instruction' }).inputValue()).resolves.toBe(EXAMPLE)

      const sentinel = 'sk-browser-test-sentinel'
      await page.getByRole('textbox', { name: 'OpenAI API key (optional)' }).fill(sentinel)
      await page.getByRole('button', { name: 'Use the sample photograph' }).click()
      await page.getByAltText('Selected source: layerhand-sample.png').waitFor()
      await expect(page.getByRole('textbox', { name: 'Retouching instruction' }).inputValue()).resolves.toBe(EXAMPLE)
      await expect(page.getByRole('textbox', { name: 'OpenAI API key (optional)' }).inputValue()).resolves.toBe(
        sentinel
      )
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.locator('[data-view="running"]').waitFor()

      const stored = await page.evaluate(() => ({ ...sessionStorage }))
      expect(Object.keys(stored)).toEqual(['layerhand.runId'])
      expect(JSON.stringify(stored)).not.toContain(sentinel)
      expect(await page.locator('#api-key').count()).toBe(0)

      const correction = 'Keep the label unchanged'
      const field = page.getByRole('textbox', { name: 'Correct the next action' })
      await field.fill(correction)
      await page.getByRole('button', { name: 'Send correction' }).click()
      await page.getByText(`Correction applied: ${correction}`).waitFor({ timeout: 3_000 })

      await page.reload()
      await page.locator('[data-view="running"]').waitFor()
      expect(await page.getByText(`Correction applied: ${correction}`).count()).toBe(1)
      await page.getByRole('heading', { name: 'Your layered file is ready.' }).waitFor({ timeout: 8_000 })

      const preview = page.getByAltText('Flattened preview of the retouched photograph')
      await preview.waitFor()
      expect(
        await page.evaluate(() => {
          const preview = document.querySelector('.result-preview')
          const layers = document.querySelector('.layer-list')
          return Boolean(
            preview && layers && preview.compareDocumentPosition(layers) & Node.DOCUMENT_POSITION_FOLLOWING
          )
        })
      ).toBe(true)
      await page.getByText('Warm highlights', { exact: true }).waitFor()
      await page.getByText('adjustment', { exact: true }).waitFor()

      const pendingDownload = page.waitForEvent('download')
      await page.getByRole('link', { name: 'Download layered PSD' }).click()
      const download = await pendingDownload
      const path = await download.path()
      expect(path).not.toBeNull()
      const bytes = await Bun.file(path!).bytes()
      expect(new TextDecoder().decode(bytes.subarray(0, 4))).toBe('8BPS')
    } finally {
      await page.close()
    }
  }, 20_000)

  test('cancels and keeps a partial layered result', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    try {
      await openInput(page, application.origin)
      await page.getByRole('textbox', { name: 'Retouching instruction' }).fill('Remove the background')
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.getByRole('button', { name: 'Cancel and keep work' }).click()

      await page.getByRole('heading', { name: 'Your partial layered file is ready.' }).waitFor()
      await page.getByText('You cancelled the run. Layerhand kept the work completed so far.').waitFor()
      await page.getByRole('link', { name: 'Download layered PSD' }).waitFor()
    } finally {
      await page.close()
    }
  })

  test('captures waitlist email and enforces the exact desktop boundary', async () => {
    const page = await browser.newPage({ viewport: { width: 1279, height: 800 } })
    try {
      await page.goto(application.origin)
      await expect(page.locator('#desktop-required').isVisible()).resolves.toBe(true)
      await expect(page.locator('#app').isVisible()).resolves.toBe(false)

      await page.setViewportSize({ width: 1280, height: 800 })
      await expect(page.locator('#desktop-required').isVisible()).resolves.toBe(false)
      await expect(page.locator('#app').isVisible()).resolves.toBe(true)

      await page.getByRole('textbox', { name: 'Email address' }).fill('AlaskanTuna@Example.COM')
      await page.getByRole('button', { name: 'Join waitlist' }).click()
      await page.getByText('You are on the list.').waitFor()
      await page.getByRole('button', { name: 'Retouch a photo' }).click()
      expect(await page.locator('.drop-zone').getAttribute('tabindex')).toBe('0')
    } finally {
      await page.close()
    }
  }, 10_000)

  test('labels a step-cap result incomplete', async () => {
    const capped = await startTestApplication({ fakeRunIntervalMs: 20, stepCap: 2 })
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    try {
      await openInput(page, capped.origin)
      await page.getByRole('textbox', { name: 'Retouching instruction' }).fill('Warm the highlights')
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.getByRole('heading', { name: 'Your partial layered file is ready.' }).waitFor()
      await page.getByText('The step cap was reached. Layerhand kept the work completed so far.').waitFor()
    } finally {
      await page.close()
      await capped.close()
    }
  })
})
