import type { Project } from '../types'

export type SaveProjectOptions = {
  changedPageIds?: ReadonlySet<string>
}

export type StorageEstimate = {
  usage: number | null
  quota: number | null
  ratio: number | null
}

export interface ProjectRepository {
  getAllProjects(): Promise<Project[]>
  getProject(id: string): Promise<Project | null>
  saveProject(project: Project, options?: SaveProjectOptions): Promise<void>
  deleteProject(id: string): Promise<void>
  saveImage(blob: Blob): Promise<string>
  getImage(id: string): Promise<Blob | null>
  deleteUnusedImages(): Promise<number>
  getMeta<T>(key: string): Promise<T | null>
  setMeta<T>(key: string, value: T): Promise<void>
  getStorageEstimate(): Promise<StorageEstimate>
  clearAll(): Promise<void>
}
