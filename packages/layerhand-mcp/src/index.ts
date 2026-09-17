import { resolve } from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { createTools } from './tools'
import { VERSION } from './version'

const DEFAULT_BASE_URL = 'https://layerhand-732371853772.us-central1.run.app'

// Read once from the environment, never from tool arguments, so the key never
// passes through the model's context.
const tools = createTools({
  apiKey: process.env.OPENAI_API_KEY,
  baseUrl: process.env.LAYERHAND_URL ?? DEFAULT_BASE_URL,
  outputDir: resolve(process.env.LAYERHAND_OUTPUT_DIR ?? 'layerhand')
})

const server = new McpServer({ name: 'layerhand-mcp', version: VERSION })

const handle = z.string().describe('The handle that start_run returned.')

server.registerTool(
  'start_run',
  {
    description:
      'Start a Layerhand run on an image: the instruction is carried out in a real image editor ' +
      'and the run returns a layered PSD. Requires OPENAI_API_KEY in the environment.',
    inputSchema: {
      image_path: z.string().describe('Path to the JPEG or PNG image to retouch.'),
      instruction: z.string().min(1).max(500).describe('What to change, in plain words.')
    }
  },
  (input) => tools.start_run(input)
)

server.registerTool(
  'wait_run',
  {
    description: 'Follow a run, polling until it ends or the wait is up. Returns its status and the latest frame.',
    inputSchema: {
      handle,
      wait_seconds: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('How long to keep polling before returning, at most 50 seconds; 45 when left out.')
    }
  },
  (input) => tools.wait_run(input)
)

server.registerTool(
  'steer_run',
  {
    description: 'Send a correction to a run that is still going.',
    inputSchema: {
      handle,
      text: z.string().min(1).max(500).describe('The correction, in plain words.')
    }
  },
  (input) => tools.steer_run(input)
)

server.registerTool(
  'cancel_run',
  {
    description: 'Stop a run. It still exports the file made so far, which get_result downloads.',
    inputSchema: { handle }
  },
  (input) => tools.cancel_run(input)
)

server.registerTool(
  'get_result',
  {
    description:
      "Download a finished run's layered PSD and preview image to disk. Call only after wait_run says the run is done.",
    inputSchema: {
      handle,
      output_dir: z.string().optional().describe('Where to write the files; LAYERHAND_OUTPUT_DIR when left out.')
    }
  },
  (input) => tools.get_result(input)
)

await server.connect(new StdioServerTransport())
