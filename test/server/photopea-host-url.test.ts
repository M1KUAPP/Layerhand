import { describe, expect, test } from 'bun:test'

import { photopeaHostUrl } from '../../src/server/runtime'

describe('Photopea host URL', () => {
  test('is the host page under PUBLIC_URL', () => {
    expect(photopeaHostUrl('https://layerhand.test')).toBe('https://layerhand.test/photopea-host')
    expect(photopeaHostUrl('https://layerhand.test/some/path')).toBe('https://layerhand.test/photopea-host')
  })

  test('drops a user name and password, so Browserbase never receives them', () => {
    const hostUrl = photopeaHostUrl('https://deploy-user:deploy-password@layerhand.test')

    expect(hostUrl).toBe('https://layerhand.test/photopea-host')
    expect(hostUrl).not.toContain('deploy-password')
  })

  test('refuses an address that is not HTTP or HTTPS, without repeating it', () => {
    expect(() => photopeaHostUrl('ftp://secret@layerhand.test')).toThrow('PUBLIC_URL must be an HTTP or HTTPS address')
    expect(() => photopeaHostUrl('not a url')).toThrow('PUBLIC_URL must be an HTTP or HTTPS address')
  })
})
