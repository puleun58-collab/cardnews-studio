import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { defaultCardSize, getCardFormat } from '../brand/cardSize'
import { normalizeDesign } from '../brand/midnightDesign'
import { templateRegistry } from '../registry/templateRegistry'
import { clamp, OVERLAY_IMAGE_WIDTH } from '../engine/overlayImage'
import type { CardOverlayImage, CardPage, CardSize } from '../types'

interface Props {
  page: CardPage
  pageIndex: number
  pageCount: number
  size?: CardSize
  forExport?: boolean
  reportOverflow?: boolean
  interactiveOverlay?: boolean
  overlaySelected?: boolean
  previewScale?: number
  onOverlayChange?: (overlay: CardOverlayImage) => void
  onOverlaySelect?: (selected: boolean) => void
  onOverlayDelete?: () => void
}

type PointerSession = {
  pointerId: number
  startClientX: number
  startClientY: number
  startX: number
  startY: number
  startWidth: number
  rootWidth: number
  rootHeight: number
}

export function CardRenderer({
  page,
  pageIndex,
  pageCount,
  size = defaultCardSize,
  forExport = false,
  reportOverflow = false,
  interactiveOverlay = false,
  overlaySelected = false,
  previewScale = 1,
  onOverlayChange,
  onOverlaySelect,
  onOverlayDelete,
}: Props) {
  const dragSession = useRef<PointerSession | null>(null)
  const resizeSession = useRef<PointerSession | null>(null)
  const manifest = templateRegistry[page.templateId]
  if (!manifest) return <div className="card-root unknown">지원하지 않는 템플릿입니다.</div>
  const Template = manifest.component

  const beginSession = (event: PointerEvent<HTMLElement>): PointerSession | null => {
    if (!page.overlayImage) return null
    const root = event.currentTarget.closest('.card-root')?.getBoundingClientRect()
    if (!root) return null
    event.currentTarget.setPointerCapture(event.pointerId)
    return {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: page.overlayImage.x,
      startY: page.overlayImage.y,
      startWidth: page.overlayImage.width,
      rootWidth: root.width,
      rootHeight: root.height,
    }
  }

  const moveOverlay = (event: PointerEvent<HTMLDivElement>) => {
    const session = dragSession.current
    if (!session || session.pointerId !== event.pointerId || !page.overlayImage || !onOverlayChange) return
    onOverlayChange({
      ...page.overlayImage,
      x: clamp(session.startX + (event.clientX - session.startClientX) / session.rootWidth * 100, 0, 100),
      y: clamp(session.startY + (event.clientY - session.startClientY) / session.rootHeight * 100, 0, 100),
    })
  }

  const resizeOverlay = (event: PointerEvent<HTMLButtonElement>) => {
    const session = resizeSession.current
    if (!session || session.pointerId !== event.pointerId || !page.overlayImage || !onOverlayChange) return
    const horizontalDelta = (event.clientX - session.startClientX) / session.rootWidth * 100
    const verticalDelta = (event.clientY - session.startClientY) / session.rootHeight * 100
    const dominantDelta = Math.abs(horizontalDelta) >= Math.abs(verticalDelta) ? horizontalDelta : verticalDelta
    onOverlayChange({
      ...page.overlayImage,
      width: clamp(session.startWidth + dominantDelta, OVERLAY_IMAGE_WIDTH.min, OVERLAY_IMAGE_WIDTH.max),
    })
  }

  const moveWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!page.overlayImage || !onOverlayChange) return
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onOverlayDelete?.()
      return
    }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    const step = event.shiftKey ? 5 : 1
    const overlay = { ...page.overlayImage }
    if (event.key === 'ArrowLeft') overlay.x -= step
    if (event.key === 'ArrowRight') overlay.x += step
    if (event.key === 'ArrowUp') overlay.y -= step
    if (event.key === 'ArrowDown') overlay.y += step
    overlay.x = clamp(overlay.x, 0, 100)
    overlay.y = clamp(overlay.y, 0, 100)
    onOverlayChange(overlay)
  }

  const resizeWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!page.overlayImage || !onOverlayChange || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    event.stopPropagation()
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
    const step = event.shiftKey ? 5 : 1
    onOverlayChange({
      ...page.overlayImage,
      width: clamp(page.overlayImage.width + direction * step, OVERLAY_IMAGE_WIDTH.min, OVERLAY_IMAGE_WIDTH.max),
    })
  }

  const format = getCardFormat(size)
  const design = page.templateId === 'midnight-quote' ? normalizeDesign(page.design) : null
  const backgroundGradient = design?.gradientEnabled
    ? `linear-gradient(180deg, transparent ${100 - design.gradientRange}%, rgb(0 0 0 / ${design.gradientStrength}%) 100%)`
    : undefined
  const layoutScale = size.width / 1080
  const logicalHeight = size.height / layoutScale
  const rootStyle = {
    width: size.width,
    height: size.height,
    '--card-width': `${size.width}px`,
    '--card-height': `${size.height}px`,
    '--overlay-control-scale': 1 / Math.max(previewScale, .05),
  } as CSSProperties

  return (
    <div
      className={`card-root format-${format} ${page.backgroundImage ? 'has-background' : ''} ${forExport ? 'export-mode' : ''}`}
      style={rootStyle}
      data-template={page.templateId}
      data-report-overflow={reportOverflow}
      onPointerDownCapture={(event) => {
        if (interactiveOverlay && !(event.target as Element).closest('.overlay-image')) onOverlaySelect?.(false)
      }}
    >
      {page.backgroundImage && <div className="card-background" aria-hidden="true"><img src={page.backgroundImage} alt="" /></div>}
      {page.backgroundImage && backgroundGradient && <div className="card-gradient" aria-hidden="true" style={{ backgroundImage: backgroundGradient }} />}
      <div className="card-layout" style={{ width: 1080, height: logicalHeight, transform: `scale(${layoutScale})` }}>
        <Template page={page} pageIndex={pageIndex} pageCount={pageCount} forExport={forExport} reportOverflow={reportOverflow} />
      </div>
      {page.overlayImage && (
        <div
          className={`overlay-image ${interactiveOverlay ? 'interactive' : ''} ${overlaySelected ? 'is-selected' : ''}`}
          style={{
            left: `${page.overlayImage.x}%`,
            top: `${page.overlayImage.y}%`,
            width: `${page.overlayImage.width}%`,
            transform: `translate(-${page.overlayImage.x}%, -${page.overlayImage.y}%)`,
          }}
          tabIndex={interactiveOverlay ? 0 : undefined}
          aria-label={interactiveOverlay ? '떠있는 이미지. 드래그하거나 방향키로 이동하고 Delete 키로 삭제합니다.' : undefined}
          onFocus={() => onOverlaySelect?.(true)}
          onPointerDown={(event) => {
            if (!interactiveOverlay || (event.target as Element).closest('button')) return
            event.stopPropagation()
            onOverlaySelect?.(true)
            dragSession.current = beginSession(event)
          }}
          onPointerMove={moveOverlay}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
            dragSession.current = null
          }}
          onPointerCancel={() => { dragSession.current = null }}
          onKeyDown={moveWithKeyboard}
        >
          <img src={page.overlayImage.src} draggable={false} alt="떠있는 이미지" />
          {interactiveOverlay && overlaySelected && (
            <>
              <button
                type="button"
                className="overlay-delete"
                aria-label="떠있는 이미지 삭제"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation()
                  onOverlayDelete?.()
                }}
              >
                <span aria-hidden="true">×</span>
              </button>
              <button
                type="button"
                className="overlay-resize"
                aria-label="떠있는 이미지 크기 조절. 방향키로 크기를 조절합니다."
                onPointerDown={(event) => {
                  event.stopPropagation()
                  resizeSession.current = beginSession(event)
                }}
                onPointerMove={resizeOverlay}
                onPointerUp={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
                  resizeSession.current = null
                }}
                onPointerCancel={() => { resizeSession.current = null }}
                onKeyDown={resizeWithKeyboard}
              >
                <span aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
