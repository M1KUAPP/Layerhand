import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { chromium, type Browser } from 'playwright-core'

import { startTestApplication } from '../support/test-server'
import { openLanding, transformsOf } from './support'

const enabled = process.env.RUN_BROWSER_TESTS === '1'
const describeBrowser = enabled ? describe : describe.skip
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 }
]

describeBrowser('landing foundation in Chromium', () => {
  let browser: Browser
  let application: Awaited<ReturnType<typeof startTestApplication>>

  beforeAll(async () => {
    application = await startTestApplication()
    browser = await chromium.launch({ headless: true })
  })

  afterAll(async () => {
    try {
      await browser?.close()
    } finally {
      await application?.close()
    }
  })

  for (const viewport of VIEWPORTS) {
    const size = `${viewport.width}x${viewport.height}`

    test(`renders the header, hero and waitlist in order and starts a run at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        const inOrder = await page.evaluate(() => {
          const app = document.querySelector('#app')
          const header = app?.querySelector('.site-header')
          const hero = app?.querySelector('.landing-grid')
          const waitlist = app?.querySelector('.waitlist')
          return Boolean(
            header &&
            hero &&
            waitlist &&
            header.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING &&
            hero.compareDocumentPosition(waitlist) & Node.DOCUMENT_POSITION_FOLLOWING
          )
        })
        expect(inOrder).toBe(true)
        await page.getByRole('button', { name: 'Retouch a photo' }).click()
        await page.locator('[data-view="input"]').waitFor()
      } finally {
        await page.close()
      }
    })

    test(`loads Newsreader for display and Geist for UI at ${size}`, async () => {
      const page = await openLanding(browser, application.origin, { viewport })
      try {
        await page.evaluate(() => document.fonts.ready.then(() => undefined))
        const result = await page.evaluate(() => ({
          heading: getComputedStyle(document.querySelector('h1')!).fontFamily,
          body: getComputedStyle(document.body).fontFamily,
          loaded: document.fonts.check('500 16px Newsreader') && document.fonts.check('16px Geist')
        }))
        expect(result.heading.replace(/^["']/, '')).toMatch(/^Newsreader/)
        expect(result.body.replace(/^["']/, '')).toMatch(/^Geist/)
        expect(result.loaded).toBe(true)
      } finally {
        await page.close()
      }
    })

    test(`moves the entrance gate pending, run, done at ${size}`, async () => {
      const page = await browser.newPage({ viewport })
      try {
        await page.addInitScript(() => {
          const states: string[] = []
          const record = () => {
            const value = document.documentElement.dataset.enter
            if (value !== undefined && states[states.length - 1] !== value) states.push(value)
          }
          new MutationObserver(record).observe(document, {
            attributes: true,
            attributeFilter: ['data-enter'],
            subtree: true
          })
          ;(window as unknown as { enterStates: string[] }).enterStates = states
        })
        await page.goto(application.origin)
        await page.locator('html[data-enter="done"]').waitFor()
        const states = await page.evaluate(() => (window as unknown as { enterStates: string[] }).enterStates)
        expect(states).toEqual(['pending', 'run', 'done'])
      } finally {
        await page.close()
      }
    })

    test(`keeps .enter blocks still under reduced motion at ${size}`, async () => {
      const page = await browser.newPage({ viewport })
      try {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(application.origin)
        const before = await transformsOf(page, '.enter')
        await page.locator('html[data-enter="done"]').waitFor()
        const after = await transformsOf(page, '.enter')
        expect(after).toEqual(before)
        const filters = await page
          .locator('.enter')
          .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).filter))
        expect(filters.every((filter) => filter === 'none')).toBe(true)
      } finally {
        await page.close()
      }
    })
  }
})
