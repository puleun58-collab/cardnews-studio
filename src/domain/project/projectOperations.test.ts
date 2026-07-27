import { describe, expect, it } from 'vitest'
import { createProjectData, duplicateProjectData } from './projectOperations'

describe('project domain operations', () => {
  it('프로젝트 복제 시 프로젝트와 모든 페이지 ID를 다시 생성한다', () => {
    const source = createProjectData('원본', 'midnight-quote', ['midnight-quote', 'cover-hook'])
    const copy = duplicateProjectData(source, new Set([source.id]))
    expect(copy.id).not.toBe(source.id)
    expect(copy.pages.map((page) => page.id)).not.toEqual(source.pages.map((page) => page.id))
    expect(new Set(copy.pages.map((page) => page.id)).size).toBe(copy.pages.length)
  })
})
