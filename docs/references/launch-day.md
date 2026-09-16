# Launch day runbook

What to do, and what not to do, on the day Layerhand launches. It assumes
the service is already live in agent mode and that something has gone wrong
or someone wants to change a number in a hurry. The reasoning behind the
limits is in the [TRD](/docs/TRD.md); this page is the operating side.

Contents:

1.  [The clock](#the-clock)
1.  [The freeze, and the no-deploy rule](#the-freeze-and-the-no-deploy-rule)
1.  [Rolling back to the previous revision](#rolling-back-to-the-previous-revision)
1.  [Where to look when something is wrong](#where-to-look-when-something-is-wrong)
1.  [Changing a limit in a hurry](#changing-a-limit-in-a-hurry)
1.  [Rotating the server key](#rotating-the-server-key)
1.  [When the providers misbehave](#when-the-providers-misbehave)
1.  [See also](#see-also)

## The clock

| Moment               | Time                                         |
| -------------------- | -------------------------------------------- |
| Freeze begins        | Thursday, September 17, evening              |
| Submissions close    | Friday, September 18, 12:00am PT (07:00 UTC) |
| The launch publishes | Friday, September 18, 12:01am PT             |
| Ranking window ends  | Friday, September 18, 11:59pm PT             |

A launch enters the contest only if it is scheduled for the 18th **and**
joined to the challenge, which is a separate choice when scheduling. The
sources are quoted in [PRODUCT § Open questions](/docs/PRODUCT.md#open-questions).

## The freeze, and the no-deploy rule

**A merge to `main` that touches code deploys. Once a required reviewer
is set on the `production` environment, that deploy waits for an
approval first.** `deploy.yml` builds and deploys on every push to
`main`, except a push that changes only documentation, `graphify-out/`,
or evidence under `docs/evidence/`: `paths-ignore` stops that from
triggering the workflow at all, so those merge safely at any time. Cloud
Run runs **one instance** whose memory holds the state of every run in
flight, so a deploy restarts it, ends the runs that are going on, and a
visitor watching one sees it stop. The `deploy` job targets the
`production` environment, but targeting an environment does not gate a
job by itself — only a required-reviewers protection rule on that
environment does. That rule is a repository setting the maintainers add
separately, after this change merges; once it is in place, a build
reaching Cloud Run is a deliberate second step, not a side effect of the
merge.

So, from the freeze onwards:

1.  **Check for live runs before approving, not just before merging.** A
    merge still starts the build immediately; approving is what deploys it.
    Run the query below and wait for it to come back empty, with no new
    traffic, before approving.
2.  **Give the approval from the run's page.** Under the repository's
    **Actions** tab, open the workflow run for the merge. Once the
    required-reviewers rule is set on `production`, it shows a **Review
    deployments** button — the rule is what gates the job, not merely the
    `deploy` job targeting `production`. Click it, select **production**,
    and click **Approve and deploy** once the check above is clean — or
    leave it pending until it is.
3.  **If something must change, change it on the service, not in the
    repository.** [Changing a limit in a hurry](#changing-a-limit-in-a-hurry)
    does that without a new image, and the repository catches up afterwards.
4.  **If a deploy is unavoidable**, announce it, wait for the run log to go
    quiet, then approve.

To see whether runs are live, ask the database for runs that have not
finished; a run writes its row only when it ends, so an empty answer over
the last few minutes plus no traffic is the signal:

```sh
psql "$DATABASE_URL" -c \
  "select count(*), max(completed_at) from run_log
     where completed_at::timestamptz > now() - interval '15 minutes';"
```

Fifteen minutes is the run ceiling, so nothing older than that is still
going.

## Rolling back to the previous revision

Cloud Run keeps every revision it has deployed, so undoing a bad deploy is a
traffic change, not a new build:

```sh
gcloud run revisions list \
  --project layerhand-astra-2026 --region us-central1 \
  --service layerhand --format 'value(metadata.name)' --limit 5
gcloud run services update-traffic layerhand \
  --project layerhand-astra-2026 --region us-central1 \
  --to-revisions "<previous-revision-name>=100"
```

The first command finds the revision before the bad one; the second sends
it all the traffic. This does not undo whatever the bad revision already
did to runs in flight — it only stops things from getting worse. Announce
the rollback the same way as a deploy, and open an issue the same day so
the repository catches up, whether that means reverting the merge or
fixing forward.

**A rollback does not hold on its own.** The deploy step runs a plain
`gcloud run deploy` with no `--no-traffic` flag, so it sends all traffic
to its new revision. The next successful deploy overwrites this
rollback and brings the bad change back if `main` still contains it, so
the bad commit must be reverted or fixed on `main` before any other
deploy is approved during the freeze.

## Where to look when something is wrong

Three places, in the order worth trying:

1.  **The run log table**, one row per finished run (NFR-8):

    ```sh
    psql "$DATABASE_URL" -c \
      "select run_id, outcome, failure_code, steps, cost_usd, duration_ms
         from run_log order by completed_at desc limit 20;"
    ```

    `outcome` is how it ended: `complete`, `step_cap`, `spend_cap`,
    `time_limit`, `shutdown`, `cancelled`, or `failed`. `shutdown` is a
    deploy or a scale-down, not a visitor's own cancel. `failure_code`
    says what a failed run failed on: `model_call_failed`,
    `editor_open_failed`, `editor_action_failed`,
    `editor_screenshot_failed`, `export_failed`, `publish_failed`,
    `layer_policy_failed`, `missing_narration`, or `run_failed` when
    nothing else explains it.

    The same table says whether a correction actually rode the WebSocket,
    and what an unattended run waved through on its own (NFR-8):

    ```sh
    psql "$DATABASE_URL" -c \
      "select run_id, transport, corrections_applied, corrections_replayed,
          corrections_indeterminate, safety_check_codes
         from run_log order by completed_at desc limit 20;"
    ```

    `transport` is `websocket` once the run's socket opened, `http`
    otherwise — a run on `boundary` steering, or one whose socket failed to
    open, is `http`. `corrections_applied` is how many corrections native
    steering delivered; `corrections_replayed` is how many were handed back
    as a user message instead, indeterminate ones (an unsettled correction
    after a dropped connection) included; `corrections_indeterminate` breaks
    those out. `safety_check_codes` is the codes the run acknowledged
    automatically, as a JSON array, empty when there were none.

2.  **The service's own records**, in Cloud Run's logs. A failed run writes
    one `run_failed` line to standard error carrying its `runId`, `step`,
    `failureCode`, the error's name, its message with keys and web
    addresses removed, and three stack frames. A key that Playwright does
    not know writes `editor_action_skipped`, which is a skipped action
    rather than a failed run.

    ```sh
    gcloud logging read \
      'resource.type=cloud_run_revision AND jsonPayload.event="run_failed"' \
      --project layerhand-astra-2026 --limit 20 --freshness 2h
    ```

3.  **The page a visitor sees** never carries any of that. Its reason for a
    failed run is fixed, deliberately, because a provider's message can
    quote a key.

## Changing a limit in a hurry

The numbers that bound spending and load, and what each does:

| Variable                 | Now    | What it bounds                                |
| ------------------------ | ------ | --------------------------------------------- |
| `FREE_DAILY_BUDGET_USD`  | 10     | Every free run together, per day (FR-37)      |
| `FREE_RUN_SPEND_CAP_USD` | 3      | One run, and what a free run reserves (NFR-2) |
| `RUN_STEP_CAP`           | 40     | Model calls in one run (FR-12)                |
| `MAX_CONCURRENT_RUNS`    | 20     | Runs in flight at once; the rest wait (NFR-4) |
| `STEERING`               | native | Whether a correction steers the live response |

During the freeze, change them **on the service**, which makes a new
revision from the image already deployed and does not touch `main`:

```sh
gcloud run services update layerhand \
  --project layerhand-astra-2026 --region us-central1 \
  --update-env-vars FREE_DAILY_BUDGET_USD=25
```

That restarts the container, so it ends runs in flight exactly as a deploy
does. Two things to know before typing it:

- **The ceiling cannot be set to zero.** The server refuses to start unless
  it is a positive number. To stop spending entirely, use
  [the providers section](#when-the-providers-misbehave).
- **The repository must catch up.** `deploy.yml` holds the real values, and
  the next deploy overwrites whatever was set by hand. Open the pull request
  the same day, even if it merges after the freeze.

`MAX_CONCURRENT_RUNS` covers free runs and runs on a visitor's own key
alike. It is not in `deploy.yml`, so the service runs with the default of 20
until it is set as above, and the server refuses to start with anything but
a whole number above zero. A run past the cap waits in line, sees its place,
and starts by itself. Nothing is logged for it until it ends, and one that
leaves the line is logged as `cancelled` with no steps. To see the value a
revision runs with, where no entry for it means the default:

```sh
gcloud run services describe layerhand \
  --project layerhand-astra-2026 --region us-central1 \
  --format 'yaml(spec.template.spec.containers[0].env)'
```

Lower it when a provider binds first: OpenAI rate limits, or Browserbase
refusing sessions. Raise it only within Browserbase's 25 browsers, of which
warm sessions take up to four, and with memory in mind: twenty runs peaked
at 679 MiB of the service's 4 GiB.

## Rotating the server key

`OPENAI_API_KEY` is a personal key and lives only in Secret Manager; it is
not a GitHub secret. To replace it:

```sh
printf '%s' "$NEW_KEY" | gcloud secrets versions add OPENAI_API_KEY \
  --project layerhand-astra-2026 --data-file=-
gcloud run services update layerhand \
  --project layerhand-astra-2026 --region us-central1
```

The service reads the secret when a revision starts, so the update is what
picks the new version up — and, like any update, it restarts the container
and ends the runs in flight. Never paste a key into an issue, a pull
request, or a commit.

The team secrets — `DATABASE_URL`, `SESSION_SECRET`, the two S3 keys and
`BROWSERBASE_API_KEY` — come from GitHub secrets, and the deploy copies each
into Secret Manager when it changes. Rotating one of those is a repository
change, so it waits for the freeze to lift unless it is an emergency.

## When the providers misbehave

**Read the failure codes first**: they say which provider is at fault.
`model_call_failed` is OpenAI, `editor_open_failed` is Browserbase or
Photopea, and `editor_action_failed` is the editor itself.

- **OpenAI errors or a rate limit.** A call that meets a rate limit or a
  server error is sent again, with about a minute of waiting in all, or up
  to three minutes when OpenAI asks for longer waits. A call that never
  answers gets a minute an attempt, so its seven attempts and the waits
  between them can hold a run for up to about nine minutes. Either way, a
  run whose retries run out stops as a cap does: the visitor keeps the
  partial file, and the run log still records `failed` with
  `model_call_failed`. A call OpenAI refuses outright, including one for
  an exhausted quota, fails its run at once, and the page shows its fixed
  reason. The daily ceiling is untouched by failures, because a
  reservation is released when the run ends. Rate limits that persist while
  many runs are in flight mean the cap is above what our OpenAI tier
  allows, so lower `MAX_CONCURRENT_RUNS` first, and the runs past it wait
  in line instead of failing. If errors are sustained, stop new
  runs with `RUNS_PAUSED=1`: `POST /api/runs` is refused before it
  reserves a free run, uploads stop warming an editor, and the page shows
  the refusal — unlike `RUN_MODE=fake`, which still spends a visitor's
  free run on a placeholder result. Say so on the launch post. Like any
  `--update-env-vars` command, this makes a new revision and restarts the
  container, ending the runs in flight:

  ```sh
  gcloud run services update layerhand \
    --project layerhand-astra-2026 --region us-central1 \
    --update-env-vars RUNS_PAUSED=1
  ```

  Clear it the same way, which also restarts the container:

  ```sh
  gcloud run services update layerhand \
    --project layerhand-astra-2026 --region us-central1 \
    --update-env-vars RUNS_PAUSED=0
  ```

- **Browserbase errors, or sessions that will not start.** The same lever
  applies, and it also stops uploads from warming a browser. A leaked
  session is the expensive failure, so check the Browserbase dashboard for
  sessions with no run: the service releases each one when its run ends,
  releases warm sessions after two minutes, and releases everything on
  shutdown, but a crash between those can leave one until the provider's
  own timeout.

- **Native steering misbehaving.** Set `STEERING=boundary`. Corrections then
  reach the model with its next call, which is the path the loop has always
  had. Nothing else changes, and a run already going keeps its socket.

- **Costs climbing faster than expected.** Lower `FREE_RUN_SPEND_CAP_USD`
  before `FREE_DAILY_BUDGET_USD`: the first bounds one visitor, the second
  stops every free run at once, and a stopped ceiling is a worse look on
  launch day than a smaller allowance.

Whatever is done, write it on the launch post and in the issue thread the
same hour. The numbers here are small enough that the mistake to avoid is
the silent one.

## See also

- [TRD § Cost control](/docs/TRD.md#cost-control) — where the four limits come from.
- [TRD § Observability](/docs/TRD.md#observability) — what one run records.
- [PRD § Launch acceptance](/docs/PRD.md#launch-acceptance) — what must be true to launch.
- [Git workflow](/docs/references/git-workflow.md) — how a change reaches `main`.
