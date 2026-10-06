import type { RunRequest } from '../agent/contract'
import { ImageUploadError, MAX_IMAGE_BYTES, validateImageUpload } from '../editor/image-upload'
import type { ArtifactStore } from './artifact-store'
import type { ManagedRun } from './managed-run'
import type { MeterStore } from './meter-store'
import { usdToMicroUsd } from './meter-store'
import type { OpenAiKeyCheck } from './openai-key'
import { RateLimiter } from './rate-limiter'
import { RunRegistry, RunRegistryError, RunStartRefused } from './run-registry'
import { createRunToken, verifyRunToken } from './run-token'
import { VisitorIdentityError, establishVisitorIdentity, type VisitorIdentity } from './visitor-identity'
import { WaitlistEmailError, type WaitlistStore } from './waitlist-store'
import { imageDigest, type WarmEditorSession, type WarmSessionPool } from './warm-session-pool'

export const MAX_RUN_REQUEST_BODY_BYTES = MAX_IMAGE_BYTES + 64 * 1024
const MAX_INSTRUCTION_LENGTH = 500
// Bun closes a request idle for ten seconds unless something is sent on it.
// A run goes quiet for longer than that between frames and steps (#113), so
// a comment line — ignored by EventSource — holds the stream open through
// the gap, well inside that window.
const EVENTS_HEARTBEAT_INTERVAL_MS = 5_000
const QUEUE_FULL = {
  code: 'queue_full',
  message: 'Layerhand is busy, and the line to start a run is full. Try again in a few minutes.'
}
// A steer or waitlist body has no reason to be more than a fraction of this (#115).
export const MAX_JSON_BODY_BYTES = 4 * 1024
// Requests one visitor, or one address, may make of uploads, runs, or
// waitlist sign-ups in one rolling window, before launch traffic gets a
// chance to hammer an endpoint that costs money (#115). Each endpoint keeps
// its own count, so a burst on one does not spend another's budget. The
// counts are configurable (RunRouteDependencies); these are the fallback for
// a caller, such as a test, that does not set them.
const RATE_LIMIT_WINDOW_MS = 60_000
const DEFAULT_PER_VISITOR_RATE_LIMIT = 10
const DEFAULT_PER_ADDRESS_RATE_LIMIT = 60
// A bundle request names its agent host in X-Layerhand-Client (#136); a
// header longer than this is refused rather than trusted.
const MAX_CLIENT_HEADER_LENGTH = 64
const DEFAULT_MAX_CLIENT_RUNS_PER_ADDRESS = 2

export interface RunRouteDependencies {
  registry: RunRegistry
  meterStore: MeterStore
  artifactStore: ArtifactStore
  waitlistStore: WaitlistStore
  sessionSecret: string
  trustProxyHops: number
  freeRunReservationMicroUsd: number
  clientAddress(request: Request): string
  now(): Date
  idGenerator(): string
  runFactory(request: RunRequest, warmSession?: WarmEditorSession): ManagedRun | Promise<ManagedRun>
  stepCap?: number
  /** Warms an editor while the user types, when the run mode has a browser to warm (#70). */
  warmSessions?: WarmSessionPool
  /** Refuses new runs and upload warming while true, for a launch-day emergency (#118). */
  runsPaused?: boolean
  /** Checks a user's own key with OpenAI, when the run mode opens a browser for it. */
  checkApiKey?: (apiKey: string) => Promise<OpenAiKeyCheck>
  /**
   * The origin the page is actually reached at, from `PUBLIC_URL`, when
   * known. Behind a TLS-terminating proxy like Cloud Run the request's own
   * URL is http:// while a browser's `Origin` header is https://, so the
   * origin check compares against this instead of the request's own URL
   * whenever it is set (#115).
   */
  publicOrigin?: string
  /** Requests one visitor may make of an endpoint in a minute (#115). */
  requestsPerVisitorPerMinute?: number
  /** Requests one address may make of an endpoint in a minute (#115). */
  requestsPerAddressPerMinute?: number
  /** Bundle runs one address may have queued or running at once (#136). */
  maxClientRunsPerAddress?: number
}

class RequestTooLargeError extends Error {
  constructor(message = 'The upload exceeds the 20 MB request limit.') {
    super(message)
    this.name = 'RequestTooLargeError'
  }
}

