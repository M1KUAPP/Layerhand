import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright-core'

import { startTestApplication } from './support/test-server'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip
const SCHEMES = ['light', 'dark'] as const
const VIEWPORT = { width: 1440, height: 900 }

// Reveals play as each section enters view, so the landing is scrolled to
// its end in steps before its surfaces are checked.
async function scrollToEnd(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
    for (let step = 0; step < 200; step += 1) {
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1) break
      window.scrollBy(0, 400)
      await sleep(800)
    }
    await sleep(800)
  })
}

// Every control, button-styled link and element bordered on all four sides
// is a surface: it paints an opaque fill, or it is glass with the blur over
// what is beneath it. Anything else fails with the element's description.
async function collectOffenders(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d')!
    const alphaOf = (element: HTMLElement): number => {
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = getComputedStyle(element).backgroundColor
      context.fillRect(0, 0, 1, 1)
      return context.getImageData(0, 0, 1, 1).data[3] ?? 0
    }
    const describe = (element: HTMLElement): string => {
      const classes = element.classList.length ? `.${[...element.classList].join('.')}` : ''
      const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80)
      return `${element.tagName.toLowerCase()}${classes}${text ? ` "${text}"` : ''}`
    }
    const candidates = [
      ...document.querySelectorAll<HTMLElement>('button, input, textarea, select, a, [class]')
    ].filter((element) => {
      const style = getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden') return false
      const box = element.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) return false
      const control = ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
      const buttonLink =
        element.tagName === 'A' && parseFloat(style.paddingLeft) >= 8 && parseFloat(style.borderTopWidth) > 0
      const boxed = ['Top', 'Right', 'Bottom', 'Left'].every(
        (side) => parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0
      )
      return control || buttonLink || boxed
    })
    const offenders: string[] = []
    for (const element of candidates) {
      // The switcher stage's illustration layers are not surfaces, nor is
      // the wordmark, the site's name set on the bar, and elements clipped
      // away for assistive technology are not painted.
      if (element.closest('.switcher__stage, canvas, svg, .wordmark')) continue
      const style = getComputedStyle(element)
      if (style.clip !== 'auto' || style.clipPath !== 'none') continue
      const box = element.getBoundingClientRect()
      if (box.width <= 1 && box.height <= 1) continue
      if (alphaOf(element) < 255 && style.backdropFilter === 'none') offenders.push(describe(element))
    }
    return offenders
  })
}

describeBrowser('solid or glass surfaces in Chromium', () => {
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
    test(`every landing surface is solid or glass (${colorScheme})`, async () => {
      const page = await browser.newPage({ viewport: VIEWPORT, colorScheme })
      try {
        await page.goto(application.origin)
        await page.locator('html[data-enter="done"]').waitFor()
        await scrollToEnd(page)
        expect(await collectOffenders(page)).toEqual([])
      } finally {
        await page.close()
      }
    }, 90_000)

    test(`every workbench surface is solid or glass (${colorScheme})`, async () => {
      const page = await browser.newPage({ viewport: VIEWPORT, colorScheme })
      try {
        await page.goto(application.origin)
        // The hero button enters with the gate; while it is unstable a
        // scroll to it lets the sliding body cover the pinned hero.
        await page.locator('html[data-enter="done"]').waitFor()
        await page.getByRole('button', { name: 'Retouch a photo' }).click()
        await page.locator('#input-title').waitFor()
        expect(await collectOffenders(page)).toEqual([])
      } finally {
        await page.close()
      }
    }, 60_000)
  }
})
