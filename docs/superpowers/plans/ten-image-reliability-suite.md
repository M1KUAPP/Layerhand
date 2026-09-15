# Ten-image reliability suite implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one repeatable command that measures Layerhand across ten real
product and interior photographs and reports whether at least eight runs
complete with valid layered PSDs.

**Architecture:** A typed corpus loader validates all local inputs before any
paid call. A dependency-injected suite runs cases sequentially, captures the
production run events and exports, and validates each PSD with the existing
parser and layer policy. A thin live adapter supplies `liveAgentRun()`, while a
guarded GitHub Actions workflow publishes nightly reports.

**Tech Stack:** Bun 1.4.2, TypeScript 7, `bun:test`, `ag-psd`, Open Images V7,
GitHub Actions.

**Spec:** `docs/superpowers/specs/ten-image-reliability-suite-design.md`

## Global constraints

- Use Bun, never npm or yarn.
- Run cases sequentially; do not create concurrent paid sessions.
- The pass threshold is exactly eight of ten cases.
- The live defaults are a 40-step cap and an $8 spend cap per case.
- Normal pull-request CI must never call OpenAI or Browserbase.
- A paid workflow runs only when `RELIABILITY_ENABLED` equals `true`.
- No API key, CDP address, frame data, or raw provider error reaches a report.
- Keep Markdown prose within 80 columns, except links, tables, and code blocks.
- Use Conventional Commits and keep each task in its own atomic commit.
- Run `graphify update .` after source changes and before final verification.

---

### Task 1: Add and validate the representative corpus

**Files:**

- Create: `src/reliability/corpus.ts`
- Create: `test/reliability/corpus.test.ts`
- Create: `test/images/manifest.json`
- Create: `test/images/product-eye-shadow.jpg`
- Create: `test/images/product-face-cream.jpg`
- Create: `test/images/product-perfume.jpg`
- Create: `test/images/product-blue-sneakers.jpg`
- Create: `test/images/product-red-heel.jpg`
- Create: `test/images/interior-bedroom.jpg`
- Create: `test/images/interior-kitchen.jpg`
- Create: `test/images/interior-living-room-bright.jpg`
- Create: `test/images/interior-living-room-dark.jpg`
- Create: `test/images/interior-office.jpg`

**Interfaces:**

- Consumes: `validateImageUpload(bytes: Uint8Array, filename: string)` from
  `src/editor/image-upload.ts`.
- Produces: `ReliabilityCase`, `ReliabilityCategory`, and
  `loadReliabilityCorpus(manifestUrl: URL): Promise<ReliabilityCase[]>`.

- [ ] **Step 1: Write the failing corpus contract test**

  Create `test/reliability/corpus.test.ts`. Its main assertion should be:

  ```ts
  import { createHash } from 'node:crypto'

  import { describe, expect, test } from 'bun:test'

  import { validateImageUpload } from '../../src/editor/image-upload'
  import { loadReliabilityCorpus } from '../../src/reliability/corpus'

  const manifest = new URL('../images/manifest.json', import.meta.url)

  describe('reliability corpus', () => {
    test('contains five valid product and five valid interior photographs', async () => {
      const cases = await loadReliabilityCorpus(manifest)

      expect(cases).toHaveLength(10)
      expect(cases.filter((item) => item.category === 'product')).toHaveLength(5)
      expect(cases.filter((item) => item.category === 'interior')).toHaveLength(5)
      expect(new Set(cases.map((item) => item.id)).size).toBe(10)

      for (const item of cases) {
        const bytes = await Bun.file(item.imageUrl).bytes()
        expect(validateImageUpload(bytes, 'image.jpg')).toMatchObject({ format: 'jpeg' })
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(item.sha256)
        expect(item.instruction.trim().length).toBeGreaterThan(20)
        expect(item.expectation.trim().length).toBeGreaterThan(20)
        expect(item.source.licenseUrl).toBe('https://creativecommons.org/licenses/by/2.0/')
      }
    })
  })
  ```

  Add negative tests using a temporary manifest for duplicate ids, a category
  split other than five/five, an unsupported URL, an empty instruction, and a
  digest mismatch. Each test must assert the stable `ReliabilityCorpusError`
  code rather than a provider or filesystem message.

