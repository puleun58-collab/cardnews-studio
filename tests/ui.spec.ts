import { expect, test } from '@playwright/test'
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8Dwn4GBgYGJAQoAHgQCAf8nL9sAAAAASUVORK5CYII=', 'base64')
async function create(page: import('@playwright/test').Page){await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();await page.getByRole('button',{name:'새 프로젝트 만들기'}).click();await expect(page.locator('.studio')).toBeVisible()}
const templates=[['cover-hook','임팩트 표지'],['midnight-quote','문장 카드'],['stat-highlight','핵심 수치'],['list-insight','핵심 인사이트'],['process-steps','단계별 가이드'],['comparison','비교 분석'],['quote-commentary','인용·해설'],['image-text','이미지 스토리'],['divider-closing','마무리 카드']] as const
async function openTemplates(page:import('@playwright/test').Page){const details=page.locator('.template-picker');if(!(await details.evaluate((element:HTMLDetailsElement)=>element.open)))await details.locator('summary').click()}
async function selectTemplate(page:import('@playwright/test').Page,name:string,id:string){await openTemplates(page);await page.getByRole('radio',{name,exact:true}).click();await expect(page.locator('.preview-panel .card-root').first()).toHaveAttribute('data-template',id)}
test('새 프로젝트 소개 문구가 의도한 두 줄로 표시된다',async({page})=>{
  await page.goto('/')
  const lines=page.locator('.new-project-intro p span')
  await expect(lines).toHaveCount(2)
  await expect(lines.nth(0)).toHaveText('단일 카드부터 9장 인사이트 스토리까지,')
  await expect(lines.nth(1)).toHaveText('필요한 구성으로 바로 시작할 수 있습니다.')
})
test('캔버스 크기 설정은 중복 라벨 없이 편집 패널 타이포그래피를 사용한다',async({page})=>{
  await create(page)
  await expect(page.getByText('출력 규격',{exact:true})).toHaveCount(0)
  const sizeSelect=page.getByRole('combobox',{name:'캔버스 크기'})
  await expect(sizeSelect).toHaveCSS('font-size','14px')
  await expect(sizeSelect).toHaveCSS('font-weight','500')
  await expect(sizeSelect.locator('option:checked')).toHaveText('인스타그램 · 1080 × 1350')
})
test('프로젝트, 9개 템플릿, 빈 kicker, 500자, overlay 저장과 복제',async({page})=>{const errors:string[]=[];page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text())});await create(page);await openTemplates(page);await expect(page.locator('.template-options').getByRole('radio')).toHaveCount(9);for(const [id,name] of templates)await selectTemplate(page,name,id);await selectTemplate(page,'문장 카드','midnight-quote');const kicker=page.getByRole('textbox',{name:/작은 제목/});await kicker.fill('');await expect(page.locator('.midnight .kicker').first()).toHaveText('');const body='가'.repeat(500);const bodyInput=page.getByRole('textbox',{name:/본문 \d/});await bodyInput.fill(body);await expect(page.getByText('500 / 500')).toBeVisible();await page.locator('.preview-image-input').setInputFiles({name:'overlay.png',mimeType:'image/png',buffer:pixel});await expect(page.locator('.overlay-image').first()).toBeVisible();const overlay=page.locator('.overlay-image.interactive');await overlay.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Shift+ArrowDown');await page.getByRole('button',{name:'복제'}).click();await expect(page.locator('.page-thumb')).toHaveCount(2);await page.reload();await expect(page.locator('.overlay-image').first()).toBeVisible();await expect(page.getByRole('textbox',{name:/본문 \d/})).toHaveValue(body);expect(errors).toEqual([])})
test('9개 템플릿에서 떠있는 이미지를 직접 추가·선택·이동·크기 조절·삭제한다',async({page})=>{
  await create(page)
  await expect(page.locator('.image-controls')).toHaveCount(0)
  for(const [id,name] of templates){
    await selectTemplate(page,name,id)
    await page.locator('.preview-image-input').setInputFiles({name:`${id}.png`,mimeType:'image/png',buffer:pixel})
    const overlay=page.locator('.overlay-image.interactive')
    await expect(overlay).toBeVisible()
    await expect(overlay).toHaveClass(/is-selected/)
    const deleteButton=page.getByRole('button',{name:'떠있는 이미지 삭제'})
    await expect(deleteButton).toBeVisible()
    const beforeWidth=await overlay.evaluate((element)=>parseFloat((element as HTMLElement).style.width))
    const resize=page.getByRole('button',{name:/떠있는 이미지 크기 조절/})
    if(id==='cover-hook'){
      const deleteTransform=await deleteButton.evaluate((element)=>getComputedStyle(element).transform)
      await deleteButton.hover()
      await expect(deleteButton).toHaveCSS('transform',deleteTransform)
      const resizeTransform=await resize.evaluate((element)=>getComputedStyle(element).transform)
      await resize.hover()
      await expect(resize).toHaveCSS('transform',resizeTransform)
    }
    await resize.focus()
    await page.keyboard.press('ArrowRight')
    await expect.poll(()=>overlay.evaluate((element)=>parseFloat((element as HTMLElement).style.width))).toBeGreaterThan(beforeWidth)
    const beforeLeft=await overlay.evaluate((element)=>parseFloat((element as HTMLElement).style.left))
    await overlay.focus()
    await page.keyboard.press('Shift+ArrowRight')
    await expect.poll(()=>overlay.evaluate((element)=>parseFloat((element as HTMLElement).style.left))).toBeGreaterThan(beforeLeft)
    await page.locator('.preview-panel .card-root').first().click({position:{x:10,y:10}})
    await expect(page.getByRole('button',{name:'떠있는 이미지 삭제'})).toHaveCount(0)
    await overlay.click()
    await page.getByRole('button',{name:'떠있는 이미지 삭제'}).click()
    await expect(overlay).toHaveCount(0)
  }
})

