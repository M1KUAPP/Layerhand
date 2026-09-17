# Ten-image reliability suite design

This design defines the repeatable measurement for issue #10 and NFR-1. It
runs ten representative photographs through the production agent composition,
checks the layered result, and leaves a report the team can inspect without
reading raw event logs.

Contents:

1.  [Goals](#goals)
1.  [Non-goals](#non-goals)
1.  [Selected approach](#selected-approach)
1.  [Corpus contract](#corpus-contract)
1.  [Execution flow](#execution-flow)
1.  [Results and visibility](#results-and-visibility)
1.  [Nightly workflow and spending guard](#nightly-workflow-and-spending-guard)
1.  [Testing strategy](#testing-strategy)
1.  [Expected file layout](#expected-file-layout)
1.  [Acceptance mapping](#acceptance-mapping)

## Goals

- Keep five e-commerce product photographs and five interior photographs in
  `test/images/` with an instruction and expectation for each image.
- Run all ten cases with one command through the same `liveAgentRun()` used by
  `RUN_MODE=agent`.
- Print the aggregate pass count and every case's outcome, step count, cost,
  and cache hit rate.
- Validate that a passing run completed unattended and produced a structurally
  valid, editable layered PSD.
- Support a visible nightly result without making deterministic pull-request
  checks spend model or Browserbase credits.

## Non-goals

- The harness does not score aesthetic quality automatically. The manifest's
  written expectation and retained preview support human review.
- The harness does not run cases concurrently. Sequential runs make individual
  failures and costs easier to attribute and avoid a ten-session rate spike.
- The harness does not turn a missing credential into a skipped passing run.
- Pull requests do not execute the paid suite.

## Selected approach

The runner calls `liveAgentRun()` directly with the production
`ResponsesModel`, Browserbase editor session, and export path. This is closer to
the real product than a fake-editor benchmark while avoiding unrelated HTTP,
metering, and visitor-account behavior.

Two alternatives were rejected:

- Driving the deployed HTTP API includes useful end-to-end coverage, but makes
  this reliability measure depend on deployment authentication, persistence,
  and public artifact URLs that issue #10 does not assess.
- Extending the one-off script in `docs/evidence/agent-run/` would be quicker,
  but would keep case validation, execution, and reporting in an evidence
  script without deterministic tests.

The production dependencies sit behind a small injected run function. Tests
use a fake implementation; the command uses `liveAgentRun()` unchanged.

## Corpus contract

`test/images/manifest.json` is the single ordered list of cases. Every entry
contains:

- a stable identifier and category, either `product` or `interior`;
- the repository-relative image filename;
- the retouching instruction sent to the model;
- a written visual expectation for a human reviewer;
- the original landing page, author, and licence URL.

The corpus contains exactly ten distinct decodable JPEG or PNG files, five in
each category. Each file stays within the existing 20 MB and 6000 px upload
limits. A deterministic test validates the manifest, files, category balance,
unique identifiers, and required provenance.

Images come from Open Images V7 entries whose metadata lists a Creative
Commons Attribution licence. Selection favours isolated product compositions
and ordinary room interiors rather than polished stock scenes. The downloader
records each original landing page and author, and each licence is checked on
the image's own metadata before the file is committed. Google warns that its
dataset-level licence list is not a warranty, so missing per-image provenance
is a hard validation failure.

The official references are the
[Open Images V7 download page](https://storage.googleapis.com/openimages/web/download_v7.html)
and its
[licence statement](https://storage.googleapis.com/openimages/web/factsfigures_v7.html#licenses).

## Execution flow

`src/reliability/corpus.ts` parses and validates the manifest. It returns
typed cases in manifest order and rejects the suite before any paid call when
the corpus is malformed.

`src/reliability/suite.ts` owns the sequential orchestration. For each case it:

1.  reads the image;
2.  creates one run with the configured step and spend caps;
3.  collects the terminal event and final cumulative cost event;
4.  writes the PSD and preview beneath the run's output directory;
5.  parses the PSD and applies the production layer-tree policy;
6.  records one success or one stable failure reason; and
7.  continues to the next case unless the process receives a termination
    signal.

One case passes only when the run ends with `complete`, the PSD parses, and the
parsed layer tree satisfies `assertCompleteLayerTree()`. A failure to start,
run, export, parse, or satisfy policy fails only that case. The process exits
non-zero when fewer than eight cases pass, matching NFR-1.

`scripts/run-reliability.ts` is the paid command-line adapter. It reads
`OPENAI_API_KEY`, `BROWSERBASE_API_KEY`, and `PUBLIC_URL`, validates all three
before starting, and supplies `liveAgentRun()` to the suite. The package script
is `bun run reliability`.

## Results and visibility

Each invocation creates a timestamped directory below
`artifacts/reliability/`. That path is ignored by Git. It contains:

- `summary.json`, with suite totals and one complete record per case;
- one directory per case containing the PSD and preview when available; and
- a Markdown summary suitable for a GitHub Actions job summary.

The terminal prints one compact row per case followed by `N/10 passed`. Each
row includes outcome, steps, cost, cache hit rate, and failure reason. Results
never contain API keys, Browserbase connection addresses, full instructions,
or frame data.

## Nightly workflow and spending guard

`.github/workflows/reliability.yml` supports `workflow_dispatch` and a nightly
schedule. The scheduled paid job runs only when the repository variable
`RELIABILITY_ENABLED` is exactly `true`. An explicit manual dispatch with
`task=reliability` runs regardless of that variable and may select a
non-default ref. Both paths enter the protected `production` environment and
wait for one of its required reviewers; repository administrators cannot
bypass that gate. Approval authorizes the suite's maximum spend. The job reads
`BROWSERBASE_API_KEY` from a repository secret and fetches `OPENAI_API_KEY`
from Google Secret Manager through Workload Identity Federation. It runs the
single command, appends the Markdown report to `GITHUB_STEP_SUMMARY`, and
uploads the result directory even when fewer than eight cases pass.

The schedule guard ships disabled. Enabling it or manually dispatching the
reliability task makes a paid run eligible for approval because ten runs can
spend up to ten times the per-run cap. Scheduled workflows use the default
branch; manual dispatches can run the workflow from another selected ref.

## Testing strategy

Deterministic tests cover:

- valid and malformed corpus manifests, including the exact five/five split;
- all ten committed images through the existing upload validator;
- a mixed fake suite that proves sequential execution and per-case isolation;
- success only after PSD parsing and the production layer policy;
- accurate steps, cost, cache rate, pass count, and process decision;
- stable JSON and Markdown reports with no frame or secret-shaped data; and
- workflow triggers, guard, summary publication, and artifact upload.

The live command is not part of `bun test`. Before issue closure, one authorized
run supplies the fresh ten-image result and the team inspects the retained
previews against the manifest expectations.

## Expected file layout

```text
test/images/
  manifest.json
  product-*.jpg
  interior-*.jpg
src/reliability/
  corpus.ts
  report.ts
  suite.ts
test/reliability/
  corpus.test.ts
  report.test.ts
  suite.test.ts
scripts/
  run-reliability.ts
.github/workflows/
  reliability.yml
```

The implementation may combine a pair of very small modules when that keeps
the public boundary clearer, but it must preserve separate corpus, execution,
and reporting responsibilities.

## Acceptance mapping

- Ten real photographs with instructions and expectations: the validated
  manifest and committed corpus.
- One command with pass count, outcome, steps, and cost: `bun run reliability`
  and its terminal plus JSON reports.
- Nightly result visible to the team: the guarded workflow, job summary, and
  uploaded artifact.
- Representative users: the enforced five-product and five-interior split and
  the per-image provenance record.
