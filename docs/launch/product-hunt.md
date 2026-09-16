# Product Hunt listing

This is the Product Hunt listing for Layerhand, which launches on
Friday, September 18, 2026, in the GPT-6 Astra Challenge. Each
section below holds the copy for one field of the listing, ready to
paste.

Contents:

1.  [Tagline](#tagline)
1.  [Description](#description)
1.  [First maker comment](#first-maker-comment)
1.  [Gallery](#gallery)
1.  [Topics](#topics)
1.  [Links](#links)

## Tagline

> AI retouching that returns a layered PSD, not a flat JPEG

57 characters.

## Description

Layerhand retouches your photograph in Photopea while you watch.
Correct it as it works, and the file comes back as a PSD with each
edit on its own named layer. Three free runs, no account needed.

## First maker comment

Most AI photo tools hand you pixels you can't change, so I stopped
generating images and taught Astra to use a real image editor
instead.

Why a layered file matters: in e-commerce and real-estate pipelines,
retouching is a real line item, and a flattened JPEG is unusable
because the client always asks for one more change. A flat JPEG keeps
only the result. In a PSD, each edit sits on its own named layer, and
nothing is baked in, so the next change does not touch the rest.

Under the hood, an agent drives Photopea with the `computer` tool,
working the toolbar one step at a time. You watch it work, and you can
steer it mid-run: type a correction while it works and the next
actions bend around it, without throwing away what is done. Consider
the real run from September 15: the request was to brighten a
seascape, warm its colours and darken its corners, and partway
through it was told to keep the vignette very subtle. The correction
shaped the top layer of the stack, the one named _Very subtle corner
vignette_.

It is free to try: three runs, no account needed.

I'll be honest about the limit: a run takes a few minutes, and the
step count is capped.

## Gallery

1.  The hero: the unretouched sample photograph, a cobalt-blue glass
    bottle with a brushed-metal cap on a creased paper backdrop.
    Caption: _Before retouching: the sample photograph, which you can
    try in the workbench._
2.  The agent at work: the Photopea window takes over the frame, and
    the toolbar responds on its own. Caption: _Nobody is touching the
    mouse._
3.  The mid-run correction, _keep the shadow_, typed while it works.
    The layer stack stays visible. Caption: _The work does not
    restart, and the next actions bend._
4.  The finished image, once the run is done. Caption: _The
    photograph, after retouching._
5.  The layer list from the exported PSD, bottom of the stack first:
    Original photograph, Brighten the photograph, Warm the colours,
    Very subtle corner vignette. Caption: _Four layers, each named for
    what it does._

## Topics

- Artificial Intelligence
- Photography
- Photo Editing

## Links

- Repository: https://github.com/M1KUAPP/astra
- Contest: https://www.producthunt.com/contests/gpt-6-astra-challenge
