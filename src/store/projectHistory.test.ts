import { describe, expect, it } from 'vitest'
import { createProjectData } from '../domain/project/projectOperations'
import type { HistoryEntry } from './projectHistory'
import { emptyProjectHistory, pushHistory, redoHistory, undoHistory } from './projectHistory'

const entry = (index: number, projectId = 'project', mergeKey?: string): HistoryEntry => {
  const before = { ...createProjectData(`before-${index}`), id: projectId }
  const after = { ...before, name: `after-${index}` }
  return {
    id: `history-${index}`,
    projectId,
    label: `작업 ${index}`,
    before,
    after,
    activePageIdBefore: before.pages[0].id,
    activePageIdAfter: before.pages[0].id,
    createdAt: index * 100,
    mergeKey,
  }
}

describe('project history', () => {
  it('Undo 후 새 작업이 생기면 Redo를 제거한다', () => {
    let history = pushHistory(emptyProjectHistory(), entry(1))
    history = pushHistory(history, entry(2))
    const undone = undoHistory(history)!
    expect(undone.history.future).toHaveLength(1)
    const changed = pushHistory(undone.history, entry(3))
    expect(changed.future).toHaveLength(0)
  })

  it('연속 입력과 드래그를 merge key와 시간 창으로 한 항목에 묶는다', () => {
    let history = pushHistory(emptyProjectHistory(), entry(1, 'project', 'overlay:page'))
    history = pushHistory(history, entry(2, 'project', 'overlay:page'))
    expect(history.past).toHaveLength(1)
    expect(history.past[0].before.name).toBe('before-1')
    expect(history.past[0].after.name).toBe('after-2')
  })

  it('최대 개수와 프로젝트 분리를 유지하고 Undo·Redo 스냅샷을 반환한다', () => {
    let first = emptyProjectHistory()
    let second = emptyProjectHistory()
    for (let index = 0; index < 25; index += 1) first = pushHistory(first, entry(index, 'first'))
    second = pushHistory(second, entry(1, 'second'))
    expect(first.past).toHaveLength(20)
    expect(second.past).toHaveLength(1)
    const undone = undoHistory(first)!
    expect(undone.entry.projectId).toBe('first')
    const redone = redoHistory(undone.history)!
    expect(redone.entry.after.name).toBe('after-24')
  })

  it('이미지는 문자열 참조로만 복제되며 Blob 객체를 만들지 않는다', () => {
    const value = entry(1)
    value.before.pages[0].image = 'idb-image:sha256-source'
    value.after.pages[0].image = 'idb-image:sha256-source'
    const history = pushHistory(emptyProjectHistory(), value)
    expect(history.past[0].before.pages[0].image).toBe(history.past[0].after.pages[0].image)
    expect(history.past[0].before.pages[0].image).not.toBeInstanceOf(Blob)
  })
})
