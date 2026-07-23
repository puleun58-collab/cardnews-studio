import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { CardRenderer } from './CardRenderer'
import { awaitImagesReady, type ExportHandle, waitForFrame } from '../engine/exporter'
import type { CardPage } from '../types'

export const ExportStage=forwardRef<ExportHandle>(function ExportStage(_,ref){
  const root=useRef<HTMLDivElement>(null)
  const [state,setState]=useState<{page:CardPage;index:number;count:number}|null>(null)
  useImperativeHandle(ref,()=>({async capturePage(page,index,count){
    setState({page,index,count});await waitForFrame();await waitForFrame()
    if(document.fonts)await document.fonts.ready
    const node=root.current
    if(!node)throw new Error('내보내기 화면을 준비하지 못했습니다.')
    await awaitImagesReady(node);await waitForFrame();await waitForFrame()
    const dataUrl=await toPng(node,{width:1080,height:1350,pixelRatio:1,cacheBust:true,skipAutoScale:true})
    return (await fetch(dataUrl)).blob()
  }}),[])
  return <div className="export-stage" ref={root}>{state&&<CardRenderer page={state.page} pageIndex={state.index} pageCount={state.count} forExport/>}</div>
})