test('9장 인사이트 스토리 구성이 모든 신규 템플릿을 포함한다',async({page})=>{await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();await page.getByLabel('구성 방식').selectOption('insight-story');await page.getByRole('button',{name:'새 프로젝트 만들기'}).click();await expect(page.locator('.page-thumb')).toHaveCount(9);for(const [id] of templates)await expect(page.locator(`.page-thumb [data-template="${id}"]`)).toHaveCount(1)})
test('그라데이션 범위와 강도가 배경색과 배경 이미지에 저장·적용된다',async({page})=>{
  await create(page)
  const gradientToggle=page.getByRole('checkbox',{name:'그라데이션 사용'})
  const range=page.getByRole('slider',{name:/그라데이션 범위/})
  const strength=page.getByRole('slider',{name:/그라데이션 강도/})
  await expect(range).toBeDisabled()
  await gradientToggle.check()
  await range.fill('70')
  await strength.fill('55')
  await expect(page.locator('.preview-panel .midnight').first()).toHaveCSS('background-image',/linear-gradient/)
  await page.locator('.image-upload-section input[type=file]').setInputFiles({name:'gradient-background.png',mimeType:'image/png',buffer:pixel})
  await expect(page.locator('.preview-panel .card-gradient')).toHaveCSS('background-image',/linear-gradient/)
  await page.reload()
  await expect(gradientToggle).toBeChecked()
  await expect(range).toHaveValue('70')
  await expect(strength).toHaveValue('55')
  await expect(page.locator('.preview-panel .card-gradient')).toBeVisible()
})
test('추천 한글 9종과 영문 4종, 실행 취소와 다시 실행, 캔버스 배율이 동작한다',async({page})=>{
  await create(page)
  const koreanFonts=page.locator('[data-font-group="korean"]')
  const englishFonts=page.locator('[data-font-group="english"]')
  await expect(koreanFonts.getByRole('radio')).toHaveCount(9)
  await expect(englishFonts.getByRole('radio')).toHaveCount(4)
  await koreanFonts.getByText('G마켓 산스',{exact:false}).click()
  await englishFonts.getByText('Oswald',{exact:false}).click()
  await expect(page.locator('.preview-panel .midnight').first()).toHaveCSS('font-family',/Oswald Variable.*Gmarket Sans/)

  const body=page.getByRole('textbox',{name:/본문 \d/})
  const original=await body.inputValue()
  await body.fill('실행 취소를 확인하는 문장')
  await expect(page.getByRole('button',{name:'실행 취소'})).toBeEnabled()
  await page.getByRole('button',{name:'실행 취소'}).click()
  await expect(body).toHaveValue(original)
  await page.getByRole('button',{name:'다시 실행'}).click()
  await expect(body).toHaveValue('실행 취소를 확인하는 문장')

  await page.getByRole('button',{name:'100%',exact:true}).click()
  await expect(page.locator('.preview-host')).toHaveClass(/is-zoomed/)
  await expect(page.locator('.preview-panel .scaled-card')).toHaveCSS('width','1080px')
})

