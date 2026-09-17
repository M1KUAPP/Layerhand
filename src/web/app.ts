import samplePhotoUrl from './assets/sample-photo.png'
import type { LayerInfo } from '../editor/contract'
import { RunApi, RunApiError } from './api'
import './footer'
import { renderLanding, type LandingContext } from './landing/index'
import {
  formatCredits,
  initialClientState,
  isCurrentRun,
  reduceClientState,
  resultOutcomeText,
  type ClientAction,
  type ClientState,
  type RunProgress
} from './state'

const RUN_STORAGE_KEY = 'layerhand.runId'
const INSTRUCTION_STORAGE_KEY = 'layerhand.instruction'
const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const IMAGE_UPLOAD_ERROR_CODES = new Set([
  'unsupported_image_format',
  'image_too_large',
  'malformed_image',
  'image_dimensions_too_large',
  'request_too_large',
  'image_required'
])
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
let instructionError: string | undefined
let keyError: string | undefined
let formError: string | undefined
let draftInstruction = ''
let draftApiKey = ''
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

const landingContext: LandingContext = {
  startRun: () => dispatch({ type: 'edit' }),
  joinWaitlist: (email) => api.joinWaitlist(email),
  publicMessage,
  brandHeader: () => brandHeader()
}

// The wording matches the server's in src/editor/image-upload.ts, so a file
// refused here reads the same as one refused there.
function validateFile(file: File): string | undefined {
  const lowerName = file.name.toLowerCase()
  const supportedName = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png')
  const supportedType = file.type === 'image/jpeg' || file.type === 'image/png'
  if (!supportedName || !supportedType) return 'Only JPEG and PNG images are supported.'
  if (file.size > MAX_IMAGE_BYTES) return 'Image exceeds the 20 MB limit.'
  return undefined
}

// The editor is warmed as soon as a file passes the checks here, so the run
// starts with the image already open (#70). Non-validation warming failures
// stay silent, and the run starts cold as it always did.
let warmUploadId: string | undefined

function warmEditor(file: File): void {
  warmUploadId = undefined
  const body = new FormData()
  body.set('image', file, file.name)
  body.set('filename', file.name)
  void api
    .warmUpload(body)
    .then(({ uploadId }) => {
      // A file chosen since this upload started owns the warm session now.
      if (selectedFile === file) warmUploadId = uploadId ?? undefined
    })
    .catch((error) => {
      if (isImageUploadError(error)) rejectSelectedFile(file, error.message)
    })
}

function isImageUploadError(error: unknown): error is RunApiError {
  return error instanceof RunApiError && IMAGE_UPLOAD_ERROR_CODES.has(error.code)
}

function rejectSelectedFile(file: File, message: string): boolean {
  // An older upload response must not clear a file chosen in the meantime.
  if (selectedFile !== file) return false
  selectedFile = undefined
  warmUploadId = undefined
  releaseSelectedPreview()
  fileError = message
  render()
  return true
}

