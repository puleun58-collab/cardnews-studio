import { appConfig } from '../config/appConfig'
const validTypes = ['image/jpeg', 'image/png', 'image/webp']
export async function imageFileToDataUrl(file: File): Promise<string> {
  if (!validTypes.includes(file.type)) throw new Error('JPG, PNG, WebP 이미지만 사용할 수 있습니다.')
  if (file.size > appConfig.maxImageBytes) throw new Error('이미지는 20MB 이하여야 합니다.')
  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('이미지를 읽을 수 없습니다.')); img.src = url
    })
    if (image.naturalWidth * image.naturalHeight > appConfig.maxImagePixels) throw new Error('이미지 해상도가 너무 큽니다.')
    const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas'); canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale)
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/webp', 0.9)
  } finally { URL.revokeObjectURL(url) }
}
