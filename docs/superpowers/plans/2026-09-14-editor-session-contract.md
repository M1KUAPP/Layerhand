# Editor session contract implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the exact Contract 1 editor types and a deterministic,
fixture-backed `FakeEditorSession` for agent-stream development.

**Architecture:** Keep the editor boundary in a dependency-free type module.
The fake owns an injected recording, enforces a small open/closed lifecycle,
and returns defensive copies. A reusable contract-test registration function
runs against the recorded fake now and the hosted implementation later.

**Tech Stack:** TypeScript, Bun, `bun:test`, Node file URLs.

**Spec:**
`docs/superpowers/specs/2026-09-14-editor-session-contract-design.md`

## Global constraints

- Match Contract 1 in `docs/TRD.md` exactly, including batched
  `act(actions[])`.
- Keep the fake deterministic and free of network or browser dependencies.
- Use the verified issue #13 PNG and PSD bytes without regenerating them.
- Add no PSD parser or generator; structural validation belongs to issue #17.
- Write each behavior test first and observe the expected failure.
- Use Bun for dependency management and test execution.

---

### Task 1: Add strict TypeScript and Bun test tooling

**Files:**

- Modify: `package.json`
- Modify: `bun.lock`
- Create: `tsconfig.json`

**Interfaces:**

- Consumes: the existing Bun project and Prettier configuration.
- Produces: `bun test` and `bun run typecheck` verification commands for all
  later tasks.

- [ ] **Step 1: Add the test and type-check scripts**

Update the scripts in `package.json` to:

```json
{
  "scripts": {
    "lint": "prettier --check .",
    "lint:fix": "prettier --write .",
    "prepare": "husky",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Install the type-checking dependencies**

Run:

```bash
bun add --dev typescript @types/bun @types/node@latest
```

Expected: `package.json` and `bun.lock` include `typescript`, `@types/bun`,
and an explicit `@types/node` compatibility pin.

- [ ] **Step 3: Create the strict TypeScript configuration**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "types": ["bun"]
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

- [ ] **Step 4: Verify the tooling change**

Run:

```bash
bunx tsc --version
bun run lint
```

Expected: TypeScript prints its installed version and Prettier reports that
all files match its style.

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock tsconfig.json
git commit -m "build(editor): add TypeScript test tooling"
```

---

### Task 2: Define the editor session contract

**Files:**

- Create: `src/editor/session.ts`
- Create: `test/editor/session.types.test.ts`

**Interfaces:**

- Consumes: the exact Contract 1 declarations from `docs/TRD.md`.
- Produces: `EditorSession`, `ComputerAction`, `Button`, `Pt`, `Viewport`, and
  `LayerInfo` for the fake and future real adapter.

- [ ] **Step 1: Write the compile-time contract test**

Create `test/editor/session.types.test.ts`:

```ts
import { expect, test } from 'bun:test'
import type { Button, ComputerAction, EditorSession, LayerInfo, Pt, Viewport } from '../../src/editor/session'

type IsExact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

type Assert<T extends true> = T

type ExpectedAction =
  | ({ type: 'click'; button: Button; keys?: string[] } & Pt)
  | ({ type: 'double_click'; keys?: string[] } & Pt)
  | ({ type: 'move'; keys?: string[] } & Pt)
  | { type: 'drag'; path: Pt[]; keys?: string[] }
  | ({
      type: 'scroll'
      scroll_x: number
      scroll_y: number
      keys?: string[]
    } & Pt)
  | { type: 'keypress'; keys: string[] }
  | { type: 'type'; text: string }
  | { type: 'wait' }
  | { type: 'screenshot' }

interface ExpectedSession {
  readonly id: string
  readonly viewport: Viewport
  open(image: Uint8Array, filename: string): Promise<void>
  screenshot(): Promise<Uint8Array>
  act(actions: ComputerAction[]): Promise<void>
  layers(): Promise<LayerInfo[]>
  exportPsd(): Promise<Uint8Array>
  exportPreview(): Promise<Uint8Array>
  close(): Promise<void>
}

type Assertions = [
  Assert<IsExact<Button, 'left' | 'right' | 'wheel' | 'back' | 'forward'>>,
  Assert<IsExact<Pt, { x: number; y: number }>>,
  Assert<IsExact<Viewport, { width: number; height: number }>>,
  Assert<
    IsExact<
      LayerInfo,
      {
        name: string
        kind: 'raster' | 'mask' | 'adjustment' | 'group'
        visible: boolean
      }
    >
  >,
  Assert<IsExact<ComputerAction, ExpectedAction>>,
  Assert<IsExact<EditorSession, ExpectedSession>>
]

test('exports the exact editor session contract', () => {
  const assertions: Assertions = [true, true, true, true, true, true]
  expect(assertions.every(Boolean)).toBe(true)
})
```

