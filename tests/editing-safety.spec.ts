import { expect, test, type Page } from '@playwright/test'

const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8Dwn4GBgYGJAQoAHgQCAf8nL9sAAAAASUVORK5CYII=', 'base64')

async function fresh(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload()
}

async function createProject(page: Page, name: string) {
  await fresh(page)
  await page.getByLabel('프로젝트 이름').fill(name)
  await page.getByRole('button', { name: '새 프로젝트 만들기' }).click()
  await expect(page.locator('.studio')).toBeVisible()
  await expect(page.locator('.save-status')).toContainText('저장 완료')
}

async function confirmDelete(page: Page) {
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: '삭제', exact: true }).click()
}

async function storedProjectCount(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('cardnews-studio')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const transaction = database.transaction('projects', 'readonly')
    const request = transaction.objectStore('projects').count()
    const count = await new Promise<number>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    database.close()
    return count
  })
}

test('프로젝트 삭제는 지연 확정되고 Undo 시 원래 위치와 데이터를 복구한다', async ({ page }) => {
  await createProject(page, '복구할 프로젝트')
  const body = page.getByRole('textbox', { name: /본문 \d/ })
  await body.fill('삭제 전 전체 데이터')
  await expect(page.locator('.save-status')).toContainText('저장 완료')
  await page.getByRole('button', { name: '처음으로' }).click()
  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await confirmDelete(page)
  await expect(page.getByText('복구할 프로젝트', { exact: true })).toHaveCount(0)
  await expect.poll(() => storedProjectCount(page)).toBe(1)
  const undo = page.getByRole('button', { name: /복구할 프로젝트.*실행 취소/ })
  await expect(undo).toBeVisible()
  await undo.click()
  await expect(page.getByLabel('프로젝트 이름 바꾸기')).toHaveValue('복구할 프로젝트')
  await page.getByRole('button', { name: '복구할 프로젝트 열기' }).click()
  await expect(body).toHaveValue('삭제 전 전체 데이터')
})

test('프로젝트 삭제 pending은 새로고침 뒤 이어지고 시간이 지나야 IndexedDB에서 삭제된다', async ({ page }) => {
  await createProject(page, '만료할 프로젝트')
  await page.getByRole('button', { name: '처음으로' }).click()
  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await confirmDelete(page)
  await expect.poll(() => page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('cardnews-studio')
      request.onsuccess = () => resolve(request.result)
    })
    const transaction = database.transaction('meta', 'readonly')
    const request = transaction.objectStore('meta').get('pending-deletions-v1')
    const value = await new Promise<unknown>((resolve) => { request.onsuccess = () => resolve(request.result) })
    database.close()
    return Boolean(value)
  })).toBe(true)
  await page.reload()
  await expect(page.getByRole('button', { name: /만료할 프로젝트.*실행 취소/ })).toBeVisible()
  await expect.poll(() => storedProjectCount(page), { timeout: 11_000 }).toBe(0)
  await expect(page.getByRole('button', { name: /만료할 프로젝트.*실행 취소/ })).toHaveCount(0)
})

test('페이지 삭제는 다음 페이지를 선택하고 Undo 시 원래 위치와 활성 페이지를 복구한다', async ({ page }) => {
  await createProject(page, '페이지 복구')
  const body = page.getByRole('textbox', { name: /본문 \d/ })
  await body.fill('첫 페이지')
  await page.getByRole('button', { name: '복제', exact: true }).click()
  await body.fill('둘째 페이지')
  await page.getByRole('button', { name: '페이지 추가' }).click()
  await body.fill('셋째 페이지')
  await page.locator('.page-thumb').nth(1).click()
  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await confirmDelete(page)
  await expect(page.locator('.page-thumb')).toHaveCount(2)
  await expect(body).toHaveValue('셋째 페이지')
  await page.getByRole('button', { name: /2번째 페이지.*실행 취소/ }).click()
  await expect(page.locator('.page-thumb')).toHaveCount(3)
  await expect(body).toHaveValue('둘째 페이지')
  await expect(page.locator('.page-thumb').nth(1)).toContainText('둘째 페이지')
})

