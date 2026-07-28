import { appConfig } from '../config/appConfig'
import type { DeleteProjectOptions, ProjectRepository, StorageEstimate } from '../repositories/projectRepository'
import { classifyStorageError, type StorageFailureKind } from '../storage/storageErrors'
import type { Project } from '../types'

export type SavePhase = 'idle' | 'saving' | 'saved' | 'error'

export type SaveStatus = {
  phase: SavePhase
  dirty: boolean
  message: string
  lastSavedAt: string | null
  failureKind: StorageFailureKind | null
  technicalMessage: string | null
  estimate: StorageEstimate
}

type DirtyEntry = {
  revision: number
  savedRevision: number
  changedPageIds: Set<string> | null
  timer: ReturnType<typeof setTimeout> | null
  inFlight: Promise<void> | null
  deleted: boolean
}

type PersistenceBindings = {
  getProject: (id: string) => Project | null
  setStatus: (status: SaveStatus) => void
}

const emptyEstimate: StorageEstimate = { usage: null, quota: null, ratio: null }

export const initialSaveStatus: SaveStatus = {
  phase: 'idle',
  dirty: false,
  message: '저장 준비 중',
  lastSavedAt: null,
  failureKind: null,
  technicalMessage: null,
  estimate: emptyEstimate,
}

export class PersistenceCoordinator {
  private readonly repository: ProjectRepository
  private readonly debounceMs: number
  private bindings: PersistenceBindings | null = null
  private readonly entries = new Map<string, DirtyEntry>()
  private status: SaveStatus = initialSaveStatus
  private estimateRequestedAt = 0

  constructor(repository: ProjectRepository, debounceMs = appConfig.saveDebounceMs) {
    this.repository = repository
    this.debounceMs = debounceMs
  }

  bind(bindings: PersistenceBindings) {
    this.bindings = bindings
  }

  setInitialSavedState(lastSavedAt: string | null) {
    this.updateStatus({
      phase: 'saved',
      dirty: false,
      message: lastSavedAt ? '저장 완료' : '저장됨',
      lastSavedAt,
      failureKind: null,
      technicalMessage: null,
    })
    void this.refreshEstimate(true)
  }

  markDirty(projectId: string, options: { immediate?: boolean; pageIds?: Iterable<string> } = {}) {
    const entry = this.entry(projectId)
    if (entry.deleted) return
    entry.revision += 1
    if (options.pageIds) {
      if (entry.changedPageIds) {
        for (const pageId of options.pageIds) entry.changedPageIds.add(pageId)
      }
    } else {
      entry.changedPageIds = null
    }
    if (entry.timer) clearTimeout(entry.timer)
    this.updateStatus({
      phase: this.status.phase === 'saving' ? 'saving' : 'idle',
      dirty: true,
      message: this.status.phase === 'saving' ? '저장 중' : '저장되지 않은 변경 있음',
      failureKind: null,
      technicalMessage: null,
    })
    if (options.immediate) {
      entry.timer = setTimeout(() => void this.flushProject(projectId), 0)
    } else {
      entry.timer = setTimeout(() => void this.flushProject(projectId), this.debounceMs)
    }
  }

  async flushProject(projectId: string): Promise<void> {
    const entry = this.entry(projectId)
    if (entry.timer) {
      clearTimeout(entry.timer)
      entry.timer = null
    }
    if (entry.inFlight) return entry.inFlight
    entry.inFlight = this.runSaveLoop(projectId, entry).finally(() => {
      entry.inFlight = null
    })
    return entry.inFlight
  }

  async flushAll(): Promise<void> {
    const ids = [...this.entries.entries()]
      .filter(([, entry]) => !entry.deleted && entry.savedRevision < entry.revision)
      .map(([id]) => id)
    await Promise.all(ids.map((id) => this.flushProject(id)))
  }

