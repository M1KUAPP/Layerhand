import { mcpClaudeManual, mcpCodexManual, mcpOtherManual, mcpSetupPrompt } from './prompt'

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function mcpPageHtml(origin: string): string {
  const prompt = escapeHtml(mcpSetupPrompt(origin))
  const codex = escapeHtml(mcpCodexManual(origin))
  const claude = escapeHtml(mcpClaudeManual(origin))
  const other = escapeHtml(mcpOtherManual(origin))
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta
      name="description"
      content="Install Layerhand as an MCP server in Codex, Claude Code, and other agents."
    />
    <title>Layerhand MCP</title>
    <link rel="icon" href="/favicon.ico" />
    <link rel="stylesheet" href="https://use.hugeicons.com/font/icons.css" />
    <link rel="stylesheet" href="/mcp.css" />
  </head>
  <body class="mcp">
    <header class="site-header">
      <a class="wordmark" href="/" aria-label="Return to Layerhand">
        <span class="wordmark__mark" aria-hidden="true">L</span>
        Layerhand
      </a>
      <nav class="site-nav" aria-label="Primary">
        <ul class="site-nav__links">
          <li class="site-nav__item">
            <a class="site-nav__link" href="/#how-it-works">How it works</a>
          </li>
          <li class="site-nav__item">
            <a class="site-nav__link" href="/mcp">MCP</a>
          </li>
          <li class="site-nav__item">
            <a class="site-nav__link" href="/#updates">Updates</a>
          </li>
        </ul>
        <a class="site-nav__cta" href="/">Try it free<i class="hgi-stroke hgi-arrow-right-01" aria-hidden="true"></i></a>
      </nav>
    </header>
    <section class="input-grid" aria-labelledby="input-title">
      <div class="input-intro">
        <p class="eyebrow">From your agent</p>
        <h1 id="input-title">Run it from your agent</h1>
        <p class="lede">
          Paste this into Codex, Claude Code, or any agent that can install an MCP
          server. The run happens on Layerhand, with GPT-6 Astra driving the editor.
          Bring your own OpenAI key.
        </p>
      </div>
      <div class="workbench-board">
        <div class="workbench-card">
          <section class="mcp__prompt" aria-labelledby="prompt-title">
            <div class="mcp__prompt-bar">
              <h2 id="prompt-title" class="mcp__prompt-title">Setup prompt</h2>
              <button type="button" class="mcp__copy" data-copy-prompt>Copy</button>
            </div>
            <pre id="setup-prompt" tabindex="0">${prompt}</pre>
          </section>
          <section class="mcp__manuals" aria-labelledby="manuals-title">
            <h2 id="manuals-title" class="mcp__manuals-title">Manual install</h2>
            <p class="mcp__manuals-note">
              Use these if you would rather type the commands yourself. They stay
              collapsed so the prompt stays first.
            </p>
            <details data-platform="codex">
              <summary>Codex</summary>
              <pre>${codex}</pre>
            </details>
            <details data-platform="claude-code">
              <summary>Claude Code</summary>
              <pre>${claude}</pre>
            </details>
            <details data-platform="other">
              <summary>Other MCP hosts</summary>
              <pre>${other}</pre>
            </details>
          </section>
        </div>
      </div>
    </section>
    <script src="/mcp.js"></script>
  </body>
</html>
`
}
