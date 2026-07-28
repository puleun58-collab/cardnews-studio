import { describe, expect, it, vi } from 'vitest'
import type { ProjectRepository, SaveProjectOptions, StorageEstimate } from '../repositories/projectRepository'
import type { Project, ProjectEditorSession } from '../types'
import { EDITOR_SESSIONS_META_KEY, EditorSessionCoordinator } from './editorSessionCoordinator'

class SessionRepository implements ProjectRepository {
  meta = new Map<string, unknown>()
  writes: unknown[] = []
  async getAllProjects() { return [] }
  async getProject() { return null }
  async saveProject(_project: Project, _options?: SaveProjectOptions) {}
  async deleteProject() {}
  async saveImage() { return 'image' }
  async getImage() { return null }
  async deleteUnusedImages() { return 0 }
  async getMeta<T>(key: string) { return (this.meta.get(key) as T | undefined) ?? null }
  async setMeta<T>(key: string, value: T) { this.meta.set(key, structuredClone(value)); this.writes.push(structuredClone(value)) }
  async deleteMeta(key: string) { this.meta.delete(key) }
  async getStorageEstimate(): Promise<StorageEstimate> { return { usage: 0, quota: 1, ratio: 0 } }
  async clearAll() { this.meta.clear() }
}

const session = (projectId: string, pageId: string): ProjectEditorSession => ({
  projectId,
  lastActivePageId: pageId,
  activePanel: 'edit',
  zoomMode: 75,
  updatedAt: '2026-01-01T00:00:00.000Z',
})

describe('EditorSessionCoordinator', () => {
  it('세션이 없는 기존 데이터는 빈 상태로 시작한다', async () => {
    const coordinator = new EditorSessionCoordinator(new SessionRepository(), 0)
    await expect(coordinator.load()).resolves.toEqual({})
  })

  it('프로젝트별 마지막 페이지를 독립적으로 저장하고 최신 revision을 flush한다', async () => {
    vi.useFakeTimers()
    const repository = new SessionRepository()
    const coordinator = new EditorSessionCoordinator(repository, 250)
    await coordinator.load()
    coordinator.set(session('project-a', 'page-a'))
    coordinator.set(session('project-b', 'page-b'))
    coordinator.set(session('project-a', 'page-a-2'))
    await vi.advanceTimersByTimeAsync(250)
    await coordinator.flush()
    expect(repository.meta.get(EDITOR_SESSIONS_META_KEY)).toMatchObject({
      'project-a': { lastActivePageId: 'page-a-2' },
      'project-b': { lastActivePageId: 'page-b' },
    })
    expect(repository.writes).toHaveLength(1)
    vi.useRealTimers()
  })

  it('프로젝트 삭제 시 해당 세션만 제거한다', async () => {
    const repository = new SessionRepository()
    repository.meta.set(EDITOR_SESSIONS_META_KEY, {
      'project-a': session('project-a', 'page-a'),
      'project-b': session('project-b', 'page-b'),
    })
    const coordinator = new EditorSessionCoordinator(repository, 0)
    await coordinator.load()
    coordinator.delete('project-a')
    await coordinator.flush()
    expect(repository.meta.get(EDITOR_SESSIONS_META_KEY)).toEqual({
      'project-b': session('project-b', 'page-b'),
    })
  })
})