- [ ] **Step 2: Run the type check to verify it fails**

Run:

```bash
bun run typecheck
```

Expected: FAIL with `TS2307` because `src/editor/session.ts` does not exist.

- [ ] **Step 3: Implement the exact contract**

Create `src/editor/session.ts`:

```ts
export interface EditorSession {
  readonly id: string
  readonly viewport: Viewport

  open(image: Uint8Array, filename: string): Promise<void>
  screenshot(): Promise<Uint8Array>
  act(actions: ComputerAction[]): Promise<void>
  layers(): Promise<LayerInfo[]>
  exportPsd(): Promise<Uint8Array>
  exportPreview(): Promise<Uint8Array>
  close(): Promise<void>
}

export type Pt = { x: number; y: number }

export type ComputerAction =
  | ({ type: 'click'; button: Button; keys?: string[] } & Pt)
  | ({ type: 'double_click'; keys?: string[] } & Pt)
  | ({ type: 'move'; keys?: string[] } & Pt)
  | { type: 'drag'; path: Pt[]; keys?: string[] }
  | ({
      type: 'scroll'
      scroll_x: number
      scroll_y: number
      keys?: string[]
    } & Pt)
  | { type: 'keypress'; keys: string[] }
  | { type: 'type'; text: string }
  | { type: 'wait' }
  | { type: 'screenshot' }

export type Button = 'left' | 'right' | 'wheel' | 'back' | 'forward'

export interface Viewport {
  width: number
  height: number
}

export interface LayerInfo {
  name: string
  kind: 'raster' | 'mask' | 'adjustment' | 'group'
  visible: boolean
}
```

- [ ] **Step 4: Verify the contract is green**

Run:

```bash
bun run typecheck
bun test test/editor/session.types.test.ts
```

Expected: both commands pass with one runtime test and all compile-time
assertions satisfied.

- [ ] **Step 5: Commit**

```bash
git add src/editor/session.ts test/editor/session.types.test.ts
git commit -m "feat(editor): add the editor session contract"
```

---

### Task 3: Implement the deterministic fake

**Files:**

- Create: `src/editor/fake-editor-session.ts`
- Create: `test/editor/fake-editor-session.test.ts`

**Interfaces:**

- Consumes: `EditorSession`, `ComputerAction`, `LayerInfo`, and `Viewport`.
- Produces: `EditorRecording`, `FakeEditorSession`, and its fake-only
  `openedImage`, `openedFilename`, and `actionBatches` inspection getters.

- [ ] **Step 1: Write the failing fake behavior tests**

