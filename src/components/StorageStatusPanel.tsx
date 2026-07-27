import { useState } from 'react'
import { appConfig } from '../config/appConfig'
import { downloadLegacyRecovery, downloadWorkspaceJson } from '../engine/exporter'
import { exportWorkspaceJson, useStudioStore } from '../store/studioStore'

const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export function StorageStatusPanel() {
  const store = useStudioStore()
  const [cleanupMessage, setCleanupMessage] = useState('')
  const estimate = store.saveStatus.estimate
  const isNearQuota = estimate.ratio != null && estimate.ratio >= .85
  const failureMessage = store.storageError
    ?? (store.saveStatus.phase === 'error' ? store.saveStatus.message : null)
  if (!failureMessage && !isNearQuota && !store.migrationNotice) return null

  const backup = () => {
    const legacy = localStorage.getItem(appConfig.storageKey)
    if (store.migrationNotice && store.storageError && legacy) {
      downloadLegacyRecovery(legacy)
      return
    }
    downloadWorkspaceJson(exportWorkspaceJson(store.projects))
  }
  const cleanup = async () => {
    try {
      const removed = await store.cleanupUnusedImages()
      setCleanupMessage(removed ? `사용하지 않는 이미지 ${removed}개를 정리했습니다.` : '정리할 이미지가 없습니다.')
    } catch {
      setCleanupMessage('이미지 정리에 실패했습니다. JSON 백업을 먼저 저장해 주세요.')
    }
  }

  return (
    <aside className={`storage-warning ${failureMessage ? 'is-error' : ''}`} role={failureMessage ? 'alert' : 'status'}>
      <div>
        <strong>{failureMessage ? '자동 저장을 확인해 주세요' : isNearQuota ? '저장 공간이 거의 찼습니다' : '데이터 이전 안내'}</strong>
        <p>{failureMessage ?? store.migrationNotice ?? '브라우저 저장 공간을 정리해 주세요.'}</p>
        {estimate.usage != null && estimate.quota != null && (
          <small>브라우저 저장소 {formatBytes(estimate.usage)} / {formatBytes(estimate.quota)} 사용</small>
        )}
        {cleanupMessage && <small>{cleanupMessage}</small>}
      </div>
      <div className="storage-warning-actions">
        {failureMessage && <button type="button" onClick={() => void store.retrySave()}>다시 저장</button>}
        <button type="button" onClick={backup}>JSON 백업 내보내기</button>
        <button type="button" onClick={() => void cleanup()}>사용하지 않는 이미지 정리</button>
      </div>
    </aside>
  )
}