/**
 * The request's form, refusing a body that passes the limit as it reads it.
 * A chunked request declares no length, so the declared one is only a
 * shortcut: the bytes are counted as they arrive and the read stops at the
 * first one past the limit, rather than buffering a body of any size (#82).
 */
async function boundedFormData(request: Request, limit: number): Promise<FormData> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > limit) throw new RequestTooLargeError()
  const body = request.body
  if (!body) return await request.formData()

  const chunks: Uint8Array[] = []
  let total = 0
  const reader = body.getReader()
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > limit) throw new RequestTooLargeError()
      chunks.push(value)
    }
  } finally {
    // Whether the body ended or the limit refused it, nothing more is wanted.
    await reader.cancel().catch(() => undefined)
  }

  // The content type carries the multipart boundary, so the parse needs it.
  const contentType = request.headers.get('content-type')
  const headers = contentType ? { 'content-type': contentType } : undefined
  return await new Response(new Blob(chunks as unknown as BlobPart[]), headers ? { headers } : {}).formData()
}

function json(value: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(value, { status, headers })
}

function apiError(code: string, message: string, status: number): Response {
  return json({ code, message }, status)
}

/**
 * The request's JSON object body, refusing one that passes `limit` as it
 * arrives — the same discipline `boundedFormData` applies to a multipart
 * body, so a steer or waitlist request cannot send an arbitrarily large one
 * (#115).
 */
async function boundedJson(request: Request, limit: number): Promise<Record<string, unknown>> {
  const declaredLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    throw new RequestTooLargeError(`The request body exceeds the ${limit / 1024} KB limit.`)
  }

  const chunks: Uint8Array[] = []
  let total = 0
  const reader = request.body?.getReader()
  if (reader) {
    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        total += value.byteLength
        if (total > limit) throw new RequestTooLargeError(`The request body exceeds the ${limit / 1024} KB limit.`)
        chunks.push(value)
      }
    } finally {
      await reader.cancel().catch(() => undefined)
    }
  }

  let value: unknown
  try {
    value = JSON.parse(await new Blob(chunks as unknown as BlobPart[]).text())
  } catch {
    throw new Error('invalid_json')
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_json')
  return value as Record<string, unknown>
}

/**
 * True when a state-changing request's own headers say it came from another
 * site. `Sec-Fetch-Site` decides outright when a browser sends it: `none` is
 * a direct navigation, not a cross-site request, so both it and
 * `same-origin` are allowed. Without it, `Origin` is compared against
 * `publicOrigin` when one is configured, and against the request's own URL
 * otherwise — never both, because behind a TLS-terminating proxy like Cloud
 * Run the request's own URL is http:// while a browser's `Origin` is
 * https://, and only `publicOrigin` knows the real scheme (#115). A request
 * carrying neither header — any non-browser client — is let through.
 */
function fromAllowedOrigin(request: Request, url: URL, publicOrigin: string | undefined): boolean {
  const secFetchSite = request.headers.get('sec-fetch-site')
  if (secFetchSite) return secFetchSite === 'same-origin' || secFetchSite === 'none'

  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).origin === (publicOrigin ?? url.origin)
  } catch {
    return false
  }
}

function rateLimitResponse(identity: VisitorIdentity): Response {
  return json(
    { code: 'rate_limited', message: 'Too many requests. Try again in a moment.' },
    429,
    identity.setCookie ? { 'set-cookie': identity.setCookie } : undefined
  )
}

/** One endpoint's rate limiting, checked independently by visitor and by address (#115). */
interface EndpointLimiter {
  readonly perVisitor: RateLimiter
  readonly perAddress: RateLimiter
}

function createEndpointLimiter(now: () => number, perVisitor: number, perAddress: number): EndpointLimiter {
  return {
    perVisitor: new RateLimiter({ windowMs: RATE_LIMIT_WINDOW_MS, max: perVisitor, now }),
    perAddress: new RateLimiter({ windowMs: RATE_LIMIT_WINDOW_MS, max: perAddress, now })
  }
}

function registryError(error: RunRegistryError): Response {
  const status = error.code === 'run_not_found' ? 404 : error.code === 'shutting_down' ? 503 : 409
  return apiError(error.code, error.message, status)
}

