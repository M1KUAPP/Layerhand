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
        expect(await rows.nth(0).locator('.drawer__layer-mask').count()).toBe(0)
        expect(await rows.nth(1).getAttribute('data-kind')).toBe('adjustment')
        expect(await rows.nth(1).locator('.drawer__layer-mask').textContent()).toBe('With mask')
        expect(await rows.nth(2).getAttribute('data-kind')).toBe('adjustment')
        expect(await rows.nth(2).locator('.drawer__layer-mask').textContent()).toBe('With mask')
        expect(await rows.nth(3).getAttribute('data-kind')).toBe('raster')
        expect(await rows.nth(3).locator('.drawer__layer-note').textContent()).toBe(
          'Shaped by the correction sent mid-run: “Keep the vignette very subtle, and leave the middle of the photograph untouched.”'
        )
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
      } finally {
        await page.close()
      }
    }, 15_000)
  }
})
