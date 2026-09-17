import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type Locator, type Page } from 'playwright-core'

import { startTestApplication } from './support/test-server'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip
const SCHEMES = ['light', 'dark'] as const

async function openInput(page: Page, origin: string): Promise<void> {
  await page.goto(origin)
  // A click on the sticky hero while it still enters retries with a forced
  // scroll, which slides the landing over the button for good.
  await page.locator('html[data-enter="done"]').waitFor()
  await page.getByRole('button', { name: 'Retouch a photo' }).click()
  await page.locator('#input-title').waitFor()
}

// Computed colours may arrive as oklab() or color(); drawing them through a
// canvas normalises them to rgba bytes a contrast formula can read.
async function rgbaOf(locator: Locator, property: string): Promise<number[]> {
  return locator.first().evaluate((element, name) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d')!
    context.fillStyle = getComputedStyle(element).getPropertyValue(name)
    context.fillRect(0, 0, 1, 1)
    return [...context.getImageData(0, 0, 1, 1).data]
  }, property)
}

async function rgba(page: Page, selector: string, property: string): Promise<number[]> {
  return rgbaOf(page.locator(selector), property)
}

function contrast(a: number[], b: number[]): number {
  const channel = (value: number) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const luminance = ([r, g, b]: number[]) => 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!)
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (high! + 0.05) / (low! + 0.05)
}

describeBrowser('workbench input view in Chromium', () => {
  let browser: Browser
  let application: Awaited<ReturnType<typeof startTestApplication>>

  beforeAll(async () => {
    application = await startTestApplication()
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-gpu', '--disable-webgl']
    })
  }, 30_000)

  afterAll(async () => {
    try {
      await browser?.close()
    } finally {
      await application?.close()
    }
  }, 30_000)

  for (const colorScheme of SCHEMES) {
    test(`Back is a button with a solid fill (${colorScheme})`, async () => {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme })
      try {
        await openInput(page, application.origin)
        const back = page.getByRole('button', { name: 'Back', exact: true })
        await back.waitFor()
        const background = await rgbaOf(back, 'background-color')
        expect(background[3]).toBe(255)
        const borderTop = await back.evaluate((element) => getComputedStyle(element).borderTopWidth)
        expect(parseFloat(borderTop)).toBeGreaterThanOrEqual(1)
      } finally {
        await page.close()
      }
    }, 30_000)

    test(`Start retouching stays readable while disabled (${colorScheme})`, async () => {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme })
      try {
        await openInput(page, application.origin)
        const submit = page.getByRole('button', { name: 'Start retouching' })
        await submit.waitFor()
        // The button is disabled only while a run starts, so disable it here
        // to check the palette it rests on then.
        await submit.evaluate((element) => {
          ;(element as HTMLButtonElement).disabled = true
        })
        expect(await submit.evaluate((element) => getComputedStyle(element).opacity)).toBe('1')
        const text = await rgbaOf(submit, 'color')
        const fill = await rgbaOf(submit, 'background-color')
        expect(contrast(text, fill)).toBeGreaterThanOrEqual(4.5)
      } finally {
        await page.close()
      }
    }, 30_000)

    test(`Start retouching is readable when enabled (${colorScheme})`, async () => {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme })
      try {
        await openInput(page, application.origin)
        await page.getByRole('button', { name: 'Use the sample photograph' }).click()
        await page.getByAltText('Selected source: layerhand-sample.png').waitFor()
        await page.getByRole('textbox', { name: 'Retouching instruction' }).fill('Warm the highlights')
        const submit = page.getByRole('button', { name: 'Start retouching' })
        expect(await submit.isDisabled()).toBe(false)
        const text = await rgbaOf(submit, 'color')
        const fill = await rgbaOf(submit, 'background-color')
        expect(contrast(text, fill)).toBeGreaterThanOrEqual(4.5)
      } finally {
        await page.close()
      }
    }, 30_000)

    test(`site bar is clear at the top and glass once scrolled (${colorScheme})`, async () => {
      const page = await browser.newPage({ viewport: { width: 1440, height: 600 }, colorScheme })
      try {
        await openInput(page, application.origin)
        expect(await page.evaluate(() => window.scrollY)).toBe(0)
        const atTop = await rgba(page, '.site-header', 'background-color')
        expect(atTop[3]).toBe(0)

        await page.evaluate(() => window.scrollTo(0, 400))
        await page.waitForFunction(() => document.documentElement.dataset.scrolled === 'true')
        const filter = await page
          .locator('.site-header')
          .evaluate((element) => getComputedStyle(element).backdropFilter)
        expect(filter).toContain('blur')
      } finally {
        await page.close()
      }
    }, 30_000)

    test(`form sits on a sketchboard card (${colorScheme})`, async () => {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme })
      try {
        await openInput(page, application.origin)
        const boardImage = await page
          .locator('.workbench-board')
          .evaluate((element) => getComputedStyle(element).backgroundImage)
        expect(boardImage).toContain('radial-gradient')
        const card = page.locator('.workbench-card')
        const fill = await rgbaOf(card, 'background-color')
        expect(fill[3]).toBe(255)
        const shadow = await card.evaluate((element) => getComputedStyle(element).boxShadow)
        expect(shadow).not.toBe('none')
      } finally {
        await page.close()
      }
    }, 30_000)

    test(`run guide follows the form (${colorScheme})`, async () => {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme })
      try {
        await openInput(page, application.origin)
        const steps = page.locator('.run-guide__step')
        expect(await steps.allTextContents()).toEqual([
          'Choose a photograph',
          'Say what you want',
          'Watch it work, and correct it',
          'Download the layered PSD'
        ])
        const states = () => Promise.all([0, 1, 2, 3].map((i) => steps.nth(i).getAttribute('data-state')))
        expect(await states()).toEqual(['current', 'upcoming', 'upcoming', 'upcoming'])

        await page.getByRole('button', { name: 'Use the sample photograph' }).click()
        await page.getByAltText('Selected source: layerhand-sample.png').waitFor()
        expect(await states()).toEqual(['done', 'current', 'upcoming', 'upcoming'])

        await page.getByRole('textbox', { name: 'Retouching instruction' }).fill('Warm the highlights')
        expect(await states()).toEqual(['done', 'done', 'current', 'upcoming'])
      } finally {
        await page.close()
      }
    }, 30_000)

    test(`lists the three run facts (${colorScheme})`, async () => {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme })
      try {
        await openInput(page, application.origin)
        expect(await page.locator('.run-facts li').allTextContents()).toEqual([
          'Three free runs',
          'Uploads deleted within 24 hours',
          'Your key is never stored'
        ])
      } finally {
        await page.close()
      }
    }, 30_000)
  }
})
