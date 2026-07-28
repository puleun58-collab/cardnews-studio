import { describe, expect, it } from 'vitest'
import { analyzeTemplateMapping, createPage, deletePageData, insertDuplicatePage, reorderPageData, replaceTemplateData } from './pageOperations'

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

  it('동일 필드는 보존하고 alias 필드는 변환하며 기본값 사용을 기록한다', () => {
    const source = {
      ...createPage('cover-hook'),
      content: { title: '동일 제목', subtitle: '설명으로 이동' },
    }
    const result = analyzeTemplateMapping(source, 'image-text')!
    expect(result.preservedFields).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceKey: 'title', targetKey: 'title', targetValue: '동일 제목' }),
    ]))
    expect(result.convertedFields).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceKey: 'subtitle', targetKey: 'body', targetValue: '설명으로 이동' }),
    ]))
    expect(result.defaultedFields).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetKey: 'caption' }),
    ]))
  })

  it('문자열 길이와 목록 개수 잘림, 매핑 불가능 필드를 손실로 판정한다', () => {
    const longTitle = '가'.repeat(140)
    const source = {
      ...createPage('list-insight'),
      content: {
        title: longTitle,
        items: ['1', '2', '3', '4', '5', '6', '7'],
        closing: '유지 불가능한 마무리',
        custom: '사용자 정의 원문',
      },
    }
    const result = analyzeTemplateMapping(source, 'image-text')!
    expect(result.truncatedFields).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceKey: 'title', targetKey: 'title' }),
    ]))
    expect(result.discardedFields).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceKey: 'items' }),
      expect.objectContaining({ sourceKey: 'custom' }),
    ]))
    expect(result.hasPotentialDataLoss).toBe(true)

    const listTarget = analyzeTemplateMapping({
      ...createPage('process-steps'),
      content: { title: '목록 제목', items: ['1', '2', '3', '4', '5', '6'] },
    }, 'list-insight')!
    expect(listTarget.truncatedFields).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetKey: 'items', reason: expect.stringContaining('최대 5개') }),
    ]))
  })

  it('이미지와 디자인을 보존하면서 대상에서 보이지 않는 항목을 별도 안내한다', () => {
    const source = {
      ...createPage('image-text'),
      image: 'idb-image:sha256-content',
      backgroundImage: 'idb-image:sha256-background',
      overlayImage: { src: 'idb-image:sha256-overlay', x: 20, y: 30, width: 40 },
    }
    const result = analyzeTemplateMapping(source, 'midnight-quote')!
    expect(result.page.image).toBe(source.image)
    expect(result.page.backgroundImage).toBe(source.backgroundImage)
    expect(result.page.overlayImage).toEqual(source.overlayImage)
    expect(result.preservedImages).toEqual(['배경 이미지', '콘텐츠 이미지', '떠있는 이미지'])
    expect(result.unsupportedImages).toContain('콘텐츠 이미지 영역')
    expect(result.page.design).toBeDefined()
    expect(result.hasPotentialDataLoss).toBe(true)
  })
})
