# ADR-0001: Define a provider-neutral editor session

This record explains why the agent loop reaches the editor only through
`EditorSession`, an interface that names no editor or browser provider, and
why a fixture-backed fake implements it too.

## Status

Accepted on September 14, 2026.

## Context

The agent loop, browser integration, and editor work needed to progress in
parallel. Photopea is the current editor and Browserbase is the intended browser
provider, but neither implementation detail belongs in the agent loop. The
boundary must support screenshots, ordered computer actions, layer inspection,
layered PSD export, preview export, and reliable teardown.

A real hosted session was not available when the boundary was introduced. The
team still needed executable tests and realistic editor artifacts rather than a
mock that returned arbitrary bytes.

## Decision

Define `EditorSession` as a provider-neutral asynchronous interface. It accepts
image and filename inputs, exposes a fixed viewport, batches ordered
`ComputerAction` values, and returns screenshots, layer metadata, PSD bytes, and
preview bytes as `Uint8Array` values. The action union mirrors the computer-tool
schema so the agent loop does not translate individual actions.

Keep Photopea, Playwright, and hosted-browser types outside the contract. The
adapter owns those details and maps them to the session interface.

Provide a deterministic, fixture-backed `FakeEditorSession`. It replays recorded
frames, records action batches, returns defensive copies, enforces an explicit
open and closed lifecycle, and uses real PNG and layered PSD fixtures. Run the
same observable contract suite against this fake and future real sessions.

## Alternatives considered

### Expose Photopea or Playwright directly

This would remove one adapter layer, but it would couple the agent loop to the
current editor and browser provider. A provider change would then cross every
consumer instead of one boundary.

### Let the agent loop own browser interaction

This would combine orchestration, editor protocol, and browser lifecycle in one
component. It would prevent the three workstreams from progressing independently
and make deterministic testing harder.

### Use a call-count mock with synthetic bytes

This would be smaller, but it would not prove screenshot, PNG, or layered PSD
contracts. Recorded artifacts catch integration assumptions that arbitrary byte
arrays cannot.

## Consequences

- Editor and browser implementations can change without changing the agent
  loop.
- The fake enables deterministic development before hosted-browser work exists.
- Contract tests become reusable evidence for every session implementation.
- The adapter must translate provider behavior into the smaller contract.
- Fixture metadata duplicates some PSD facts until structural validation becomes
  the source of truth.

Revisit this decision if the computer-tool action schema changes materially or
if a required editor capability cannot be represented without leaking a
provider-specific concept.

## Verification

- [`src/editor/session.ts`](/src/editor/session.ts) defines the public
  interface and action types.
- [`src/editor/fake-editor-session.ts`](/src/editor/fake-editor-session.ts)
  implements the deterministic fake.
- [`test/editor/editor-session.contract.ts`](/test/editor/editor-session.contract.ts)
  contains the reusable contract suite.
- [`test/editor/fake-editor-session.test.ts`](/test/editor/fake-editor-session.test.ts)
  verifies fake-specific lifecycle and defensive-copy behavior.

## References

- [TRD: Contract 1](/docs/TRD.md#contract-1-editor-session)
- [GitHub issue #14](https://github.com/M1KUAPP/astra/issues/14)
- [Photopea round-trip evidence](/docs/evidence/photopea-round-trip/README.md)
