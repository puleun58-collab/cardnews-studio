import { useEffect, useRef, useState } from 'react'
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
  onOverflowChange?: (value: boolean) => void
  label?: string
}

export function PreviewPane({
  page,
  pageIndex,
  pageCount,
  size = defaultCardSize,
  interactive = false,
  zoom = 'fit',
  onOverlayChange,
  onOverflowChange,
  label = '카드 미리보기',
}: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [fitScale, setFitScale] = useState(.4)
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

  return (
    <div
      className={`preview-host ${zoom === 'fit' ? 'is-fit' : 'is-zoomed'}`}
      ref={host}
      role="group"
      aria-label={label}
    >
      <div className="scaled-card" style={{ width: size.width * scale, height: size.height * scale }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <CardRenderer page={page} pageIndex={pageIndex} pageCount={pageCount} size={size} reportOverflow={interactive} interactiveOverlay={interactive} onOverlayChange={onOverlayChange} />
        </div>
      </div>
    </div>
  )
}
