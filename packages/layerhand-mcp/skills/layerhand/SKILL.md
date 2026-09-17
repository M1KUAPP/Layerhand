---
name: layerhand
description: Use when the user wants a photograph retouched and wants an editable, layered PSD back rather than a flat image. Runs on Layerhand's server with GPT-6 Astra driving a real image editor.
---

## When to use it

Use Layerhand when you have an existing photograph to retouch and the user wants
an editable, layered PSD back rather than a flat image. It creates real layers,
masks, and adjustment layers that remain editable in Photoshop or Photopea.

Do not use Layerhand for generating new images from scratch or text prompts.

## Before you start

`OPENAI_API_KEY` must be set in the environment of the MCP server. Each run
spends the user's own OpenAI API credit.

A run drives a real image editor through repeated steps and can take up to
fifteen minutes to complete.

## The loop

1.  Call `start_run` with the image path and the instruction in the user's
    words.
2.  Give the user the `watch_url` so they can watch live.
3.  Call `wait_run` repeatedly while `done` is false, and after each call tell
    the user the step count and the narration in one short sentence.
4.  If the user asks for a change while the run is going, call `steer_run` with
    their words.
5.  When `done` is true, call `get_result`.
6.  Report the PSD and preview paths and list the layer names.

## Rules

- Never pass an API key as a tool argument.
- Do not open `frame_path` unless the user asks to see progress.
- A cancelled or incomplete run still has a result, so call `get_result`.
- If a tool returns an error, tell the user the message as it is.
