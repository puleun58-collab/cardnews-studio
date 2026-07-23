import { useEffect, useRef, useState } from 'react'
import type { CardOverlayImage, CardPage, CardSize } from '../types'
import { defaultCardSize } from '../brand/cardSize'
import { DEFAULT_OVERLAY_IMAGE } from '../engine/overlayImage'
import { imageFileToDataUrl } from '../engine/imageTools'
import { CardRenderer } from './CardRenderer'

interface Props {
  page: CardPage
  pageIndex: number
  pageCount: number
  size?: CardSize
  interactive?: boolean
  zoom?: 'fit' | number
  onOverlayChange?: (value: CardOverlayImage | null) => void
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
  const imageInput = useRef<HTMLInputElement>(null)
  const [fitScale, setFitScale] = useState(.4)
  const [overlaySelected, setOverlaySelected] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const scale = zoom === 'fit' ? fitScale : zoom / 100

  useEffect(() => {
    setOverlaySelected(false)
    setUploadError('')
  }, [page.id])

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

  const uploadOverlay = async (file?: File) => {
    if (!file || !onOverlayChange) return
    try {
      setUploadError('')
      const src = await imageFileToDataUrl(file)
      onOverlayChange({ src, ...DEFAULT_OVERLAY_IMAGE })
      setOverlaySelected(true)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '이미지 처리에 실패했습니다.')
    } finally {
      if (imageInput.current) imageInput.current.value = ''
    }
  }

  const deleteOverlay = () => {
    onOverlayChange?.(null)
    setOverlaySelected(false)
  }

  return (
    <div className="preview-stage">
      <div
        className={`preview-host ${zoom === 'fit' ? 'is-fit' : 'is-zoomed'}`}
        ref={host}
        role="group"
        aria-label={label}
      >
        <div className="scaled-card" style={{ width: size.width * scale, height: size.height * scale }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <CardRenderer
              page={page}
              pageIndex={pageIndex}
              pageCount={pageCount}
              size={size}
              reportOverflow={interactive}
              interactiveOverlay={interactive}
              overlaySelected={overlaySelected}
              previewScale={scale}
              onOverlayChange={(overlay) => onOverlayChange?.(overlay)}
              onOverlaySelect={setOverlaySelected}
              onOverlayDelete={deleteOverlay}
            />
          </div>
        </div>
      </div>
      {interactive && (
        <div className="preview-image-actions">
          <input
            ref={imageInput}
            className="preview-image-input"
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void uploadOverlay(event.target.files?.[0])}
          />
          <button type="button" className="preview-image-add" onClick={() => imageInput.current?.click()}>
            <span aria-hidden="true">＋</span>
            {page.overlayImage ? '이미지 교체' : '이미지 추가'}
          </button>
          {uploadError && <p role="alert">{uploadError} 이미지 파일을 다시 선택해 주세요.</p>}
        </div>
      )}
    </div>
  )
}
