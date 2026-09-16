# Isocons

Isocons draws icons as isometric line art: each glyph sits on a face of an
imaginary cube, with depth. At version 2.1 it has about 1,000 icons whose
names follow Material Symbols. They are built for presentations and large
illustrative use, not for 16 px toolbars. Read on September 16, 2026.

Contents:

1.  [The catalogue](#the-catalogue)
1.  [Styling controls](#styling-controls)
1.  [An icon's panel](#an-icons-panel)
1.  [The exported SVG](#the-exported-svg)
1.  [Why it fits](#why-it-fits)
1.  [See also](#see-also)

## The catalogue

Six categories, counted from the page:

| Category            | Icons |
| ------------------- | ----- |
| UI Actions          | 375   |
| Social              | 316   |
| Business & Payments | 153   |
| Transportation      | 70    |
| Maps                | 57    |
| Privacy & Security  | 36    |

Names that suit a SaaS landing page include `layers`, `stacks`, `upload`,
`download`, `arrow upload progress`, `bottom drawer`, `bottom sheets`,
`left panel open`, `right panel open`, `cards`, `dynamic form`,
`responsive layout`, `prompt suggestion`, `terminal`, `toast`, `token`,
`view timeline`, `zoom in`, `rocket launch`, `support agent`, `analytics`,
`wallet`, `credit card`, `encrypted`, `passkey`, `shield lock` and
`verified user`.

The site has a dark monospace interface with a blue accent, a subtitle
that cycles its last word ("Isometric icons for your Presentations"), a
Figma plugin, and floating theme and share buttons.

## Styling controls

A sticky left panel has two tabs, Categories and Filter. Filter restyles
the whole grid at once:

| Control   | Options                  | Effect                                              |
| --------- | ------------------------ | --------------------------------------------------- |
| Direction | Left, Top, Right         | Which cube face the glyph sits on; Top lays it flat |
| Fill      | On or off                | Solid dark faces, or a transparent wireframe        |
| Edge      | Sharp or rounded outline | Every internal edge, or the outer silhouette only   |
| Stroke    | 1 px, 2 px, 3 px         | Line weight                                         |

A live cube on a dot grid previews the chosen direction. Search takes
descriptors such as "add" or "check". Hovering a tile rings it in blue and
shows a "+" that adds it to a folder, and the Checkout button collects the
folder for download.

## An icon's panel

Clicking a tile opens a panel with:

- The name, a "Keep style" toggle, and "Add to folder".
- Fill, Direction (Left, Top, Right), Edge (sharp or rounded), Stroke
  (1–4) and Size (−/+, 48 px by default).
- A colour swatch and a custom colour picker.
- Copy SVG, Download SVG and Download PNG.

## The exported SVG

Copied from `layers`, facing left, fill off:

- `width="48"` with `viewBox="0 0 96 103"`, which is not square.
- `fill="none"` and `stroke="#229EFF"`, the accent hardcoded.
- `stroke-width="0.5px"` and `stroke-linejoin="round"`.
- Eight paths in 1,421 bytes.

Before using one inline:

- Replace the stroke colour with `currentColor` so CSS sets it.
- Size the container to the 96:103 ratio, or pad the viewBox square.
- Add `vector-effect="non-scaling-stroke"` if the icon is shown well above
  48 px and the line should keep its weight.
- Mark it `aria-hidden="true"` when it is decorative, which is nearly
  always.

## Why it fits

- **Depth is our subject.** An isometric stack reads as layers before any
  copy does, and it sets up the parallax and Three.js sections without
  a 3D model.
- **It complements Hugeicons.** Isocons carries the large moments
  (feature cards, the "how it works" steps, empty and error states) while
  Hugeicons carries every UI glyph. The two never share a surface.
- **Pick one direction and stroke** for the whole site. Mixing Left and
  Top faces across sections would look accidental.

## See also

- [Design research](README.md#iconography)
- [Hugeicons](hugeicons.md), for UI glyphs
- [Isocons](https://www.isocons.app/)
