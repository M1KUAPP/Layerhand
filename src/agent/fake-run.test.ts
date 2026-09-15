import { describe, expect, test } from 'bun:test'
import type { RunEvent, RunRequest } from './contract'
import { collect, testRunContract } from './contract-tests'
import { fakeRun } from './fake-run'

const request: RunRequest = {
  image: new Uint8Array(),
  filename: 'product.jpg',
  instruction: 'Remove the background, warm the highlights, and clean the reflections',
  stepCap: 40,
  budgetUsd: 8
}

testRunContract({
  name: 'fakeRun',
  request,
  start: (request) => fakeRun(request, { intervalMs: 0 }),
  startFailing: (request) => fakeRun(request, { intervalMs: 0, failAtStep: 2 })
})

const layersOf = (events: RunEvent[]) => {
  const last = events.at(-1)
  return last?.type === 'done' ? last.result.layers : []
}

describe('fakeRun', () => {
  test('completes its script when the script fits under the cap', async () => {
    const events = await collect(fakeRun(request, { intervalMs: 0 }))
    expect(events.at(-1)).toMatchObject({ type: 'done', result: { complete: true } })
  })

  test('can return a partial result before the script adds an editable layer', async () => {
    const events = await collect(fakeRun({ ...request, stepCap: 1 }, { intervalMs: 0 }))
    expect(events.at(-1)).toMatchObject({ type: 'done', result: { complete: false } })
  })

  test('returns the layers made before the cap stopped it', async () => {
    const all = layersOf(await collect(fakeRun(request, { intervalMs: 0 })))
    const some = layersOf(await collect(fakeRun({ ...request, stepCap: 2 }, { intervalMs: 0 })))
    expect(some.length).toBeGreaterThan(0)
    expect(some.length).toBeLessThan(all.length)
    expect(all.slice(0, some.length)).toEqual(some)
  })

  test('adds each step to the running cost', async () => {
    const events = await collect(fakeRun(request, { intervalMs: 0 }))
    const costs = events.filter((event) => event.type === 'cost')
    expect(costs.map((cost) => cost.tokensIn)).toEqual([1_570, 4_710, 9_420, 15_700, 23_550])
    expect(costs.map((cost) => cost.tokensOut)).toEqual([750, 1_500, 2_250, 3_000, 3_750])
  })

  test('carries on after a recoverable error', async () => {
    const events = await collect(fakeRun(request, { intervalMs: 0, recoverableErrorAtStep: 2 }))
    const at = events.findIndex((event) => event.type === 'error')
    expect(events[at]).toMatchObject({ type: 'error', recoverable: true })
    expect(events.slice(at).some((event) => event.type === 'step')).toBe(true)
    expect(events.at(-1)).toMatchObject({ type: 'done', result: { complete: true } })
  })

  test('fails once the requested number of steps has run', async () => {
    const events = await collect(fakeRun(request, { intervalMs: 0, failAtStep: 2 }))
    expect(events.filter((event) => event.type === 'step').map((step) => step.n)).toEqual([1, 2])
    expect(events.at(-1)).toMatchObject({ type: 'error', recoverable: false })
  })

  test('waits the interval between steps', async () => {
    const intervalMs = 20
    const startedAt = performance.now()
    const events = await collect(fakeRun(request, { intervalMs }))
    const steps = events.filter((event) => event.type === 'step').length
    expect(steps).toBeGreaterThan(0)
    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(steps * intervalMs)
  })

  test('stops scheduling steps once cancelled', async () => {
    const run = fakeRun(request, { intervalMs: 1 })
    const events = await collect(run, (event) => {
      if (event.type === 'started') void run.cancel()
    })
    await Bun.sleep(50)
    expect(await collect(run)).toEqual(events)
  })
})
