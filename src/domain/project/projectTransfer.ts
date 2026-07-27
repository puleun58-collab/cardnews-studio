import { appConfig } from '../../config/appConfig'
import { createId, nowIso } from '../shared'
import { normalizeProjectData } from '../../validation/projectSchema'
import type { Project } from '../../types'

const parseJson = (text: string) => {
  if (new Blob([text]).size > appConfig.maxBackupJsonBytes) {
    throw new Error('JSON 백업 파일은 100MB 이하여야 합니다.')
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error('JSON 문법이 올바르지 않습니다.')
  }
}

const remapImportedIds = (project: Project): Project => ({
  ...project,
  id: createId(),
  pages: project.pages.map((page) => ({ ...page, id: createId() })),
  updatedAt: nowIso(),
})

export function importProjectsJson(text: string): Project[] {
  const parsed = parseJson(text)
  const envelope = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
  if (Number(envelope.schemaVersion ?? 1) > appConfig.projectSchemaVersion) {
    throw new Error('더 새로운 버전의 파일입니다. 앱을 업데이트해 주세요.')
  }
  const rawProjects = Array.isArray(envelope.projects)
    ? envelope.projects
    : [envelope.project ?? parsed]
  if (!rawProjects.length) throw new Error('백업 파일에 프로젝트가 없습니다.')
  return rawProjects.map((project) => remapImportedIds(normalizeProjectData(project)))
}

export function importProjectJson(text: string): Project {
  return importProjectsJson(text)[0]
}

export function exportProjectJson(project: Project) {
  return JSON.stringify({
    schemaVersion: appConfig.projectSchemaVersion,
    exportedAt: nowIso(),
    imagePolicy: 'embedded',
    app: { name: appConfig.appName },
    project,
  }, null, 2)
}

export function exportWorkspaceJson(projects: Project[]) {
  return JSON.stringify({
    schemaVersion: appConfig.projectSchemaVersion,
    exportedAt: nowIso(),
    imagePolicy: 'embedded',
    app: { name: appConfig.appName },
    projects,
  }, null, 2)
}

const withoutImages = (project: Project): Project => ({
  ...structuredClone(project),
  pages: project.pages.map((page) => ({
    ...structuredClone(page),
    backgroundImage: null,
    image: null,
    overlayImage: null,
  })),
})

export function exportLightweightWorkspaceJson(projects: Project[]) {
  return JSON.stringify({
    schemaVersion: appConfig.projectSchemaVersion,
    exportedAt: nowIso(),
    imagePolicy: 'omitted',
    app: { name: appConfig.appName },
    projects: projects.map(withoutImages),
  }, null, 2)
}
