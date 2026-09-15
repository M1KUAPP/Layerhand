import { describe, expect, test } from 'bun:test'

describe('selectPsdBeforeSentinel', () => {
  test('ignores spurious done messages and returns the PSD before the sentinel', async () => {
    const protocol = await import('./protocol.ts').catch(() => ({}))
    const selectPsdBeforeSentinel = Reflect.get(protocol, 'selectPsdBeforeSentinel')

    expect(selectPsdBeforeSentinel).toBeFunction()

    const psd = new Uint8Array([0x38, 0x42, 0x50, 0x53]).buffer
    const messages = ['done', psd, 'done', 'layerhand:sentinel']

    expect(selectPsdBeforeSentinel(messages, 'layerhand:sentinel')).toBe(psd)
  })

  test('rejects a stream without the expected sentinel', async () => {
    const { selectPsdBeforeSentinel } = await import('./protocol.ts')
    const psd = new Uint8Array([0x38, 0x42, 0x50, 0x53]).buffer

    expect(() => selectPsdBeforeSentinel(['done', psd, 'done'], 'layerhand:sentinel')).toThrow(
      'Photopea sentinel was not received: layerhand:sentinel'
    )
  })

  test('rejects a different sentinel token', async () => {
    const { selectPsdBeforeSentinel } = await import('./protocol.ts')
    const psd = new Uint8Array([0x38, 0x42, 0x50, 0x53]).buffer

    expect(() => selectPsdBeforeSentinel(['done', psd, 'layerhand:other'], 'layerhand:sentinel')).toThrow(
      'Photopea sentinel was not received: layerhand:sentinel'
    )
  })

  test('rejects PSD bytes received only after the sentinel', async () => {
    const { selectPsdBeforeSentinel } = await import('./protocol.ts')
    const psd = new Uint8Array([0x38, 0x42, 0x50, 0x53]).buffer

    expect(() => selectPsdBeforeSentinel(['done', 'layerhand:sentinel', psd], 'layerhand:sentinel')).toThrow(
      'Photopea did not send PSD bytes before the sentinel'
    )
  })
})

describe('photopeaEditorUrl', () => {
  test('includes a fragment so Photopea boots the editor', async () => {
    const protocol = await import('./protocol.ts')
    const photopeaEditorUrl = Reflect.get(protocol, 'photopeaEditorUrl')

    expect(photopeaEditorUrl).toBeFunction()
    expect(photopeaEditorUrl()).toBe('https://www.photopea.com/#')
  })
})
