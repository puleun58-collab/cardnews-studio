import type { CardDesignSettings, FontId } from '../types'
import { brandTokens } from './tokens'

export const fontIds: FontId[] = ['kopub-batang', 'kopub-batang-bold', 'kopub-dotum', 'pretendard']
export const fontFamilies: Record<FontId, string> = {
  'kopub-batang': '"KoPubWorld Batang", serif',
  'kopub-batang-bold': '"KoPubWorld Batang", serif',
  'kopub-dotum': '"KoPubWorld Dotum", sans-serif',
  pretendard: 'Pretendard, sans-serif',
}
export const defaultDesign: CardDesignSettings = { backgroundColor: brandTokens.color.midnight, textColor: brandTokens.color.white, fontId: 'kopub-batang', fontSize: 62, letterSpacing: 0, showPageNumber: true }
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min))
const color = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : fallback
export function normalizeDesign(value?: Partial<CardDesignSettings>): CardDesignSettings {
  return {
    backgroundColor: color(value?.backgroundColor, defaultDesign.backgroundColor),
    textColor: color(value?.textColor, defaultDesign.textColor),
    fontId: fontIds.includes(value?.fontId as FontId) ? value!.fontId! : defaultDesign.fontId,
    fontSize: clamp(Number(value?.fontSize ?? defaultDesign.fontSize), 40, 84),
    letterSpacing: clamp(Number(value?.letterSpacing ?? defaultDesign.letterSpacing), -6, 8),
    showPageNumber: value?.showPageNumber !== false,
  }
}
