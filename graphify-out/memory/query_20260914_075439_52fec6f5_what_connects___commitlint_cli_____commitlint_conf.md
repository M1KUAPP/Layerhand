---
type: "query"
date: "2026-09-14T07:54:39.520131+00:00"
question: "What connects `@commitlint/cli`, `@commitlint/config-conventional`, `husky` to the rest of the system?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["@commitlint/cli", "husky"]
---

# Q: What connects `@commitlint/cli`, `@commitlint/config-conventional`, `husky` to the rest of the system?

## Answer

Not a documentation gap. graphify's AST pass emits two nodes for each devDependency in package.json (the dependency key and an import reference), and usually only one of each pair carries edges: @commitlint/cli, for example, links to the three workflow jobs that run commitlint. The files that actually use husky, commitlint and lint-staged are the hook scripts in .husky/ (commit-msg, pre-commit, pre-push), which have no file extension, so graphify never scanned them and those edges are missing.

## Outcome

- Signal: useful

## Source Nodes

- @commitlint/cli
- husky