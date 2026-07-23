import { useRef, useState } from 'react'
import { fontFamilies, fontIds, normalizeDesign } from '../brand/midnightDesign'
import { DEFAULT_OVERLAY_IMAGE } from '../engine/overlayImage'
import { imageFileToDataUrl } from '../engine/imageTools'
import { templateList, templateRegistry } from '../registry/templateRegistry'
import type { CardPage, CardSize, TemplateId, TemplateManifest } from '../types'
import { CardRenderer } from './CardRenderer'

interface Props {
  page: CardPage
  size: CardSize
  hasOverflow?: boolean
  onChange: (patch: Partial<CardPage>) => void
  onTemplateChange: (id: TemplateId) => void
}

const fontLabels: Record<string, { name: string; note: string }> = {
  pretendard: { name: 'Pretendard', note: '추천' },
  'noto-sans-kr': { name: 'Noto Sans KR', note: '본문' },
  'bebas-neue': { name: 'Bebas Neue', note: '임팩트' },
  georgia: { name: 'Georgia', note: '클래식' },
  'courier-new': { name: 'Courier New', note: '모노' },
}

function TemplateThumbnail({ manifest, size }: { manifest: TemplateManifest; size: CardSize }) {
  const scale = Math.min(88 / size.width, 112 / size.height)
  const previewPage: CardPage = {
    id: `preview-${manifest.id}`,
    templateId: manifest.id,
    variantId: manifest.defaultVariant,
    content: manifest.sampleContent.content,
    image: manifest.sampleContent.image ?? null,
    overlayImage: null,
    design: manifest.defaultDesign,
  }

  return (
    <span className="template-thumb" aria-hidden="true" style={{ width: size.width * scale, height: size.height * scale }}>
      <span style={{ width: size.width, height: size.height, transform: `scale(${scale})` }}>
        <CardRenderer page={previewPage} pageIndex={0} pageCount={1} size={size} />
      </span>
    </span>
  )
}

