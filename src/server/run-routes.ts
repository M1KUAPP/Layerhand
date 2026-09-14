import type { RunRequest } from '../agent/contract'
import { ImageUploadError, MAX_IMAGE_BYTES, validateImageUpload } from '../editor/image-upload'
import type { ArtifactStore } from './artifact-store'
import type { ManagedRun } from './managed-run'
import type { MeterStore } from './meter-store'
import { usdToMicroUsd } from './meter-store'
import { RunRegistry, RunRegistryError } from './run-registry'
import { VisitorIdentityError, establishVisitorIdentity } from './visitor-identity'
import { WaitlistEmailError, type WaitlistStore } from './waitlist-store'

const MAX_REQUEST_BODY_BYTES = MAX_IMAGE_BYTES + 64 * 1024
const MAX_INSTRUCTION_LENGTH = 500

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
  runFactory(request: RunRequest): ManagedRun
  stepCap?: number
}

function json(value: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(value, { status, headers })
}

function apiError(code: string, message: string, status: number): Response {
  return json({ code, message }, status)
}

async function jsonObject(request: Request): Promise<Record<string, unknown>> {
  const value: unknown = await request.json()
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_json')
  return value as Record<string, unknown>
}

function registryError(error: RunRegistryError): Response {
  return apiError(error.code, error.message, error.code === 'run_not_found' ? 404 : 409)
}

export class RunRoutes {
  readonly #dependencies: RunRouteDependencies

  constructor(dependencies: RunRouteDependencies) {
    this.#dependencies = dependencies
  }

  async handle(request: Request): Promise<Response | undefined> {
    const url = new URL(request.url)
    try {
      if (request.method === 'POST' && url.pathname === '/api/runs') {
        return await this.#start(request)
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
      if (request.method === 'POST' && action === 'cancel') return await this.#cancel(runId)
      return apiError('method_not_allowed', 'This endpoint does not accept that method.', 405)
    } catch (error) {
      if (error instanceof RunRegistryError) return registryError(error)
      if (error instanceof ImageUploadError) return apiError(error.code, error.message, 400)
      if (error instanceof WaitlistEmailError || error instanceof VisitorIdentityError) {
        const code = error instanceof WaitlistEmailError ? error.code : 'invalid_visitor'
        return apiError(code, error.message, 400)
      }
      return apiError('bad_request', 'The request could not be read.', 400)
    }
  }

  async #start(request: Request): Promise<Response> {
    const declaredLength = Number(request.headers.get('content-length') ?? 0)
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) {
      return apiError('request_too_large', 'The upload exceeds the 20 MB request limit.', 413)
    }

    const form = await request.formData()
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

    const identity = await establishVisitorIdentity({
      cookieHeader: request.headers.get('cookie'),
      forwardedFor: request.headers.get('x-forwarded-for'),
      directAddress: this.#dependencies.clientAddress(request),
      sessionSecret: this.#dependencies.sessionSecret,
      trustProxyHops: this.#dependencies.trustProxyHops
    })
    const apiKeyValue = form.get('apiKey')
    const apiKey = typeof apiKeyValue === 'string' && apiKeyValue.length > 0 ? apiKeyValue : undefined
    const admission = await this.#dependencies.meterStore.admit({
      visitorKey: identity.visitorKey,
      reservationMicroUsd: this.#dependencies.freeRunReservationMicroUsd,
      byok: apiKey !== undefined
    })
    if (!admission.accepted) {
      return json(admission, 429, identity.setCookie ? { 'set-cookie': identity.setCookie } : undefined)
    }

    let artifactKey: string | undefined
    let managedRun: ManagedRun | undefined
    try {
      const artifact = await this.#dependencies.artifactStore.put({
        kind: 'upload',
        bytes: upload.bytes,
        contentType: upload.format === 'jpeg' ? 'image/jpeg' : 'image/png'
      })
      artifactKey = artifact.key
      const runRequest: RunRequest = {
        image: upload.bytes,
        filename: upload.filename,
        instruction,
        stepCap: this.#dependencies.stepCap ?? 15,
        budgetUsd: this.#dependencies.freeRunReservationMicroUsd / 1_000_000,
        apiKey
      }
      managedRun = this.#dependencies.runFactory(runRequest)
      const runId = this.#dependencies.idGenerator()
      this.#dependencies.registry.register({
        runId,
        instruction,
        managedRun,
        onTerminal: async ({ snapshot }) => {
          await this.#dependencies.meterStore.reconcile(admission.reservation, usdToMicroUsd(snapshot.costUsd))
        }
      })
      return json({ runId }, 201, identity.setCookie ? { 'set-cookie': identity.setCookie } : undefined)
    } catch (error) {
      if (managedRun) {
        try {
          await managedRun.handle.cancel()
        } catch {
          // Continue local cleanup after a failed start.
        }
        try {
          managedRun.releaseSecrets()
        } catch {
          // Continue releasing quota after a failed start.
        }
      }
      if (artifactKey) {
        try {
          await this.#dependencies.artifactStore.delete(artifactKey)
        } catch {
          // The provider lifecycle remains a backstop; quota still must be released.
        }
      }
      await this.#dependencies.meterStore.release(admission.reservation)
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
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
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
        }
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

  async #steer(runId: string, request: Request): Promise<Response> {
    const body = await jsonObject(request)
    const text = body.text
    if (typeof text !== 'string' || text.trim().length === 0 || text.length > 500) {
      return apiError('invalid_correction', 'Enter a correction of 500 characters or fewer.', 400)
    }
    await this.#dependencies.registry.steer(runId, text.trim())
    return json({ accepted: true }, 202)
  }

  async #cancel(runId: string): Promise<Response> {
    await this.#dependencies.registry.cancel(runId)
    return json({ accepted: true }, 202)
  }

  async #waitlist(request: Request): Promise<Response> {
    const body = await jsonObject(request)
    if (typeof body.email !== 'string') {
      return apiError('invalid_email', 'Enter a valid email address.', 400)
    }
    const result = await this.#dependencies.waitlistStore.add(body.email, this.#dependencies.now().toISOString())
    return json(result, result.created ? 201 : 200)
  }
}
