import { describe, expect, it } from 'vitest'
import { exportLightweightWorkspaceJson, exportWorkspaceJson, importProjectJson, importProjectsJson } from '../domain/project/projectTransfer'
import { normalizeProjectData, ProjectValidationError } from './projectSchema'

const page = (id = 'page-1') => ({
  id,
  templateId: 'midnight-quote',
  variantId: 'default',
  content: { kicker: '', body: '본문', source: '', note: '' },
})

const project = (pages: unknown[] = [page()]) => ({
  schemaVersion: 1,
  id: 'project-1',
  name: '검증',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  pages,
})

describe('project runtime validation', () => {
  it('이전 프로젝트를 최신 스키마와 기본 캔버스 크기로 정규화한다', () => {
    const normalized = normalizeProjectData(project())
    expect(normalized.schemaVersion).toBe(2)
    expect(normalized.canvasSize).toEqual({ width: 1080, height: 1350 })
    expect(normalized.pages[0].design?.fontId).toBe('pretendard')
  })

  it('중복 페이지 ID와 잘못된 콘텐츠 타입을 거부한다', () => {
    expect(() => normalizeProjectData(project([page(), page()]))).toThrow(ProjectValidationError)
    expect(() => normalizeProjectData(project([{ ...page(), content: { body: 42 } }]))).toThrow(ProjectValidationError)
  })

  it('잘못된 JSON과 미래 버전을 구분해 거부한다', () => {
    expect(() => importProjectJson('{')).toThrow('JSON 문법이 올바르지 않습니다.')
    expect(() => importProjectJson(JSON.stringify({ schemaVersion: 99, project: project() }))).toThrow('더 새로운 버전')
  })

  it('전체 작업공간 백업을 다시 가져오며 ID를 재생성한다', () => {
    const first = normalizeProjectData(project())
    const second = { ...first, id: 'project-2', pages: first.pages.map((item) => ({ ...item, id: 'page-2' })) }
    const imported = importProjectsJson(exportWorkspaceJson([first, second]))
    expect(imported).toHaveLength(2)
    expect(new Set(imported.map((item) => item.id)).size).toBe(2)
    expect(imported.map((item) => item.id)).not.toContain(first.id)
  })

  it('경량 백업은 이미지 데이터를 제외한다', () => {
    const value = normalizeProjectData(project())
    value.pages[0].backgroundImage = 'data:image/png;base64,YQ=='
    const parsed = JSON.parse(exportLightweightWorkspaceJson([value]))
    expect(parsed.imagePolicy).toBe('omitted')
    expect(parsed.projects[0].pages[0].backgroundImage).toBeNull()
  })
})
