import { afterEach, describe, expect, test } from 'bun:test'
import { SQL } from 'bun'

import type { RunHandle, RunResult } from '../../src/agent/contract'
import { EventLog } from '../../src/agent/event-log'
import type { ManagedRun, RunStopReason } from '../../src/server/managed-run'
import { applyMigrations } from '../../src/server/migrations'
import { RunRegistry, type TerminalRun } from '../../src/server/run-registry'
import { createRunLogger, runLogLine, SqlRunLogStore, type RunLogLine } from '../../src/server/run-log'

const RESULT: RunResult = {
  psdUrl: 'https://artifacts.example/result.psd',
  previewUrl: 'https://artifacts.example/preview.png',
  layers: [{ name: 'Original photograph', kind: 'raster', visible: true, masks: [], children: [] }],
  complete: true
}
const FRAME_URL = 'https://artifacts.example/frame-secret-pixels.png'
const KEY = 'sk-proj-abcdefghijklmnopqrstuvwxyz0123456789'

const databases: SQL[] = []

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()))
})

/** A run the test drives event by event, reporting whatever stop reason it is given. */
function controlledRun(stopReason: RunStopReason = 'complete') {
  const log = new EventLog()
  log.emit({ type: 'started', runId: 'private', viewport: { width: 1440, height: 900 } })
  const handle: RunHandle = {
    events: log,
    async steer() {},
    async cancel() {
      if (!log.ended) log.end({ type: 'done', result: { ...RESULT, complete: false } })
    }
  }
  const managedRun: ManagedRun = {
    handle,
    metrics: () => ({ cacheHitRate: 0.9, stopReason }),
    releaseSecrets: () => undefined
  }
  return { log, managedRun }
}

function recordingRegistry(now = () => 1_000) {
  const records: string[] = []
  const registry = new RunRegistry({ now, onTerminal: createRunLogger({ write: (record) => records.push(record) }) })
  return { registry, records, lines: () => records.map((record) => JSON.parse(record) as RunLogLine) }
}

function terminalRun(overrides: Partial<TerminalRun> = {}): TerminalRun {
  return {
    runId: 'run-1',
    instruction: 'Remove the background',
    startedAt: Date.parse('2026-09-15T12:00:00.000Z'),
    completedAt: Date.parse('2026-09-15T12:03:20.000Z'),
    snapshot: {
      runId: 'run-1',
      status: 'complete',
      steps: 12,
      cap: 15,
      narration: 'Checking the result',
      frameUrl: FRAME_URL,
      costUsd: 3.5,
      tokensIn: 1_300_000,
      tokensOut: 30_000,
      lastEventId: 40,
      corrections: ['Keep the shadow'],
      recoverableErrors: [],
      result: RESULT
    },
    metrics: { cacheHitRate: 0.85, stopReason: 'complete' },
    ...overrides
  }
}

