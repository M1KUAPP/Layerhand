# Its Hover

Its Hover ("static icons feel dead now") is a library of icons that
animate on hover. Each icon is a React component built with Motion and
installed through a shadcn registry. The site lists 263 icons. This page
was read on September 16, 2026.

Contents:

1.  [The library](#the-library)
1.  [How an icon is built](#how-an-icon-is-built)
1.  [What it covers](#what-it-covers)
1.  [Examples](#examples)
1.  [Using it without React](#using-it-without-react)
1.  [See also](#see-also)

## The library

- **Author and repository.** Built by Abhijit (@abhijitwt), in
  `itshover/itshover` with 2,669 stars. The site runs on Next.js 16,
  Tailwind 4, shadcn and `motion/react`.
- **Site.** A dark monospace interface with an orange accent, a theme
  toggle and Ctrl+K search.
- **Grid tiles.** Each shows the icon, which animates on hover, with a
  button to copy the component and a `>_` button to copy the install
  command.
- **Install** one icon through the registry:

  ```sh
  npx shadcn@latest add https://itshover.com/r/layers-icon.json
  ```

  Or install by hand: `npm install motion`, add the shared `types.ts`, and
  copy the component.

## How an icon is built

`layers-icon` has the tags layers, stack, blocks, overlap, organize and
group. Its source, condensed:

```tsx
const LayersIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = 24, color = 'currentColor', strokeWidth = 2, className = '' }, ref) => {
    const [scope, animate] = useAnimate()
    const start = () => animate('.top-block', { x: -20 }, { duration: 0.4, ease: [0.4, 0, 0.2, 1] })
    const stop = () => animate('.top-block', { x: 0 }, { duration: 0.4, ease: [0.4, 0, 0.2, 1] })
    useImperativeHandle(ref, () => ({ startAnimation: start, stopAnimation: stop }))
    return (
      <motion.svg
        ref={scope}
        onHoverStart={start}
        onHoverEnd={stop}
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        style={{ overflow: 'visible' }}
      >
        <motion.rect className="top-block" x="44" y="22" width="56" height="36" rx="10" fill={color} />
        <rect x="20" y="62" width="64" height="40" rx="12" fill={color} />
      </motion.svg>
    )
  }
)
```

The pattern is the same for every icon:

- `AnimatedIconProps`: `size`, `color`, `strokeWidth`, `className`.
- `AnimatedIconHandle`: `startAnimation()` and `stopAnimation()`, so a
  parent can trigger the animation from a button's own hover.
- `useAnimate()` scopes selectors to the SVG, and `onHoverStart` and
  `onHoverEnd` run the motion.
- The animations are short transforms, such as a 20-unit slide over 0.4 s
  on `[0.4, 0, 0.2, 1]`.

## What it covers

Icons that suit a SaaS landing page: `layers`, `upload`, `download`,
`sparkles`, `pen`, `eye`, `eye-off`, `camera`, `sliders-horizontal`,
`keyframes`, `mouse-pointer-2`, `brain-circuit`, `cpu`, `send`, `copy`,
`trash`, `refresh`, `lock`, `shield-check`, `credit-card`, `clock`,
`checked`, `double-check`, `external-link`, `link`, `expand`, `moon`,
`star`, `heart`, `x`, `right-chevron`, `down-chevron` and
`arrow-narrow-right`. It also has brand marks, including GitHub, X,
LinkedIn, OpenAI, Cursor, xAI and Next.js.

No icon slug contains image, crop, mask, brush, palette, contrast,
undo, redo, zoom, loader, settings, sun or bolt.

**Drawing conventions are mixed.** Brand marks and some UI icons are
filled shapes, like `layers` above on a 120-unit grid, while others are
stroked. That breaks "one optical strategy per surface", so Its Hover
cannot be the site's base icon set.

## Examples

The Examples page shows community components built with the icons: an X
sidebar, an animated navbar with a sliding active indicator, a collapsible
sidebar, a Takeuforward navbar, a Notion sidebar, a macOS-style dock and a
profile dropdown.

## Using it without React

`src/web` has no React. The animations are simple enough to port, so take
the idea rather than the package:

1.  Draw the icon with Hugeicons, so the stroke matches the rest of the
    site.
1.  Split the moving part into its own `<g>`.
1.  Animate it with a CSS transition on the parent's `:hover` and
    `:focus-visible`, on `transform` only, for example a 2 px shift over
    150 ms. Turn it off under reduced motion, since the motion is
    decorative.

Use this for a handful of accents, such as the upload and layers icons in
the hero, rather than every icon on the page.

## See also

- [Design research](README.md#iconography)
- [Jakub Krehel's interface skills](jakubkrehel-skills.md#ui-polish), for
  icon motion values
- [Its Hover icons](https://www.itshover.com/icons)
