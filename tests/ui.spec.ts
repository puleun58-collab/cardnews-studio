import { expect, test } from '@playwright/test'
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8Dwn4GBgYGJAQoAHgQCAf8nL9sAAAAASUVORK5CYII=', 'base64')
async function create(page: import('@playwright/test').Page){await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();await page.getByRole('button',{name:'새 프로젝트 만들기'}).click();await expect(page.locator('.studio')).toBeVisible()}
const templates=[['cover-hook','강한 표지'],['midnight-quote','미드나이트 문장'],['stat-highlight','숫자 강조'],['list-insight','인사이트 목록'],['process-steps','단계 설명'],['comparison','양쪽 비교'],['quote-commentary','인용과 해설'],['image-text','사진과 글'],['divider-closing','구분·마무리']] as const
async function openTemplates(page:import('@playwright/test').Page){const details=page.locator('.template-picker');if(!(await details.evaluate((element:HTMLDetailsElement)=>element.open)))await details.locator('summary').click()}
async function selectTemplate(page:import('@playwright/test').Page,name:string,id:string){await openTemplates(page);await page.getByRole('radio',{name,exact:true}).click();await expect(page.locator('.preview-panel .card-root').first()).toHaveAttribute('data-template',id)}
test('프로젝트, 9개 템플릿, 빈 kicker, 500자, overlay 저장과 복제',async({page})=>{const errors:string[]=[];page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text())});await create(page);await openTemplates(page);await expect(page.locator('.template-options').getByRole('radio')).toHaveCount(9);for(const [id,name] of templates)await selectTemplate(page,name,id);await selectTemplate(page,'미드나이트 문장','midnight-quote');const kicker=page.getByRole('textbox',{name:/작은 제목/});await kicker.fill('');await expect(page.locator('.midnight .kicker').first()).toHaveText('');const body='가'.repeat(500);const bodyInput=page.getByRole('textbox',{name:/본문 \d/});await bodyInput.fill(body);await expect(page.getByText('500 / 500')).toBeVisible();await page.locator('input[type=file]').last().setInputFiles({name:'overlay.png',mimeType:'image/png',buffer:pixel});await expect(page.locator('.overlay-image').first()).toBeVisible();const overlay=page.locator('.overlay-image.interactive');await overlay.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Shift+ArrowDown');await page.getByRole('button',{name:'복제'}).click();await expect(page.locator('.page-thumb')).toHaveCount(2);await page.reload();await expect(page.locator('.overlay-image').first()).toBeVisible();await expect(page.getByRole('textbox',{name:/본문 \d/})).toHaveValue(body);expect(errors).toEqual([])})
test('9개 템플릿 떠있는 이미지 업로드·끝점·드래그·삭제',async({page})=>{await create(page);for(const [id,name] of templates){await selectTemplate(page,name,id);await page.locator('input[type=file]').last().setInputFiles({name:`${id}.png`,mimeType:'image/png',buffer:pixel});const overlay=page.locator('.overlay-image.interactive');await expect(overlay).toBeVisible();const imageDetails=page.locator('.image-controls');if(!(await imageDetails.evaluate((element:HTMLDetailsElement)=>element.open)))await imageDetails.locator('summary').click();await page.getByRole('slider',{name:/떠있는 이미지 너비/}).fill('100');await page.getByRole('slider',{name:/가로 위치/}).fill('100');await page.getByRole('slider',{name:/세로 위치/}).fill('0');const box=await overlay.boundingBox();if(box){await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+Math.min(box.width,20),box.y+Math.min(box.height,20));await page.mouse.up()}await page.locator('.image-controls').getByRole('button',{name:'삭제',exact:true}).click();await expect(overlay).toHaveCount(0)}})

test('인사이트 7장 추천 구성이 새 정보 템플릿을 포함한다',async({page})=>{await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();await page.getByLabel('추천 구성').selectOption('insight-story');await page.getByRole('button',{name:'새 프로젝트 만들기'}).click();await expect(page.locator('.page-thumb')).toHaveCount(7);for(const id of ['stat-highlight','process-steps','comparison'])await expect(page.locator(`.page-thumb [data-template="${id}"]`)).toHaveCount(1)})
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

  await page.locator('.image-controls input[type=file]').setInputFiles({name:'floating.png',mimeType:'image/png',buffer:pixel})
  await expect(page.locator('.preview-panel .overlay-image.interactive')).toBeVisible()

  await selectTemplate(page,'사진과 글','image-text')
  await page.locator('.template-image-field input[type=file]').setInputFiles({name:'content.png',mimeType:'image/png',buffer:pixel})
  await expect(page.locator('.preview-panel .hero-image img').first()).toBeVisible()
})
for(const viewport of [{width:360,height:800},{width:390,height:844},{width:768,height:1024},{width:1440,height:900}])test(`반응형 ${viewport.width}x${viewport.height}`,async({page})=>{await page.setViewportSize(viewport);await create(page);if(viewport.width<=860){await expect(page.getByRole('navigation',{name:'모바일 편집 탭'})).toBeVisible();for(const name of ['페이지','미리보기','편집'])await page.getByRole('button',{name,exact:true}).last().click()}else await expect(page.getByRole('navigation',{name:'모바일 편집 탭'})).toBeHidden();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);expect(overflow).toBe(0);await page.reload();await expect(page.locator('.preview-title').getByText('1080 × 1350',{exact:true})).toBeVisible()})
