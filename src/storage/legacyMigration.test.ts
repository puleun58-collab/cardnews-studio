import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { appConfig } from '../config/appConfig'
import { deleteDatabase } from './database'
import { IndexedDbProjectRepository } from '../repositories/indexedDbProjectRepository'
import { LegacyStorageMigrationError, migrateLegacyLocalStorage } from './legacyMigration'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, String(value)) }
}

const databaseNames: string[] = []
const repository = () => {
  const name = `legacy-test-${crypto.randomUUID()}`
  databaseNames.push(name)
  return new IndexedDbProjectRepository(name)
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
})

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map((name) => deleteDatabase(name)))
})

const legacyProject = {
  schemaVersion: 1,
  id: 'legacy-project',
  name: '이전 프로젝트',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  pages: [{
    id: 'legacy-page',
    templateId: 'midnight-quote',
    variantId: 'default',
    content: { kicker: '', body: '이전 데이터', source: '', note: '' },
  }],
}

describe('legacy localStorage migration', () => {
  it('원본을 유지하고 중복 없이 IndexedDB로 이전한다', async () => {
    const value = repository()
    const raw = JSON.stringify({ projects: [legacyProject], activeProjectId: 'legacy-project', activePageId: 'legacy-page' })
    localStorage.setItem(appConfig.storageKey, raw)
    const first = await migrateLegacyLocalStorage(value)
    const second = await migrateLegacyLocalStorage(value)
    expect(first).toMatchObject({ migrated: 1, performed: true })
    expect(second).toMatchObject({ migrated: 1, performed: false })
    expect(localStorage.getItem(appConfig.storageKey)).toBe(raw)
    expect(await value.getAllProjects()).toHaveLength(1)
  })

  it('손상된 JSON은 별도 키와 원래 키에 모두 보존한다', async () => {
    const value = repository()
    localStorage.setItem(appConfig.storageKey, '{broken')
    await expect(migrateLegacyLocalStorage(value)).rejects.toBeInstanceOf(LegacyStorageMigrationError)
    expect(localStorage.getItem(appConfig.storageKey)).toBe('{broken')
    const backupKeys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .filter((key): key is string => Boolean(key?.startsWith(`${appConfig.storageKey}-corrupt-`)))
    expect(backupKeys).toHaveLength(1)
    expect(localStorage.getItem(backupKeys[0])).toBe('{broken')
  })

  it('중복 프로젝트 ID가 있으면 이전을 중단하고 원본을 유지한다', async () => {
    const value = repository()
    const raw = JSON.stringify({ projects: [legacyProject, legacyProject] })
    localStorage.setItem(appConfig.storageKey, raw)
    await expect(migrateLegacyLocalStorage(value)).rejects.toBeInstanceOf(LegacyStorageMigrationError)
    expect(localStorage.getItem(appConfig.storageKey)).toBe(raw)
    expect(await value.getAllProjects()).toHaveLength(0)
  })
})
