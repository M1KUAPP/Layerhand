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

function button(text: string, className = 'button'): HTMLButtonElement {
  const result = node('button', className, text)
  result.type = 'button'
  return result
}

export function renderWaitlist(context: LandingContext): HTMLElement {
  const section = node('section', 'waitlist')
  section.setAttribute('aria-labelledby', 'waitlist-title')
  const title = node('h2', undefined, 'See the launch result')
  title.id = 'waitlist-title'
  section.append(title, node('p', 'lede', 'Join the short list for the public release and final demo.'))

  const form = node('form', 'inline-form')
  form.dataset.form = 'waitlist'
  const label = node('label', 'sr-only', 'Email address')
  label.htmlFor = 'waitlist-email'
  const email = node('input')
  email.id = 'waitlist-email'
  email.name = 'email'
  email.type = 'email'
  email.autocomplete = 'email'
  email.placeholder = 'you@example.com'
  email.required = true
  const submit = button('Join waitlist', 'button button-dark')
  submit.type = 'submit'
  const status = node('p', 'form-status')
  status.setAttribute('role', 'status')
  form.append(label, email, submit, status)
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    submit.disabled = true
    status.textContent = 'Saving your place...'
    try {
      const result = await context.joinWaitlist(email.value)
      status.textContent = result.created ? 'You are on the list.' : 'That address is already on the list.'
      if (result.created) email.value = ''
    } catch (error) {
      status.textContent = context.publicMessage(error)
    } finally {
      submit.disabled = false
    }
  })
  section.append(form)
  return section
}
