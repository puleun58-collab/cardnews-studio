import { useEffect, useRef, useState, type DragEvent } from 'react'
import type { CardOverlayImage, CardPage, CardSize } from '../types'
import { defaultCardSize } from '../brand/cardSize'
import { CardRenderer } from './CardRenderer'

interface Props {
  page: CardPage
  pageIndex: number
  pageCount: number
  size?: CardSize
  interactive?: boolean
  zoom?: 'fit' | number
  onOverlayChange?: (value: CardOverlayImage) => void
  onImageFile?: (file: File) => Promise<void> | void
  onOverflowChange?: (value: boolean) => void
  label?: string
}

const imageTypes = ['image/jpeg', 'image/png', 'image/webp']

export function PreviewPane({
  page,
  pageIndex,
  pageCount,
  size = defaultCardSize,
  interactive = false,
  zoom = 'fit',
  onOverlayChange,
  onImageFile,
  onOverflowChange,
  label = '카드 미리보기',
}: Props) {
  const host = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [fitScale, setFitScale] = useState(.4)
  const [dragging, setDragging] = useState(false)
  const scale = zoom === 'fit' ? fitScale : zoom / 100

  useEffect(() => {
    const element = host.current
    if (!element) return
    const measure = () => {
      const css = getComputedStyle(element)
      const width = element.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight)
      const height = element.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom)
      setFitScale(Math.max(.05, Math.min(width / size.width, height / size.height)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [size.width, size.height])

  useEffect(() => {
    if (!onOverflowChange || !host.current) return
    const root = host.current
    const report = () => onOverflowChange(Boolean(root.querySelector('[data-overflow="true"]')))
    report()
    const observer = new MutationObserver(report)
    observer.observe(root, { attributes: true, subtree: true, attributeFilter: ['data-overflow'] })
    return () => observer.disconnect()
  }, [onOverflowChange, page.id, page.content, page.design, size.width, size.height])

  const acceptFile = async (file?: File) => {
    if (!file || !onImageFile) return
    if (!imageTypes.includes(file.type)) return
    await onImageFile(file)
    if (input.current) input.current.value = ''
  }
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    void acceptFile(event.dataTransfer.files[0])
  }

  return (
    <div
      className={`preview-host ${zoom === 'fit' ? 'is-fit' : 'is-zoomed'} ${dragging ? 'is-dragging' : ''}`}
      ref={host}
      role="group"
      aria-label={label}
      onDragEnter={(event) => { if (onImageFile && event.dataTransfer.types.includes('Files')) setDragging(true) }}
      onDragOver={(event) => { if (onImageFile) event.preventDefault() }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false) }}
      onDrop={onDrop}
    >
      <div className="scaled-card" style={{ width: size.width * scale, height: size.height * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <CardRenderer page={page} pageIndex={pageIndex} pageCount={pageCount} size={size} reportOverflow={interactive} interactiveOverlay={interactive} onOverlayChange={onOverlayChange} />
        </div>
      </div>
      {onImageFile && (
        <>
          <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void acceptFile(event.target.files?.[0])} />
          <button type="button" className="canvas-upload" onClick={() => input.current?.click()}>
            <strong>{dragging ? '여기에 놓으세요' : '이미지 추가'}</strong>
            <span>JPG, PNG, WEBP</span>
          </button>
        </>
      )}
    </div>
  )
}
