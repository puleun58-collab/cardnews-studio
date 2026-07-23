import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { appConfig } from './config/appConfig'
import { exportProjectJson, useStudioStore } from './store/studioStore'
import { templateList } from './registry/templateRegistry'
import { compositions } from './compositions'
import { CardRenderer } from './components/CardRenderer'
import { PagePanel } from './components/PagePanel'
import { PreviewPane } from './components/PreviewPane'
import { FieldEditor } from './components/FieldEditor'
import { downloadJson, exportCurrent, exportZip, type ExportHandle } from './engine/exporter'
import { ExportStage } from './components/ExportStage'
import { cardSizePresets, formatCardSize, getCardSizePreset, normalizeCardSize } from './brand/cardSize'
import type { CardSize, CardSizePreset, Project, TemplateId } from './types'
import './styles/app.css'
import './styles/card.css'
import './styles/fonts.css'

type Panel = 'pages' | 'preview' | 'edit'
type OperationStatus = { kind: 'idle' | 'loading' | 'success' | 'error'; message: string; recovery?: 'import' }

function CanvasSizeControl({ size, onChange }: { size: CardSize; onChange: (size: CardSize) => void }) {
  const [mode, setMode] = useState<CardSizePreset>(() => getCardSizePreset(size))
  const selectMode = (nextMode: CardSizePreset) => {
    setMode(nextMode)
    if (nextMode !== 'custom') {
      const preset = cardSizePresets[nextMode]
      onChange({ width: preset.width, height: preset.height })
    }
  }
  const updateDimension = (key: keyof CardSize, value: string) => onChange(normalizeCardSize({ ...size, [key]: Number(value) }))

  return (
    <section className="control-section canvas-size-control" aria-labelledby="canvas-size-title">
      <h3 id="canvas-size-title">캔버스 크기</h3>
      <label>
        출력 규격
        <select aria-label="캔버스 크기" value={mode} onChange={(event) => selectMode(event.target.value as CardSizePreset)}>
          {Object.entries(cardSizePresets).map(([value, preset]) => <option key={value} value={value}>{preset.label} · {formatCardSize(preset)}</option>)}
          <option value="custom">사용자 지정</option>
        </select>
      </label>
      {mode === 'custom' && (
        <div className="dimension-grid">
          <label>너비<input aria-label="사용자 지정 너비" type="number" min="320" max="4096" step="1" value={size.width} onChange={(event) => updateDimension('width', event.target.value)} /></label>
          <label>높이<input aria-label="사용자 지정 높이" type="number" min={size.width} max="4096" step="1" value={size.height} onChange={(event) => updateDimension('height', event.target.value)} /></label>
        </div>
      )}
      <p className="muted">{formatCardSize(size)}px · 세로 길이는 너비 이상</p>
    </section>
  )
}

