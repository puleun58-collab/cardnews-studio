import { create } from 'zustand'
import { normalizeDesign } from '../brand/cardDesign'
import { normalizeCardSize } from '../brand/cardSize'
import { appConfig } from '../config/appConfig'
import {
  analyzeTemplateMapping,
  createPage,
  insertDuplicatePage,
  reorderPageData,
  type TemplateMappingResult,
} from '../domain/page/pageOperations'
import { createProjectData, duplicateProjectData } from '../domain/project/projectOperations'
import { exportLightweightWorkspaceJson, exportProjectJson, exportWorkspaceJson, importProjectsJson } from '../domain/project/projectTransfer'
import { createId, nowIso } from '../domain/shared'
import { normalizeOverlayImage } from '../engine/overlayImage'
import { templateRegistry } from '../registry/templateRegistry'
import { IndexedDbProjectRepository } from '../repositories/indexedDbProjectRepository'
import { migrateLegacyLocalStorage, LegacyStorageMigrationError } from '../storage/legacyMigration'
import { classifyStorageError, type StorageFailureKind } from '../storage/storageErrors'
import type { CardPage, CardSize, Project, ProjectEditorSession, TemplateId } from '../types'
import { getUserFacingDataError, normalizeProjectData } from '../validation/projectSchema'
import { EditorSessionCoordinator } from './editorSessionCoordinator'
import {
  appendPendingDeletion,
  restorePageAtOriginalIndex,
  restoreProjectAtOriginalIndex,
  selectPageAfterDeletion,
  type PendingDeletion,
  type PendingPageDeletion,
  type PendingProjectDeletion,
} from './deletionRecovery'
import { initialSaveStatus, PersistenceCoordinator, type SaveStatus } from './persistenceCoordinator'
import {
  emptyProjectHistory,
  pushHistory,
  redoHistory,
  undoHistory,
  type HistoryEntry,
  type ProjectHistory,
} from './projectHistory'

type HydrationState = 'loading' | 'ready' | 'error'
type SessionState = { activeProjectId: string | null; activePageId: string | null }

export type { PendingDeletion, PendingPageDeletion, PendingProjectDeletion } from './deletionRecovery'

export interface StudioState {
  projects: Project[]
  activeProjectId: string | null
  activePageId: string | null
  editorSessions: Record<string, ProjectEditorSession>
  histories: Record<string, ProjectHistory>
  pendingDeletions: PendingDeletion[]
  operationMessage: string
  hydrationState: HydrationState
  hydrationError: string | null
  migrationNotice: string | null
  storageError: string | null
  storageFailureKind: StorageFailureKind | null
  saveStatus: SaveStatus
  initialize(): Promise<void>
  createProject(name: string, templateId?: TemplateId, templateIds?: TemplateId[], canvasSize?: CardSize, initialImage?: string): void
  openProject(id: string): void
  goHome(): void
  renameProject(id: string, name: string): void
  duplicateProject(id: string): void
  deleteProject(id: string): void
  updateProjectCanvasSize(id: string, canvasSize: CardSize): void
  setActivePage(id: string): void
  updateEditorSession(projectId: string, patch: Partial<Omit<ProjectEditorSession, 'projectId' | 'updatedAt'>>, immediate?: boolean): void
  addPage(templateId?: TemplateId): void
  duplicatePage(id: string): void
  deletePage(id: string): void
  reorderPages(oldIndex: number, newIndex: number): void
  updatePage(id: string, patch: Partial<CardPage>): void
  analyzePageTemplate(id: string, templateId: TemplateId): TemplateMappingResult | null
  replacePageTemplate(id: string, templateId: TemplateId, analysis?: TemplateMappingResult): void
  undo(): void
  redo(): void
  undoDeletion(operationId: string): Promise<boolean>
  finalizeDeletion(operationId: string): Promise<void>
  dismissOperationMessage(): void
  importProject(text: string): void
  retrySave(): Promise<void>
  flushPending(): Promise<void>
  cleanupUnusedImages(): Promise<number>
  clearBrowserStorage(): Promise<void>
  clearStorageError(): void
}

const PENDING_DELETIONS_META_KEY = 'pending-deletions-v1'
const repository = new IndexedDbProjectRepository()
const persistence = new PersistenceCoordinator(repository)
const editorSessionPersistence = new EditorSessionCoordinator(repository)
let initialization: Promise<void> | null = null
let pendingWrite: Promise<void> = Promise.resolve()
const deletionTimers = new Map<string, ReturnType<typeof setTimeout>>()
const resolvingDeletions = new Set<string>()
const detachedDeletions = new Map<string, PendingDeletion>()

