// The steering ledger's contract (#9): a correction native steering applied is
// never replayed at the step boundary, one it failed to apply always is, and
// every correction reaches the model exactly once, by one route or the other.
import { describe, expect, test } from 'bun:test'
import { SteerLedger } from './steer-ledger'

/** Replays everything the ledger hands back, the way the loop's next call would. */
function drain(ledger: SteerLedger): string[] {
  return ledger.takeReplays()
}

describe('SteerLedger', () => {
  test('a steer applied natively is never replayed', () => {
    const ledger = new SteerLedger()
    ledger.sent('Keep the shadow', 'resp_1')
    ledger.accepted('resp_1', 'steer_1')
    ledger.successorCreated('resp_1')

    expect(drain(ledger)).toEqual([])
    expect(ledger.outstanding()).toEqual([])
  })

  test('an accepted steer is not applied until its successor exists, so it is not replayed yet either', () => {
    const ledger = new SteerLedger()
    ledger.sent('Keep the shadow', 'resp_1')
    ledger.accepted('resp_1', 'steer_1')

    expect(drain(ledger)).toEqual([])
    expect(ledger.outstanding()).toEqual(['Keep the shadow'])
  })

  test.each([
    'response_already_completed',
    'response_not_active',
    'response_not_found',
    'successor_creation_failed',
    'too_many_pending_steers',
    'invalid_input'
  ])('a steer that fails with %s is replayed exactly once', (code) => {
    const ledger = new SteerLedger()
    ledger.sent('Keep the shadow', 'resp_1')
    ledger.failed({ parentResponseId: 'resp_1', code })

    expect(drain(ledger)).toEqual(['Keep the shadow'])
    expect(drain(ledger)).toEqual([])
    expect(ledger.outstanding()).toEqual([])
    expect(ledger.nativeAvailable).toBe(true)
  })

  test('steering_not_supported replays the steer and turns native steering off', () => {
    const ledger = new SteerLedger()
    ledger.sent('Keep the shadow', 'resp_1')
    ledger.failed({ parentResponseId: 'resp_1', code: 'steering_not_supported' })

    expect(drain(ledger)).toEqual(['Keep the shadow'])
    expect(ledger.nativeAvailable).toBe(false)
  })

  test('a failure naming a steer id settles that steer, not the oldest one', () => {
    const ledger = new SteerLedger()
    ledger.sent('Keep the shadow', 'resp_1')
    ledger.sent('Leave the label', 'resp_1')
    ledger.accepted('resp_1', 'steer_1')
    ledger.accepted('resp_1', 'steer_2')
    ledger.failed({ steerId: 'steer_2', code: 'too_many_pending_steers' })
    ledger.successorCreated('resp_1')

    expect(drain(ledger)).toEqual(['Leave the label'])
    expect(ledger.outstanding()).toEqual([])
  })

  test('a pending steer is applied by the continuation that carries the tool output, and never replayed', () => {
    const ledger = new SteerLedger()
    ledger.sent('Keep the shadow', 'resp_1')
    ledger.accepted('resp_1', 'steer_1')
    ledger.pending('steer_1')

    expect(ledger.outstanding()).toEqual(['Keep the shadow'])
    ledger.continuationSent('resp_1')

    expect(drain(ledger)).toEqual([])
    expect(ledger.outstanding()).toEqual([])
  })

  test('after a disconnect, stored evidence decides each unsettled steer', () => {
    const ledger = new SteerLedger()
    ledger.sent('Applied before the drop', 'resp_1')
    ledger.accepted('resp_1', 'steer_1')
    ledger.sent('Parent completed without it', 'resp_2')
    ledger.accepted('resp_2', 'steer_2')
    ledger.sent('Never acknowledged', 'resp_3')

    const evidence: Record<string, 'applied' | 'replay' | 'indeterminate'> = {
      resp_1: 'applied',
      resp_2: 'replay',
      resp_3: 'indeterminate'
    }
    ledger.disconnected((entry) => evidence[entry.parentResponseId]!)

    expect(drain(ledger)).toEqual(['Parent completed without it', 'Never acknowledged'])
    expect(ledger.indeterminate).toBe(1)
    expect(ledger.outstanding()).toEqual([])
  })

  test('events for a steer that is already settled change nothing', () => {
    const ledger = new SteerLedger()
    ledger.sent('Keep the shadow', 'resp_1')
    ledger.disconnected(() => 'indeterminate')
    expect(drain(ledger)).toEqual(['Keep the shadow'])

    // A late acknowledgement from the old connection must not revive it.
    ledger.accepted('resp_1', 'steer_1')
    ledger.successorCreated('resp_1')
    ledger.failed({ parentResponseId: 'resp_1', code: 'response_not_active' })

    expect(drain(ledger)).toEqual([])
    expect(ledger.outstanding()).toEqual([])
  })

  test('every correction is delivered exactly once across a mixed run', () => {
    const ledger = new SteerLedger()
    const replayed: string[] = []
    const texts = ['one', 'two', 'three', 'four', 'five']

    ledger.sent('one', 'resp_1')
    ledger.accepted('resp_1', 'steer_1')
    ledger.successorCreated('resp_1')
    ledger.sent('two', 'resp_2')
    ledger.failed({ parentResponseId: 'resp_2', code: 'response_already_completed' })
    replayed.push(...drain(ledger))
    ledger.sent('three', 'resp_3')
    ledger.accepted('resp_3', 'steer_3')
    ledger.pending('steer_3')
    ledger.continuationSent('resp_3')
    ledger.sent('four', 'resp_4')
    ledger.sent('five', 'resp_4')
    ledger.accepted('resp_4', 'steer_4')
    ledger.disconnected((entry) => (entry.state === 'accepted' ? 'applied' : 'replay'))
    replayed.push(...drain(ledger))

    const applied = ledger.applied()
    expect(replayed).toEqual(['two', 'five'])
    expect(applied).toEqual(['one', 'three', 'four'])
    expect([...applied, ...replayed].sort()).toEqual([...texts].sort())
    expect(ledger.outstanding()).toEqual([])
  })
})
