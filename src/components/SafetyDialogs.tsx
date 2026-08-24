import { useEffect, useRef, type ReactNode } from 'react'
import type { TemplateMappingResult } from '../domain/page/pageOperations'
import { templateRegistry } from '../registry/templateRegistry'
import { useStudioStore } from '../store/studioStore'

function useDialogFocus(onClose: () => void, returnFocus?: HTMLElement | null) {
  const dialog = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    const root = dialog.current
    root?.querySelector<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled)')?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !root) return
      const controls = [...root.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
      if (!controls.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('keydown', keydown)
      if (previous?.isConnected) previous.focus()
    }
  }, [onClose, returnFocus])
  return dialog
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
  returnFocus,
  children,
}: {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
  returnFocus?: HTMLElement | null
  children?: ReactNode
}) {
  const dialog = useDialogFocus(onClose, returnFocus)
  return (
    <div className="modal-backdrop">
      <div className="safety-dialog" ref={dialog} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
        <span className="section-label">확인</span>
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-description">{description}</p>
        {children}
        <div className="button-row dialog-actions">
          <button type="button" onClick={onClose}>취소</button>
          <button type="button" className="danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export function TemplateChangeDialog({
  result,
  onConfirm,
  onClose,
  returnFocus,
}: {
  result: TemplateMappingResult
  onConfirm: () => void
  onClose: () => void
  returnFocus?: HTMLElement | null
}) {
  const dialog = useDialogFocus(onClose, returnFocus)
  const target = templateRegistry[result.page.templateId]
  return (
    <div className="modal-backdrop">
      <div className="safety-dialog template-change-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="template-change-title" aria-describedby="template-change-description">
        <h2 id="template-change-title">‘{target.name}’ 템플릿으로 변경할까요?</h2>
        <p id="template-change-description">변경 후에도 실행 취소로 원래 상태로 되돌릴 수 있습니다.</p>
        <div className="button-row dialog-actions">
          <button type="button" onClick={onClose}>취소</button>
          <button type="button" className="primary" onClick={onConfirm}>변경</button>
        </div>
      </div>
    </div>
  )
}

function UndoNotice({ operationId }: { operationId: string }) {
  const store = useStudioStore()
  const operation = store.pendingDeletions.find((item) => item.operationId === operationId)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!operation) return
    const delay = Math.max(0, operation.expiresAt - Date.now() - 80)
    const timer = setTimeout(() => {
      if (root.current?.contains(document.activeElement)) {
        document.querySelector<HTMLElement>('#main-content button:not(:disabled), .toolbar button:not(:disabled)')?.focus()
      }
    }, delay)
    return () => clearTimeout(timer)
  }, [operation])
  if (!operation) return null
  const accessibleContext = operation.type === 'project'
    ? `“${operation.project.name}”을 삭제했습니다.`
    : `${operation.originalIndex + 1}번째 페이지를 삭제했습니다.`
  return (
    <div className="undo-notice" ref={root} role="status">
      <p>삭제했습니다.</p>
      <div className="button-row">
        <button type="button" className="primary" aria-label={`${accessibleContext} 실행 취소`} onClick={() => void store.undoDeletion(operation.operationId)}>실행 취소</button>
        <button type="button" className="subtle" aria-label={`${accessibleContext} 지금 영구 삭제`} onClick={() => void store.finalizeDeletion(operation.operationId)}>지금 삭제</button>
      </div>
    </div>
  )
}

export function UndoNotifications() {
  const { pendingDeletions, operationMessage } = useStudioStore()
  return (
    <>
      <div className="undo-stack" role="region" aria-label="삭제 복구 알림">
        {pendingDeletions.map((operation) => <UndoNotice key={operation.operationId} operationId={operation.operationId} />)}
      </div>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{operationMessage}</div>
    </>
  )
}