- [ ] **Step 2: Run the corpus test and verify RED**

  Run:

  ```bash
  bun test test/reliability/corpus.test.ts
  ```

  Expected: FAIL because `src/reliability/corpus.ts` and the manifest do not
  exist.

- [ ] **Step 3: Add the exact ten image files**

  Download the Open Images test rendition from
  `https://open-images-dataset.s3.amazonaws.com/test/<id>.jpg`. Save each file
  under the name and verify the SHA-256 below.

  | File                              | Open Images id     | SHA-256                                                            |
  | --------------------------------- | ------------------ | ------------------------------------------------------------------ |
  | `product-eye-shadow.jpg`          | `0049980696be0a34` | `dfb9b7f6983b5a89f0aa75daa794a8134e473adc9fc7c88fffd4d02db0ba6791` |
  | `product-face-cream.jpg`          | `008ed2884d0fab85` | `b4a6d3e127db9b405f3dbd3ce72a1cf65a3d3f31494c42392c9454c42d5d02f7` |
  | `product-perfume.jpg`             | `1064b8242aeda1d6` | `81ac1185c67c6a221638d07c53ed38d147935e081408284029a20b5286e71a76` |
  | `product-blue-sneakers.jpg`       | `00848eefdb280a47` | `a4a052c4a4911f417b30c73a40a7d964f658e7e90ffb34f8d879f7a1201650f8` |
  | `product-red-heel.jpg`            | `008cc24080b8e215` | `ccc079403a26df840725d9a485df5e84ebd1fdf75a8ce9dba221c1749812529a` |
  | `interior-bedroom.jpg`            | `040f7caee109ab4b` | `03cd2f8a3324376b6e9eee1ce27635958d09936cefccfc54ae9fa3281906a132` |
  | `interior-kitchen.jpg`            | `00abaabafe892423` | `5b187728ddf4806437bf3189d6828f087955ba763fca1a11b715541cc80bf484` |
  | `interior-living-room-bright.jpg` | `00d480139b4eff48` | `c650e10859df4df5e12f4e88bd265bcfd8a9dddeb9c0891a78ee64372132abdd` |
  | `interior-living-room-dark.jpg`   | `0056ffa38a8489b6` | `6c24311a2abdac88bf55c461168c0cbd5f0f4c44e13d73f26090db71d4d344db` |
  | `interior-office.jpg`             | `f24d04be72d3fa6d` | `d76879216d35f2b06c6934d3c37c98704bcd5b35da9635ebf6b1fa24bbccd0c2` |

