import { type CSSProperties, type ElementType, type ReactNode, useLayoutEffect, useRef, useState } from 'react'
interface Props { children:ReactNode; max:number; min:number; className?:string; as?:ElementType; style?:CSSProperties }
export function AutoFit({children,max,min,className,as:Tag='div',style}:Props){
  const ref=useRef<HTMLElement>(null)
  const [size,setSize]=useState(max)
  useLayoutEffect(()=>{
    const node=ref.current
    if(!node)return
    const fit=()=>{
      let next=max
      node.style.fontSize=`${next}px`
      while(next>min&&(node.scrollHeight>node.clientHeight||node.scrollWidth>node.clientWidth)){next-=2;node.style.fontSize=`${next}px`}
      setSize(next)
      node.dataset.overflow=String(node.scrollHeight>node.clientHeight||node.scrollWidth>node.clientWidth)
    }
    fit()
    const observer=new ResizeObserver(fit);observer.observe(node)
    return()=>observer.disconnect()
  },[children,max,min])
  return <Tag ref={ref} className={className} style={{...style,fontSize:size}}>{children}</Tag>
}
