import type { ComponentType } from 'react'

export type TemplateId = 'cover-hook' | 'midnight-quote' | 'quote-basic' | 'list-insight' | 'quote-commentary' | 'image-text' | 'divider-closing'
export type FontId = 'kopub-batang' | 'kopub-batang-bold' | 'kopub-dotum' | 'pretendard'
export type CardSizePreset = 'portrait' | 'square' | 'story' | 'custom'
export interface CardSize { width: number; height: number }

export interface CardDesignSettings {
  backgroundColor: string
  textColor: string
  fontId: FontId
  fontSize: number
  letterSpacing: number
  showPageNumber: boolean
}
export interface CardOverlayImage { src: string; x: number; y: number; width: number }
export interface CardPage {
  id: string
  templateId: TemplateId
  variantId: string
  content: Record<string, string | string[]>
  image?: string | null
  overlayImage?: CardOverlayImage | null
  design?: CardDesignSettings
}
export interface Project { schemaVersion: number; id: string; name: string; createdAt: string; updatedAt: string; canvasSize: CardSize; pages: CardPage[] }
export interface FieldDef { key: string; label: string; type: 'text' | 'textarea' | 'list' | 'image'; placeholder?: string; maxLength?: number; required?: boolean }
export type DesignCapability = 'backgroundColor' | 'textColor' | 'fontId' | 'fontSize' | 'letterSpacing' | 'showPageNumber'
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
