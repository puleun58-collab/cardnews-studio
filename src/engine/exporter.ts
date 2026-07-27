import JSZip from 'jszip'
import { appConfig } from '../config/appConfig'
import type { CardPage, CardSize, Project } from '../types'

export async function awaitImagesReady(root: HTMLElement): Promise<void> {
  const images=Array.from(root.querySelectorAll('img'))
  await Promise.all(images.map(async image=>{if(!image.complete)await new Promise<void>((resolve,reject)=>{image.addEventListener('load',()=>resolve(),{once:true});image.addEventListener('error',()=>reject(new Error(`이미지 로드 실패: ${image.alt||image.src.slice(0,40)}`)),{once:true})});if(image.naturalWidth===0)throw new Error(`이미지 디코딩 실패: ${image.alt||'알 수 없는 이미지'}`);if(typeof image.decode==='function')await image.decode()}))
}
export const waitForFrame=()=>Promise.race([new Promise<void>(r=>requestAnimationFrame(()=>r())),new Promise<void>(r=>setTimeout(r,100))])
function safe(value:string){return Array.from(value).filter(char=>char.charCodeAt(0)>31&&!'< > : " / \\ | ? *'.split(' ').includes(char)).join('').replace(/\s+/g,'-').slice(0,60)||'project'}
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export interface ExportHandle { capturePage(page:CardPage,index:number,count:number,size:CardSize):Promise<Blob> }
export async function exportCurrent(stage:ExportHandle,project:Project,page:CardPage){const index=project.pages.findIndex(p=>p.id===page.id);const blob=await stage.capturePage(page,index,project.pages.length,project.canvasSize);download(blob,`${appConfig.fileSlug}-${safe(project.name)}-${String(index+1).padStart(3,'0')}.png`)}
export async function exportZip(stage:ExportHandle,project:Project,onProgress:(value:string)=>void){const zip=new JSZip();for(let i=0;i<project.pages.length;i++){onProgress(`${i+1} / ${project.pages.length} 페이지 저장 중`);zip.file(`${appConfig.fileSlug}-${safe(project.name)}-${String(i+1).padStart(3,'0')}.png`,await stage.capturePage(project.pages[i],i,project.pages.length,project.canvasSize))}download(await zip.generateAsync({type:'blob'}),`${appConfig.fileSlug}-${safe(project.name)}.zip`)}
export function downloadJson(project:Project,json:string){download(new Blob([json],{type:'application/json'}),`${appConfig.fileSlug}-${safe(project.name)}.json`)}
export function downloadWorkspaceJson(json:string,suffix='workspace-backup'){download(new Blob([json],{type:'application/json'}),`${appConfig.fileSlug}-${suffix}.json`)}
export function downloadLegacyRecovery(raw:string){download(new Blob([raw],{type:'application/json'}),`${appConfig.fileSlug}-legacy-recovery.json`)}
