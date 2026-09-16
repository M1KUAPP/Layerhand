import type { LandingContext } from './index'

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

export function renderWaitlist(context: LandingContext): HTMLElement {
  const root = node('div', 'waitlist')

  const section = node('section', 'waitlist__section')
  section.id = 'updates'
  section.setAttribute('data-section', 'waitlist')
  section.setAttribute('aria-labelledby', 'waitlist-title')

  const copy = node('div', 'waitlist__copy')

  const eyebrow = node('p', 'waitlist__eyebrow', 'Launch updates')
  eyebrow.style.cssText =
    'font: var(--text-ui-eyebrow); letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-text-tertiary);'
  copy.append(eyebrow)

  const title = node('h2', 'waitlist__title', 'Get the launch recording.')
  title.id = 'waitlist-title'
  title.style.cssText = 'font: var(--text-display-h2); color: var(--ink);'
  copy.append(title)

  const body = node(
    'p',
    'waitlist__body',
    'Leave an email address and we will send the thirty-second demo when it is out, then the occasional update. You do not need this to use Layerhand, which is open now with three free runs.'
  )
  body.style.cssText = 'font: var(--text-ui-lede); color: var(--color-text-secondary); margin-top: 1rem;'
  copy.append(body)

  section.append(copy)

  const form = node('form', 'waitlist__form')
  form.dataset.form = 'waitlist'

  const label = node('label', 'waitlist__label', 'Email address')
  label.htmlFor = 'waitlist-email'
  label.style.cssText = 'font: var(--text-ui-label); color: var(--ink); display: block; margin-bottom: 0.5rem;'
  form.append(label)

  const row = node('div', 'waitlist__row')

  const email = node('input')
  email.id = 'waitlist-email'
  email.className = 'waitlist__input'
  email.type = 'email'
  email.name = 'email'
  email.autocomplete = 'email'
  email.placeholder = 'you@example.com'
  email.required = true
  email.style.cssText =
    'font: var(--text-ui-body); color: var(--ink); background: var(--paper); border: 1px solid var(--color-border-strong); padding: 0 1rem; height: 48px; box-sizing: border-box; flex: 1;'
  row.append(email)

  const submit = node('button', 'waitlist__submit')
  submit.type = 'submit'
  submit.style.cssText =
    'font: var(--text-ui-label); color: var(--paper); background: var(--color-bg-inverse); border: none; padding: 0 1.5rem; height: 48px; display: flex; align-items: center; gap: 0.5rem; white-space: nowrap;'
  submit.append(document.createTextNode('Email me the recording'), icon('mail-send-01'))
  row.append(submit)

  form.append(row)

  const status = node('p', 'waitlist__status')
  status.setAttribute('role', 'status')
  status.style.cssText =
    'font: var(--text-ui-small); color: var(--color-text-secondary); min-height: 1.4rem; padding-top: 0.55rem; display: flex; align-items: center; gap: 0.4rem;'

  const statusIcon = node('span', 'waitlist__status-icon')
  status.append(statusIcon)

  const statusText = node('span', 'waitlist__status-text')
  status.append(statusText)

  form.append(status)

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    submit.disabled = true
    statusText.textContent = 'Saving your address…'
    statusIcon.replaceChildren()
    statusIcon.append(icon('loading-03'))
    const spinner = statusIcon.querySelector('i')
    if (spinner) spinner.style.cssText = 'display: inline-block; animation: spin 1s linear infinite;'
    try {
      const result = await context.joinWaitlist(email.value)
      if (result.created) {
        statusIcon.replaceChildren()
        statusIcon.append(icon('checkmark-circle-02'))
        statusText.textContent = 'Thanks. The recording will come to that address.'
        email.value = ''
      } else {
        statusIcon.replaceChildren()
        statusIcon.append(icon('checkmark-circle-02'))
        statusText.textContent = 'That address is already signed up.'
      }
    } catch (error) {
      statusIcon.replaceChildren()
      statusIcon.append(icon('alert-circle'))
      statusText.textContent = context.publicMessage(error)
    } finally {
      submit.disabled = false
    }
  })

  section.append(form)
  root.append(section)

  const footer = node('footer', 'waitlist__footer')
  footer.setAttribute('data-section', 'footer')
  footer.style.cssText =
    'border-top: 1px solid var(--ink); padding: 2rem clamp(2.2rem, 5vw, 5.6rem); display: flex; flex-wrap: wrap; align-items: center; gap: 1rem;'

  const wordmark = node('p', 'waitlist__wordmark', 'Layerhand')
  wordmark.style.cssText = 'font: var(--text-ui-label); color: var(--ink);'
  footer.append(wordmark)

  const credit1 = node('p', 'waitlist__credit', 'Built on GPT-6 Astra for the ')
  credit1.style.cssText = 'font: var(--text-ui-small); color: var(--color-text-secondary);'
  const link1 = node('a', 'waitlist__link', 'GPT-6 Astra Challenge')
  link1.href = 'https://www.producthunt.com/contests/gpt-6-astra-challenge'
  link1.style.cssText = 'color: inherit; text-decoration: underline;'
  credit1.append(link1)
  credit1.append(document.createTextNode('.'))
  footer.append(credit1)

  const credit2 = node('p', 'waitlist__credit', 'Layerhand drives ')
  credit2.style.cssText = 'font: var(--text-ui-small); color: var(--color-text-secondary);'
  const link2a = node('a', 'waitlist__link', 'Photopea')
  link2a.href = 'https://www.photopea.com/'
  link2a.style.cssText = 'color: inherit; text-decoration: underline;'
  credit2.append(link2a)
  credit2.append(', a web image editor, and is not affiliated with it.')
  footer.append(credit2)

  const source = node('a', 'waitlist__source', '')
  source.href = 'https://github.com/M1KUAPP/astra'
  source.style.cssText =
    'font: var(--text-ui-label); color: var(--ink); text-decoration: underline; margin-left: auto; display: flex; align-items: center; gap: 0.4rem;'
  source.append(icon('github'), document.createTextNode('Source on GitHub'))
  footer.append(source)

  root.append(footer)

  const style = document.createElement('style')
  style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`
  root.prepend(style)

  return root
}
