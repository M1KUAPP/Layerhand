import { describe, expect, test } from 'bun:test'
import { runInNewContext } from 'node:vm'
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

  test('queues an exported file as its bytes, leaving the encoding to the transport', () => {
    const script = /<script>([\s\S]*?)<\/script>/.exec(createPhotopeaHostHtml())?.[1]
    const frame = { contentWindow: {}, src: '' }
    let deliver!: (event: unknown) => void
    const window: Record<string, unknown> = {
      location: { hash: '#{}' },
      addEventListener: (_type: string, listener: typeof deliver) => {
        deliver = listener
      }
    }
    runInNewContext(script!, { window, document: { getElementById: () => frame }, ArrayBuffer, Uint8Array })

    deliver({ source: frame.contentWindow, origin: PHOTOPEA_ORIGIN, data: Uint8Array.of(56, 66, 80, 83).buffer })

    expect(window.__layerhandPhotopeaMessages).toEqual([{ type: 'bytes', value: Uint8Array.of(56, 66, 80, 83) }])
  })
})
