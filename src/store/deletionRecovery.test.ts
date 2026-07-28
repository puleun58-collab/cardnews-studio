import { describe, expect, it } from 'vitest'
import { createPage } from '../domain/page/pageOperations'
import { createProjectData } from '../domain/project/projectOperations'
import type { PendingPageDeletion, PendingProjectDeletion } from './deletionRecovery'
import { appendPendingDeletion, restorePageAtOriginalIndex, restoreProjectAtOriginalIndex, selectPageAfterDeletion } from './deletionRecovery'

const projectOperation = (project: ReturnType<typeof createProjectData>, originalIndex = 0): PendingProjectDeletion => ({
  type: 'project',
  operationId: 'operation',
  project,
  originalIndex,
  previousActiveProjectId: null,
  previousActivePageId: null,
  createdAt: 0,
  expiresAt: 8_000,
})

describe('deletion recovery', () => {
  it('프로젝트 전체 데이터를 원래 목록 위치에 복구한다', () => {
    const first = createProjectData('첫째')
    const deleted = createProjectData('삭제 대상')
    deleted.canvasSize = { width: 1080, height: 1920 }
    deleted.pages.push(createPage('image-text'))
    const last = createProjectData('마지막')
    const restored = restoreProjectAtOriginalIndex([first, last], projectOperation(deleted, 1))!
    expect(restored.map((project) => project.id)).toEqual([first.id, deleted.id, last.id])
    expect(restored[1]).toEqual(deleted)
    expect(restored[1]).not.toBe(deleted)
  })

  it('같은 프로젝트 ID가 생기면 기존 데이터를 덮어쓰지 않는다', () => {
    const deleted = createProjectData('삭제 대상')
    expect(restoreProjectAtOriginalIndex([deleted], projectOperation(deleted))).toBeNull()
  })

  it('활성 페이지 삭제 시 다음 페이지, 끝 페이지면 이전 페이지를 선택한다', () => {
    const project = createProjectData('페이지')
    project.pages = [createPage(), createPage(), createPage()]
    const middle = selectPageAfterDeletion(project, project.pages[1].id, project.pages[1].id)!
    expect(middle.nextActivePageId).toBe(project.pages[2].id)
    const last = selectPageAfterDeletion(project, project.pages[2].id, project.pages[2].id)!
    expect(last.nextActivePageId).toBe(project.pages[1].id)
  })

  it('마지막 페이지 삭제를 차단하고 삭제 페이지를 원래 위치에 복구한다', () => {
    const project = createProjectData('페이지')
    expect(selectPageAfterDeletion(project, project.pages[0].id, project.pages[0].id)).toBeNull()
    project.pages = [createPage(), createPage(), createPage()]
    const selected = selectPageAfterDeletion(project, project.pages[1].id, project.pages[1].id)!
    const reduced = { ...project, pages: selected.pages }
    const operation: PendingPageDeletion = {
      type: 'page',
      operationId: 'page-operation',
      projectId: project.id,
      page: selected.page,
      originalIndex: selected.originalIndex,
      wasActive: true,
      previousActivePageId: selected.page.id,
      createdAt: 0,
      expiresAt: 8_000,
    }
    const restored = restorePageAtOriginalIndex(reduced, operation)!
    expect(restored.pages.map((page) => page.id)).toEqual(project.pages.map((page) => page.id))
  })

  it('페이지 ID 충돌과 최대 페이지 수에서 안전하게 실패한다', () => {
    const project = createProjectData('페이지')
    const operation: PendingPageDeletion = {
      type: 'page',
      operationId: 'page-operation',
      projectId: project.id,
      page: project.pages[0],
      originalIndex: 0,
      wasActive: true,
      previousActivePageId: project.pages[0].id,
      createdAt: 0,
      expiresAt: 8_000,
    }
    expect(restorePageAtOriginalIndex(project, operation)).toBeNull()
    const withoutCollision = { ...operation, page: createPage() }
    expect(restorePageAtOriginalIndex(project, withoutCollision, 1)).toBeNull()
  })

  it('연속 삭제는 최근 작업을 제한 개수만 표시하고 오래된 작업부터 확정 대상으로 보낸다', () => {
    const project = createProjectData('연속 삭제')
    const operations = Array.from({ length: 5 }, (_, index) => ({
      ...projectOperation({ ...project, id: `project-${index}` }),
      operationId: `operation-${index}`,
    }))
    let visible: PendingProjectDeletion[] = []
    let overflow: PendingProjectDeletion[] = []
    for (const operation of operations) {
      const result = appendPendingDeletion(visible, operation, 4)
      visible = result.visible as PendingProjectDeletion[]
      overflow = [...overflow, ...result.overflow as PendingProjectDeletion[]]
    }
    expect(visible.map((item) => item.operationId)).toEqual(['operation-1', 'operation-2', 'operation-3', 'operation-4'])
    expect(overflow.map((item) => item.operationId)).toEqual(['operation-0'])
  })
})
