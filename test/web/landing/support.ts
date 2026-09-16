import type { Browser, Page } from 'playwright-core'

export interface LandingPageOptions {
  viewport: { width: number; height: number } // 1440x900 or 1280x800
  reducedMotion?: boolean
}

export async function openLanding(browser: Browser, origin: string, options: LandingPageOptions): Promise<Page> {
  const page = await browser.newPage({ viewport: options.viewport })
  if (options.reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(origin)
  await page.locator('html[data-enter="done"]').waitFor()
  return page
}

export async function transformsOf(page: Page, selector: string): Promise<string[]> {
  return page.locator(selector).evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element)
      return `${style.transform} ${style.translate}`
    })
  )
}