test('페이지 추가·재정렬은 Undo·Redo되고 Undo 상태가 새로고침 후 저장된다', async ({ page }) => {
  await createProject(page, '구조 히스토리')
  const body = page.getByRole('textbox', { name: /본문 \d/ })
  await body.fill('첫 페이지')
  await page.getByRole('button', { name: '페이지 추가' }).click()
  await expect(page.locator('.page-thumb')).toHaveCount(2)
  await page.getByRole('button', { name: '실행 취소', exact: true }).click()
  await expect(page.locator('.page-thumb')).toHaveCount(1)
  await page.getByRole('button', { name: '다시 실행', exact: true }).click()
  await expect(page.locator('.page-thumb')).toHaveCount(2)
  await body.fill('둘째 페이지')

  const thumbs = page.locator('.page-thumb')
  const source = await thumbs.nth(0).boundingBox()
  const target = await thumbs.nth(1).boundingBox()
  if (!source || !target) throw new Error('페이지 썸네일 위치를 찾지 못했습니다.')
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
  await page.mouse.down()
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 })
  await page.mouse.up()
  await expect(thumbs.nth(1)).toContainText('첫 페이지')
  await page.getByRole('button', { name: '실행 취소', exact: true }).click()
  await expect(thumbs.nth(0)).toContainText('첫 페이지')
  await expect(page.locator('.save-status')).toContainText('저장 완료')
  await page.reload()
  await expect(page.locator('.page-thumb').nth(0)).toContainText('첫 페이지')
  await expect(page.locator('.page-thumb')).toHaveCount(2)
})

test('페이지 복제·삭제, 캔버스와 이미지 변경이 프로젝트 히스토리에 포함된다', async ({ page }) => {
  await createProject(page, '확장 히스토리')
  await page.getByRole('button', { name: '복제', exact: true }).click()
  await expect(page.locator('.page-thumb')).toHaveCount(2)
  await page.getByRole('button', { name: '실행 취소', exact: true }).click()
  await expect(page.locator('.page-thumb')).toHaveCount(1)
  await page.getByRole('button', { name: '다시 실행', exact: true }).click()
  await expect(page.locator('.page-thumb')).toHaveCount(2)

  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await confirmDelete(page)
  await expect(page.locator('.page-thumb')).toHaveCount(1)
  await page.getByRole('button', { name: '실행 취소', exact: true }).click()
  await expect(page.locator('.page-thumb')).toHaveCount(2)
  await expect(page.locator('.undo-notice')).toHaveCount(0)
  await page.getByRole('button', { name: '다시 실행', exact: true }).click()
  await expect(page.locator('.page-thumb')).toHaveCount(1)

  const size = page.getByRole('combobox', { name: '캔버스 크기' })
  await size.selectOption('square')
  await expect(page.locator('.preview-title')).toContainText('1080 × 1080')
  await page.getByRole('button', { name: '실행 취소', exact: true }).click()
  await expect(page.locator('.preview-title')).toContainText('1080 × 1350')
  await page.getByRole('button', { name: '다시 실행', exact: true }).click()
  await expect(page.locator('.preview-title')).toContainText('1080 × 1080')

  await page.locator('.image-upload-section input[type=file]').setInputFiles({ name: 'history.png', mimeType: 'image/png', buffer: pixel })
  await expect(page.locator('.preview-panel .card-background')).toBeVisible()
  await page.getByRole('button', { name: '실행 취소', exact: true }).click()
  await expect(page.locator('.preview-panel .card-background')).toHaveCount(0)
  await page.getByRole('button', { name: '다시 실행', exact: true }).click()
  await expect(page.locator('.preview-panel .card-background')).toBeVisible()

  await page.locator('.preview-image-input').setInputFiles({ name: 'overlay-history.png', mimeType: 'image/png', buffer: pixel })
  const overlay = page.locator('.overlay-image.interactive')
  await expect(overlay).toBeVisible()
  await page.getByRole('button', { name: '실행 취소', exact: true }).click()
  await expect(overlay).toHaveCount(0)
  await page.getByRole('button', { name: '다시 실행', exact: true }).click()
  await expect(overlay).toBeVisible()
  const beforeLeft = await overlay.evaluate((element) => parseFloat((element as HTMLElement).style.left))
  await overlay.focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => overlay.evaluate((element) => parseFloat((element as HTMLElement).style.left))).toBeGreaterThan(beforeLeft)
  await page.getByRole('button', { name: '실행 취소', exact: true }).click()
  await expect.poll(() => overlay.evaluate((element) => parseFloat((element as HTMLElement).style.left))).toBe(beforeLeft)
  await page.getByRole('button', { name: '다시 실행', exact: true }).click()
  await expect.poll(() => overlay.evaluate((element) => parseFloat((element as HTMLElement).style.left))).toBeGreaterThan(beforeLeft)
})

