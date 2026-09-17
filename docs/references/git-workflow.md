# Git workflow

Every change to this repository travels the same path: a branch, small
commits, a pull request, a review, resolved conversations, a rebase merge,
and a deleted branch. Nothing reaches `main` any other way.

Names follow
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
everywhere they appear — commit subjects, issue titles, and pull request
titles — so that one glance at any of the three tells you what kind of change it
is.

Contents:

1.  [The loop](#the-loop)
1.  [Naming](#naming)
1.  [What enforces what](#what-enforces-what)
1.  [Secrets](#secrets)
1.  [Setting it up](#setting-it-up)

## The loop

1.  **Branch.** `git switch -c <type>/<short-description>` off an up-to-date
    `main`.
2.  **Commit small.** One reason to change per commit, and every commit builds
    on its own. A commit that needs the word "and" in its subject is two
    commits.
3.  **Push the branch.** `git push -u origin HEAD`. Pushing to `main` is
    refused by the pre-push hook.
4.  **Open a pull request.** `gh pr create --fill-first`, then check the
    title. Not `--fill`: on a branch with more than one commit that takes
    the title from the branch name, which the title check rejects.
    `--fill-first` takes it from the first commit, which may not describe
    the whole branch, so pass `--title` when it does not.
5.  **Review.** One approval required. Review looks at the diff and at the
    commit history, because the history is what lands.
6.  **Resolve.** Every review conversation must be marked resolved before
    merging.
7.  **Merge and delete.** Rebase merge, then the branch deletes itself.

## Naming

### Commits

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

The type is one of `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`,
`refactor`, `revert`, `style`, or `test`. The scope is an optional noun
naming the part of the codebase you touched, in parentheses. The description
is a short summary in the imperative, lower case, with no trailing period.

A breaking change takes a `!` before the colon, and explains itself in the
body or in a `BREAKING CHANGE:` footer:

```text
feat(api)!: drop the v1 response envelope

BREAKING CHANGE: responses are now the bare object. Callers reading
`body.data` should read `body` instead.
```

### Branches

`<type>/<short-description>`, using the same types as commits — for example
`fix/expired-refresh-tokens` or `docs/git-workflow`. The branch name is not
machine-checked; it is a courtesy to whoever reads the branch list.

### Issues and pull requests

Both use the commit format. An issue describes the change you want as though
you were committing it: `fix(auth): expired refresh tokens are accepted`.
Neither becomes a commit subject: this repository rebase-merges, so the
commits land exactly as written and the pull request title is discarded.
The title is linted anyway, because it is what the pull request list, the
notification, and the reviewer see first.

## What enforces what

| Where                                       | What it blocks                                                    |
| ------------------------------------------- | ----------------------------------------------------------------- |
| The `main` ruleset                          | A merge that skips a step of [the loop](#the-loop)                |
| `.husky/commit-msg`                         | A commit whose message is not conventional                        |
| `.husky/pre-push`                           | A push straight to the default branch                             |
| `.github/workflows/test.yml`                | A failing test, or a type error                                   |
| `.github/workflows/conventional-lint.yml`   | A bad pull request title, or a bad commit                         |
| `.github/workflows/lint.yml`                | An unformatted tree                                               |
| `.github/workflows/container.yml`           | An image that does not build or start                             |
| `.github/workflows/deploy.yml`              | Nothing before merge; deploys `main` after environment approval   |
| `.github/workflows/issue-title-lint.yml`    | A bad issue title — labels and explains it                        |
| `.github/workflows/reliability.yml`         | Nothing; scheduled evidence rather than a pull-request merge gate |
| `.github/workflows/browser-integration.yml` | Nothing; scheduled evidence rather than a pull-request merge gate |
| `.github/pull_request_template.md`          | Nothing; it reminds you                                           |
| `.github/ISSUE_TEMPLATE/`                   | Blank issues, and titles with no type                             |

The ruleset is what turns the workflows into merge gates. It is a
repository setting rather than a file, it covers `main`, and nobody is on
its bypass list, admins included. A pull request merges only with:

- one approval, which cannot come from its author;
- every review conversation resolved;
- a rebase merge, the only method it allows, onto a linear history;
- passing **Test and typecheck**, **Formatting**, **Container smoke
  test**, **Pull request title**, and **Commit messages** checks.

It also refuses a push straight to `main`, a force push, and deleting the
branch. A scheduled workflow has no merge to block in the first place: a
failing run shows in the Actions tab, and GitHub emails whoever last
edited its `schedule` trigger.

The local hooks and the workflows share one rule set, `commitlint.config.mjs`,
so they cannot drift apart. The hooks are the fast feedback; the workflows are
the part that cannot be skipped with `--no-verify`.

## Secrets

Always store secrets as
[GitHub secrets](https://docs.github.com/en/actions/concepts/security/secrets),
never in the repository: not in a commit, a pull request, an issue, or a
workflow file. `.env` stays untracked, and only `.env.example`, which holds
placeholders, is committed. A workflow reads a secret as
`${{ secrets.NAME }}`.

Team secrets live in this repository's GitHub secrets, and nowhere else is
their source: `DATABASE_URL`, `SESSION_SECRET`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY`, and `BROWSERBASE_API_KEY`. The deploy workflow
copies each one into Google Secret Manager before it deploys, adding a
version only when the value changed, so a secret is rotated by changing it
in GitHub and deploying. `OPENAI_API_KEY` is the one exception to storing
secrets in GitHub: it is a personal key, and it lives only in Secret Manager.

## Setting it up

Local hooks install themselves:

```sh
bun install
```

The knowledge graph in `graphify-out/` is refreshed deliberately rather
than on every commit:

```sh
bun run graph
```

Committing no longer needs
[graphify](https://github.com/graphify-labs/graphify), but querying the
graph does, and `bun install` does not provide it. Install it once:

```sh
uv tool install graphifyy
```

The merge settings are applied once, by someone with admin on the
repository. They make rebase the only merge method and delete branches
after merge:

```sh
gh api -X PATCH 'repos/{owner}/{repo}' --silent \
  -F delete_branch_on_merge=true \
  -F allow_auto_merge=true \
  -F allow_rebase_merge=true \
  -F allow_squash_merge=false \
  -F allow_merge_commit=false
```

The ruleset on `main` is created the same way, once. The integration id
`15368` is GitHub Actions, the app that reports every required check:

```sh
gh api -X POST 'repos/{owner}/{repo}/rulesets' --silent --input - <<'EOF'
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] }
  },
  "bypass_actors": [],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_linear_history" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["rebase"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [
          { "context": "Test and typecheck", "integration_id": 15368 },
          { "context": "Formatting", "integration_id": 15368 },
          { "context": "Container smoke test", "integration_id": 15368 },
          { "context": "Pull request title", "integration_id": 15368 },
          { "context": "Commit messages", "integration_id": 15368 }
        ]
      }
    }
  ]
}
EOF
```

To change it later, send the same body with `PUT` to
`repos/{owner}/{repo}/rulesets/<id>`, taking the id from
`gh api 'repos/{owner}/{repo}/rulesets'`, rather than creating a second
one.
