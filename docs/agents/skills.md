# Installed skill collections

This repository installs two skill collections from
[skills.sh](https://www.skills.sh/). Between them they cover the two things
a coding agent is worst at unaided: following a disciplined process, and
producing an interface that does not look generated. Skills install into
`.agents/skills/`, which `.claude/skills/` symlinks to; every one of them,
its source, and a content hash is recorded in `skills-lock.json`.

Contents:

1. [obra/superpowers](#obrasuperpowers)
1. [leonxlnx/taste-skill](#leonxlnxtaste-skill)
1. [Installing and updating](#installing-and-updating)

## obra/superpowers

[obra/superpowers](https://www.skills.sh/obra/superpowers) is a process
collection: how to plan work, how to verify it, and how to review it. Around
3.1M installs across 14 skills, all 14 of which are installed here.

Reach for it when the difficulty is the _method_ rather than the subject.

| Skill                            | Use when                                        |
| -------------------------------- | ----------------------------------------------- |
| `brainstorming`                  | Before any creative or feature work             |
| `writing-plans`                  | A spec exists and a multi-step plan is needed   |
| `executing-plans`                | Running a written plan with review checkpoints  |
| `test-driven-development`        | Implementing a feature or a bugfix              |
| `systematic-debugging`           | A bug, test failure, or surprise                |
| `verification-before-completion` | About to claim something works                  |
| `requesting-code-review`         | Work is finished and needs checking             |
| `receiving-code-review`          | Review feedback has arrived                     |
| `finishing-a-development-branch` | Deciding how to integrate completed work        |
| `dispatching-parallel-agents`    | Two or more independent tasks                   |
| `subagent-driven-development`    | Executing independent tasks in one session      |
| `using-git-worktrees`            | Feature work that needs an isolated workspace   |
| `writing-skills`                 | Creating or editing a skill                     |
| `using-superpowers`              | Starting a conversation; finds the other skills |

The collection's premise is that most agent failures are process failures:
work started before it was understood, claimed finished before it was
verified, or reviewed without rigour. Each skill is a checkpoint against one
of those.

## leonxlnx/taste-skill

[leonxlnx/taste-skill](https://www.skills.sh/leonxlnx/taste-skill) is a
design collection: how an interface should look, and how to describe one
precisely enough to build it. Around 4.0M installs across 14 skills, 13 of
which are installed here — `image-taste-frontend` is not.

Reach for it when the output is something a person will look at.

| Skill                        | Use when                                        |
| ---------------------------- | ----------------------------------------------- |
| `design-taste-frontend`      | Landing pages, portfolios, redesigns            |
| `design-taste-frontend-v1`   | Backward compatibility with the older behaviour |
| `high-end-visual-design`     | The work has to read as expensive               |
| `redesign-existing-projects` | Lifting an existing site to that standard       |
| `minimalist-ui`              | A clean editorial direction is wanted           |
| `industrial-brutalist-ui`    | A raw, mechanical, data-dense direction         |
| `gpt-taste`                  | Editorial layout with heavy GSAP motion         |
| `stitch-design-taste`        | Generating a `DESIGN.md` for another agent      |
| `brandkit`                   | Brand boards, logo systems, identity decks      |
| `imagegen-frontend-web`      | Reference images for a website, one per section |
| `imagegen-frontend-mobile`   | Reference images for app screens and flows      |
| `image-to-code`              | Design the image first, then build to match it  |
| `full-output-enforcement`    | Truncation and placeholders must not happen     |

The recurring theme is that "make it look good" is not a specification. Each
skill replaces it with one: named fonts, spacing scales, layout rules, and a
list of the defaults that make generated design look cheap.

## Installing and updating

```sh
npx skills add obra/superpowers
npx skills add leonxlnx/taste-skill
```

Both commands are idempotent. `skills-lock.json` records the source, path,
and content hash of every installed skill, so a re-run tells you what
actually changed upstream.

## See also

- [skills.sh](https://www.skills.sh/)
- [Project conventions](rules.md)
