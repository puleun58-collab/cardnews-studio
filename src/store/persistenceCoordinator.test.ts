import { describe, expect, it, vi } from 'vitest'
import { createProjectData } from '../domain/project/projectOperations'
import type { ProjectRepository, SaveProjectOptions, StorageEstimate } from '../repositories/projectRepository'
import type { Project } from '../types'
import { PersistenceCoordinator, type SaveStatus } from './persistenceCoordinator'

class FakeRepository implements ProjectRepository {
  saves: Project[] = []
  fail = false
  async getAllProjects() { return [] }
  async getProject() { return null }
  async saveProject(project: Project, _options?: SaveProjectOptions) {
    if (this.fail) throw new DOMException('quota', 'QuotaExceededError')
    this.saves.push(structuredClone(project))
  }
  async deleteProject() {}
  async saveImage() { return 'image' }
  async getImage() { return null }
  async deleteUnusedImages() { return 0 }
  async getMeta<T>() { return null as T | null }
  async setMeta<T>(_key: string, _value: T) {}
  async deleteMeta(_key: string) {}
  async getStorageEstimate(): Promise<StorageEstimate> { return { usage: 1, quota: 10, ratio: .1 } }
  async clearAll() {}
}

describe('PersistenceCoordinator', () => {
  it('연속 변경을 debounce하고 최신 프로젝트만 저장한다', async () => {
    vi.useFakeTimers()
    const repository = new FakeRepository()
    let project = createProjectData('처음')
    let status: SaveStatus | null = null
    const coordinator = new PersistenceCoordinator(repository, 500)
    coordinator.bind({
      getProject: () => project,
      setStatus: (next) => { status = next },
    })
    coordinator.markDirty(project.id, { pageIds: [project.pages[0].id] })
    project = { ...project, name: '최신' }
    coordinator.markDirty(project.id, { pageIds: [project.pages[0].id] })
    await vi.advanceTimersByTimeAsync(499)
    expect(repository.saves).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1)
    await coordinator.flushAll()
    expect(repository.saves).toHaveLength(1)
    expect(repository.saves[0].name).toBe('최신')
    expect(status).toMatchObject({ phase: 'saved', dirty: false })
    vi.useRealTimers()
  })

  it('저장 실패를 유지하고 다시 저장할 수 있다', async () => {
    const repository = new FakeRepository()
    const project = createProjectData('재시도')
    let status: SaveStatus | null = null
    const coordinator = new PersistenceCoordinator(repository, 0)
    coordinator.bind({ getProject: () => project, setStatus: (next) => { status = next } })
    repository.fail = true
    coordinator.markDirty(project.id, { immediate: true })
    await coordinator.flushAll()
    expect(status).toMatchObject({ phase: 'error', failureKind: 'quota', dirty: true })
    repository.fail = false
    await coordinator.retry()
    expect(repository.saves).toHaveLength(1)
    expect(status).toMatchObject({ phase: 'saved', dirty: false })
  })

  it('저장 중 Undo 같은 새 revision이 생기면 오래된 저장 뒤 최신 상태를 다시 저장한다', async () => {
    let releaseFirst: () => void = () => undefined
    const repository = new FakeRepository()
    let callCount = 0
    repository.saveProject = async (project: Project) => {
      callCount += 1
      repository.saves.push(structuredClone(project))
      if (callCount === 1) await new Promise<void>((resolve) => { releaseFirst = resolve })
    }
    let project = createProjectData('변경 전')
    const coordinator = new PersistenceCoordinator(repository, 0)
    coordinator.bind({ getProject: () => project, setStatus: () => undefined })
    project = { ...project, name: '템플릿 변경 상태' }
    coordinator.markDirty(project.id, { immediate: true })
    const saving = coordinator.flushProject(project.id)
    await vi.waitFor(() => expect(repository.saves).toHaveLength(1))
    project = { ...project, name: 'Undo로 복구된 상태' }
    coordinator.markDirty(project.id, { immediate: true })
    releaseFirst()
    await saving
    await coordinator.flushAll()
    expect(repository.saves.map((saved) => saved.name)).toEqual(['템플릿 변경 상태', 'Undo로 복구된 상태'])
  })
})
