# Agent instructions

The entry point for any agent working in this repository. It is short on
purpose: the rules live in `docs/agents/`, and the long-form references they
rest on live in `docs/reference/`. This file is symlinked as `CLAUDE.md` and
`GEMINI.md`, so edit `AGENTS.md` and never the symlinks.

Read [project conventions](docs/agents/rules.md) first. Everything else is
situational.

## Non-negotiables

- **Never commit or push to `main`.** Branch, open a pull request, and let it
  be reviewed. See [git workflow](docs/reference/git-workflow.md).
- **Commit messages, issue titles, and pull request titles follow
  [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).**
- **Commits are atomic.** One reason to change per commit.
- **Prefix shell commands with `rtk`**, including inside `&&` chains.
- **Think before coding.** State assumptions, prefer the simpler approach,
  and change only what the request requires.

## Instructions

| Document                                                        | Covers                                                   |
| --------------------------------------------------------------- | -------------------------------------------------------- |
| [Project conventions](docs/agents/rules.md)                     | Git, writing, tooling, and where things live             |
| [Andrej Karpathy skills](docs/agents/andrej-karpathy-skills.md) | How to approach a task: think, simplify, stay surgical   |
| [RTK](docs/agents/rtk.md)                                       | Token-optimized shell commands                           |
| [Installed skill collections](docs/agents/skills.md)            | What `obra/superpowers` and `leonxlnx/taste-skill` offer |

## Reference

| Document                                                 | Covers                                       |
| -------------------------------------------------------- | -------------------------------------------- |
| [Git workflow](docs/reference/git-workflow.md)           | Branch to merge, and what enforces each step |
| [Markdown style guide](docs/reference/markdown-style.md) | How to write every document in `docs/`       |

## Project documents

- [Product Hunt ideas](docs/producthunt-ideas.md) — the ten-round ideation
  behind what this repository is for.
