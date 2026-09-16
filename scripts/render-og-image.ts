// Renders the link preview banners from scripts/og-image.html: the light one
// that social sites show, and the dark one for the Product Hunt gallery. Both
// come from the page's tokens and fonts, so rerun this after either changes:
//
//   bun scripts/render-og-image.ts
import { join, resolve } from 'node:path'

import { chromium } from 'playwright-core'

const ROOT = resolve(import.meta.dir, '..')
const OUTPUTS = [
  { colorScheme: 'light', file: 'src/web/assets/og-image.png' },
  { colorScheme: 'dark', file: 'src/web/assets/og-image-dark.png' }
] as const

// A file:// page cannot load its fonts, so the repository is served locally.
const server = Bun.serve({
  port: 0,
  hostname: '127.0.0.1',
  fetch: (request) => new Response(Bun.file(join(ROOT, new URL(request.url).pathname)))
})
const browser = await chromium.launch({ headless: true })
try {
  for (const output of OUTPUTS) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, colorScheme: output.colorScheme })
    await page.goto(new URL('/scripts/og-image.html', server.url).href)
    const fontsLoaded = await page.evaluate(async () => {
      await document.fonts.ready
      return ['92px Newsreader', '600 22px Geist', '24px Geist'].every((font) => document.fonts.check(font))
    })
    if (!fontsLoaded) throw new Error('The banner fonts did not load, so the render would use a fallback face.')
    await page.screenshot({ path: join(ROOT, output.file) })
    await page.close()
    console.log(`wrote ${output.file}`)
  }
} finally {
  await browser.close()
  server.stop(true)
}
