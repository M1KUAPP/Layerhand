import { timingSafeEqual } from 'node:crypto'

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

/**
 * The bearer a steer or cancel must carry (#136): HMAC-SHA256 of the run id
 * under SESSION_SECRET, so nothing is stored — the secret alone proves it.
 */
export async function createRunToken(secret: string, runId: string): Promise<string> {
  return Buffer.from(await hmac(secret, `run:${runId}`)).toString('base64url')
}

export async function verifyRunToken(secret: string, runId: string, token: string): Promise<boolean> {
  const supplied = Buffer.from(token)
  const expected = Buffer.from(await createRunToken(secret, runId))
  // timingSafeEqual throws unless both buffers have the same length.
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}
