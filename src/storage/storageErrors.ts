export type StorageFailureKind = 'quota' | 'unavailable' | 'offline' | 'unknown'

export type StorageFailure = {
  kind: StorageFailureKind
  message: string
  technicalMessage: string
}

export function classifyStorageError(error: unknown): StorageFailure {
  const name = error instanceof DOMException ? error.name : ''
  const technicalMessage = error instanceof Error ? error.message : String(error)
  if (name === 'QuotaExceededError') {
    return { kind: 'quota', message: '저장 공간이 부족합니다. JSON 백업 후 큰 이미지를 정리해 주세요.', technicalMessage }
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { kind: 'offline', message: '오프라인 상태이거나 브라우저 저장소에 접근할 수 없습니다.', technicalMessage }
  }
  if (name === 'InvalidStateError' || name === 'SecurityError' || /IndexedDB|저장소/i.test(technicalMessage)) {
    return { kind: 'unavailable', message: '브라우저 저장소에 접근할 수 없습니다. 시크릿 모드와 사이트 권한을 확인해 주세요.', technicalMessage }
  }
  return { kind: 'unknown', message: '자동 저장에 실패했습니다. 다시 저장하거나 JSON으로 백업해 주세요.', technicalMessage }
}
