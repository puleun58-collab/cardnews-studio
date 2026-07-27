import { normalizeDesign } from '../../brand/cardDesign'
import { appConfig } from '../../config/appConfig'
import { clone, createId } from '../shared'
import { templateRegistry } from '../../registry/templateRegistry'
import type { CardPage, TemplateId } from '../../types'

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

const findMappedValue = (page: CardPage, targetKey: string) => {
  if (targetKey in page.content) return page.content[targetKey]
  const aliases = semanticAliases[targetKey]
  const sourceKey = aliases?.find((key) => key in page.content)
  return sourceKey ? page.content[sourceKey] : undefined
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

export function replaceTemplateData(page: CardPage, templateId: TemplateId): CardPage | null {
  if (!(templateId in templateRegistry) || page.templateId === templateId) return null
  const target = templateRegistry[templateId]
  const content = clone(target.sampleContent.content)
  for (const field of target.fields) {
    if (field.type === 'image') continue
    const mapped = findMappedValue(page, field.key)
    if (mapped == null) continue
    content[field.key] = field.type === 'list'
      ? (Array.isArray(mapped) ? mapped.slice(0, 5) : [String(mapped)])
      : (Array.isArray(mapped) ? mapped.join(' ') : String(mapped)).slice(0, field.maxLength)
  }
  return {
    ...page,
    templateId,
    variantId: target.defaultVariant,
    content,
    design: normalizeDesign(page.design, target.defaultDesign),
  }
}
