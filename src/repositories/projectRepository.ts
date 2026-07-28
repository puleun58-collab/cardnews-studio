import type { Project } from '../types'

export type SaveProjectOptions = {
  changedPageIds?: ReadonlySet<string>
}

export type DeleteProjectOptions = {
  protectedImageSources?: Iterable<string>
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
  deleteProject(id: string, options?: DeleteProjectOptions): Promise<void>
  saveImage(blob: Blob): Promise<string>
  getImage(id: string): Promise<Blob | null>
  deleteUnusedImages(protectedImageSources?: Iterable<string>): Promise<number>
  getMeta<T>(key: string): Promise<T | null>
  setMeta<T>(key: string, value: T): Promise<void>
  deleteMeta(key: string): Promise<void>
  getStorageEstimate(): Promise<StorageEstimate>
  clearAll(): Promise<void>
}
