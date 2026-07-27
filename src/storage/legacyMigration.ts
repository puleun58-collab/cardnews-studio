import { appConfig } from '../config/appConfig'
import { nowIso } from '../domain/shared'
import type { ProjectRepository } from '../repositories/projectRepository'
import type { Project } from '../types'
import { normalizeProjectData } from '../validation/projectSchema'

const LEGACY_MIGRATION_META_KEY = 'legacy-local-storage-migration-v1'

export type LegacyMigrationResult = {
  migrated: number
  activeProjectId: string | null
  activePageId: string | null
  backupPolicy: 'legacy-key-retained'
  performed?: boolean
}

type LegacyMigrationMeta = LegacyMigrationResult & {
  completedAt: string
}

export class LegacyStorageMigrationError extends Error {
  readonly userMessage: string

  constructor(message: string, userMessage: string) {
    super(message)
    this.name = 'LegacyStorageMigrationError'
    this.userMessage = userMessage
  }
}

function preserveCorruptData(raw: string) {
  const prefix = `${appConfig.storageKey}-corrupt-`
  const alreadyPreserved = Object.keys(localStorage).some((key) => key.startsWith(prefix) && localStorage.getItem(key) === raw)
  if (alreadyPreserved) return
  try {
    localStorage.setItem(`${prefix}${Date.now()}`, raw)
  } catch {
    // The original legacy key remains untouched even if the additional copy cannot be written.
  }
}

export async function migrateLegacyLocalStorage(repository: ProjectRepository): Promise<LegacyMigrationResult> {
  const completed = await repository.getMeta<LegacyMigrationMeta>(LEGACY_MIGRATION_META_KEY)
  if (completed) return { ...completed, performed: false }
  const raw = localStorage.getItem(appConfig.storageKey)
  if (!raw) {
    const result: LegacyMigrationMeta = {
      migrated: 0,
      activeProjectId: null,
      activePageId: null,
      backupPolicy: 'legacy-key-retained',
      completedAt: nowIso(),
    }
    await repository.setMeta(LEGACY_MIGRATION_META_KEY, result)
    return { ...result, performed: true }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    preserveCorruptData(raw)
    throw new LegacyStorageMigrationError(
      error instanceof Error ? error.message : 'Legacy JSON parsing failed.',
      '기존 저장 데이터가 손상되어 자동 이전하지 못했습니다. 원본과 손상 데이터 백업을 보존했습니다.',
    )
  }
  if (!parsed || typeof parsed !== 'object') {
    preserveCorruptData(raw)
    throw new LegacyStorageMigrationError('Legacy root is not an object.', '기존 저장 데이터 형식이 올바르지 않아 원본을 보존했습니다.')
  }
  const legacy = parsed as Record<string, unknown>
  if (!Array.isArray(legacy.projects)) {
    preserveCorruptData(raw)
    throw new LegacyStorageMigrationError('Legacy projects is not an array.', '기존 프로젝트 목록 형식이 올바르지 않아 원본을 보존했습니다.')
  }
  let projects: Project[]
  try {
    projects = legacy.projects.map(normalizeProjectData)
    const projectIds = new Set(projects.map((project) => project.id))
    if (projectIds.size !== projects.length) throw new Error('Duplicate project IDs in legacy data.')
  } catch (error) {
    preserveCorruptData(raw)
    throw new LegacyStorageMigrationError(
      error instanceof Error ? error.message : String(error),
      '기존 프로젝트를 검증하지 못해 이전을 중단했습니다. 기존 데이터는 삭제하지 않았습니다.',
    )
  }
  for (const project of projects) await repository.saveProject(project)
  const activeProjectId = typeof legacy.activeProjectId === 'string' && projects.some((project) => project.id === legacy.activeProjectId)
    ? legacy.activeProjectId
    : null
  const activeProject = projects.find((project) => project.id === activeProjectId)
  const activePageId = typeof legacy.activePageId === 'string' && activeProject?.pages.some((page) => page.id === legacy.activePageId)
    ? legacy.activePageId
    : null
  const result: LegacyMigrationMeta = {
    migrated: projects.length,
    activeProjectId,
    activePageId,
    backupPolicy: 'legacy-key-retained',
    completedAt: nowIso(),
  }
  await repository.setMeta(LEGACY_MIGRATION_META_KEY, result)
  return { ...result, performed: true }
}
