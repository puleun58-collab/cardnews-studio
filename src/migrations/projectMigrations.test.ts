import { describe, expect, it } from 'vitest'
import { migrateProjectData, migrateV1ToV2, ProjectMigrationError } from './projectMigrations'

describe('project migrations', () => {
  it('v1을 v2로 한 단계 변환하고 원본을 변경하지 않는다', () => {
    const original = {
      schemaVersion: 1,
      pages: [{ design: { fontId: 'bebas-neue' } }],
    }
    const migrated = migrateV1ToV2(original)
    expect(migrated.schemaVersion).toBe(2)
    expect((migrated.pages as Array<{ design: { fontId: string; englishFontId: string } }>)[0].design).toEqual({
      fontId: 'pretendard',
      englishFontId: 'oswald',
    })
    expect(original).toEqual({
      schemaVersion: 1,
      pages: [{ design: { fontId: 'bebas-neue' } }],
    })
  })

  it('현재 앱보다 높은 버전은 안전하게 거부한다', () => {
    expect(() => migrateProjectData({ schemaVersion: 99 })).toThrow(ProjectMigrationError)
  })
})
