import type { CardSize, CardSizePreset } from '../types'

export const cardSizePresets: Record<Exclude<CardSizePreset, 'custom'>, CardSize & { label: string }> = {
  portrait: { width: 1080, height: 1350, label: '인스타그램 세로' },
  square: { width: 1080, height: 1080, label: '정사각형' },
  story: { width: 1080, height: 1920, label: '스토리' },
}

export const defaultCardSize: CardSize = {
  width: cardSizePresets.portrait.width,
  height: cardSizePresets.portrait.height,
}

const clampDimension = (value: unknown) => Math.min(4096, Math.max(320, Math.round(Number(value) || 0)))

export function normalizeCardSize(value: unknown): CardSize {
  if (!value || typeof value !== 'object') return { ...defaultCardSize }
  const raw = value as Partial<CardSize>
  const width = clampDimension(raw.width)
  const height = Math.max(width, clampDimension(raw.height))
  return { width, height }
}

export function getCardSizePreset(size: CardSize): CardSizePreset {
  const match = Object.entries(cardSizePresets).find(([, preset]) => preset.width === size.width && preset.height === size.height)
  return (match?.[0] as Exclude<CardSizePreset, 'custom'> | undefined) ?? 'custom'
}

export function getCardFormat(size: CardSize): 'square' | 'portrait' | 'story' {
  const ratio = size.width / size.height
  if (ratio >= .9) return 'square'
  if (ratio <= .65) return 'story'
  return 'portrait'
}

export const formatCardSize = (size: CardSize) => `${size.width} × ${size.height}`