export function FieldEditor({ page, size, hasOverflow = false, onChange, onTemplateChange }: Props) {
  const manifest = templateRegistry[page.templateId]
  const overlayInput = useRef<HTMLInputElement>(null)
  const imageInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const updateContent = (key: string, value: string | string[]) => onChange({ content: { ...page.content, [key]: value } })
  const upload = async (file: File | undefined, overlay: boolean) => {
    if (!file) return
    try {
      setError('')
      const src = await imageFileToDataUrl(file)
      if (overlay) onChange({ overlayImage: { src, ...DEFAULT_OVERLAY_IMAGE } })
      else onChange({ image: src })
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '이미지 처리 실패')
    }
  }
  const design = normalizeDesign(page.design)

  return (
    <div className="field-editor">
      <details className="template-picker">
        <summary>
          <span>템플릿</span>
          <strong>{manifest.name}</strong>
          <small>{manifest.description}</small>
        </summary>
        <div className="template-options" role="radiogroup" aria-label="템플릿">
          {templateList.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-label={item.name}
              aria-checked={item.id === page.templateId}
              className={item.id === page.templateId ? 'selected' : ''}
              onClick={() => onTemplateChange(item.id)}
            >
              <TemplateThumbnail manifest={item} size={size} />
              <span><strong>{item.name}</strong><small>{item.description}</small></span>
            </button>
          ))}
        </div>
      </details>

      {hasOverflow && (
        <div className="overflow-warning" role="status">
          <strong>텍스트가 안전 영역을 넘었습니다</strong>
          <span>문장을 줄이거나 글자 크기와 본문 너비를 조정해 주세요.</span>
        </div>
      )}

      <section className="content-fields" aria-label="카드 내용">
        {manifest.fields.map((field) => {
          if (field.type === 'image') {
            return (
              <div className="field-group" key={field.key}>
                <span>{field.label}</span>
                <input ref={imageInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event.target.files?.[0], false)} />
                <div className="button-row">
                  <button type="button" onClick={() => imageInput.current?.click()}>{page.image ? '이미지 교체' : '이미지 선택'}</button>
                  {page.image && <button type="button" className="subtle" onClick={() => onChange({ image: null })}>삭제</button>}
                </div>
              </div>
            )
          }

          const value = field.type === 'list'
            ? ((page.content[field.key] as string[] ?? []).join('\n'))
            : String(page.content[field.key] ?? '')

          return (
            <label key={field.key}>
              {field.label}
              {field.type === 'textarea' ? (
                <textarea value={value} maxLength={field.maxLength} onChange={(event) => updateContent(field.key, event.target.value)} />
              ) : field.type === 'list' ? (
                <textarea value={value} maxLength={field.maxLength} onChange={(event) => updateContent(field.key, event.target.value.split('\n').slice(0, 5))} />
              ) : (
                <input value={value} maxLength={field.maxLength} onChange={(event) => updateContent(field.key, event.target.value)} />
              )}
              {field.maxLength && <small>{value.length} / {field.maxLength}</small>}
            </label>
          )
        })}
      </section>

      {manifest.capabilities && (
        <section className="control-section design-controls" aria-labelledby="design-controls-title">
          <h3 id="design-controls-title">기본 디자인</h3>
          <div className="design-color-grid">
            {manifest.capabilities.includes('backgroundColor') && (
              <label>배경색
                <div className="color-row">
                  <input aria-label="배경색" type="color" value={design.backgroundColor} onChange={(event) => onChange({ design: { ...design, backgroundColor: event.target.value.toUpperCase() } })} />
                  <input aria-label="배경색 코드" value={design.backgroundColor} pattern="#[0-9A-Fa-f]{6}" onChange={(event) => { if (/^#[0-9A-Fa-f]{6}$/.test(event.target.value)) onChange({ design: { ...design, backgroundColor: event.target.value } }) }} />
                </div>
              </label>
            )}
            {manifest.capabilities.includes('textColor') && (
              <label>글자색
                <div className="color-row">
                  <input aria-label="글자색" type="color" value={design.textColor} onChange={(event) => onChange({ design: { ...design, textColor: event.target.value.toUpperCase() } })} />
                  <input aria-label="글자색 코드" value={design.textColor} onChange={(event) => { if (/^#[0-9A-Fa-f]{6}$/.test(event.target.value)) onChange({ design: { ...design, textColor: event.target.value } }) }} />
                </div>
              </label>
            )}
          </div>
          {manifest.capabilities.includes('fontId') && (
            <fieldset className="font-picker">
              <legend>글꼴</legend>
              <div className="font-options">
                {fontIds.map((id) => (
                  <label key={id} style={{ fontFamily: fontFamilies[id] }}>
                    <input type="radio" name={`font-${page.id}`} value={id} checked={design.fontId === id} onChange={() => onChange({ design: { ...design, fontId: id } })} />
                    <span className="font-check" aria-hidden="true">{design.fontId === id ? '✓' : ''}</span>
                    <span>{fontLabels[id].name} <small>({fontLabels[id].note})</small></span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {manifest.capabilities.includes('fontSize') && (
            <label>본문 크기 <output>{design.fontSize}px</output>
              <input aria-label={`본문 크기 ${design.fontSize}px`} type="range" min="40" max="84" step="2" value={design.fontSize} onChange={(event) => onChange({ design: { ...design, fontSize: Number(event.target.value) } })} />
            </label>
          )}

          <details className="control-disclosure">
            <summary>고급 설정</summary>
            <div className="advanced-controls">
              {manifest.capabilities.includes('textAlign') && (
                <fieldset className="segmented-control">
                  <legend>텍스트 정렬</legend>
                  <div>
                    {([['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']] as const).map(([value, label]) => (
                      <button key={value} type="button" aria-pressed={design.textAlign === value} onClick={() => onChange({ design: { ...design, textAlign: value } })}>{label}</button>
                    ))}
                  </div>
                </fieldset>
              )}
              {manifest.capabilities.includes('verticalAlign') && (
                <fieldset className="segmented-control">
                  <legend>세로 위치</legend>
                  <div>
                    {([['top', '위'], ['center', '가운데'], ['bottom', '아래']] as const).map(([value, label]) => (
                      <button key={value} type="button" aria-pressed={design.verticalAlign === value} onClick={() => onChange({ design: { ...design, verticalAlign: value } })}>{label}</button>
                    ))}
                  </div>
                </fieldset>
              )}
              {manifest.capabilities.includes('letterSpacing') && (
                <label>자간 <output>{design.letterSpacing}%</output>
                  <input aria-label={`자간 ${design.letterSpacing}%`} type="range" min="-6" max="8" step="0.5" value={design.letterSpacing} onChange={(event) => onChange({ design: { ...design, letterSpacing: Number(event.target.value) } })} />
                </label>
              )}
              {manifest.capabilities.includes('lineHeight') && (
                <label>행간 <output>{design.lineHeight.toFixed(2)}</output>
                  <input aria-label={`행간 ${design.lineHeight.toFixed(2)}`} type="range" min="1.2" max="2" step="0.05" value={design.lineHeight} onChange={(event) => onChange({ design: { ...design, lineHeight: Number(event.target.value) } })} />
                </label>
              )}
              {manifest.capabilities.includes('contentWidth') && (
                <label>본문 너비 <output>{design.contentWidth}%</output>
                  <input aria-label={`본문 너비 ${design.contentWidth}%`} type="range" min="60" max="100" step="5" value={design.contentWidth} onChange={(event) => onChange({ design: { ...design, contentWidth: Number(event.target.value) } })} />
                </label>
              )}
              {manifest.capabilities.includes('showPageNumber') && (
                <label className="check"><input type="checkbox" checked={design.showPageNumber} onChange={(event) => onChange({ design: { ...design, showPageNumber: event.target.checked } })} />페이지 번호 표시</label>
              )}
            </div>
          </details>
        </section>
      )}

      <details className="control-disclosure image-controls">
        <summary>떠있는 이미지</summary>
        <div className="advanced-controls">
          <input ref={overlayInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event.target.files?.[0], true)} />
          <div className="button-row">
            <button type="button" onClick={() => overlayInput.current?.click()}>{page.overlayImage ? '이미지 교체' : '이미지 선택'}</button>
            {page.overlayImage && <button type="button" className="danger" onClick={() => onChange({ overlayImage: null })}>삭제</button>}
          </div>
          {page.overlayImage && (
            <>
              <img className="overlay-thumb" src={page.overlayImage.src} alt="떠있는 이미지 미리보기" />
              <label>너비 <output>{page.overlayImage.width}%</output><input aria-label={`떠있는 이미지 너비 ${page.overlayImage.width}%`} type="range" min="12" max="100" value={page.overlayImage.width} onChange={(event) => onChange({ overlayImage: { ...page.overlayImage!, width: Number(event.target.value) } })} /></label>
              <label>가로 위치 <output>{page.overlayImage.x}%</output><input aria-label={`가로 위치 ${page.overlayImage.x}%`} type="range" min="0" max="100" value={page.overlayImage.x} onChange={(event) => onChange({ overlayImage: { ...page.overlayImage!, x: Number(event.target.value) } })} /></label>
              <label>세로 위치 <output>{page.overlayImage.y}%</output><input aria-label={`세로 위치 ${page.overlayImage.y}%`} type="range" min="0" max="100" value={page.overlayImage.y} onChange={(event) => onChange({ overlayImage: { ...page.overlayImage!, y: Number(event.target.value) } })} /></label>
              <button type="button" className="subtle" onClick={() => onChange({ overlayImage: { ...page.overlayImage!, ...DEFAULT_OVERLAY_IMAGE } })}>크기와 위치 초기화</button>
            </>
          )}
        </div>
      </details>
      {error && <p className="error" role="alert">{error} 이미지 파일을 다시 선택해 주세요.</p>}
    </div>
  )
}