export class RunRoutes {
  readonly #dependencies: RunRouteDependencies
  readonly #uploadLimiter: EndpointLimiter
  readonly #runLimiter: EndpointLimiter
  readonly #waitlistLimiter: EndpointLimiter
  /** Bundle runs queued or in flight per address, as the rate limiter keeps its counts (#136). */
  readonly #clientRuns = new Map<string, number>()
  readonly #maxClientRunsPerAddress: number

  constructor(dependencies: RunRouteDependencies) {
    this.#dependencies = dependencies
    const now = () => dependencies.now().getTime()
    const perVisitor = dependencies.requestsPerVisitorPerMinute ?? DEFAULT_PER_VISITOR_RATE_LIMIT
    const perAddress = dependencies.requestsPerAddressPerMinute ?? DEFAULT_PER_ADDRESS_RATE_LIMIT
    this.#uploadLimiter = createEndpointLimiter(now, perVisitor, perAddress)
    this.#runLimiter = createEndpointLimiter(now, perVisitor, perAddress)
    this.#waitlistLimiter = createEndpointLimiter(now, perVisitor, perAddress)
    this.#maxClientRunsPerAddress = dependencies.maxClientRunsPerAddress ?? DEFAULT_MAX_CLIENT_RUNS_PER_ADDRESS
  }

  async handle(request: Request): Promise<Response | undefined> {
    const url = new URL(request.url)
    if (request.method === 'POST') {
      // A paused launch says so before a run start is checked any further (#118).
      if (url.pathname === '/api/runs' && this.#dependencies.runsPaused) {
        return apiError('runs_paused', 'New runs are paused right now. Try again shortly.', 503)
      }
      if (!fromAllowedOrigin(request, url, this.#dependencies.publicOrigin)) {
        return apiError('origin_refused', 'This request did not come from the Layerhand page.', 403)
      }
    }
    try {
      if (request.method === 'POST' && url.pathname === '/api/runs') {
        return await this.#start(request)
      }
      if (request.method === 'POST' && url.pathname === '/api/uploads') {
        return await this.#upload(request)
      }
      if (request.method === 'POST' && url.pathname === '/api/waitlist') {
        return await this.#waitlist(request)
      }

      const match = /^\/api\/runs\/([^/]+)(?:\/(events|steer|cancel))?$/.exec(url.pathname)
      if (!match) return undefined
      const runId = decodeURIComponent(match[1]!)
      const action = match[2]

      if (request.method === 'GET' && !action) return await this.#snapshot(runId)
      if (request.method === 'GET' && action === 'events') return this.#events(runId, request)
      if (request.method === 'POST' && action === 'steer') return await this.#steer(runId, request)
      if (request.method === 'POST' && action === 'cancel') return await this.#cancel(runId, request)
      return apiError('method_not_allowed', 'This endpoint does not accept that method.', 405)
    } catch (error) {
      if (error instanceof RequestTooLargeError) return apiError('request_too_large', error.message, 413)
      if (error instanceof RunRegistryError) return registryError(error)
      if (error instanceof ImageUploadError) return apiError(error.code, error.message, 400)
      if (error instanceof WaitlistEmailError || error instanceof VisitorIdentityError) {
        const code = error instanceof WaitlistEmailError ? error.code : 'invalid_visitor'
        return apiError(code, error.message, 400)
      }
      return apiError('bad_request', 'The request could not be read.', 400)
    }
  }

  /**
   * Warms an editor for an upload that has passed validation, so the run the
   * user starts a moment later has a browser with their image already open
   * (#70, NFR-3). It answers as soon as the session exists, because opening
   * the image is what takes the time. Nothing is metered here: warming spends
   * nothing on the model.
   */
  async #upload(request: Request): Promise<Response> {
    const identity = await this.#visitor(request)
    const limited = this.#checkRateLimit(this.#uploadLimiter, identity)
    if (limited) return limited
    const form = await boundedFormData(request, MAX_RUN_REQUEST_BODY_BYTES)
    const image = form.get('image')
    const filenameValue = form.get('filename')
    if (!(image instanceof Blob) || typeof filenameValue !== 'string' || !filenameValue) {
      return apiError('image_required', 'Choose a JPEG or PNG image.', 400)
    }
    const upload = validateImageUpload(new Uint8Array(await image.arrayBuffer()), filenameValue)
    const uploadId = this.#dependencies.runsPaused
      ? undefined
      : await this.#dependencies.warmSessions?.warm(identity.visitorKey, upload.bytes, upload.filename)
    return json(
      { uploadId: uploadId ?? null, warming: uploadId !== undefined },
      201,
      identity.setCookie ? { 'set-cookie': identity.setCookie } : undefined
    )
  }