test('글꼴을 바꿔도 편집 패널 스크롤 위치가 유지된다',async({page})=>{
  await page.setViewportSize({width:1440,height:900})
  await create(page)
  const editor=page.locator('.editor-panel')
  const koreanFonts=page.locator('[data-font-group="korean"]')
  const englishFonts=page.locator('[data-font-group="english"]')
  await koreanFonts.scrollIntoViewIfNeeded()
  const before=await editor.evaluate((element)=>element.scrollTop)
  for(const name of ['Noto Sans KR','나눔스퀘어 네오','에스코어 드림','G마켓 산스','페이퍼로지','여기어때 잘난체','Cafe24 써라운드','Noto Serif KR','Pretendard']){
    await koreanFonts.getByText(name,{exact:false}).click()
    await expect.poll(()=>editor.evaluate((element)=>element.scrollTop)).toBe(before)
  }
  await englishFonts.scrollIntoViewIfNeeded()
  const englishBefore=await editor.evaluate((element)=>element.scrollTop)
  for(const name of ['Oswald','Cormorant Garamond','IBM Plex Mono','Manrope']){
    await englishFonts.getByText(name,{exact:false}).click()
    await expect.poll(()=>editor.evaluate((element)=>element.scrollTop)).toBe(englishBefore)
  }
})

test('배경, 템플릿 사진, 떠있는 이미지가 서로 구분되어 동작한다',async({page})=>{
  await page.goto('/')
  await page.evaluate(()=>localStorage.clear())
  await page.reload()
  await expect(page.getByRole('button',{name:'이미지로 시작'})).toHaveCount(0)
  await page.getByRole('button',{name:'새 프로젝트 만들기'}).click()
  await expect(page.locator('.canvas-upload')).toHaveCount(0)
  await page.locator('.image-upload-section input[type=file]').setInputFiles({name:'background.png',mimeType:'image/png',buffer:pixel})
  await expect(page.locator('.preview-panel .card-background img').first()).toBeVisible()
  await page.reload()
  await expect(page.locator('.preview-panel .card-background img').first()).toBeVisible()

  await page.locator('.preview-image-input').setInputFiles({name:'floating.png',mimeType:'image/png',buffer:pixel})
  await expect(page.locator('.preview-panel .overlay-image.interactive')).toBeVisible()

  await selectTemplate(page,'이미지 스토리','image-text')
  await page.locator('.template-image-field input[type=file]').setInputFiles({name:'content.png',mimeType:'image/png',buffer:pixel})
  await expect(page.locator('.preview-panel .hero-image img').first()).toBeVisible()
})
for(const viewport of [{width:360,height:800},{width:390,height:844},{width:768,height:1024},{width:1440,height:900}])test(`반응형 ${viewport.width}x${viewport.height}`,async({page})=>{await page.setViewportSize(viewport);await create(page);if(viewport.width<=860){await expect(page.getByRole('navigation',{name:'모바일 편집 탭'})).toBeVisible();for(const name of ['페이지','미리보기','편집'])await page.getByRole('button',{name,exact:true}).last().click()}else await expect(page.getByRole('navigation',{name:'모바일 편집 탭'})).toBeHidden();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);expect(overflow).toBe(0);await page.reload();await expect(page.locator('.preview-title').getByText('1080 × 1350',{exact:true})).toBeVisible()})

test('mobile feed cards fit their cells and project details keep a modest left inset', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await create(page)
  await page.locator('.toolbar-actions button').nth(2).click()

  const feedLayout = await page.evaluate(() => {
    const viewportCenter = window.innerWidth / 2
    const modal = document.querySelector<HTMLElement>('.feed-modal')!.getBoundingClientRect()
    const card = document.querySelector<HTMLElement>('.feed-card')!.getBoundingClientRect()
    const scaled = document.querySelector<HTMLElement>('.feed-card .scaled-card')!.getBoundingClientRect()
    return {
      modalCenterOffset: Math.abs(modal.left + modal.width / 2 - viewportCenter),
      cardOverflowX: Math.max(0, card.left - scaled.left, scaled.right - card.right),
      cardOverflowY: Math.max(0, card.top - scaled.top, scaled.bottom - card.bottom),
    }
  })

  expect(feedLayout.modalCenterOffset).toBeLessThanOrEqual(1)
  expect(feedLayout.cardOverflowX).toBeLessThanOrEqual(1)
  expect(feedLayout.cardOverflowY).toBeLessThanOrEqual(1)

  await page.locator('.feed-modal .danger').click()
  await page.locator('.back-button').click()

  const projectLayout = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('.project-card')!.getBoundingClientRect()
    const details = document.querySelector<HTMLElement>('.project-card-body')!.getBoundingClientRect()
    return {
      leftInset: details.left - card.left,
      rightInset: card.right - details.right,
    }
  })

  expect(projectLayout.leftInset).toBeCloseTo(12, 0)
  expect(projectLayout.rightInset).toBeCloseTo(12, 0)
})
