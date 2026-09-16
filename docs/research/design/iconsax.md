# Iconsax

Iconsax, from the Vuesax team, has 50,305 icons, of which 7,140 are free.
The free set comes in six styles with rounded corners. This page covers the
free tier only, read on September 16, 2026. It is the alternative if
Hugeicons ever falls short, not the recommendation.

Contents:

1.  [Where the browser lives](#where-the-browser-lives)
1.  [The free set](#the-free-set)
1.  [Browsing and configuring](#browsing-and-configuring)
1.  [An icon's panel](#an-icons-panel)
1.  [Free against Pro](#free-against-pro)
1.  [Why it is the alternative](#why-it-is-the-alternative)
1.  [See also](#see-also)

## Where the browser lives

The link we were given, `app.iconsax.io/icons`, returns "OOPS! 404 Error!
Page Not Found". The icon browser is at the root, `app.iconsax.io`, marked
beta. The marketing and docs sites were returning server errors that day.

## The free set

**Six styles:** Linear, Outline, Bold, Twotone, Bulk and Broken. The free
tier has rounded corners only.

**Thirty-four free categories:**

| Category        | Icons | Category                      | Icons |
| --------------- | ----- | ----------------------------- | ----- |
| Christmas       | 1019  | Video-Audio-Image             | 486   |
| Crypto          | 606   | Money                         | 468   |
| Essential       | 605   | Arrow                         | 388   |
| Design-Tools    | 300   | Computers-Devices-Electronics | 288   |
| Grid            | 270   | Emails-Messages               | 216   |
| Content-Edit    | 211   | Type-Paragraph-Character      | 210   |
| Security        | 168   | Ai                            | 162   |
| Programming     | 161   | Support-Like-Question         | 156   |
| Location        | 144   | Business                      | 120   |
| Users           | 120   | Weather                       | 108   |
| Settings        | 101   | Delivery                      | 96    |
| School-Learning | 90    | Time                          | 90    |
| Shop            | 84    | Archive                       | 72    |
| Building        | 66    | Search                        | 60    |
| Call            | 54    | Notifications                 | 54    |
| Files           | 48    | Car                           | 47    |
| Astrology       | 36    | Cryptocurrency                | 36    |

Most glyphs repeat across the six styles, so the number of distinct
glyphs is far below 7,140. Searching "layer" returns one layers glyph in
all six styles, plus unrelated matches on "player".

## Browsing and configuring

- **Left rail.** Type (Static, Animated, AI), Corner (All, Rounded,
  Straight), Filter (All, Free, Premium) and categories with counts.
- **Top bar.** Search, with the query in `?search=`, and style chips.
- **Right rail.** Icons selected and Projects, then Configuration.
  - **Design:** colour, stroke from 0.5 to 2.5, size (24 px), and file
    type (`.svg`).
  - **Development:** Vue, React, Svelte, Flutter, Angular, Web Components,
    Lit, React Native, Swift, Kotlin, CSS or Font.
  - **Download** exports the selection.
- **Ads.** A Carbon ad sits inside the grid.

## An icon's panel

Clicking a free icon opens its code, with tabs for SVG, Vue, React, HTML,
Svelte and Web Components. The SVG for `layer` in the Linear style:

- `width="24" height="24" viewBox="0 0 24 24" fill="none"`.
- `stroke="#ffffff"`, hardcoded rather than `currentColor`.
- `stroke-width="1.5"`, round caps and round joins.
- A wrapper `<g clip-path="url(#clip0_4418_9594)">` with a generated id.

Two fixes before inlining one on a page:

- Replace the stroke and any fill with `currentColor`.
- Remove the `clip-path` group or make its id unique, because the same id
  repeated across many inline icons collides.

## Free against Pro

| Feature                      | Free                                       | Pro ($9.99/month, $39.99/year, $199.99 once) |
| ---------------------------- | ------------------------------------------ | -------------------------------------------- |
| Icons                        | 7,000 in 33 categories                     | 44,250 more in 96 categories                 |
| Corners                      | Rounded                                    | Rounded and straight                         |
| Animated icons               | No                                         | 1,000                                        |
| Formats                      | SVG, PNG, WebP                             | Adds WOFF, WOFF2 and TTF fonts               |
| Code                         | Vue, React, Svelte, JS, TS, Web Components | Same                                         |
| Projects                     | No                                         | Up to 20 saved                               |
| Edit colour, size and stroke | Free icons                                 | All icons                                    |

An npm package is listed as "coming soon".

## Why it is the alternative

- **Hugeicons has more free glyphs in one style.** Iconsax's 7,140 count
  the same glyphs once per style.
- **Its exports need cleaning.** Hardcoded colour and clip-path ids must
  be fixed before an icon is used inline.
- **Its best feature is style pairs.** Linear by default and Bold for the
  active state follows `better-ui`'s outline-and-fill rule, which Hugeicons'
  free set cannot. If a design needs visible active icons, such as a
  toolbar, Iconsax is the better fit for that surface alone.

## See also

- [Design research](README.md#iconography)
- [Hugeicons](hugeicons.md), the recommendation
- [Iconsax icon browser](https://app.iconsax.io/)
