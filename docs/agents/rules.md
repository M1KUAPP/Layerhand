# Project conventions

The rules that hold for every change in this repository, whoever or
whatever makes it. Anything here overrides an agent's own defaults. The
long-form reasoning lives in the documents this page links to.

Contents:

1. [Git](#git)
1. [Writing](#writing)
1. [Tooling](#tooling)
1. [Layout](#layout)

## Git

The full workflow is in the
[git workflow reference](../reference/git-workflow.md). The parts you must
not get wrong:

- **Never commit or push to `main`.** Branch first:
  `git switch -c <type>/<short-description>`.
- **Every commit message, issue title, and pull request title follows
  [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):**
  `<type>[optional scope]: <description>`. The type is one of `build`,
  `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`,
  `style`, or `test`.
- **Commits are atomic.** One reason to change per commit, and each one
  builds on its own. If the subject needs the word "and", it is two
  commits.
- **The only route into `main`** is push branch → pull request → review →
  resolve conversations → rebase merge → delete branch.
- **Rebase, never squash.** Squashing would discard the atomic commits the
  workflow asks for.

## Writing

Markdown follows the [Markdown style guide](../reference/markdown-style.md).
In practice that means an 80-character line limit, with links, tables,
headings, and code blocks exempt; ATX headings in sentence case; one H1 per
document, matching the filename; a short introduction under it; and link
titles that say where the link goes.

## Tooling

- **bun**, not npm or yarn. `bun install`, `bun run lint`.
- **Prettier** formats everything it understands. `bun run lint` checks the
  whole tree; `lint-staged` fixes staged files on commit. Do not hand-format
  around it — if Prettier disagrees with you, Prettier wins.
- **Shell commands are prefixed with `rtk`**, including inside `&&` chains.
  See [RTK](rtk.md).

## Layout

| Path              | Holds                                                     |
| ----------------- | --------------------------------------------------------- |
| `AGENTS.md`       | The entry point, symlinked as `CLAUDE.md` and `GEMINI.md` |
| `docs/agents/`    | Instructions addressed to agents                          |
| `docs/reference/` | Style guides and workflows, for humans and agents         |
| `.claude/skills/` | Skills written for this repository                        |
| `.github/`        | Workflows, templates, and the branch ruleset              |
| `scripts/`        | One-off administrative scripts                            |

Edit `AGENTS.md` itself, never `CLAUDE.md` or `GEMINI.md` — both are
symlinks to it.

## See also

- [Git workflow](../reference/git-workflow.md)
- [Markdown style guide](../reference/markdown-style.md)
- [Installed skill collections](skills.md)