- [ ] **Step 4: Write the manifest with exact case content**

  Use this instruction and expectation matrix. Preserve each Open Images id,
  Flickr landing URL, author, CC BY 2.0 licence URL, download URL, and digest in
  the matching manifest entry.

  | Id                            | Instruction                                                                                                                                                    | Human expectation                                                                                                      |
  | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
  | `product-eye-shadow`          | Clean dust and small marks from the compact, lift the product detail, and keep the pink colour believable. Put every edit on a clearly named editable layer.   | The compact is clean and crisp, the pink remains natural, and the background is not visibly clipped.                   |
  | `product-face-cream`          | Brighten the face-cream jar, recover the dark red glass, and reduce uneven background tone. Put every edit on a clearly named editable layer.                  | The jar separates from the background, its highlights retain detail, and the red glass remains rich rather than black. |
  | `product-perfume`             | Neutralize the white background, brighten the perfume bottle, and remove visible dust or small distractions. Put every edit on a clearly named editable layer. | The background reads neutral white, the bottle edge stays defined, and label detail remains legible.                   |
  | `product-blue-sneakers`       | Clean the white background, correct the colour cast, and add gentle contrast to the blue canvas shoes. Put every edit on a clearly named editable layer.       | The shoes remain blue, the rubber keeps texture, and the background is even without losing the shoe edges.             |
  | `product-red-heel`            | Remove background specks, deepen the red shoe without crushing shadows, and soften the hard floor shadow. Put every edit on a clearly named editable layer.    | The red stays saturated with visible material detail, and the shadow looks softer while the shoe remains grounded.     |
  | `interior-bedroom`            | Balance the bright window against the room, lift dark furniture detail, and neutralize the room colour cast. Put every edit on a clearly named editable layer. | Window detail improves, the furniture is readable, and the bedding remains neutral without a flat HDR look.            |
  | `interior-kitchen`            | Brighten the kitchen evenly, recover window and counter detail, and neutralize the cabinet colour. Put every edit on a clearly named editable layer.           | Cabinets remain white, the counters retain texture, and the window no longer dominates the room.                       |
  | `interior-living-room-bright` | Recover bright window detail, warm the room gently, and lift the darker sofa and floor areas. Put every edit on a clearly named editable layer.                | The window is controlled, the room stays natural, and the sofa is clearer without washed-out blacks.                   |
  | `interior-living-room-dark`   | Lift the dim room, correct the mixed colour cast, and balance the television wall with the seating area. Put every edit on a clearly named editable layer.     | The seating and wall are readable, neutral surfaces remain neutral, and noise or halos are not exaggerated.            |
  | `interior-office`             | Correct the office white balance, recover the bright ceiling, and open the darker desk areas. Put every edit on a clearly named editable layer.                | The office looks evenly lit, ceiling highlights retain detail, and desk areas remain natural.                          |

  Use these exact provenance values:

  | Open Images id     | Author                                             | Flickr landing URL                                               |
  | ------------------ | -------------------------------------------------- | ---------------------------------------------------------------- |
  | `0049980696be0a34` | `Ⅿeagan`                                           | `https://www.flickr.com/photos/meaganjean/3363560333`            |
  | `008ed2884d0fab85` | `Héctor Esteban Menéndez`                          | `https://www.flickr.com/photos/mirwav/7090973067`                |
  | `1064b8242aeda1d6` | `AlmegaAB`                                         | `https://www.flickr.com/photos/almega/12519716475`               |
  | `00848eefdb280a47` | `SPERA.de Designerschuhe, Taschen und Accessoires` | `https://www.flickr.com/photos/spera-designerschuhe/16528471507` |
  | `008cc24080b8e215` | `Haydn Curtis`                                     | `https://www.flickr.com/photos/fotosbyflick/2810192714`          |
  | `040f7caee109ab4b` | `Cláudio Franco`                                   | `https://www.flickr.com/photos/claudiof/3942882452/`             |
  | `00abaabafe892423` | `jjkadaba69`                                       | `https://www.flickr.com/photos/7853799@N03/4793138843`           |
  | `00d480139b4eff48` | `jinkazamah`                                       | `https://www.flickr.com/photos/jinkazamah/2925764125`            |
  | `0056ffa38a8489b6` | `Scott Woods-Fehr`                                 | `https://www.flickr.com/photos/woodsfehr/3221956035`             |
  | `f24d04be72d3fa6d` | `Herry Lawford`                                    | `https://www.flickr.com/photos/herry/5592542282`                 |

- [ ] **Step 5: Implement the corpus loader**

  Define these public types in `src/reliability/corpus.ts`:

  ```ts
  export type ReliabilityCategory = 'product' | 'interior'

  export interface ReliabilitySource {
    openImagesId: string
    author: string
    landingUrl: string
    downloadUrl: string
    licenseUrl: string
  }

  export interface ReliabilityCase {
    id: string
    category: ReliabilityCategory
    imageUrl: URL
    sha256: string
    instruction: string
    expectation: string
    source: ReliabilitySource
  }

  export type ReliabilityCorpusErrorCode =
    | 'invalid_manifest'
    | 'invalid_case_count'
    | 'invalid_category_split'
    | 'duplicate_case_id'
    | 'invalid_case'
    | 'missing_image'
    | 'digest_mismatch'
    | 'invalid_image'

  export class ReliabilityCorpusError extends Error {
    constructor(readonly code: ReliabilityCorpusErrorCode) {
      super(code)
      this.name = 'ReliabilityCorpusError'
    }
  }

  export async function loadReliabilityCorpus(manifestUrl: URL): Promise<ReliabilityCase[]>
  ```

  Parse unknown JSON defensively. Resolve image filenames relative to the
  manifest. Reject absolute paths, `..` traversal, non-HTTPS provenance URLs,
  any licence other than CC BY 2.0, duplicate ids, a non-five/five split, a
  missing file, digest drift, or an upload rejected by `validateImageUpload()`.
  Return the cases in manifest order.

