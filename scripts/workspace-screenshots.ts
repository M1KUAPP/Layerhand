// Issue #135 asks for before-and-after screenshots of every workspace state.
// This drives a scripted run in Chromium and saves one PNG per state and
// viewport into the directory given as its argument:
//
//   bun scripts/workspace-screenshots.ts <output-directory>
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import { chromium, type Browser, type Page } from 'playwright-core'

import { startTestApplication } from '../test/web/support/test-server'

const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 }
] as const

const SAMPLE_ALT = 'Selected source: layerhand-sample.png'
const INSTRUCTION = 'Remove the background and keep the product shadow.'

async function shot(page: Page, outDir: string, state: string, size: string): Promise<void> {
  await page.screenshot({ path: join(outDir, `${state}-${size}.png`) })
}

async function chooseSample(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Retouch a photo' }).click()
  await page.getByRole('button', { name: 'Use the sample photograph' }).click()
  await page.getByAltText(SAMPLE_ALT).waitFor()
}

async function startRun(page: Page, instruction: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Retouching instruction' }).fill(instruction)
  await page.getByRole('button', { name: 'Start retouching' }).click()
  await page.locator('[data-view="running"]').waitFor()
}

async function capture(browser: Browser, origin: string, outDir: string, viewport: (typeof VIEWPORTS)[number]) {
  const size = `${viewport.width}x${viewport.height}`
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  try {
    await page.goto(origin)
    await page.locator('html[data-enter="done"]').waitFor()
    await shot(page, outDir, 'landing', size)

    await chooseSample(page)
    await shot(page, outDir, 'input', size)

    await startRun(page, INSTRUCTION)
    await page.locator('#live-frame img').waitFor()
    await shot(page, outDir, 'running', size)

    await page.getByRole('heading', { name: 'Your layered file is ready.' }).waitFor({ timeout: 15_000 })
    await shot(page, outDir, 'result', size)

    // The error view is what a dropped live connection leaves behind: cut the
    // run API after the second run starts, and the stream's failure surfaces it.
    await page.getByRole('button', { name: 'Retouch another' }).click()
    await page.getByRole('button', { name: 'Use the sample photograph' }).click()
    await page.getByAltText(SAMPLE_ALT).waitFor()
    await page.route('**/api/runs/**', (route) => route.abort())
    await startRun(page, 'Warm the highlights')
    await page.locator('[data-view="error"]').waitFor({ timeout: 20_000 })
    await shot(page, outDir, 'error', size)
  } finally {
    await context.close()
  }
}

const outDir = process.argv[2]
if (!outDir) {
  console.error('usage: bun scripts/workspace-screenshots.ts <output-directory>')
  process.exit(1)
}
await mkdir(outDir, { recursive: true })

const application = await startTestApplication()
const browser = await chromium.launch({ headless: true })
try {
  for (const viewport of VIEWPORTS) {
    await capture(browser, application.origin, outDir, viewport)
  }
} finally {
  await browser.close()
  await application.close()
}
console.log(`Saved ${VIEWPORTS.length * 5} screenshots to ${outDir}`)
