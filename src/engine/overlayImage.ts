import type { CardOverlayImage } from '../types'
export const DEFAULT_OVERLAY_IMAGE = { x: 50, y: 50, width: 42 } as const
export const OVERLAY_IMAGE_WIDTH = { min: 12, max: 100, step: 1 } as const
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
const validImageSource = (value: string) =>
  /^data:image\/(jpeg|png|webp);base64,/i.test(value)
  || /^(blob:|https?:\/\/|\/)/i.test(value)
export function normalizeOverlayImage(value: unknown): CardOverlayImage | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<CardOverlayImage>
  if (typeof item.src !== 'string' || !validImageSource(item.src)) return null
  return { src: item.src, x: clamp(Number(item.x), 0, 100), y: clamp(Number(item.y), 0, 100), width: clamp(Number(item.width), 12, 100) }
}
