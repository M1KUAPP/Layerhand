# Canvas UI

Canvas UI is a library of 35 visual effects that run in WebGL or WebGPU
over a live, still-interactive page. Its author, David Haz, also made
React Bits. This page records how it works, every component and its
controls, and which effects suit the landing page. Read on September 16, 2026.

Contents:

1.  [How it works](#how-it-works)
1.  [Installing](#installing)
1.  [Browser support](#browser-support)
1.  [How an effect is built](#how-an-effect-is-built)
1.  [Components](#components)
    1.  [Scroll-driven effects](#scroll-driven-effects)
    1.  [Peel](#peel)
    1.  [Cursor and click effects](#cursor-and-click-effects)
    1.  [Three.js objects](#threejs-objects)
1.  [The site itself](#the-site-itself)
1.  [What to use for the landing page](#what-to-use-for-the-landing-page)
1.  [See also](#see-also)

## How it works

Most effects use the **html-in-canvas API**, an experimental Chrome
feature. A `<canvas layoutsubtree>` lays out real DOM children, and
`drawElementImage(element, x, y)` paints them into the canvas. The effect
uploads that canvas as a texture with `texImage2D` in WebGL or
`copyExternalImageToTexture` in WebGPU, and a shader distorts it. The
content underneath stays selectable and clickable.

The six object effects skip that API. They are Three.js scenes that
render a GLB, glTF, SVG or image, and they work in every browser.

Every effect ships in six flavours (React, Solid, Preact, Vue, Svelte and
vanilla TypeScript) and two renderers:

|                  | WebGL                               | WebGPU                                         |
| ---------------- | ----------------------------------- | ---------------------------------------------- |
| Shaders          | GLSL                                | WGSL                                           |
| Dependencies     | None, or `three` for object effects | `vgpu`, plus `three` for object effects        |
| Browsers         | Any WebGL2 browser                  | Chrome and Edge 113+, Safari 26+, Firefox 141+ |
| When unsupported | Falls back to plain HTML            | Renders the wrapped content unchanged          |
| Registry suffix  | None                                | `-webgpu`                                      |

## Installing

Components install through a shadcn registry, so the source file lands in
the project to read and edit:

```sh
npx shadcn@latest add @canvas-ui/liquid-react
npx shadcn@latest add @canvas-ui/liquid-react-webgpu
```

Swap `liquid` for the component and `react` for `solid`, `preact`, `vue`,
`svelte` or `vanilla`. Files land in `components/canvasui/`. Vanilla
builds export a factory, such as `createLiquid()` from `LiquidVanilla.ts`,
or `LiquidWebGPU.ts` for WebGPU.

To pin the registry, add it to `components.json`:

```json
{
  "registries": {
    "@canvas-ui": "https://canvasui.dev/r/{name}.json"
  }
}
```

Agents can browse and install through the shadcn MCP server:

```sh
npx shadcn@latest mcp init --client claude
```

Each docs page also has a "Copy for AI" menu, and the Playground has
another.

## Browser support

| Browser                                 | html-in-canvas effects | Object effects |
| --------------------------------------- | ---------------------- | -------------- |
| Chrome with the flag or an origin trial | Full effect            | Full effect    |
| Everything else                         | Plain HTML fallback    | Full effect    |

- **Local testing** needs `chrome://flags/#canvas-draw-element`.
- **Production** needs an origin-trial token registered to our own domain
  and served as a meta tag or HTTP header. canvasui.dev runs on its own
  token, which is why the demos work there in plain Chrome.
- **Unsupported browsers** get the content as ordinary HTML with no
  errors. No effect may be the only way a message or action reaches a
  visitor.

## How an effect is built

Reading Peel's full WebGL source shows the pattern every engine follows:

- **API.** `create<Name>(elements, options)` returns `setOptions()`,
  `resize()` and `destroy()`, or `null` when the context is unavailable.
- **Elements.** A `source` canvas with `layoutsubtree`, the `content`
  element captured inside it, an `output` canvas the shader draws to, and
  for Peel an `under` element.
- **Budget.** Device pixel ratio is capped at 2. An IntersectionObserver
  stops the animation frame loop off-screen, a ResizeObserver resizes, and
  the loop stops once motion settles.
- **Reduced motion.** Smoothing collapses to an instant snap under
  `prefers-reduced-motion`.
- **Theme.** A MutationObserver on the root's `class`, `style` and
  `data-theme` re-resolves any `"auto"` colours.
- **Clicks.** Pointer events on the content turn off only where the
  effect covers it.

## Components

Every component below except the object effects is html-in-canvas. None
of those need a dependency.

### Scroll-driven effects

| Component       | What it does                                                               | Key props and defaults                                                                         |
| --------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Laser           | A beam near the viewport bottom prints content in from behind it on scroll | `speed 0.3`, `offset 140`, `thickness 6`, `glow 2`, `reveal 400`, `heat 1.5`, `shimmer 12`     |
| Particle Scroll | Everything below a line dissolves into sand and reassembles on scroll      | `point 0.68`, `band 420`, `density 2`, `gravity 0.35`, `swirl 60`, `stagger 0.7`, `settle 1.2` |
| Bend            | The page scrolls over the face of a cube, folding at the top and bottom    | `zone 240`, `angle 80`, `rounding 150`, `perspective 700`, `direction "in"`, `tumble 0.5`      |

### Peel

Peel lifts the page from one edge like a sticker and reveals whatever sits
beneath. For a product whose point is a layer beneath the surface, it is
the most on-message effect in the library.

| Prop          | Default    | Meaning                                                  |
| ------------- | ---------- | -------------------------------------------------------- |
| `side`        | `"left"`   | Edge that peels: left, right, top or bottom              |
| `mode`        | `"cursor"` | `cursor` peels as the pointer nears, `hover` peels fully |
| `reveal`      | `250`      | CSS pixels exposed at full peel                          |
| `zone`        | `200`      | Width of the strip that drives the peel                  |
| `curl`        | `300`      | Curl radius; smaller rolls tighter                       |
| `bow`         | `75`       | How much the lifted edge bows                            |
| `shade`       | `0.25`     | Curvature shading on the sheet                           |
| `shine`       | `1`        | Sheen that follows the cursor along the edge             |
| `shineColor`  | `"auto"`   | Light on dark pages, dark on light ones                  |
| `bulge`       | `50`       | How far the edge bulges toward the cursor                |
| `perspective` | `2000`     | Camera distance; lower exaggerates depth                 |
| `smoothing`   | `0.3`      | Seconds to catch up with the cursor                      |
| `under`       | none       | The layer revealed; a slot in Vue and Svelte             |

### Cursor and click effects

| Component       | What it does                                                         | Key props and defaults                                                     |
| --------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| ASCII Sweep     | A glowing band of characters sweeps text lines and swaps content     | `duration 2`, `band 0.28`, `color "#4ade80"`, `onSweepStart`, `onSweepEnd` |
| Asciify         | A cursor lens redraws the page beneath it as characters              | `radius 0.4`, `followSpeed 3`, `glow 0.75`                                 |
| Blaze           | Fire, sparks and smoke rise from the page bottom                     | `height 0.97`, `layers 4`, `sparkColor [1, 0.4, 0.05]`                     |
| Bubble          | A glassy metaball droplet trails the cursor and refracts the page    | `size 30`, `trail 24`, `refraction 80`, `iridescence 1`                    |
| Canvas          | The page on woven canvas; the cursor drags ridges of wet paint       | `grain 0.5`, `halftone 0.1`, `relief 0.45`, `dry 2.5`                      |
| Cloth           | The page hangs on fabric in the wind; the cursor sends waves         | `pin "top"`, `wind 3`, `amplitude 30`, `perspective 1200`                  |
| Clouds          | Theme-aware mist blurs the page; cursor wind parts it                | `cover 0.1`, `density 2.5`, `opacity 0.64`, `windRadius 350`               |
| Decrypt Reveal  | The page is cipher text that decodes near the cursor                 | `radius 400`, `cell 10`, `scramble 0.1`, `edgeGlow 2`                      |
| Displacement    | A grid of cells shears apart with colour fringing                    | `grid 50`, `strength 0.1`, `aberration 1.5`, `grain 0.1`                   |
| Droplets        | Rain runs down and refracts the page                                 | `intensity 0.5`, `refraction 0.2`, `interactive true`                      |
| Flame Wrap      | A border of fire around one element                                  | `color [0.31, 0.54, 1]`, `height 170`, `radius 40`, `melt 4.5`             |
| Force Field     | A hex energy shield; clicks send shockwaves                          | `shape "hexagon"`, `cellScale 16`, `refraction 30`, `onHit`                |
| Frost           | Ice melts under the cursor and refreezes                             | `ior 1.31`, `meltRadius 0.25`, `refreeze 2`, `opacity 0.6`                 |
| Glass           | A cursor lens that magnifies `[data-glass-target]` elements          | `size 120`, `ior 1.5`, `depth 250`, `zoom 1.5`, `follow 0.2`               |
| Glitch          | Periodic tears with RGB splits                                       | `interval 3`, `duration 0.4`, `slices 24`, `rgbShift 4`                    |
| Glyph Rain      | Falling glyphs light a dimmed page                                   | `cell 15`, `speed 0.2`, `dim 0.5`, `stirRadius 260`                        |
| Grid            | 3D tiles ripple out from the cursor                                  | `tileSize 150`, `liftHeight 60`, `perspective 1200`                        |
| Hex Float       | A floor of floating hex tiles; the cursor flattens a readable window | `size 160`, `tilt 24`, `iridescence 1`, `grain 0.8`                        |
| Liquid          | A GPU fluid simulation stirred by the pointer                        | `force 1.1`, `curl 1.9`, `rainbow false`, `dyeResolution 512`              |
| Magnify         | A HUD scanner lens with click ripples                                | `size`, `zoom`, `scrollZoom`, `crosshair`, `readout`                       |
| Particle Reveal | The page is grey dust that merges into crisp UI near the cursor      | `radius`, `size`, `scatter`, `drift`                                       |
| Retro Dither    | A dither lens pixelates the page                                     | `pixelSize`, `levels`, `scanlines`, `degauss`                              |
| Ripple          | Clicks send water ripples across the page                            | `amplitude`, `wavelength`, `rings`, `decay`, `trigger`                     |
| Shatter         | The page breaks into glass shards around the cursor                  | `tileSize`, `shards`, `lift`, `refraction`, `shadow`                       |
| VHS             | Worn tape playback with chroma bleed and scanlines                   | `wave`, `jitter`, `crease`, `vignette`, `barrel`                           |

### Three.js objects

These need `three` and `@types/three`, and nothing else. Each takes a
`src` of GLB, glTF, SVG, PNG, JPEG, WebP or GIF, sniffed from the bytes,
with Draco decoding fetched on demand. They share studio lighting with a
`#066aff` ring light, float and rock animation, drag to orbit, optional
zoom and turntable, and `onLoad` and `onError` callbacks.

| Component       | What it renders                                                                         | Distinctive props and defaults                                                              |
| --------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Glass Object    | Solid glass with refraction, dispersion and frost; 2D art is traced into a rounded slab | `ior 1.75`, `thickness 4`, `roughness 0.25`, `dispersion 1.5`, `bevel 1`, `backgroundImage` |
| Particle Object | Thousands of particles that scatter under the cursor and spring back                    | `count`, `size`, `radius`, `strength`, `swirl`, `spring`, `damping`                         |
| Liquid Object   | The asset behind invisible liquid the cursor drags                                      | `distortion`, `aberration`, `cursorForce`, `swirl`, `iridescence`, `metallic`               |
| ASCII Object    | Shape-matched ASCII characters that trace edges                                         | `cellSize 10`, `charset`, `contrast 1.5`, `edgeContrast 3`, `fov 65`                        |
| Dithered Object | A Bayer, halftone or Floyd–Steinberg one-bit dither                                     | `method`, `gridSize`, `pixelSizeRatio`, `grayscale`                                         |
| Ink Object      | Rough ink strokes that swell in shadow and break in light                               | `inkColor`, `lineSpacing`, `strokeWeight`, `bleed`, `wobble`                                |

## The site itself

- **Docs.** A sidebar lists Introduction, Installation, Rendering and MCP,
  then every component, with a dot on new ones.
- **Component pages.** Each has tags, a live demo (often the page itself),
  a Controls drawer, install tabs, dependencies, the full source, the API
  table, and previous and next links.
- **Playground.** A component picker with Low, Medium and High quality
  presets, sliders for every prop, Copy for AI and Share. It runs over a
  sample SaaS landing page ("Ship in days, not quarters."), which makes it
  a fast way to judge an effect on a page shaped like ours.

## What to use for the landing page

1.  **Peel on the hero result.** The retouched image peels back to reveal
    its layer list beneath. It says "there are layers under this" without
    words.
1.  **Glass Object for the Three.js moment.** Point it at our wordmark SVG
    or a stacked-layers SVG. It works in every browser and only needs
    `three`.
1.  **Particle Scroll or Laser for one sticky section.** Either prints the
    next section in as the visitor scrolls. Pick one, not both.
1.  **Use the vanilla builds.** `src/web` has no framework, and the
    vanilla factories need none.
1.  **Design the fallback first.** Outside Chrome with the origin trial,
    html-in-canvas effects are plain HTML. The page must read completely
    that way.
1.  **Skip the novelty effects** (VHS, Glitch, Blaze, Glyph Rain) on a
    page selling professional retouching.

## See also

- [Design research](README.md)
- [MotionSites](motionsites.md), for video-based scroll effects
- [Canvas UI documentation](https://canvasui.dev/docs)
