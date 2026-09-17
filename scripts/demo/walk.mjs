// Layerhand's demo walk follows one photograph from the landing page to a
// layered PSD: the instruction, the live run, a mid-run correction, and the
// named layers it ends on. record.mjs warms the target before this recorded
// page exists, so a cold server stays out of the footage.

import { smoothScrollTo } from './motion.mjs'
import { verifyCorrectionApplied, verifyLayeredResult } from './proof.mjs'

// The two lines the camera watches being typed.
export const INSTRUCTION = 'Remove the background, warm the highlights, clean the reflections.'
export const CORRECTION = 'Keep the shadow.'

// Estimated from line length and not yet measured against a voice; re-measure
// every value once the first narration synthesis exists. Slow navigation
// naturally contributes to the interval; a run that finishes a beat early is
// fine because mark() waits out only the remainder before the next mark --
// it never pauses the run to hit the estimate.
export const MIN_BEAT_INTERVAL_MS = Object.freeze({
  landing: 6_600,
  input: 5_400,
  running: 5_700,
  correction: 5_000,
  applied: 5_600,
  result: 4_900,
  layers: 6_100
})

export function remainingBeatDelay(previousBeat, elapsedMs) {
  return Math.max(0, Math.ceil((MIN_BEAT_INTERVAL_MS[previousBeat] ?? 0) - elapsedMs))
}

export async function walk({ page, mark: captureMark, beat, filmed, WEB }) {
  let previousBeat = null
  let previousBeatAt = 0
  const mark = async (name) => {
    if (previousBeat) {
      const delay = remainingBeatDelay(previousBeat, Date.now() - previousBeatAt)
      if (delay > 0) await beat(delay)
    }
    captureMark(name)
    previousBeat = name
    previousBeatAt = Date.now()
  }

  // 1. Land where a first-time visitor lands. The page reports its enter
  // transition done on <html>; the opening line plays over the settled page.
  await page.goto(WEB, { waitUntil: 'domcontentloaded' })
  await page.locator('html[data-enter="done"]').waitFor({ state: 'attached' })
  await beat(400)
  await mark('landing')
  filmed.landing = 1
  await beat(2_000)

  // 2. Open the input view, pick the shipped sample photograph, and type the
  // instruction at a human cadence so the keystrokes read on camera. The beat
  // lands on the finished sentence, not on the first keystroke.
  await page.getByRole('button', { name: 'Retouch a photo' }).click()
  await page.locator('[data-view="input"]').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Use the sample photograph' }).click()
  await page.getByAltText('Selected source: layerhand-sample.png').waitFor({ state: 'visible' })
  const instruction = page.getByRole('textbox', { name: 'Retouching instruction' })
  await instruction.waitFor({ state: 'visible' })
  await smoothScrollTo(page, instruction)
  await beat(300)
  await instruction.pressSequentially(INSTRUCTION, { delay: 35 })
  await mark('input')
  filmed.input = 1
  await beat(1_400)

  // 3. Start the retouch and hold on the live editor once its first frame
  // arrives; that frame is the proof that an agent is really driving it.
  await page.getByRole('button', { name: 'Start retouching' }).click()
  await page.locator('[data-view="running"]').waitFor({ state: 'visible' })
  const liveFrame = page.locator('#live-frame img')
  await liveFrame.waitFor({ state: 'visible', timeout: 60_000 })
  await smoothScrollTo(page, liveFrame)
  await beat(300)
  await mark('running')
  filmed.running = 1
  await beat(3_000)

  // 4. Type the mid-run correction at the same cadence. The beat lands when
  // the text is complete; sending it is the first thing seen after the mark.
  const correctionBox = page.getByRole('textbox', { name: 'Correct the next action' })
  await correctionBox.waitFor({ state: 'visible' })
  await smoothScrollTo(page, correctionBox)
  await beat(250)
  await correctionBox.pressSequentially(CORRECTION, { delay: 35 })
  await mark('correction')
  filmed.correction = 1
  await beat(700)
  await page.getByRole('button', { name: 'Send correction' }).click()

  // 5. proof.mjs waits for the page's own confirmation that the run absorbed
  // the correction and carried on instead of restarting.
  await verifyCorrectionApplied(page, CORRECTION)
  const appliedNote = page.locator('.correction-ack', { hasText: `Correction received: ${CORRECTION}` })
  await smoothScrollTo(page, appliedNote)
  await beat(300)
  await mark('applied')
  filmed.applied = 1
  await beat(1_600)

  // 6. The run completes: proof.mjs verifies the ready heading, audits the
  // layer names, and checks both downloads before the camera moves.
  const { layers } = await verifyLayeredResult(page)
  console.log(`  verified ${layers.length} layers: ${layers.join(', ')}`)
  const preview = page.getByAltText('Flattened preview of the retouched photograph')
  await smoothScrollTo(page, preview)
  await beat(300)
  await mark('result')
  filmed.result = 1
  await beat(2_400)

  // 7. Scroll the layer list into view; named layers are the difference
  // between a flat image and a file that is still editable.
  const layerList = page.locator('.layer-list')
  await layerList.waitFor({ state: 'visible' })
  await smoothScrollTo(page, layerList)
  await beat(300)
  await mark('layers')
  filmed.layers = 1
  await beat(3_400)

  // 8. End on the download itself, hovered the way a viewer's cursor would
  // rest, and hold long enough for the closing line.
  const download = page.getByRole('link', { name: 'Download layered PSD' })
  await download.waitFor({ state: 'visible' })
  await smoothScrollTo(page, download)
  await beat(300)
  await download.hover()
  await mark('end')
  filmed.end = 1
  await beat(4_000)
}
