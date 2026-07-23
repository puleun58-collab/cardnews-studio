import type { TemplateId } from './types'
export interface Composition { id:string; name:string; description:string; templates:TemplateId[] }
export const compositions:Composition[]=[
  {id:'single',name:'한 장 문장',description:'한 장으로 완성하는 문장 카드',templates:['midnight-quote']},
  {id:'insight-story',name:'인사이트 5장',description:'표지부터 마무리까지 추천 구성',templates:['cover-hook','list-insight','quote-commentary','image-text','divider-closing']},
]
