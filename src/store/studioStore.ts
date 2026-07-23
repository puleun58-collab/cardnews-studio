import { create } from 'zustand'
import { appConfig } from '../config/appConfig'
import { normalizeDesign } from '../brand/midnightDesign'
import { normalizeOverlayImage } from '../engine/overlayImage'
import { defaultCardSize, normalizeCardSize } from '../brand/cardSize'
import { templateRegistry } from '../registry/templateRegistry'
import type { CardPage, CardSize, Project, TemplateId } from '../types'

const uid = () => crypto.randomUUID()
const now = () => new Date().toISOString()
export function createPage(templateId: TemplateId = 'midnight-quote'): CardPage {
  const manifest = templateRegistry[templateId]
  return { id: uid(), templateId, variantId: manifest.defaultVariant, content: structuredClone(manifest.sampleContent.content), image: manifest.sampleContent.image ?? null, overlayImage: null, design: manifest.defaultDesign ? normalizeDesign(manifest.defaultDesign) : undefined }
}
function normalizePage(raw: unknown): CardPage {
  if (!raw || typeof raw !== 'object') throw new Error('올바르지 않은 페이지입니다.')
  const p = raw as Partial<CardPage>
  if (!p.templateId || !(p.templateId in templateRegistry)) throw new Error('알 수 없는 템플릿입니다.')
  const manifest = templateRegistry[p.templateId]
  const content: Record<string, string | string[]> = {}
  for (const field of manifest.fields) {
    if (field.type === 'image') continue
    const rawValue = p.content?.[field.key]
    content[field.key] = field.type === 'list' ? (Array.isArray(rawValue) ? rawValue.slice(0, 5).map(String) : []) : String(rawValue ?? '').slice(0, field.maxLength)
  }
  return { id: typeof p.id === 'string' ? p.id : uid(), templateId:p.templateId, variantId:typeof p.variantId === 'string' ? p.variantId : manifest.defaultVariant, content, image:typeof p.image === 'string' ? p.image : null, overlayImage:normalizeOverlayImage(p.overlayImage), design:p.templateId === 'midnight-quote' ? normalizeDesign(p.design) : undefined }
}
function normalizeProject(raw: unknown): Project {
  if (!raw || typeof raw !== 'object') throw new Error('올바르지 않은 프로젝트 파일입니다.')
  const p = raw as Partial<Project>
  if ((p.schemaVersion ?? 1) > 1) throw new Error('더 새로운 버전의 파일입니다. 앱을 업데이트해주세요.')
  if (!Array.isArray(p.pages) || p.pages.length < 1 || p.pages.length > appConfig.maxPages) throw new Error(`페이지는 1~${appConfig.maxPages}장이어야 합니다.`)
  return { schemaVersion:1, id:typeof p.id === 'string' ? p.id : uid(), name:String(p.name || '가져온 프로젝트').slice(0, 80), createdAt:typeof p.createdAt === 'string' ? p.createdAt : now(), updatedAt:now(), canvasSize:normalizeCardSize(p.canvasSize), pages:p.pages.map(normalizePage) }
}
interface StudioState {
  projects: Project[]; activeProjectId: string | null; activePageId: string | null; storageError: string | null
  createProject(name: string, templateId?: TemplateId, templateIds?: TemplateId[], canvasSize?: CardSize, initialImage?: string): void; openProject(id: string): void; goHome(): void
  renameProject(id: string, name: string): void; duplicateProject(id: string): void; deleteProject(id: string): void
  updateProjectCanvasSize(id: string, canvasSize: CardSize): void
  setActivePage(id: string): void; addPage(templateId?: TemplateId): void; duplicatePage(id: string): void; deletePage(id: string): void; reorderPages(oldIndex: number, newIndex: number): void
  updatePage(id: string, patch: Partial<CardPage>): void; replacePageTemplate(id: string, templateId: TemplateId): void
  restoreActiveProject(project: Project, activePageId?: string | null): void
  importProject(text: string): void; clearStorageError(): void
}
const initial = (() => {
  try {
    const value=localStorage.getItem(appConfig.storageKey)
    if(!value)return {projects:[] as Project[],activeProjectId:null as string|null,activePageId:null as string|null}
    const parsed=JSON.parse(value)
    return {projects:Array.isArray(parsed.projects)?parsed.projects.map(normalizeProject):[],activeProjectId:typeof parsed.activeProjectId==='string'?parsed.activeProjectId:null,activePageId:typeof parsed.activePageId==='string'?parsed.activePageId:null}
  } catch {
    const value=localStorage.getItem(appConfig.storageKey)
    if(value)localStorage.setItem(`${appConfig.storageKey}-corrupt-${Date.now()}`,value)
    return {projects:[] as Project[],activeProjectId:null,activePageId:null}
  }
})()
export const useStudioStore = create<StudioState>((set, get) => ({
  projects:initial.projects, activeProjectId:initial.activeProjectId, activePageId:initial.activePageId, storageError:null,
  createProject(name, templateId='midnight-quote', templateIds, canvasSize=defaultCardSize, initialImage) { const pages=(templateIds?.length?templateIds:[templateId]).map(createPage); if(initialImage)pages[0]={...pages[0],image:initialImage}; const project:Project={schemaVersion:1,id:uid(),name:name.trim()||'새 프로젝트',createdAt:now(),updatedAt:now(),canvasSize:normalizeCardSize(canvasSize),pages}; set(s=>({projects:[project,...s.projects],activeProjectId:project.id,activePageId:project.pages[0].id})) },
  openProject(id) { const p=get().projects.find(x=>x.id===id); if(p) set({activeProjectId:id,activePageId:p.pages[0]?.id??null}) }, goHome(){set({activeProjectId:null,activePageId:null})},
  renameProject(id,name){set(s=>({projects:s.projects.map(p=>p.id===id?{...p,name:name.trim()||p.name,updatedAt:now()}:p)}))},
  duplicateProject(id){set(s=>{const src=s.projects.find(p=>p.id===id); if(!src)return s; const copy:Project={...structuredClone(src),id:uid(),name:`${src.name} 복사본`,createdAt:now(),updatedAt:now(),pages:src.pages.map(p=>({...structuredClone(p),id:uid()}))}; return {projects:[copy,...s.projects]}})},
  deleteProject(id){set(s=>({projects:s.projects.filter(p=>p.id!==id),activeProjectId:s.activeProjectId===id?null:s.activeProjectId,activePageId:s.activeProjectId===id?null:s.activePageId}))},
  updateProjectCanvasSize(id,canvasSize){set(s=>({projects:s.projects.map(p=>p.id===id?{...p,canvasSize:normalizeCardSize(canvasSize),updatedAt:now()}:p)}))},
  setActivePage(activePageId){set({activePageId})},
  addPage(templateId='midnight-quote'){set(s=>({projects:s.projects.map(p=>{if(p.id!==s.activeProjectId||p.pages.length>=appConfig.maxPages)return p; const page=createPage(templateId); queueMicrotask(()=>set({activePageId:page.id})); return {...p,pages:[...p.pages,page],updatedAt:now()}})}))},
  duplicatePage(id){set(s=>({projects:s.projects.map(p=>{if(p.id!==s.activeProjectId||p.pages.length>=appConfig.maxPages)return p; const source=p.pages.find(x=>x.id===id); if(!source)return p; const copy={...structuredClone(source),id:uid()}; queueMicrotask(()=>set({activePageId:copy.id})); const at=p.pages.findIndex(x=>x.id===id)+1; const pages=[...p.pages]; pages.splice(at,0,copy); return {...p,pages,updatedAt:now()}})}))},
  deletePage(id){set(s=>({projects:s.projects.map(p=>{if(p.id!==s.activeProjectId||p.pages.length===1)return p; const pages=p.pages.filter(x=>x.id!==id); if(s.activePageId===id)queueMicrotask(()=>set({activePageId:pages[0].id})); return {...p,pages,updatedAt:now()}})}))},
  reorderPages(oldIndex,newIndex){set(s=>({projects:s.projects.map(p=>{if(p.id!==s.activeProjectId)return p; const pages=[...p.pages]; const [item]=pages.splice(oldIndex,1); pages.splice(newIndex,0,item); return {...p,pages,updatedAt:now()}})}))},
  updatePage(id,patch){set(s=>({projects:s.projects.map(p=>p.id!==s.activeProjectId?p:{...p,updatedAt:now(),pages:p.pages.map(page=>page.id===id?{...page,...patch,design:patch.design?normalizeDesign(patch.design):page.design,overlayImage:patch.overlayImage===undefined?page.overlayImage:normalizeOverlayImage(patch.overlayImage)}:page)})}))},
  replacePageTemplate(id,templateId){const replacement=createPage(templateId); get().updatePage(id,{...replacement,id})},
  restoreActiveProject(project,activePageId){set(s=>{if(project.id!==s.activeProjectId)return s;const restored=structuredClone(project);const nextPageId=activePageId&&restored.pages.some(page=>page.id===activePageId)?activePageId:restored.pages[0]?.id??null;return {projects:s.projects.map(item=>item.id===restored.id?restored:item),activePageId:nextPageId}})},
  importProject(text){if(new Blob([text]).size>appConfig.maxJsonBytes)throw new Error('JSON 파일은 6MB 이하여야 합니다.'); const parsed=JSON.parse(text); if(Number(parsed.schemaVersion)>1)throw new Error('더 새로운 버전의 파일입니다. 앱을 업데이트해주세요.'); const project=normalizeProject(parsed.project??parsed); project.id=uid(); set(s=>({projects:[project,...s.projects],activeProjectId:project.id,activePageId:project.pages[0].id}))}, clearStorageError(){set({storageError:null})}
}))
useStudioStore.subscribe(state=>{try{localStorage.setItem(appConfig.storageKey,JSON.stringify({projects:state.projects,activeProjectId:state.activeProjectId,activePageId:state.activePageId}))}catch{if(!state.storageError)useStudioStore.setState({storageError:'저장 공간이 부족합니다. 이미지를 줄이거나 JSON으로 백업해주세요.'})}})
export function exportProjectJson(project: Project){return JSON.stringify({schemaVersion:1,exportedAt:now(),app:{name:appConfig.appName},project},null,2)}
