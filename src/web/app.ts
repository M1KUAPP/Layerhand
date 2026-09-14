import samplePhotoUrl from './assets/sample-photo.png'
import { RunApi, RunApiError } from './api'
import { formatCredits, initialClientState, reduceClientState, type ClientAction, type ClientState } from './state'

const RUN_STORAGE_KEY = 'layerhand.runId'
const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const EXAMPLES = [
  'Remove the background and keep the product shadow.',
  'Clean the reflections without changing the label.',
  'Warm the highlights and keep the background neutral.'
]

const applicationRoot = document.querySelector<HTMLElement>('#app')
if (!applicationRoot) throw new Error('Layerhand application root is missing')
const root: HTMLElement = applicationRoot

const api = new RunApi()
let state = initialClientState()
let selectedFile: File | undefined
let selectedPreviewUrl: string | undefined
let fileError: string | undefined
let formError: string | undefined
let stream: { close(): void } | undefined
let reconnecting = false

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

function brandHeader(trailingAction?: HTMLButtonElement): HTMLElement {
  const header = node('header', 'site-header')
  const brand = node('button', 'wordmark', 'Layerhand')
  brand.type = 'button'
  brand.setAttribute('aria-label', 'Return to Layerhand')
  brand.addEventListener('click', () => dispatch({ type: 'reset' }))
  header.append(brand)
  if (trailingAction) header.append(trailingAction)
  return header
}

function dispatch(action: ClientAction): void {
  state = reduceClientState(state, action)
  render()
  if (state.view !== 'running') {
    stream?.close()
    stream = undefined
  }
}

function description(text: string): HTMLParagraphElement {
  return node('p', 'lede', text)
}

function eyebrow(text: string): HTMLParagraphElement {
  return node('p', 'eyebrow', text)
}

function renderLanding(): DocumentFragment {
  const fragment = document.createDocumentFragment()
  fragment.append(brandHeader())

  const hero = node('section', 'landing-grid')
  hero.setAttribute('aria-labelledby', 'landing-title')
  const copy = node('div', 'landing-copy')
  copy.append(eyebrow('A photographic agent inside a real editor'))
  const title = node('h1', undefined, 'Retouch. Keep the layers.')
  title.id = 'landing-title'
  copy.append(title)
  copy.append(description('Layerhand works visibly in Photopea and returns an editable, human-layered PSD.'))
  const start = button('Retouch a photo', 'button button-accent')
  start.addEventListener('click', () => dispatch({ type: 'edit' }))
  copy.append(start)

  const media = node('div', 'landing-media')
  const wedge = node('div', 'wedge')
  wedge.setAttribute('aria-hidden', 'true')
  const video = node('video', 'demo-video')
  video.autoplay = true
  video.muted = true
  video.loop = true
  video.playsInline = true
  video.poster = samplePhotoUrl
  video.setAttribute('aria-label', 'Layerhand retouching demonstration placeholder')
  media.append(video, wedge)
  hero.append(copy, media)
  fragment.append(hero, waitlistSection())
  return fragment
}

function waitlistSection(): HTMLElement {
  const section = node('section', 'waitlist')
  section.setAttribute('aria-labelledby', 'waitlist-title')
  const title = node('h2', undefined, 'See the launch result')
  title.id = 'waitlist-title'
  section.append(title, description('Join the short list for the public release and final demo.'))

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
      const result = await api.joinWaitlist(email.value)
      status.textContent = result.created ? 'You are on the list.' : 'That address is already on the list.'
      if (result.created) email.value = ''
    } catch (error) {
      status.textContent = publicMessage(error)
    } finally {
      submit.disabled = false
    }
  })
  section.append(form)
  return section
}

function validateFile(file: File): string | undefined {
  const lowerName = file.name.toLowerCase()
  const supportedName = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png')
  const supportedType = file.type === 'image/jpeg' || file.type === 'image/png'
  if (!supportedName || !supportedType) return 'Choose a JPEG or PNG image.'
  if (file.size > MAX_IMAGE_BYTES) return 'The upload exceeds the 20 MB limit.'
  return undefined
}

function chooseFile(file: File): void {
  fileError = validateFile(file)
  if (fileError) {
    selectedFile = undefined
    releaseSelectedPreview()
  } else {
    selectedFile = file
    releaseSelectedPreview()
    selectedPreviewUrl = URL.createObjectURL(file)
  }
  render()
}

function releaseSelectedPreview(): void {
  if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl)
  selectedPreviewUrl = undefined
}

async function chooseSample(): Promise<void> {
  const response = await fetch(samplePhotoUrl)
  if (!response.ok) throw new Error('The sample photograph could not be loaded.')
  const blob = await response.blob()
  chooseFile(new File([blob], 'layerhand-sample.png', { type: 'image/png' }))
}

