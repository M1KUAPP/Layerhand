<!--
The title of this pull request must follow Conventional Commits:
    <type>[optional scope]: <description>
for example: fix(auth): reject expired refresh tokens

Types: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test
A breaking change adds `!` before the colon, as in `feat(api)!: drop v1`.
-->

## What changed

<!-- One paragraph. What does this do, and why now? -->

## How it was verified

<!-- The commands you ran and what they printed. Not "should work". -->

## Checklist

- [ ] The title follows Conventional Commits.
- [ ] Every commit follows Conventional Commits.
- [ ] Commits are atomic: one reason to change each, and each one builds.
- [ ] Breaking changes are marked with `!` and explained in the body.
- [ ] `bun run lint` passes.

<!-- Closes #123 -->