- [ ] **Step 6: Run the corpus test and verify GREEN**

  Run:

  ```bash
  bun test test/reliability/corpus.test.ts
  bun run typecheck
  ```

  Expected: all corpus tests pass and TypeScript reports no errors.

- [ ] **Step 7: Commit the corpus**

  ```bash
  git add src/reliability/corpus.ts test/reliability/corpus.test.ts test/images
  git commit -m "test(reliability): add the representative image corpus"
  ```

---

### Task 2: Run cases sequentially and validate their PSDs

**Files:**

- Create: `src/reliability/suite.ts`
- Create: `test/reliability/suite.test.ts`

**Interfaces:**

- Consumes: `ReliabilityCase`, `ManagedRun`, `RunEvent`,
  `parsePsdMetadata()`, `toLayerInfoTree()`, and
  `assertCompleteLayerTree()`.
- Produces: `StartReliabilityRun`, `ReliabilityCaseResult`,
  `ReliabilitySummary`, and `runReliabilitySuite()`.

- [ ] **Step 1: Write failing orchestration tests**

  Create fakes that return `ManagedRun` instances with replayable event arrays
  and a publisher supplied by the suite. Use
  `src/editor/fixtures/photopea-production-export.psd` for passing PSD bytes.
  Cover these cases:

  ```ts
  test('runs cases one at a time in manifest order', async () => {
    expect(maximumRunsInFlight).toBe(1)
    expect(startedIds).toEqual(['product-one', 'interior-one'])
  })

  test('passes only a complete run with a valid editable PSD', async () => {
    expect(summary.results[0]).toMatchObject({
      outcome: 'complete',
      passed: true,
      steps: 3,
      costUsd: 0.42,
      cacheHitRate: 0.9,
      failureCode: null
    })
  })

  test.each([
    ['step_cap', 'incomplete'],
    ['spend_cap', 'incomplete'],
    ['time_limit', 'incomplete'],
    ['cancelled', 'cancelled'],
    ['failed', 'run_failed']
  ] as const)('fails %s without stopping later cases', async (outcome, failureCode) => {
    expect(summary.results[0]).toMatchObject({ passed: false, outcome, failureCode })
    expect(summary.results[1]?.id).toBe('interior-one')
  })
  ```

  Also assert `missing_psd`, `invalid_psd`, and `invalid_layers`; the last cost
  event wins; step events are counted; `releaseSecrets()` runs exactly once;
  frames and narrations do not enter results; and an aborted suite cancels its
  active run without starting another case.

- [ ] **Step 2: Run the suite test and verify RED**

  Run:

  ```bash
  bun test test/reliability/suite.test.ts
  ```

  Expected: FAIL because `src/reliability/suite.ts` does not exist.

- [ ] **Step 3: Implement the suite interfaces**

  Use these types:

  ```ts
  import type { PublishedKind } from '../agent/loop'
  import type { ManagedRun, RunStopReason } from '../server/managed-run'
  import type { ReliabilityCase } from './corpus'

  export interface ReliabilityPublish {
    (bytes: Uint8Array, kind: PublishedKind): Promise<string>
  }

  export interface StartReliabilityRunInput {
    testCase: ReliabilityCase
    image: Uint8Array
    publish: ReliabilityPublish
  }

  export type StartReliabilityRun = (input: StartReliabilityRunInput) => ManagedRun

  export type ReliabilityFailureCode =
    'incomplete' | 'cancelled' | 'run_failed' | 'missing_psd' | 'invalid_psd' | 'invalid_layers'

  export interface ReliabilityCaseResult {
    id: string
    category: ReliabilityCase['category']
    expectation: string
    outcome: RunStopReason
    passed: boolean
    steps: number
    costUsd: number
    tokensIn: number
    tokensOut: number
    cacheHitRate: number | null
    failureCode: ReliabilityFailureCode | null
    psd?: Uint8Array
    preview?: Uint8Array
  }

  export interface ReliabilitySummary {
    startedAt: string
    finishedAt: string
    threshold: 8
    total: number
    passed: number
    meetsNfr1: boolean
    results: ReliabilityCaseResult[]
  }

  export interface ReliabilitySuiteOptions {
    cases: readonly ReliabilityCase[]
    startRun: StartReliabilityRun
    now?: () => Date
    signal?: AbortSignal
  }

  export async function runReliabilitySuite(options: ReliabilitySuiteOptions): Promise<ReliabilitySummary>
  ```

  Capture PSD and preview bytes inside the per-case publisher. Return opaque
  strings such as `captured:psd`; never encode frames. Consume the complete
  event stream, counting steps and retaining the final cost event. Read
  `managed.metrics()` only after the stream ends and call `releaseSecrets()` in
  `finally`.

  Validate PSD bytes with `parsePsdMetadata()`, convert with
  `toLayerInfoTree()`, and apply `assertCompleteLayerTree()`. Map every caught
  error to the fixed failure codes above. Do not put `error.message` in the
  result.