function renderInput(): DocumentFragment {
  const fragment = document.createDocumentFragment()
  const back = button('Back', 'text-button')
  back.addEventListener('click', () => dispatch({ type: 'reset' }))
  fragment.append(brandHeader(back))

  const section = node('section', 'input-grid')
  section.setAttribute('aria-labelledby', 'input-title')
  const intro = node('div', 'input-intro')
  intro.append(eyebrow('New layered retouch'))
  const title = node('h1', undefined, 'Give the agent one clear direction.')
  title.id = 'input-title'
  intro.append(title, description('JPEG or PNG, up to 20 MB. The result remains editable.'))

  const form = node('form', 'run-form')
  form.noValidate = true
  const fileField = node('fieldset', 'file-field')
  const legend = node('legend', undefined, 'Source photograph')
  const dropZone = node('label', 'drop-zone')
  dropZone.htmlFor = 'source-image'
  dropZone.tabIndex = 0
  const input = node('input', 'file-input')
  input.id = 'source-image'
  input.name = 'image'
  input.type = 'file'
  input.accept = 'image/jpeg,image/png,.jpg,.jpeg,.png'
  input.required = true
  const prompt = node(
    'span',
    'drop-prompt',
    selectedFile ? selectedFile.name : 'Drop a photograph here, or choose a file'
  )
  dropZone.append(input, prompt)
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault()
    dropZone.dataset.dragging = 'true'
  })
  dropZone.addEventListener('dragleave', () => delete dropZone.dataset.dragging)
  dropZone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      input.click()
    }
  })
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault()
    delete dropZone.dataset.dragging
    const file = event.dataTransfer?.files[0]
    if (file) chooseFile(file)
  })
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (file) chooseFile(file)
  })
  const fileStatus = node('p', 'field-error', fileError)
  fileStatus.id = 'source-image-error'
  input.setAttribute('aria-describedby', fileStatus.id)
  fileField.append(legend, dropZone, fileStatus)

  const sample = button('Use the sample photograph', 'text-button sample-button')
  sample.dataset.action = 'sample'
  sample.addEventListener('click', async () => {
    sample.disabled = true
    try {
      await chooseSample()
    } catch (error) {
      fileError = publicMessage(error)
      render()
    }
  })
  fileField.append(sample)
  if (selectedPreviewUrl) {
    const preview = node('img', 'selected-preview')
    preview.src = selectedPreviewUrl
    preview.alt = `Selected source: ${selectedFile?.name ?? 'photograph'}`
    fileField.append(preview)
  }

  const instructionLabel = node('label', 'field-label', 'Retouching instruction')
  instructionLabel.htmlFor = 'instruction'
  const instruction = node('textarea')
  instruction.id = 'instruction'
  instruction.name = 'instruction'
  instruction.maxLength = 500
  instruction.rows = 4
  instruction.required = true
  instruction.placeholder = 'Describe the finished photograph and what must stay unchanged.'
  const examples = node('div', 'examples')
  for (const example of EXAMPLES) {
    const exampleButton = button(example, 'example-button')
    exampleButton.addEventListener('click', () => {
      instruction.value = example
      instruction.focus()
    })
    examples.append(exampleButton)
  }

  const keyLabel = node('label', 'field-label', 'OpenAI API key (optional)')
  keyLabel.htmlFor = 'api-key'
  const keyInput = node('input')
  keyInput.id = 'api-key'
  keyInput.name = 'apiKey'
  keyInput.type = 'password'
  keyInput.autocomplete = 'off'
  keyInput.spellcheck = false
  keyInput.placeholder = 'Use your own key after the free allowance'

  const error = node('p', 'form-error', formError)
  error.setAttribute('role', 'alert')
  const submit = button('Start retouching', 'button button-accent')
  submit.type = 'submit'
  form.append(
    fileField,
    instructionLabel,
    instruction,
    node('p', 'field-hint', 'Try a precise direction'),
    examples,
    keyLabel,
    keyInput,
    error,
    submit
  )
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    formError = undefined
    if (!selectedFile) {
      fileError = 'Choose a JPEG or PNG image.'
      render()
      return
    }
    if (!instruction.value.trim()) {
      formError = 'Enter a retouching instruction.'
      render()
      return
    }
    submit.disabled = true
    root.ariaBusy = 'true'
    try {
      const body = new FormData()
      body.set('image', selectedFile, selectedFile.name)
      body.set('filename', selectedFile.name)
      body.set('instruction', instruction.value.trim())
      if (keyInput.value) body.set('apiKey', keyInput.value)
      const started = await api.start(body)
      keyInput.value = ''
      selectedFile = undefined
      releaseSelectedPreview()
      sessionStorage.setItem(RUN_STORAGE_KEY, started.runId)
      dispatch({ type: 'started', runId: started.runId })
      followRun(started.runId)
    } catch (error) {
      formError = publicMessage(error)
      render()
    } finally {
      root.ariaBusy = 'false'
    }
  })
  section.append(intro, form)
  fragment.append(section)
  return fragment
}

