import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright-core'

import { startTestApplication } from './support/test-server'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip
const EXAMPLE = 'Clean the reflections without changing the label.'
const REAL_FRAME_URL = new URL('../../src/editor/fixtures/photopea-frame.png', import.meta.url)

async function openInput(page: Page, origin: string): Promise<void> {
  await page.goto(origin)
  await page.getByRole('button', { name: 'Retouch a photo' }).click()
  await page.getByRole('button', { name: 'Use the sample photograph' }).click()
  await page.getByAltText('Selected source: layerhand-sample.png').waitFor()
}

interface ViewportBox {
  y: number
  height: number
}

function expectBoxInViewport(box: ViewportBox | null, viewportHeight: number): void {
  expect(box).not.toBeNull()
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewportHeight)
}

describeBrowser('launch application in Google Chrome', () => {
  let browser: Browser
  let application: Awaited<ReturnType<typeof startTestApplication>>

  beforeAll(async () => {
    application = await startTestApplication({ fakeRunIntervalMs: 1_000 })
    browser = await chromium.launch({ channel: 'chrome', headless: true })
  }, 30_000)

  afterAll(async () => {
    try {
      await browser?.close()
    } finally {
      await application?.close()
    }
  }, 30_000)

  test('runs, steers, reloads without replay duplicates, and downloads a PSD', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    try {
      await page.goto(application.origin)
      await page.getByRole('button', { name: 'Retouch a photo' }).click()
      await page.getByRole('button', { name: EXAMPLE }).click()
      await expect(page.getByRole('textbox', { name: 'Retouching instruction' }).inputValue()).resolves.toBe(EXAMPLE)

      const sentinel = 'sk-browser-test-sentinel'
      await page.getByRole('textbox', { name: 'OpenAI API key (optional)' }).fill(sentinel)
      await page.getByRole('button', { name: 'Use the sample photograph' }).click()
      await page.getByAltText('Selected source: layerhand-sample.png').waitFor()
      await expect(page.getByRole('textbox', { name: 'Retouching instruction' }).inputValue()).resolves.toBe(EXAMPLE)
      await expect(page.getByRole('textbox', { name: 'OpenAI API key (optional)' }).inputValue()).resolves.toBe(
        sentinel
      )
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.locator('[data-view="running"]').waitFor()

      const stored = await page.evaluate(() => ({ ...sessionStorage }))
      expect(Object.keys(stored)).toEqual(['layerhand.runId', 'layerhand.instruction'])
      expect(JSON.stringify(stored)).not.toContain(sentinel)
      expect(await page.locator('#api-key').count()).toBe(0)

      const railText = await page.locator('.progress-rail').textContent()
      expect(railText).toContain('Run status')
      expect(railText).toContain('Spend')
      expect(railText).toContain(EXAMPLE)
      expect(railText).toMatch(/Step \d+ of 40/)
      expect(railText?.toLowerCase().match(/credits/g)).toHaveLength(1)

      const correction = 'Keep the label unchanged'
      const field = page.getByRole('textbox', { name: 'Correct the next action' })
      await field.fill(correction)
      await page.getByRole('button', { name: 'Send correction' }).click()
      await page.getByText(`Correction applied: ${correction}`).waitFor({ timeout: 3_000 })

      await page.reload()
      await page.locator('[data-view="running"]').waitFor()
      expect(await page.getByText(`Correction applied: ${correction}`).count()).toBe(1)
      await page.getByRole('heading', { name: 'Your layered file is ready.' }).waitFor({ timeout: 8_000 })

      const preview = page.getByAltText('Flattened preview of the retouched photograph')
      await preview.waitFor()
      expect(
        await page.evaluate(() => {
          const preview = document.querySelector('.result-preview')
          const layers = document.querySelector('.layer-list')
          return Boolean(
            preview && layers && preview.compareDocumentPosition(layers) & Node.DOCUMENT_POSITION_FOLLOWING
          )
        })
      ).toBe(true)
      await page.getByText('Warm highlights', { exact: true }).waitFor()
      await page.getByText('adjustment', { exact: true }).waitFor()
      const layerList = page.locator('.layer-list > ol')
      const layerText = await layerList.textContent()
      expect(layerText).toContain('Retouching group')
      expect(layerText).toContain('Background isolation')
      expect(layerText).toContain('group')
      expect(layerText).toContain('raster')
      expect(layerText).toContain('pixel mask')
      expect(
        await layerList.locator(':scope > li', { hasText: 'Retouching group' }).locator(':scope > ol').count()
      ).toBe(1)

      // Editors show the top layer first; the contract sends bottom to top.
      const topLayers = layerList.locator(':scope > li')
      expect(await topLayers.first().textContent()).toContain('Reflections removed')
      expect(await topLayers.last().textContent()).toContain('Original photograph')

      await page.getByRole('link', { name: 'Download flattened PNG' }).waitFor()
      await page.getByText('Download links expire after one hour.').waitFor()
      expect(await page.locator('.result-recap').textContent()).toContain(EXAMPLE)

      const pendingDownload = page.waitForEvent('download')
      await page.getByRole('link', { name: 'Download layered PSD' }).click()
      const download = await pendingDownload
      const path = await download.path()
      expect(path).not.toBeNull()
      const bytes = await Bun.file(path!).bytes()
      expect(new TextDecoder().decode(bytes.subarray(0, 4))).toBe('8BPS')
    } finally {
      await page.close()
    }
  }, 30_000)

  test('shows the whole photo in the drop zone and keeps Start in the first viewport', async () => {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1280, height: 800 }
    ]) {
      const page = await browser.newPage({ viewport })
      try {
        await openInput(page, application.origin)

        const preview = page.locator('.drop-zone .selected-preview')
        await expect(preview.count()).resolves.toBe(1)
        expect(await preview.evaluate((element) => getComputedStyle(element).objectFit)).toBe('contain')

        const box = await page.getByRole('button', { name: 'Start retouching' }).boundingBox()
        expect(box).not.toBeNull()
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
      } finally {
        await page.close()
      }
    }
  }, 30_000)

  test('drops the hover lift when reduced motion is requested', async () => {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      reducedMotion: 'reduce'
    })
    try {
      await page.goto(application.origin)
      const button = page.getByRole('button', { name: 'Retouch a photo' })
      await button.hover()
      expect(await button.evaluate((element) => getComputedStyle(element).translate)).toBe('none')
    } finally {
      await page.close()
    }
  }, 30_000)

  test('cancels and keeps a partial layered result', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    try {
      await openInput(page, application.origin)
      await page.getByRole('textbox', { name: 'Retouching instruction' }).fill('Remove the background')
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.getByRole('button', { name: 'Cancel and keep work' }).click()

      await page.getByRole('heading', { name: 'Your partial layered file is ready.' }).waitFor()
      await page.getByText('You cancelled the run. Layerhand kept the work completed so far.').waitFor()
      await page.getByRole('link', { name: 'Download layered PSD' }).waitFor()
    } finally {
      await page.close()
    }
  }, 30_000)

  test('keeps the correction field and its acknowledgements in the viewport at 1280x800', async () => {
    const viewport = { width: 1280, height: 800 }
    const page = await browser.newPage({ viewport })
    try {
      await openInput(page, application.origin)
      await page.getByRole('textbox', { name: 'Retouching instruction' }).fill('Remove the background')
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.locator('[data-view="running"]').waitFor()
      await page.locator('#live-frame img').waitFor({ timeout: 5_000 })

      const field = page.getByRole('textbox', { name: 'Correct the next action' })
      const send = page.getByRole('button', { name: 'Send correction' })
      for (const correction of ['Keep the label unchanged', 'Warm the shadow slightly']) {
        await field.fill(correction)
        await send.click()
        await page.getByText(`Correction applied: ${correction}`).waitFor({ timeout: 3_000 })
      }

      // fakeRun's placeholder frame is a few pixels across, too small to
      // reproduce the layout bug; swap in a real, photograph-sized frame
      // and measure in the same page.evaluate call, before the next
      // scripted tick can revert it.
      const realFrame = await Bun.file(REAL_FRAME_URL).bytes()
      const realFrameDataUrl = `data:image/png;base64,${Buffer.from(realFrame).toString('base64')}`
      const boxes = await page.evaluate(async (src) => {
        const img = document.querySelector<HTMLImageElement>('#live-frame img')
        if (img) {
          img.src = src
          await img.decode()
        }
        const rect = (el: Element | null) => {
          if (!el) return null
          const box = el.getBoundingClientRect()
          return { y: box.y, height: box.height }
        }
        const acks = document.querySelectorAll('.correction-ack')
        return {
          field: rect(document.querySelector('#correction')),
          notices: rect(document.querySelector('#run-notices')),
          lastAck: rect(acks[acks.length - 1] ?? null)
        }
      }, realFrameDataUrl)

      expectBoxInViewport(boxes.field, viewport.height)
      expectBoxInViewport(boxes.notices, viewport.height)
      expectBoxInViewport(boxes.lastAck, viewport.height)

      await page.getByRole('button', { name: 'Cancel and keep work' }).click()
      await page.getByRole('heading', { name: 'Your partial layered file is ready.' }).waitFor()
    } finally {
      await page.close()
    }
  }, 10_000)

  test('captures waitlist email and enforces the exact desktop boundary', async () => {
    const page = await browser.newPage({ viewport: { width: 1279, height: 800 } })
    try {
      await page.goto(application.origin)
      await expect(page.locator('#desktop-required').isVisible()).resolves.toBe(true)
      await expect(page.locator('#app').isVisible()).resolves.toBe(false)

      await page.setViewportSize({ width: 1280, height: 800 })
      await expect(page.locator('#desktop-required').isVisible()).resolves.toBe(false)
      await expect(page.locator('#app').isVisible()).resolves.toBe(true)

      await page.getByRole('textbox', { name: 'Email address' }).fill('AlaskanTuna@Example.COM')
      await page.getByRole('button', { name: 'Email me the recording' }).click()
      await page.getByText('Thanks. The recording will come to that address.').waitFor()
      await page.getByRole('button', { name: 'Retouch a photo' }).click()
      expect(await page.locator('.drop-zone').getAttribute('tabindex')).toBe('0')
    } finally {
      await page.close()
    }
  }, 30_000)

  test('rejects unusable image bytes when the file is chosen', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    try {
      await page.goto(application.origin)
      await page.getByRole('button', { name: 'Retouch a photo' }).click()
      await page.getByText('JPEG or PNG, up to 20 MB and 6000 px on the long edge.').waitFor()

      const input = page.locator('#source-image')
      await input.setInputFiles({
        name: 'image.png',
        mimeType: 'image/png',
        buffer: Buffer.from('not an image')
      })

      await page.getByText('Only JPEG and PNG images are supported.').waitFor()
      await expect(input.inputValue()).resolves.toBe('')
      expect((await input.getAttribute('aria-describedby'))?.split(' ')).toContain('source-image-error')
      await expect(page.getByText('image.png', { exact: true }).count()).resolves.toBe(0)
      await expect(page.locator('.selected-preview').count()).resolves.toBe(0)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('shows an empty instruction error beside the instruction field', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    try {
      await openInput(page, application.origin)
      await page.getByRole('button', { name: 'Start retouching' }).click()

      const instruction = page.getByRole('textbox', { name: 'Retouching instruction' })
      const error = page.locator('#instruction-error')
      await expect(error.textContent()).resolves.toBe('Enter a retouching instruction.')
      expect((await instruction.getAttribute('aria-describedby'))?.split(' ')).toContain('instruction-error')

      await instruction.fill('Keep the label unchanged')
      await expect(error.textContent()).resolves.toBe('')
      await expect(instruction.getAttribute('aria-invalid')).resolves.toBeNull()

      await instruction.fill('')
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await expect(error.textContent()).resolves.toBe('Enter a retouching instruction.')
      await page.getByRole('button', { name: EXAMPLE }).click()
      await expect(error.textContent()).resolves.toBe('')
      await expect(instruction.getAttribute('aria-invalid')).resolves.toBeNull()
    } finally {
      await page.close()
    }
  }, 30_000)

  test('labels a step-cap result incomplete', async () => {
    const capped = await startTestApplication({ fakeRunIntervalMs: 20, stepCap: 2 })
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    try {
      await openInput(page, capped.origin)
      await page.getByRole('textbox', { name: 'Retouching instruction' }).fill('Warm the highlights')
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.getByRole('heading', { name: 'Your partial layered file is ready.' }).waitFor()
      await page.getByText('The step cap was reached. Layerhand kept the work completed so far.').waitFor()
    } finally {
      await page.close()
      await capped.close()
    }
  }, 30_000)
})
