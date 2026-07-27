import { appConfig } from '../config/appConfig'
import { clone, isRecord } from '../domain/shared'

export type ProjectMigration = (input: Record<string, unknown>) => Record<string, unknown>

const legacyKoreanFonts: Record<string, string> = {
  'bebas-neue': 'pretendard',
  georgia: 'noto-serif-kr',
  'courier-new': 'pretendard',
  'kopub-batang': 'noto-serif-kr',
  'kopub-batang-bold': 'noto-serif-kr',
  'kopub-dotum': 'noto-sans-kr',
}

const legacyEnglishFonts: Record<string, string> = {
  'bebas-neue': 'oswald',
  georgia: 'cormorant-garamond',
  'courier-new': 'ibm-plex-mono',
}

export const migrateV1ToV2: ProjectMigration = (input) => {
  const project = clone(input)
  const pages = Array.isArray(project.pages) ? project.pages : []
  project.pages = pages.map((value) => {
    if (!isRecord(value) || !isRecord(value.design)) return value
    const page = clone(value)
    const design = clone(value.design)
    const storedFont = typeof design.fontId === 'string' ? design.fontId : ''
    if (legacyKoreanFonts[storedFont]) design.fontId = legacyKoreanFonts[storedFont]
    if (typeof design.englishFontId !== 'string' && legacyEnglishFonts[storedFont]) {
      design.englishFontId = legacyEnglishFonts[storedFont]
    }
    page.design = design
    return page
  })
  project.schemaVersion = 2
  return project
}

export const projectMigrations: Record<number, ProjectMigration> = {
  1: migrateV1ToV2,
}

export class ProjectMigrationError extends Error {
  readonly userMessage: string

  constructor(message: string, userMessage = '프로젝트 데이터를 최신 형식으로 변환하지 못했습니다.') {
    super(message)
    this.name = 'ProjectMigrationError'
    this.userMessage = userMessage
  }
}

export function migrateProjectData(input: unknown): Record<string, unknown> {
  if (!isRecord(input)) throw new ProjectMigrationError('Project root is not an object.', '올바르지 않은 프로젝트 파일입니다.')
  let current = clone(input)
  let version = Number(current.schemaVersion ?? 1)
  if (!Number.isInteger(version) || version < 1) {
    throw new ProjectMigrationError(`Invalid schemaVersion: ${String(current.schemaVersion)}`, '프로젝트 버전 정보가 올바르지 않습니다.')
  }
  if (version > appConfig.projectSchemaVersion) {
    throw new ProjectMigrationError(
      `Unsupported future schemaVersion: ${version}`,
      '더 새로운 버전의 파일입니다. 앱을 업데이트해 주세요.',
    )
  }
  while (version < appConfig.projectSchemaVersion) {
    const migration = projectMigrations[version]
    if (!migration) throw new ProjectMigrationError(`Missing migration from version ${version}.`)
    current = migration(current)
    const nextVersion = Number(current.schemaVersion)
    if (nextVersion !== version + 1) {
      throw new ProjectMigrationError(`Migration ${version} did not advance exactly one version.`)
    }
    version = nextVersion
  }
  return current
}
