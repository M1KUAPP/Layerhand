import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser } from 'playwright-core'

import { startTestApplication } from '../support/test-server'
import { openLanding } from './support'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 }
]

describeBrowser('landing glass section in Chromium', () => {
  let browser: Browser
  let application: Awaited<ReturnType<typeof startTestApplication>>

  beforeAll(async () => {
    application = await startTestApplication()
    browser = await chromium.launch({ headless: true })
  })

  afterAll(async () => {
    try {
      await browser?.close()
    } finally {
      await application?.close()
    }
  })

  for (const viewport of VIEWPORTS) {
    const size = `${viewport.width}x${viewport.height}`

    test(`shows the eyebrow, headline, body and three facts at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        const section = page.locator('[data-section="glass"]')
        expect(await section.locator('.glass__eyebrow').textContent()).toBe('After the run')
        expect(await section.locator('.glass__title').textContent()).toBe('Still yours to edit.')
        expect(await section.locator('.glass__body').textContent()).toBe(
          'Nothing in the file is baked in. Open the PSD and carry on where the agent stopped.'
        )
        const facts = await section.locator('.glass__fact-title').allTextContents()
        expect(facts).toEqual(['Repaint a mask', 'Retune an adjustment', 'Hide a layer'])
        expect(await section.locator('.glass__fact').count()).toBe(3)
      } finally {
        await page.close()
      }
    }, 30_000)

    test(`swaps the flat svg for the glass canvas at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        await page.locator('canvas.glass__canvas').waitFor({ timeout: 5000 })
        await page.locator('svg.glass__art').waitFor({ state: 'detached', timeout: 5000 })
      } finally {
        await page.close()
      }
    }, 30_000)

    test(`keeps the flat svg when WebGL is unavailable at ${size}`, async () => {
      const noGpu = await chromium.launch({
        headless: true,
        args: ['--disable-gpu', '--disable-webgl']
      })
      try {
        const page = await openLanding(noGpu, application.origin, { viewport })
        try {
          const art = page.locator('svg.glass__art')
          await art.waitFor()
          expect(await art.locator('.glass__slab').count()).toBe(4)
          await page.waitForTimeout(1500)
          expect(await page.locator('canvas.glass__canvas').count()).toBe(0)
        } finally {
          await page.close()
        }
      } finally {
        await noGpu.close()
      }
    }, 30_000)

    test(`renders one still frame under reduced motion at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, {
        viewport,
        reducedMotion: true
      })
      try {
        await page.locator('canvas.glass__canvas').waitFor({ timeout: 5000 })
        await page.locator('svg.glass__art').waitFor({ state: 'detached', timeout: 5000 })
        const section = page.locator('[data-section="glass"]')
        await section.scrollIntoViewIfNeeded()
        await page.waitForTimeout(500)
        const first = await section.screenshot()
        await page.waitForTimeout(500)
        const second = await section.screenshot()
        expect(first.equals(second)).toBe(true)
      } finally {
        await page.close()
      }
    }, 30_000)
  }
})