  #visitor(request: Request) {
    return establishVisitorIdentity({
      cookieHeader: request.headers.get('cookie'),
      forwardedFor: request.headers.get('x-forwarded-for'),
      directAddress: this.#dependencies.clientAddress(request),
      sessionSecret: this.#dependencies.sessionSecret,
      trustProxyHops: this.#dependencies.trustProxyHops
    })
  }

  /**
   * A refusal when either the visitor or the address is over its limit, or
   * `undefined` to proceed. The visitor is checked first, and the address's
   * budget is left untouched once the visitor alone already refuses (#115).
   */
  #checkRateLimit(limiter: EndpointLimiter, identity: VisitorIdentity): Response | undefined {
    if (!limiter.perVisitor.allow(identity.visitorKey)) return rateLimitResponse(identity)
    if (!limiter.perAddress.allow(identity.addressKey)) return rateLimitResponse(identity)
    return undefined
  }

  async #start(request: Request): Promise<Response> {
    const client = request.headers.get('x-layerhand-client')
    if (client !== null && client.length > MAX_CLIENT_HEADER_LENGTH) {
      return apiError('invalid_client', 'The X-Layerhand-Client header must be 64 characters or fewer.', 400)
    }
    // A bundle request is capped per address and must run on the visitor's own key (#136).
    const bundle = client !== null && client.length > 0
    const identity = await this.#visitor(request)
    const limited = this.#checkRateLimit(this.#runLimiter, identity)
    if (limited) return limited
    const form = await boundedFormData(request, MAX_RUN_REQUEST_BODY_BYTES)
    const instructionValue = form.get('instruction')
    if (typeof instructionValue !== 'string' || instructionValue.trim().length === 0) {
      return apiError('instruction_required', 'Enter a retouching instruction.', 400)
    }
    if (instructionValue.length > MAX_INSTRUCTION_LENGTH) {
      return apiError('instruction_too_long', 'The instruction must be 500 characters or fewer.', 400)
    }
    const instruction = instructionValue.trim()

    const image = form.get('image')
    const filenameValue = form.get('filename')
    if (!(image instanceof Blob) || typeof filenameValue !== 'string' || !filenameValue) {
      return apiError('image_required', 'Choose a JPEG or PNG image.', 400)
    }
    const bytes = new Uint8Array(await image.arrayBuffer())
    const upload = validateImageUpload(bytes, filenameValue)

    const apiKeyValue = form.get('apiKey')
    const apiKey = typeof apiKeyValue === 'string' && apiKeyValue.length > 0 ? apiKeyValue : undefined
    const cookie = identity.setCookie ? { 'set-cookie': identity.setCookie } : undefined
    if (bundle && apiKey === undefined) {
      const message = 'Runs from an agent need your own OpenAI API key.'
      return json({ code: 'api_key_required', message }, 400, cookie)
    }
    // A run that would wait in a full line is turned away before anything is
    // stored, reserved, or checked for it (NFR-4).
    if (this.#dependencies.registry.lineFull()) return json(QUEUE_FULL, 429, cookie)
    // A key OpenAI will not take is turned away before anything is stored,
    // reserved, or opened for its run.
    const keyCheck =
      apiKey && this.#dependencies.checkApiKey ? await this.#dependencies.checkApiKey(apiKey) : 'accepted'
    if (keyCheck === 'refused') {
      const message = 'OpenAI did not accept this API key. Check the key and try again.'
      return json({ code: 'invalid_api_key', message }, 400, cookie)
    }
    if (keyCheck === 'unchecked') {
      const message = 'OpenAI could not be reached to check this API key. Try again in a moment.'
      return json({ code: 'api_key_unchecked', message }, 503, cookie)
    }
    const admissionRequest = {
      visitorKey: identity.visitorKey,
      addressKey: identity.addressKey,
      reservationMicroUsd: this.#dependencies.freeRunReservationMicroUsd,
      byok: apiKey !== undefined
    }
    const admission = await this.#dependencies.meterStore.admit(admissionRequest)
    // A free run held back only by budget that runs in flight reserved waits
    // in line for it, and is admitted when its turn comes (NFR-4).
    if (!admission.accepted && admission.code !== 'budget_reserved') {
      return json(admission, 429, cookie)
    }
    // A run held back by budget waits whether or not a slot is free.
    if (!admission.accepted && this.#dependencies.registry.lineFull(true)) return json(QUEUE_FULL, 429, cookie)
    let reservation = admission.accepted ? admission.reservation : undefined
    const uploadIdValue = form.get('uploadId')
    const uploadId = typeof uploadIdValue === 'string' ? uploadIdValue : undefined

    // A bundle run holds one of its address's few slots from here until the
    // run ends. The check and the take stay synchronous, so two requests
    // arriving together cannot both pass (#136).
    let releaseClientRun: (() => void) | undefined
    if (bundle) {
      const inFlight = this.#clientRuns.get(identity.addressKey) ?? 0
      if (inFlight >= this.#maxClientRunsPerAddress) {
        // The reservation this request was admitted with goes back with the refusal.
        if (reservation) await this.#dependencies.meterStore.release(reservation)
        const message = `This address already has ${this.#maxClientRunsPerAddress} runs going from an agent. Wait for one to finish.`
        return json({ code: 'client_runs_exceeded', message }, 429, cookie)
      }
      this.#clientRuns.set(identity.addressKey, inFlight + 1)
      let held = true
      releaseClientRun = () => {
        if (!held) return
        held = false
        const remaining = (this.#clientRuns.get(identity.addressKey) ?? 1) - 1
        if (remaining > 0) this.#clientRuns.set(identity.addressKey, remaining)
        else this.#clientRuns.delete(identity.addressKey)
      }
    }

    let artifactKey: string | undefined
    try {
      const artifact = await this.#dependencies.artifactStore.put({
        kind: 'upload',
        bytes: upload.bytes,
        contentType: upload.format === 'jpeg' ? 'image/jpeg' : 'image/png'
      })
      artifactKey = artifact.key
      const runArtifactKey = artifact.key
      const runRequest: RunRequest = {
        image: upload.bytes,
        filename: upload.filename,
        instruction,
        stepCap: this.#dependencies.stepCap ?? 15,
        budgetUsd: this.#dependencies.freeRunReservationMicroUsd / 1_000_000,
        apiKey
      }
      let started = false
      const runId = this.#dependencies.idGenerator()
      const runToken = await createRunToken(this.#dependencies.sessionSecret, runId)
      // Past the cap on concurrent runs, the run waits in line and starts by itself (NFR-4).
      await this.#dependencies.registry.enqueue({
        runId,
        instruction,
        start: async () => {
          // A free run's reservation counts from when its run starts, however long it waited.
          const admitted = reservation
            ? await this.#dependencies.meterStore.renew(reservation)
            : await this.#dependencies.meterStore.admit(admissionRequest)
          if (!admitted.accepted) {
            if (admitted.code === 'budget_reserved') return undefined
            throw new RunStartRefused(admitted.message)
          }
          reservation = admitted.reservation
          const managedRun = await this.#startRun(runRequest, uploadId, identity.visitorKey)
          started = true
          return managedRun
        },
        onTerminal: async ({ snapshot, metrics }) => {
          // The address's bundle slot goes back whatever else follows (#136).
          releaseClientRun?.()
          try {
            // A run that never got its budget holds nothing to give back.
            if (!reservation) return
            // A run that never started, or failed without spending anything,
            // never used its free run, so it is given back rather than
            // reconciled at $0 (#116). The manager's stopReason, not the
            // snapshot's status, says a run failed: a run whose model call
            // fails can still end with a `done` event and an incomplete
            // result, so its status reads `incomplete` even though the
            // manager counts it as failed.
            if (!started || (metrics.stopReason === 'failed' && snapshot.costUsd === 0)) {
              await this.#dependencies.meterStore.release(reservation)
            } else {
              await this.#dependencies.meterStore.reconcile(reservation, usdToMicroUsd(snapshot.costUsd))
            }
          } finally {
            await this.#dependencies.artifactStore.delete(runArtifactKey)
          }
        }
      })
      return json({ runId, runToken }, 201, cookie)
    } catch (error) {
      // Nothing was registered, so nothing else will release what this run held.
      releaseClientRun?.()
      if (artifactKey) {
        try {
          await this.#dependencies.artifactStore.delete(artifactKey)
        } catch {
          // The provider lifecycle remains a backstop; quota still must be released.
        }
      }
      if (reservation) await this.#dependencies.meterStore.release(reservation)
      throw error
    }
  }

  /**
   * Starts a run that holds a slot. A session warmed for this visitor and this
   * image is claimed only now, so a run waiting in line holds no browser, and
   * one the pool has released since leaves the run to start cold. The image is
   * hashed only when there is an upload that could match it.
   */
  async #startRun(request: RunRequest, uploadId: string | undefined, visitorKey: string): Promise<ManagedRun> {
    const pool = this.#dependencies.warmSessions
    const warmSession =
      pool && uploadId ? pool.claim(uploadId, visitorKey, await imageDigest(request.image)) : undefined
    try {
      return await this.#dependencies.runFactory(request, warmSession)
    } catch (error) {
      // A claimed session that no run took bills until the provider times it out.
      await warmSession?.abandon().catch(() => undefined)
      throw error
    }
  }

  async #snapshot(runId: string): Promise<Response> {
    const snapshot = await this.#dependencies.registry.getSnapshot(runId)
    if (!snapshot) {
      throw new RunRegistryError('run_not_found', 'The requested run does not exist.')
    }
    return json(snapshot)
  }

  #events(runId: string, request: Request): Response {
    const header = request.headers.get('last-event-id')
    const afterId = header && /^\d+$/.test(header) ? Number(header) : -1
    const events = this.#dependencies.registry.events(runId, afterId)
    const encoder = new TextEncoder()
    let heartbeat: ReturnType<typeof setInterval> | undefined
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': heartbeat\n\n'))
          } catch {
            // The connection dropped between ticks; cancel() clears this
            // once the runtime notices, but do not let a stray write throw.
            clearInterval(heartbeat)
          }
        }, EVENTS_HEARTBEAT_INTERVAL_MS)
        try {
          for await (const envelope of events) {
            controller.enqueue(
              encoder.encode(
                `id: ${envelope.id}\nevent: ${envelope.event.type}\ndata: ${JSON.stringify(envelope.event)}\n\n`
              )
            )
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        } finally {
          clearInterval(heartbeat)
        }
      },
      cancel() {
        clearInterval(heartbeat)
      }
    })
    return new Response(body, {
      headers: {
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'content-type': 'text/event-stream; charset=utf-8'
      }
    })
  }

  /**
   * The proof that a steer or cancel comes from whoever started the run,
   * checked before the body is read or the run is looked up, so a refusal
   * says nothing about whether the run exists (#136).
   */
  async #runTokenRefusal(runId: string, request: Request): Promise<Response | undefined> {
    const header = request.headers.get('authorization')
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined
    if (!token) {
      return apiError('run_token_required', 'This run needs its token to be steered or cancelled.', 401)
    }
    if (!(await verifyRunToken(this.#dependencies.sessionSecret, runId, token))) {
      return apiError('run_token_refused', 'This token does not belong to this run.', 403)
    }
    return undefined
  }

  async #steer(runId: string, request: Request): Promise<Response> {
    const refused = await this.#runTokenRefusal(runId, request)
    if (refused) return refused
    const body = await boundedJson(request, MAX_JSON_BODY_BYTES)
    const text = body.text
    if (typeof text !== 'string' || text.trim().length === 0 || text.length > 500) {
      return apiError('invalid_correction', 'Enter a correction of 500 characters or fewer.', 400)
    }
    await this.#dependencies.registry.steer(runId, text.trim())
    return json({ accepted: true }, 202)
  }

  async #cancel(runId: string, request: Request): Promise<Response> {
    const refused = await this.#runTokenRefusal(runId, request)
    if (refused) return refused
    await this.#dependencies.registry.cancel(runId)
    return json({ accepted: true }, 202)
  }

  async #waitlist(request: Request): Promise<Response> {
    const identity = await this.#visitor(request)
    const limited = this.#checkRateLimit(this.#waitlistLimiter, identity)
    if (limited) return limited
    const body = await boundedJson(request, MAX_JSON_BODY_BYTES)
    if (typeof body.email !== 'string') {
      return apiError('invalid_email', 'Enter a valid email address.', 400)
    }
    const result = await this.#dependencies.waitlistStore.add(body.email, this.#dependencies.now().toISOString())
    return json(
      result,
      result.created ? 201 : 200,
      identity.setCookie ? { 'set-cookie': identity.setCookie } : undefined
    )
  }
}
