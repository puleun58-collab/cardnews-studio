import { create } from 'zustand'
import { normalizeDesign } from '../brand/cardDesign'
import { normalizeCardSize } from '../brand/cardSize'
import { appConfig } from '../config/appConfig'
import { deletePageData, insertDuplicatePage, reorderPageData, replaceTemplateData, createPage } from '../domain/page/pageOperations'
import { createProjectData, duplicateProjectData } from '../domain/project/projectOperations'
import { exportLightweightWorkspaceJson, exportProjectJson, exportWorkspaceJson, importProjectsJson } from '../domain/project/projectTransfer'
import { clone, nowIso } from '../domain/shared'
import { normalizeOverlayImage } from '../engine/overlayImage'
import { IndexedDbProjectRepository } from '../repositories/indexedDbProjectRepository'
import { migrateLegacyLocalStorage, LegacyStorageMigrationError } from '../storage/legacyMigration'
import { classifyStorageError, type StorageFailureKind } from '../storage/storageErrors'
import { templateRegistry } from '../registry/templateRegistry'
import type { CardPage, CardSize, Project, TemplateId } from '../types'
import { getUserFacingDataError, normalizeProjectData } from '../validation/projectSchema'
import { initialSaveStatus, PersistenceCoordinator, type SaveStatus } from './persistenceCoordinator'

type HydrationState = 'loading' | 'ready' | 'error'

type SessionState = {
  activeProjectId: string | null
  activePageId: string | null
}

export interface StudioState {
  projects: Project[]
  activeProjectId: string | null
  activePageId: string | null
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
  addPage(templateId?: TemplateId): void
  duplicatePage(id: string): void
  deletePage(id: string): void
  reorderPages(oldIndex: number, newIndex: number): void
  updatePage(id: string, patch: Partial<CardPage>): void
  replacePageTemplate(id: string, templateId: TemplateId): void
  restoreActiveProject(project: Project, activePageId?: string | null): void
  importProject(text: string): void
  retrySave(): Promise<void>
  flushPending(): Promise<void>
  cleanupUnusedImages(): Promise<number>
  clearBrowserStorage(): Promise<void>
  clearStorageError(): void
}

const repository = new IndexedDbProjectRepository()
const persistence = new PersistenceCoordinator(repository)
let initialization: Promise<void> | null = null

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
  useStudioStore.setState({
    storageError: failure.message,
    storageFailureKind: failure.kind,
  })
}

function persistSession() {
  const { activeProjectId, activePageId } = useStudioStore.getState()
  try {
    localStorage.setItem(appConfig.sessionStorageKey, JSON.stringify({ activeProjectId, activePageId }))
  } catch (error) {
    setPersistentStorageError(error)
  }
}

function activeProject(state: StudioState) {
  return state.projects.find((project) => project.id === state.activeProjectId) ?? null
}

function markProject(projectId: string, options: { immediate?: boolean; pageIds?: Iterable<string> } = {}) {
  persistence.markDirty(projectId, options)
}

function updateProject(
  set: (updater: (state: StudioState) => Partial<StudioState>) => void,
  projectId: string,
  updater: (project: Project) => Project | null,
) {
  let changed = false
  set((state) => ({
    projects: state.projects.map((project) => {
      if (project.id !== projectId) return project
      const next = updater(project)
      if (!next || next === project) return project
      changed = true
      return next
    }),
  }))
  return changed
}

