import { normalizeDesign } from '../../brand/cardDesign'
import { appConfig } from '../../config/appConfig'
import { clone, createId } from '../shared'
import { templateRegistry } from '../../registry/templateRegistry'
import type { CardPage, DesignCapability, TemplateId } from '../../types'

export interface TemplateFieldChange {
  sourceKey?: string
  targetKey?: string
  sourceValue?: string | string[]
  targetValue?: string | string[]
  reason?: string
}

export interface TemplateMappingResult {
  page: CardPage
  preservedFields: TemplateFieldChange[]
  convertedFields: TemplateFieldChange[]
  truncatedFields: TemplateFieldChange[]
  discardedFields: TemplateFieldChange[]
  defaultedFields: TemplateFieldChange[]
  preservedImages: string[]
  unsupportedImages: string[]
  unsupportedDesignProperties: DesignCapability[]
  hasPotentialDataLoss: boolean
}

const semanticAliases: Record<string, readonly string[]> = {
  title: ['title', 'quote', 'body'],
  quote: ['quote', 'title', 'body'],
  body: ['body', 'subtitle', 'description', 'commentary', 'quote'],
  subtitle: ['subtitle', 'description', 'body', 'commentary'],
  description: ['description', 'subtitle', 'body', 'commentary'],
  commentary: ['commentary', 'description', 'body', 'subtitle'],
  closing: ['closing', 'conclusion', 'cta', 'note', 'caption', 'subtitle'],
  conclusion: ['conclusion', 'closing', 'cta', 'description'],
  cta: ['cta', 'closing', 'conclusion', 'caption'],
  note: ['note', 'caption', 'description', 'subtitle'],
  caption: ['caption', 'note', 'subtitle'],
  kicker: ['kicker'],
  source: ['source'],
}

const findMappedValue = (page: CardPage, targetKey: string, used: Set<string>, reservedTargetKeys: Set<string>) => {
  if (targetKey in page.content && !used.has(targetKey)) return { sourceKey: targetKey, value: page.content[targetKey] }
  const aliases = semanticAliases[targetKey]
  const sourceKey = aliases?.find((key) => key in page.content && !used.has(key) && !reservedTargetKeys.has(key))
  return sourceKey ? { sourceKey, value: page.content[sourceKey] } : undefined
}

export function createPage(templateId: TemplateId = 'midnight-quote'): CardPage {
  const manifest = templateRegistry[templateId]
  return {
    id: createId(),
    templateId,
    variantId: manifest.defaultVariant,
    content: clone(manifest.sampleContent.content),
    backgroundImage: null,
    image: manifest.sampleContent.image ?? null,
    overlayImage: null,
    design: manifest.defaultDesign ? normalizeDesign(manifest.defaultDesign, manifest.defaultDesign) : undefined,
  }
}

export function duplicatePageData(page: CardPage, existingIds: Set<string>): CardPage {
  let id = createId()
  while (existingIds.has(id)) id = createId()
  return { ...clone(page), id }
}

export function reorderPageData(pages: CardPage[], oldIndex: number, newIndex: number): CardPage[] | null {
  if (!Number.isInteger(oldIndex) || !Number.isInteger(newIndex)) return null
  if (oldIndex < 0 || newIndex < 0 || oldIndex >= pages.length || newIndex >= pages.length || oldIndex === newIndex) return null
  const next = [...pages]
  const [item] = next.splice(oldIndex, 1)
  if (!item) return null
  next.splice(newIndex, 0, item)
  return next
}

export function deletePageData(pages: CardPage[], pageId: string): CardPage[] | null {
  if (pages.length <= 1 || !pages.some((page) => page.id === pageId)) return null
  return pages.filter((page) => page.id !== pageId)
}

export function insertDuplicatePage(pages: CardPage[], pageId: string): CardPage[] | null {
  if (pages.length >= appConfig.maxPages) return null
  const index = pages.findIndex((page) => page.id === pageId)
  if (index < 0) return null
  const copy = duplicatePageData(pages[index], new Set(pages.map((page) => page.id)))
  const next = [...pages]
  next.splice(index + 1, 0, copy)
  return next
}

