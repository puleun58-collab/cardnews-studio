import type { CardDesignSettings, FontId } from '../types'
import { brandTokens } from './tokens'

export const fontIds: FontId[] = ['pretendard', 'noto-sans-kr', 'bebas-neue', 'georgia', 'courier-new']
const legacyFontIds: FontId[] = ['kopub-batang', 'kopub-batang-bold', 'kopub-dotum']
export const fontFamilies: Record<FontId, string> = {
  pretendard: 'Pretendard, "Noto Sans KR Variable", sans-serif',
  'noto-sans-kr': '"Noto Sans KR Variable", sans-serif',
  'bebas-neue': '"Bebas Neue", Pretendard, sans-serif',
  georgia: 'Georgia, "Times New Roman", serif',
  'courier-new': '"Courier New", Courier, monospace',
  'kopub-batang': '"KoPubWorld Batang", serif',
  'kopub-batang-bold': '"KoPubWorld Batang", serif',
  'kopub-dotum': '"KoPubWorld Dotum", sans-serif',
}
export const defaultDesign: CardDesignSettings = {
  backgroundColor: brandTokens.color.midnight,
  textColor: brandTokens.color.white,
  fontId: 'pretendard',
  fontSize: 62,
  letterSpacing: 0,
  lineHeight: 1.55,
  textAlign: 'center',
  verticalAlign: 'center',
  contentWidth: 100,
  showPageNumber: true,
}
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min))
const color = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : fallback
export function normalizeDesign(value?: Partial<CardDesignSettings>): CardDesignSettings {
  return {
    backgroundColor: color(value?.backgroundColor, defaultDesign.backgroundColor),
    textColor: color(value?.textColor, defaultDesign.textColor),
    fontId: [...fontIds, ...legacyFontIds].includes(value?.fontId as FontId) ? value!.fontId! : defaultDesign.fontId,
    fontSize: clamp(Number(value?.fontSize ?? defaultDesign.fontSize), 40, 84),
    letterSpacing: clamp(Number(value?.letterSpacing ?? defaultDesign.letterSpacing), -6, 8),
    lineHeight: clamp(Number(value?.lineHeight ?? defaultDesign.lineHeight), 1.2, 2),
    textAlign: ['left', 'center', 'right'].includes(value?.textAlign ?? '') ? value!.textAlign! : defaultDesign.textAlign,
    verticalAlign: ['top', 'center', 'bottom'].includes(value?.verticalAlign ?? '') ? value!.verticalAlign! : defaultDesign.verticalAlign,
    contentWidth: clamp(Number(value?.contentWidth ?? defaultDesign.contentWidth), 60, 100),
    showPageNumber: value?.showPageNumber !== false,
  }
}
