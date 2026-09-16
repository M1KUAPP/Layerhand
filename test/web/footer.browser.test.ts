import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright-core'

import { openLanding } from './landing/support'
import { startTestApplication } from './support/test-server'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 }
]

function scrollAndSettle(page: Page, top: number): Promise<void> {
  return page.evaluate(
    (y) =>
      new Promise<void>((resolve) => {
        window.scrollTo(0, y)
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }),
    top
  )
}

// floor: how far the footer sits above the bottom of the viewport.
// uncovered: whether its middle is painted by the footer, not the page.
// fold: how far the footer's top sits below the bottom of the page.
function footerView(page: Page): Promise<{ floor: number; uncovered: boolean; fold: number }> {
  return page.evaluate(() => {
    const footer = document.querySelector('#site-footer')!
    const box = footer.getBoundingClientRect()
    return {
      floor: window.innerHeight - box.bottom,
      uncovered: footer.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)),
      fold: box.top - document.querySelector('#app')!.getBoundingClientRect().bottom
    }
  })
}

// At the top the footer waits on the floor under the page; at the end the
// page has lifted off it, and ends exactly where the footer begins.
async function expectFold(page: Page): Promise<void> {
  await scrollAndSettle(page, 0)
  const top = await footerView(page)
  expect(Math.abs(top.floor)).toBeLessThan(1)
  expect(top.uncovered).toBe(false)

  await scrollAndSettle(page, Number.MAX_SAFE_INTEGER)
  const end = await footerView(page)
  expect(Math.abs(end.floor)).toBeLessThan(1)
  expect(end.uncovered).toBe(true)
  expect(Math.abs(end.fold)).toBeLessThan(1)
}

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

  for (const viewport of VIEWPORTS) {
    const size = `${viewport.width}x${viewport.height}`

    test(`folds the landing over the footer at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        await expectFold(page)
      } finally {
        await page.close()
      }
    }, 30_000)
  }

  test('folds the workbench over the same footer', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      await page.getByRole('button', { name: 'Retouch a photo' }).click()
      await page.locator('#app[data-view="input"]').waitFor()
      await expectFold(page)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('scrolls to the footer when one of its links takes focus', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      await page.getByRole('link', { name: 'Source on GitHub' }).focus()
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      await expect(footerView(page)).resolves.toMatchObject({ uncovered: true })
    } finally {
      await page.close()
    }
  }, 30_000)

  test('leaves the footer in flow for print', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      await page.emulateMedia({ media: 'print' })
      await expect(page.locator('#site-footer').evaluate((node) => getComputedStyle(node).position)).resolves.toBe(
        'static'
      )
    } finally {
      await page.close()
    }
  }, 30_000)
})