  async retry(): Promise<void> {
    for (const entry of this.entries.values()) {
      if (!entry.deleted && entry.savedRevision < entry.revision && !entry.timer) {
        entry.timer = setTimeout(() => void 0, 0)
      }
    }
    await this.flushAll()
  }

  async deleteProject(projectId: string, options: DeleteProjectOptions = {}): Promise<void> {
    const entry = this.entry(projectId)
    entry.deleted = true
    if (entry.timer) {
      clearTimeout(entry.timer)
      entry.timer = null
    }
    if (entry.inFlight) {
      try {
        await entry.inFlight
      } catch {
        // Deletion is still attempted; it is the latest authoritative operation.
      }
    }
    await this.flushAll()
    try {
      await this.repository.deleteProject(projectId, options)
      this.entries.delete(projectId)
      this.updateStatus({
        phase: 'saved',
        dirty: this.hasDirtyEntries(),
        message: '삭제 내용 저장 완료',
        lastSavedAt: new Date().toISOString(),
        failureKind: null,
        technicalMessage: null,
      })
      await this.refreshEstimate()
    } catch (error) {
      entry.deleted = false
      this.reportError(error)
    }
  }

  async refreshEstimate(force = false): Promise<void> {
    if (!force && Date.now() - this.estimateRequestedAt < 15_000) return
    this.estimateRequestedAt = Date.now()
    try {
      const estimate = await this.repository.getStorageEstimate()
      this.updateStatus({ estimate })
    } catch {
      this.updateStatus({ estimate: emptyEstimate })
    }
  }

  getDirtyProjectIds(): string[] {
    return [...this.entries.entries()]
      .filter(([, entry]) => !entry.deleted && entry.savedRevision < entry.revision)
      .map(([id]) => id)
  }

  private entry(projectId: string): DirtyEntry {
    const existing = this.entries.get(projectId)
    if (existing) return existing
    const entry: DirtyEntry = {
      revision: 0,
      savedRevision: 0,
      changedPageIds: new Set(),
      timer: null,
      inFlight: null,
      deleted: false,
    }
    this.entries.set(projectId, entry)
    return entry
  }

  private async runSaveLoop(projectId: string, entry: DirtyEntry): Promise<void> {
    while (!entry.deleted && entry.savedRevision < entry.revision) {
      const project = this.bindings?.getProject(projectId)
      if (!project) return
      const savingRevision = entry.revision
      const changedPageIds = entry.changedPageIds
      entry.changedPageIds = new Set()
      this.updateStatus({
        phase: 'saving',
        dirty: true,
        message: '저장 중',
        failureKind: null,
        technicalMessage: null,
      })
      try {
        await this.repository.saveProject(project, {
          changedPageIds: changedPageIds ?? undefined,
        })
        entry.savedRevision = savingRevision
        const dirty = this.hasDirtyEntries()
        const lastSavedAt = new Date().toISOString()
        this.updateStatus({
          phase: dirty ? 'saving' : 'saved',
          dirty,
          message: dirty ? '최신 변경 저장 중' : '저장 완료',
          lastSavedAt,
          failureKind: null,
          technicalMessage: null,
        })
        await this.refreshEstimate()
      } catch (error) {
        if (changedPageIds === null) entry.changedPageIds = null
        else if (entry.changedPageIds) changedPageIds.forEach((id) => entry.changedPageIds?.add(id))
        this.reportError(error)
        return
      }
    }
  }

  private hasDirtyEntries() {
    return [...this.entries.values()].some((entry) => !entry.deleted && entry.savedRevision < entry.revision)
  }

  private reportError(error: unknown) {
    const failure = classifyStorageError(error)
    this.updateStatus({
      phase: 'error',
      dirty: true,
      message: failure.message,
      failureKind: failure.kind,
      technicalMessage: failure.technicalMessage,
    })
  }

  private updateStatus(patch: Partial<SaveStatus>) {
    this.status = { ...this.status, ...patch }
    this.bindings?.setStatus(this.status)
  }
}