function chooseFile(file: File): void {
  fileError = validateFile(file)
  if (fileError) {
    selectedFile = undefined
    warmUploadId = undefined
    releaseSelectedPreview()
  } else {
    selectedFile = file
    releaseSelectedPreview()
    selectedPreviewUrl = URL.createObjectURL(file)
    warmEditor(file)
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
  intro.append(title, description('The result remains editable.'))

  const form = node('form', 'run-form')
  form.noValidate = true
  const fileField = node('fieldset', 'file-field')
  const legend = node('legend', undefined, 'Source photograph')
  const dropZone = node('label', 'drop-zone')
  dropZone.htmlFor = 'source-image'
  const input = node('input', 'file-input')
  input.id = 'source-image'
  input.name = 'image'
  input.type = 'file'
  input.accept = 'image/jpeg,image/png,.jpg,.jpeg,.png'
  input.required = true
  dropZone.append(input)
  if (selectedPreviewUrl) {
    const preview = node('img', 'selected-preview')
    preview.src = selectedPreviewUrl
    preview.alt = `Selected source: ${selectedFile?.name ?? 'photograph'}`
    dropZone.append(preview)
  }
  const prompt = node(
    'span',
    'drop-prompt',
    selectedFile ? selectedFile.name : 'Drop a photograph here, or choose a file'
  )
  dropZone.append(prompt)
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault()
    dropZone.dataset.dragging = 'true'
  })
  dropZone.addEventListener('dragleave', () => delete dropZone.dataset.dragging)
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
  fileStatus.setAttribute('role', 'alert')
  const fileHint = node('p', 'field-hint', 'JPEG or PNG, up to 20 MB and 6000 px on the long edge.')
  fileHint.id = 'source-image-hint'
  input.setAttribute('aria-describedby', `${fileHint.id} ${fileStatus.id}`)
  if (fileError) input.setAttribute('aria-invalid', 'true')
  const retentionNotice = node('p', 'field-hint', 'Uploads are deleted within 24 hours.')
  fileField.append(legend, dropZone, fileHint, retentionNotice, fileStatus)

  const sample = button('Use the sample photograph', 'sample-button')
  const sampleThumb = node('img', 'sample-thumb')
  sampleThumb.src = samplePhotoUrl
  sampleThumb.alt = ''
  sample.prepend(sampleThumb)
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

  const instructionLabel = node('label', 'field-label', 'Retouching instruction')
  instructionLabel.htmlFor = 'instruction'
  const instruction = node('textarea')
  instruction.id = 'instruction'
  instruction.name = 'instruction'
  instruction.maxLength = 500
  instruction.rows = 3
  instruction.required = true
  instruction.placeholder = 'Describe the finished photograph and what must stay unchanged.'
  instruction.value = draftInstruction
  const instructionCount = node('p', 'field-hint instruction-count', `${draftInstruction.length} / 500`)
  instructionCount.id = 'instruction-count'
  instruction.addEventListener('input', () => {
    draftInstruction = instruction.value
    instructionCount.textContent = `${instruction.value.length} / 500`
    if (instructionError) {
      instructionError = undefined
      instruction.removeAttribute('aria-invalid')
      const status = root.querySelector<HTMLElement>('#instruction-error')
      if (status) status.textContent = ''
    }
  })
  const instructionMeta = node('div', 'instruction-meta')
  const instructionHint = node('p', 'field-hint', 'Try a precise direction')
  instructionHint.id = 'instruction-hint'
  instructionMeta.append(instructionHint, instructionCount)
  const instructionStatus = node('p', 'field-error', instructionError)
  instructionStatus.id = 'instruction-error'
  instructionStatus.setAttribute('role', 'alert')
  instruction.setAttribute('aria-describedby', `${instructionHint.id} ${instructionCount.id} ${instructionStatus.id}`)
  if (instructionError) instruction.setAttribute('aria-invalid', 'true')
  const examples = node('div', 'examples')
  for (const example of EXAMPLES) {
    const exampleButton = button(example, 'example-button')
    exampleButton.addEventListener('click', () => {
      instruction.value = example
      draftInstruction = example
      instructionCount.textContent = `${example.length} / 500`
      instructionError = undefined
      instruction.removeAttribute('aria-invalid')
      instructionStatus.textContent = ''
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
  keyInput.value = draftApiKey
  keyInput.addEventListener('input', () => {
    draftApiKey = keyInput.value
  })
  // FR-36: the key pays for this run and is released with it.
  const keyHint = node('p', 'field-hint', 'Used for this run only and never stored.')
  keyHint.id = 'api-key-hint'
  const keyStatus = node('p', 'field-error', keyError)
  keyStatus.id = 'api-key-error'
  keyStatus.setAttribute('role', 'alert')
  keyInput.setAttribute('aria-describedby', `${keyHint.id} ${keyStatus.id}`)

  const error = node('p', 'form-error', formError)
  error.setAttribute('role', 'alert')
  const submit = button('Start retouching', 'button button-accent')
  submit.type = 'submit'
  form.append(
    fileField,
    instructionLabel,
    instruction,
    instructionMeta,
    instructionStatus,
    examples,
    keyLabel,
    keyInput,
    keyHint,
    keyStatus,
    error,
    submit
  )
  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    formError = undefined
    keyError = undefined
    instructionError = undefined
    if (!selectedFile) {
      fileError = 'Choose a JPEG or PNG image.'
      render()
      return
    }
    const submittedInstruction = instruction.value.trim()
    if (!submittedInstruction) {
      instructionError = 'Enter a retouching instruction.'
      render()
      return
    }
    submit.disabled = true
    submit.textContent = 'Starting…'
    root.ariaBusy = 'true'
    const submittedFile = selectedFile
    try {
      const body = new FormData()
      body.set('image', submittedFile, submittedFile.name)
      body.set('filename', submittedFile.name)
      body.set('instruction', submittedInstruction)
      if (keyInput.value) body.set('apiKey', keyInput.value)
      // The editor warmed while the instruction was typed, if it is still ours.
      if (warmUploadId) body.set('uploadId', warmUploadId)
      const started = await api.start(body)
      keyInput.value = ''
      draftInstruction = ''
      draftApiKey = ''
      warmUploadId = undefined
      selectedFile = undefined
      releaseSelectedPreview()
      sessionStorage.setItem(RUN_STORAGE_KEY, started.runId)
      sessionStorage.setItem(INSTRUCTION_STORAGE_KEY, submittedInstruction)
      dispatch({ type: 'started', runId: started.runId, instruction: submittedInstruction })
      followRun(started.runId)
    } catch (error) {
      if (isImageUploadError(error)) {
        rejectSelectedFile(submittedFile, error.message)
        return
      }
      formError = publicMessage(error)
      // A free-run refusal is answered by the key field, and a key OpenAI
      // turns away is corrected there, so either is pointed out there and
      // focus moves to it.
      keyError = keyFieldError(error)
      render()
      if (keyError) root.querySelector<HTMLElement>('#api-key')?.focus()
    } finally {
      root.ariaBusy = 'false'
    }
  })
  section.append(intro, form)
  fragment.append(section)
  return fragment
}

