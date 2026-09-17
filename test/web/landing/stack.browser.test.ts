import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright-core'

import { startTestApplication } from '../support/test-server'
import { openLanding } from './support'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip
const DESKTOP = { width: 1440, height: 900 }

function frames(page: Page, count = 2): Promise<void> {
  return page.evaluate(
    (left) =>
      new Promise<void>((resolve) => {
        const next = (remaining: number) => {
          if (remaining <= 0) resolve()
          else requestAnimationFrame(() => next(remaining - 1))
        }
        next(left)
      }),
    count
  )
}

// Scrolls so the named section's top edge lands `target` pixels down the
// viewport, then gives sticky layout two frames to settle.
async function scrollSectionTopTo(page: Page, section: string, target: number): Promise<void> {
  await page.locator(`[data-section="${section}"]`).evaluate((element, y) => {
    window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - y)
  }, target)
  await frames(page)
}

// A pin taller than the viewport holds its bottom edge on the viewport's;
// a shorter one holds its top at 0.
async function expectPinned(page: Page, section: string): Promise<void> {
  const box = await page.locator(`[data-section="${section}"]`).boundingBox()
  const innerHeight = await page.evaluate(() => window.innerHeight)
  expect(box).not.toBeNull()
  if (box!.height >= innerHeight) {
    expect(Math.abs(box!.y + box!.height - innerHeight)).toBeLessThanOrEqual(2)
  } else {
    expect(Math.abs(box!.y)).toBeLessThanOrEqual(2)
  }
}

async function pointInside(page: Page, section: string, x: number, y: number): Promise<boolean> {
  return page.evaluate(
    ({ name, px, py }) => {
      const host = document.querySelector(`[data-section="${name}"]`)
      const hit = document.elementFromPoint(px, py)
      return host !== null && hit !== null && (hit === host || host.contains(hit))
    },
    { name: section, px: x, py: y }
  )
}

describeBrowser('landing stacked sections in Chromium', () => {
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

  test('wraps each pinned section with the sheet that rises over it', async () => {
    const page = await openLanding(browser, application.origin, { viewport: DESKTOP })
    try {
      const stacks = page.locator('.landing-body > .stack')
      expect(await stacks.count()).toBe(2)
      expect(
        await stacks.evaluateAll((elements) =>
          elements.map((stack) => [...stack.children].map((child) => (child as HTMLElement).dataset.section))
        )
      ).toEqual([
        ['steps', 'switcher'],
        ['drawer', 'glass']
      ])
      expect(await page.locator('[data-section="steps"]').getAttribute('data-stack')).toBe('pin')
      expect(await page.locator('[data-section="switcher"]').getAttribute('data-stack')).toBe('sheet')
      expect(await page.locator('[data-section="drawer"]').getAttribute('data-stack')).toBe('pin')
      expect(await page.locator('[data-section="glass"]').getAttribute('data-stack')).toBe('sheet')
    } finally {
      await page.close()
    }
  }, 30_000)

  test('pins the drawer at 1440px and not at 1279px', async () => {
    const wide = await openLanding(browser, application.origin, { viewport: DESKTOP })
    try {
      const position = await wide
        .locator('[data-section="drawer"]')
        .evaluate((element) => getComputedStyle(element).position)
      expect(position).toBe('sticky')
    } finally {
      await wide.close()
    }
    const narrow = await openLanding(browser, application.origin, {
      viewport: { width: 1279, height: 800 }
    })
    try {
      const position = await narrow
        .locator('[data-section="drawer"]')
        .evaluate((element) => getComputedStyle(element).position)
      expect(position).not.toBe('sticky')
    } finally {
      await narrow.close()
    }
  }, 30_000)

  test('lays the glass section over the pinned drawer', async () => {
    const page = await openLanding(browser, application.origin, { viewport: DESKTOP })
    try {
      await scrollSectionTopTo(page, 'glass', DESKTOP.height / 2)
      await expectPinned(page, 'drawer')
      expect(await pointInside(page, 'glass', 720, DESKTOP.height * 0.75)).toBe(true)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('lays the switcher over the pinned steps', async () => {
    const page = await openLanding(browser, application.origin, { viewport: DESKTOP })
    try {
      await scrollSectionTopTo(page, 'switcher', DESKTOP.height / 2)
      await expectPinned(page, 'steps')
      expect(await pointInside(page, 'switcher', 720, DESKTOP.height * 0.75)).toBe(true)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('lets the drawer go once the pair has scrolled past', async () => {
    const page = await openLanding(browser, application.origin, { viewport: DESKTOP })
    try {
      // The waitlist and footer below the pair are shorter than the
      // viewport, so the glass bottom never leaves the screen; at the
      // furthest scroll a released drawer rides with the pair's bottom
      // edge instead of holding on the viewport's.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await frames(page)
      const glass = await page.locator('[data-section="glass"]').boundingBox()
      const drawer = await page.locator('[data-section="drawer"]').boundingBox()
      const innerHeight = await page.evaluate(() => window.innerHeight)
      expect(glass).not.toBeNull()
      expect(drawer).not.toBeNull()
      expect(glass!.y + glass!.height).toBeLessThan(innerHeight)
      expect(Math.abs(drawer!.y + drawer!.height - (glass!.y + glass!.height))).toBeLessThanOrEqual(2)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('never covers the open layer sheet', async () => {
    const page = await openLanding(browser, application.origin, { viewport: DESKTOP })
    try {
      await scrollSectionTopTo(page, 'glass', DESKTOP.height / 2)
      // At this scroll position the open control sits under the glass half
      // of the screen, so the click is dispatched rather than pointed.
      await page.getByRole('button', { name: 'Show the layers' }).dispatchEvent('click')
      await page.locator('.drawer.is-open').waitFor()
      await page.waitForTimeout(500)
      const inside = await page.evaluate(() => {
        const sheet = document.querySelector('#drawer-sheet')
        if (!sheet) return false
        const box = sheet.getBoundingClientRect()
        const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
        return hit !== null && (hit === sheet || sheet.contains(hit))
      })
      expect(inside).toBe(true)
    } finally {
      await page.close()
    }
  }, 30_000)
})
