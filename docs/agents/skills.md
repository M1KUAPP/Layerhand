# Skills

Skills are packaged instructions an agent loads when a task calls for them.
They are installed in `.agents/skills/`, which `.claude/skills/` symlinks
to. All but one come from the collections below; `astra-challenge`, which
ran the [ideation](/docs/ideation.md), was written here.

graphify-labs/graphify — builds a knowledge graph of the repository in
`graphify-out/` and answers questions from it, so agents read a scoped
subgraph instead of raw files.

- https://github.com/graphify-labs/graphify

leonxlnx/taste-skill — design skills, 13 of the collection's 14, for
anything a person will look at: landing pages, brand kits, reference
images, and design specs precise enough to build from.

- https://www.skills.sh/leonxlnx/taste-skill
- https://github.com/leonxlnx/taste-skill

obra/superpowers — process skills, all 14: brainstorming, planning,
test-driven development, debugging, verification, code review, and
parallel agents.

- https://www.skills.sh/obra/superpowers
- https://github.com/obra/superpowers
