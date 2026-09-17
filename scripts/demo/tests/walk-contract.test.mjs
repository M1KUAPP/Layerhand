import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const walkSource = await readFile(new URL('../walk.mjs', import.meta.url), 'utf8')
const warmupSource = await readFile(new URL('../warmup.mjs', import.meta.url), 'utf8')
const narration = await readFile(new URL('../narration.txt', import.meta.url), 'utf8')
const contract = await import('../contract.mjs')
const walk = await import('../walk.mjs')

const REQUIRED_BEATS = ['landing', 'input', 'running', 'correction', 'applied', 'result', 'layers', 'end']

test('the recorded journey is the eight narrated beats, in order', () => {
  const narratedBeats = narration
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('|', 1)[0].trim())

  assert.deepEqual(narratedBeats, REQUIRED_BEATS)
  assert.deepEqual(contract.REQUIRED_BEATS, REQUIRED_BEATS)

  // beats.json is written by literal mark() calls, so count them in source
  // order: every required beat exactly once, nothing extra. The filmed flag
  // record.mjs audits must land right beside each one.
  const marked = [...walkSource.matchAll(/\bmark\('([a-z_]+)'\)/g)].map((m) => m[1])
  assert.deepEqual(marked, REQUIRED_BEATS)
  for (const name of REQUIRED_BEATS) {
    assert.ok(walkSource.includes(`filmed.${name} = 1`), `filmed.${name} is never set`)
  }
})

test('the walk drives the real Layerhand page', () => {
  assert.ok(walkSource.includes(`page.locator('html[data-enter="done"]')`))
  assert.ok(walkSource.includes("getByRole('button', { name: 'Retouch a photo' })"))
  assert.ok(walkSource.includes(`page.locator('[data-view="input"]')`))
  assert.ok(walkSource.includes("getByRole('button', { name: 'Use the sample photograph' })"))
  assert.ok(walkSource.includes("getByAltText('Selected source: layerhand-sample.png')"))
  assert.ok(walkSource.includes("getByRole('textbox', { name: 'Retouching instruction' })"))
  assert.ok(walkSource.includes("getByRole('button', { name: 'Start retouching' })"))
  assert.ok(walkSource.includes(`page.locator('[data-view="running"]')`))
  assert.ok(walkSource.includes("page.locator('#live-frame img')"))
  assert.ok(walkSource.includes("getByRole('textbox', { name: 'Correct the next action' })"))
  assert.ok(walkSource.includes("getByRole('button', { name: 'Send correction' })"))
  assert.ok(walkSource.includes("page.locator('.layer-list')"))
  assert.ok(walkSource.includes("getByRole('link', { name: 'Download layered PSD' })"))

  // The typed lines and the proof hooks are the interface this file owns:
  // the wording the camera watches, and the verification that the run really
  // did what the narration claims.
  assert.equal(walk.INSTRUCTION, 'Remove the background, warm the highlights, clean the reflections.')
  assert.equal(walk.CORRECTION, 'Keep the shadow.')
  assert.ok(walkSource.includes('pressSequentially(INSTRUCTION, { delay: 35 })'))
  assert.ok(walkSource.includes('pressSequentially(CORRECTION, { delay: 35 })'))
  assert.ok(walkSource.includes('verifyCorrectionApplied(page, CORRECTION)'))
  assert.ok(walkSource.includes('verifyLayeredResult(page)'))

  // One page, no routing: the walk navigates once, never stubs a request,
  // and every camera move goes through the smooth scroll.
  assert.equal([...walkSource.matchAll(/page\.goto\(/g)].length, 1)
  assert.doesNotMatch(walkSource, /page\.route\(|process\.env|scrollIntoViewIfNeeded/)
  assert.ok(warmupSource.includes('warmTarget'))
})

test('no trace of the donor product survives in the walk', () => {
  // The harness was copied from another product. Its vocabulary -- names,
  // providers, features, and domains -- must not reach Layerhand footage.
  const retired =
    /l[a]yak|a[i]syah|c[i]k|my[k]ad|gov\.my|r[e]nder|v[e]rcel|gu[e]st|d[a]shboard|[e]valuation|sch[e]me|pack[e]t|r[i]nggit/i
  assert.doesNotMatch(walkSource, retired)
})

test('beat pacing waits out the remainder of a line, never a fixed pause', () => {
  // The intervals are estimates from line length until the first narration
  // synthesis lands; what the contract pins is the arithmetic and that every
  // beat with a following line has one.
  assert.deepEqual(Object.keys(walk.MIN_BEAT_INTERVAL_MS), REQUIRED_BEATS.slice(0, -1))
  assert.equal(walk.remainingBeatDelay('landing', 4_000), 2_600)
  assert.equal(walk.remainingBeatDelay('landing', 6_600), 0)
  assert.equal(walk.remainingBeatDelay('landing', 7_000), 0)
  assert.equal(walk.remainingBeatDelay('layers', 6_000), 100)
  assert.equal(walk.remainingBeatDelay('end', 0), 0)
})
