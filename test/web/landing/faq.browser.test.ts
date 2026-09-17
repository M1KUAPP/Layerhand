import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright-core'

import { startTestApplication } from '../support/test-server'
import { openLanding } from './support'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip

const EXPECTED_QUESTIONS = [
  'What do I get back?',
  'Which apps open the file?',
  'How long does a run take?',
  'Can I correct it while it works?',
  'What kind of retouching does it do?',
  'Do I need an account?',
  'What happens after the free runs?',
  'What happens to my photographs?',
  'Which photographs can I upload?',
  'What if a run stops early?'
]

const EXPECTED_SPANS = [6, 3, 3, 6, 3, 3, 4, 4, 4, 12]

async function getAlpha(page: Page, selector: string): Promise<number> {
  return page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d')!
      context.fillStyle = getComputedStyle(element).backgroundColor
      context.fillRect(0, 0, 1, 1)
      return context.getImageData(0, 0, 1, 1).data[3] ?? 0
    })
}

describeBrowser('landing faq section in Chromium', () => {
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

  test('follows glass and precedes waitlist in DOM, with nav link at 1440x900', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      // 1. Order: FAQ follows glass and precedes waitlist in DOM
      const order = await page.evaluate(() => {
        const body = document.querySelector('.landing-body')
        if (!body) return null
        const children = Array.from(body.children)
        const glassIndex = children.findIndex(
          (el) => el.matches('[data-section="glass"]') || el.querySelector('[data-section="glass"]')
        )
        const faqIndex = children.findIndex((el) => el.matches('#faq') || el.matches('[data-section="faq"]'))
        const waitlistIndex = children.findIndex(
          (el) =>
            el.matches('[data-section="waitlist"]') ||
            el.querySelector('[data-section="waitlist"]') ||
            el.matches('.waitlist')
        )
        return { glassIndex, faqIndex, waitlistIndex }
      })

      expect(order).not.toBeNull()
      expect(order!.glassIndex).toBeGreaterThanOrEqual(0)
      expect(order!.faqIndex).toBe(order!.glassIndex + 1)
      expect(order!.waitlistIndex).toBe(order!.faqIndex + 1)

      // 2. Nav holds a link named "FAQ" to #faq directly before "Updates"
      const navLinks = await page
        .locator('.site-nav a')
        .evaluateAll((links) =>
          links.map((link) => ({ text: link.textContent?.trim(), href: link.getAttribute('href') }))
        )
      const faqNavIndex = navLinks.findIndex((l) => l.text === 'FAQ' && l.href === '#faq')
      expect(faqNavIndex).toBeGreaterThan(-1)
      expect(navLinks[faqNavIndex + 1]).toEqual({ text: 'Updates', href: '#updates' })
    } finally {
      await page.close()
    }
  }, 30_000)

  test('renders eyebrow, title, ten tiles with initial open state and toggles at 1440x900', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      const section = page.locator('section#faq[data-section="faq"]')
      await section.waitFor()

      // 3. Eyebrow is "Questions" and title is "Before your first run."
      expect(await section.locator('.faq__eyebrow').textContent()).toBe('Questions')
      expect(await section.locator('h2.faq__title#faq-title').textContent()).toBe('Before your first run.')

      // 4. Ten tiles, whose questions are exactly the ten in the spec, in order
      const tiles = section.locator('details.faq__tile')
      expect(await tiles.count()).toBe(10)

      const questions = await tiles.locator('summary.faq__question').evaluateAll((elements) =>
        elements.map((el) => {
          // Clone and remove any child elements (like icons) to get pure question text
          const clone = el.cloneNode(true) as HTMLElement
          for (const icon of clone.querySelectorAll('i')) {
            icon.remove()
          }
          return clone.textContent?.trim() ?? ''
        })
      )
      expect(questions).toEqual(EXPECTED_QUESTIONS)

      // 5. Questions 1 and 4 are open at load and the others closed; clicking a closed question opens it
      for (let i = 0; i < 10; i++) {
        const isOpen = await tiles.nth(i).evaluate((el: HTMLDetailsElement) => el.open)
        if (i === 0 || i === 3) {
          expect(isOpen).toBe(true)
        } else {
          expect(isOpen).toBe(false)
        }
      }

      // Clicking closed question (index 1) opens it
      await tiles.nth(1).locator('summary.faq__question').click()
      expect(await tiles.nth(1).evaluate((el: HTMLDetailsElement) => el.open)).toBe(true)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('rendered widths follow the 12-column spans at 1440x900', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      const section = page.locator('section#faq[data-section="faq"]')
      const grid = section.locator('.faq__grid')
      await grid.waitFor()

      const gridBox = await grid.boundingBox()
      expect(gridBox).not.toBeNull()
      const gridWidth = gridBox!.width

      const gap = await grid.evaluate((el) => {
        const style = getComputedStyle(el)
        return parseFloat(style.columnGap || style.gap || '24')
      })

      const tiles = section.locator('details.faq__tile')
      // 6. At 1440x900, rendered widths follow spans within 2px of (gridWidth - 11 * gap) / 12 * span + (span - 1) * gap
      for (let i = 0; i < 10; i++) {
        const tileBox = await tiles.nth(i).boundingBox()
        expect(tileBox).not.toBeNull()
        const span = EXPECTED_SPANS[i]!
        const expectedWidth = ((gridWidth - 11 * gap) / 12) * span + (span - 1) * gap
        expect(Math.abs(tileBox!.width - expectedWidth)).toBeLessThanOrEqual(2)

        // 8. Each tile's background is solid: computed background-color has no alpha below 1
        const alpha = await tiles.nth(i).evaluate((el) => {
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = 1
          const context = canvas.getContext('2d')!
          context.fillStyle = getComputedStyle(el).backgroundColor
          context.fillRect(0, 0, 1, 1)
          return context.getImageData(0, 0, 1, 1).data[3] ?? 0
        })
        expect(alpha).toBe(255)
      }
    } finally {
      await page.close()
    }
  }, 30_000)

  test('every tile has full grid width at 390x844', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 390, height: 844 } })
    try {
      const section = page.locator('section#faq[data-section="faq"]')
      const grid = section.locator('.faq__grid')
      await grid.waitFor()

      const gridBox = await grid.boundingBox()
      expect(gridBox).not.toBeNull()
      const gridWidth = gridBox!.width

      const tiles = section.locator('details.faq__tile')
      expect(await tiles.count()).toBe(10)

      // 7. At 390x844, every tile has the grid's full width
      for (let i = 0; i < 10; i++) {
        const tileBox = await tiles.nth(i).boundingBox()
        expect(tileBox).not.toBeNull()
        expect(Math.abs(tileBox!.width - gridWidth)).toBeLessThanOrEqual(2)

        // Background is solid
        const alpha = await tiles.nth(i).evaluate((el) => {
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = 1
          const context = canvas.getContext('2d')!
          context.fillStyle = getComputedStyle(el).backgroundColor
          context.fillRect(0, 0, 1, 1)
          return context.getImageData(0, 0, 1, 1).data[3] ?? 0
        })
        expect(alpha).toBe(255)
      }
    } finally {
      await page.close()
    }
  }, 30_000)
})
