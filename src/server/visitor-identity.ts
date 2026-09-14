const COOKIE_NAME = 'layerhand_visitor'
const COOKIE_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/

export interface VisitorIdentityOptions {
  cookieHeader: string | null
  forwardedFor: string | null
  directAddress: string
  sessionSecret: string
  trustProxyHops: number
  createId?: () => string
}

export interface VisitorIdentity {
  visitorKey: string
  setCookie?: string
}

export class VisitorIdentityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VisitorIdentityError'
  }
}

async function hmac(secret: string, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))
}

async function signVisitorId(secret: string, visitorId: string): Promise<string> {
  return Buffer.from(await hmac(secret, `cookie:${visitorId}`)).toString('base64url')
}

async function validSignedId(secret: string, value: string | undefined): Promise<string | undefined> {
  if (!value) return undefined
  const separator = value.lastIndexOf('.')
  if (separator < 0) return undefined
  const visitorId = value.slice(0, separator)
  const suppliedSignature = value.slice(separator + 1)
  if (!COOKIE_ID_PATTERN.test(visitorId)) return undefined
  const expectedSignature = await signVisitorId(secret, visitorId)
  if (suppliedSignature.length !== expectedSignature.length) return undefined
  const supplied = Buffer.from(suppliedSignature)
  const expected = Buffer.from(expectedSignature)
  return timingSafeEqual(supplied, expected) ? visitorId : undefined
}

function readCookie(header: string | null): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === COOKIE_NAME) return rest.join('=')
  }
  return undefined
}

function clientAddress(options: VisitorIdentityOptions): string {
  let address: string
  if (options.trustProxyHops === 0) {
    address = options.directAddress
  } else {
    const chain = options.forwardedFor?.split(',').map((part) => part.trim()) ?? []
    if (chain.length < options.trustProxyHops) {
      throw new VisitorIdentityError('Forwarded address chain is shorter than TRUST_PROXY_HOPS')
    }
    address = chain[chain.length - options.trustProxyHops]!
  }

  const normalized = address.trim().toLowerCase()
  if (!normalized || normalized.length > 256 || /[\r\n,]/.test(normalized)) {
    throw new VisitorIdentityError('Client address is invalid')
  }
  return normalized
}

export async function establishVisitorIdentity(options: VisitorIdentityOptions): Promise<VisitorIdentity> {
  const existing = await validSignedId(options.sessionSecret, readCookie(options.cookieHeader))
  const visitorId = existing ?? (options.createId ?? (() => crypto.randomUUID()))()
  if (!COOKIE_ID_PATTERN.test(visitorId)) {
    throw new VisitorIdentityError('Generated visitor identifier is invalid')
  }

  const address = clientAddress(options)
  const visitorKey = Buffer.from(
    await hmac(options.sessionSecret, `visitor:${visitorId}\naddress:${address}`)
  ).toString('hex')

  if (existing) return { visitorKey }
  const signature = await signVisitorId(options.sessionSecret, visitorId)
  return {
    visitorKey,
    setCookie: `${COOKIE_NAME}=${visitorId}.${signature}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`
  }
}
import { timingSafeEqual } from 'node:crypto'
