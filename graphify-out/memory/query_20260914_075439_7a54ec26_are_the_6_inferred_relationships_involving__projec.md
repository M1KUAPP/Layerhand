---
type: "query"
date: "2026-09-14T07:54:39.372148+00:00"
question: "Are the 6 inferred relationships involving `Project conventions (rules.md)` (e.g. with `RTK condensed command output` and `rtk proxy fallback`) actually correct?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Project conventions (rules.md)", "RTK condensed command output", "rtk proxy fallback"]
---

# Q: Are the 6 inferred relationships involving `Project conventions (rules.md)` (e.g. with `RTK condensed command output` and `rtk proxy fallback`) actually correct?

## Answer

Yes, all 6 check out against docs/agents/rules.md. Its root-relative link to the git workflow implements the style guide's explicit-path rule; 'never commit or push to main' is the rule whose push half .husky/pre-push enforces; 'ATX headings in sentence case' is the style guide's capitalization rule; the Layout table's .github/ row names the branch ruleset; and the Tooling section now says shell output comes back condensed and to re-run with rtk proxy only when the result is unusable, matching rtk.md. The last three are stated outright, so INFERRED undersells them.

## Outcome

- Signal: useful

## Source Nodes

- Project conventions (rules.md)
- RTK condensed command output
- rtk proxy fallback