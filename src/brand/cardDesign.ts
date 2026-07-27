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
  gradientEnabled: false,
  gradientRange: 50,
  gradientStrength: 35,
  fontId: 'pretendard',
  englishFontId: 'manrope',
  fontSize: 62,
  secondaryFontSize: 30,
  spacing: 24,
  layoutRatio: 50,
  letterSpacing: 0,
  lineHeight: 1.55,
  textAlign: 'center',
  verticalAlign: 'center',
  contentWidth: 100,
  showPageNumber: true,
}
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min))
const color = (value: unknown, fallback: string) => typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : fallback
export function normalizeDesign(value?: Partial<CardDesignSettings>, fallback: CardDesignSettings = defaultDesign): CardDesignSettings {
  const storedFontId = String(value?.fontId ?? '')
  const fontId = koreanFontIds.includes(storedFontId as KoreanFontId)
    ? storedFontId as KoreanFontId
    : legacyKoreanFonts[storedFontId] ?? fallback.fontId
  const englishFontId = englishFontIds.includes(value?.englishFontId as EnglishFontId)
    ? value!.englishFontId!
    : legacyEnglishFonts[storedFontId] ?? fallback.englishFontId
  return {
    backgroundColor: color(value?.backgroundColor, fallback.backgroundColor),
    textColor: color(value?.textColor, fallback.textColor),
    gradientEnabled: value?.gradientEnabled ?? fallback.gradientEnabled,
    gradientRange: clamp(Number(value?.gradientRange ?? fallback.gradientRange), 0, 100),
    gradientStrength: clamp(Number(value?.gradientStrength ?? fallback.gradientStrength), 0, 100),
    fontId,
    englishFontId,
    fontSize: clamp(Number(value?.fontSize ?? fallback.fontSize), 20, 280),
    secondaryFontSize: clamp(Number(value?.secondaryFontSize ?? fallback.secondaryFontSize), 14, 100),
    spacing: clamp(Number(value?.spacing ?? fallback.spacing), 0, 200),
    layoutRatio: clamp(Number(value?.layoutRatio ?? fallback.layoutRatio), 25, 75),
    letterSpacing: clamp(Number(value?.letterSpacing ?? fallback.letterSpacing), -6, 8),
    lineHeight: clamp(Number(value?.lineHeight ?? fallback.lineHeight), 1.1, 2),
    textAlign: ['left', 'center', 'right'].includes(value?.textAlign ?? '') ? value!.textAlign! : fallback.textAlign,
    verticalAlign: ['top', 'center', 'bottom'].includes(value?.verticalAlign ?? '') ? value!.verticalAlign! : fallback.verticalAlign,
    contentWidth: clamp(Number(value?.contentWidth ?? fallback.contentWidth), 50, 100),
    showPageNumber: value?.showPageNumber ?? fallback.showPageNumber,
  }
}

export const createDesign = (overrides: Partial<CardDesignSettings> = {}) =>
  normalizeDesign(overrides, defaultDesign)
