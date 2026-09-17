export const mcpCopyScript = `const button = document.querySelector('[data-copy-prompt]')
const prompt = document.getElementById('setup-prompt')
button?.addEventListener('click', async () => {
  if (!prompt?.textContent) return
  try {
    await navigator.clipboard.writeText(prompt.textContent)
    button.textContent = 'Copied'
  } catch {
    prompt.focus()
  }
})
`
