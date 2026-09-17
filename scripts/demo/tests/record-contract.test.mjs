import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../record.mjs', import.meta.url), 'utf8')
const contract = await import('../contract.mjs').catch(() => null)

test('a failed or incomplete walk exits non-zero after preserving diagnostics', () => {
  assert.match(source, /walkError/)
  assert.match(source, /process\.exitCode = 1/)
  assert.match(source, /if \(!warmed\).*throw/s)
})

test('the runner warms the target and defaults to the local app', () => {
  assert.match(source, /await import\('\.\/warmup\.mjs'\)/)
  assert.match(source, /warmTarget\(\{ browser, web: WEB \}\)/)
  assert.ok(source.includes("const WEB = process.env.DEMO_WEB || 'http://127.0.0.1:3000'"))
  assert.ok(source.includes('walk({ page, mark'))
})

test('capture contract requires every narrated beat exactly once and in order', () => {
  assert.ok(contract, 'contract.mjs must expose the required capture sequence')
  const expected = ['landing', 'input', 'running', 'correction', 'applied', 'result', 'layers', 'end']
  assert.deepEqual(contract.REQUIRED_BEATS, expected)

  const beats = expected.map((name, index) => ({ name, ms: index * 1000 }))
  const filmed = Object.fromEntries(expected.map((name) => [name, 1]))

  const complete = contract.auditCapture(beats, filmed)
  assert.equal(complete.complete, true)
  assert.deepEqual(complete.missing, [])

  // A surface that never rendered is missing even though the run continued.
  const partial = contract.auditCapture([{ name: 'landing', ms: 0 }], { landing: 1 })
  assert.equal(partial.complete, false)
  assert.deepEqual(partial.missing, expected.slice(1))

  // A beat that was marked but never flagged as filmed is missing too.
  const unfilmed = contract.auditCapture(beats, { ...filmed, layers: 0 })
  assert.equal(unfilmed.complete, false)
  assert.deepEqual(unfilmed.missing, ['layers'])

  // Filming everything in the wrong order is not a complete capture.
  const reordered = contract.auditCapture([...beats].reverse(), filmed)
  assert.equal(reordered.complete, false)
  assert.equal(reordered.ordered, false)
})