function readSession(): SessionState {
  try {
    const value = localStorage.getItem(appConfig.sessionStorageKey)
    if (!value) return { activeProjectId: null, activePageId: null }
    const parsed = JSON.parse(value) as Partial<SessionState>
    return {
      activeProjectId: typeof parsed.activeProjectId === 'string' ? parsed.activeProjectId : null,
      activePageId: typeof parsed.activePageId === 'string' ? parsed.activePageId : null,
    }
  } catch {
    return { activeProjectId: null, activePageId: null }
  }
}

function persistSession() {
  const { activeProjectId, activePageId } = useStudioStore.getState()
  try {
    localStorage.setItem(appConfig.sessionStorageKey, JSON.stringify({ activeProjectId, activePageId }))
  } catch (error) {
    setPersistentStorageError(error)
  }
}

function writeRecoveryJournal() {
  const dirtyIds = new Set(persistence.getDirtyProjectIds())
  if (!dirtyIds.size) return
  const projects = useStudioStore.getState().projects.filter((project) => dirtyIds.has(project.id))
  if (!projects.length) return
  try {
    sessionStorage.setItem(appConfig.recoveryStorageKey, JSON.stringify({ projects }))
  } catch (error) {
    setPersistentStorageError(error)
  }
}

function readRecoveryJournal(): Project[] {
  try {
    const raw = sessionStorage.getItem(appConfig.recoveryStorageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { projects?: unknown[] }
    return Array.isArray(parsed.projects) ? parsed.projects.map(normalizeProjectData) : []
  } catch {
    return []
  }
}

function setPersistentStorageError(error: unknown) {
  const failure = classifyStorageError(error)
  useStudioStore.setState({ storageError: failure.message, storageFailureKind: failure.kind })
}

function activeProject(state: StudioState) {
  return state.projects.find((project) => project.id === state.activeProjectId) ?? null
}

function markProject(projectId: string, options: { immediate?: boolean; pageIds?: Iterable<string> } = {}) {
  persistence.markDirty(projectId, options)
}

function persistPending(snapshot = useStudioStore.getState().pendingDeletions) {
  const value = structuredClone(snapshot)
  pendingWrite = pendingWrite
    .catch(() => undefined)
    .then(() => value.length
      ? repository.setMeta(PENDING_DELETIONS_META_KEY, value)
      : repository.deleteMeta(PENDING_DELETIONS_META_KEY))
    .catch(setPersistentStorageError)
  return pendingWrite
}

function scheduleDeletion(operation: PendingDeletion) {
  const existing = deletionTimers.get(operation.operationId)
  if (existing) clearTimeout(existing)
  const delay = Math.max(0, operation.expiresAt - Date.now())
  const timer = setTimeout(() => {
    deletionTimers.delete(operation.operationId)
    void useStudioStore.getState().finalizeDeletion(operation.operationId)
  }, delay)
  deletionTimers.set(operation.operationId, timer)
}

function clearDeletionTimer(operationId: string) {
  const timer = deletionTimers.get(operationId)
  if (timer) clearTimeout(timer)
  deletionTimers.delete(operationId)
}

function makeHistoryEntry(
  projectId: string,
  label: string,
  before: Project,
  after: Project,
  activePageIdBefore: string | null,
  activePageIdAfter: string | null,
  mergeKey?: string,
): HistoryEntry {
  return {
    id: createId(),
    projectId,
    label,
    before: structuredClone(before),
    after: structuredClone(after),
    activePageIdBefore,
    activePageIdAfter,
    createdAt: Date.now(),
    mergeKey,
  }
}

function validActivePage(project: Project, preferred: string | null | undefined) {
  return preferred && project.pages.some((page) => page.id === preferred)
    ? preferred
    : project.pages[0]?.id ?? null
}

function updateSessionSnapshot(projectId: string, patch: Partial<Omit<ProjectEditorSession, 'projectId' | 'updatedAt'>>, immediate = false) {
  const state = useStudioStore.getState()
  const current = state.editorSessions[projectId]
  const session: ProjectEditorSession = {
    ...current,
    projectId,
    lastActivePageId: current?.lastActivePageId ?? null,
    ...patch,
    updatedAt: nowIso(),
  }
  useStudioStore.setState({ editorSessions: { ...state.editorSessions, [projectId]: session } })
  editorSessionPersistence.set(session, immediate)
}

function addPendingOperation(operation: PendingDeletion) {
  const state = useStudioStore.getState()
  const { visible: next, overflow } = appendPendingDeletion(state.pendingDeletions, operation)
  useStudioStore.setState({ pendingDeletions: next })
  void persistPending(next)
  scheduleDeletion(operation)
  overflow.forEach((item) => {
    detachedDeletions.set(item.operationId, item)
    clearDeletionTimer(item.operationId)
    void state.finalizeDeletion(item.operationId)
  })
}

function describePatch(before: CardPage, patch: Partial<CardPage>) {
  if ('backgroundImage' in patch) return {
    label: patch.backgroundImage ? '배경 이미지 변경' : '배경 이미지 삭제',
    mergeKey: undefined,
    immediate: true,
  }
  if ('image' in patch) return {
    label: patch.image ? '콘텐츠 이미지 변경' : '콘텐츠 이미지 삭제',
    mergeKey: undefined,
    immediate: true,
  }
  if ('overlayImage' in patch) {
    if (!before.overlayImage && patch.overlayImage) return { label: '떠있는 이미지 추가', mergeKey: undefined, immediate: true }
    if (before.overlayImage && !patch.overlayImage) return { label: '떠있는 이미지 삭제', mergeKey: undefined, immediate: true }
    return { label: '떠있는 이미지 조정', mergeKey: `overlay:${before.id}`, immediate: false }
  }
  if ('design' in patch) return { label: '디자인 변경', mergeKey: `design:${before.id}`, immediate: false }
  if ('content' in patch) {
    const changedKey = Object.keys(patch.content ?? {}).find((key) => JSON.stringify(patch.content?.[key]) !== JSON.stringify(before.content[key])) ?? 'content'
    return { label: '내용 수정', mergeKey: `content:${before.id}:${changedKey}`, immediate: false }
  }
  return { label: '페이지 변경', mergeKey: `page:${before.id}`, immediate: false }
}

function protectedPendingImageSources(exceptOperationId?: string) {
  return useStudioStore.getState().pendingDeletions
    .filter((item): item is PendingPageDeletion => item.type === 'page' && item.operationId !== exceptOperationId)
    .flatMap((item) => [
      item.page.backgroundImage,
      item.page.image,
      item.page.overlayImage?.src,
    ])
    .filter((source): source is string => Boolean(source))
}

function createPendingForHistoryRemoval(
  before: Project,
  after: Project,
  activePageIdBefore: string | null,
): PendingPageDeletion | null {
  const afterIds = new Set(after.pages.map((page) => page.id))
  const originalIndex = before.pages.findIndex((page) => !afterIds.has(page.id))
  const page = before.pages[originalIndex]
  if (!page) return null
  const createdAt = Date.now()
  return {
    type: 'page',
    operationId: createId(),
    projectId: before.id,
    page: structuredClone(page),
    originalIndex,
    wasActive: activePageIdBefore === page.id,
    previousActivePageId: activePageIdBefore,
    createdAt,
    expiresAt: createdAt + appConfig.deletionUndoMs,
  }
}

export const useStudioStore = create<StudioState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  activePageId: null,
  editorSessions: {},
  histories: {},
  pendingDeletions: [],
  operationMessage: '',
  hydrationState: 'loading',
  hydrationError: null,
  migrationNotice: null,
  storageError: null,
  storageFailureKind: null,
  saveStatus: initialSaveStatus,

  async initialize() {
    if (initialization) return initialization
    initialization = (async () => {
      set({ hydrationState: 'loading', hydrationError: null })
      let migrationNotice: string | null = null
      let migratedSession: SessionState = { activeProjectId: null, activePageId: null }
      try {
        try {
          const result = await migrateLegacyLocalStorage(repository)
          migratedSession = { activeProjectId: result.activeProjectId, activePageId: result.activePageId }
          if (result.performed && result.migrated > 0) migrationNotice = `기존 프로젝트 ${result.migrated}개를 새 저장소로 안전하게 이전했습니다.`
        } catch (error) {
          if (error instanceof LegacyStorageMigrationError) {
            migrationNotice = error.userMessage
            set({ storageError: error.userMessage, storageFailureKind: 'unknown' })
          } else throw error
        }
        let projects = await repository.getAllProjects()
        const recoveredProjects = readRecoveryJournal()
        if (recoveredProjects.length) {
          const recoveredById = new Map(recoveredProjects.map((project) => [project.id, project]))
          projects = projects
            .map((project) => {
              const recovered = recoveredById.get(project.id)
              if (!recovered || recovered.updatedAt < project.updatedAt) return project
              recoveredById.delete(project.id)
              return recovered
            })
            .concat([...recoveredById.values()])
            .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
          for (const project of recoveredProjects) await repository.saveProject(project)
          sessionStorage.removeItem(appConfig.recoveryStorageKey)
        }
        const [editorSessions, storedPending] = await Promise.all([
          editorSessionPersistence.load(),
          repository.getMeta<PendingDeletion[]>(PENDING_DELETIONS_META_KEY),
        ])
        const pendingDeletions = Array.isArray(storedPending) ? storedPending : []
        for (const operation of pendingDeletions) {
          if (operation.type === 'project') {
            projects = projects.filter((project) => project.id !== operation.project.id)
          } else {
            projects = projects.map((project) => project.id === operation.projectId
              ? { ...project, pages: project.pages.filter((page) => page.id !== operation.page.id) }
              : project)
          }
        }
        const session = readSession()
        const requestedProjectId = session.activeProjectId ?? migratedSession.activeProjectId
        const selectedProject = projects.find((project) => project.id === requestedProjectId) ?? null
        const projectSession = selectedProject ? editorSessions[selectedProject.id] : null
        const requestedPageId = projectSession?.lastActivePageId ?? session.activePageId ?? migratedSession.activePageId
        const selectedPageId = selectedProject ? validActivePage(selectedProject, requestedPageId) : null
        set({
          projects,
          activeProjectId: selectedProject?.id ?? null,
          activePageId: selectedPageId,
          editorSessions,
          pendingDeletions,
          hydrationState: 'ready',
          hydrationError: null,
          migrationNotice,
        })
        persistence.setInitialSavedState(projects[0]?.updatedAt ?? null)
        pendingDeletions.forEach(scheduleDeletion)
      } catch (error) {
        const failure = classifyStorageError(error)
        set({
          hydrationState: 'error',
          hydrationError: failure.message,
          storageError: failure.message,
          storageFailureKind: failure.kind,
        })
      }
    })()
    return initialization
  },

  createProject(name, templateId = 'midnight-quote', templateIds, canvasSize, initialImage) {
    const project = createProjectData(name, templateId, templateIds, canvasSize, initialImage)
    set((state) => ({
      projects: [project, ...state.projects],
      activeProjectId: project.id,
      activePageId: project.pages[0].id,
    }))
    updateSessionSnapshot(project.id, { lastActivePageId: project.pages[0].id }, true)
    persistSession()
    markProject(project.id, { immediate: true })
  },

  openProject(id) {
    const project = get().projects.find((item) => item.id === id)
    if (!project) return
    const session = get().editorSessions[id]
    const pageId = validActivePage(project, session?.lastActivePageId)
    set({ activeProjectId: id, activePageId: pageId })
    updateSessionSnapshot(id, { lastActivePageId: pageId }, true)
    persistSession()
    void editorSessionPersistence.flush()
  },

  goHome() {
    const { activeProjectId, activePageId } = get()
    if (activeProjectId) updateSessionSnapshot(activeProjectId, { lastActivePageId: activePageId }, true)
    set({ activeProjectId: null, activePageId: null })
    persistSession()
    void Promise.all([persistence.flushAll(), editorSessionPersistence.flush()])
  },

  renameProject(id, name) {
    const project = get().projects.find((item) => item.id === id)
    if (!project) return
    const nextName = name.trim().slice(0, 80) || project.name
    if (nextName === project.name) return
    const after = { ...project, name: nextName, updatedAt: nowIso() }
    const entry = makeHistoryEntry(id, '프로젝트 이름 변경', project, after, get().activePageId, get().activePageId, `name:${id}`)
    set((state) => ({
      projects: state.projects.map((item) => item.id === id ? after : item),
      histories: { ...state.histories, [id]: pushHistory(state.histories[id] ?? emptyProjectHistory(), entry) },
    }))
    markProject(id, { pageIds: [] })
  },

  duplicateProject(id) {
    const source = get().projects.find((project) => project.id === id)
    if (!source) return
    const reservedIds = new Set([
      ...get().projects.map((project) => project.id),
      ...get().pendingDeletions.filter((item): item is PendingProjectDeletion => item.type === 'project').map((item) => item.project.id),
    ])
    const copy = duplicateProjectData(source, reservedIds)
    set((state) => ({ projects: [copy, ...state.projects] }))
    markProject(copy.id, { immediate: true })
  },

  deleteProject(id) {
    const state = get()
    const originalIndex = state.projects.findIndex((project) => project.id === id)
    const project = state.projects[originalIndex]
    if (!project || state.pendingDeletions.some((item) => item.type === 'project' && item.project.id === id)) return
    const createdAt = Date.now()
    const operation: PendingProjectDeletion = {
      type: 'project',
      operationId: createId(),
      project: structuredClone(project),
      originalIndex,
      previousActiveProjectId: state.activeProjectId,
      previousActivePageId: state.activePageId,
      createdAt,
      expiresAt: createdAt + appConfig.deletionUndoMs,
    }
    const wasActive = state.activeProjectId === id
    set({
      projects: state.projects.filter((item) => item.id !== id),
      activeProjectId: wasActive ? null : state.activeProjectId,
      activePageId: wasActive ? null : state.activePageId,
      operationMessage: '삭제했습니다.',
    })
    persistSession()
    addPendingOperation(operation)
  },

  updateProjectCanvasSize(id, canvasSize) {
    const project = get().projects.find((item) => item.id === id)
    if (!project) return
    const normalized = normalizeCardSize(canvasSize)
    if (project.canvasSize.width === normalized.width && project.canvasSize.height === normalized.height) return
    const after = { ...project, canvasSize: normalized, updatedAt: nowIso() }
    const entry = makeHistoryEntry(id, '캔버스 크기 변경', project, after, get().activePageId, get().activePageId, `canvas:${id}`)
    set((state) => ({
      projects: state.projects.map((item) => item.id === id ? after : item),
      histories: { ...state.histories, [id]: pushHistory(state.histories[id] ?? emptyProjectHistory(), entry) },
    }))
    markProject(id, { immediate: true, pageIds: [] })
  },

  setActivePage(id) {
    const project = activeProject(get())
    if (!project?.pages.some((page) => page.id === id)) return
    set({ activePageId: id })
    updateSessionSnapshot(project.id, { lastActivePageId: id }, true)
    persistSession()
  },

  updateEditorSession(projectId, patch, immediate = false) {
    if (!get().projects.some((project) => project.id === projectId)) return
    updateSessionSnapshot(projectId, patch, immediate)
  },

  addPage(templateId = 'midnight-quote') {
    if (!(templateId in templateRegistry)) return
    const project = activeProject(get())
    if (!project || project.pages.length >= appConfig.maxPages) return
    const page = createPage(templateId)
    const after = { ...project, pages: [...project.pages, page], updatedAt: nowIso() }
    const entry = makeHistoryEntry(project.id, '페이지 추가', project, after, get().activePageId, page.id)
    set((state) => ({
      projects: state.projects.map((item) => item.id === project.id ? after : item),
      activePageId: page.id,
      histories: { ...state.histories, [project.id]: pushHistory(state.histories[project.id] ?? emptyProjectHistory(), entry) },
    }))
    updateSessionSnapshot(project.id, { lastActivePageId: page.id }, true)
    persistSession()
    markProject(project.id, { immediate: true })
  },

  duplicatePage(id) {
    const project = activeProject(get())
    if (!project) return
    const pages = insertDuplicatePage(project.pages, id)
    if (!pages) return
    const sourceIndex = project.pages.findIndex((page) => page.id === id)
    const copy = pages[sourceIndex + 1]
    if (!copy) return
    const after = { ...project, pages, updatedAt: nowIso() }
    const entry = makeHistoryEntry(project.id, '페이지 복제', project, after, get().activePageId, copy.id)
    set((state) => ({
      projects: state.projects.map((item) => item.id === project.id ? after : item),
      activePageId: copy.id,
      histories: { ...state.histories, [project.id]: pushHistory(state.histories[project.id] ?? emptyProjectHistory(), entry) },
    }))
    updateSessionSnapshot(project.id, { lastActivePageId: copy.id }, true)
    persistSession()
    markProject(project.id, { immediate: true })
  },

  deletePage(id) {
    const project = activeProject(get())
    if (!project) return
    const deletion = selectPageAfterDeletion(project, id, get().activePageId)
    if (!deletion) return
    const { page, pages, originalIndex, nextActivePageId: nextActive } = deletion
    const wasActive = get().activePageId === id
    const after = { ...project, pages, updatedAt: nowIso() }
    const entry = makeHistoryEntry(project.id, '페이지 삭제', project, after, get().activePageId, nextActive)
    const createdAt = Date.now()
    const operation: PendingPageDeletion = {
      type: 'page',
      operationId: createId(),
      projectId: project.id,
      page: structuredClone(page),
      originalIndex,
      wasActive,
      previousActivePageId: get().activePageId,
      createdAt,
      expiresAt: createdAt + appConfig.deletionUndoMs,
    }
    set((state) => ({
      projects: state.projects.map((item) => item.id === project.id ? after : item),
      activePageId: nextActive,
      histories: { ...state.histories, [project.id]: pushHistory(state.histories[project.id] ?? emptyProjectHistory(), entry) },
      operationMessage: '삭제했습니다.',
    }))
    updateSessionSnapshot(project.id, { lastActivePageId: nextActive }, true)
    persistSession()
    markProject(project.id, { immediate: true })
    addPendingOperation(operation)
  },

  reorderPages(oldIndex, newIndex) {
    const project = activeProject(get())
    if (!project) return
    const pages = reorderPageData(project.pages, oldIndex, newIndex)
    if (!pages) return
    const after = { ...project, pages, updatedAt: nowIso() }
    const entry = makeHistoryEntry(project.id, '페이지 순서 변경', project, after, get().activePageId, get().activePageId)
    set((state) => ({
      projects: state.projects.map((item) => item.id === project.id ? after : item),
      histories: { ...state.histories, [project.id]: pushHistory(state.histories[project.id] ?? emptyProjectHistory(), entry) },
    }))
    markProject(project.id, { immediate: true })
  },

  updatePage(id, patch) {
    const project = activeProject(get())
    const page = project?.pages.find((item) => item.id === id)
    if (!project || !page) return
    const safePatch: Partial<CardPage> = {
      content: patch.content,
      backgroundImage: patch.backgroundImage,
      image: patch.image,
      overlayImage: patch.overlayImage,
      design: patch.design,
      variantId: patch.variantId,
    }
    const nextPage: CardPage = {
      ...page,
      ...Object.fromEntries(Object.entries(safePatch).filter(([, value]) => value !== undefined)),
      id: page.id,
      templateId: page.templateId,
      design: patch.design ? normalizeDesign(patch.design, templateRegistry[page.templateId].defaultDesign) : page.design,
      overlayImage: patch.overlayImage === undefined ? page.overlayImage : normalizeOverlayImage(patch.overlayImage),
    }
    if (JSON.stringify(page) === JSON.stringify(nextPage)) return
    const after = {
      ...project,
      updatedAt: nowIso(),
      pages: project.pages.map((item) => item.id === id ? nextPage : item),
    }
    const description = describePatch(page, patch)
    const entry = makeHistoryEntry(project.id, description.label, project, after, get().activePageId, get().activePageId, description.mergeKey)
    set((state) => ({
      projects: state.projects.map((item) => item.id === project.id ? after : item),
      histories: { ...state.histories, [project.id]: pushHistory(state.histories[project.id] ?? emptyProjectHistory(), entry) },
    }))
    markProject(project.id, { immediate: description.immediate, pageIds: [id] })
  },

  analyzePageTemplate(id, templateId) {
    const page = activeProject(get())?.pages.find((item) => item.id === id)
    return page ? analyzeTemplateMapping(page, templateId) : null
  },

  replacePageTemplate(id, templateId, analysis) {
    const project = activeProject(get())
    const page = project?.pages.find((item) => item.id === id)
    if (!project || !page || !(templateId in templateRegistry)) return
    const result = analysis?.page.templateId === templateId ? analysis : analyzeTemplateMapping(page, templateId)
    if (!result) return
    const after = {
      ...project,
      updatedAt: nowIso(),
      pages: project.pages.map((item) => item.id === id ? structuredClone(result.page) : item),
    }
    const entry = makeHistoryEntry(project.id, '템플릿 교체', project, after, get().activePageId, get().activePageId)
    set((state) => ({
      projects: state.projects.map((item) => item.id === project.id ? after : item),
      histories: { ...state.histories, [project.id]: pushHistory(state.histories[project.id] ?? emptyProjectHistory(), entry) },
    }))
    markProject(project.id, { immediate: true, pageIds: [id] })
  },

  undo() {
    const project = activeProject(get())
    if (!project) return
    const outcome = undoHistory(get().histories[project.id] ?? emptyProjectHistory())
    if (!outcome) return
    const restored = { ...structuredClone(outcome.entry.before), updatedAt: nowIso() }
    const activePageId = validActivePage(restored, outcome.entry.activePageIdBefore)
    const restoredIds = new Set(restored.pages.map((page) => page.id))
    const canceled = get().pendingDeletions.filter((item) => item.type === 'page' && item.projectId === project.id && restoredIds.has(item.page.id))
    const pendingDeletions = get().pendingDeletions.filter((item) => !canceled.includes(item))
    canceled.forEach((item) => clearDeletionTimer(item.operationId))
    set((state) => ({
      projects: state.projects.map((item) => item.id === project.id ? restored : item),
      activePageId,
      histories: { ...state.histories, [project.id]: outcome.history },
      pendingDeletions,
      operationMessage: `${outcome.entry.label}을 실행 취소했습니다.`,
    }))
    updateSessionSnapshot(project.id, { lastActivePageId: activePageId }, true)
    persistSession()
    if (canceled.length) void persistPending(pendingDeletions)
    markProject(project.id, { immediate: true })
    if (outcome.entry.label === '페이지 삭제 복구') {
      const operation = createPendingForHistoryRemoval(project, restored, outcome.entry.activePageIdAfter)
      if (operation) addPendingOperation(operation)
    }
  },

  redo() {
    const project = activeProject(get())
    if (!project) return
    const outcome = redoHistory(get().histories[project.id] ?? emptyProjectHistory())
    if (!outcome) return
    const restored = { ...structuredClone(outcome.entry.after), updatedAt: nowIso() }
    const activePageId = validActivePage(restored, outcome.entry.activePageIdAfter)
    set((state) => ({
      projects: state.projects.map((item) => item.id === project.id ? restored : item),
      activePageId,
      histories: { ...state.histories, [project.id]: outcome.history },
      operationMessage: `${outcome.entry.label}을 다시 실행했습니다.`,
    }))
    updateSessionSnapshot(project.id, { lastActivePageId: activePageId }, true)
    persistSession()
    markProject(project.id, { immediate: true })
    if (outcome.entry.label === '페이지 삭제') {
      const operation = createPendingForHistoryRemoval(project, restored, outcome.entry.activePageIdBefore)
      if (operation) addPendingOperation(operation)
    }
  },

  async undoDeletion(operationId) {
    if (resolvingDeletions.has(operationId)) return false
    const operation = get().pendingDeletions.find((item) => item.operationId === operationId)
    if (!operation || Date.now() >= operation.expiresAt) {
      if (operation) void get().finalizeDeletion(operationId)
      set({ operationMessage: '실행 취소 시간이 지나 삭제를 복구할 수 없습니다.' })
      return false
    }
    resolvingDeletions.add(operationId)
    try {
      if (operation.type === 'project') {
        if (get().projects.some((project) => project.id === operation.project.id)) {
          set({ operationMessage: '같은 ID의 프로젝트가 있어 삭제를 복구하지 못했습니다.' })
          return false
        }
        const projects = restoreProjectAtOriginalIndex(get().projects, operation)
        if (!projects) {
          set({ operationMessage: '같은 ID의 프로젝트가 있어 삭제를 복구하지 못했습니다.' })
          return false
        }
        const restoreActive = operation.previousActiveProjectId === operation.project.id && !get().activeProjectId
        const activePageId = restoreActive ? validActivePage(operation.project, operation.previousActivePageId) : get().activePageId
        const pendingDeletions = get().pendingDeletions.filter((item) => item.operationId !== operationId)
        clearDeletionTimer(operationId)
        set({
          projects,
          pendingDeletions,
          activeProjectId: restoreActive ? operation.project.id : get().activeProjectId,
          activePageId,
          operationMessage: `"${operation.project.name}" 프로젝트를 원래 위치로 복구했습니다.`,
        })
        if (restoreActive) updateSessionSnapshot(operation.project.id, { lastActivePageId: activePageId }, true)
        persistSession()
        await persistPending(pendingDeletions)
        markProject(operation.project.id, { immediate: true })
        return true
      }
      const project = get().projects.find((item) => item.id === operation.projectId)
      if (!project) {
        set({ operationMessage: '프로젝트가 없어 페이지를 복구하지 못했습니다.' })
        return false
      }
      const restoredProject = restorePageAtOriginalIndex(project, operation)
      if (!restoredProject) {
        set({ operationMessage: '페이지 수 제한 또는 ID 충돌로 복구하지 못했습니다.' })
        return false
      }
      const after = { ...restoredProject, updatedAt: nowIso() }
      const activePageId = operation.wasActive
        ? operation.page.id
        : validActivePage(after, operation.previousActivePageId ?? get().activePageId)
      const historyEntry = makeHistoryEntry(project.id, '페이지 삭제 복구', project, after, get().activePageId, activePageId)
      const pendingDeletions = get().pendingDeletions.filter((item) => item.operationId !== operationId)
      clearDeletionTimer(operationId)
      set((state) => ({
        projects: state.projects.map((item) => item.id === project.id ? after : item),
        activePageId,
        histories: { ...state.histories, [project.id]: pushHistory(state.histories[project.id] ?? emptyProjectHistory(), historyEntry) },
        pendingDeletions,
        operationMessage: `${operation.originalIndex + 1}번째 페이지를 원래 위치로 복구했습니다.`,
      }))
      updateSessionSnapshot(project.id, { lastActivePageId: activePageId }, true)
      persistSession()
      await persistPending(pendingDeletions)
      markProject(project.id, { immediate: true })
      return true
    } finally {
      resolvingDeletions.delete(operationId)
    }
  },

  async finalizeDeletion(operationId) {
    if (resolvingDeletions.has(operationId)) return
    const operation = get().pendingDeletions.find((item) => item.operationId === operationId) ?? detachedDeletions.get(operationId)
    if (!operation) return
    resolvingDeletions.add(operationId)
    clearDeletionTimer(operationId)
    try {
      if (operation.type === 'project') {
        await persistence.deleteProject(operation.project.id, { protectedImageSources: protectedPendingImageSources() })
        const editorSessions = { ...get().editorSessions }
        delete editorSessions[operation.project.id]
        editorSessionPersistence.delete(operation.project.id, true)
        set((state) => {
          const { [operation.project.id]: _history, ...histories } = state.histories
          void _history
          return { editorSessions, histories, operationMessage: `"${operation.project.name}" 프로젝트를 영구 삭제했습니다.` }
        })
      } else {
        await persistence.flushProject(operation.projectId)
        await repository.deleteUnusedImages(protectedPendingImageSources(operation.operationId))
        set({ operationMessage: `${operation.originalIndex + 1}번째 페이지를 영구 삭제했습니다.` })
      }
      const pendingDeletions = get().pendingDeletions.filter((item) => item.operationId !== operationId)
      set({ pendingDeletions })
      detachedDeletions.delete(operationId)
      await persistPending(pendingDeletions)
    } catch (error) {
      setPersistentStorageError(error)
      scheduleDeletion({ ...operation, expiresAt: Date.now() + 1_000 })
    } finally {
      resolvingDeletions.delete(operationId)
    }
  },

  dismissOperationMessage() {
    set({ operationMessage: '' })
  },

  importProject(text) {
    let imported: Project[]
    try {
      imported = importProjectsJson(text)
    } catch (error) {
      throw new Error(getUserFacingDataError(error))
    }
    const [project] = imported
    set((state) => ({
      projects: [...imported, ...state.projects],
      activeProjectId: project.id,
      activePageId: project.pages[0].id,
    }))
    updateSessionSnapshot(project.id, { lastActivePageId: project.pages[0].id }, true)
    persistSession()
    imported.forEach((item) => markProject(item.id, { immediate: true }))
  },

  async retrySave() {
    set({ storageError: null, storageFailureKind: null })
    persistSession()
    await Promise.all([persistence.retry(), editorSessionPersistence.flush(), persistPending()])
  },

  async flushPending() {
    await Promise.all([persistence.flushAll(), editorSessionPersistence.flush(), pendingWrite])
  },

  async cleanupUnusedImages() {
    await persistence.flushAll()
    if (get().pendingDeletions.some((item) => item.type === 'page')) {
      set({ operationMessage: '페이지 삭제 복구 시간이 끝난 뒤 이미지를 정리할 수 있습니다.' })
      return 0
    }
    const removed = await repository.deleteUnusedImages()
    await persistence.refreshEstimate(true)
    return removed
  },

  async clearBrowserStorage() {
    deletionTimers.forEach(clearTimeout)
    deletionTimers.clear()
    detachedDeletions.clear()
    editorSessionPersistence.clearTimer()
    await persistence.flushAll()
    await repository.clearAll()
    editorSessionPersistence.replace({})
    localStorage.removeItem(appConfig.sessionStorageKey)
    localStorage.removeItem(appConfig.storageKey)
    sessionStorage.removeItem(appConfig.recoveryStorageKey)
    set({
      projects: [],
      activeProjectId: null,
      activePageId: null,
      editorSessions: {},
      histories: {},
      pendingDeletions: [],
      storageError: null,
      storageFailureKind: null,
      saveStatus: { ...initialSaveStatus, phase: 'saved', message: '브라우저 저장소 초기화 완료' },
    })
  },

  clearStorageError() {
    set({ storageError: null, storageFailureKind: null })
  },
}))

persistence.bind({
  getProject: (id) => useStudioStore.getState().projects.find((project) => project.id === id) ?? null,
  setStatus: (saveStatus) => useStudioStore.setState({ saveStatus }),
})

if (typeof window !== 'undefined') {
  const flush = () => {
    writeRecoveryJournal()
    void persistence.flushAll()
    void editorSessionPersistence.flush()
    void persistPending()
  }
  window.addEventListener('pagehide', flush)
  window.addEventListener('beforeunload', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}

export { exportLightweightWorkspaceJson, exportProjectJson, exportWorkspaceJson }
