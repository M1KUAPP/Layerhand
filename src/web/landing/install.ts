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

function icon(name: string): HTMLElement {
  const i = document.createElement('i')
  i.className = `hgi-stroke hgi-${name}`
  i.setAttribute('aria-hidden', 'true')
  return i
}

const COPIED_MS = 2000

export function renderInstall(): HTMLElement {
  const root = node('div', 'install')

  const section = node('section', 'install__section')
  section.setAttribute('data-section', 'install')
  section.setAttribute('aria-labelledby', 'install-title')

  const title = node('h2', 'install__title', 'Run it from your agent')
  title.id = 'install-title'
  section.append(title)

  const commands = node('div', 'install__commands')
  for (const { host, command } of [
    {
      host: 'Claude Code',
      command: `claude plugin marketplace add ${location.origin}/plugins/marketplace.json && claude plugin install layerhand@layerhand`
    },
    {
      host: 'Codex',
      command: 'codex mcp add layerhand --env OPENAI_API_KEY="$OPENAI_API_KEY" -- npx -y layerhand-mcp'
    }
  ]) {
    const block = node('div', 'install__command')
    block.append(node('p', 'install__label', host))

    const row = node('div', 'install__row')
    const pre = node('pre', 'install__pre')
    const code = node('code', undefined, command)
    pre.append(code)

    const copy = node('button', 'install__copy')
    copy.type = 'button'
    copy.setAttribute('aria-label', `Copy the ${host} command`)
    const copyText = node('span', undefined, 'Copy')
    const copyIcon = icon('copy-01')
    copy.append(copyText, copyIcon)

    let revert: number | undefined
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(command)
        window.clearTimeout(revert)
        copyText.textContent = 'Copied'
        copyIcon.className = 'hgi-stroke hgi-checkmark-circle-02'
        revert = window.setTimeout(() => {
          copyText.textContent = 'Copy'
          copyIcon.className = 'hgi-stroke hgi-copy-01'
        }, COPIED_MS)
      } catch {
        // With no clipboard — an insecure context or a denied permission —
        // select the command so it can still be copied by hand.
        const selection = window.getSelection()
        if (!selection) return
        const range = document.createRange()
        range.selectNodeContents(code)
        selection.removeAllRanges()
        selection.addRange(range)
      }
    })

    row.append(pre, copy)
    block.append(row)
    commands.append(block)
  }
  section.append(commands)

  section.append(
    node(
      'p',
      'install__note',
      'Bring your own OpenAI key. The run happens on Layerhand, with GPT-6 Astra driving the editor.'
    )
  )
  root.append(section)

  return root
}
