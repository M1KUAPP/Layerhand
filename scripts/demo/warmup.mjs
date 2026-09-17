// Warm the deployed page before Playwright creates a recorded page, so
// cold-start latency stays off-camera. One attempt checks /health and waits
// for the landing page's entrance to finish. It starts no run, because a run
// on the deployed service spends real money; the recording starts its own.

export async function warmTarget({ browser, web, log = console.log, attempts = 2 }) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let context
    try {
      context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
      const page = await context.newPage()
      page.setDefaultTimeout(90_000)
      const health = await page.goto(`${web}/health`, { waitUntil: 'domcontentloaded' })
      if (!health?.ok()) {
        throw new Error(health ? `/health answered ${health.status()}` : '/health gave no response')
      }
      await page.goto(web, { waitUntil: 'domcontentloaded' })
      await page.locator('html[data-enter="done"]').waitFor({ state: 'attached' })
      log('target warm-up complete (health answered, landing page ready)')
      return true
    } catch (error) {
      const state = attempt < attempts ? `retrying (${attempt}/${attempts})` : 'aborting capture'
      log(`target warm-up incomplete; ${state}: ${String(error).slice(0, 180)}`)
    } finally {
      if (context) await context.close()
    }
  }
  return false
}
