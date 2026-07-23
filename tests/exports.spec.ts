import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'
import JSZip from 'jszip'
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8Dwn4GBgYGJAQoAHgQCAf8nL9sAAAAASUVORK5CYII=','base64')
async function create(page:import('@playwright/test').Page){await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();await page.getByRole('button',{name:'새 프로젝트 만들기'}).click()}
test('PNG 1080x1350, 로컬 글꼴, 떠있는 이미지, ZIP 페이지 순서',async({page})=>{await create(page);await expect.poll(()=>page.evaluate(()=>document.fonts.check('62px Pretendard'))).toBe(true);await expect(page.locator('.midnight blockquote').first()).toHaveCSS('font-family',/Pretendard/);await page.locator('.preview-image-input').setInputFiles({name:'export-overlay.png',mimeType:'image/png',buffer:pixel});const overlay=page.locator('.overlay-image.interactive');await overlay.focus();for(let index=0;index<10;index++){await page.keyboard.press('Shift+ArrowRight');await page.keyboard.press('Shift+ArrowDown')}await expect(overlay).toBeVisible();const pngEvent=page.waitForEvent('download');await page.getByRole('button',{name:'PNG',exact:true}).click();const png=await pngEvent;const pngBuffer=await (await import('node:fs/promises')).readFile(await png.path() as string);const dimensions=PNG.sync.read(pngBuffer);expect(dimensions.width).toBe(1080);expect(dimensions.height).toBe(1350);await page.getByRole('button',{name:'페이지 추가'}).click();const zipEvent=page.waitForEvent('download');await page.getByRole('button',{name:'ZIP',exact:true}).click();const download=await zipEvent;const zipBuffer=await (await import('node:fs/promises')).readFile(await download.path() as string);const zip=await JSZip.loadAsync(zipBuffer);const names=Object.keys(zip.files);expect(names).toHaveLength(2);expect(names[0]).toMatch(/-001\.png$/);expect(names[1]).toMatch(/-002\.png$/);for(const name of names){const image=PNG.sync.read(await zip.file(name)!.async('nodebuffer'));expect([image.width,image.height]).toEqual([1080,1350])}})

test('정사각형, 스토리, 사용자 지정 크기를 미리보기와 PNG에 반영',async({page})=>{
  await create(page)
  const sizeSelect=page.getByRole('combobox',{name:'캔버스 크기'})
  const readDownload=async()=>{
    const event=page.waitForEvent('download')
    await page.getByRole('button',{name:'PNG',exact:true}).click()
    const download=await event
    return PNG.sync.read(await (await import('node:fs/promises')).readFile(await download.path() as string))
  }

  await sizeSelect.selectOption('square')
  await expect(page.locator('.preview-title').getByText('1080 × 1080',{exact:true})).toBeVisible()
  await expect(page.locator('.card-root').first()).toHaveClass(/format-square/)
  let image=await readDownload()
  expect([image.width,image.height]).toEqual([1080,1080])

  await sizeSelect.selectOption('story')
  await expect(page.locator('.preview-title').getByText('1080 × 1920',{exact:true})).toBeVisible()
  await expect(page.locator('.card-root').first()).toHaveClass(/format-story/)
  image=await readDownload()
  expect([image.width,image.height]).toEqual([1080,1920])

  await sizeSelect.selectOption('custom')
  await page.getByLabel('사용자 지정 너비').fill('720')
  await page.getByLabel('사용자 지정 높이').fill('1280')
  await expect(page.locator('.preview-title').getByText('720 × 1280',{exact:true})).toBeVisible()
  image=await readDownload()
  expect([image.width,image.height]).toEqual([720,1280])
})
