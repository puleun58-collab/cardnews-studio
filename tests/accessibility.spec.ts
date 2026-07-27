import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

async function reset(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
}

async function createProject(page: import('@playwright/test').Page) {
  await reset(page)
  await page.getByRole('button', { name: '새 프로젝트 만들기' }).click()
  await expect(page.locator('.studio')).toBeVisible()
}

test('홈과 편집기에 자동 접근성 위반이 없다', async ({ page }) => {
  await reset(page)
  const homeResults = await new AxeBuilder({ page }).analyze()
  expect(homeResults.violations).toEqual([])

  await page.getByRole('button', { name: '새 프로젝트 만들기' }).click()
  const editorResults = await new AxeBuilder({ page }).analyze()
  expect(editorResults.violations).toEqual([])

  await page.locator('.template-picker summary').click()
  await page.getByText('고급 설정', { exact: true }).click()
  const expandedEditorResults = await new AxeBuilder({ page }).analyze()
  expect(expandedEditorResults.violations).toEqual([])
})

test('축소된 모바일 viewport에서도 편집 영역과 터치 대상이 유지된다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 })
  await createProject(page)

  await page.getByRole('button', { name: '편집', exact: true }).click()
  await expect(page.locator('.editor-panel')).toBeVisible()
  const layout = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    workspaceHeight: document.querySelector('.workspace')?.getBoundingClientRect().height ?? 0,
    smallButtons: [...document.querySelectorAll<HTMLButtonElement>('button')]
      .filter((button) => button.offsetParent !== null && !button.closest('.export-stage'))
      .map((button) => ({ name: button.textContent?.trim(), width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height }))
      .filter((button) => button.width < 44 || button.height < 44),
  }))
  expect(layout.overflow).toBe(0)
  expect(layout.workspaceHeight).toBeGreaterThan(240)
  expect(layout.smallButtons).toEqual([])
})

test('reduced-motion과 dialog 키보드 포커스 흐름을 존중한다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await createProject(page)

  const transitionSeconds = await page.locator('.project-card, .toolbar button').first().evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration))
  expect(transitionSeconds).toBeLessThan(.001)

  const feedButton = page.getByRole('button', { name: '피드', exact: true })
  await feedButton.click()
  await expect(page.getByRole('dialog', { name: '피드 미리보기' })).toBeVisible()
  await expect(page.getByRole('button', { name: '격자', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '피드 미리보기' })).toHaveCount(0)
  await expect(feedButton).toBeFocused()
})

test('home visual foundation stays warm white and loads the display font', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await reset(page)
  await page.waitForFunction(() => document.fonts.check('500 46px "Noto Serif KR Variable"'))

  const result = await page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>('.home-shell')
    const heading = document.querySelector<HTMLElement>('.new-project-intro h2')

    return {
      background: shell ? getComputedStyle(shell).backgroundColor : null,
      headingFont: heading ? getComputedStyle(heading).fontFamily : null,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }
  })

  expect(result.background).toBe('rgb(245, 245, 242)')
  expect(result.headingFont).toContain('Noto Serif KR Variable')
  expect(result.overflow).toBe(0)
  await expect(page.getByRole('heading', { level: 1, name: 'CARDNEWS STUDIO' })).toBeVisible()
  await expect(page.locator('.brand-mark')).toHaveAttribute('data-logo', 'c-frame')
  await expect(page.locator('.brand-mark')).toHaveText('')
  await expect.poll(() => page.locator('.brand-mark').evaluate((node) => ({
    stroke: getComputedStyle(node, '::before').borderTopWidth,
    opening: getComputedStyle(node, '::after').height,
  }))).toEqual({ stroke: '5px', opening: '14px' })
  await expect(page.locator('.new-project-intro p span')).toHaveCount(2)
})
