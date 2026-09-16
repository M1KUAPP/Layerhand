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
  copy.append(eyebrow)

  const title = node('h2', 'waitlist__title', 'Get the launch recording.')
  title.id = 'waitlist-title'
  copy.append(title)

  const body = node(
    'p',
    'waitlist__body',
    'Leave an email address and we will send the thirty-second demo when it is out, then the occasional update. You do not need this to use Layerhand, which is open now with three free runs.'
  )
  copy.append(body)

  section.append(copy)

  const form = node('form', 'waitlist__form')
  form.dataset.form = 'waitlist'

  const label = node('label', 'waitlist__label', 'Email address')
  label.htmlFor = 'waitlist-email'
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
  row.append(email)

  const submit = node('button', 'waitlist__submit')
  submit.type = 'submit'
  submit.append(document.createTextNode('Email me the recording'), icon('mail-send-01'))
  row.append(submit)

  form.append(row)

  const status = node('p', 'waitlist__status')
  status.setAttribute('role', 'status')

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
    if (spinner) spinner.classList.add('waitlist__spinner')
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
      // A rejected address keeps the server's reason, so a typo is not
      // retried as typed. Anything else says what happened and what to do.
      const code = typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined
      statusText.textContent =
        code === 'invalid_email' ? context.publicMessage(error) : 'Your address was not saved. Try again in a moment.'
    } finally {
      submit.disabled = false
    }
  })

  section.append(form)
  root.append(section)

  return root
}
