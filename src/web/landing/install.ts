function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag)
  if (className) result.className = className
  if (text !== undefined) result.textContent = text
  return result
}

export function renderInstall(): HTMLElement {
  const root = node('div', 'install')

  const section = node('section', 'install__section')
  section.setAttribute('data-section', 'install')
  section.setAttribute('aria-labelledby', 'install-title')

  const title = node('h2', 'install__title', 'Run it from your agent')
  title.id = 'install-title'
  section.append(title)

  section.append(
    node(
      'p',
      'install__note',
      'Paste a setup prompt into Codex, Claude Code, or another MCP host. Bring your own OpenAI key. The run happens on Layerhand, with GPT-6 Astra driving the editor.'
    )
  )
  const link = node('a', 'install__cta', 'Open the MCP page')
  link.href = '/mcp'
  section.append(link)
  root.append(section)

  return root
}
