import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright-core'

import { startTestApplication } from './support/test-server'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip
const EXAMPLE = 'Clean the reflections without changing the label.'
// FR-2 allows up to 500 characters, and the progress rail renders the whole
// instruction (src/web/app.ts, progressRail). Long enough to force wrapping
// well past the rail's available height in a 260px-wide column.
const LONG_INSTRUCTION =
  'Remove the background, clean the reflections, and warm the highlights without changing the label. '
    .repeat(5)
    .slice(0, 450)
const REAL_FRAME_URL = new URL('../../src/editor/fixtures/photopea-frame.png', import.meta.url)
const samplePath = new URL('../../src/editor/fixtures/document-preview.png', import.meta.url)

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
      await page
        .locator('.correction-ack', { hasText: `Correction received: ${correction}` })
        .waitFor({ timeout: 3_000 })

      await page.reload()
      await page.locator('[data-view="running"]').waitFor()
      expect(await page.locator('.correction-ack', { hasText: `Correction received: ${correction}` }).count()).toBe(1)
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

  test('scopes live announcements and keeps focus through the core flow', async () => {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    try {
      await page.goto(application.origin)
      await expect(page.locator('#app').getAttribute('aria-live')).resolves.toBeNull()
      await expect(page.locator('#desktop-required').getAttribute('role')).resolves.toBeNull()
      await expect(page.locator('.waitlist__status').getAttribute('role')).resolves.toBeNull()

      await page.getByRole('button', { name: 'Retouch a photo' }).click()
      await expect(page.evaluate(() => document.activeElement?.id)).resolves.toBe('input-title')
      for (const selector of ['#source-image-error', '#instruction-error', '#api-key-error', '.form-error']) {
        await expect(page.locator(selector).getAttribute('role')).resolves.toBeNull()
      }
      await expect(
        page.getByRole('button', { name: 'Use the sample photograph' }).getAttribute('aria-describedby')
      ).resolves.toBe('source-image-error')
      await expect(
        page.getByRole('button', { name: 'Start retouching' }).getAttribute('aria-describedby')
      ).resolves.toBe('run-form-error')

      const sample = page.getByRole('button', { name: 'Use the sample photograph' })
      await sample.click()
      await page.getByAltText('Selected source: layerhand-sample.png').waitFor()
      await expect(page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.action)).resolves.toBe(
        'sample'
      )

      await page.getByRole('button', { name: EXAMPLE }).click()
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.locator('[data-view="running"]').waitFor()
      await expect(page.evaluate(() => document.activeElement?.id)).resolves.toBe('correction')
      await expect(page.locator('.progress-rail').getAttribute('aria-live')).resolves.toBe('polite')
      const correctionAnnouncer = page.locator('#correction-announcer')
      await expect(correctionAnnouncer.getAttribute('aria-live')).resolves.toBe('polite')
      await correctionAnnouncer.evaluate((element) => {
        element.dataset.identityProbe = 'persistent'
      })

      await page.locator('#correction').fill('Keep the label unchanged')
      await page.getByRole('button', { name: 'Send correction' }).click()
      const acknowledgement = page.locator('.correction-ack', {
        hasText: 'Correction received: Keep the label unchanged'
      })
      await acknowledgement.waitFor({ timeout: 3_000 })
      await expect(acknowledgement.getAttribute('aria-live')).resolves.toBeNull()
      await expect(correctionAnnouncer.textContent()).resolves.toBe('Correction received: Keep the label unchanged')
      await expect(correctionAnnouncer.getAttribute('data-identity-probe')).resolves.toBe('persistent')

      await page.getByRole('heading', { name: 'Your layered file is ready.' }).waitFor({ timeout: 8_000 })
      await expect(page.evaluate(() => document.activeElement?.id)).resolves.toBe('result-title')

      await page.getByRole('button', { name: 'Return to Layerhand' }).click()
      await expect(page.evaluate(() => document.activeElement?.id)).resolves.toBe('hero-title')
    } finally {
      await page.close()
    }
  }, 30_000)

  test('focuses the error heading when a saved run cannot be restored', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    try {
      await page.addInitScript(() => sessionStorage.setItem('layerhand.runId', 'missing-run'))
      await page.goto(application.origin)
      await page.getByRole('heading', { name: 'The retouching run stopped.' }).waitFor()
      await expect(page.evaluate(() => document.activeElement?.id)).resolves.toBe('error-title')
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

  test('keeps the correction field, acknowledgements, and progress rail in the viewport at 1280x800', async () => {
    const viewport = { width: 1280, height: 800 }
    const page = await browser.newPage({ viewport })
    try {
      await openInput(page, application.origin)
      await page.getByRole('textbox', { name: 'Retouching instruction' }).fill(LONG_INSTRUCTION)
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.locator('[data-view="running"]').waitFor()
      await page.locator('#live-frame img').waitFor({ timeout: 5_000 })

      const field = page.getByRole('textbox', { name: 'Correct the next action' })
      const send = page.getByRole('button', { name: 'Send correction' })
      for (const correction of ['Keep the label unchanged', 'Warm the shadow slightly']) {
        await field.fill(correction)
        await send.click()
        await page
          .locator('.correction-ack', { hasText: `Correction received: ${correction}` })
          .waitFor({ timeout: 3_000 })
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
        const field = document.querySelector('#correction')
        const fieldRect = field?.getBoundingClientRect() ?? null
        const topElementAtField = fieldRect
          ? document.elementFromPoint(fieldRect.x + fieldRect.width / 2, fieldRect.y + fieldRect.height / 2)
          : null
        return {
          field: rect(field),
          notices: rect(document.querySelector('#run-notices')),
          lastAck: rect(acks[acks.length - 1] ?? null),
          rail: rect(document.querySelector('.progress-rail')),
          layout: rect(document.querySelector('.running-layout')),
          fieldUnobstructed: Boolean(field && topElementAtField && field.contains(topElementAtField))
        }
      }, realFrameDataUrl)

      expectBoxInViewport(boxes.field, viewport.height)
      expectBoxInViewport(boxes.notices, viewport.height)
      expectBoxInViewport(boxes.lastAck, viewport.height)
      expect(boxes.rail).not.toBeNull()
      expect(boxes.layout).not.toBeNull()
      // The rail renders the whole instruction (FR-2, up to 500 characters);
      // it must scroll inside its own box rather than grow the row and
      // overflow past running-layout's bottom edge, onto the correction form.
      expect(boxes.rail!.y + boxes.rail!.height).toBeLessThanOrEqual(boxes.layout!.y + boxes.layout!.height)
      expect(boxes.fieldUnobstructed).toBe(true)

      await page.getByRole('button', { name: 'Cancel and keep work' }).click()
      await page.getByRole('heading', { name: 'Your partial layered file is ready.' }).waitFor()
    } finally {
      await page.close()
    }
  }, 10_000)

  test('does not pull a scrolled-up notices list back down on an unrelated tick', async () => {
    // A slow interval keeps the run in progress for several seconds, so
    // there is room to send corrections and observe an unrelated tick
    // without the script (5 steps) ending the run first.
    const slow = await startTestApplication({ fakeRunIntervalMs: 1_500 })
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    try {
      await openInput(page, slow.origin)
      await page.getByRole('textbox', { name: 'Retouching instruction' }).fill('Remove the background')
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.locator('[data-view="running"]').waitFor()

      const field = page.getByRole('textbox', { name: 'Correct the next action' })
      const send = page.getByRole('button', { name: 'Send correction' })
      const corrections = [
        'Keep the label unchanged',
        'Warm the shadow slightly',
        'Do not touch the reflection',
        'Preserve the original crop',
        'Keep the packaging color exact',
        'Leave the backdrop untouched'
      ]
      for (const correction of corrections) {
        await field.fill(correction)
        await send.click()
        await page
          .locator('.correction-ack', { hasText: `Correction received: ${correction}` })
          .waitFor({ timeout: 3_000 })
      }

      const notices = page.locator('#run-notices')
      // Six acknowledgements overflow the box's bounded height (styles.css),
      // so scrolling away from the bottom is meaningful.
      expect(await notices.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)

      // Read the current step and reset the scroll position in one call, so
      // no tick can land between the read and the reset.
      const currentStep = await page.evaluate(() => {
        const stepText = document.querySelector('#run-step')?.textContent ?? ''
        const container = document.querySelector<HTMLElement>('#run-notices')
        if (container) container.scrollTop = 0
        return Number(/Step (\d+) of/.exec(stepText)?.[1] ?? 0)
      })

      // Wait for the next step/frame/cost tick, which touches no notice, and
      // confirm it did not pull the scrolled-up view back to the newest one.
      await page.getByText(`Step ${currentStep + 1} of`, { exact: false }).waitFor({ timeout: 3_000 })
      expect(await notices.evaluate((el) => el.scrollTop)).toBe(0)
    } finally {
      await page.close()
      await slow.close()
    }
  }, 20_000)

  test('captures waitlist email below 1280 px and enforces the exact desktop boundary for the workbench', async () => {
    const page = await browser.newPage({ viewport: { width: 1279, height: 800 } })
    try {
      await page.goto(application.origin)
      // The landing page itself is not desktop-gated (NFR-7, #128).
      await expect(page.locator('#desktop-required').isVisible()).resolves.toBe(false)
      await expect(page.locator('#app').isVisible()).resolves.toBe(true)

      await page.getByRole('textbox', { name: 'Email address' }).fill('AlaskanTuna@Example.COM')
      await page.getByRole('button', { name: 'Email me the recording' }).click()
      await page.getByText('Thanks. The recording will come to that address.').waitFor()
      await page.getByRole('button', { name: 'Retouch a photo' }).click()

      // Only the workbench stays desktop-only, at the exact 1280 px boundary.
      await expect(page.locator('#desktop-required').isVisible()).resolves.toBe(true)
      await expect(page.locator('#app').isVisible()).resolves.toBe(false)

      await page.setViewportSize({ width: 1280, height: 800 })
      await expect(page.locator('#desktop-required').isVisible()).resolves.toBe(false)
      await expect(page.locator('#app').isVisible()).resolves.toBe(true)

      const dropZone = page.locator('.drop-zone')
      expect(await dropZone.getAttribute('tabindex')).toBeNull()

      await page.getByRole('button', { name: 'Back', exact: true }).focus()
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => document.activeElement?.matches('input.file-input'))).toBe(true)
      const ring = await dropZone.evaluate((zone) => {
        const probe = document.createElement('div')
        probe.style.color = 'var(--ink)'
        document.body.append(probe)
        const ink = getComputedStyle(probe).color
        probe.remove()
        return { ink, outline: getComputedStyle(zone).outlineColor }
      })
      expect(ring.outline).toBe(ring.ink)

      await page.keyboard.press('Tab')
      expect(await dropZone.evaluate((zone) => zone.contains(document.activeElement))).toBe(false)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('offers a way back from the desktop gate on a phone', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    try {
      await page.goto(application.origin)
      await page.getByRole('button', { name: 'Retouch a photo' }).click()

      await expect(page.locator('#desktop-required').isVisible()).resolves.toBe(true)
      const back = page.getByRole('button', { name: 'Back to Layerhand' })
      const updates = page.locator('#desktop-required-updates')
      await expect(back.isVisible()).resolves.toBe(true)
      await expect(updates.isVisible()).resolves.toBe(true)

      await back.click()
      await page.locator('[data-section="hero"]').waitFor()
      await expect(page.locator('[data-section="hero"]').isVisible()).resolves.toBe(true)
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

  test('shows a queued run its place in line, lets it leave, and starts it without another click', async () => {
    // One run at a time, each slow enough to stay in flight.
    const busy = await startTestApplication({ fakeRunIntervalMs: 60_000, maxConcurrentRuns: 1 })
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const correction = page.getByRole('textbox', { name: 'Correct the next action' })
    const startQueuedRun = async () => {
      await openInput(page, busy.origin)
      await page.getByRole('textbox', { name: 'Retouching instruction' }).fill('Warm the highlights')
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.getByText('Number 1 in line. The run starts on its own.').waitFor()
    }
    try {
      // A run already in flight holds the only slot.
      const form = new FormData()
      form.set('image', new File([Bun.file(samplePath)], 'source.png', { type: 'image/png' }), 'source.png')
      form.set('filename', 'source.png')
      form.set('instruction', 'Remove the background')
      const holding = (await (await fetch(`${busy.origin}/api/runs`, { method: 'POST', body: form })).json()) as {
        runId: string
      }

      await startQueuedRun()
      await expect(page.locator('#run-action').textContent()).resolves.toBe('Waiting to start')
      await expect(correction.isDisabled()).resolves.toBe(true)
      await page.getByRole('button', { name: 'Leave the queue' }).click()
      await page.locator('[data-view="input"]').waitFor()
      await page.waitForFunction(() => sessionStorage.getItem('layerhand.runId') === null)

      await startQueuedRun()
      await fetch(`${busy.origin}/api/runs/${holding.runId}/cancel`, { method: 'POST' })
      await page.getByRole('button', { name: 'Cancel and keep work' }).waitFor()
      await expect(page.getByText('Preparing the editor…').count()).resolves.toBe(1)
      await expect(correction.isEnabled()).resolves.toBe(true)
    } finally {
      await page.close()
      await busy.close()
    }
  }, 30_000)

  test('points to the key field when OpenAI turns the key away', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    try {
      await page.route('**/api/runs', (route) =>
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'invalid_api_key',
            message: 'OpenAI did not accept this API key. Check the key and try again.'
          })
        })
      )
      await openInput(page, application.origin)
      await page.getByRole('textbox', { name: 'Retouching instruction' }).fill('Warm the highlights')
      await page.getByRole('textbox', { name: 'OpenAI API key (optional)' }).fill('sk-mistyped-key-000000')
      await page.getByRole('button', { name: 'Start retouching' }).click()

      await page.getByText('Check the OpenAI API key in this field.').waitFor({ timeout: 3_000 })
      await expect(page.evaluate(() => document.activeElement?.id)).resolves.toBe('api-key')
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

  test('disables the correction field and cancel button once a cancel is requested (#123)', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    try {
      await openInput(page, application.origin)
      await page.getByRole('textbox', { name: 'Retouching instruction' }).fill('Remove the background')
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.locator('[data-view="running"]').waitFor()

      // Hold the cancel request open so the run cannot actually end, and the
      // disabled state can be observed without racing the result view.
      await page.route('**/api/runs/*/cancel', () => {})
      await page.getByRole('button', { name: 'Cancel and keep work' }).click()

      await expect(page.getByRole('textbox', { name: 'Correct the next action' }).isDisabled()).resolves.toBe(true)
      await expect(page.getByRole('button', { name: 'Send correction' }).isDisabled()).resolves.toBe(true)
      await expect(page.getByRole('button', { name: 'Cancelling…' }).isDisabled()).resolves.toBe(true)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('shows an inline notice and keeps the running view when a correction is refused (#123)', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    try {
      await openInput(page, application.origin)
      await page.getByRole('textbox', { name: 'Retouching instruction' }).fill('Remove the background')
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.locator('[data-view="running"]').waitFor()

      await page.route('**/api/runs/*/steer', (route) =>
        route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'run_ended',
            message: 'The run is finishing, so the correction was not applied.'
          })
        })
      )
      await page.getByRole('textbox', { name: 'Correct the next action' }).fill('Keep the label unchanged')
      await page.getByRole('button', { name: 'Send correction' }).click()

      await page.getByText('The run is finishing, so the correction was not applied.').waitFor()
      await expect(page.locator('[data-view="running"]').count()).resolves.toBe(1)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('keeps the result when a correction is refused after done (#123)', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    try {
      await openInput(page, application.origin)
      await page.getByRole('textbox', { name: 'Retouching instruction' }).fill('Remove the background')
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.locator('[data-view="running"]').waitFor()

      // The correction's response is held until after the cancel below has
      // already ended the run, reproducing the race the issue describes.
      let releaseSteer: (() => void) | undefined
      const steerHeld = new Promise<void>((resolve) => {
        releaseSteer = resolve
      })
      await page.route('**/api/runs/*/steer', async (route) => {
        await steerHeld
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'run_ended', message: 'The run has already ended.' })
        })
      })

      await page.getByRole('textbox', { name: 'Correct the next action' }).fill('Keep the label unchanged')
      await page.getByRole('button', { name: 'Send correction' }).click()
      await page.getByRole('button', { name: 'Cancel and keep work' }).click()
      await page.getByRole('heading', { name: 'Your partial layered file is ready.' }).waitFor()

      releaseSteer?.()
      await page.getByText('The run has already ended.').waitFor()
      await page.getByRole('heading', { name: 'Your partial layered file is ready.' }).waitFor()
    } finally {
      await page.close()
    }
  }, 30_000)

  test('shows the connection-failure view when a correction never reaches the server (#123)', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    try {
      await openInput(page, application.origin)
      await page.getByRole('textbox', { name: 'Retouching instruction' }).fill('Remove the background')
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.locator('[data-view="running"]').waitFor()

      // The request never reaches the server at all, unlike the stated
      // refusals above: a real connection loss, not a refusal, so the run's
      // own "connection lost" error view must still appear (#123).
      await page.route('**/api/runs/*/steer', (route) => route.abort())
      await page.getByRole('textbox', { name: 'Correct the next action' }).fill('Keep the label unchanged')
      await page.getByRole('button', { name: 'Send correction' }).click()

      await page
        .getByText('The server could not be reached. Check your connection and try again.')
        .waitFor({ timeout: 3_000 })
      await expect(page.locator('[data-view="error"]').count()).resolves.toBe(1)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('offers to start over after a failed run, not a reconnect that repeats the failure (#126)', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    const runId = 'failed-fixture-126'
    try {
      await page.goto(application.origin)
      await page.route(`**/api/runs/${runId}`, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            runId,
            status: 'failed',
            steps: 3,
            cap: 40,
            narration: null,
            frameUrl: null,
            costUsd: 0.12,
            tokensIn: 1000,
            tokensOut: 200,
            lastEventId: 2,
            corrections: [],
            recoverableErrors: [],
            failureReason: 'The editor stopped responding.'
          })
        })
      )
      await page.evaluate((id) => sessionStorage.setItem('layerhand.runId', id), runId)
      await page.reload()

      await page.getByRole('heading', { name: 'The retouching run stopped.' }).waitFor()
      await page.getByText('The editor stopped responding.').waitFor()
      expect(await page.getByRole('button', { name: 'Reconnect to run' }).count()).toBe(0)
      await page.getByRole('button', { name: 'Start a new retouch' }).click()

      await page.locator('[data-view="input"]').waitFor()
      await page.waitForFunction(() => sessionStorage.getItem('layerhand.runId') === null)

      // The failed run must not come back on a further reload (#126).
      await page.reload()
      await page.getByRole('button', { name: 'Retouch a photo' }).waitFor()
      expect(await page.getByRole('heading', { name: 'The retouching run stopped.' }).count()).toBe(0)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('offers to start over when the run has aged out of the registry, not a reconnect that repeats the same refusal (#126)', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    const runId = 'expired-fixture-126'
    try {
      await page.goto(application.origin)
      // A stated server answer (a `RunApiError`), unlike a dropped
      // connection: the snapshot request reaches the server and it
      // refuses, so reconnecting would just repeat the same 404 (#126).
      await page.route(`**/api/runs/${runId}`, (route) =>
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ code: 'run_not_found', message: 'The requested run does not exist.' })
        })
      )
      await page.evaluate((id) => sessionStorage.setItem('layerhand.runId', id), runId)
      await page.reload()

      await page.getByRole('heading', { name: 'The retouching run stopped.' }).waitFor()
      await page.getByText('The requested run does not exist.').waitFor()
      expect(await page.getByRole('button', { name: 'Reconnect to run' }).count()).toBe(0)
      await page.getByRole('button', { name: 'Start a new retouch' }).waitFor()
      await page.waitForFunction(() => sessionStorage.getItem('layerhand.runId') === null)

      // The run the registry no longer has must not come back on a
      // further reload (#126).
      await page.reload()
      await page.getByRole('button', { name: 'Retouch a photo' }).waitFor()
      expect(await page.getByRole('heading', { name: 'The retouching run stopped.' }).count()).toBe(0)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('keeps the stored run id after a network failure on reload, so a reconnect can still restore it (#126)', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    const runId = 'network-blip-fixture-126'
    try {
      await page.goto(application.origin)
      // The request never reaches the server at all, unlike the stated
      // refusal above: a run possibly still going on the server must stay
      // reachable from a later reload (FR-14), so the stored id survives.
      await page.route(`**/api/runs/${runId}`, (route) => route.abort())
      await page.evaluate((id) => sessionStorage.setItem('layerhand.runId', id), runId)
      await page.reload()

      await page.getByRole('heading', { name: 'The retouching run stopped.' }).waitFor()
      await page.getByText('The server could not be reached. Check your connection and try again.').waitFor()
      await page.getByRole('button', { name: 'Reconnect to run' }).waitFor()
      expect(await page.getByRole('button', { name: 'Start a new retouch' }).count()).toBe(0)
      expect(await page.evaluate(() => sessionStorage.getItem('layerhand.runId'))).toBe(runId)
    } finally {
      await page.close()
    }
  }, 30_000)

  test('clears the stored run for "Retouch another", so a reload does not restore the old result (#126)', async () => {
    const fast = await startTestApplication({ fakeRunIntervalMs: 20, stepCap: 2 })
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    try {
      await openInput(page, fast.origin)
      await page.getByRole('textbox', { name: 'Retouching instruction' }).fill('Warm the highlights')
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.getByRole('heading', { name: 'Your partial layered file is ready.' }).waitFor()
      expect(await page.evaluate(() => sessionStorage.getItem('layerhand.runId'))).not.toBeNull()

      await page.getByRole('button', { name: 'Retouch another' }).click()
      await page.locator('[data-view="input"]').waitFor()
      await page.waitForFunction(() => sessionStorage.getItem('layerhand.runId') === null)

      // The previous result must not come back on a reload (#126).
      await page.reload()
      await page.getByRole('button', { name: 'Retouch a photo' }).waitFor()
      expect(await page.getByRole('heading', { name: 'Your partial layered file is ready.' }).count()).toBe(0)
    } finally {
      await page.close()
      await fast.close()
    }
  }, 30_000)

  test('asks for confirmation before leaving a live run, and only leaves when accepted (#126)', async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    let runId: string | null = null
    try {
      await openInput(page, application.origin)
      await page.getByRole('textbox', { name: 'Retouching instruction' }).fill('Warm the highlights')
      await page.getByRole('button', { name: 'Start retouching' }).click()
      await page.locator('[data-view="running"]').waitFor()
      runId = await page.evaluate(() => sessionStorage.getItem('layerhand.runId'))

      await page.getByRole('button', { name: 'Return to Layerhand' }).click()
      // Playwright auto-dismisses an unhandled dialog, so a dismissed
      // confirmation must not leave the run.
      await expect(page.locator('[data-view="running"]').count()).resolves.toBe(1)

      page.once('dialog', (dialog) => dialog.accept())
      await page.getByRole('button', { name: 'Return to Layerhand' }).click()
      await page.getByRole('button', { name: 'Retouch a photo' }).waitFor()
    } finally {
      if (runId) {
        await fetch(`${application.origin}/api/runs/${runId}/cancel`, { method: 'POST' }).catch(() => undefined)
      }
      await page.close()
    }
  }, 30_000)
})
