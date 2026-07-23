import type { CardDesignSettings, EnglishFontId, KoreanFontId } from '../types'
import { brandTokens } from './tokens'

export const koreanFontIds: KoreanFontId[] = ['pretendard', 'noto-sans-kr', 'nanum-square-neo', 's-core-dream', 'gmarket-sans', 'paperlogy', 'jalnan', 'cafe24-surround', 'noto-serif-kr']
export const englishFontIds: EnglishFontId[] = ['manrope', 'oswald', 'cormorant-garamond', 'ibm-plex-mono']
export const koreanFontFamilies: Record<KoreanFontId, string> = {
  pretendard: 'Pretendard',
  'noto-sans-kr': '"Noto Sans KR Variable"',
  'nanum-square-neo': '"NanumSquare Neo"',
  's-core-dream': '"S-Core Dream"',
  'gmarket-sans': '"Gmarket Sans"',
  paperlogy: 'Paperlogy',
  jalnan: 'Jalnan',
  'cafe24-surround': '"Cafe24 Ssurround"',
  'noto-serif-kr': '"Noto Serif KR Variable"',
}
export const englishFontFamilies: Record<EnglishFontId, string> = {
  manrope: '"Manrope Variable"',
  oswald: '"Oswald Variable"',
  'cormorant-garamond': '"Cormorant Garamond Variable"',
  'ibm-plex-mono': '"IBM Plex Mono"',
}
export const getCardFontFamily = (fontId: KoreanFontId, englishFontId: EnglishFontId) =>
  `${englishFontFamilies[englishFontId]}, ${koreanFontFamilies[fontId]}, sans-serif`

const legacyKoreanFonts: Record<string, KoreanFontId> = {
  'bebas-neue': 'pretendard',
  georgia: 'noto-serif-kr',
  'courier-new': 'pretendard',
  'kopub-batang': 'noto-serif-kr',
  'kopub-batang-bold': 'noto-serif-kr',
  'kopub-dotum': 'noto-sans-kr',
}
const legacyEnglishFonts: Record<string, EnglishFontId> = {
  'bebas-neue': 'oswald',
  georgia: 'cormorant-garamond',
  'courier-new': 'ibm-plex-mono',
}
export const defaultDesign: CardDesignSettings = {
  backgroundColor: brandTokens.color.midnight,
  textColor: brandTokens.color.white,
  fontId: 'pretendard',
  englishFontId: 'manrope',
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
  const storedFontId = String(value?.fontId ?? '')
  const fontId = koreanFontIds.includes(storedFontId as KoreanFontId)
    ? storedFontId as KoreanFontId
    : legacyKoreanFonts[storedFontId] ?? defaultDesign.fontId
  const englishFontId = englishFontIds.includes(value?.englishFontId as EnglishFontId)
    ? value!.englishFontId!
    : legacyEnglishFonts[storedFontId] ?? defaultDesign.englishFontId
  return {
    backgroundColor: color(value?.backgroundColor, defaultDesign.backgroundColor),
    textColor: color(value?.textColor, defaultDesign.textColor),
    fontId,
    englishFontId,
    fontSize: clamp(Number(value?.fontSize ?? defaultDesign.fontSize), 40, 84),
    letterSpacing: clamp(Number(value?.letterSpacing ?? defaultDesign.letterSpacing), -6, 8),
    lineHeight: clamp(Number(value?.lineHeight ?? defaultDesign.lineHeight), 1.2, 2),
    textAlign: ['left', 'center', 'right'].includes(value?.textAlign ?? '') ? value!.textAlign! : defaultDesign.textAlign,
    verticalAlign: ['top', 'center', 'bottom'].includes(value?.verticalAlign ?? '') ? value!.verticalAlign! : defaultDesign.verticalAlign,
    contentWidth: clamp(Number(value?.contentWidth ?? defaultDesign.contentWidth), 60, 100),
    showPageNumber: value?.showPageNumber !== false,
  }
}
