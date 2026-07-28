import { appConfig } from '../config/appConfig'
import type { Project } from '../types'

export interface HistoryEntry {
  id: string
  projectId: string
  label: string
  before: Project
  after: Project
  activePageIdBefore: string | null
  activePageIdAfter: string | null
  createdAt: number
  mergeKey?: string
}

export interface ProjectHistory {
  past: HistoryEntry[]
  future: HistoryEntry[]
}

export const emptyProjectHistory = (): ProjectHistory => ({ past: [], future: [] })

export function pushHistory(
  history: ProjectHistory,
  entry: HistoryEntry,
  limit = appConfig.historyLimit,
  mergeMs = appConfig.historyMergeMs,
): ProjectHistory {
  const last = history.past.at(-1)
  const canMerge = Boolean(
    entry.mergeKey
    && last?.mergeKey === entry.mergeKey
    && last.projectId === entry.projectId
    && entry.createdAt - last.createdAt <= mergeMs,
  )
  const nextEntry = canMerge && last
    ? {
        ...last,
        after: structuredClone(entry.after),
        activePageIdAfter: entry.activePageIdAfter,
        createdAt: entry.createdAt,
      }
    : structuredClone(entry)
  const past = canMerge
    ? [...history.past.slice(0, -1), nextEntry]
    : [...history.past, nextEntry].slice(-limit)
  return { past, future: [] }
}

export function undoHistory(history: ProjectHistory): { history: ProjectHistory; entry: HistoryEntry } | null {
  const entry = history.past.at(-1)
  if (!entry) return null
  return {
    entry,
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, structuredClone(entry)].slice(-appConfig.historyLimit),
    },
  }
}

export function redoHistory(history: ProjectHistory): { history: ProjectHistory; entry: HistoryEntry } | null {
  const entry = history.future.at(-1)
  if (!entry) return null
  return {
    entry,
    history: {
      past: [...history.past, structuredClone(entry)].slice(-appConfig.historyLimit),
      future: history.future.slice(0, -1),
    },
  }
}
