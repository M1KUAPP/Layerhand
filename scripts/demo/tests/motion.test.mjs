import assert from 'node:assert/strict'
import test from 'node:test'

const motion = await import('../motion.mjs').catch(() => null)

test('scroll timing is clamped and progress remains linear', () => {
  assert.ok(motion, 'motion.mjs must expose deterministic scroll timing')
  assert.equal(motion.linearProgress(250, 1000), 0.25)
  assert.equal(motion.linearProgress(1500, 1000), 1)
  assert.equal(motion.scrollDuration(90), 500)
  assert.equal(motion.scrollDuration(900), 1000)
  assert.equal(motion.scrollDuration(1800), 1400)
})

test('smoothScrollTo advances the viewport at constant linear progress', async () => {
  assert.ok(motion?.smoothScrollTo, 'smoothScrollTo must drive the browser viewport')
  const positions = []
  const times = [0, 500, 1000]
  const originalWindow = globalThis.window
  const originalPerformance = globalThis.performance
  const originalAnimationFrame = globalThis.requestAnimationFrame
  const originalDocument = globalThis.document
  const makeStyle = (initial = {}) => {
    const values = new Map(Object.entries(initial))
    return {
      getPropertyValue: (name) => values.get(name) || '',
      getPropertyPriority: () => '',
      setProperty: (name, value) => values.set(name, value),
      removeProperty: (name) => values.delete(name)
    }
  }
  const rootStyle = makeStyle({ 'scroll-behavior': 'smooth', 'scroll-snap-type': 'y mandatory' })
  const bodyStyle = makeStyle()
  globalThis.document = {
    documentElement: { style: rootStyle },
    body: { style: bodyStyle }
  }
  globalThis.window = {
    scrollY: 100,
    scrollTo(_x, y) {
      const desired = typeof _x === 'object' ? _x.top : y
      // Reproduce the deployed site's CSS: numeric scrollTo continues easing
      // unless the helper explicitly suspends smooth scrolling.
      const immediate = rootStyle.getPropertyValue('scroll-behavior') === 'auto'
      this.scrollY = immediate ? desired : this.scrollY + (desired - this.scrollY) * 0.1
      positions.push(Math.round(this.scrollY))
    }
  }
  globalThis.performance = { now: () => 0 }
  globalThis.requestAnimationFrame = (callback) => callback(times.shift())

  const locator = {
    evaluate: async () => ({ elementTop: 1000, elementHeight: 100, viewportHeight: 900, scrollY: 100 })
  }
  const page = { evaluate: async (callback, options) => callback(options) }

  try {
    const result = await motion.smoothScrollTo(page, locator, { viewportRatio: 0, headerOffset: 100 })
    assert.deepEqual(result, { targetY: 1000, durationMs: 1000 })
    assert.deepEqual(positions.slice(0, 3), [100, 550, 1000])
    assert.equal(globalThis.window.scrollY, 1000)
    assert.equal(rootStyle.getPropertyValue('scroll-behavior'), 'smooth')
    assert.equal(rootStyle.getPropertyValue('scroll-snap-type'), 'y mandatory')
  } finally {
    globalThis.window = originalWindow
    globalThis.performance = originalPerformance
    globalThis.requestAnimationFrame = originalAnimationFrame
    globalThis.document = originalDocument
  }
})