test('템플릿 손실 안내에서 취소는 불변이고 변경 후 Undo는 원본 전체를 복구한다', async ({ page }) => {
  await createProject(page, '템플릿 안전')
  const body = page.getByRole('textbox', { name: /본문 \d/ })
  const note = page.getByRole('textbox', { name: /하단 문구/ })
  await body.fill('보존할 본문')
  await note.fill('새 템플릿에서 제외될 원문')
  await page.locator('.image-upload-section input[type=file]').setInputFiles({ name: 'background.png', mimeType: 'image/png', buffer: pixel })
  await page.locator('.template-picker summary').click()
  const imageTemplate = page.getByRole('radio', { name: '이미지 스토리', exact: true })
  await imageTemplate.click()
  const dialog = page.getByRole('dialog', { name: /이미지 스토리.*변경/ })
  await expect(dialog).toContainText('새 템플릿에서 제외')
  await expect(dialog).toContainText('배경 이미지')
  await dialog.getByRole('button', { name: '취소' }).click()
  await expect(page.locator('.preview-panel .card-root').first()).toHaveAttribute('data-template', 'midnight-quote')
  await expect(note).toHaveValue('새 템플릿에서 제외될 원문')
  await imageTemplate.click()
  await page.getByRole('dialog', { name: /이미지 스토리.*변경/ }).getByRole('button', { name: '변경', exact: true }).click()
  await expect(page.locator('.preview-panel .card-root').first()).toHaveAttribute('data-template', 'image-text')
  await page.getByRole('button', { name: '실행 취소', exact: true }).click()
  await expect(page.locator('.preview-panel .card-root').first()).toHaveAttribute('data-template', 'midnight-quote')
  await expect(body).toHaveValue('보존할 본문')
  await expect(note).toHaveValue('새 템플릿에서 제외될 원문')
})

test('프로젝트별 마지막 페이지를 독립적으로 기억한다', async ({ page }) => {
  await createProject(page, '프로젝트 A')
  const body = page.getByRole('textbox', { name: /본문 \d/ })
  await body.fill('A 첫 페이지')
  await page.getByRole('button', { name: '페이지 추가' }).click()
  await body.fill('A 마지막 페이지')
  await page.getByRole('button', { name: '처음으로' }).click()
  await page.getByLabel('프로젝트 이름', { exact: true }).fill('프로젝트 B')
  await page.getByRole('button', { name: '새 프로젝트 만들기' }).click()
  await body.fill('B 첫 페이지')
  await page.getByRole('button', { name: '처음으로' }).click()
  await page.getByRole('button', { name: '프로젝트 A 열기' }).click()
  await expect(body).toHaveValue('A 마지막 페이지')
  await expect(page.locator('.page-thumb').nth(1)).toHaveAttribute('aria-pressed', 'true')
})

test('프로젝트 복제본은 원본 편집 세션을 공유하지 않고 첫 페이지에서 열린다', async ({ page }) => {
  await createProject(page, '세션 원본')
  const body = page.getByRole('textbox', { name: /본문 \d/ })
  await body.fill('원본 첫 페이지')
  await page.getByRole('button', { name: '페이지 추가' }).click()
  await body.fill('원본 마지막 페이지')
  await page.getByRole('button', { name: '처음으로' }).click()
  await page.getByRole('button', { name: '복제', exact: true }).click()
  await page.getByRole('button', { name: '세션 원본 복사본 열기' }).click()
  await expect(body).toHaveValue('원본 첫 페이지')
  await expect(page.locator('.page-thumb').nth(0)).toHaveAttribute('aria-pressed', 'true')
})

test('모바일과 키보드만으로 페이지 삭제 Undo를 사용할 수 있다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await createProject(page, '모바일 복구')
  await page.getByRole('button', { name: '페이지', exact: true }).last().click()
  await page.getByRole('button', { name: '페이지 추가' }).click()
  const deleteButton = page.getByRole('button', { name: '삭제', exact: true })
  await deleteButton.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  const undoButton = page.getByRole('button', { name: /2번째 페이지.*실행 취소/ })
  await undoButton.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.page-thumb')).toHaveCount(2)
})

test('저장 실패 상태에서 Undo한 최신 revision을 다시 저장하고 새로고침해 복구한다', async ({ page }) => {
  await createProject(page, '저장 실패 복구')
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put
    ;(window as typeof window & { __failProjectWrites?: boolean }).__failProjectWrites = true
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'projects' && (window as typeof window & { __failProjectWrites?: boolean }).__failProjectWrites) {
        throw new DOMException('injected quota failure', 'QuotaExceededError')
      }
      return Reflect.apply(original, this, args)
    }
  })
  await page.getByRole('button', { name: '페이지 추가' }).click()
  await expect(page.locator('.storage-warning')).toContainText('자동 저장')
  await page.getByRole('button', { name: '실행 취소', exact: true }).click()
  await expect(page.locator('.page-thumb')).toHaveCount(1)
  await page.evaluate(() => {
    ;(window as typeof window & { __failProjectWrites?: boolean }).__failProjectWrites = false
  })
  await page.getByRole('button', { name: '다시 저장' }).click()
  await expect(page.locator('.save-status')).toContainText('저장 완료')
  await page.reload()
  await expect(page.locator('.page-thumb')).toHaveCount(1)
})
