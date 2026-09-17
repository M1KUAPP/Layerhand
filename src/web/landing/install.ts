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

  // The commands need layerhand-mcp on npm and one real Astra run on each
  // host (#136). Until then the section stays, and says it is coming.
  section.append(
    node(
      'p',
      'install__note',
      'Coming soon. Bring your own OpenAI key. The run happens on Layerhand, with GPT-6 Astra driving the editor.'
    )
  )
  root.append(section)

  return root
}
