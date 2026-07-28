export interface AppConfig {
  appName: string
  appDescription: string
  fileSlug: string
  storageKey: string
  sessionStorageKey: string
  recoveryStorageKey: string
  databaseName: string
  projectSchemaVersion: number
  saveDebounceMs: number
  maxPages: number
  maxBackupJsonBytes: number
  maxImageBytes: number
  maxImagePixels: number
  maxImageDimension: number
  imageQuality: number
  deletionUndoMs: number
  maxPendingDeletions: number
  historyLimit: number
  historyMergeMs: number
  editorSessionDebounceMs: number
}
export const appConfig: AppConfig = {
  appName: 'CARDNEWS STUDIO',
  appDescription: '글과 사진으로 만드는 세로형 카드뉴스',
  fileSlug: 'my-card-studio',
  storageKey: 'cardnews-studio-hageon-v1',
  sessionStorageKey: 'cardnews-studio-hageon-v1-session',
  recoveryStorageKey: 'cardnews-studio-pending-recovery-v1',
  databaseName: 'cardnews-studio',
  projectSchemaVersion: 2,
  saveDebounceMs: 500,
  maxPages: 100,
  maxBackupJsonBytes: 100 * 1024 * 1024,
  maxImageBytes: 20 * 1024 * 1024,
  maxImagePixels: 40_000_000,
  maxImageDimension: 2400,
  imageQuality: 0.9,
  deletionUndoMs: 8_000,
  maxPendingDeletions: 4,
  historyLimit: 20,
  historyMergeMs: 650,
  editorSessionDebounceMs: 250,
}
