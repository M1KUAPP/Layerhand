import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type Locator } from 'playwright-core'

import { startTestApplication } from '../support/test-server'
import { openLanding, transformsOf } from './support'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 }
]
const LAYER_NAMES = [
  'Original photograph',
  'Brighten the photograph',
  'Warm the colours',
  'Very subtle corner vignette'
]
const LAYER_GLYPHS = ['hgi-image-01', 'hgi-sliders-horizontal', 'hgi-sliders-horizontal', 'hgi-image-01']

const isFocused = (locator: Locator): Promise<boolean> =>
  locator.evaluate((element) => element === document.activeElement)

describeBrowser('landing drawer in Chromium', () => {
  let browser: Browser
  let application: Awaited<ReturnType<typeof startTestApplication>>

  beforeAll(async () => {
    const fs = await import('node:fs')
    const mark = (label: string) => fs.appendFileSync('/tmp/drawer-hook.log', `${label} ${Date.now()}\n`)
    mark('beforeAll start')
    application = await startTestApplication()
    mark('app started')
    browser = await chromium.launch({ headless: true })
    mark('browser launched')
  }, 15_000)

  afterAll(async () => {
    const fs = await import('node:fs')
    const mark = (label: string) => fs.appendFileSync('/tmp/drawer-hook.log', `${label} ${Date.now()}\n`)
    try {
      mark('browser.close start')
      await browser?.close()
      mark('browser.close done')
    } finally {
      mark('application.close start')
      await application?.close()
      mark('application.close done')
    }
  }, 15_000)

  test(`stacks the kind and mask under the name inside the sheet at 390x844`, async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 390, height: 844 } })
    try {
      const open = page.getByRole('button', { name: 'Show the layers' })
      await open.click()
      const sheet = page.locator('#drawer-sheet')
      await sheet.waitFor({ state: 'visible' })
      await page.waitForTimeout(600)
      const boxes = await page.evaluate(() => {
        const sheetBox = document.querySelector('.drawer__sheet')!.getBoundingClientRect()
        const cells = [...document.querySelectorAll('.drawer__layer-kind, .drawer__layer-mask')].map(
          (cell) => cell.getBoundingClientRect().right
        )
        return { sheetRight: sheetBox.right, cellRights: cells, scrollWidth: document.documentElement.scrollWidth }
      })
      for (const right of boxes.cellRights) {
        expect(right).toBeLessThanOrEqual(boxes.sheetRight)
      }
      expect(boxes.scrollWidth).toBe(390)
    } finally {
      await page.close()
    }
  }, 30_000)

  test(`locks the page behind the open sheet at 390x844`, async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 390, height: 844 } })
    try {
      const hasClass = () => page.evaluate(() => document.documentElement.classList.contains('drawer-open'))
      expect(await hasClass()).toBe(false)
      await page.getByRole('button', { name: 'Show the layers' }).click()
      await page.locator('#drawer-sheet').waitFor({ state: 'visible' })
      expect(await hasClass()).toBe(true)
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden')
      await page.keyboard.press('Escape')
      await page.locator('#drawer-sheet').waitFor({ state: 'hidden' })
      expect(await hasClass()).toBe(false)
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('visible')
    } finally {
      await page.close()
    }
  }, 30_000)

  for (const viewport of VIEWPORTS) {
    const size = `${viewport.width}x${viewport.height}`

    test(`shows the section copy with the sheet closed and unfocusable at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        const section = page.locator('[data-section="drawer"]')
        expect(await section.locator('.drawer__eyebrow').textContent()).toBe('From a real run')
        expect(await section.locator('.drawer__title').textContent()).toBe('Four layers, each named for what it does.')
        expect(await section.locator('.drawer__body').textContent()).toBe(
          'On September 15, Layerhand was asked to brighten a seascape, warm its colours and darken its corners. Partway through, it was told to keep the vignette very subtle. These are the layers in the PSD it handed back.'
        )
        const sheet = page.locator('#drawer-sheet')
        expect(await sheet.isVisible()).toBe(false)
        expect(await sheet.getAttribute('inert')).toBe('')
        const close = sheet.locator('.drawer__close')
        await close.evaluate((element) => (element as HTMLElement).focus())
        expect(await isFocused(close)).toBe(false)
      } finally {
        await page.close()
      }
    }, 15_000)

    test(`lists the four layer names beside the copy before the sheet opens at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        const section = page.locator('[data-section="drawer"]')
        const items = section.locator('.drawer__inline li')
        expect(await items.count()).toBe(4)
        for (const [index, name] of LAYER_NAMES.entries()) {
          const item = items.nth(index)
          expect(await item.textContent()).toBe(name)
          expect(await item.locator(`i.${LAYER_GLYPHS[index]}`).count()).toBe(1)
        }
        expect(await page.locator('#drawer-sheet').isVisible()).toBe(false)
      } finally {
        await page.close()
      }
    }, 15_000)

    test(`opens the sheet with the four layers in order at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        const open = page.getByRole('button', { name: 'Show the layers' })
        await open.click()
        const sheet = page.locator('#drawer-sheet')
        await sheet.waitFor({ state: 'visible' })
        expect(await open.getAttribute('aria-expanded')).toBe('true')
        expect(await sheet.locator('.drawer__sheet-title').textContent()).toBe('Layers in the exported PSD')
        expect(await sheet.locator('.drawer__meta').textContent()).toBe('16 steps · 3 min 13 s · one correction')
        expect(await sheet.locator('.drawer__order').textContent()).toBe('Bottom of the stack first')

        const rows = sheet.locator('.drawer__layer')
        expect(await rows.count()).toBe(4)
        for (const [index, name] of LAYER_NAMES.entries()) {
          expect(await rows.nth(index).locator('.drawer__layer-name').textContent()).toBe(name)
        }
        expect(await rows.nth(0).getAttribute('data-kind')).toBe('raster')
        expect(await rows.nth(0).locator('.drawer__layer-mask').textContent()).toBe('')
        expect(await rows.nth(1).getAttribute('data-kind')).toBe('adjustment')
        expect(await rows.nth(1).locator('.drawer__layer-mask').textContent()).toBe('With mask')
        expect(await rows.nth(2).getAttribute('data-kind')).toBe('adjustment')
        expect(await rows.nth(2).locator('.drawer__layer-mask').textContent()).toBe('With mask')
        expect(await rows.nth(3).getAttribute('data-kind')).toBe('raster')
        expect(await rows.nth(3).locator('.drawer__layer-mask').textContent()).toBe('')
        expect(await rows.nth(3).locator('.drawer__layer-note').textContent()).toBe(
          'Shaped by the correction sent mid-run: “Keep the vignette very subtle, and leave the middle of the photograph untouched.”'
        )
        const columns = await rows.evaluateAll((elements) =>
          elements.map((row) => ({
            kind: row.querySelector('.drawer__layer-kind')?.getBoundingClientRect().x,
            mask: row.querySelector('.drawer__layer-mask')?.getBoundingClientRect().x
          }))
        )
        for (const { kind, mask } of columns) {
          expect(kind).toBe(columns[0]?.kind)
          expect(mask).toBe(columns[0]?.mask)
        }
        expect(await isFocused(sheet.locator('.drawer__close'))).toBe(true)
      } finally {
        await page.close()
      }
    }, 15_000)

    for (const closer of ['Escape', 'the close button', 'a scrim click']) {
      test(`closes on ${closer} and returns focus to the open button at ${size}`, async () => {
        const page = await openLanding(browser, application.origin, { viewport })
        try {
          const open = page.getByRole('button', { name: 'Show the layers' })
          const sheet = page.locator('#drawer-sheet')
          await open.click()
          await sheet.waitFor({ state: 'visible' })
          if (closer === 'Escape') await page.keyboard.press('Escape')
          else if (closer === 'the close button') await sheet.locator('.drawer__close').click()
          else await page.mouse.click(40, 40)
          await sheet.waitFor({ state: 'hidden' })
          expect(await isFocused(open)).toBe(true)
          expect(await open.getAttribute('aria-expanded')).toBe('false')
          await page.waitForFunction(() => document.querySelector('#drawer-sheet')?.hasAttribute('inert'))
        } finally {
          await page.close()
        }
      }, 15_000)
    }

    test(`keeps the sheet still under reduced motion at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport, reducedMotion: true })
      try {
        const sheet = page.locator('#drawer-sheet')
        const translates = async () =>
          (await transformsOf(page, '#drawer-sheet')).map((value) => value.slice(value.indexOf(' ') + 1))
        for (const translate of await translates()) {
          expect(['none', '0px 0px']).toContain(translate)
        }
        await page.getByRole('button', { name: 'Show the layers' }).click()
        await sheet.waitFor({ state: 'visible' })
        expect(await sheet.locator('.drawer__layer').count()).toBe(4)
        for (const translate of await translates()) {
          expect(['none', '0px 0px']).toContain(translate)
        }
        const duration = await sheet.evaluate((element) => getComputedStyle(element).transitionDuration)
        expect(duration).not.toBe('0s')
      } finally {
        await page.close()
      }
    }, 15_000)
  }
})
