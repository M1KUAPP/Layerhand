# Git workflow

Every change to this repository travels the same path: a branch, small
commits, a pull request, a review, resolved conversations, a rebase merge,
and a deleted branch. Nothing reaches `main` any other way.

Names follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
everywhere they appear — commit subjects, issue titles, and pull request
titles — so that one glance at any of the three tells you what kind of change
it is.

## The loop

1. **Branch.** `git switch -c <type>/<short-description>` off an up-to-date
   `main`.
2. **Commit small.** One reason to change per commit, and every commit builds
   on its own. A commit that needs the word "and" in its subject is two
   commits.
3. **Push the branch.** `git push -u origin HEAD`. Pushing to `main` is
   refused by the pre-push hook.
4. **Open a pull request.** `gh pr create --fill-first`, then check the
   title. Not `--fill`: on a branch with more than one commit that takes
   the title from the branch name, which the title check rejects.
   `--fill-first` takes it from the first commit, which may not describe
   the whole branch, so pass `--title` when it does not.
5. **Review.** One approval required. Review looks at the diff and at the
   commit history, because the history is what lands.
6. **Resolve.** Every review conversation must be marked resolved before
   merging.
7. **Merge and delete.** Rebase merge, then the branch deletes itself.

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

| Where                                     | What it blocks                             |
| ----------------------------------------- | ------------------------------------------ |
| `.husky/commit-msg`                       | A commit whose message is not conventional |
| `.husky/pre-push`                         | A push straight to the default branch      |
| `.github/workflows/conventional-lint.yml` | A bad pull request title, or a bad commit  |
| `.github/workflows/lint.yml`              | An unformatted tree                        |
| `.github/workflows/issue-title-lint.yml`  | A bad issue title — labels and explains it |
| `.github/pull_request_template.md`        | Nothing; it reminds you                    |
| `.github/ISSUE_TEMPLATE/`                 | Blank issues, and titles with no type      |

Nothing in that table can stop a merge. On a private repository, branch
rulesets and branch protection need GitHub Pro, Team, or Enterprise, and
the API returns 403 for this one, so review, resolved conversations, and
green checks before merging are kept by convention rather than enforced.

The local hooks and the workflows share one rule set, `commitlint.config.mjs`,
so they cannot drift apart. The hooks are the fast feedback; the workflows are
the part that cannot be skipped with `--no-verify`.

## Setting it up

Local hooks install themselves:

```sh
bun install
```

The pre-commit hook also runs
[graphify](https://github.com/graphify-labs/graphify) to update the
knowledge graph, and `bun install` does not provide it. Install it first,
or every commit fails:

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