function ProjectHome() {
  const { projects, createProject, openProject, duplicateProject, deleteProject, renameProject } = useStudioStore()
  const [name, setName] = useState('나의 카드뉴스')
  const [template, setTemplate] = useState<TemplateId>('midnight-quote')
  const [compositionId, setCompositionId] = useState('single')
  const [canvasPreset, setCanvasPreset] = useState<CardSizePreset>('portrait')
  const [customSize, setCustomSize] = useState<CardSize>({ width: 1080, height: 1440 })
  const nameInput = useRef<HTMLInputElement>(null)
  const composition = compositions.find((item) => item.id === compositionId)!

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const canvasSize = canvasPreset === 'custom' ? normalizeCardSize(customSize) : cardSizePresets[canvasPreset]
    createProject(name, template, compositionId === 'single' ? [template] : composition.templates, canvasSize)
  }

  return (
    <div className="home-shell">
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <main className="home" id="main-content">
        <header className="home-header" aria-label="서비스 소개">
          <div className="brand-mark" aria-hidden="true">H</div>
          <div className="home-brand-copy">
            <h1>{appConfig.appName}</h1>
            <p>{appConfig.appDescription}</p>
          </div>
          <p className="home-purpose">아이디어를 정리하고, 카드로 <span className="no-break">확인하고,</span> <span className="no-break">바로 내보내세요.</span></p>
        </header>

        <section className="new-project" aria-labelledby="new-project-title">
          <div className="new-project-intro">
            <span className="section-label">새 작업</span>
            <h2 id="new-project-title">새 이야기를 시작하세요</h2>
            <p>한 장의 문장부터 5장 인사이트까지, 필요한 구성으로 바로 시작할 수 있습니다.</p>
          </div>
          <form className="new-project-form" onSubmit={submit}>
            <label>
              프로젝트 이름
              <input ref={nameInput} aria-label="프로젝트 이름" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              추천 구성
              <select aria-label="추천 구성" value={compositionId} onChange={(event) => setCompositionId(event.target.value)}>
                {compositions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            {compositionId === 'single' && (
              <label>
                첫 템플릿
                <select value={template} onChange={(event) => setTemplate(event.target.value as TemplateId)}>
                  {templateList.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            )}
            <label>
              캔버스 크기
              <select aria-label="새 프로젝트 캔버스 크기" value={canvasPreset} onChange={(event) => setCanvasPreset(event.target.value as CardSizePreset)}>
                {Object.entries(cardSizePresets).map(([value, preset]) => <option key={value} value={value}>{preset.label} · {formatCardSize(preset)}</option>)}
                <option value="custom">사용자 지정</option>
              </select>
            </label>
            {canvasPreset === 'custom' && (
              <div className="dimension-grid home-dimensions">
                <label>너비<input aria-label="새 프로젝트 사용자 지정 너비" type="number" min="320" max="4096" value={customSize.width} onChange={(event) => setCustomSize((size) => normalizeCardSize({ ...size, width: Number(event.target.value) }))} /></label>
                <label>높이<input aria-label="새 프로젝트 사용자 지정 높이" type="number" min={customSize.width} max="4096" value={customSize.height} onChange={(event) => setCustomSize((size) => normalizeCardSize({ ...size, height: Number(event.target.value) }))} /></label>
              </div>
            )}
            <button className="primary" type="submit">새 프로젝트 만들기</button>
          </form>
        </section>

        <section className="project-section" aria-labelledby="project-list-title">
          <div className="section-title">
            <div>
              <h2 id="project-list-title">내 프로젝트</h2>
              <p>최근 수정한 작업부터 표시됩니다.</p>
            </div>
            <span aria-label={`프로젝트 ${projects.length}개`}>{projects.length}개</span>
          </div>
          {projects.length === 0 ? (
            <div className="empty" role="status">
              <div className="empty-mark" aria-hidden="true">01</div>
              <div>
                <h3>아직 프로젝트가 없습니다</h3>
                <p>프로젝트 이름과 구성을 정한 뒤 첫 카드를 만들어보세요.</p>
              </div>
              <button type="button" onClick={() => nameInput.current?.focus()}>첫 프로젝트 준비하기</button>
            </div>
          ) : (
            <div className="project-grid">
              {projects.map((project) => (
                <article className="project-card" key={project.id}>
                  <button className="project-preview" type="button" style={{width:project.canvasSize.width*Math.min(190/project.canvasSize.width,238/project.canvasSize.height),height:project.canvasSize.height*Math.min(190/project.canvasSize.width,238/project.canvasSize.height)}} onClick={() => openProject(project.id)} aria-label={`${project.name} 열기`}>
                    <div className="project-scale" style={{width:project.canvasSize.width,height:project.canvasSize.height,transform:`translateX(-50%) scale(${Math.min(190/project.canvasSize.width,238/project.canvasSize.height)})`}}><CardRenderer page={project.pages[0]} pageIndex={0} pageCount={project.pages.length} size={project.canvasSize} /></div>
                  </button>
                  <div className="project-card-body">
                    <input aria-label="프로젝트 이름 바꾸기" value={project.name} maxLength={80} onChange={(event) => renameProject(project.id, event.target.value)} />
                    <p>{project.pages.length}장 <span aria-hidden="true">/</span> {formatCardSize(project.canvasSize)} <span aria-hidden="true">/</span> <time dateTime={project.updatedAt}>{new Date(project.updatedAt).toLocaleString('ko-KR')}</time></p>
                    <div className="button-row project-actions">
                      <button type="button" onClick={() => openProject(project.id)}>열기</button>
                      <button type="button" className="subtle" onClick={() => duplicateProject(project.id)}>복제</button>
                      <button type="button" className="danger" onClick={() => { if (confirm('이 프로젝트를 삭제할까요?')) deleteProject(project.id) }}>삭제</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function Feed({ project, onClose }: { project: Project; onClose: () => void }) {
  const [mode, setMode] = useState<'grid' | 'post'>('grid')
  const [index, setIndex] = useState(0)
  const dialog = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const root = dialog.current
    root?.querySelector<HTMLElement>('button')?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab' || !root) return
      const controls = [...root.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')]
      if (!controls.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('keydown', keydown); previous?.focus() }
  }, [onClose])

  return (
    <div className="modal-backdrop">
      <div className="feed-modal" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="feed-title">
        <header>
          <div>
            <span className="section-label">보기 방식</span>
            <h2 id="feed-title">피드 미리보기</h2>
          </div>
          <div className="button-row" role="group" aria-label="피드 보기 방식">
            <button type="button" aria-pressed={mode === 'grid'} onClick={() => setMode('grid')}>격자</button>
            <button type="button" aria-pressed={mode === 'post'} onClick={() => setMode('post')}>게시물</button>
            <button type="button" className="danger" onClick={onClose}>닫기</button>
          </div>
        </header>
        {mode === 'grid' ? (
          <div className="feed-grid" aria-label="전체 카드 격자">
            {project.pages.map((page, pageIndex) => {const scale=300/project.canvasSize.width;return <div className="feed-card" style={{aspectRatio:`${project.canvasSize.width} / ${project.canvasSize.height}`}} key={page.id}><div style={{width:project.canvasSize.width,height:project.canvasSize.height,transform:`scale(${scale})`}}><CardRenderer page={page} pageIndex={pageIndex} pageCount={project.pages.length} size={project.canvasSize} /></div></div>})}
          </div>
        ) : (
          <div className="post-view">
            <PreviewPane page={project.pages[index]} pageIndex={index} pageCount={project.pages.length} size={project.canvasSize} />
            <div className="button-row post-controls">
              <button type="button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>이전</button>
              <span aria-live="polite">{index + 1} / {project.pages.length}</span>
              <button type="button" disabled={index === project.pages.length - 1} onClick={() => setIndex((value) => value + 1)}>다음</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function useActiveProject() {
  const { projects, activeProjectId } = useStudioStore()
  return projects.find((project) => project.id === activeProjectId)
}

function Editor() {
  const store = useStudioStore()
  const project = useActiveProject()
  const [panel, setPanel] = useState<Panel>('preview')
  const [feed, setFeed] = useState(false)
  const [status, setStatus] = useState<OperationStatus>({ kind: 'idle', message: '저장됨' })
  const [busy, setBusy] = useState(false)
  const stage = useRef<ExportHandle>(null)
  const importInput = useRef<HTMLInputElement>(null)

  if (!project) {
    return (
      <main className="state-page" id="main-content">
        <span className="section-label">프로젝트 오류</span>
        <h1>프로젝트를 찾을 수 없습니다</h1>
        <p>저장된 프로젝트 목록으로 돌아가 다시 선택해 주세요.</p>
        <button className="primary" type="button" onClick={store.goHome}>프로젝트 목록으로</button>
      </main>
    )
  }

  const page = project.pages.find((item) => item.id === store.activePageId) ?? project.pages[0]
  const index = project.pages.findIndex((item) => item.id === page.id)
  const visibleStatus: OperationStatus = store.storageError
    ? { kind: 'error', message: store.storageError }
    : status

  const run = async (label: string, action: () => Promise<void>) => {
    try {
      setBusy(true)
      setStatus({ kind: 'loading', message: `${label} 내보내는 중` })
      await action()
      setStatus({ kind: 'success', message: `${label} 저장 완료` })
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : `${label} 작업 실패` })
    } finally {
      setBusy(false)
    }
  }

  const importFile = async (file?: File) => {
    if (!file) return
    try {
      store.importProject(await file.text())
      setStatus({ kind: 'success', message: 'JSON 프로젝트를 열었습니다' })
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'JSON 파일을 열 수 없습니다.', recovery: 'import' })
    } finally {
      if (importInput.current) importInput.current.value = ''
    }
  }

  const onToolbarKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && feed) setFeed(false)
  }

  return (
    <div className="studio" aria-busy={busy} onKeyDown={onToolbarKeyDown}>
      <a className="skip-link" href="#main-content">편집 영역으로 건너뛰기</a>
      <header className="toolbar" aria-label="프로젝트 도구막대">
        <div className="toolbar-main">
          <button type="button" className="back-button" onClick={store.goHome}>처음으로</button>
          <input aria-label="프로젝트 이름" value={project.name} maxLength={80} onChange={(event) => store.renameProject(project.id, event.target.value)} />
        </div>
        <div className={`save-status is-${visibleStatus.kind}`} role={visibleStatus.kind === 'error' ? 'alert' : 'status'} aria-live="polite">
          <span className="status-indicator" aria-hidden="true" />
          <span>{visibleStatus.message}</span>
          {visibleStatus.recovery === 'import' && (
            <button type="button" className="status-action" onClick={() => importInput.current?.click()}>JSON 다시 선택</button>
          )}
        </div>
        <div className="toolbar-actions" aria-label="가져오기와 내보내기">
          <input ref={importInput} hidden type="file" accept="application/json,.json" onChange={(event) => importFile(event.target.files?.[0])} />
          <button type="button" onClick={() => importInput.current?.click()}>JSON 열기</button>
          <button type="button" onClick={() => { downloadJson(project, exportProjectJson(project)); setStatus({ kind: 'success', message: 'JSON 저장 완료' }) }}>JSON 저장</button>
          <button type="button" onClick={() => setFeed(true)}>피드</button>
          <button type="button" disabled={busy} onClick={() => run('PNG', () => exportCurrent(stage.current!, project, page))}>PNG</button>
          <button type="button" className="primary" disabled={busy} onClick={() => run('ZIP', () => exportZip(stage.current!, project, (message) => setStatus({ kind: 'loading', message })))}>ZIP</button>
        </div>
      </header>

      <main className="workspace" id="main-content">
        <div className={`mobile-panel ${panel === 'pages' ? 'shown' : ''}`}>
          <PagePanel pages={project.pages} activeId={page.id} size={project.canvasSize} onSelect={store.setActivePage} onReorder={store.reorderPages} onAdd={() => store.addPage()} onDuplicate={() => store.duplicatePage(page.id)} onDelete={() => { if (project.pages.length > 1 && confirm('이 페이지를 삭제할까요?')) store.deletePage(page.id) }} />
        </div>
        <section className={`preview-panel mobile-panel ${panel === 'preview' ? 'shown' : ''}`} aria-labelledby="preview-heading">
          <div className="preview-title">
            <h1 id="preview-heading">카드 미리보기</h1>
            <div><span>{index + 1} / {project.pages.length}</span><span>{formatCardSize(project.canvasSize)}</span></div>
          </div>
          <PreviewPane page={page} pageIndex={index} pageCount={project.pages.length} size={project.canvasSize} interactive onOverlayChange={(overlayImage) => store.updatePage(page.id, { overlayImage })} />
          <p className="preview-help">떠있는 이미지는 드래그하거나 방향키로 이동할 수 있습니다.</p>
        </section>
        <aside className={`editor-panel mobile-panel ${panel === 'edit' ? 'shown' : ''}`} aria-labelledby="editor-heading">
          <div className="panel-heading">
            <div><span className="panel-kicker">선택한 카드</span><h2 id="editor-heading">내용 편집</h2></div>
            <button type="button" onClick={() => store.addPage(page.templateId)}>같은 템플릿 추가</button>
          </div>
          <CanvasSizeControl key={project.id} size={project.canvasSize} onChange={(canvasSize) => store.updateProjectCanvasSize(project.id, canvasSize)} />
          <FieldEditor page={page} onChange={(patch) => store.updatePage(page.id, patch)} onTemplateChange={(id) => store.replacePageTemplate(page.id, id)} />
        </aside>
      </main>

      <nav className="mobile-tabs" aria-label="모바일 편집 탭">
        {([['pages', '페이지'], ['preview', '미리보기'], ['edit', '편집']] as const).map(([value, label]) => (
          <button key={value} type="button" className={panel === value ? 'active' : ''} aria-pressed={panel === value} onClick={() => setPanel(value)}>{label}</button>
        ))}
      </nav>
      {feed && <Feed project={project} onClose={() => setFeed(false)} />}
      <ExportStage ref={stage} />
    </div>
  )
}

export default function App() {
  const active = useStudioStore((state) => state.activeProjectId)
  return active ? <Editor /> : <ProjectHome />
}
