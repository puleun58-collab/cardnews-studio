import type { KeyboardEvent, PointerEvent } from 'react'
import { templateRegistry } from '../registry/templateRegistry'
import { clamp } from '../engine/overlayImage'
import type { CardOverlayImage, CardPage } from '../types'

interface Props { page: CardPage; pageIndex: number; pageCount: number; forExport?: boolean; reportOverflow?: boolean; interactiveOverlay?: boolean; onOverlayChange?: (overlay: CardOverlayImage) => void }
export function CardRenderer({page,pageIndex,pageCount,forExport=false,reportOverflow=false,interactiveOverlay=false,onOverlayChange}:Props){
  const manifest=templateRegistry[page.templateId]
  if(!manifest)return <div className="card-root unknown">지원하지 않는 템플릿입니다.</div>
  const Template=manifest.component
  const updateFromPointer=(event:PointerEvent<HTMLDivElement>)=>{if(!page.overlayImage||!onOverlayChange)return; const rect=event.currentTarget.parentElement!.getBoundingClientRect(); onOverlayChange({...page.overlayImage,x:clamp((event.clientX-rect.left)/rect.width*100,0,100),y:clamp((event.clientY-rect.top)/rect.height*100,0,100)})}
  const onPointerDown=(event:PointerEvent<HTMLDivElement>)=>{if(!interactiveOverlay)return; event.currentTarget.setPointerCapture(event.pointerId); updateFromPointer(event)}
  const onKeyDown=(event:KeyboardEvent<HTMLDivElement>)=>{if(!page.overlayImage||!onOverlayChange||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return; event.preventDefault(); const step=event.shiftKey?5:1; const o={...page.overlayImage}; if(event.key==='ArrowLeft')o.x-=step;if(event.key==='ArrowRight')o.x+=step;if(event.key==='ArrowUp')o.y-=step;if(event.key==='ArrowDown')o.y+=step;o.x=clamp(o.x,0,100);o.y=clamp(o.y,0,100);onOverlayChange(o)}
  return <div className={`card-root ${forExport?'export-mode':''}`} data-template={page.templateId} data-report-overflow={reportOverflow}>
    <Template page={page} pageIndex={pageIndex} pageCount={pageCount} forExport={forExport} reportOverflow={reportOverflow}/>
    {page.overlayImage&&<div className={`overlay-image ${interactiveOverlay?'interactive':''}`} style={{left:`${page.overlayImage.x}%`,top:`${page.overlayImage.y}%`,width:`${page.overlayImage.width}%`,transform:`translate(-${page.overlayImage.x}%, -${page.overlayImage.y}%)`}} tabIndex={interactiveOverlay?0:undefined} aria-label={interactiveOverlay?'떠있는 이미지 위치 조절. 방향키로 이동하고 Shift와 방향키로 크게 이동합니다.':undefined} onPointerDown={onPointerDown} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))updateFromPointer(e)}} onKeyDown={onKeyDown}><img src={page.overlayImage.src} draggable={false} alt="떠있는 이미지"/></div>}
  </div>
}
