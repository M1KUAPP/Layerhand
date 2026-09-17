// Demo capture. Records the page, not the screen: no window chrome, no
// notifications, identical on any machine.
//
// This file is the RUNNER and knows nothing about our product. It launches a
// browser, records video, and hands `walk.mjs` the tools to drive the page and
// mark beats. Everything product-specific lives in walk.mjs, which is the file
// you edit as the app changes.
//
// Writes beats.json alongside the capture: the wall-clock offset of every moment
// worth narrating. narrate.sh reads it, so narration lands on the beat even when
// a page gets slower. Hand-tuned millisecond offsets drift the moment anything
// upstream changes, and a narration that contradicts the picture is worse than
// silence.

import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { auditCapture, REQUIRED_BEATS } from './contract.mjs'

const DIR = process.env.DEMO_DIR || join(tmpdir(), 'layerhand-demo')
const WEB = process.env.DEMO_WEB || 'http://127.0.0.1:3000'
const OUT = join(DIR, 'capture')

// Prefer a playwright installed into DEMO_DIR, which is how the README sets this
// up: it pulls a browser and has no business in the app's dependency tree. Fall
// back to a repo-local copy if one is ever added, rather than failing.
const require = createRequire(import.meta.url)
let chromium
try {
  chromium = createRequire(join(DIR, 'package.json'))('playwright').chromium
} catch {
  chromium = require('playwright').chromium
}

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const beats = []
let started = 0
// A beat is a name and the offset it happened at. Call it AFTER the wait that
// settles the frame, so it points at what the viewer is actually looking at.
const mark = (name) => {
  const ms = Date.now() - started
  beats.push({ name, ms })
  console.log(`  ${String(ms).padStart(6)}ms  ${name}`)
}
const beat = (page, ms) => page.waitForTimeout(ms)

// Chromium is not installed for Playwright on every machine here, so this uses
// `channel: 'chrome'` -- the system Chrome. Drop the channel to use Playwright's
// own Chromium once `playwright install chromium` has been run.
const browser = await chromium.launch({ channel: process.env.DEMO_CHANNEL || 'chrome' })
const { walk } = await import('./walk.mjs')
if (process.env.DEMO_WARMUP !== '0') {
  const { warmTarget } = await import('./warmup.mjs')
  const warmed = await warmTarget({ browser, web: WEB })
  if (!warmed) {
    await browser.close()
    throw new Error('warm-up failed twice; capture refused')
  }
}
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: OUT, size: { width: 1440, height: 900 } }
})
const page = await ctx.newPage()
page.setDefaultTimeout(30000)
started = Date.now()

const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 120)))

// Every surface the walk is supposed to film, counted rather than assumed. A
// beat that silently does not render leaves a video that still plays and is
// missing the argument -- and the narration then reads a line over a picture
// that does not show it. walk.mjs sets these; a zero is a failed run.
const filmed = Object.fromEntries(REQUIRED_BEATS.map((name) => [name, 0]))
let walkError = null

try {
  await walk({ page, mark, beat: (ms) => beat(page, ms), filmed, WEB })
} catch (e) {
  walkError = e
  console.log(`  FAILED: ${String(e).slice(0, 200)}`)
} finally {
  const video = page.video()
  await ctx.close()
  await browser.close()
  if (video) {
    renameSync(await video.path(), join(DIR, 'capture.webm'))
    console.log(`video: ${join(DIR, 'capture.webm')}`)
  }
  writeFileSync(join(DIR, 'beats.json'), `${JSON.stringify(beats, null, 2)}\n`)

  // Named surfaces, reported individually. "The video looks fine" is not a check.
  const entries = Object.entries(filmed)
  const audit = auditCapture(beats, filmed)
  console.log(`surfaces filmed: ${entries.map(([k, v]) => `${k}=${v}`).join(' ')}`)
  if (audit.missing.length) {
    console.log(`  !! NOT FILMED: ${audit.missing.join(', ')} -- do not narrate these beats`)
  }
  if (!audit.ordered) {
    console.log(`  !! INVALID BEAT ORDER: ${audit.observed.join(' -> ')}`)
  }
  console.log(`console errors: ${errors.length}`)
  for (const e of errors.slice(0, 5)) {
    console.log(`  ! ${e}`)
  }
  if (walkError || !audit.complete) process.exitCode = 1
}
