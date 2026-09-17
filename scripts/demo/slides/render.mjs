// Slides are HTML rendered by the same browser that captures the product, so the
// deck and the app cannot drift apart on type, colour or spacing -- they read the
// same tokens. Screenshot rather than SVG export: web fonts and CJK glyphs need a
// real text engine, and this one is already a dependency.
//
// Pitch slides are optional: if DEMO_SLIDES is empty or unset, this script exits
// cleanly without error.

import { existsSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DIR = process.env.DEMO_DIR || join(tmpdir(), 'layerhand-demo')
const HERE = new URL('.', import.meta.url).pathname
const SUBTITLE_TOP = 852
const failures = []

// Slide assembly is optional. Exit cleanly if no slides are requested.
const rawSlides = (process.env.DEMO_SLIDES || '').trim()
if (!rawSlides) {
  console.log('No DEMO_SLIDES specified; skipping slide rendering (slides are optional).')
  process.exit(0)
}

// Prefer playwright installed into DEMO_DIR; fall back to local module resolution.
const require = createRequire(import.meta.url)
let chromium
try {
  chromium = createRequire(join(DIR, 'package.json'))('playwright').chromium
} catch {
  try {
    chromium = require('playwright').chromium
  } catch {
    console.error(`playwright not found in ${DIR} or local node_modules.`)
    console.error(`Install it into scratch: cd "${DIR}" && bun add -d playwright`)
    process.exit(1)
  }
}

mkdirSync(DIR, { recursive: true })

const browser = await chromium.launch({ channel: process.env.DEMO_CHANNEL || 'chrome' })
const page = await (
  await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  })
).newPage()

const SLIDES = rawSlides
  .split(/\s+/)
  .map((p) => p.split(':')[0])
  .filter(Boolean)

for (const name of SLIDES) {
  const slideHtmlPath = join(HERE, `${name}.html`)
  if (!existsSync(slideHtmlPath)) {
    failures.push(`${name}: slide HTML not found at ${slideHtmlPath}`)
    console.error(`missing slide HTML: ${slideHtmlPath}`)
    continue
  }

  await page.goto(`file://${slideHtmlPath}`, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
  const out = join(DIR, `slide-${name}.png`)
  await page.screenshot({ path: out })
  const empty = await page.evaluate(() => document.body.innerText.trim().length < 40)

  // The subtitle is burned in later, so a slide cannot see the thing that will cover
  // it. 852 is the measured top row of a two-line libass plate at MarginV=28 on a
  // 1080 frame -- not a guess, and not a number this file gets to choose.
  const floor = await page.evaluate(() => {
    let low = 0
    for (const el of document.querySelectorAll('body *')) {
      if (!el.textContent.trim() && !el.querySelector('svg, rect')) continue
      low = Math.max(low, el.getBoundingClientRect().bottom)
    }
    return Math.round(low)
  })
  const collides = floor > SUBTITLE_TOP
  if (collides) failures.push(`${name}: content reaches ${floor}, subtitle plate starts ${SUBTITLE_TOP}`)
  console.log(
    `${name}: ${out}  floor ${floor}/${SUBTITLE_TOP}${empty ? '  !! PAGE LOOKS EMPTY' : ''}${collides ? '  !! SUBTITLE COLLISION' : ''}`
  )
}
await browser.close()

if (failures.length) {
  console.error('\nslide rendering issues encountered:')
  for (const f of failures) console.error(`  ${f}`)
  process.exit(1)
}
