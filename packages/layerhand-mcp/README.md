# layerhand-mcp

Layerhand is an agent that retouches a photograph inside a real image editor and
returns a layered PSD. The loop, the editor, and the model run on Layerhand's
server, with GPT-6 Astra driving the editor.

## Install in Claude Code

```sh
claude plugin marketplace add https://layerhand-732371853772.us-central1.run.app/plugins/marketplace.json && claude plugin install layerhand@layerhand
```

## Install in Codex

```sh
codex mcp add layerhand --env OPENAI_API_KEY="$OPENAI_API_KEY" -- npx -y layerhand-mcp
```

## Configuration

Read from the environment, never from tool arguments, so a key never passes
through the model's context:

| Variable               | Default                                              |
| ---------------------- | ---------------------------------------------------- |
| `OPENAI_API_KEY`       | None. `start_run` fails with a stated message        |
| `LAYERHAND_URL`        | `https://layerhand-732371853772.us-central1.run.app` |
| `LAYERHAND_OUTPUT_DIR` | `layerhand` under the working directory              |

## Tools

- `start_run`: starts a retouching run with an image path and instruction.
- `wait_run`: polls for run progress or completion and returns current status.
- `steer_run`: sends a mid-run correction to steer the ongoing edit.
- `cancel_run`: cancels an active run while preserving partial progress.
- `get_result`: downloads the layered PSD and preview PNG for a finished run.

## Cost

Runs use your own OpenAI API key and are billed directly by OpenAI. Layerhand
caps each run's steps and spend to prevent runaway costs.

## Privacy

The image is uploaded to Layerhand to perform the retouching run. It is deleted
when the run ends, and every file is gone within a day.
