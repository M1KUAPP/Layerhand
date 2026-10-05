# Git workflow

Every change to this repository travels the same path: a branch, small
commits, a pull request, a review, resolved conversations, a squash merge,
and a deleted branch. Nothing should reach `main` any other way.

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
3.  **Push the branch.** `git push -u origin HEAD`. Never push to `main`:
    no hook refuses it, so the rule is yours to keep.
4.  **Open a pull request.** `gh pr create --fill-first`, then check the
    title. Not `--fill`: on a branch with more than one commit that takes
    the title from the branch name, which is not in the commit format.
    `--fill-first` takes it from the first commit, which may not describe
    the whole branch, so pass `--title` when it does not. The title and body
    become the commit that lands, so the title fits in 50 characters.
5.  **Review.** One approval required. Review looks at the diff and at the
    pull request title and body, because they are what lands.
6.  **Resolve.** Every review conversation must be marked resolved before
    merging.
7.  **Merge and delete.** Squash merge, or queue the merge with
    `gh pr merge --auto --squash`, then the branch deletes itself.

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
The whole header, type and scope included, is at most 50 characters.

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
The pull request title becomes the commit subject: this repository
squash-merges, with the title as the commit title and the body as its
message, so a branch's commits land as one. The title follows the format
and the 50-character limit, and it is also what the pull request list, the
notification, and the reviewer see first.

## What enforces what

| Where               | What it blocks                             |
| ------------------- | ------------------------------------------ |
| `.husky/commit-msg` | A commit whose message is not conventional |

It is a local hook, so `--no-verify` skips it. It reads its rules from
`commitlint.config.mjs`: Conventional Commits, with a header of at most 50
characters. Nothing else is enforced: no workflow
runs on GitHub and no repository rule guards `main`, so the rest of
[the loop](#the-loop) is a convention, and nothing checks tests, formatting,
or pull request and issue titles before a merge.

A merge deploys nothing. Deploys are manual, as the
[launch-day runbook](/docs/references/launch-day.md#the-freeze-and-the-no-deploy-rule)
describes.

## Secrets

Never put a secret in the repository: not in a commit, a pull request, an
issue, or any file. `.env` stays untracked, and only `.env.example`, which
holds placeholders, is committed.

The deployed service reads its secrets from Google Secret Manager, their
only source: `DATABASE_URL`, `SESSION_SECRET`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY`, `BROWSERBASE_API_KEY`, and `OPENAI_API_KEY`. The
[launch-day runbook](/docs/references/launch-day.md#rotating-the-server-key)
says how to rotate one.

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
repository. They make squash the only merge method, with the pull request
title and body as the commit, turn on auto-merge and branch updates, and
delete branches after merge:

```sh
gh api -X PATCH 'repos/{owner}/{repo}' --silent \
  -F delete_branch_on_merge=true \
  -F allow_auto_merge=true \
  -F allow_update_branch=true \
  -F allow_squash_merge=true \
  -F allow_rebase_merge=false \
  -F allow_merge_commit=false \
  -f squash_merge_commit_title=PR_TITLE \
  -f squash_merge_commit_message=PR_BODY
```
