import { describe, expect, test } from 'bun:test'
import { PHOTOPEA_CONFIGURATION, PHOTOPEA_ORIGIN, createPhotopeaHostHtml } from '../../src/editor'

describe('Photopea outer host', () => {
  test('uses the fixed editor environment', () => {
    expect(PHOTOPEA_CONFIGURATION).toEqual({
      environment: {
        theme: 0,
        lang: 'en',
        vmode: 0,
        intro: false,
        localsave: false,
        eparams: {
          guides: false,
          grid: false,
          paths: false,
          pgrid: false
        },
        panels: [2, 5, 18]
      }
    })
  })

  test('pins messaging to the Photopea frame and origin', () => {
    const html = createPhotopeaHostHtml()

    expect(PHOTOPEA_ORIGIN).toBe('https://www.photopea.com')
    expect(html).toContain('event.source !== frame.contentWindow')
    expect(html).toContain('event.origin !== PHOTOPEA_ORIGIN')
    expect(html).toContain('postMessage(payload, PHOTOPEA_ORIGIN)')
    expect(html).not.toContain('postMessage(payload, "*")')
  })
})