function progressRail(progress: Extract<ClientState, { view: 'running' }>['progress']): HTMLElement {
  const rail = node('aside', 'progress-rail', 'Run status')
  const metrics = node('dl')
  const entries = [
    ['step', 'Step', `${progress.steps} / ${progress.cap ?? '?'}`],
    ['credits', 'Credits', formatCredits(progress.costUsd)],
    ['action', 'Action', progress.narration ?? 'Opening the editor']
  ]
  for (const [id, term, detail] of entries) {
    const value = node('dd', undefined, detail)
    value.id = `run-${id}`
    metrics.append(node('dt', undefined, term), value)
  }
  rail.replaceChildren(metrics)
  return rail
}

function replaceNotices(container: HTMLElement, progress: Extract<ClientState, { view: 'running' }>['progress']): void {
  container.replaceChildren()
  for (const message of progress.recoverableErrors) container.append(node('p', 'notice', message))
  for (const message of progress.corrections) {
    container.append(node('p', 'correction-ack', `Correction applied: ${message}`))
  }
}

function renderRunning(current: Extract<ClientState, { view: 'running' }>): DocumentFragment {
  const fragment = document.createDocumentFragment()
  const cancel = button(current.progress.cancelRequested ? 'Cancelling...' : 'Cancel and keep work', 'text-button')
  cancel.id = 'cancel-run'
  cancel.disabled = current.progress.cancelRequested
  cancel.addEventListener('click', async () => {
    dispatch({ type: 'cancel_requested' })
    try {
      await api.cancel(current.progress.runId)
    } catch (error) {
      dispatch({ type: 'connection_failed', message: publicMessage(error) })
    }
  })
  fragment.append(brandHeader(cancel))

  const layout = node('section', 'running-layout')
  layout.setAttribute('aria-label', 'Retouching in progress')
  const frame = node('figure', 'live-frame')
  frame.id = 'live-frame'
  if (current.progress.frameUrl) {
    const image = node('img')
    image.src = current.progress.frameUrl
    image.alt = 'Current editor frame'
    frame.append(image)
  } else {
    frame.append(node('p', 'frame-placeholder', 'Opening the editor...'))
  }
  layout.append(frame, progressRail(current.progress))

  const correction = node('form', 'correction-form')
  correction.dataset.form = 'correction'
  const label = node('label', 'field-label', 'Correct the next action')
  label.htmlFor = 'correction'
  const field = node('input')
  field.id = 'correction'
  field.name = 'correction'
  field.maxLength = 500
  field.placeholder = 'Keep the label unchanged'
  const send = button('Send correction', 'button button-dark')
  send.type = 'submit'
  correction.append(label, field, send)
  correction.addEventListener('submit', async (event) => {
    event.preventDefault()
    const text = field.value.trim()
    if (!text) return
    send.disabled = true
    try {
      await api.steer(current.progress.runId, text)
      field.value = ''
    } catch (error) {
      dispatch({ type: 'connection_failed', message: publicMessage(error) })
    } finally {
      send.disabled = false
    }
  })

  const notices = node('div', 'run-notices')
  notices.id = 'run-notices'
  replaceNotices(notices, current.progress)
  fragment.append(layout, correction, notices)
  return fragment
}

function updateRunning(current: Extract<ClientState, { view: 'running' }>): void {
  const step = root.querySelector<HTMLElement>('#run-step')
  const credits = root.querySelector<HTMLElement>('#run-credits')
  const action = root.querySelector<HTMLElement>('#run-action')
  const cancel = root.querySelector<HTMLButtonElement>('#cancel-run')
  const frame = root.querySelector<HTMLElement>('#live-frame')
  const notices = root.querySelector<HTMLElement>('#run-notices')
  if (!step || !credits || !action || !cancel || !frame || !notices) return

  step.textContent = `${current.progress.steps} / ${current.progress.cap ?? '?'}`
  credits.textContent = formatCredits(current.progress.costUsd)
  action.textContent = current.progress.narration ?? 'Opening the editor'
  cancel.textContent = current.progress.cancelRequested ? 'Cancelling...' : 'Cancel and keep work'
  cancel.disabled = current.progress.cancelRequested

  if (current.progress.frameUrl) {
    let image = frame.querySelector('img')
    if (!image) {
      image = node('img')
      image.alt = 'Current editor frame'
      frame.replaceChildren(image)
    }
    if (image.src !== current.progress.frameUrl) image.src = current.progress.frameUrl
  }
  replaceNotices(notices, current.progress)
}

