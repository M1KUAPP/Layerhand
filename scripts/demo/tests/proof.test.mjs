import assert from 'node:assert/strict'
import test from 'node:test'

const proof = await import('../proof.mjs').catch(() => null)

test('isHumanLayerName accepts named layers and refuses editor defaults', () => {
  assert.ok(proof?.isHumanLayerName, 'proof.mjs must expose the layer-name check')
  const human = ['Original photograph', 'Warm the highlights', 'Subject selection mask', 'Vignette', '  Soft light  ']
  for (const name of human) {
    assert.equal(proof.isHumanLayerName(name), true, name)
  }
  const generic = [
    '',
    '   ',
    'Layer 1',
    'Layer 12',
    'layer 7',
    'Background',
    'BACKGROUND',
    'Background copy',
    'Warm highlights copy 3',
    'Layer 1 copy',
    'Copy 2',
    '  lAyEr 12  ',
    '  warm highlights COPY 3  '
  ]
  for (const name of generic) {
    assert.equal(proof.isHumanLayerName(name), false, name)
  }
})

test('auditLayerNames needs at least two names and none of them generic', () => {
  assert.ok(proof?.auditLayerNames, 'proof.mjs must expose the layer audit')
  assert.deepEqual(proof.auditLayerNames([]), { ok: false, generic: [] })
  assert.deepEqual(proof.auditLayerNames(['Original photograph']), { ok: false, generic: [] })
  assert.deepEqual(proof.auditLayerNames(['Original photograph', 'Layer 1', 'Background copy']), {
    ok: false,
    generic: ['Layer 1', 'Background copy']
  })
  assert.deepEqual(proof.auditLayerNames(['Original photograph', 'Warm the highlights', 'Clean reflections']), {
    ok: true,
    generic: []
  })
})

// A result page fake that answers the two heading races, the layer list, and
// the download links. A heading that is not on the page never settles, which
// is what a real wait does until its timeout.
function resultPage({ completeVisible, partialVisible, layerItems, psdHref, pngHref }) {
  const heading = (isVisible) => ({
    waitFor: async () => {
      if (!isVisible) await new Promise(() => {})
    },
    isVisible: async () => isVisible
  })
  return {
    getByRole: (role, { name } = {}) => {
      if (role === 'heading' && name === 'Your layered file is ready.') return heading(completeVisible)
      if (role === 'heading' && name === 'Your partial layered file is ready.') return heading(partialVisible)
      if (role === 'link' && name === 'Download layered PSD') {
        return { getAttribute: async () => psdHref }
      }
      if (role === 'link' && name === 'Download flattened PNG') {
        return { getAttribute: async () => pngHref }
      }
      throw new Error(`unexpected ${role} named ${name}`)
    },
    locator: (selector) => {
      if (selector !== '.layer-list > ol > li') throw new Error(`unexpected selector ${selector}`)
      return { allInnerTexts: async () => layerItems }
    }
  }
}

test('verifyLayeredResult returns the layer names behind a complete result', async () => {
  assert.ok(proof?.verifyLayeredResult, 'proof.mjs must expose the layered-result check')
  const page = resultPage({
    completeVisible: true,
    partialVisible: false,
    layerItems: ['Original photograph\nRaster · visible', 'Warm the highlights\nAdjustment · visible'],
    psdHref: 'https://cdn.example/run/retouched.psd?sig=1',
    pngHref: 'https://cdn.example/run/preview.png?sig=1'
  })

  const { layers } = await proof.verifyLayeredResult(page)
  assert.deepEqual(layers, ['Original photograph', 'Warm the highlights'])
})

test('verifyLayeredResult refuses to film a partial run', async () => {
  const page = resultPage({
    completeVisible: false,
    partialVisible: true,
    layerItems: ['Original photograph', 'Warm the highlights'],
    psdHref: 'https://cdn.example/retouched.psd',
    pngHref: 'https://cdn.example/preview.png'
  })

  await assert.rejects(() => proof.verifyLayeredResult(page), {
    message: 'the run ended incomplete; capture refused'
  })
})

test('verifyLayeredResult refuses generic layer names', async () => {
  const page = resultPage({
    completeVisible: true,
    partialVisible: false,
    layerItems: ['Layer 1\nRaster', 'Warm the highlights\nAdjustment'],
    psdHref: 'https://cdn.example/retouched.psd',
    pngHref: 'https://cdn.example/preview.png'
  })

  await assert.rejects(() => proof.verifyLayeredResult(page), /Layer 1/)
})

test('verifyLayeredResult refuses a download link without an href', async () => {
  const cleanItems = ['Original photograph', 'Warm the highlights']
  const psdMissing = resultPage({
    completeVisible: true,
    partialVisible: false,
    layerItems: cleanItems,
    psdHref: null,
    pngHref: 'https://cdn.example/preview.png'
  })
  await assert.rejects(() => proof.verifyLayeredResult(psdMissing), /Download layered PSD/)

  const pngMissing = resultPage({
    completeVisible: true,
    partialVisible: false,
    layerItems: cleanItems,
    psdHref: 'https://cdn.example/retouched.psd',
    pngHref: null
  })
  await assert.rejects(() => proof.verifyLayeredResult(pngMissing), /Download flattened PNG/)
})

test('verifyCorrectionApplied waits for the acknowledgement banner', async () => {
  assert.ok(proof?.verifyCorrectionApplied, 'proof.mjs must expose the correction check')
  const asked = []
  const page = {
    locator: (selector, { hasText }) => {
      asked.push([selector, hasText])
      return { waitFor: async () => {} }
    }
  }

  await proof.verifyCorrectionApplied(page, 'Keep the shadow.')
  assert.deepEqual(asked, [['.correction-ack', 'Correction received: Keep the shadow.']])
})

test('verifyCorrectionApplied throws when the acknowledgement never shows', async () => {
  const page = {
    locator: () => ({
      waitFor: async () => {
        throw new Error('locator.waitFor: Timeout 30000ms exceeded')
      }
    })
  }

  await assert.rejects(() => proof.verifyCorrectionApplied(page, 'Keep the shadow.'), {
    message: 'the page never showed "Correction received: Keep the shadow." within 30000 ms'
  })
})
