import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright-core'

import { startTestApplication } from '../support/test-server'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip
const VIEWPORT = { width: 1440, height: 900 }

// The instruction the September 15 computer-tool run received, verbatim
// from docs/evidence/driving-mechanism/harness.ts.
const INSTRUCTION = [
  'Make three edits to this photograph, each on its own layer with a name that says what it does:',
  '1. Brighten it with a Levels, Curves, or Brightness/Contrast adjustment layer.',
  '2. Warm its colours with a Photo Filter or Color Balance adjustment layer.',
  '3. Darken the corners into a soft vignette on a new layer.'
].join('\n')
const LAYERS = ['Darken corners softly', 'Warm colours', 'Brighten photograph', 'Original photograph']

// The clock has to be in before the page's timers start, so this cannot go
// through openLanding(): install it between newPage() and goto().
async function openClockedLanding(browser: Browser, origin: string, reducedMotion = false): Promise<Page> {
  const page = await browser.newPage({ viewport: VIEWPORT })
  if (reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.clock.install()
  await page.goto(origin)
  await page.locator('.hero__replay').waitFor({ timeout: 10_000 })
  return page
}

// The replay starts counting when the page loads, and the fake clock has
// already moved through real load time by then, so the tests cannot assume
// a clean t=0. Instead they advance in quarter-second steps, at most two
// full 12-second loops, until the replay shows the phase they assert on.
async function advanceUntil(page: Page, reached: () => Promise<boolean>): Promise<void> {
  for (let advanced = 0; advanced < 24_000; advanced += 250) {
    if (await reached()) return
    await page.clock.runFor(250)
  }
  throw new Error('the replay never reached the expected point in its loop')
}

const promptText = (page: Page) => page.locator('.hero__replay-prompt .hero__replay-text')
const stepText = (page: Page) => page.locator('.hero__replay-step')

async function stepNumber(page: Page): Promise<number | null> {
  const match = /^Step (\d+) of 13$/.exec((await stepText(page).textContent()) ?? '')
  return match ? Number(match[1]) : null
}

describeBrowser('landing hero replay in Chromium', () => {
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

  test('types the run instruction over the still frame', async () => {
    const page = await openClockedLanding(browser, application.origin)
    try {
      await advanceUntil(page, async () => {
        const text = (await promptText(page).textContent()) ?? ''
        return text.length > 0 && text.length < INSTRUCTION.length
      })
      const text = (await promptText(page).textContent()) ?? ''
      expect(text.length).toBeGreaterThan(0)
      expect(INSTRUCTION.startsWith(text)).toBe(true)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('counts the run steps along the progress bar', async () => {
    const page = await openClockedLanding(browser, application.origin)
    try {
      // Stop inside the counting phase with at least three steps still to
      // go, so the number can rise across the reads below.
      await advanceUntil(page, async () => {
        const step = await stepNumber(page)
        return step !== null && step <= 10
      })
      const first = await stepNumber(page)
      expect(first).not.toBeNull()
      await page.clock.runFor(500)
      const second = await stepNumber(page)
      await page.clock.runFor(500)
      const third = await stepNumber(page)
      expect(second).toBeGreaterThan(first!)
      expect(third).toBeGreaterThan(second!)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('lists the four exported layers, top of the stack first', async () => {
    const page = await openClockedLanding(browser, application.origin)
    try {
      await advanceUntil(page, async () => (await page.locator('.hero__replay-layers li').count()) === 4)
      expect(await page.locator('.hero__replay-layers li').allTextContents()).toEqual(LAYERS)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('pauses and resumes the replay from its toggle', async () => {
    const page = await openClockedLanding(browser, application.origin)
    try {
      await advanceUntil(page, async () => (await stepNumber(page)) !== null)
      const toggle = page.locator('button.hero__replay-toggle')
      await toggle.click()
      expect(await toggle.getAttribute('aria-label')).toBe('Play the replay')
      const frozen = await stepText(page).textContent()
      await page.clock.runFor(3000)
      expect(await stepText(page).textContent()).toBe(frozen)
      await toggle.click()
      expect(await toggle.getAttribute('aria-label')).toBe('Pause the replay')
    } finally {
      await page.close()
    }
  }, 30_000)

  test('shows the finished state at once under reduced motion', async () => {
    const page = await openClockedLanding(browser, application.origin, true)
    try {
      expect(await stepText(page).textContent()).toBe('Step 13 of 13')
      expect(await page.locator('.hero__replay-layers li').allTextContents()).toEqual(LAYERS)
      expect(await promptText(page).textContent()).toBe(INSTRUCTION)
      expect(await page.locator('button.hero__replay-toggle').isHidden()).toBe(true)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('floats each replay panel as glass over the photograph', async () => {
    const page = await openClockedLanding(browser, application.origin)
    try {
      for (const panel of ['prompt', 'progress', 'layers', 'caption']) {
        const filter = await page
          .locator(`.hero__replay-${panel}`)
          .evaluate((element) => getComputedStyle(element).getPropertyValue('backdrop-filter'))
        expect(filter).toContain('blur')
      }
    } finally {
      await page.close()
    }
  }, 30_000)
})
