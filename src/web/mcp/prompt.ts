const DEFAULT_ORIGIN = 'https://layerhand-732371853772.us-central1.run.app'

export function mcpOrigin(origin?: string): string {
  return origin?.replace(/\/$/, '') || DEFAULT_ORIGIN
}

export function mcpSetupPrompt(origin?: string): string {
  const host = mcpOrigin(origin)
  return `Set up Layerhand as an MCP server in this session.

Layerhand retouches a photograph inside a real image editor and returns a layered PSD. The loop, the editor, and GPT-6 Astra run on Layerhand's servers. The user brings their own OpenAI API key.

Hosted files on ${host}:
- MCP package: ${host}/plugins/layerhand-mcp.tgz
- Claude plugin zip: ${host}/plugins/layerhand.zip
- Claude marketplace: ${host}/plugins/marketplace.json
- stdio binary: ${host}/plugins/layerhand-mcp.js

Do this:
1. Download the MCP package from ${host}/plugins/layerhand-mcp.tgz
2. Configure the MCP server for this host using one of:
   Codex: codex mcp add layerhand --env OPENAI_API_KEY="$OPENAI_API_KEY" -- npx -y ${host}/plugins/layerhand-mcp.tgz
   Claude Code: claude plugin marketplace add ${host}/plugins/marketplace.json && claude plugin install layerhand@layerhand
   Other stdio hosts: download ${host}/plugins/layerhand-mcp.js and run it with node, with OPENAI_API_KEY set. LAYERHAND_URL defaults to ${host}.
3. Confirm the tools start_run, wait_run, steer_run, cancel_run, and get_result are available.
4. Ask the user for a JPEG or PNG and a short instruction, then call start_run.

Never put the API key in a tool argument. Read it from the environment.`
}

export function mcpCodexManual(origin?: string): string {
  const host = mcpOrigin(origin)
  return `codex mcp add layerhand --env OPENAI_API_KEY="$OPENAI_API_KEY" -- npx -y ${host}/plugins/layerhand-mcp.tgz`
}

export function mcpClaudeManual(origin?: string): string {
  const host = mcpOrigin(origin)
  return `claude plugin marketplace add ${host}/plugins/marketplace.json && claude plugin install layerhand@layerhand`
}

export function mcpOtherManual(origin?: string): string {
  const host = mcpOrigin(origin)
  return `curl -L ${host}/plugins/layerhand-mcp.js -o layerhand-mcp.js
# Then register a stdio MCP server that runs:
# node layerhand-mcp.js
# with OPENAI_API_KEY in the environment. LAYERHAND_URL defaults to ${host}.`
}