export function analyzeTemplateMapping(page: CardPage, templateId: TemplateId): TemplateMappingResult | null {
  if (!(templateId in templateRegistry) || page.templateId === templateId) return null
  const source = templateRegistry[page.templateId]
  const target = templateRegistry[templateId]
  const content = clone(target.sampleContent.content)
  const preservedFields: TemplateFieldChange[] = []
  const convertedFields: TemplateFieldChange[] = []
  const truncatedFields: TemplateFieldChange[] = []
  const discardedFields: TemplateFieldChange[] = []
  const defaultedFields: TemplateFieldChange[] = []
  const used = new Set<string>()
  const reservedTargetKeys = new Set(target.fields.filter((field) => field.type !== 'image').map((field) => field.key))
  for (const field of target.fields) {
    if (field.type === 'image') continue
    const mapped = findMappedValue(page, field.key, used, reservedTargetKeys)
    if (!mapped) {
      defaultedFields.push({
        targetKey: field.key,
        targetValue: content[field.key],
        reason: '매핑할 값이 없어 새 템플릿의 기본값을 사용합니다.',
      })
      continue
    }
    used.add(mapped.sourceKey)
    const sourceValue = mapped.value
    let targetValue: string | string[]
    let truncated = false
    if (field.type === 'list') {
      const values = Array.isArray(sourceValue) ? sourceValue : [String(sourceValue)]
      targetValue = values.slice(0, 5)
      truncated = values.length > targetValue.length
    } else {
      const value = Array.isArray(sourceValue) ? sourceValue.join(' ') : String(sourceValue)
      targetValue = field.maxLength ? value.slice(0, field.maxLength) : value
      truncated = targetValue.length < value.length
    }
    content[field.key] = targetValue
    const change = { sourceKey: mapped.sourceKey, targetKey: field.key, sourceValue, targetValue }
    if (truncated) {
      truncatedFields.push({ ...change, reason: field.type === 'list' ? '목록은 최대 5개까지 유지됩니다.' : `최대 ${field.maxLength}자까지 유지됩니다.` })
    } else if (mapped.sourceKey === field.key) {
      preservedFields.push(change)
    } else {
      convertedFields.push({ ...change, reason: '의미가 비슷한 필드로 이동합니다.' })
    }
  }
  for (const [sourceKey, sourceValue] of Object.entries(page.content)) {
    const hasValue = Array.isArray(sourceValue) ? sourceValue.some(Boolean) : Boolean(sourceValue)
    if (!used.has(sourceKey) && hasValue) {
      discardedFields.push({ sourceKey, sourceValue, reason: '새 템플릿에 대응하는 필드가 없습니다.' })
    }
  }
  const sourceCapabilities = source.capabilities ?? []
  const targetCapabilities = new Set(target.capabilities ?? [])
  const unsupportedDesignProperties = sourceCapabilities.filter((capability) => !targetCapabilities.has(capability))
  const preservedImages = [
    page.backgroundImage ? '배경 이미지' : null,
    page.image ? '콘텐츠 이미지' : null,
    page.overlayImage ? '떠있는 이미지' : null,
  ].filter((value): value is string => Boolean(value))
  const targetSupportsContentImage = target.fields.some((field) => field.type === 'image')
  const unsupportedImages = page.image && !targetSupportsContentImage ? ['콘텐츠 이미지 영역'] : []
  const replacement = {
    ...page,
    templateId,
    variantId: target.defaultVariant,
    content,
    design: normalizeDesign(page.design, target.defaultDesign),
  }
  return {
    page: replacement,
    preservedFields,
    convertedFields,
    truncatedFields,
    discardedFields,
    defaultedFields,
    preservedImages,
    unsupportedImages,
    unsupportedDesignProperties,
    hasPotentialDataLoss: truncatedFields.length > 0
      || discardedFields.length > 0
      || unsupportedImages.length > 0
      || unsupportedDesignProperties.length > 0,
  }
}

export function replaceTemplateData(page: CardPage, templateId: TemplateId): CardPage | null {
  return analyzeTemplateMapping(page, templateId)?.page ?? null
}
