# MotionSites

MotionSites sells prompts that make a coding agent rebuild a cinematic
landing page, often around a looping or scroll-driven video. This page
covers the free tier only, read on September 16, 2026 from the team's
free account.

Contents:

1.  [What the site offers](#what-the-site-offers)
1.  [What free gets you](#what-free-gets-you)
1.  [How a prompt is written](#how-a-prompt-is-written)
1.  [The free lessons](#the-free-lessons)
    1.  [Scroll-scrubbed video](#scroll-scrubbed-video)
    1.  [Layered parallax hero](#layered-parallax-hero)
    1.  [Three.js scroll scene](#threejs-scroll-scene)
1.  [Animated backgrounds](#animated-backgrounds)
1.  [What to use for the landing page](#what-to-use-for-the-landing-page)
1.  [See also](#see-also)

## What the site offers

The library is a masonry grid of preview videos. Its categories are Apps,
Sections, Hero, Landing Page, SaaS, Agency, AI, Creative, Portfolio,
Technology, Travel, Fintech, Wellness, 3D Website, Ecommerce, 3D and
Carousel. It sorts by Recent and filters by Free or Premium. On a card, a
crown marks a premium prompt and a copy icon marks a free one.

Opening a card at `/?prompt=<slug>` shows its preview video, likes, and a
"Copy full prompt" button. The site also has:

- **MCP.** One command, then an OAuth sign-in. The page says free
  accounts can open three prompts through it, and paid plans get all 500+:

  ```sh
  claude mcp add motionsites --scope user --transport http \
    https://xgdzyqfalbibzelpdpvr.supabase.co/functions/v1/mcp
  ```

- **Lovable Templates.** Forty templates, all behind the paid plan.
- **Animated Backgrounds.** A daily-growing video library, mostly premium.
- **Academy.** Free tutorials, each with the prompt used.

Paid plans are $129 for three months with three copies a day, $279 a
year, or $399 for life, with packs of 2–10 prompts from $49.

## What free gets you

**Seventy-four free prompts** show with the Free filter and the page
scrolled to the end. Those relevant to a SaaS or AI landing page:

| Prompt                  | Category     | Prompt             | Category          |
| ----------------------- | ------------ | ------------------ | ----------------- |
| Quantum Lucid           | SaaS         | Agent Grove        | SaaS              |
| Growth Decisions        | SaaS         | AI Workflow Agents | SaaS              |
| Intelligent Performance | SaaS         | Scaling Platform   | SaaS              |
| DeepThink               | AI Assistant | JungleMind         | SaaS              |
| Palomar Labs            | AI           | Fastshot           | AI                |
| Agent Wave              | AI           | AI Runtime         | AI                |
| Intelligence Layer      | Technology   | Quantum Core       | Data Intelligence |
| Cast and Render         | 3D           | Mind AI            | 3D                |
| 3D Character Studio     | 3D           | Space planet       | 3D                |
| 3D Collectible Hero     | 3D Website   | Network Hero       | Hero              |
| Vision Reveal           | Hero         | Neon Logic         | Landing Page      |
| ConSentinel             | Motion       | Heritage Grove     | Footer            |

The rest include Veyra Electric, Cyber Ronin, Sparkform, Northstar,
Cordex, TrueEarth, Vectrus Energy, Orbit Flora, Cyber Layer, TrustFlow,
Sellix, Vinyl, Aurex Finance, Vertex, Data Signal, Signal ID, Stillmind and
Wellbeing OS.

**Copies are capped.** After six copies the site showed "You've reached
your free copy limit. Upgrade to keep downloading." This research used the
account's allowance. The prompts shown in full inside the free lessons do
not count against it.

## How a prompt is written

Six free prompts were read before the cap. All share one shape: an exact
spec that tells the agent to rebuild a page pixel for pixel, with no
invented copy.

**Quantum Lucid** (SaaS, 20,249 characters) is the most complete. It asks
for one `index.html` with no framework, in these sections:

1.  **Font.** Figtree as a variable font, weights 100–900,
    `font-display: block`, fractional weights such as 388, 470 and 577, and
    tracking as tight as `-0.057em` on the display size.
1.  **Media.** One exact CloudFront video URL and its poster, with a
    warning not to swap in a gradient or stock image. The file names start
    `hf_2026…`.
1.  **Page shell.** A fixed 1290x860 stage that JavaScript scales to fit a
    desktop viewport.
1.  **Copy.** Exact strings and line breaks.
1.  **Logo.** An inline SVG path.
1.  **Desktop layout.** Absolute pixel positions. The product card is
    built on a design-pixel unit, `--dp: calc(var(--u) / 548)`, so the
    548x340 mockup scales as one piece.
1.  **Compact layout.** Below 940 px, a real CSS grid with `clamp()`
    tokens.
1.  **Entrance animation.** Tokens
    `--ease-reveal: cubic-bezier(.22, 1, .36, 1)` and
    `--ease-settle: cubic-bezier(.16, 1, .30, 1)`, durations 0.5–0.94 s.
    The headline wipes in with `clip-path: inset()`. Motion uses the
    separate `translate` property, never `transform`, so it cannot clobber
    the stage scale. A `data-enter` attribute goes from `pending`
    to `run` after `document.fonts.ready` and two animation frames, with a
    1200 ms fallback, then to `done`. Reduced motion shows the final state.
1.  **Do and do not.** No React unless asked, no substitute font, no extra
    sections, no rounded type sizes.
1.  **Acceptance.** Two views: 1290x860 and a phone about 390 px wide.

The other five:

| Prompt                  | Length | Stack                             | Notable                                                                     |
| ----------------------- | ------ | --------------------------------- | --------------------------------------------------------------------------- |
| Growth Decisions        | 11,164 | HTML, CSS, JS                     | Inter, radius 0 everywhere, full-bleed painterly video, no scroll           |
| DeepThink               | 13,695 | Static HTML                       | Two dark full-viewport sections on `#0c0c0c`, masks, smooth scroll          |
| Intelligent Performance | 26,839 | One HTML file                     | Paper-grey stage, looping videos, LED-dot headline, glass cards, grain      |
| 3D Character Studio     | 5,726  | React, TypeScript, Vite, Tailwind | Helvetica Now Display, video hero, the Academy's free cursor-tracking build |
| Cast and Render         | 18,074 | One HTML file                     | Scroll scrubs a fixed full-screen video while three text panels cross-fade  |

## The free lessons

The Academy's lessons print full prompts on the page, which makes them
the most useful free material.

### Scroll-scrubbed video

From "How to Build a Scroll-Animated Website With AI" and its NovaAI
prompt:

- **Prepare the video.** A short MP4 with no text baked in, so headlines
  stay editable. An image sequence scrubs more precisely than an MP4.
- **Layers**, bottom to top, fixed at `inset: 0` with pointer events off:
  a poster image, a `<video>`, and a `<canvas>`. The poster fades out once a
  frame exists, and the canvas fades in once its frame cache is ready, each
  over 500 ms.
- **Progress** is `scrollY / (scrollHeight - innerHeight)`, clamped to 0–1,
  smoothed with `smoothed += (target - smoothed) * 0.12` on each animation
  frame.
- **Frame cache.** An offscreen video extracts up to 90 frames, or
  `duration * 12` with a minimum of 24, at up to 960 px wide as
  `ImageBitmap`s. It starts 300 ms after `loadeddata`. The canvas draws with
  object-cover maths at a device pixel ratio capped at 2.
- **Fallback.** Until the cache is ready, seek the visible video to
  `smoothed * (duration - 0.05)` whenever the change exceeds 0.04 s.
- **Scroll length.** An `80vh` spacer between sections sets how much
  scrolling scrubs the video.
- **Reveals.** An IntersectionObserver at threshold 0.15 moves blocks from
  `translate-y-8` and opacity 0 to rest, over 700 ms with per-element
  delays.
- **Glass.** `bg-white/15 backdrop-blur-md` with a `border-white/15`
  border, and `drop-shadow` on text over video.
- **Refining.** Keep the video at full opacity with no dark overlay, test
  on mobile for lag, then make small, focused follow-up requests rather than
  asking for a redesign.

### Layered parallax hero

From "How to Build a Premium Animated Website" and its Aether Lane prompt,
built with React, Tailwind and Framer Motion:

- **Four layers** in a `100vh` section with overflow hidden:
  1.  A sky image at 120% height, moving with the scroll.
  1.  A giant title, `clamp(3rem, 14vw, 14rem)`, gradient-filled with
      `background-clip: text` and `mix-blend-mode: lighten`, held still.
  1.  Desktop subtext in `mix-blend-mode: overlay`.
  1.  A building foreground image above the title, moving with the sky.
- **Scroll mapping.** `useScroll` on the section with offset
  `['start start', 'end start']`, and `useTransform` from 0–1 to 0%–8%.
  Sky and building drift while the title stays, so the title sits behind
  the architecture.
- **Navigation.** A fixed glass pill with `backdrop-filter: blur(15px)`.
  The mobile menu is full-screen, blurred 24 px, with links staggered by
  0.06 s from opacity 0, `y: 20` and `blur(4px)`.

### Three.js scroll scene

From "How to Build a 3D Scroll-Animated Website with AI":

1.  Ask an image tool, such as Gemini or GPT Image, to redraw one object
    from the front, back, left and right, then crop the four views.
1.  Feed the four views to an image-to-3D generator in multi-view mode,
    and export a GLB with 1K–2K textures.
1.  In Claude Code, ask for a page that does not scroll: everything is
    pinned, and scrolling drives scene one into scene two, with the
    headline letters scattering upward.
1.  Add the GLB and a reference video of the motion, and ask for it to be
    implemented with Three.js.
1.  If the model renders dark and muddy, the fix is tone mapping.

## Animated backgrounds

The Backgrounds page loaded 46 clips from CloudFront, Mux (HLS) and R2.
The three measured were 1920x1080, 8–12 s, and set to autoplay, loop and
mute. Previews carry a MotionSites watermark and most are premium. The
clips set a useful bar for our own footage: 1080p, about ten seconds, a
seamless loop, and no text in frame.

## What to use for the landing page

- **Take the techniques, not the pages.** Every prompt pins a font,
  copy and hosted video that are not ours. The scroll-scrub recipe, the
  parallax layer order and the entrance state machine all port to our plain
  TypeScript page.
- **Scrub the layer reveal.** A Gemini clip of a photo separating into
  layers, drawn to canvas by scroll, is the sticky-scroll section. The
  [video pipeline](video-pipeline.md) covers making it.
- **Borrow the prompt format** for our own agents: exact tokens, exact
  copy, a do-and-do-not list and two acceptance viewports.
- **Do not spend copies casually.** The account's free allowance is used
  up, and the lessons already cover the three techniques we need.

## See also

- [Design research](README.md)
- [Canvas UI](canvas-ui.md), for scroll effects that need no video
- [MotionSites Academy](https://motionsites.ai/academy)
