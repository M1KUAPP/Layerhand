export interface AgentRunAcceptanceCriteria {
  minimumSteps: number
  minimumCacheHitRateExclusive: number
  requireComplete: boolean
}

export interface AgentRunProfile {
  name: 'three-edit' | 'cache-acceptance'
  instruction: string
  acceptance?: AgentRunAcceptanceCriteria
}

export interface AgentRunMeasurement {
  outcome: 'complete' | 'incomplete' | 'failed'
  steps: number
  cacheHitRate: number | null
}

export interface AgentRunAcceptanceResult {
  passed: boolean
  checks: {
    complete: boolean
    minimumSteps: boolean
    cacheHitRate: boolean
  }
}

const THREE_EDIT: AgentRunProfile = {
  name: 'three-edit',
  instruction: [
    'Make three edits to this photograph, each on its own layer with a name that says what it does:',
    '1. Brighten it with a Levels, Curves, or Brightness/Contrast adjustment layer.',
    '2. Warm its colours with a Photo Filter or Color Balance adjustment layer.',
    '3. Darken the corners into a soft vignette on a new layer.'
  ].join('\n')
}

const CACHE_ACCEPTANCE: AgentRunProfile = {
  name: 'cache-acceptance',
  instruction: [
    'Make five restrained edits, each on its own layer with a clear name:',
    '1. Brighten with a Levels, Curves, or Brightness/Contrast adjustment.',
    '2. Warm colours with Photo Filter or Color Balance.',
    '3. Add subtle intensity with Hue/Saturation or Vibrance.',
    '4. Add a soft corner vignette on a masked layer.',
    '5. Add subtle sharpening on a separate raster layer.',
    'Keep the original intact. Inspect the layer panel, fix unclear names, and finish only when all five edits are present.'
  ].join('\n'),
  acceptance: {
    minimumSteps: 20,
    minimumCacheHitRateExclusive: 0.8,
    requireComplete: true
  }
}

const PROFILES: Readonly<Record<AgentRunProfile['name'], AgentRunProfile>> = {
  'three-edit': THREE_EDIT,
  'cache-acceptance': CACHE_ACCEPTANCE
}

export function agentRunProfile(name: string = 'three-edit'): AgentRunProfile {
  const profile = PROFILES[name as AgentRunProfile['name']]
  if (!profile) throw new Error('Unknown agent run profile')
  return profile
}

export function evaluateAgentRunAcceptance(
  profile: AgentRunProfile,
  measurement: AgentRunMeasurement
): AgentRunAcceptanceResult | null {
  const criteria = profile.acceptance
  if (!criteria) return null
  const checks = {
    complete: !criteria.requireComplete || measurement.outcome === 'complete',
    minimumSteps: measurement.steps >= criteria.minimumSteps,
    cacheHitRate: measurement.cacheHitRate !== null && measurement.cacheHitRate > criteria.minimumCacheHitRateExclusive
  }
  return { passed: Object.values(checks).every(Boolean), checks }
}
