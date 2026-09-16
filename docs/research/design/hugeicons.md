# Hugeicons

Hugeicons, by Halal Lab, has more than 60,000 icons in ten styles. One
style, Stroke Rounded, is free: 6,035 icons at the time of reading, on
September 16, 2026. It is the recommended icon set for every UI glyph on
the landing page.

Contents:

1.  [The free style](#the-free-style)
1.  [Browsing and search](#browsing-and-search)
1.  [An icon's page](#an-icons-page)
1.  [Getting icons without an account](#getting-icons-without-an-account)
1.  [For agents](#for-agents)
1.  [Why it fits](#why-it-fits)
1.  [See also](#see-also)

## The free style

The style bar has three groups, and only one chip carries the "Free"
badge:

| Group    | Styles                                           |
| -------- | ------------------------------------------------ |
| Rounded  | Bulk, Solid, Twotone, Duotone, **Stroke (free)** |
| Standard | Duotone, Solid, Stroke                           |
| Sharp    | Solid, Stroke                                    |

Stroke Rounded icons sit on a 24 px grid with a 1.5 stroke, round caps and
joins, and `currentColor`. The free set has no filled twin, so an active
state has to come from colour or weight rather than an outline-to-fill
swap.

## Browsing and search

- **Search** covers all 60,000 icons, with autocomplete and an "AI
  Search" toggle. The query goes in the URL as `?search=`.
- **Pages.** The free grid runs to 61 pages. A green dot marks some tiles,
  apparently new or updated icons.
- **Categories.** Counts within Stroke Rounded. Editing, the largest, is a
  good sign for a photo-editing product:

  | Category             | Icons | Category          | Icons |
  | -------------------- | ----- | ----------------- | ----- |
  | Editing              | 601   | Business          | 419   |
  | Communications       | 286   | Arrows            | 243   |
  | Files Folders        | 230   | Devices           | 228   |
  | Logos                | 194   | Mathematics       | 173   |
  | Games                | 172   | Hands             | 172   |
  | E-Commerce           | 163   | Foods             | 145   |
  | AI                   | 136   | Education         | 126   |
  | Maps                 | 123   | Weather           | 123   |
  | Energy               | 116   | Date + Time       | 115   |
  | Logistics            | 113   | Security          | 113   |
  | Media                | 105   | Mouse             | 98    |
  | Medical              | 96    | Users             | 90    |
  | Furnitures           | 89    | Programming       | 87    |
  | Image + Camera       | 86    | Wifi              | 84    |
  | Buildings            | 83    | Layout            | 78    |
  | Crypto               | 75    | Clothing          | 66    |
  | Emojis               | 64    | Hierarchy         | 61    |
  | Gym                  | 57    | Settings          | 49    |
  | Filter + Sorting     | 48    | Kitchen           | 48    |
  | Check                | 47    | Alert             | 46    |
  | Bookmark             | 46    | Islamic           | 46    |
  | Add + Remove         | 41    | Award             | 39    |
  | Shapes               | 38    | Legal             | 37    |
  | Notes + Tasks        | 36    | Animation         | 35    |
  | Menu                 | 33    | Link + Unlink     | 30    |
  | Science + Technology | 28    | Space             | 28    |
  | Dashboard            | 27    | Download + Upload | 24    |
  | Home                 | 24    | Search            | 22    |
  | Git                  | 20    | Login + Logout    | 18    |
  | Presentation         | 15    |                   |       |

Searching "layers" suggests `layers-01`, `layers-02`, `layers-plus`,
`group-layers`, `ungroup-layers` and `layers-logo`.

## An icon's page

Opening `layers-01` in Stroke Rounded shows:

- **Identity.** Breadcrumb Editing › stroke · rounded › layers-01, the
  font glyph `f1f64`, the component name `Layers01Icon`, and "Available in
  v1.0.0+".
- **Controls.** Stroke width (1.5), size (24 px), colour (`currentColor`)
  and a reset.
- **Code tabs.** Web, React, React Native, Vue, Svelte, Flutter and
  Angular. Web gives
  `<i class="hgi hgi-stroke hgi-rounded hgi-layers-01"></i>` and React gives
  `<HugeiconsIcon icon={Layers01Icon} />`.
- **Copy and Download**, each as "SVG STROKED". Both open "Sign in to
  download icons", which needs a free account. An agent cannot create one,
  so agents use the routes below.

## Getting icons without an account

**Icon font from the CDN**, the simplest fit for our plain TypeScript
page:

```html
<head>
  <link rel="stylesheet" href="https://use.hugeicons.com/font/icons.css" />
</head>
<body>
  <i class="hgi-stroke hgi-layers-01" aria-hidden="true"></i>
</body>
```

- It includes every free icon, as WOFF2, WOFF, TTF, EOT and SVG.
- The docs say no attribution is required.
- `cdn.hugeicons.com/font/hgi-stroke-rounded.css` is deprecated and frozen
  on a 2024 build. Use the `use.hugeicons.com` URL.
- An "Icon Set" CDN link (`sets.hugeicons.com/<set-id>.css`) serves only
  the icons you pick, which keeps the font small.
- An icon font renders as text, so give decorative icons
  `aria-hidden="true"` and every icon-only button an accessible name.

**npm packages**, for inline SVG:

```sh
npm install @hugeicons/react @hugeicons/core-free-icons
```

```tsx
import { HugeiconsIcon } from '@hugeicons/react'
import { Notification03Icon } from '@hugeicons/core-free-icons'

export function Bell() {
  return <HugeiconsIcon icon={Notification03Icon} size={24} color="currentColor" strokeWidth={1.5} />
}
```

- Renderers exist for React, Vue, Svelte, Angular (`hugeicons-icon`) and
  React Native, and the `hugeicons` package covers Flutter.
- `@hugeicons/core-free-icons` holds the icon data, separate from any
  renderer. None of the listed packages is a vanilla renderer, so our page
  would need a small function that turns the data into an SVG, or the icon
  font.
- Exports are PascalCase names ending in `Icon`, with numbers spelled out:
  `3d-view` becomes `ThreeDViewIcon`.

## For agents

The agent skill bundles the full icon catalogue, so an agent looks names
up instead of guessing them:

```sh
npx skills add https://github.com/hugeicons/hugeicons --skill hugeicons
```

- It detects the framework from `package.json` or `pubspec.yaml`.
- It greps `references/icon-list.md`, 5,471 JavaScript export names, and a
  Flutter list of 4,547.
- It suggests only free icons unless a Pro licence exists.
- It leaves out props that repeat a default: `size 24`, `currentColor`,
  `strokeWidth 1.5`.

The MCP server, `@hugeicons/mcp-server` on npm, adds live search across
all 60,000 icons and glyph data. The docs recommend installing both.

Other routes: a Figma free demo file, a Figma plugin, a Framer plugin, a
VS Code extension, a WordPress plugin, community Blade and Django packages,
an Icon Font Generator and a migration tool.

## Why it fits

- **One style, large enough to never run out.** Six thousand icons in a
  single drawing convention satisfies "one icon library per surface".
- **Right weight for our type.** A 1.5 stroke sits beside regular text,
  and `strokeWidth` goes to 2 beside semibold labels, matching
  `better-ui`.
- **Our subject is covered.** Editing is the largest free category at
  601 icons, and layers, Image + Camera and AI glyphs match what a
  retouching product talks about.
- **No build or login.** The CDN font works in plain HTML today, and the
  agent skill keeps generated names correct.

## See also

- [Design research](README.md#iconography)
- [Isocons](isocons.md), for large illustrative icons
- [Hugeicons Stroke Rounded](https://hugeicons.com/icons/stroke-rounded)