function renderResult(current: Extract<ClientState, { view: 'result' }>): DocumentFragment {
  const fragment = document.createDocumentFragment()
  const another = button('Retouch another', 'text-button')
  another.addEventListener('click', () => dispatch({ type: 'edit' }))
  fragment.append(brandHeader(another))

  const section = node('section', 'result-layout')
  section.setAttribute('aria-labelledby', 'result-title')
  const copy = node('div', 'result-copy')
  const titleText =
    current.outcome === 'complete' ? 'Your layered file is ready.' : 'Your partial layered file is ready.'
  const title = node('h1', undefined, titleText)
  title.id = 'result-title'
  const outcome =
    current.outcome === 'complete'
      ? 'The requested retouch completed.'
      : current.outcome === 'cancelled'
        ? 'You cancelled the run. Layerhand kept the work completed so far.'
        : 'The step cap was reached. Layerhand kept the work completed so far.'
  copy.append(eyebrow('Retouch result'), title, description(outcome))

  const image = node('img')
  image.className = 'result-preview'
  image.src = current.result.previewUrl
  image.alt = 'Flattened preview of the retouched photograph'

  const layers = node('section')
  layers.className = 'layer-list'
  const layersTitle = node('h2', undefined, 'Layers in the PSD')
  const list = node('ol')
  for (const layer of current.result.layers) {
    const item = node('li')
    item.append(node('strong', undefined, layer.name), node('span', undefined, layer.kind))
    list.append(item)
  }
  layers.append(layersTitle, list)

  const download = node('a', 'button button-accent', 'Download layered PSD')
  download.href = current.result.psdUrl
  download.download = 'layerhand-result.psd'
  copy.append(download)
  section.append(image, copy, layers)
  fragment.append(section)
  return fragment
}

function renderError(current: Extract<ClientState, { view: 'error' }>): DocumentFragment {
  const fragment = document.createDocumentFragment()
  fragment.append(brandHeader())
  const section = node('section', 'error-state')
  section.append(
    eyebrow('Run interrupted'),
    node('h1', undefined, 'The workbench needs another try.'),
    description(current.message)
  )
  const action = button(current.runId ? 'Reconnect to run' : 'Choose another photograph', 'button button-accent')
  action.addEventListener('click', () => {
    if (current.runId) void restoreRun(current.runId)
    else dispatch({ type: 'edit' })
  })
  section.append(action)
  fragment.append(section)
  return fragment
}

function render(): void {
  if (root.dataset.view === 'running' && state.view === 'running') {
    updateRunning(state)
    return
  }
  root.replaceChildren()
  root.dataset.view = state.view
  switch (state.view) {
    case 'landing':
      root.append(renderLanding())
      break
    case 'input':
      root.append(renderInput())
      break
    case 'running':
      root.append(renderRunning(state))
      break
    case 'result':
      root.append(renderResult(state))
      break
    case 'error':
      root.append(renderError(state))
      break
  }
}

function followRun(runId: string): void {
  stream?.close()
  stream = api.subscribe(
    runId,
    (id, event) => {
      dispatch({ type: 'event', id, event })
    },
    () => void reconnectRun(runId)
  )
}

async function reconnectRun(runId: string): Promise<void> {
  if (reconnecting || state.view !== 'running') return
  reconnecting = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 160))
    const snapshot = await api.snapshot(runId)
    dispatch({ type: 'snapshot', snapshot })
  } catch {
    dispatch({ type: 'connection_failed', message: 'The live connection could not be restored.' })
  } finally {
    reconnecting = false
  }
}

async function restoreRun(runId: string): Promise<void> {
  root.ariaBusy = 'true'
  try {
    const snapshot = await api.snapshot(runId)
    dispatch({ type: 'snapshot', snapshot })
    if (snapshot.status === 'running') followRun(runId)
  } catch (error) {
    sessionStorage.removeItem(RUN_STORAGE_KEY)
    dispatch({ type: 'connection_failed', message: publicMessage(error) })
  } finally {
    root.ariaBusy = 'false'
  }
}

function publicMessage(error: unknown): string {
  if (error instanceof RunApiError) return error.message
  if (error instanceof Error && !error.message.toLowerCase().includes('secret')) return error.message
  return 'The request could not be completed.'
}

document.documentElement.dataset.application = 'layerhand'
render()
const storedRun = sessionStorage.getItem(RUN_STORAGE_KEY)
if (storedRun) void restoreRun(storedRun)
