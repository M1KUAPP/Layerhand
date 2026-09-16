export interface AgentRunAcceptanceCriteria {
  minimumSteps: number
  minimumCacheHitRateExclusive: number
  requireComplete: boolean
  requireBrowserRelease: boolean
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
  browserReleased: boolean
}

export interface AgentRunAcceptanceResult {
  passed: boolean
  checks: {
    complete: boolean
    minimumSteps: boolean
    cacheHitRate: boolean
    browserReleased: boolean
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
    'Make five restrained edits to this photograph, each on its own layer with a name that says what it does:',
    '1. Brighten it with a Levels, Curves, or Brightness/Contrast adjustment layer.',
    '2. Warm its colours with a Photo Filter or Color Balance adjustment layer.',
    '3. Add subtle colour intensity with a Hue/Saturation or Vibrance adjustment layer.',
    '4. Darken the corners into a soft vignette on a new layer with an editable mask.',
    '5. Add subtle sharpening on a separate raster layer while keeping the original photograph intact.',
    'Inspect the finished layer panel, correct any unclear layer names, and finish only when all five edits are present.'
  ].join('\n'),
  acceptance: {
    minimumSteps: 20,
    minimumCacheHitRateExclusive: 0.8,
    requireComplete: true,
    requireBrowserRelease: true
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
    cacheHitRate: measurement.cacheHitRate !== null && measurement.cacheHitRate > criteria.minimumCacheHitRateExclusive,
    browserReleased: !criteria.requireBrowserRelease || measurement.browserReleased
  }
  return { passed: Object.values(checks).every(Boolean), checks }
}
