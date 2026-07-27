import { describe, expect, it } from 'vitest'
import { createPage, deletePageData, insertDuplicatePage, reorderPageData, replaceTemplateData } from './pageOperations'

describe('page domain operations', () => {
  it('범위를 벗어난 이동과 동일 위치 이동은 상태를 변경하지 않는다', () => {
    const pages = [createPage('midnight-quote'), createPage('cover-hook')]
    expect(reorderPageData(pages, -1, 1)).toBeNull()
    expect(reorderPageData(pages, 0, 2)).toBeNull()
    expect(reorderPageData(pages, 1, 1)).toBeNull()
    expect(reorderPageData(pages, 0, 1)?.map((page) => page.id)).toEqual([pages[1].id, pages[0].id])
  })

  it('마지막 페이지 삭제를 막고 복제 시 새 ID를 만든다', () => {
    const only = createPage()
    expect(deletePageData([only], only.id)).toBeNull()
    const pages = [only, createPage('cover-hook')]
    const duplicated = insertDuplicatePage(pages, only.id)
    expect(duplicated).toHaveLength(3)
    expect(new Set(duplicated?.map((page) => page.id)).size).toBe(3)
  })

  it('페이지 최대 개수를 초과해 복제하지 않는다', () => {
    const page = createPage()
    const pages = Array.from({ length: 100 }, (_, index) => ({ ...page, id: `page-${index}` }))
    expect(insertDuplicatePage(pages, pages[0].id)).toBeNull()
  })

  it('템플릿 교체 시 공통 콘텐츠와 모든 이미지, 디자인을 유지한다', () => {
    const source = {
      ...createPage('cover-hook'),
      content: { kicker: '분류', title: '유지할 제목', subtitle: '유지할 설명' },
      backgroundImage: 'data:image/png;base64,YQ==',
      image: 'data:image/png;base64,Yg==',
      overlayImage: { src: 'data:image/png;base64,Yw==', x: 40, y: 50, width: 30 },
    }
    const replaced = replaceTemplateData(source, 'image-text')
    expect(replaced?.content.title).toBe('유지할 제목')
    expect(replaced?.content.body).toBe('유지할 설명')
    expect(replaced?.backgroundImage).toBe(source.backgroundImage)
    expect(replaced?.image).toBe(source.image)
    expect(replaced?.overlayImage).toEqual(source.overlayImage)
  })
})