- [ ] **Step 4: Run orchestration tests and verify GREEN**

  Run:

  ```bash
  bun test test/reliability/suite.test.ts
  bun run typecheck
  ```

  Expected: all suite tests pass and TypeScript reports no errors.

- [ ] **Step 5: Commit the suite**

  ```bash
  git add src/reliability/suite.ts test/reliability/suite.test.ts
  git commit -m "feat(reliability): run the ten-image suite"
  ```

---

### Task 3: Persist and format inspectable reports

**Files:**

- Create: `src/reliability/report.ts`
- Create: `test/reliability/report.test.ts`
- Modify: `.gitignore`

**Interfaces:**

- Consumes: `ReliabilitySummary` and artifact bytes in each result.
- Produces: `serializableReliabilitySummary()`,
  `formatReliabilityMarkdown()`, `formatReliabilityTerminal()`, and
  `writeReliabilityReport()`.

- [ ] **Step 1: Write failing report tests**

  Use a two-case summary containing one pass and one failure. Assert:

  ```ts
  expect(formatReliabilityTerminal(summary)).toContain('1/2 passed')
  expect(formatReliabilityTerminal(summary)).toContain('product-one')
  expect(formatReliabilityMarkdown(summary)).toContain('| product-one | product | complete | 3 | $0.42 | 90% | pass |')
  expect(serializableReliabilitySummary(summary).results[0]).not.toHaveProperty('psd')
  expect(serializableReliabilitySummary(summary).results[0]).not.toHaveProperty('preview')
  ```

  Write to a temporary directory and assert `summary.json`, `summary.md`, and
  the available `result.psd` and `preview.png` bytes. Assert no output contains
  a value shaped like `sk-secret123`, `wss://`, a narration, or a frame URL.

- [ ] **Step 2: Run report tests and verify RED**

  Run:

  ```bash
  bun test test/reliability/report.test.ts
  ```

  Expected: FAIL because `src/reliability/report.ts` does not exist.

- [ ] **Step 3: Implement stable reports**

  Define:

  ```ts
  export function serializableReliabilitySummary(summary: ReliabilitySummary): object
  export function formatReliabilityTerminal(summary: ReliabilitySummary): string
  export function formatReliabilityMarkdown(summary: ReliabilitySummary): string
  export async function writeReliabilityReport(outputDirectory: URL, summary: ReliabilitySummary): Promise<void>
  ```

  JSON must omit byte arrays. Store binary outputs under a directory named by
  the validated case id. Markdown and terminal rows contain only id, category,
  outcome, steps, cost, cache percentage, and pass/failure code. Use two
  decimal places for USD and a whole percentage or `n/a` for cache rate.

  Add `/artifacts/reliability/` to `.gitignore`.

- [ ] **Step 4: Run report tests and verify GREEN**

  Run:

  ```bash
  bun test test/reliability/report.test.ts
  bun run typecheck
  ```

  Expected: all report tests pass and TypeScript reports no errors.

- [ ] **Step 5: Commit reporting**

  ```bash
  git add .gitignore src/reliability/report.ts test/reliability/report.test.ts
  git commit -m "feat(reliability): report suite results"
  ```

---

### Task 4: Add the paid production command

**Files:**

