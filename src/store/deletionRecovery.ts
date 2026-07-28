import { appConfig } from '../config/appConfig'
import type { CardPage, Project } from '../types'

export interface PendingProjectDeletion {
  type: 'project'
  operationId: string
  project: Project
  originalIndex: number
  previousActiveProjectId: string | null
  previousActivePageId: string | null
  createdAt: number
  expiresAt: number
}

export interface PendingPageDeletion {
  type: 'page'
  operationId: string
  projectId: string
  page: CardPage
  originalIndex: number
  wasActive: boolean
  previousActivePageId: string | null
  createdAt: number
  expiresAt: number
}

export type PendingDeletion = PendingProjectDeletion | PendingPageDeletion

export function appendPendingDeletion(
  pending: PendingDeletion[],
  operation: PendingDeletion,
  maxPending = appConfig.maxPendingDeletions,
) {
  const all = [...pending, operation]
  const overflowCount = Math.max(0, all.length - maxPending)
  return {
    visible: all.slice(overflowCount),
    overflow: all.slice(0, overflowCount),
  }
}

export function restoreProjectAtOriginalIndex(projects: Project[], operation: PendingProjectDeletion): Project[] | null {
  if (projects.some((project) => project.id === operation.project.id)) return null
  const restored = [...projects]
  restored.splice(Math.min(Math.max(0, operation.originalIndex), restored.length), 0, structuredClone(operation.project))
  return restored
}

export function selectPageAfterDeletion(project: Project, pageId: string, activePageId: string | null) {
  if (project.pages.length <= 1) return null
  const index = project.pages.findIndex((page) => page.id === pageId)
  if (index < 0) return null
  const pages = project.pages.filter((page) => page.id !== pageId)
  const nextActivePageId = activePageId === pageId
    ? pages[index]?.id ?? pages[index - 1]?.id ?? pages[0]?.id ?? null
    : activePageId
  return { page: project.pages[index], pages, originalIndex: index, nextActivePageId }
}

export function restorePageAtOriginalIndex(
  project: Project,
  operation: PendingPageDeletion,
  maxPages = appConfig.maxPages,
): Project | null {
  if (project.id !== operation.projectId) return null
  if (project.pages.length >= maxPages || project.pages.some((page) => page.id === operation.page.id)) return null
  const pages = [...project.pages]
  pages.splice(Math.min(Math.max(0, operation.originalIndex), pages.length), 0, structuredClone(operation.page))
  return { ...project, pages }
}
