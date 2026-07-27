import { appConfig } from '../config/appConfig'
import type { CardPage, CardSize } from '../types'

export const DATABASE_VERSION = 1
export const STORES = {
  projects: 'projects',
  pages: 'pages',
  images: 'images',
  meta: 'meta',
} as const

export type ProjectRecord = {
  id: string
  schemaVersion: number
  name: string
  createdAt: string
  updatedAt: string
  canvasSize: CardSize
  pageIds: string[]
}

export type PageRecord = CardPage & {
  projectId: string
  order: number
}

export type ImageRecord = {
  id: string
  blob: Blob
  hash: string
  size: number
  type: string
  createdAt: string
}

export type MetaRecord<T = unknown> = {
  key: string
  value: T
}

const connections = new Map<string, Promise<IDBDatabase>>()

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'))
  })
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'))
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'))
  })
}

export function openDatabase(name = appConfig.databaseName): Promise<IDBDatabase> {
  const existing = connections.get(name)
  if (existing) return existing
  const connection = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('이 브라우저에서는 IndexedDB를 사용할 수 없습니다.'))
      return
    }
    const request = indexedDB.open(name, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORES.projects)) {
        database.createObjectStore(STORES.projects, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(STORES.pages)) {
        const pages = database.createObjectStore(STORES.pages, { keyPath: 'id' })
        pages.createIndex('projectId', 'projectId', { unique: false })
      }
      if (!database.objectStoreNames.contains(STORES.images)) {
        database.createObjectStore(STORES.images, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(STORES.meta)) {
        database.createObjectStore(STORES.meta, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => {
      const database = request.result
      database.onversionchange = () => {
        database.close()
        connections.delete(name)
      }
      resolve(database)
    }
    request.onerror = () => {
      connections.delete(name)
      reject(request.error ?? new Error('IndexedDB를 열지 못했습니다.'))
    }
    request.onblocked = () => {
      connections.delete(name)
      reject(new Error('다른 탭이 저장소 업데이트를 막고 있습니다. 다른 탭을 닫고 다시 시도해 주세요.'))
    }
  })
  connections.set(name, connection)
  return connection
}

export async function closeDatabase(name = appConfig.databaseName): Promise<void> {
  const connection = connections.get(name)
  connections.delete(name)
  if (connection) (await connection).close()
}

export async function deleteDatabase(name = appConfig.databaseName): Promise<void> {
  await closeDatabase(name)
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 삭제에 실패했습니다.'))
    request.onblocked = () => reject(new Error('다른 탭에서 저장소를 사용 중입니다.'))
  })
}