- Create: `scripts/run-reliability.ts`
- Create: `test/reliability/live-runner.test.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `README.md`

**Interfaces:**

- Consumes: `loadReliabilityCorpus()`, `runReliabilitySuite()`,
  `writeReliabilityReport()`, `liveAgentRun()`, and `BrowserbaseClient`.
- Produces: package command `bun run reliability`.

- [ ] **Step 1: Extract a testable live adapter**

  Keep argument and environment parsing in exported pure functions from
  `scripts/run-reliability.ts`, guarded by `if (import.meta.main)`. Write tests
  for this public shape:

  ```ts
  export interface ReliabilityCommandConfig {
    openAiApiKey: string
    browserbaseApiKey: string
    publicUrl: string
    outputRoot: URL
    stepCap: number
    budgetUsd: number
  }

  export function readReliabilityCommandConfig(
    env: Record<string, string | undefined>,
    args: readonly string[]
  ): ReliabilityCommandConfig

  export interface ReliabilityCommandDependencies {
    loadCorpus?: typeof loadReliabilityCorpus
    runSuite?: typeof runReliabilitySuite
    writeReport?: typeof writeReliabilityReport
    write?: (text: string) => void
    now?: () => Date
    createBrowserbaseClient?: (apiKey: string) => BrowserbaseClient
    liveRun?: typeof liveAgentRun
  }

  export async function runReliabilityCommand(
    config: ReliabilityCommandConfig,
    dependencies?: ReliabilityCommandDependencies
  ): Promise<number>
  ```

  Assert all missing variables are named together without echoing any value,
  defaults are 40 and 8, invalid numeric values fail before a paid dependency
  is created, and the command returns 0 at eight passes and 1 below eight. Use
  the dependency object for these tests; the defaults remain the production
  implementations.

- [ ] **Step 2: Run live-adapter tests and verify RED**

  Run:

  ```bash
  bun test test/reliability/live-runner.test.ts
  ```

  Expected: FAIL because `scripts/run-reliability.ts` does not exist.

- [ ] **Step 3: Implement the production adapter**

  `runReliabilityCommand()` must:

  1. load `test/images/manifest.json`;
  2. create a single `BrowserbaseClient`;
  3. call `runReliabilitySuite()` with a `startRun` that invokes
     `liveAgentRun()` using the case image and instruction;
  4. set `hostUrl` to `/photopea-host` on `PUBLIC_URL`;
  5. write beneath
     `artifacts/reliability/<ISO timestamp without colon characters>/`;
  6. print `formatReliabilityTerminal()`; and
  7. return 0 only when `summary.meetsNfr1` is true.

  Register `SIGINT` and `SIGTERM` on one `AbortController`. Remove both
  listeners after the suite settles. Never print the environment or an error's
  raw message.

  Add this package script:

  ```json
  "reliability": "bun scripts/run-reliability.ts"
  ```

  Extend `tsconfig.json` with `scripts/**/*.ts`, so the paid entry point is part
  of `bun run typecheck`.

  Document the command, required variables, sequential cost, output directory,
  and `RELIABILITY_ENABLED` guard in `README.md`.

- [ ] **Step 4: Run command tests and verify GREEN**

  Run:

  ```bash
  bun test test/reliability/live-runner.test.ts
  bun run typecheck
  bun run lint
  ```

  Expected: all adapter tests pass, TypeScript reports no errors, and Prettier
  reports a clean tree.

- [ ] **Step 5: Commit the live command**

  ```bash
  git add scripts/run-reliability.ts test/reliability/live-runner.test.ts package.json tsconfig.json README.md
  git commit -m "feat(reliability): add the live suite command"
  ```

---

### Task 5: Publish the guarded nightly result

**Files:**

- Create: `.github/workflows/reliability.yml`
- Create: `test/reliability/workflow.test.ts`
- Modify: `docs/references/git-workflow.md`

**Interfaces:**

- Consumes: `bun run reliability`, Google Workload Identity configuration,
  `BROWSERBASE_API_KEY`, and the Secret Manager `OPENAI_API_KEY`.
- Produces: a guarded scheduled/manual workflow, job summary, and uploaded run
  artifact.

- [ ] **Step 1: Write the failing workflow contract test**

  Parse `.github/workflows/reliability.yml` with `Bun.YAML.parse()` and assert
  the controls that prevent an accidental paid pull-request run:

  ```ts
  const source = await Bun.file(new URL('../../.github/workflows/reliability.yml', import.meta.url)).text()
  const workflow = Bun.YAML.parse(source) as {
    on: Record<string, unknown>
    jobs: Record<string, { if?: string; steps: { run?: string; uses?: string }[] }>
  }
  const job = workflow.jobs.reliability

  expect(workflow.on).toHaveProperty('schedule')
  expect(workflow.on).toHaveProperty('workflow_dispatch')
  expect(workflow.on).not.toHaveProperty('pull_request')
  expect(job?.if).toBe("vars.RELIABILITY_ENABLED == 'true'")
  expect(job?.steps.some((step) => step.run?.includes('bun run reliability'))).toBe(true)
  expect(job?.steps.some((step) => step.run?.includes('GITHUB_STEP_SUMMARY'))).toBe(true)
  expect(job?.steps.some((step) => step.uses === 'actions/upload-artifact@v4')).toBe(true)
  ```

- [ ] **Step 2: Run the workflow test and verify RED**

  Run:

  ```bash
  bun test test/reliability/workflow.test.ts
  ```

  Expected: FAIL because `.github/workflows/reliability.yml` does not exist.

- [ ] **Step 3: Implement the guarded workflow**

  Use `workflow_dispatch` plus this schedule:

  ```yaml
  schedule:
    - cron: '0 16 * * *'
  ```

  The one job must have:

  ```yaml
  if: vars.RELIABILITY_ENABLED == 'true'
  timeout-minutes: 180
  environment: production
  permissions:
    contents: read
    id-token: write
  ```

  Reuse the project id, Workload Identity provider, deployer service account,
  and public URL already present in `.github/workflows/deploy.yml`. Authenticate
  with `google-github-actions/auth@v3` and `setup-gcloud@v3`. Read
  `OPENAI_API_KEY` from Secret Manager inside the same shell that runs the
  command; pass `BROWSERBASE_API_KEY` from the repository secret. Do not write
  either value to `GITHUB_ENV` or an artifact.

  Give the run step `id: reliability` and `continue-on-error: true`. In later
  `if: always()` steps, append the newest `summary.md` to
  `GITHUB_STEP_SUMMARY` and upload `artifacts/reliability/`. End with a step
  that exits 1 when `steps.reliability.outcome` is `failure`.

  Add the reliability workflow to the workflow table in
  `docs/references/git-workflow.md`, describing it as scheduled evidence rather
  than a pull-request merge gate.

- [ ] **Step 4: Run workflow checks and verify GREEN**

  Run:

  ```bash
  bun test test/reliability/workflow.test.ts
  actionlint .github/workflows/reliability.yml
  bun run typecheck
  bun run lint
  ```

  Expected: all checks pass. Do not dispatch the workflow and do not enable
  `RELIABILITY_ENABLED`.

- [ ] **Step 5: Commit the workflow**

  ```bash
  git add .github/workflows/reliability.yml test/reliability/workflow.test.ts docs/references/git-workflow.md
  git commit -m "ci(reliability): publish the nightly result"
  ```

---

### Task 6: Run final verification and prepare review

**Files:**

- Modify only files needed to fix defects found by verification.

**Interfaces:**

- Consumes: every deliverable above.
- Produces: a reviewed branch ready to push as a pull request.

- [ ] **Step 1: Refresh the knowledge graph**

  Run:

  ```bash
  graphify update .
  ```

  Expected: the graph updates without an extraction failure.

- [ ] **Step 2: Run the complete deterministic verification**

  Run:

  ```bash
  bun test
  bun run typecheck
  bun run lint
  bun run build
  git diff --check origin/main...HEAD
  ```

  Expected: all deterministic tests pass, optional live tests remain skipped,
  and every other command exits zero.

- [ ] **Step 3: Audit the history and tree**

  Run:

  ```bash
  git status --short
  git log --oneline origin/main..HEAD
  git diff --stat origin/main...HEAD
  ```

  Expected: no uncommitted product changes, five implementation commits after
  the design and plan commits, and no unrelated files.

- [ ] **Step 4: Request independent code review**

  Review every diff against issue #10 and the approved design. Resolve all
  correctness findings, rerun the affected focused tests, and repeat the full
  verification after the final change.

- [ ] **Step 5: Push and create a pull request**

  Push `test/reliability-suite` and create a PR titled:

  ```text
  test(reliability): measure the ten-image suite
  ```

  The PR body must state that paid live execution was not performed, the
  workflow guard remains disabled, and issue #10 still needs an authorized
  fresh run before closure. Use `Refs #10`, not `Closes #10`.
