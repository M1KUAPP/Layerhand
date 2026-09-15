# Photopea production export evidence

This record identifies the canonical PSD exercised by the default suite. It
was created by the production Photopea editor session and export path, rather
than by a PSD-writing fixture helper.

## Retained artifact

[`photopea-production-export.psd`](../../../src/editor/fixtures/photopea-production-export.psd)
is the canonical artifact. It is 9,071,593 bytes and has this SHA-256 digest:

```text
d709de6d233520b7fae8c95a89acfb035eae0720853d92509a72e3bb3298d7a7
```

The expected recursive tree, in PSD background-first order, is:

```text
Original photograph (raster, visible)
  pixel mask (enabled)
```

The default test at
[`test/editor/photopea-production-export.test.ts`](../../../test/editor/photopea-production-export.test.ts)
parses this exact file, asserts that tree, applies `assertLayerNames()`, and
applies `assertCompleteLayerTree()`.

## Provenance and reproduction

The artifact was retained on September 15, 2026 with Google Chrome
153.0.8010.36. Its source was
[`sample-photo.png`](../../../src/web/assets/sample-photo.png), whose SHA-256
digest is:

```text
2cfbbf85eebd8b442a0481a26ccca952af0b592a29adf373d04555a5505125dd
```

The retention script opens that PNG through `PhotopeaEditorSession`, uses the
existing Photopea bridge to request a native reveal-all pixel mask, and obtains
the file using `session.exportPsd()`. It then validates the parsed tree with
the same production name and completion policies before writing the fixture.

With Bun and Google Chrome installed, regenerate and validate it from the
repository root with:

```sh
bun scripts/retain-photopea-production-export.ts
bun test test/editor/photopea-production-export.test.ts
```

The first command uses live Photopea and is deliberately not part of the
default or PR-blocking suite. A regenerated artifact must have its digest and
expected tree reviewed and updated in this record and the deterministic test.
