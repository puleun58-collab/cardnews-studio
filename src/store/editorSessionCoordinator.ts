import { appConfig } from '../config/appConfig'
import type { ProjectRepository } from '../repositories/projectRepository'
import type { ProjectEditorSession } from '../types'

export const EDITOR_SESSIONS_META_KEY = 'project-editor-sessions-v1'

export class EditorSessionCoordinator {
  private readonly repository: ProjectRepository
  private readonly debounceMs: number
  private sessions: Record<string, ProjectEditorSession> = {}
  private revision = 0
  private savedRevision = 0
  private timer: ReturnType<typeof setTimeout> | null = null
  private inFlight: Promise<void> | null = null

  constructor(repository: ProjectRepository, debounceMs = appConfig.editorSessionDebounceMs) {
    this.repository = repository
    this.debounceMs = debounceMs
  }

  async load(): Promise<Record<string, ProjectEditorSession>> {
    const stored = await this.repository.getMeta<Record<string, ProjectEditorSession>>(EDITOR_SESSIONS_META_KEY)
    this.sessions = stored && typeof stored === 'object' ? stored : {}
    return structuredClone(this.sessions)
  }

  replace(sessions: Record<string, ProjectEditorSession>) {
    this.sessions = structuredClone(sessions)
  }

  set(session: ProjectEditorSession, immediate = false) {
    this.sessions = { ...this.sessions, [session.projectId]: structuredClone(session) }
    this.markDirty(immediate)
  }

  delete(projectId: string, immediate = true) {
    if (!(projectId in this.sessions)) return
    const { [projectId]: _removed, ...remaining } = this.sessions
    void _removed
    this.sessions = remaining
    this.markDirty(immediate)
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.inFlight) return this.inFlight
    this.inFlight = this.saveLoop().finally(() => { this.inFlight = null })
    return this.inFlight
  }

  clearTimer() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  private markDirty(immediate: boolean) {
    this.revision += 1
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.flush(), immediate ? 0 : this.debounceMs)
  }

  private async saveLoop() {
    while (this.savedRevision < this.revision) {
      const savingRevision = this.revision
      const snapshot = structuredClone(this.sessions)
      await this.repository.setMeta(EDITOR_SESSIONS_META_KEY, snapshot)
      this.savedRevision = savingRevision
    }
  }
}
