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
   refused locally and server-side.
4. **Open a pull request.** `gh pr create --fill`. The title follows
   Conventional Commits; the template asks for what changed and how you
   verified it.
5. **Review.** One approval required. Review looks at the diff and at the
   commit history, because the history is what lands.
6. **Resolve.** Every review conversation must be marked resolved before the
   merge button unlocks.
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
A pull request title becomes the merge subject, so write it as the commit it
will become.

## What enforces what

| Where                                     | What it blocks                             |
| ----------------------------------------- | ------------------------------------------ |
| `.husky/commit-msg`                       | A commit whose message is not conventional |
| `.husky/pre-push`                         | A push straight to `main`                  |
| `.github/workflows/conventional-lint.yml` | A bad pull request title, or a bad commit  |
| `.github/workflows/issue-title-lint.yml`  | A bad issue title — labels and explains it |
| `.github/rulesets/main.json`              | Merging without review, resolution, or CI  |
| `.github/pull_request_template.md`        | Nothing; it reminds you                    |
| `.github/ISSUE_TEMPLATE/`                 | Blank issues, and titles with no type      |

The local hooks and the workflows share one rule set, `commitlint.config.mjs`,
so they cannot drift apart. The hooks are the fast feedback; the workflows are
the part that cannot be skipped with `--no-verify`.

## Setting it up

Local hooks install themselves:

```sh
bun install
```

The server-side rules are applied once, by someone with admin on the
repository:

```sh
scripts/setup-repo-rules.sh
```

That script turns on branch deletion after merge, makes rebase the only merge
method, and uploads `.github/rulesets/main.json`. It prints the two cases it
cannot handle: private repositories below GitHub Team, and solo maintainers,
who cannot approve their own pull requests and should set
`required_approving_review_count` to `0`.

## Why rebase and not squash

Squash merging takes the atomic commits step 2 asks for and throws them away
at the last moment. If the history is worth writing, it is worth keeping, so
`main` takes the commits as written. Rebase merging also keeps history linear,
which is what makes `git bisect` and `git log --oneline` worth running.

The cost is real: every commit on the branch has to build, not just the tip.
That is the discipline the workflow is buying.

## Escape hatches

`git commit --no-verify` and `git push --no-verify` skip the local hooks. They
exist for emergencies and for fixing the hooks themselves. They do not skip
the workflows or the ruleset, which is the point — the local hooks save you a
round trip, and the server-side rules are what actually hold the line.

## See also

- [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [Markdown style guide](markdown-style.md)
