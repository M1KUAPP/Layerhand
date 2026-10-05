export type PhotopeaMessage = string | ArrayBuffer

export function photopeaEditorUrl(): string {
  return 'https://www.photopea.com/#'
}

export function selectPsdBeforeSentinel(messages: PhotopeaMessage[], sentinel: string): ArrayBuffer {
  const sentinelIndex = messages.indexOf(sentinel)

  if (sentinelIndex === -1) {
    throw new Error(`Photopea sentinel was not received: ${sentinel}`)
  }

  for (let index = sentinelIndex - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message instanceof ArrayBuffer) {
      return message
    }
  }

  throw new Error('Photopea did not send PSD bytes before the sentinel')
}
