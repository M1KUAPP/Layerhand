# Project rules

The rules that hold for every change in this repository, whoever or
whatever makes it. Anything here overrides an agent's own defaults. The
long-form reasoning lives in the documents this page links to.

Contents:

1.  [Git](#git)
1.  [Writing](#writing)
1.  [Tooling](#tooling)
1.  [Layout](#layout)
1.  [See also](#see-also)

## Git

The full workflow is in the
[Git workflow reference](/docs/references/git-workflow.md). The parts you must
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

Markdown follows the [Markdown style guide](/docs/references/markdown-style.md).
In practice that means an 80-character line limit, with links, tables,
headings, and code blocks exempt; ATX headings in sentence case; one H1 per
document, matching the filename; a short introduction under it; and link
titles that say where the link goes.

A plan or a spec is named for what it holds, in lower case with hyphens, and
carries no date: the history records when it was written, and the document
outlives the day it was drafted. This overrides the superpowers skills, which
name them `YYYY-MM-DD-<topic>`. The project briefs keep their capitals and the
decision records their numbers.

## Tooling

- **Bun**, not npm or Yarn. `bun install`, `bun run lint`.
- **Prettier** owns syntax, not prose. `bun run lint` checks the whole
  tree and `lint-staged` fixes staged files on commit, so do not
  hand-format around it. But `printWidth` applies to code, and `proseWrap`
  is left at `preserve`, so Prettier never rewraps a Markdown paragraph:
  the 80-character limit is yours to keep and nothing checks it.
- **Shell commands run as normal**, and their output comes back condensed.
  Re-run one as `rtk proxy <cmd>` only when its result is unusable. See
  [RTK](rtk.md).

## Layout

| Path                | Holds                                                         |
| ------------------- | ------------------------------------------------------------- |
| `AGENTS.md`         | The entry point, symlinked as `CLAUDE.md` and `GEMINI.md`     |
| `docs/agents/`      | Instructions addressed to agents                              |
| `docs/decisions/`   | Architecture decision records                                 |
| `docs/evidence/`    | Retained measurements, probes, and acceptance evidence        |
| `docs/references/`  | Style guides and workflows, for humans and agents             |
| `docs/superpowers/` | Plans and specs, in `plans/` and `specs/`                     |
| `.agents/skills/`   | Skills, installed and local; `.claude/skills/` symlinks to it |
| `.github/`          | Workflows and templates                                       |

Edit `AGENTS.md` itself, never `CLAUDE.md` or `GEMINI.md` — both are
symlinks to it.

## See also

- [Git workflow](/docs/references/git-workflow.md)
- [Markdown style guide](/docs/references/markdown-style.md)
- [Skills](skills.md)