describe('run log', () => {
  test('describes a finished run in one line with every NFR-8 field', () => {
    expect(runLogLine(terminalRun())).toEqual({
      runId: 'run-1',
      completedAt: '2026-09-15T12:03:20.000Z',
      steps: 12,
      capHit: false,
      tokensIn: 1_300_000,
      tokensOut: 30_000,
      costUsd: 3.5,
      cacheHitRate: 0.85,
      durationMs: 200_000,
      outcome: 'complete',
      failureReason: null,
      failureCode: null,
      instruction: 'Remove the background',
      transport: 'http',
      correctionsApplied: 0,
      correctionsReplayed: 0,
      correctionsIndeterminate: 0,
      safetyCheckCodes: []
    })
  })

  test('records the transport, how corrections settled, and the safety checks acknowledged (NFR-8)', () => {
    const run = terminalRun({
      metrics: {
        cacheHitRate: 0.85,
        stopReason: 'complete',
        transport: 'websocket',
        steering: { applied: 2, replayed: 1, indeterminate: 1 },
        safetyCheckCodes: ['malicious_instructions', 'malicious_instructions']
      }
    })

    const line = runLogLine(run)

    expect(line.transport).toBe('websocket')
    expect(line.correctionsApplied).toBe(2)
    expect(line.correctionsReplayed).toBe(1)
    expect(line.correctionsIndeterminate).toBe(1)
    expect(line.safetyCheckCodes).toEqual(['malicious_instructions', 'malicious_instructions'])
  })

  test('names what a failed run failed on, and calls an unexplained failure run_failed', () => {
    const failure = { code: 'editor_action_failed' as const, errorName: 'Error', message: 'Unknown key', stack: [] }

    expect(
      runLogLine(terminalRun({ metrics: { cacheHitRate: null, stopReason: 'failed', failure } })).failureCode
    ).toBe('editor_action_failed')
    expect(runLogLine(terminalRun({ metrics: { cacheHitRate: null, stopReason: 'failed' } })).failureCode).toBe(
      'run_failed'
    )
    expect(runLogLine(terminalRun({ metrics: { cacheHitRate: null, stopReason: 'step_cap' } })).failureCode).toBeNull()
  })

  test("writes a failed run's cause to its own sink, and nothing for a run that did not fail", async () => {
    const failures: string[] = []
    const logger = createRunLogger({ write: () => undefined, writeFailure: (record) => void failures.push(record) })
    const failure = {
      code: 'editor_action_failed' as const,
      errorName: 'Error',
      message: 'keyboard.press: Unknown key: "Down"',
      stack: ['at press (/app/dist/index.js:1:1)']
    }
    const failed = terminalRun({ metrics: { cacheHitRate: null, stopReason: 'failed', failure } })
    failed.snapshot.steps = 12

    await logger(failed)
    await logger(terminalRun({ runId: 'run-2' }))

    expect(failures).toHaveLength(1)
    expect(failures[0]).toEndWith('}\n')
    expect(JSON.parse(failures[0]!)).toEqual({
      event: 'run_failed',
      runId: 'run-1',
      step: 12,
      failureCode: 'editor_action_failed',
      errorName: 'Error',
      message: 'keyboard.press: Unknown key: "Down"',
      stack: ['at press (/app/dist/index.js:1:1)']
    })
  })

  test('marks either cap as hit', () => {
    const run = terminalRun()
    expect(runLogLine({ ...run, metrics: { cacheHitRate: null, stopReason: 'step_cap' } }).capHit).toBe(true)
    expect(runLogLine({ ...run, metrics: { cacheHitRate: null, stopReason: 'spend_cap' } }).capHit).toBe(true)
    expect(runLogLine({ ...run, metrics: { cacheHitRate: null, stopReason: 'cancelled' } }).capHit).toBe(false)
  })

  test('never carries frames or corrections', () => {
    const record = JSON.stringify(runLogLine(terminalRun()))

    expect(record).not.toContain(FRAME_URL)
    expect(record).not.toContain('Keep the shadow')
  })

  test('truncates the instruction to eighty characters', () => {
    const instruction = 'Warm the highlights '.repeat(10)

    const logged = runLogLine(terminalRun({ instruction })).instruction

    expect(Array.from(logged)).toHaveLength(80)
    expect(logged).toEndWith('…')
    expect(instruction.startsWith(logged.slice(0, -1))).toBe(true)
  })

  test('redacts a key from the instruction and the failure reason, even where truncation would cut it', () => {
    const instruction = `${'x'.repeat(70)} ${KEY}`
    const run = terminalRun({ instruction })
    run.snapshot.failureReason = `Provider rejected ${KEY}`

    const record = JSON.stringify(runLogLine(run))

    expect(record).not.toContain('sk-proj')
    expect(record).toContain('[redacted]')
  })

  test('gives a failed run without an unrecoverable error its last recoverable error as the reason', () => {
    const run = terminalRun({ metrics: { cacheHitRate: null, stopReason: 'failed' } })
    run.snapshot.status = 'incomplete'
    run.snapshot.recoverableErrors = [
      'The live view missed a frame',
      'The agent took a step without describing it, so the run stopped'
    ]

    expect(runLogLine(run).failureReason).toBe('The agent took a step without describing it, so the run stopped')
    expect(runLogLine({ ...run, metrics: { cacheHitRate: null, stopReason: 'step_cap' } }).failureReason).toBeNull()
  })

  test('still stores the line when writing it fails, then reports the failure', async () => {
    const stored: RunLogLine[] = []
    const logger = createRunLogger({
      write: () => {
        throw new Error('stdout closed')
      },
      store: { append: async (line) => void stored.push(line) }
    })

    await expect(logger(terminalRun())).rejects.toThrow('stdout closed')
    expect(stored.map((line) => line.runId)).toEqual(['run-1'])
  })

  test('writes one line when a run completes, fails, or is cancelled, and none while it runs', async () => {
    const { registry, lines } = recordingRegistry()
    const completing = controlledRun('complete')
    const failing = controlledRun('failed')
    const cancelled = controlledRun('cancelled')
    registry.register({ runId: 'completing', instruction: 'Retouch', managedRun: completing.managedRun })
    registry.register({ runId: 'failing', instruction: 'Retouch', managedRun: failing.managedRun })
    registry.register({ runId: 'cancelled', instruction: 'Retouch', managedRun: cancelled.managedRun })

    completing.log.emit({ type: 'step', n: 1, cap: 15, narration: 'Selecting the product' })
    completing.log.emit({ type: 'frame', pngUrl: FRAME_URL })
    await Bun.sleep(5)
    expect(lines()).toEqual([])

    completing.log.end({ type: 'done', result: RESULT })
    failing.log.end({ type: 'error', reason: 'The editor stopped responding', recoverable: false })
    await registry.cancel('cancelled')
    await Promise.all(['completing', 'failing', 'cancelled'].map((id) => registry.waitForTerminal(id)))

    const byRun = Object.fromEntries(lines().map((line) => [line.runId, line]))
    expect(lines()).toHaveLength(3)
    expect(byRun.completing).toMatchObject({ outcome: 'complete', steps: 1, failureReason: null })
    expect(byRun.failing).toMatchObject({ outcome: 'failed', failureReason: 'The editor stopped responding' })
    expect(byRun.cancelled).toMatchObject({ outcome: 'cancelled', capHit: false })
  })

  test('writes only one line when a run reports its end twice', async () => {
    const { registry, records } = recordingRegistry()
    const run = controlledRun()
    registry.register({ runId: 'run-1', instruction: 'Retouch', managedRun: run.managedRun })

    run.log.emit({ type: 'done', result: RESULT })
    run.log.end({ type: 'done', result: RESULT })
    await registry.waitForTerminal('run-1')
    await Bun.sleep(5)

    expect(records).toHaveLength(1)
    expect(records[0]).toEndWith('}\n')
  })

  test('stores lines that one SQL statement can query, once per run', async () => {
    const database = new SQL(':memory:')
    databases.push(database)
    await applyMigrations(database)
    const store = new SqlRunLogStore(database)
    const complete = runLogLine(terminalRun())
    const capped = runLogLine(terminalRun({ runId: 'run-2', metrics: { cacheHitRate: null, stopReason: 'step_cap' } }))

    await store.append(complete)
    await store.append(capped)
    await store.append(capped)

    const rows = await database`
      SELECT run_id, outcome, cache_hit_rate, instruction FROM run_log WHERE cap_hit ORDER BY run_id
    `
    const [{ runs, spent }] = await database`SELECT count(*) AS runs, sum(cost_usd) AS spent FROM run_log`
    expect(rows).toEqual([
      { run_id: 'run-2', outcome: 'step_cap', cache_hit_rate: null, instruction: 'Remove the background' }
    ])
    expect(Number(runs)).toBe(2)
    expect(spent).toBe(7)
  })

  test('stores the failure code, and gains its column on a database made before it existed', async () => {
    const database = new SQL(':memory:')
    databases.push(database)
    await applyMigrations(database)
    await applyMigrations(database)
    const store = new SqlRunLogStore(database)

    await store.append(
      runLogLine(terminalRun({ metrics: { cacheHitRate: null, stopReason: 'failed', failure: undefined } }))
    )

    const rows = await database`SELECT run_id, outcome, failure_code FROM run_log`
    expect(rows).toEqual([{ run_id: 'run-1', outcome: 'failed', failure_code: 'run_failed' }])
  })

  test('stores the transport, the corrections tally, and the safety check codes (NFR-8)', async () => {
    const database = new SQL(':memory:')
    databases.push(database)
    await applyMigrations(database)
    const store = new SqlRunLogStore(database)

    await store.append(
      runLogLine(
        terminalRun({
          metrics: {
            cacheHitRate: 0.85,
            stopReason: 'complete',
            transport: 'websocket',
            steering: { applied: 2, replayed: 1, indeterminate: 1 },
            safetyCheckCodes: ['malicious_instructions']
          }
        })
      )
    )

    const rows = await database`
      SELECT transport, corrections_applied, corrections_replayed, corrections_indeterminate, safety_check_codes
        FROM run_log
    `
    expect(rows).toEqual([
      {
        transport: 'websocket',
        corrections_applied: 2,
        corrections_replayed: 1,
        corrections_indeterminate: 1,
        safety_check_codes: '["malicious_instructions"]'
      }
    ])
  })
})
