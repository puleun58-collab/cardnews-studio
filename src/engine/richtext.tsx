import type { ReactNode } from 'react'
export function richText(value: string): ReactNode[] {
  const parts: ReactNode[]=[]
  let cursor=0
  while(cursor<value.length){
    const start=value.indexOf('[[',cursor)
    if(start<0){parts.push(value.slice(cursor));break}
    const end=value.indexOf(']]',start+2)
    if(end<0){parts.push(value.slice(cursor));break}
    const highlighted=value.slice(start+2,end)
    if(!highlighted||highlighted.includes('[')||highlighted.includes(']')){parts.push(value.slice(cursor,start+2));cursor=start+2;continue}
    if(start>cursor)parts.push(value.slice(cursor,start))
    parts.push(<strong className="highlight" key={`${start}-${highlighted}`}>{highlighted}</strong>)
    cursor=end+2
  }
  return parts
}
