const IMAGE_REFERENCE_PREFIX = 'idb-image:'

export const isStoredImageReference = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith(IMAGE_REFERENCE_PREFIX)

export const imageIdFromReference = (reference: string) => reference.slice(IMAGE_REFERENCE_PREFIX.length)
export const imageReference = (id: string) => `${IMAGE_REFERENCE_PREFIX}${id}`

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl)
  if (!match) throw new Error('지원하지 않는 이미지 데이터입니다.')
  const binary = atob(match[2].replace(/\s/g, ''))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: match[1].toLowerCase() })
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`
}

export async function imageSourceToBlob(source: string): Promise<Blob | null> {
  if (/^data:image\//i.test(source)) return dataUrlToBlob(source)
  if (/^blob:/i.test(source)) {
    const response = await fetch(source)
    if (!response.ok) throw new Error('임시 이미지 데이터를 읽지 못했습니다.')
    return response.blob()
  }
  return null
}

export async function sha256(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
}
