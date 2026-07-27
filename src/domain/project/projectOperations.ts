import { defaultCardSize, normalizeCardSize } from '../../brand/cardSize'
import { appConfig } from '../../config/appConfig'
import type { CardSize, Project, TemplateId } from '../../types'
import { createPage } from '../page/pageOperations'
import { clone, createId, nowIso } from '../shared'

export function createProjectData(
  name: string,
  templateId: TemplateId = 'midnight-quote',
  templateIds?: TemplateId[],
  canvasSize: CardSize = defaultCardSize,
  initialImage?: string,
): Project {
  const pages = (templateIds?.length ? templateIds : [templateId]).slice(0, appConfig.maxPages).map(createPage)
  if (initialImage && pages[0]) pages[0] = { ...pages[0], backgroundImage: initialImage }
  const timestamp = nowIso()
  return {
    schemaVersion: appConfig.projectSchemaVersion,
    id: createId(),
    name: name.trim().slice(0, 80) || '새 프로젝트',
    createdAt: timestamp,
    updatedAt: timestamp,
    canvasSize: normalizeCardSize(canvasSize),
    pages,
  }
}

export function duplicateProjectData(project: Project, existingIds: Set<string>): Project {
  let id = createId()
  while (existingIds.has(id)) id = createId()
  const pageIds = new Set<string>()
  const pages = project.pages.map((page) => {
    let pageId = createId()
    while (pageIds.has(pageId)) pageId = createId()
    pageIds.add(pageId)
    return { ...clone(page), id: pageId }
  })
  const timestamp = nowIso()
  return {
    ...clone(project),
    schemaVersion: appConfig.projectSchemaVersion,
    id,
    name: `${project.name} 복사본`.slice(0, 80),
    createdAt: timestamp,
    updatedAt: timestamp,
    pages,
  }
}
