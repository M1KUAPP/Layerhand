# Documentation drift implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the operator-facing documentation and the two affected issue
links agree with the current workflows and evidence.

**Architecture:** Keep the workflows and runtime unchanged. Correct each stale
statement at its source, preserve items already fixed on `main`, and update the
two GitHub issue bodies through the GitHub API.

**Tech stack:** Markdown, GitHub Actions YAML, GitHub CLI, Bun, Prettier.

**Spec:** [Issue #131](https://github.com/M1KUAPP/astra/issues/131)

## Global constraints

- Follow the repository's 80-character Markdown limit.
- Do not change runtime or workflow behaviour.
- Do not reintroduce the already-fixed PRD or `test.yml` drift.
- Preserve every issue body except the obsolete link target.

---

### Task 1: Correct the operating documentation

**Files:**

- Modify: `README.md`
- Modify: `docs/superpowers/specs/ten-image-reliability-suite-design.md`
- Modify: `docs/references/git-workflow.md`
- Modify: `docs/TRD.md`
- Modify: `docs/agents/rules.md`

**Interfaces:**

- Consumes: current workflow triggers, secret sources, deployment settings,
  and the evidence recorded on issue #22.
- Produces: documentation that describes those current facts without changing
  any executable interface.

- [x] **Step 1: Correct README navigation and browser-test switches**

  Add the reliability section to the contents and name the distinct
  `RUN_BROWSER_TESTS` and `LAYERHAND_CHROME_INTEGRATION` switches with their
  scopes.

- [x] **Step 2: Correct README spending and workflow guard language**

  State that `FREE_DAILY_BUDGET_USD` meters deployed HTTP runs only, while a
  ten-case reliability run uses the same key outside that counter and can
  spend up to $80. Distinguish the guarded schedule from an explicit manual
  `task=reliability` dispatch, and record the production approval shared by
  both paths.

- [x] **Step 3: Correct the reliability design**

  Record that scheduled runs need `RELIABILITY_ENABLED == 'true'`, manual
  reliability dispatches do not, manual dispatches may select another ref,
  `BROWSERBASE_API_KEY` is a repository secret, and `OPENAI_API_KEY` comes
  from Google Secret Manager.

- [x] **Step 4: Complete workflow and layout inventories**

  Add `deploy.yml` to the Git workflow enforcement table and add
  `docs/decisions/` plus `docs/evidence/` to the project layout table.

- [x] **Step 5: Correct the TRD evidence and status statements**

  Replace the unconfirmed live-view note with issue #22's stronger result,
  correct `kymil04` to `kymil4`, remove answered A0 from the spikes that can
  still change the plan, and say the reliability suite has not run rather
  than claiming a nightly run since day 2.

- [x] **Step 6: Verify documentation formatting and drift removal**

  Run:

  ```sh
  bun run lint
  git diff --check
  ```

  Search the changed files for the obsolete wording and inspect the diff.

- [x] **Step 7: Commit the repository changes**

  ```sh
  git add README.md docs/agents/rules.md docs/references/git-workflow.md \
    docs/superpowers/specs/ten-image-reliability-suite-design.md \
    docs/TRD.md docs/superpowers/plans/documentation-drift.md
  git commit -m "docs: correct operational documentation drift"
  ```

### Task 2: Repair the issue links

**Files:**

- Modify externally: GitHub issue #11 body
- Modify externally: GitHub issue #20 body

**Interfaces:**

- Consumes: the existing issue bodies and the current launch-artifact anchor.
- Produces: both bodies pointing to
  `docs/ideation.md#launch-artifact`, with all other text unchanged.

- [x] **Step 1: Replace only the obsolete link in each issue body**

  Use the GitHub API to replace
  `docs/producthunt-ideas.md#launch-artifact` with
  `docs/ideation.md#launch-artifact` in issues #11 and #20.

- [x] **Step 2: Read both issue bodies back**

  Confirm the old target is absent and the new target appears once in each
  body.

### Task 3: Publish the reviewed change

**Files:**

- No additional files.

**Interfaces:**

- Consumes: verified repository diff and corrected issue bodies.
- Produces: one conventional pull request that closes issue #131.

- [ ] **Step 1: Run the complete repository verification**

  ```sh
  bun test
  bun run typecheck
  bun run lint
  bun run build
  git diff --check origin/main...HEAD
  ```

- [ ] **Step 2: Push and open the pull request**

  Push `docs/issue-131-drift` and open a conventional pull request whose body
  maps the changes to the issue checklist and closes #131.

- [ ] **Step 3: Obtain an independent review**

  Review the final diff and verification evidence before requesting the
  repository's required approval.
