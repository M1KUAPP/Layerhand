import { describe, expect, test } from 'bun:test'

import { VisitorIdentityError, establishVisitorIdentity } from '../../src/server/visitor-identity'

const SECRET = 'test-session-secret'
const FIRST_ID = 'visitor_identifier_0001'
const SECOND_ID = 'visitor_identifier_0002'

describe('establishVisitorIdentity', () => {
  test('creates a signed secure visitor cookie and an opaque store key', async () => {
    const identity = await establishVisitorIdentity({
      cookieHeader: null,
      forwardedFor: null,
      directAddress: '203.0.113.10',
      sessionSecret: SECRET,
      trustProxyHops: 0,
      createId: () => FIRST_ID
    })

    expect(identity.setCookie).toContain('layerhand_visitor=')
    expect(identity.setCookie).toContain('HttpOnly')
    expect(identity.setCookie).toContain('Secure')
    expect(identity.setCookie).toContain('SameSite=Lax')
    expect(identity.setCookie).toContain('Path=/')
    expect(identity.visitorKey).toMatch(/^[a-f0-9]{64}$/)
    expect(identity.visitorKey).not.toContain(FIRST_ID)
    expect(identity.addressKey).toMatch(/^[a-f0-9]{64}$/)
    expect(identity.addressKey).not.toBe(identity.visitorKey)
    expect(JSON.stringify(identity)).not.toContain('203.0.113.10')
    expect(JSON.stringify(identity)).not.toContain(SECRET)
  })

  test('gives the same address the same address key regardless of cookie', async () => {
    // #115: a visitor key mixes the cookie and the address together, so a
    // fresh cookie alone should not also mint a fresh address key.
    const first = await establishVisitorIdentity({
      cookieHeader: null,
      forwardedFor: null,
      directAddress: '203.0.113.10',
      sessionSecret: SECRET,
      trustProxyHops: 0,
      createId: () => FIRST_ID
    })
    const second = await establishVisitorIdentity({
      cookieHeader: null,
      forwardedFor: null,
      directAddress: '203.0.113.10',
      sessionSecret: SECRET,
      trustProxyHops: 0,
      createId: () => SECOND_ID
    })

    expect(second.visitorKey).not.toBe(first.visitorKey)
    expect(second.addressKey).toBe(first.addressKey)
  })

  test('gives a different address a different address key', async () => {
    const first = await establishVisitorIdentity({
      cookieHeader: null,
      forwardedFor: null,
      directAddress: '203.0.113.10',
      sessionSecret: SECRET,
      trustProxyHops: 0,
      createId: () => FIRST_ID
    })
    const second = await establishVisitorIdentity({
      cookieHeader: null,
      forwardedFor: null,
      directAddress: '198.51.100.5',
      sessionSecret: SECRET,
      trustProxyHops: 0,
      createId: () => FIRST_ID
    })

    expect(second.addressKey).not.toBe(first.addressKey)
  })

  test('accepts a valid cookie without issuing a replacement', async () => {
    const first = await establishVisitorIdentity({
      cookieHeader: null,
      forwardedFor: null,
      directAddress: '203.0.113.10',
      sessionSecret: SECRET,
      trustProxyHops: 0,
      createId: () => FIRST_ID
    })
    const cookie = first.setCookie!.split(';', 1)[0]!

    const next = await establishVisitorIdentity({
      cookieHeader: `theme=dark; ${cookie}`,
      forwardedFor: null,
      directAddress: '203.0.113.10',
      sessionSecret: SECRET,
      trustProxyHops: 0,
      createId: () => SECOND_ID
    })

    expect(next.visitorKey).toBe(first.visitorKey)
    expect(next.setCookie).toBeUndefined()
  })

  test('replaces a tampered cookie', async () => {
    const first = await establishVisitorIdentity({
      cookieHeader: null,
      forwardedFor: null,
      directAddress: '203.0.113.10',
      sessionSecret: SECRET,
      trustProxyHops: 0,
      createId: () => FIRST_ID
    })
    const cookie = `${first.setCookie!.split(';', 1)[0]}tampered`

    const next = await establishVisitorIdentity({
      cookieHeader: cookie,
      forwardedFor: null,
      directAddress: '203.0.113.10',
      sessionSecret: SECRET,
      trustProxyHops: 0,
      createId: () => SECOND_ID
    })

    expect(next.visitorKey).not.toBe(first.visitorKey)
    expect(next.setCookie).toContain('layerhand_visitor=')
  })

  test('ignores forwarding headers when no proxy is trusted', async () => {
    const direct = await establishVisitorIdentity({
      cookieHeader: null,
      forwardedFor: '198.51.100.1, 198.51.100.2',
      directAddress: '203.0.113.10',
      sessionSecret: SECRET,
      trustProxyHops: 0,
      createId: () => FIRST_ID
    })
    const withoutHeader = await establishVisitorIdentity({
      cookieHeader: null,
      forwardedFor: null,
      directAddress: '203.0.113.10',
      sessionSecret: SECRET,
      trustProxyHops: 0,
      createId: () => FIRST_ID
    })

    expect(direct.visitorKey).toBe(withoutHeader.visitorKey)
  })

  test('selects the address at the exact trusted proxy depth', async () => {
    const oneHop = await establishVisitorIdentity({
      cookieHeader: null,
      forwardedFor: '198.51.100.1, 198.51.100.2',
      directAddress: '203.0.113.10',
      sessionSecret: SECRET,
      trustProxyHops: 1,
      createId: () => FIRST_ID
    })
    const expected = await establishVisitorIdentity({
      cookieHeader: null,
      forwardedFor: null,
      directAddress: '198.51.100.2',
      sessionSecret: SECRET,
      trustProxyHops: 0,
      createId: () => FIRST_ID
    })

    expect(oneHop.visitorKey).toBe(expected.visitorKey)
  })

  test('rejects a forwarded chain shorter than the trusted depth', async () => {
    await expect(
      establishVisitorIdentity({
        cookieHeader: null,
        forwardedFor: '198.51.100.1',
        directAddress: '203.0.113.10',
        sessionSecret: SECRET,
        trustProxyHops: 2,
        createId: () => FIRST_ID
      })
    ).rejects.toBeInstanceOf(VisitorIdentityError)
  })
})