function keyFieldError(error: unknown): string | undefined {
  if (!(error instanceof RunApiError)) return undefined
  if (error.code === 'free_limit_reached' || error.code === 'daily_budget_reached') {
    return 'Add your OpenAI API key in this field to continue.'
  }
  return error.code === 'invalid_api_key' ? 'Check the OpenAI API key in this field.' : undefined
}

// A run past the cap on concurrent runs waits in line with its place shown,
// and starts by itself; until then it has no editor to show or correct (NFR-4).
function actionText(progress: RunProgress): string {
  return progress.queuePosition === null ? (progress.narration ?? 'Opening the editor') : 'Waiting to start'
}

function placeholderText(progress: RunProgress): string {
  return progress.queuePosition === null
    ? 'Preparing the editor…'
    : `Number ${progress.queuePosition} in line. The run starts on its own.`
}

function cancelText(progress: RunProgress): string {
  if (progress.cancelRequested) return 'Cancelling…'
  return progress.queuePosition === null ? 'Cancel and keep work' : 'Leave the queue'
}

function progressRail(progress: Extract<ClientState, { view: 'running' }>['progress']): HTMLElement {
  const rail = node('aside', 'progress-rail')
  const title = node('p', 'rail-title', 'Run status')
  const metrics = node('dl')
  const entries: [id: string, term: string, detail: string][] = []
  if (progress.instruction) entries.push(['instruction', 'Instruction', progress.instruction])
  entries.push(
    ['step', 'Step', `Step ${progress.steps} of ${progress.cap ?? '?'}`],
    ['credits', 'Spend', formatCredits(progress.costUsd)],
    ['action', 'Action', actionText(progress)]
  )
  for (const [id, term, detail] of entries) {
    const value = node('dd', undefined, detail)
    value.id = `run-${id}`
    metrics.append(node('dt', undefined, term), value)
  }
  rail.append(title, metrics)
  return rail
}

