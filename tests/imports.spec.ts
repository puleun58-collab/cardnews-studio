import { expect, test } from '@playwright/test'

const pageData = {
  id: 'page-1',
  templateId: 'midnight-quote',
  variantId: 'default',
  content: { kicker: '', body: '이전 데이터', source: '', note: '' },
  overlayImage: null,
}

const project = (pages = 1) => ({
  schemaVersion: 1,
  id: 'project-1',
  name: '가져오기 검사',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  pages: Array.from({ length: pages }, (_, index) => ({ ...pageData, id: `page-${index}` })),
})

async function home(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: '새 프로젝트 만들기' }).click()
}

test('invalid JSON, 미래 버전, 100페이지 초과를 거부하고 이전 design을 복구', async ({ page }) => {
  await home(page)
  const input = page.locator('input[accept*="json"]')
  const invalidFiles = [
    { name: 'invalid.json', body: '{' },
    { name: 'future.json', body: JSON.stringify({ schemaVersion: 99, project: project() }) },
    { name: 'too-many.json', body: JSON.stringify({ schemaVersion: 1, project: project(101) }) },
  ]

  for (const file of invalidFiles) {
    await input.setInputFiles({ name: file.name, mimeType: 'application/json', buffer: Buffer.from(file.body) })
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('button', { name: 'JSON 다시 선택' })).toBeVisible()
  }

  await input.setInputFiles({ name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, project: project() })) })
  await expect(page.locator('.studio')).toBeVisible()
  await expect(page.getByLabel('배경색 코드')).toHaveValue('#141C33')
})

test('저장 용량 오류를 사용자에게 표시', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function setItem(key, value) {
      if (key.includes('cardnews-studio-hageon-v1')) throw new DOMException('quota', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
  await page.goto('/')
  await page.getByRole('button', { name: '새 프로젝트 만들기' }).click()
  await expect(page.locator('.save-status')).toContainText('저장 공간이 부족합니다')
})
