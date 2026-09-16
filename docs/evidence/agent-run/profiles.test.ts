import { describe, expect, test } from 'bun:test'

import { agentRunProfile, evaluateAgentRunAcceptance } from './profiles'

describe('agent run evidence profiles', () => {
  test('keeps the three-edit benchmark as the default', () => {
    const profile = agentRunProfile()

    expect(profile.name).toBe('three-edit')
    expect(profile.instruction).toContain('Make three edits')
    expect(profile.acceptance).toBeUndefined()
  })

  test('defines a reproducible long run for the cache acceptance threshold', () => {
    const profile = agentRunProfile('cache-acceptance')
    const numberedEdits = profile.instruction.match(/^\d\./gm) ?? []

    expect(profile.name).toBe('cache-acceptance')
    expect(numberedEdits).toHaveLength(5)
    expect(profile.instruction).toContain('each on its own layer')
    expect(profile.acceptance).toEqual({
      minimumSteps: 20,
      minimumCacheHitRateExclusive: 0.8,
      requireComplete: true,
      requireBrowserRelease: true
    })
  })

  test('rejects an unknown profile before a paid run can start', () => {
    expect(() => agentRunProfile('unknown')).toThrow('Unknown agent run profile')
  })

  test('passes cache acceptance only when every measured boundary passes', () => {
    const profile = agentRunProfile('cache-acceptance')

    expect(
      evaluateAgentRunAcceptance(profile, {
        outcome: 'complete',
        steps: 20,
        cacheHitRate: 0.81,
        browserReleased: true
      })
    ).toMatchObject({ passed: true })

    for (const measurement of [
      { outcome: 'complete' as const, steps: 19, cacheHitRate: 0.81, browserReleased: true },
      { outcome: 'complete' as const, steps: 20, cacheHitRate: 0.8, browserReleased: true },
      { outcome: 'incomplete' as const, steps: 20, cacheHitRate: 0.81, browserReleased: true },
      { outcome: 'complete' as const, steps: 20, cacheHitRate: 0.81, browserReleased: false }
    ]) {
      expect(evaluateAgentRunAcceptance(profile, measurement)).toMatchObject({ passed: false })
    }
  })
})
