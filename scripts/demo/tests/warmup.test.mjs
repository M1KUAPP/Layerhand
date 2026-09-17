import assert from 'node:assert/strict'
import test from 'node:test'

const warmup = await import('../warmup.mjs').catch(() => null)

// Every locator and role the page is asked for lands in events, so a test can
// see the full path the warm-up took through the page.
function pageFake({ events, gotoError = null, healthOk = true }) {
  return {
    setDefaultTimeout() {},
    goto: async (url) => {
      events.push(`goto ${url}`)
      if (gotoError) throw gotoError
      return { ok: () => (url.endsWith('/health') ? healthOk : true), status: () => (healthOk ? 200 : 503) }
    },
    getByRole: (role, options = {}) => {
      events.push(`role ${options.name ?? role}`)
      return { waitFor: async () => {} }
    },
    locator: (selector) => {
      events.push(`locator ${selector}`)
      return { waitFor: async () => {} }
    }
  }
}

function browserFake(pages, events) {
  const contextOptions = []
  return {
    contextOptions,
    browser: {
      newContext: async (options) => {
        contextOptions.push(options)
        events.push('context-open')
        const page = pages[Math.min(contextOptions.length - 1, pages.length - 1)]
        return {
          newPage: async () => page,
          close: async () => {
            events.push('context-close')
          }
        }
      }
    }
  }
}

test('warmTarget warms health and the landing page on the first attempt', async () => {
  assert.ok(warmup?.warmTarget, 'warmup.mjs must expose a target warm-up')
  const events = []
  const { browser, contextOptions } = browserFake([pageFake({ events })], events)
  const logs = []

  const result = await warmup.warmTarget({ browser, web: 'https://layerhand.example', log: (line) => logs.push(line) })

  assert.equal(result, true)
  assert.match(logs[0], /complete/)
  assert.deepEqual(events, [
    'context-open',
    'goto https://layerhand.example/health',
    'goto https://layerhand.example',
    'locator html[data-enter="done"]',
    'context-close'
  ])
  assert.deepEqual(contextOptions, [{ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }])
  assert.equal('recordVideo' in contextOptions[0], false)
})

test('warmTarget retries a failed first attempt and closes every context', async () => {
  const events = []
  const down = pageFake({ events, gotoError: new Error('the server is waking up') })
  const ready = pageFake({ events })
  const { browser, contextOptions } = browserFake([down, ready], events)

  const result = await warmup.warmTarget({ browser, web: 'https://layerhand.example', log: () => {} })

  assert.equal(result, true)
  assert.equal(contextOptions.length, 2)
  assert.equal(events.filter((event) => event === 'context-close').length, 2)
  assert.deepEqual(events, [
    'context-open',
    'goto https://layerhand.example/health',
    'context-close',
    'context-open',
    'goto https://layerhand.example/health',
    'goto https://layerhand.example',
    'locator html[data-enter="done"]',
    'context-close'
  ])
})

test('warmTarget gives up after every attempt fails', async () => {
  const events = []
  const down = pageFake({ events, gotoError: new Error('the server is waking up') })
  const { browser, contextOptions } = browserFake([down], events)

  const result = await warmup.warmTarget({ browser, web: 'https://layerhand.example', log: () => {} })

  assert.equal(result, false)
  assert.equal(contextOptions.length, 2)
  assert.equal(events.filter((event) => event === 'context-close').length, 2)
})

test('warmTarget treats a non-OK /health response as a failed attempt', async () => {
  const events = []
  const { browser } = browserFake([pageFake({ events, healthOk: false })], events)

  const result = await warmup.warmTarget({
    browser,
    web: 'https://layerhand.example',
    attempts: 1,
    log: () => {}
  })

  assert.equal(result, false)
  assert.equal(events.filter((event) => event === 'context-close').length, 1)
  assert.equal(events.includes('goto https://layerhand.example'), false)
})

test('warmTarget starts no run', async () => {
  const events = []
  const { browser } = browserFake([pageFake({ events })], events)

  await warmup.warmTarget({ browser, web: 'https://layerhand.example', log: () => {} })

  assert.equal(
    events.some((event) => event.includes('Start retouching')),
    false
  )
})