export const useStudioStore = create<StudioState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  activePageId: null,
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
          } else {
            throw error
          }
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
        const session = readSession()
        const requestedProjectId = session.activeProjectId ?? migratedSession.activeProjectId
        const selectedProject = projects.find((project) => project.id === requestedProjectId) ?? null
        const requestedPageId = session.activePageId ?? migratedSession.activePageId
        const selectedPageId = selectedProject?.pages.some((page) => page.id === requestedPageId)
          ? requestedPageId
          : selectedProject?.pages[0]?.id ?? null
        set({
          projects,
          activeProjectId: selectedProject?.id ?? null,
          activePageId: selectedPageId,
          hydrationState: 'ready',
          hydrationError: null,
          migrationNotice,
        })
        persistence.setInitialSavedState(projects[0]?.updatedAt ?? null)
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
    persistSession()
    markProject(project.id, { immediate: true })
  },

  openProject(id) {
    const project = get().projects.find((item) => item.id === id)
    if (!project) return
    set({ activeProjectId: id, activePageId: project.pages[0]?.id ?? null })
    persistSession()
  },

  goHome() {
    set({ activeProjectId: null, activePageId: null })
    persistSession()
    void persistence.flushAll()
  },

  renameProject(id, name) {
    const changed = updateProject(set, id, (project) => {
      const nextName = name.trim().slice(0, 80) || project.name
      if (nextName === project.name) return null
      return { ...project, name: nextName, updatedAt: nowIso() }
    })
    if (changed) markProject(id, { pageIds: [] })
  },

  duplicateProject(id) {
    const source = get().projects.find((project) => project.id === id)
    if (!source) return
    const copy = duplicateProjectData(source, new Set(get().projects.map((project) => project.id)))
    set((state) => ({ projects: [copy, ...state.projects] }))
    markProject(copy.id, { immediate: true })
  },

  deleteProject(id) {
    if (!get().projects.some((project) => project.id === id)) return
    const wasActive = get().activeProjectId === id
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
      activeProjectId: wasActive ? null : state.activeProjectId,
      activePageId: wasActive ? null : state.activePageId,
    }))
    persistSession()
    void persistence.deleteProject(id)
  },

  updateProjectCanvasSize(id, canvasSize) {
    const normalized = normalizeCardSize(canvasSize)
    const changed = updateProject(set, id, (project) => (
      project.canvasSize.width === normalized.width && project.canvasSize.height === normalized.height
        ? null
        : { ...project, canvasSize: normalized, updatedAt: nowIso() }
    ))
    if (changed) markProject(id, { pageIds: [] })
  },

  setActivePage(id) {
    const project = activeProject(get())
    if (!project?.pages.some((page) => page.id === id)) return
    set({ activePageId: id })
    persistSession()
  },

  addPage(templateId = 'midnight-quote') {
    if (!(templateId in templateRegistry)) return
    const project = activeProject(get())
    if (!project || project.pages.length >= appConfig.maxPages) return
    const page = createPage(templateId)
    const changed = updateProject(set, project.id, (current) => ({
      ...current,
      pages: [...current.pages, page],
      updatedAt: nowIso(),
    }))
    if (!changed) return
    set({ activePageId: page.id })
    persistSession()
    markProject(project.id, { immediate: true })
  },

  duplicatePage(id) {
    const project = activeProject(get())
    if (!project) return
    const pages = insertDuplicatePage(project.pages, id)
    if (!pages) return
    const index = pages.findIndex((page, pageIndex) => pageIndex > 0 && page.id !== project.pages[pageIndex]?.id)
    const copy = index >= 0 ? pages[index] : pages[project.pages.findIndex((page) => page.id === id) + 1]
    const changed = updateProject(set, project.id, (current) => ({ ...current, pages, updatedAt: nowIso() }))
    if (!changed || !copy) return
    set({ activePageId: copy.id })
    persistSession()
    markProject(project.id, { immediate: true })
  },

  deletePage(id) {
    const project = activeProject(get())
    if (!project) return
    const pages = deletePageData(project.pages, id)
    if (!pages) return
    const changed = updateProject(set, project.id, (current) => ({ ...current, pages, updatedAt: nowIso() }))
    if (!changed) return
    if (get().activePageId === id) set({ activePageId: pages[0].id })
    persistSession()
    markProject(project.id, { immediate: true })
  },

  reorderPages(oldIndex, newIndex) {
    const project = activeProject(get())
    if (!project) return
    const pages = reorderPageData(project.pages, oldIndex, newIndex)
    if (!pages) return
    const changed = updateProject(set, project.id, (current) => ({ ...current, pages, updatedAt: nowIso() }))
    if (changed) markProject(project.id, { immediate: true })
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
    const changed = updateProject(set, project.id, (current) => ({
      ...current,
      updatedAt: nowIso(),
      pages: current.pages.map((item) => item.id === id ? nextPage : item),
    }))
    if (changed) markProject(project.id, { pageIds: [id] })
  },

  replacePageTemplate(id, templateId) {
    const project = activeProject(get())
    const page = project?.pages.find((item) => item.id === id)
    if (!project || !page || !(templateId in templateRegistry)) return
    const replacement = replaceTemplateData(page, templateId)
    if (!replacement) return
    const changed = updateProject(set, project.id, (current) => ({
      ...current,
      updatedAt: nowIso(),
      pages: current.pages.map((item) => item.id === id ? replacement : item),
    }))
    if (changed) markProject(project.id, { immediate: true, pageIds: [id] })
  },

  restoreActiveProject(project, activePageId) {
    const state = get()
    if (project.id !== state.activeProjectId || !state.projects.some((item) => item.id === project.id)) return
    let restored: Project
    try {
      restored = normalizeProjectData(clone(project))
    } catch {
      return
    }
    const nextPageId = activePageId && restored.pages.some((page) => page.id === activePageId)
      ? activePageId
      : restored.pages[0]?.id ?? null
    set((current) => ({
      projects: current.projects.map((item) => item.id === restored.id ? restored : item),
      activePageId: nextPageId,
    }))
    persistSession()
    markProject(restored.id, { immediate: true })
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
    persistSession()
    imported.forEach((item) => markProject(item.id, { immediate: true }))
  },

  async retrySave() {
    set({ storageError: null, storageFailureKind: null })
    persistSession()
    await persistence.retry()
  },

  async flushPending() {
    await persistence.flushAll()
  },

  async cleanupUnusedImages() {
    await persistence.flushAll()
    const removed = await repository.deleteUnusedImages()
    await persistence.refreshEstimate(true)
    return removed
  },

  async clearBrowserStorage() {
    await persistence.flushAll()
    await repository.clearAll()
    localStorage.removeItem(appConfig.sessionStorageKey)
    localStorage.removeItem(appConfig.storageKey)
    sessionStorage.removeItem(appConfig.recoveryStorageKey)
    set({
      projects: [],
      activeProjectId: null,
      activePageId: null,
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
  }
  window.addEventListener('pagehide', flush)
  window.addEventListener('beforeunload', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}

export { exportLightweightWorkspaceJson, exportProjectJson, exportWorkspaceJson }
