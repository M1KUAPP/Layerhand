import { describe, expect, test } from 'bun:test'

interface WorkflowStep {
  name?: string
  if?: string
  uses?: string
  run?: string
}

interface WorkflowJob {
  environment?: string
  permissions?: Record<string, string>
  'runs-on'?: string
  steps: WorkflowStep[]
}

interface WorkflowDefinition {
  on: Record<string, any>
  env?: Record<string, string>
  permissions?: Record<string, string>
  jobs: Record<string, WorkflowJob>
}

const LIFECYCLE_FILE = '.github/gcs-lifecycle.json'

describe('bucket lifecycle configuration', () => {
  test('commits a one-day delete rule for the artifacts bucket (NFR-6)', async () => {
    const source = await Bun.file(new URL('../../' + LIFECYCLE_FILE, import.meta.url)).text()
    const lifecycle = JSON.parse(source)

    expect(lifecycle).toEqual({
      rule: [{ action: { type: 'Delete' }, condition: { age: 1 } }]
    })
  })
})

describe('bucket lifecycle workflow contract', () => {
  test('never runs on push, and authenticates the way deploy.yml does', async () => {
    const source = await Bun.file(new URL('../../.github/workflows/gcs-lifecycle.yml', import.meta.url)).text()
    const workflow = Bun.YAML.parse(source) as WorkflowDefinition
    const job = Object.values(workflow.jobs)[0]

    expect(workflow.on).toHaveProperty('workflow_dispatch')
    expect(workflow.on).not.toHaveProperty('push')
    expect(workflow.on).not.toHaveProperty('schedule')
    expect(workflow.on).not.toHaveProperty('pull_request')

    const deploySource = await Bun.file(new URL('../../.github/workflows/deploy.yml', import.meta.url)).text()
    const deployWorkflow = Bun.YAML.parse(deploySource) as { env: Record<string, string> }
    expect(workflow.env?.PROJECT_ID).toBe(deployWorkflow.env.PROJECT_ID)
    expect(workflow.env?.WORKLOAD_IDENTITY_PROVIDER).toBe(deployWorkflow.env.WORKLOAD_IDENTITY_PROVIDER)
    expect(workflow.env?.DEPLOYER).toBe(deployWorkflow.env.DEPLOYER)
    expect(workflow.env?.BUCKET).toBe('layerhand-artifacts-732371853772')

    expect(job).toBeDefined()
    expect(job?.environment).toBe('production')
    expect(job?.permissions).toEqual({ contents: 'read', 'id-token': 'write' })
    expect(job?.steps.some((step) => step.uses === 'google-github-actions/auth@v3')).toBe(true)
    expect(job?.steps.some((step) => step.uses === 'google-github-actions/setup-gcloud@v3')).toBe(true)
  })

  test('applies the committed rule only when the input asks, and always prints the live one', async () => {
    const source = await Bun.file(new URL('../../.github/workflows/gcs-lifecycle.yml', import.meta.url)).text()
    const workflow = Bun.YAML.parse(source) as WorkflowDefinition
    const job = Object.values(workflow.jobs)[0]

    expect(workflow.on.workflow_dispatch.inputs.apply).toMatchObject({
      required: true,
      type: 'boolean',
      default: false
    })

    const applyStep = job?.steps.find((step) => step.run?.includes('buckets update'))
    expect(applyStep?.if).toBe('inputs.apply')
    expect(applyStep?.run).toContain(`--lifecycle-file=${LIFECYCLE_FILE}`)

    const printStep = job?.steps.find((step) => step.run?.includes('buckets describe'))
    expect(printStep?.if).toBeUndefined()
    expect(printStep?.run).toContain('--format="default(lifecycle_config)"')

    // The apply step must run before the print step, so the print reflects it.
    expect(job?.steps.indexOf(applyStep!)).toBeLessThan(job!.steps.indexOf(printStep!))
  })
})
