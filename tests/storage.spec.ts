import { expect, test, type Page } from '@playwright/test'

const pixelDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8Dwn4GBgYGJAQoAHgQCAf8nL9sAAAAASUVORK5CYII='

const legacyProject = {
  schemaVersion: 1,
  id: 'legacy-project',
  name: '이전 저장 프로젝트',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  pages: [{
    id: 'legacy-page',
    templateId: 'midnight-quote',
    variantId: 'default',
    content: { kicker: '', body: '자동 이전된 본문', source: '', note: '' },
    backgroundImage: pixelDataUrl,
    overlayImage: null,
  }],
}

async function readStoredBody(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('cardnews-studio')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const transaction = database.transaction('pages', 'readonly')
    const request = transaction.objectStore('pages').getAll()
    const records = await new Promise<Array<{ content: { body?: string } }>>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    database.close()
    return records[0]?.content.body ?? null
  })
}

test('기존 localStorage를 원본 보존 상태로 IndexedDB와 Blob 저장소에 이전한다', async ({ page }) => {
  const raw = JSON.stringify({
    projects: [legacyProject],
    activeProjectId: legacyProject.id,
    activePageId: legacyProject.pages[0].id,
  })
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: 'cardnews-studio-hageon-v1',
    value: raw,
  })
  await page.goto('/')
  await expect(page.locator('.studio')).toBeVisible()
  await expect(page.getByRole('textbox', { name: /본문 \d/ })).toHaveValue('자동 이전된 본문')
  await expect(page.locator('.storage-warning')).toHaveCount(0)
  await page.getByRole('button', { name: '처음으로' }).click()
  await expect(page.locator('.storage-warning')).toContainText('안전하게 이전')
  await expect(page.getByRole('button', { name: '이미지 포함 백업' })).toBeVisible()
  await page.getByText('브라우저 저장소 관리').click()
  await expect(page.getByRole('button', { name: /이미지 포함 전체 백업/ })).toContainText('완전히 복구')
  await expect(page.getByRole('button', { name: /이미지 제외 경량 백업/ })).toContainText('이미지는 복구되지 않습니다')
  await expect(page.locator('.keep-together')).toHaveCount(2)
  await expect(page.locator('.keep-together').nth(0)).toHaveCSS('white-space', 'nowrap')
  await expect(page.locator('.keep-together').nth(1)).toHaveCSS('white-space', 'nowrap')
  await expect(page.locator('.storage-management summary')).toHaveCSS('list-style-type', 'none')

  const stored = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('cardnews-studio')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const transaction = database.transaction(['projects', 'pages', 'images'], 'readonly')
    const getAll = <T>(store: string) => new Promise<T[]>((resolve, reject) => {
      const request = transaction.objectStore(store).getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const [projects, pages, images] = await Promise.all([
      getAll<{ schemaVersion: number }>('projects'),
      getAll<{ backgroundImage: string }>('pages'),
      getAll<{ blob: Blob }>('images'),
    ])
    database.close()
    return {
      schemaVersion: projects[0]?.schemaVersion,
      imageReference: pages[0]?.backgroundImage,
      imageIsBlob: images[0]?.blob instanceof Blob,
      legacyRetained: localStorage.getItem('cardnews-studio-hageon-v1'),
    }
  })
  expect(stored).toEqual({
    schemaVersion: 2,
    imageReference: expect.stringMatching(/^idb-image:/),
    imageIsBlob: true,
    legacyRetained: raw,
  })
})

test('텍스트 입력은 debounce 후 변경 프로젝트만 저장하고 새로고침 전 복구 저널을 사용한다', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: '새 프로젝트 만들기' }).click()
  await expect(page.locator('.save-status')).toContainText('저장 완료')
  const body = page.getByRole('textbox', { name: /본문 \d/ })
  const before = await readStoredBody(page)
  await body.fill('debounce 이후 저장')
  await expect(page.locator('.save-status')).toContainText('저장되지 않은 변경')
  expect(await readStoredBody(page)).toBe(before)
  await expect.poll(() => readStoredBody(page), { timeout: 3_000 }).toBe('debounce 이후 저장')
  await expect(page.locator('.save-status')).toContainText('저장 완료')
  expect(await page.evaluate(() => localStorage.getItem('cardnews-studio-hageon-v1'))).toBeNull()

  await body.fill('새로고침 직전 변경')
  await page.reload()
  await expect(page.getByRole('textbox', { name: /본문 \d/ })).toHaveValue('새로고침 직전 변경')
})