Create `test/editor/fake-editor-session.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { FakeEditorSession, type EditorRecording } from '../../src/editor/fake-editor-session'
import type { ComputerAction } from '../../src/editor/session'

const frameA = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 1)
const frameB = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 2)
const psd = Uint8Array.of(0x38, 0x42, 0x50, 0x53, 1)

function recording(overrides: Partial<EditorRecording> = {}): EditorRecording {
  return {
    frames: [frameA, frameB],
    psd,
    preview: frameB,
    layers: [
      { name: 'Original photograph', kind: 'raster', visible: true },
      { name: 'Retouched copy', kind: 'raster', visible: true }
    ],
    ...overrides
  }
}

function createSession(source = recording()) {
  return new FakeEditorSession({
    id: 'fake-1',
    viewport: { width: 1440, height: 900 },
    recording: source
  })
}

describe('FakeEditorSession', () => {
  test('rejects a recording with no frames', () => {
    expect(() => createSession(recording({ frames: [] }))).toThrow('Editor recording requires at least one frame')
  })

  test('enforces its lifecycle and records the opened image', async () => {
    const session = createSession()
    const image = Uint8Array.of(1, 2, 3)

    await expect(session.screenshot()).rejects.toThrow('Editor session is not open')
    await session.open(image, 'portrait.jpg')
    image[0] = 9

    expect(session.openedImage).toEqual(Uint8Array.of(1, 2, 3))
    expect(session.openedFilename).toBe('portrait.jpg')

    const observed = session.openedImage
    observed![0] = 8
    expect(session.openedImage).toEqual(Uint8Array.of(1, 2, 3))

    await session.close()
    await session.close()
    await expect(session.open(Uint8Array.of(4), 'again.jpg')).rejects.toThrow('Editor session is closed')
    await expect(session.exportPsd()).rejects.toThrow('Editor session is closed')
  })

  test('advances through frames and holds on the final frame', async () => {
    const session = createSession()
    await session.open(Uint8Array.of(1), 'portrait.jpg')

    expect(await session.screenshot()).toEqual(frameA)
    expect(await session.screenshot()).toEqual(frameB)
    expect(await session.screenshot()).toEqual(frameB)
  })

  test('preserves action batches and action order', async () => {
    const session = createSession()
    await session.open(Uint8Array.of(1), 'portrait.jpg')

    const drag: Extract<ComputerAction, { type: 'drag' }> = {
      type: 'drag',
      path: [
        { x: 10, y: 20 },
        { x: 30, y: 40 }
      ],
      keys: ['SHIFT']
    }
    const click: ComputerAction = {
      type: 'click',
      button: 'left',
      x: 50,
      y: 60
    }

    await session.act([drag, click])
    drag.path[0]!.x = 999
    drag.keys!.push('ALT')

    expect(session.actionBatches).toEqual([
      [
        {
          type: 'drag',
          path: [
            { x: 10, y: 20 },
            { x: 30, y: 40 }
          ],
          keys: ['SHIFT']
        },
        click
      ]
    ])

    const observed = session.actionBatches
    const observedDrag = observed[0]![0] as Extract<ComputerAction, { type: 'drag' }>
    observedDrag.path[0]!.x = 777
    expect(session.actionBatches[0]![0]).toMatchObject({
      path: [
        { x: 10, y: 20 },
        { x: 30, y: 40 }
      ]
    })
  })

  test('returns defensive export and layer copies', async () => {
    const session = createSession(recording({ frames: [frameA] }))
    await session.open(Uint8Array.of(1), 'portrait.jpg')

    const screenshot = await session.screenshot()
    const exportedPsd = await session.exportPsd()
    const preview = await session.exportPreview()
    const layers = await session.layers()
    screenshot[0] = 0
    exportedPsd[0] = 0
    preview[0] = 0
    layers[0]!.name = 'Changed'

    expect(await session.screenshot()).toEqual(frameA)
    expect(await session.exportPsd()).toEqual(psd)
    expect(await session.exportPreview()).toEqual(frameB)
    expect((await session.layers())[0]!.name).toBe('Original photograph')
  })
})
```

- [ ] **Step 2: Run the fake test to verify it fails**

Run:

```bash
bun test test/editor/fake-editor-session.test.ts
```

Expected: FAIL because `src/editor/fake-editor-session.ts` does not exist.

- [ ] **Step 3: Implement the minimal fake**

Create `src/editor/fake-editor-session.ts`:

