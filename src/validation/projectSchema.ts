import { normalizeDesign } from '../brand/cardDesign'
import { defaultCardSize } from '../brand/cardSize'
import { appConfig } from '../config/appConfig'
import { createId, isRecord, isValidIsoDate, nowIso } from '../domain/shared'
import { normalizeOverlayImage } from '../engine/overlayImage'
import { migrateProjectData, ProjectMigrationError } from '../migrations/projectMigrations'
import { templateRegistry } from '../registry/templateRegistry'
import type { CardPage, CardSize, Project, TemplateId } from '../types'

export type ProjectValidationIssue = {
  path: string
  message: string
}

export class ProjectValidationError extends Error {
  readonly issues: ProjectValidationIssue[]
  readonly userMessage: string

  constructor(issues: ProjectValidationIssue[], userMessage = '프로젝트 데이터 형식이 올바르지 않습니다.') {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'))
    this.name = 'ProjectValidationError'
    this.issues = issues
    this.userMessage = userMessage
  }
}

const fail = (path: string, message: string, userMessage?: string): never => {
  throw new ProjectValidationError([{ path, message }], userMessage)
}

const validId = (value: unknown) => typeof value === 'string' && value.trim().length > 0 && value.length <= 128
const validImageSource = (value: string) =>
  /^data:image\/(jpeg|png|webp);base64,/i.test(value)
  || /^(blob:|https?:\/\/|\/)/i.test(value)

function parseImage(value: unknown, path: string): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || value.length > appConfig.maxImageBytes * 2 || !validImageSource(value)) {
    return fail(path, 'Unsupported or oversized image source.', '지원하지 않는 이미지 참조가 포함되어 있습니다.')
  }
  return value
}

function parseCardSize(value: unknown): CardSize {
  if (value == null) return { ...defaultCardSize }
  if (!isRecord(value)) return fail('canvasSize', 'Expected an object.')
  const width = Number(value.width)
  const height = Number(value.height)
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 320 || width > 4096 || height < width || height > 4096) {
    return fail('canvasSize', 'Dimensions must be integers between 320 and 4096 and height must be at least width.', '캔버스 크기가 허용 범위를 벗어났습니다.')
  }
  return { width, height }
}

function parseContent(value: unknown, templateId: TemplateId, pageIndex: number): Record<string, string | string[]> {
  if (value != null && !isRecord(value)) return fail(`pages[${pageIndex}].content`, 'Expected an object.')
  const source = isRecord(value) ? value : {}
  const manifest = templateRegistry[templateId]
  const content: Record<string, string | string[]> = {}
  for (const field of manifest.fields) {
    if (field.type === 'image') continue
    const raw = source[field.key]
    if (field.type === 'list') {
      if (raw != null && !Array.isArray(raw)) return fail(`pages[${pageIndex}].content.${field.key}`, 'Expected a string array.')
      const items = Array.isArray(raw) ? raw : []
      if (items.length > 5 || items.some((item) => typeof item !== 'string')) {
        return fail(`pages[${pageIndex}].content.${field.key}`, 'Expected at most five string items.')
      }
      content[field.key] = items.map((item) => item.slice(0, field.maxLength ?? 500))
      continue
    }
    if (raw != null && typeof raw !== 'string') return fail(`pages[${pageIndex}].content.${field.key}`, 'Expected a string.')
    content[field.key] = String(raw ?? '').slice(0, field.maxLength)
  }
  return content
}

export function normalizePageData(value: unknown, pageIndex = 0): CardPage {
  if (!isRecord(value)) return fail(`pages[${pageIndex}]`, 'Expected an object.')
  if (typeof value.templateId !== 'string' || !(value.templateId in templateRegistry)) {
    return fail(`pages[${pageIndex}].templateId`, 'Unknown template.', '알 수 없는 템플릿이 포함되어 있습니다.')
  }
  const templateId = value.templateId as TemplateId
  const manifest = templateRegistry[templateId]
  const variantId = typeof value.variantId === 'string' && manifest.variants.some((variant) => variant.id === value.variantId)
    ? value.variantId
    : manifest.defaultVariant
  const overlay = value.overlayImage == null ? null : normalizeOverlayImage(value.overlayImage)
  if (value.overlayImage != null && !overlay) {
    return fail(`pages[${pageIndex}].overlayImage`, 'Invalid overlay image.')
  }
  return {
    id: validId(value.id) ? value.id as string : createId(),
    templateId,
    variantId,
    content: parseContent(value.content, templateId, pageIndex),
    backgroundImage: parseImage(value.backgroundImage, `pages[${pageIndex}].backgroundImage`),
    image: parseImage(value.image, `pages[${pageIndex}].image`),
    overlayImage: overlay,
    design: normalizeDesign(isRecord(value.design) ? value.design : undefined, manifest.defaultDesign),
  }
}

export function normalizeProjectData(value: unknown): Project {
  let migrated: Record<string, unknown>
  try {
    migrated = migrateProjectData(value)
  } catch (error) {
    if (error instanceof ProjectMigrationError) throw error
    throw new ProjectMigrationError(error instanceof Error ? error.message : String(error))
  }
  if (!Array.isArray(migrated.pages) || migrated.pages.length < 1 || migrated.pages.length > appConfig.maxPages) {
    return fail('pages', `Expected between 1 and ${appConfig.maxPages} pages.`, `페이지는 1~${appConfig.maxPages}장이어야 합니다.`)
  }
  const pages = migrated.pages.map(normalizePageData)
  const pageIds = new Set<string>()
  for (const [index, page] of pages.entries()) {
    if (pageIds.has(page.id)) return fail(`pages[${index}].id`, 'Duplicate page id.', '중복된 페이지 ID가 포함되어 있습니다.')
    pageIds.add(page.id)
  }
  const name = typeof migrated.name === 'string' ? migrated.name.trim().slice(0, 80) : ''
  const createdAt = migrated.createdAt == null ? nowIso() : migrated.createdAt
  const updatedAt = migrated.updatedAt == null ? createdAt : migrated.updatedAt
  if (!isValidIsoDate(createdAt)) return fail('createdAt', 'Expected an ISO date string.')
  if (!isValidIsoDate(updatedAt)) return fail('updatedAt', 'Expected an ISO date string.')
  return {
    schemaVersion: appConfig.projectSchemaVersion,
    id: validId(migrated.id) ? migrated.id as string : createId(),
    name: name || '가져온 프로젝트',
    createdAt,
    updatedAt,
    canvasSize: parseCardSize(migrated.canvasSize),
    pages,
  }
}

export function getUserFacingDataError(error: unknown): string {
  if (error instanceof ProjectValidationError || error instanceof ProjectMigrationError) return error.userMessage
  return error instanceof Error ? error.message : '프로젝트 데이터를 처리하지 못했습니다.'
}
