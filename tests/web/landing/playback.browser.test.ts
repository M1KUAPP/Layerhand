import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright-core'

import { startTestApplication } from '../support/test-server'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip
const VIEWPORT = { width: 1440, height: 900 }

const STEP_SENTENCES = [
  'I’ll inspect the editor and create the brightness adjustment.',
  'I’ll add Brightness/Contrast as an editable adjustment layer.',
  'I’ll gently brighten the scene while retaining its soft highlights.',
  'I’ll use restrained warmth and keep the vignette off the middle.',
  'I’ll name the warming layer clearly.',
  'I’ll label both adjustments and add a separate vignette layer.',
  'I’ll close the menu and check the final layered result.'
]
const CORRECTION_SENTENCE = 'Keep the vignette very subtle, and leave the middle of the photograph untouched.'
const STAT_VALUES = ['16', '3 min 13 s', '194 ms', '4']

// openLanding() navigates at once, but the fake clock has to be installed
// before navigation, so this mirrors it with page.clock.install() first.
// The entrance gate's rAFs and timers then run on the fake clock.
async function openWithClock(browser: Browser, origin: string, reducedMotion = false): Promise<Page> {
  const page = await browser.newPage({ viewport: VIEWPORT })
  if (reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.install()
  await page.goto(origin)
  await page.clock.runFor(3000)
  await page.locator('html[data-enter="done"]').waitFor()
  return page
}

const opacitiesOf = (page: Page, selector: string): Promise<string[]> =>
  page.locator(selector).evaluateAll((rows) => rows.map((row) => getComputedStyle(row).opacity))

const hiddenOf = (page: Page): Promise<string[]> =>
  page
    .locator('.switcher__layer')
    .evaluateAll((rows) => rows.map((row) => `${row.getAttribute('data-layer')}:${row.getAttribute('data-hidden')}`))

// IntersectionObserver callbacks are real tasks, not fake-clock timers, so
// each scroll waits a moment before the clock is advanced.
const OBSERVER_WAIT_MS = 150

describeBrowser('landing playback and switcher demo in Chromium', () => {
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

  test('plays the run log once it scrolls into view', async () => {
    const page = await openWithClock(browser, application.origin)
    try {
      const steps = page.locator('.drawer__step')
      expect(await steps.count()).toBe(9)
      expect(await opacitiesOf(page, '.drawer__step')).toEqual(new Array(9).fill('0'))
      await page.locator('.drawer__log').scrollIntoViewIfNeeded()
      await page.waitForTimeout(OBSERVER_WAIT_MS)
      await page.clock.runFor(4500)
      expect(await opacitiesOf(page, '.drawer__step')).toEqual(new Array(9).fill('1'))
      expect(await page.locator('.drawer__stat-count').allTextContents()).toEqual(STAT_VALUES)
      expect(await page.locator('.drawer__log').getAttribute('data-playback')).toBe('done')
    } finally {
      await page.close()
    }
  }, 30_000)

  test('keeps the whole log readable to assistive technology before it plays', async () => {
    const page = await openWithClock(browser, application.origin)
    try {
      const snapshot = await page.locator('.drawer__log').ariaSnapshot()
      for (const sentence of [...STEP_SENTENCES, CORRECTION_SENTENCE]) {
        expect(snapshot).toContain(sentence)
      }
    } finally {
      await page.close()
    }
  }, 30_000)

  test('shows the log rows and stat values at once under reduced motion', async () => {
    const page = await openWithClock(browser, application.origin, true)
    try {
      expect(await page.locator('.drawer__log').getAttribute('data-playback')).toBeNull()
      expect(await opacitiesOf(page, '.drawer__step')).toEqual(new Array(9).fill('1'))
      expect(await page.locator('.drawer__stat-count').allTextContents()).toEqual(STAT_VALUES)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('demonstrates the switcher while it sits in view', async () => {
    const page = await openWithClock(browser, application.origin)
    try {
      const section = page.locator('.switcher')
      const corners = section.locator('.switcher__layer[data-layer="corners"]')
      const warm = section.locator('.switcher__layer[data-layer="warm"]')
      await section.scrollIntoViewIfNeeded()
      await page.waitForTimeout(OBSERVER_WAIT_MS)
      await page.clock.runFor(2400)
      expect(await corners.getAttribute('data-hidden')).toBe('true')
      expect(await corners.getAttribute('data-demo')).toBe('active')
      await page.clock.runFor(2400)
      expect(await corners.getAttribute('data-hidden')).toBe('false')
      await page.clock.runFor(2400)
      expect(await warm.getAttribute('data-hidden')).toBe('true')
    } finally {
      await page.close()
    }
  }, 30_000)

  test('never writes the live region while it demonstrates itself', async () => {
    const page = await openWithClock(browser, application.origin)
    try {
      const hint = page.locator('.switcher__hint')
      const before = await hint.textContent()
      await page.locator('.switcher').scrollIntoViewIfNeeded()
      await page.waitForTimeout(OBSERVER_WAIT_MS)
      let sawFlat = false
      for (let step = 0; step < 10; step++) {
        await page.clock.runFor(2400)
        expect(await hint.textContent()).toBe(before)
        if ((await page.locator('.switcher__panel').getAttribute('data-mode')) === 'jpeg') sawFlat = true
      }
      expect(sawFlat).toBe(true)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('pauses the demo from its toggle', async () => {
    const page = await openWithClock(browser, application.origin)
    try {
      await page.locator('.switcher').scrollIntoViewIfNeeded()
      await page.waitForTimeout(OBSERVER_WAIT_MS)
      const toggle = page.locator('button.switcher__demo-toggle')
      await toggle.click()
      expect(await toggle.getAttribute('aria-label')).toBe('Play the demo')
      const before = await hiddenOf(page)
      await page.clock.runFor(7200)
      expect(await hiddenOf(page)).toEqual(before)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('ends the demo for good when the switcher is touched', async () => {
    const page = await openWithClock(browser, application.origin)
    try {
      const section = page.locator('.switcher')
      await section.scrollIntoViewIfNeeded()
      await page.waitForTimeout(OBSERVER_WAIT_MS)
      await section.getByRole('button', { name: 'Show Warm colours', exact: true }).click()
      expect(await page.locator('button.switcher__demo-toggle').count()).toBe(0)
      const expected = ['corners:false', 'warm:true', 'brighten:false', 'original:false']
      expect(await hiddenOf(page)).toEqual(expected)
      expect(await section.getByRole('button', { name: 'Layered PSD', exact: true }).getAttribute('aria-pressed')).toBe(
        'true'
      )
      await page.clock.runFor(7200)
      expect(await hiddenOf(page)).toEqual(expected)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('has no demo and no toggle under reduced motion', async () => {
    const page = await openWithClock(browser, application.origin, true)
    try {
      expect(await page.locator('button.switcher__demo-toggle').count()).toBe(0)
      await page.locator('.switcher').scrollIntoViewIfNeeded()
      await page.waitForTimeout(OBSERVER_WAIT_MS)
      const before = await hiddenOf(page)
      await page.clock.runFor(7200)
      expect(await hiddenOf(page)).toEqual(before)
    } finally {
      await page.close()
    }
  }, 30_000)
})
