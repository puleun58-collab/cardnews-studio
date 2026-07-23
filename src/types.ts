import type { ComponentType } from 'react'

export type TemplateId = 'cover-hook' | 'midnight-quote' | 'quote-basic' | 'stat-highlight' | 'list-insight' | 'process-steps' | 'comparison' | 'quote-commentary' | 'image-text' | 'divider-closing'
export type KoreanFontId =
  | 'pretendard'
  | 'noto-sans-kr'
  | 'nanum-square-neo'
  | 's-core-dream'
  | 'gmarket-sans'
  | 'paperlogy'
  | 'jalnan'
  | 'cafe24-surround'
  | 'noto-serif-kr'
export type EnglishFontId = 'manrope' | 'oswald' | 'cormorant-garamond' | 'ibm-plex-mono'
export type FontId = KoreanFontId
export type CardSizePreset = 'portrait' | 'square' | 'story' | 'custom'
export interface CardSize { width: number; height: number }

export interface CardDesignSettings {
  backgroundColor: string
  textColor: string
  fontId: KoreanFontId
  englishFontId: EnglishFontId
  fontSize: number
  letterSpacing: number
  lineHeight: number
  textAlign: 'left' | 'center' | 'right'
  verticalAlign: 'top' | 'center' | 'bottom'
  contentWidth: number
  showPageNumber: boolean
}
export interface CardOverlayImage { src: string; x: number; y: number; width: number }
export interface CardPage {
  id: string
  templateId: TemplateId
  variantId: string
  content: Record<string, string | string[]>
  backgroundImage?: string | null
  image?: string | null
  overlayImage?: CardOverlayImage | null
  design?: CardDesignSettings
}
export interface Project { schemaVersion: number; id: string; name: string; createdAt: string; updatedAt: string; canvasSize: CardSize; pages: CardPage[] }
export interface FieldDef { key: string; label: string; type: 'text' | 'textarea' | 'list' | 'image'; placeholder?: string; maxLength?: number; required?: boolean }
export type DesignCapability = 'backgroundColor' | 'textColor' | 'fontId' | 'fontSize' | 'letterSpacing' | 'lineHeight' | 'textAlign' | 'verticalAlign' | 'contentWidth' | 'showPageNumber'
export interface CardProps { page: CardPage; pageIndex: number; pageCount: number; forExport?: boolean; reportOverflow?: boolean }
export interface TemplateManifest {
  id: TemplateId
  name: string
  description: string
  variants: { id: string; label: string; tone: 'light' | 'dark' }[]
  defaultVariant: string
  fields: FieldDef[]
  fontRange: Record<string, { min: number; max: number }>
  sampleContent: { content: Record<string, string | string[]>; image?: string }
  component: ComponentType<CardProps>
  defaultDesign?: CardDesignSettings
  capabilities?: DesignCapability[]
}
