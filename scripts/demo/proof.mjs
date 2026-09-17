// The proof decides whether a finished run may be filmed. A result that is
// incomplete, named by editor defaults, or missing its downloads would make
// the recording lie, so these checks refuse it rather than narrate over it.

// "Background copy 2" is the editor's duplication suffix, so "copy" only fails
// a name when it is the final word.
const GENERIC_COPY = /(?:^|\s)copy(?: \d+)?$/

function normaliseName(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en')
}

export function isHumanLayerName(name) {
  const value = normaliseName(name)
  if (!value) return false
  if (/^layer \d+$/.test(value)) return false
  if (value === 'background') return false
  return !GENERIC_COPY.test(value)
}

export function auditLayerNames(names) {
  const generic = names.filter((name) => !isHumanLayerName(name))
  return { ok: names.length >= 2 && generic.length === 0, generic }
}

export async function verifyCorrectionApplied(page, correction, timeoutMs = 30_000) {
  const banner = `Correction received: ${correction}`
  try {
    // The page also mirrors the text into a hidden live region, so ask for the visible note.
    await page.locator('.correction-ack', { hasText: banner }).waitFor({ state: 'visible', timeout: timeoutMs })
  } catch {
    throw new Error(`the page never showed "${banner}" within ${timeoutMs} ms`)
  }
}

export async function verifyLayeredResult(page, timeoutMs = 120_000) {
  const complete = page.getByRole('heading', { name: 'Your layered file is ready.' })
  const partial = page.getByRole('heading', { name: 'Your partial layered file is ready.' })
  // Either heading settles the wait, so a partial result is refused the moment
  // it shows instead of after the complete heading's full timeout.
  try {
    await Promise.any([
      complete.waitFor({ state: 'visible', timeout: timeoutMs }),
      partial.waitFor({ state: 'visible', timeout: timeoutMs })
    ])
  } catch {
    throw new Error(`neither result heading appeared within ${timeoutMs} ms`)
  }
  if (await partial.isVisible()) throw new Error('the run ended incomplete; capture refused')

  const items = page.locator('.layer-list > ol > li')
  const layers = (await items.allInnerTexts()).map((text) => text.split('\n')[0].trim())
  const audit = auditLayerNames(layers)
  if (!audit.ok) {
    const reason = layers.length < 2 ? 'at least two layers are required' : `generic names: ${audit.generic.join(', ')}`
    throw new Error(`the layer list failed its audit; capture refused: ${reason}`)
  }

  const psdHref = await page.getByRole('link', { name: 'Download layered PSD' }).getAttribute('href')
  if (!psdHref) throw new Error('the Download layered PSD link has no href; capture refused')
  const pngHref = await page.getByRole('link', { name: 'Download flattened PNG' }).getAttribute('href')
  if (!pngHref) throw new Error('the Download flattened PNG link has no href; capture refused')
  return { layers }
}
