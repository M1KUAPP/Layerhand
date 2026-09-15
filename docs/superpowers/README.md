# Superpowers

The plans and specs written while planning a change, by the
[superpowers skills](/docs/agents/skills.md) or by hand. A spec settles what a
change should do and why; a plan cuts it into tasks, each with its test, that
one engineer or one agent can work through in order.

## Plans

- [Layered PSD export](/docs/superpowers/plans/layered-psd-export.md) — issue
  #16: a Photopea session that exports a layered PSD, a PNG preview, and the
  file's own layer tree. Its spec is
  [ADR-0003](/docs/decisions/0003-parser-backed-photopea-export.md).
- [Ten-image reliability suite](/docs/superpowers/plans/ten-image-reliability-suite.md)
  — issue #10 and NFR-1: ten photographs through the production agent, and one
  command reporting how many produced a valid layered PSD.

## Specs

- [Ten-image reliability suite design](/docs/superpowers/specs/ten-image-reliability-suite-design.md)
  — what the suite measures, when a case passes, and what the guarded nightly
  workflow publishes.

A plan states the spec it implements at the top. Where a decision outlived the
change that prompted it, the spec is an
[architecture decision record](/docs/decisions/README.md) instead.