```ts
import type { ComputerAction, EditorSession, LayerInfo, Viewport } from './session'

export interface EditorRecording {
  readonly frames: readonly Uint8Array[]
  readonly psd: Uint8Array
  readonly preview: Uint8Array
  readonly layers: readonly LayerInfo[]
}

type SessionState = 'idle' | 'open' | 'closed'

function cloneAction(action: ComputerAction): ComputerAction {
  switch (action.type) {
    case 'drag':
      return {
        ...action,
        path: action.path.map((point) => ({ ...point })),
        keys: action.keys?.slice()
      }
    case 'keypress':
      return { ...action, keys: action.keys.slice() }
    case 'click':
    case 'double_click':
    case 'move':
    case 'scroll':
      return { ...action, keys: action.keys?.slice() }
    case 'type':
    case 'wait':
    case 'screenshot':
      return { ...action }
  }
}

export class FakeEditorSession implements EditorSession {
  readonly id: string
  readonly viewport: Viewport

  readonly #recording: EditorRecording
  readonly #actionBatches: ComputerAction[][] = []
  #state: SessionState = 'idle'
  #frameIndex = 0
  #openedImage?: Uint8Array
  #openedFilename?: string

  constructor(options: { id: string; viewport: Viewport; recording: EditorRecording }) {
    if (options.recording.frames.length === 0) {
      throw new Error('Editor recording requires at least one frame')
    }

    this.id = options.id
    this.viewport = { ...options.viewport }
    this.#recording = {
      frames: options.recording.frames.map((frame) => frame.slice()),
      psd: options.recording.psd.slice(),
      preview: options.recording.preview.slice(),
      layers: options.recording.layers.map((layer) => ({ ...layer }))
    }
  }

  get openedImage(): Uint8Array | undefined {
    return this.#openedImage?.slice()
  }

  get openedFilename(): string | undefined {
    return this.#openedFilename
  }

  get actionBatches(): ComputerAction[][] {
    return this.#actionBatches.map((batch) => batch.map(cloneAction))
  }

  async open(image: Uint8Array, filename: string): Promise<void> {
    this.#ensureNotClosed()
    this.#openedImage = image.slice()
    this.#openedFilename = filename
    this.#frameIndex = 0
    this.#state = 'open'
  }

  async screenshot(): Promise<Uint8Array> {
    this.#ensureOpen()
    const index = Math.min(this.#frameIndex, this.#recording.frames.length - 1)
    const frame = this.#recording.frames[index]!
    this.#frameIndex += 1
    return frame.slice()
  }

  async act(actions: ComputerAction[]): Promise<void> {
    this.#ensureOpen()
    this.#actionBatches.push(actions.map(cloneAction))
  }

  async layers(): Promise<LayerInfo[]> {
    this.#ensureOpen()
    return this.#recording.layers.map((layer) => ({ ...layer }))
  }

  async exportPsd(): Promise<Uint8Array> {
    this.#ensureOpen()
    return this.#recording.psd.slice()
  }

  async exportPreview(): Promise<Uint8Array> {
    this.#ensureOpen()
    return this.#recording.preview.slice()
  }

  async close(): Promise<void> {
    this.#state = 'closed'
  }

  #ensureNotClosed(): void {
    if (this.#state === 'closed') {
      throw new Error('Editor session is closed')
    }
  }

  #ensureOpen(): void {
    this.#ensureNotClosed()
    if (this.#state !== 'open') {
      throw new Error('Editor session is not open')
    }
  }
}
```

- [ ] **Step 4: Verify the fake is green**

Run:

```bash
bun test test/editor/fake-editor-session.test.ts
bun run typecheck
```

Expected: five tests pass and TypeScript reports no errors.

- [ ] **Step 5: Commit**

```bash
git add src/editor/fake-editor-session.ts \
  test/editor/fake-editor-session.test.ts
git commit -m "feat(editor): add the fake editor session"
```

---

### Task 4: Add the recorded factory and reusable contract suite

**Files:**

- Modify: `src/editor/fake-editor-session.ts`
- Create: `src/editor/index.ts`
- Create: `src/editor/fixtures/photopea-frame.png`
- Create: `src/editor/fixtures/layered-output.psd`
- Create: `src/editor/fixtures/document-preview.png`
- Create: `test/editor/editor-session.contract.ts`
- Create: `test/editor/recorded-fake-editor-session.contract.test.ts`

**Interfaces:**

- Consumes: `FakeEditorSession`, the issue #13 artifacts, and the public
  `EditorSession` interface.
- Produces: `createRecordedFakeEditorSession()` and
  `defineEditorSessionContract(name, createSession)`.

- [ ] **Step 1: Write the reusable contract suite and failing registration**

Create `test/editor/editor-session.contract.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import type { EditorSession } from '../../src/editor/session'

type EditorSessionFactory = () => Promise<EditorSession>

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

export function defineEditorSessionContract(name: string, createSession: EditorSessionFactory): void {
  describe(`${name} EditorSession contract`, () => {
    test('opens, acts, inspects, exports, and closes', async () => {
      const session = await createSession()
      try {
        expect(session.id.length).toBeGreaterThan(0)
        expect(session.viewport.width).toBeGreaterThan(0)
        expect(session.viewport.height).toBeGreaterThan(0)

        const image = await readFile(new URL('../../src/editor/fixtures/photopea-frame.png', import.meta.url))
        await session.open(image, 'photopea-frame.png')
        const frame = await session.screenshot()
        expect(Array.from(frame.slice(0, 8))).toEqual(pngSignature)

        await session.act([
          { type: 'move', x: 40, y: 50 },
          { type: 'click', button: 'left', x: 40, y: 50 }
        ])

        const layers = await session.layers()
        expect(layers.length).toBeGreaterThanOrEqual(2)
        expect(layers.every((layer) => layer.name.trim().length > 0)).toBe(true)

        const psd = await session.exportPsd()
        expect(new TextDecoder().decode(psd.slice(0, 4))).toBe('8BPS')

        const preview = await session.exportPreview()
        expect(Array.from(preview.slice(0, 8))).toEqual(pngSignature)
      } finally {
        await session.close()
      }
    })
  })
}
```

