import type { TemplateId } from './types'
export interface Composition { id:string; name:string; description:string; templates:TemplateId[] }
export const compositions:Composition[]=[
  {id:'single',name:'단일 카드',description:'한 장으로 완성하는 문장 카드',templates:['midnight-quote']},
  {id:'insight-story',name:'7장 인사이트 스토리',description:'표지, 근거, 과정, 비교를 거쳐 마무리하는 구성',templates:['cover-hook','stat-highlight','list-insight','process-steps','comparison','image-text','divider-closing']},
]
