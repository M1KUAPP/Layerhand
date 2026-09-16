import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, test } from 'bun:test'

interface WorkflowStep {
  id?: string
  name?: string
  if?: string
  uses?: string
  with?: Record<string, unknown>
  env?: Record<string, string>
  run?: string
  'continue-on-error'?: boolean
}

interface WorkflowJob {
  name?: string
  if?: string
  'timeout-minutes'?: number
  environment?: string
  permissions?: Record<string, string>
  'runs-on'?: string
  steps: WorkflowStep[]
}

interface WorkflowDefinition {
  name?: string
  on: Record<string, any>
  env?: Record<string, string>
  jobs: Record<string, WorkflowJob>
}

describe('reliability workflow contract', () => {
  test('matches guarded configuration controls', async () => {
    const source = await Bun.file(new URL('../../.github/workflows/reliability.yml', import.meta.url)).text()
    const workflow = Bun.YAML.parse(source) as WorkflowDefinition
    const job = workflow.jobs.reliability

    // Verification from brief Step 1:
    expect(source).toContain('# Scheduled nightly reliability run (#10).')
    expect(source).not.toContain('#24')

    expect(workflow.on).toHaveProperty('schedule')
    expect(workflow.on).toHaveProperty('workflow_dispatch')
    expect(workflow.on).not.toHaveProperty('pull_request')
    expect(workflow.on).not.toHaveProperty('push')

    expect(workflow.on.schedule).toEqual([{ cron: '0 16 * * *' }])

    expect(job).toBeDefined()
    expect(job?.if).toContain("github.event_name == 'schedule' && vars.RELIABILITY_ENABLED == 'true'")
    expect(job?.if).toContain("github.event_name == 'workflow_dispatch' && inputs.task == 'reliability'")
    expect(job?.['timeout-minutes']).toBe(180)
    expect(job?.environment).toBe('production')
    expect(job?.permissions).toEqual({
      contents: 'read',
      'id-token': 'write'
    })

    // Configuration reused from deploy.yml
    const deploySource = await Bun.file(new URL('../../.github/workflows/deploy.yml', import.meta.url)).text()
    const deployWorkflow = Bun.YAML.parse(deploySource) as { env: Record<string, string> }
    expect(workflow.env?.PROJECT_ID).toBe(deployWorkflow.env.PROJECT_ID)
    expect(workflow.env?.WORKLOAD_IDENTITY_PROVIDER).toBe(deployWorkflow.env.WORKLOAD_IDENTITY_PROVIDER)
    expect(workflow.env?.DEPLOYER).toBe(deployWorkflow.env.DEPLOYER)
    expect(workflow.env?.PUBLIC_URL).toBe('https://layerhand-732371853772.us-central1.run.app')

    // Auth & setup steps
    const authStep = job?.steps.find((step) => step.uses === 'google-github-actions/auth@v3')
    expect(authStep).toBeDefined()
    expect(job?.steps.some((step) => step.uses === 'google-github-actions/setup-gcloud@v3')).toBe(true)

    // Reliability run step
    const runStep = job?.steps.find((step) => step.run?.includes('bun run reliability'))
    expect(runStep).toBeDefined()
    expect(runStep?.id).toBe('reliability')
    expect(runStep?.['continue-on-error']).toBe(true)
    expect(runStep?.run).toContain('gcloud secrets versions access latest --secret OPENAI_API_KEY')
    expect(runStep?.env?.BROWSERBASE_API_KEY).toBe('${{ secrets.BROWSERBASE_API_KEY }}')

    // Summary step
    const summaryStep = job?.steps.find((step) => step.run?.includes('GITHUB_STEP_SUMMARY'))
    expect(summaryStep).toBeDefined()
    expect(summaryStep?.if).toBe('always()')
    expect(summaryStep?.run).toContain('summary.md')
    expect(summaryStep?.run).toMatch(/if\s+\[\s+-d\s+"?artifacts\/reliability"?\s+\]/)

    // Artifact step
    const artifactStep = job?.steps.find((step) => step.uses === 'actions/upload-artifact@v4')
    expect(artifactStep).toBeDefined()
    expect(artifactStep?.if).toBe('always()')
    expect(artifactStep?.with?.path).toBe('artifacts/reliability/')

    // Failure propagation step
    const failureStep = job?.steps.find((step) => step.run?.includes('exit 1'))
    expect(failureStep).toBeDefined()
    expect(failureStep?.if).toContain("steps.reliability.outcome == 'failure'")

    // Ensure neither credential is leaked into GITHUB_ENV or artifacts
    for (const step of job?.steps ?? []) {
      if (step.run) {
        expect(step.run).not.toMatch(/GITHUB_ENV.*OPENAI_API_KEY/)
        expect(step.run).not.toMatch(/GITHUB_ENV.*BROWSERBASE_API_KEY/)
      }
    }
  })

  test('a manual agent-loop dispatch runs one bounded cache acceptance session', async () => {
    const source = await Bun.file(new URL('../../.github/workflows/reliability.yml', import.meta.url)).text()
    const workflow = Bun.YAML.parse(source) as WorkflowDefinition
    const dispatch = workflow.on.workflow_dispatch
    const job = workflow.jobs.agent_loop_acceptance

    expect(dispatch.inputs.task).toMatchObject({
      required: true,
      type: 'choice',
      options: ['agent-loop-acceptance', 'reliability']
    })
    expect(job).toBeDefined()
    expect(job?.if).toBe("github.event_name == 'workflow_dispatch' && inputs.task == 'agent-loop-acceptance'")
    expect(job?.['timeout-minutes']).toBe(30)
    expect(job?.environment).toBe('production')
    expect(job?.permissions).toEqual({ contents: 'read', 'id-token': 'write' })

    const runStep = job?.steps.find((step) => step.run?.includes('--profile cache-acceptance'))
    expect(runStep).toMatchObject({ id: 'agent-loop', 'continue-on-error': true })
    expect(runStep?.run).toContain('gcloud secrets versions access latest --secret OPENAI_API_KEY')
    expect(runStep?.run).toContain('--step-cap 40')
    expect(runStep?.run).toContain('--budget 8')
    expect(runStep?.env?.BROWSERBASE_API_KEY).toBe('${{ secrets.BROWSERBASE_API_KEY }}')

    const artifactStep = job?.steps.find((step) => step.uses === 'actions/upload-artifact@v4')
    expect(artifactStep?.if).toBe('always()')
    expect(artifactStep?.with?.path).toBe('docs/evidence/agent-run/output/')

    for (const step of job?.steps ?? []) {
      if (step.run) {
        expect(step.run).not.toMatch(/GITHUB_ENV.*OPENAI_API_KEY/)
        expect(step.run).not.toMatch(/GITHUB_ENV.*BROWSERBASE_API_KEY/)
      }
    }
  })

  test('summary step handles missing artifacts/reliability directory without error', async () => {
    const source = await Bun.file(new URL('../../.github/workflows/reliability.yml', import.meta.url)).text()
    const workflow = Bun.YAML.parse(source) as WorkflowDefinition
    const summaryStep = workflow.jobs.reliability?.steps.find((step) => step.run?.includes('GITHUB_STEP_SUMMARY'))
    expect(summaryStep?.run).toBeDefined()

    const tempDir = await mkdtemp(join(tmpdir(), 'workflow-test-'))
    try {
      const summaryFile = join(tempDir, 'summary.log')
      const proc = Bun.spawn(['bash', '-e', '-u', '-o', 'pipefail', '-c', summaryStep!.run!], {
        cwd: tempDir,
        env: { ...process.env, GITHUB_STEP_SUMMARY: summaryFile }
      })
      const exitCode = await proc.exited
      expect(exitCode).toBe(0)
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })
})