Create `test/editor/recorded-fake-editor-session.contract.test.ts`:

```ts
import { createRecordedFakeEditorSession } from '../../src/editor'
import { defineEditorSessionContract } from './editor-session.contract'

defineEditorSessionContract('recorded FakeEditorSession', createRecordedFakeEditorSession)
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run:

```bash
bun test test/editor/recorded-fake-editor-session.contract.test.ts
```

Expected: FAIL because `src/editor/index.ts` and the recorded factory do not
exist.

- [ ] **Step 3: Copy and fingerprint the approved binary fixtures**

Run from the worktree root:

```bash
mkdir -p src/editor/fixtures
cp ../../.superpowers/issue-13/photopea-final.png \
  src/editor/fixtures/photopea-frame.png
cp ../../.superpowers/issue-13/photopea-round-trip.psd \
  src/editor/fixtures/layered-output.psd
shasum -a 256 src/editor/fixtures/photopea-frame.png \
  src/editor/fixtures/layered-output.psd
```

Expected hashes:

```text
9eb49fec08c7b6c546f33c76a8fa704bc41d29ebca66a82774b3ecca066d1708
43f6382d40130b577e7e28537e95465a39c81a43c7bb3575ac7d4dac4de76b2d
```

Export the PSD's flattened composite as a separate preview fixture with macOS
`sips`. Keep the original screen and PSD fixtures unchanged:

```bash
sips -s format png src/editor/fixtures/layered-output.psd \
  --out src/editor/fixtures/document-preview.png
shasum -a 256 src/editor/fixtures/document-preview.png
```

Expected: a 640x480 PNG containing the document without the editor UI. The
committed preview has SHA-256:

```text
074d66b09f3d571c6b8a52e60fd60881d62299bc01211ad44596160085d867dd
```

- [ ] **Step 4: Implement the recorded factory**

Add this import to `src/editor/fake-editor-session.ts`:

```ts
import { readFile } from 'node:fs/promises'
```

Append:

```ts
export async function createRecordedFakeEditorSession(): Promise<FakeEditorSession> {
  const [frame, psd, preview] = await Promise.all([
    readFile(new URL('./fixtures/photopea-frame.png', import.meta.url)),
    readFile(new URL('./fixtures/layered-output.psd', import.meta.url)),
    readFile(new URL('./fixtures/document-preview.png', import.meta.url))
  ])

  return new FakeEditorSession({
    id: 'recorded-photopea-session',
    viewport: { width: 1440, height: 900 },
    recording: {
      frames: [frame],
      psd,
      preview,
      layers: [
        { name: 'Original photograph', kind: 'raster', visible: true },
        { name: 'Retouched copy', kind: 'raster', visible: true }
      ]
    }
  })
}
```

- [ ] **Step 5: Export the editor boundary**

Create `src/editor/index.ts`:

```ts
export { FakeEditorSession, createRecordedFakeEditorSession, type EditorRecording } from './fake-editor-session'
export type { Button, ComputerAction, EditorSession, LayerInfo, Pt, Viewport } from './session'
```

- [ ] **Step 6: Verify the recorded contract is green**

Run:

```bash
bun test test/editor/recorded-fake-editor-session.contract.test.ts
bun run typecheck
```

Expected: the reusable contract test passes and TypeScript reports no errors.

- [ ] **Step 7: Run the complete acceptance suite**

Run:

```bash
bun test
bun run typecheck
bun run lint
git diff --check
```

Expected: seven tests pass, TypeScript reports no errors, Prettier reports all
files formatted, and Git reports no whitespace errors.

- [ ] **Step 8: Commit**

```bash
git add src/editor test/editor
git commit -m "feat(editor): add the recorded editor fake"
```

The branch is then ready for an independent code review against issue #14.
