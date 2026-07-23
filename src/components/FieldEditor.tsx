import { useRef, useState, type DragEvent } from 'react'
import { englishFontFamilies, englishFontIds, getCardFontFamily, koreanFontIds, normalizeDesign } from '../brand/midnightDesign'
import { imageFileToDataUrl } from '../engine/imageTools'
import { templateList, templateRegistry } from '../registry/templateRegistry'
import type { CardPage, CardSize, EnglishFontId, KoreanFontId, TemplateId, TemplateManifest } from '../types'
import { CardRenderer } from './CardRenderer'

interface Props {
  page: CardPage
  size: CardSize
  hasOverflow?: boolean
  onChange: (patch: Partial<CardPage>) => void
  onTemplateChange: (id: TemplateId) => void
}

const koreanFontLabels: Record<KoreanFontId, { name: string; note: string }> = {
  pretendard: { name: 'Pretendard', note: '추천' },
  'noto-sans-kr': { name: 'Noto Sans KR', note: '본문' },
  'nanum-square-neo': { name: '나눔스퀘어 네오', note: '정보' },
  's-core-dream': { name: '에스코어 드림', note: '제목·본문' },
  'gmarket-sans': { name: 'G마켓 산스', note: '표지' },
  paperlogy: { name: '페이퍼로지', note: '에디토리얼' },
  jalnan: { name: '여기어때 잘난체', note: '임팩트' },
  'cafe24-surround': { name: 'Cafe24 써라운드', note: '포인트' },
  'noto-serif-kr': { name: 'Noto Serif KR', note: '인용' },
}
const englishFontLabels: Record<EnglishFontId, { name: string; note: string }> = {
  manrope: { name: 'Manrope', note: '추천' },
  oswald: { name: 'Oswald', note: '헤드라인' },
  'cormorant-garamond': { name: 'Cormorant Garamond', note: '에디토리얼' },
  'ibm-plex-mono': { name: 'IBM Plex Mono', note: '숫자·데이터' },
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
  const primaryImageInput = useRef<HTMLInputElement>(null)
  const contentImageInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const activeImage = page.backgroundImage
  const updateContent = (key: string, value: string | string[]) => onChange({ content: { ...page.content, [key]: value } })
  const uploadContentImage = async (file?: File) => {
    if (!file) return
    try {
      setError('')
      const src = await imageFileToDataUrl(file)
      onChange({ image: src })
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '이미지 처리 실패')
    }
  }
  const uploadPrimaryImage = async (file?: File) => {
    if (!file) return
    try {
      setError('')
      const src = await imageFileToDataUrl(file)
      onChange({ backgroundImage: src })
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '이미지 처리 실패')
    }
  }
  const dropPrimaryImage = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    void uploadPrimaryImage(event.dataTransfer.files[0])
  }
  const removePrimaryImage = () => {
    setError('')
    onChange({ backgroundImage: null })
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

      <section className="image-upload-section" aria-labelledby="image-upload-title">
        <div className="image-upload-heading">
          <div>
            <h3 id="image-upload-title">배경 이미지 업로드</h3>
            <p>카드 전체를 채우는 배경 이미지로 적용됩니다.</p>
          </div>
          {activeImage && <button type="button" className="subtle image-remove" onClick={removePrimaryImage}>삭제</button>}
        </div>
        <input ref={primaryImageInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadPrimaryImage(event.target.files?.[0])} />
        <div
          className={`image-dropzone ${dragging ? 'is-dragging' : ''} ${activeImage ? 'has-image' : ''}`}
          onDragEnter={(event) => { if (event.dataTransfer.types.includes('Files')) setDragging(true) }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false) }}
          onDrop={dropPrimaryImage}
        >
          {activeImage && <img src={activeImage} alt="" aria-hidden="true" />}
          <button type="button" onClick={() => primaryImageInput.current?.click()} aria-label={activeImage ? '배경 이미지 교체' : '배경 이미지 업로드'}>
            <span className="upload-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" focusable="false">
                <path d="M16 22V5m0 0-6 6m6-6 6 6M7 20v5.5A2.5 2.5 0 0 0 9.5 28h13a2.5 2.5 0 0 0 2.5-2.5V20" />
              </svg>
            </span>
            <strong>{dragging ? '여기에 놓으세요' : activeImage ? '배경 이미지 교체' : '배경 이미지 업로드'}</strong>
            <span>클릭하거나 드래그 앤 드롭</span>
            <small>JPG · PNG · WEBP · 최대 20MB</small>
          </button>
        </div>
      </section>

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
              <div className="field-group template-image-field" key={field.key}>
                <span>템플릿 사진 영역</span>
                <input ref={contentImageInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadContentImage(event.target.files?.[0])} />
                <div className="button-row">
                  <button type="button" onClick={() => contentImageInput.current?.click()}>{page.image ? '사진 교체' : '사진 추가'}</button>
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
          {manifest.capabilities.includes('gradient') && (
            <div className="gradient-controls">
              <label className="check">
                <input type="checkbox" checked={design.gradientEnabled} onChange={(event) => onChange({ design: { ...design, gradientEnabled: event.target.checked } })} />
                그라데이션 사용
              </label>
              <div className="gradient-range-controls" aria-disabled={!design.gradientEnabled}>
                <label>그라데이션 범위 <output>{design.gradientRange}%</output>
                  <input aria-label={`그라데이션 범위 ${design.gradientRange}%`} disabled={!design.gradientEnabled} type="range" min="0" max="100" step="5" value={design.gradientRange} onChange={(event) => onChange({ design: { ...design, gradientRange: Number(event.target.value) } })} />
                </label>
                <label>그라데이션 강도 <output>{design.gradientStrength}%</output>
                  <input aria-label={`그라데이션 강도 ${design.gradientStrength}%`} disabled={!design.gradientEnabled} type="range" min="0" max="100" step="5" value={design.gradientStrength} onChange={(event) => onChange({ design: { ...design, gradientStrength: Number(event.target.value) } })} />
                </label>
              </div>
            </div>
          )}
          {manifest.capabilities.includes('fontId') && (
            <div className="typography-pickers">
              <fieldset className="font-picker">
                <legend>한글 글꼴 <small>9종</small></legend>
                <div className="font-options" data-font-group="korean">
                  {koreanFontIds.map((id) => (
                    <label key={id} style={{ fontFamily: getCardFontFamily(id, design.englishFontId) }}>
                      <input type="radio" name={`korean-font-${page.id}`} value={id} checked={design.fontId === id} onChange={() => onChange({ design: { ...design, fontId: id } })} />
                      <span className="font-check" aria-hidden="true">{design.fontId === id ? '✓' : ''}</span>
                      <span>{koreanFontLabels[id].name} <small>({koreanFontLabels[id].note})</small></span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="font-picker">
                <legend>영문·숫자 글꼴 <small>4종</small></legend>
                <p className="font-picker-hint">영문과 숫자에만 우선 적용됩니다.</p>
                <div className="font-options" data-font-group="english">
                  {englishFontIds.map((id) => (
                    <label key={id} style={{ fontFamily: `${englishFontFamilies[id]}, Pretendard, sans-serif` }}>
                      <input type="radio" name={`english-font-${page.id}`} value={id} checked={design.englishFontId === id} onChange={() => onChange({ design: { ...design, englishFontId: id } })} />
                      <span className="font-check" aria-hidden="true">{design.englishFontId === id ? '✓' : ''}</span>
                      <span>{englishFontLabels[id].name} <small>({englishFontLabels[id].note})</small></span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
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

      {error && <p className="error" role="alert">{error} 이미지 파일을 다시 선택해 주세요.</p>}
    </div>
  )
}
