import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CardPage, CardSize } from '../types'
import { CardRenderer } from './CardRenderer'

function SortablePage({page,index,count,size,active,onSelect}:{page:CardPage;index:number;count:number;size:CardSize;active:boolean;onSelect:()=>void}){
  const {attributes,listeners,setNodeRef,transform,transition,isDragging}=useSortable({id:page.id})
  const scale=Math.min(214/size.width,186/size.height)

  return (
    <button
      ref={setNodeRef}
      style={{transform:CSS.Transform.toString(transform),transition}}
      className={`page-thumb ${active?'active':''} ${isDragging?'is-dragging':''}`}
      onClick={onSelect}
      {...attributes}
      {...listeners}
      aria-label={`${index+1}페이지 선택 및 순서 이동`}
      aria-pressed={active}
    >
      <span aria-hidden="true">{index+1}</span>
      <div className="thumb-canvas" aria-hidden="true" style={{width:size.width*scale,height:size.height*scale}}>
        <div className="thumb-scale" style={{transform:`scale(${scale})`}}>
          <CardRenderer page={page} pageIndex={index} pageCount={count} size={size}/>
        </div>
      </div>
    </button>
  )
}

interface Props {pages:CardPage[];activeId:string;size:CardSize;onSelect:(id:string)=>void;onReorder:(oldIndex:number,newIndex:number)=>void;onAdd:()=>void;onDuplicate:()=>void;onDelete:()=>void}
export function PagePanel({pages,activeId,size,onSelect,onReorder,onAdd,onDuplicate,onDelete}:Props){
  const sensors=useSensors(
    useSensor(PointerSensor,{activationConstraint:{distance:6}}),
    useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}),
  )
  const start=(event:DragStartEvent)=>onSelect(String(event.active.id))
  const end=(event:DragEndEvent)=>{if(!event.over||event.active.id===event.over.id)return;onReorder(pages.findIndex(page=>page.id===event.active.id),pages.findIndex(page=>page.id===event.over!.id))}

  return <aside className="page-panel">
    <div className="panel-heading"><h2>페이지</h2><button type="button" aria-label="페이지 추가" onClick={onAdd}>＋</button></div>
    <p className="panel-hint">클릭해 편집하고, 끌어서 순서를 바꿔보세요.</p>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={start} onDragEnd={end}>
      <SortableContext items={pages.map(page=>page.id)} strategy={verticalListSortingStrategy}>
        {pages.map((page,index)=><SortablePage key={page.id} page={page} index={index} count={pages.length} size={size} active={page.id===activeId} onSelect={()=>onSelect(page.id)}/>)}
      </SortableContext>
    </DndContext>
    <div className="page-actions">
      <button type="button" onClick={onDuplicate}>복제</button>
      <button type="button" className="danger" onClick={onDelete} disabled={pages.length===1}>삭제</button>
    </div>
  </aside>
}
