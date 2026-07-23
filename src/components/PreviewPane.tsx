import { useEffect, useRef, useState } from 'react'
import type { CardOverlayImage, CardPage, CardSize } from '../types'
import { defaultCardSize } from '../brand/cardSize'
import { CardRenderer } from './CardRenderer'
interface Props { page: CardPage; pageIndex: number; pageCount: number; size?: CardSize; interactive?: boolean; onOverlayChange?: (value: CardOverlayImage)=>void; label?: string }
export function PreviewPane({page,pageIndex,pageCount,size=defaultCardSize,interactive=false,onOverlayChange,label='카드 미리보기'}:Props){
  const host=useRef<HTMLDivElement>(null); const [scale,setScale]=useState(.4)
  useEffect(()=>{const el=host.current;if(!el)return;const measure=()=>{const css=getComputedStyle(el);const w=el.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight);const h=el.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom);setScale(Math.max(.05,Math.min(w/size.width,h/size.height)))};measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect()},[size.width,size.height])
  return <div className="preview-host" ref={host} role="group" aria-label={label}><div className="scaled-card" style={{width:size.width*scale,height:size.height*scale}}><div style={{transform:`scale(${scale})`,transformOrigin:'top left'}}><CardRenderer page={page} pageIndex={pageIndex} pageCount={pageCount} size={size} reportOverflow={interactive} interactiveOverlay={interactive} onOverlayChange={onOverlayChange}/></div></div></div>
}
