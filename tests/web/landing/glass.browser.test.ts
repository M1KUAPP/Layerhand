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
    browser = await chromium.launch({
      headless: true,
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    })
  })

  afterAll(async () => {
    try {
      await browser?.close()
    } finally {
      await application?.close()
    }
  })

  test('keeps the glass object square on a phone at 390x844', async () => {
    const noGpu = await chromium.launch({
      headless: true,
      args: ['--disable-gpu', '--disable-webgl']
    })
    try {
      const page = await openLanding(noGpu, application.origin, {
        viewport: { width: 390, height: 844 }
      })
      try {
        const section = page.locator('[data-section="glass"]')
        const object = section.locator('.glass__object')
        await section.locator('svg.glass__art').waitFor()
        // Exercise canvas layout even when WebGL cannot mount the renderer.
        await object.evaluate((host) => {
          const canvas = document.createElement('canvas')
          canvas.className = 'glass__canvas'
          host.append(canvas)
        })
        const canvas = object.locator('.glass__canvas')
        await canvas.waitFor({ timeout: 5000 })
        const box = await object.boundingBox()
        const sectionBox = await section.boundingBox()
        const canvasBox = await canvas.boundingBox()
        expect(box).not.toBeNull()
        expect(sectionBox).not.toBeNull()
        expect(canvasBox).not.toBeNull()
        console.info(`Glass section at 390px: ${sectionBox!.height}px`)
        expect(Math.abs(box!.height - box!.width)).toBeLessThanOrEqual(1)
        expect(box!.height).toBeLessThanOrEqual(358)
        expect(sectionBox!.height).toBeLessThan(1000)
        expect(Math.abs(canvasBox!.height - box!.height)).toBeLessThanOrEqual(1)
      } finally {
        await page.close()
      }
    } finally {
      await noGpu.close()
    }
  }, 30_000)

  test('aligns the three fact icons on one axis at 1440x900', async () => {
    const page = await openLanding(browser, application.origin, { viewport: { width: 1440, height: 900 } })
    try {
      const icons = page.locator('.glass__fact-icon')
      expect(await icons.count()).toBe(3)
      const boxes = await icons.evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect()
          const before = getComputedStyle(element, '::before')
          return {
            x: box.x,
            width: box.width,
            height: box.height,
            glyphWidth: Number.parseFloat(before.width) || box.width,
            glyphHeight: Number.parseFloat(before.height) || box.height
          }
        })
      )
      expect(boxes[0]?.width).toBe(40)
      expect(boxes[0]?.height).toBe(40)
      for (const box of boxes) {
        expect(Math.abs(box.x - boxes[0]!.x)).toBeLessThanOrEqual(1)
        expect(box.width).toBe(boxes[0]!.width)
        expect(box.height).toBe(boxes[0]!.height)
        const glyphXPad = (box.width - box.glyphWidth) / 2
        const glyphYPad = (box.height - box.glyphHeight) / 2
        expect(Math.abs(glyphXPad - glyphYPad) < 8 || box.glyphWidth === 40).toBe(true)
        expect(glyphXPad).toBeGreaterThanOrEqual(-1)
      }
    } finally {
      await page.close()
    }
  }, 30_000)

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

    test(`holds the flat svg still when the canvas joins it at ${size}`, async () => {
      // Without WebGL the canvas never mounts, so the test appends one beside
      // the svg as mountGlass does while three loads.
      const noGpu = await chromium.launch({
        headless: true,
        args: ['--disable-gpu', '--disable-webgl']
      })
      try {
        const page = await openLanding(noGpu, application.origin, { viewport })
        try {
          const art = page.locator('svg.glass__art')
          await art.waitFor()
          const before = await art.boundingBox()
          await page.locator('.glass__object').evaluate((host) => {
            const canvas = document.createElement('canvas')
            canvas.className = 'glass__canvas'
            host.append(canvas)
          })
          expect(await art.boundingBox()).toEqual(before)
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
