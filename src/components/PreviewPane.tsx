import { useEffect, useRef, useState } from 'react'
import type { CardOverlayImage, CardPage } from '../types'
import { brandTokens } from '../brand/tokens'
import { CardRenderer } from './CardRenderer'
interface Props { page: CardPage; pageIndex: number; pageCount: number; interactive?: boolean; onOverlayChange?: (value: CardOverlayImage)=>void; label?: string }
export function PreviewPane({page,pageIndex,pageCount,interactive=false,onOverlayChange,label='카드 미리보기'}:Props){
  const host=useRef<HTMLDivElement>(null); const [scale,setScale]=useState(.4)
  useEffect(()=>{const el=host.current;if(!el)return;const measure=()=>{const css=getComputedStyle(el);const w=el.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight);const h=el.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom);setScale(Math.max(.05,Math.min(w/brandTokens.card.width,h/brandTokens.card.height)))};measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect()},[])
  return <div className="preview-host" ref={host} role="group" aria-label={label}><div className="scaled-card" style={{width:brandTokens.card.width*scale,height:brandTokens.card.height*scale}}><div style={{transform:`scale(${scale})`,transformOrigin:'top left'}}><CardRenderer page={page} pageIndex={pageIndex} pageCount={pageCount} reportOverflow={interactive} interactiveOverlay={interactive} onOverlayChange={onOverlayChange}/></div></div></div>
}