function replaceNotices(container: HTMLElement, progress: Extract<ClientState, { view: 'running' }>['progress']): void {
  const previousCount = container.childElementCount
  container.replaceChildren()
  for (const message of progress.recoverableErrors) container.append(node('p', 'notice', message))
  for (const message of progress.corrections) {
    container.append(node('p', 'correction-ack', `Correction applied: ${message}`))
  }
  // The container has a bounded height (styles.css); keep the newest
  // acknowledgement in view rather than the oldest, but only when the list
  // actually grew. Every progress tick calls this, and pulling a visitor
  // back to the bottom on ticks that add nothing would undo a manual
  // scroll to reread an earlier one.
  if (container.childElementCount > previousCount) container.scrollTop = container.scrollHeight
}

function renderRunning(current: Extract<ClientState, { view: 'running' }>): DocumentFragment {
  const fragment = document.createDocumentFragment()
  const cancel = button(cancelText(current.progress), 'text-button')
  cancel.id = 'cancel-run'
  cancel.disabled = current.progress.cancelRequested
  cancel.addEventListener('click', async () => {
    // A run that leaves the queue has nothing to come back to after a reload.
    const leavingQueue = state.view === 'running' && state.progress.queuePosition !== null
    dispatch({ type: 'cancel_requested' })
    try {
      await api.cancel(current.progress.runId)
      if (leavingQueue) {
        sessionStorage.removeItem(RUN_STORAGE_KEY)
        sessionStorage.removeItem(INSTRUCTION_STORAGE_KEY)
      }
    } catch (error) {
      // A refused cancel does not end the run: the running view or the
      // result stays on screen, with the refusal shown as a notice (#123).
      // A request that never reached the server at all (a `RunApiError` is
      // only thrown for a server's stated refusal) is a real connection
      // loss, which the run's own "connection lost" error view handles.
      // A slow request that settles once the view has moved to a different
      // run must not be attributed to that run either.
      if (!isCurrentRun(state, current.progress.runId)) return
      dispatch(
        error instanceof RunApiError
          ? { type: 'action_refused', message: publicMessage(error) }
          : { type: 'connection_failed', message: publicMessage(error) }
      )
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
    frame.append(node('p', 'frame-placeholder', placeholderText(current.progress)))
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
  field.placeholder = 'For example: keep the label unchanged'
  // Corrections are refused for the whole finishing window (#123), so the
  // field is disabled as soon as a cancel is requested rather than left to
  // fail server-side, and while the run is still queued and cannot be
  // corrected yet (#102).
  field.disabled = current.progress.cancelRequested || current.progress.queuePosition !== null
  const send = button('Send correction', 'button button-dark')
  send.id = 'send-correction'
  send.type = 'submit'
  send.disabled = field.disabled
  const correctionHint = node('p', 'field-hint', 'A correction steers the next action. It does not restart the run.')
  correctionHint.id = 'correction-hint'
  field.setAttribute('aria-describedby', correctionHint.id)
  correction.append(label, field, send, correctionHint)
  correction.addEventListener('submit', async (event) => {
    event.preventDefault()
    const text = field.value.trim()
    if (!text) return
    send.disabled = true
    try {
      await api.steer(current.progress.runId, text)
      field.value = ''
    } catch (error) {
      // A refused correction does not end the run: the running view or the
      // result stays on screen, with the refusal shown as a notice (#123).
      // A request that never reached the server at all (a `RunApiError` is
      // only thrown for a server's stated refusal) is a real connection
      // loss, which the run's own "connection lost" error view handles.
      // A slow request that settles once the view has moved to a different
      // run must not be attributed to that run either.
      if (isCurrentRun(state, current.progress.runId)) {
        dispatch(
          error instanceof RunApiError
            ? { type: 'action_refused', message: publicMessage(error) }
            : { type: 'connection_failed', message: publicMessage(error) }
        )
      }
    } finally {
      // A cancel requested while this was in flight must stay disabled;
      // read the live state rather than the render this closure captured.
      send.disabled = state.view === 'running' && state.progress.cancelRequested
    }
  })

  const notices = node('div', 'run-notices')
  notices.id = 'run-notices'
  replaceNotices(notices, current.progress)

  // A grid row sized only by min-height grows to fit an oversized child (a
  // real frame, not fakeRun's tiny placeholder), pushing the form and the
  // notices below it off screen. A fixed-height flex shell keeps the three
  // parts within the viewport instead: running-layout is the only part that
  // flexes.
  const shell = node('div', 'running-shell')
  shell.append(layout, correction, notices)
  fragment.append(shell)
  return fragment
}

function updateRunning(current: Extract<ClientState, { view: 'running' }>): void {
  const step = root.querySelector<HTMLElement>('#run-step')
  const credits = root.querySelector<HTMLElement>('#run-credits')
  const action = root.querySelector<HTMLElement>('#run-action')
  const cancel = root.querySelector<HTMLButtonElement>('#cancel-run')
  const field = root.querySelector<HTMLInputElement>('#correction')
  const send = root.querySelector<HTMLButtonElement>('#send-correction')
  const frame = root.querySelector<HTMLElement>('#live-frame')
  const notices = root.querySelector<HTMLElement>('#run-notices')
  if (!step || !credits || !action || !cancel || !field || !send || !frame || !notices) return

  step.textContent = `Step ${current.progress.steps} of ${current.progress.cap ?? '?'}`
  credits.textContent = formatCredits(current.progress.costUsd)
  action.textContent = actionText(current.progress)
  cancel.textContent = cancelText(current.progress)
  cancel.disabled = current.progress.cancelRequested
  // Only when the run leaves the queue, so a correction being sent keeps its button disabled.
  const queued = current.progress.queuePosition !== null
  if (field.disabled !== queued) {
    field.disabled = queued
    send.disabled = queued
  }
  // Only latches on: a correction already in flight manages send.disabled
  // itself, and must not be re-enabled here once cancelling has started.
  // Applied after the queue toggle above so a cancel always wins, even for
  // a run that was still queued when cancelled (#123).
  if (current.progress.cancelRequested) {
    field.disabled = true
    send.disabled = true
  }

  if (current.progress.frameUrl) {
    let image = frame.querySelector('img')
    if (!image) {
      image = node('img')
      image.alt = 'Current editor frame'
      frame.replaceChildren(image)
    }
    if (image.src !== current.progress.frameUrl) image.src = current.progress.frameUrl
  } else {
    const placeholder = frame.querySelector('.frame-placeholder')
    if (placeholder) placeholder.textContent = placeholderText(current.progress)
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
  copy.append(eyebrow('Retouch result'), title, description(resultOutcomeText(current.outcome)))
  // A correction or cancel refused after the run ended lands here rather
  // than replacing the result (#123).
  for (const message of current.progress.recoverableErrors) copy.append(node('p', 'notice', message))

  const recap = node('dl', 'result-recap')
  if (current.progress.instruction) {
    recap.append(node('dt', undefined, 'Instruction'), node('dd', undefined, current.progress.instruction))
  }
  recap.append(node('dt', undefined, 'Corrections'))
  const correctionDetail = node('dd')
  if (current.progress.corrections.length > 0) {
    const list = node('ul')
    for (const correction of current.progress.corrections) list.append(node('li', undefined, correction))
    correctionDetail.append(list)
  } else {
    correctionDetail.textContent = 'None'
  }
  recap.append(correctionDetail)
  copy.append(recap)

  const image = node('img')
  image.className = 'result-preview'
  image.src = current.result.previewUrl
  image.alt = 'Flattened preview of the retouched photograph'

  const layers = node('section')
  layers.className = 'layer-list'
  const layersTitle = node('h2', undefined, 'Layers in the PSD')
  layers.append(layersTitle, renderLayerTree(current.result.layers))

  const downloads = node('div', 'result-actions')
  const download = node('a', 'button button-accent', 'Download layered PSD')
  download.href = current.result.psdUrl
  download.download = 'layerhand-result.psd'
  const preview = node('a', 'button', 'Download flattened PNG')
  preview.href = current.result.previewUrl
  preview.download = 'layerhand-preview.png'
  downloads.append(download, preview)
  copy.append(downloads, node('p', 'result-expiry', 'Download links expire after one hour.'))
  section.append(image, copy, layers)
  fragment.append(section)
  return fragment
}

// The contract lists layers bottom to top; editors show the top layer first.
function renderLayerTree(layers: readonly LayerInfo[]): HTMLOListElement {
  const list = node('ol')
  for (const layer of [...layers].reverse()) list.append(renderLayer(layer))
  return list
}

function renderLayer(layer: LayerInfo): HTMLLIElement {
  const item = node('li', 'layer-row')
  const summary = node('div', 'layer-summary')
  const tags = node('span', 'layer-tags')
  tags.append(node('span', undefined, layer.kind))
  if (!layer.visible) tags.append(node('span', 'layer-hidden', 'hidden'))
  for (const mask of layer.masks) {
    tags.append(node('span', 'layer-mask', `${mask.enabled ? '' : 'disabled '}${mask.kind} mask`))
  }
  summary.append(node('strong', undefined, layer.name), tags)
  item.append(summary)
  if (layer.children.length > 0) item.append(renderLayerTree(layer.children))
  return item
}

function renderRestoring(): DocumentFragment {
  const fragment = document.createDocumentFragment()
  fragment.append(brandHeader())
  const section = node('section', 'restoring-state')
  section.append(
    eyebrow('Run in progress'),
    node('h1', undefined, 'Reconnecting to your run…'),
    description('The live view resumes in a moment.')
  )
  fragment.append(section)
  return fragment
}

function renderError(current: Extract<ClientState, { view: 'error' }>): DocumentFragment {
  const fragment = document.createDocumentFragment()
  fragment.append(brandHeader())
  const section = node('section', 'error-state')
  section.append(
    eyebrow('Run interrupted'),
    node('h1', undefined, 'The retouching run stopped.'),
    description(withFullStop(current.message))
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
      root.append(renderLanding(landingContext))
      break
    case 'input':
      root.append(renderInput())
      break
    case 'restoring':
      root.append(renderRestoring())
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

// One dropped stream is often a blip, so the snapshot that restores the view
// is retried before the run is declared unreachable.
const RECONNECT_ATTEMPTS = 3

async function reconnectRun(runId: string): Promise<void> {
  if (reconnecting || state.view !== 'running') return
  reconnecting = true
  try {
    for (let attempt = 1; attempt <= RECONNECT_ATTEMPTS; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 160 * attempt))
      if (state.view !== 'running') return
      try {
        const snapshot = await api.snapshot(runId)
        dispatch({ type: 'snapshot', snapshot })
        return
      } catch {
        // Try again; the run keeps going whether or not the page is watching.
      }
    }
    dispatch({ type: 'connection_failed', message: 'The live connection could not be restored.' })
  } finally {
    reconnecting = false
  }
}

function stillRestoring(runId: string): boolean {
  return state.view === 'restoring' && state.runId === runId
}

async function restoreRun(runId: string): Promise<void> {
  dispatch({ type: 'restoring', runId })
  root.ariaBusy = 'true'
  try {
    const snapshot = await api.snapshot(runId)
    if (stillRestoring(runId)) {
      dispatch({
        type: 'snapshot',
        snapshot,
        instruction: sessionStorage.getItem(INSTRUCTION_STORAGE_KEY)
      })
      if (snapshot.status === 'running' || snapshot.status === 'queued') followRun(runId)
    }
  } catch (error) {
    if (stillRestoring(runId)) {
      sessionStorage.removeItem(RUN_STORAGE_KEY)
      sessionStorage.removeItem(INSTRUCTION_STORAGE_KEY)
      dispatch({ type: 'connection_failed', message: publicMessage(error) })
    }
  } finally {
    root.ariaBusy = 'false'
  }
}

function publicMessage(error: unknown): string {
  if (error instanceof RunApiError) return error.message
  // fetch reports a refused or unreachable request as a bare TypeError.
  if (error instanceof TypeError) {
    return 'The server could not be reached. Check your connection and try again.'
  }
  if (error instanceof Error && !error.message.toLowerCase().includes('secret')) return error.message
  return 'The request could not be completed.'
}

function withFullStop(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`
}

document.documentElement.dataset.application = 'layerhand'
render()
const storedRun = sessionStorage.getItem(RUN_STORAGE_KEY)
if (storedRun) void restoreRun(storedRun)
