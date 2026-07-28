import { nowIso } from '../domain/shared'
import {
  openDatabase,
  requestToPromise,
  STORES,
  transactionDone,
  type ImageRecord,
  type MetaRecord,
  type PageRecord,
  type ProjectRecord,
} from '../storage/database'
import {
  blobToDataUrl,
  imageIdFromReference,
  imageReference,
  imageSourceToBlob,
  isStoredImageReference,
  sha256,
} from '../storage/imageStorage'
import { normalizeProjectData } from '../validation/projectSchema'
import type { CardPage, Project } from '../types'
import type { DeleteProjectOptions, ProjectRepository, SaveProjectOptions, StorageEstimate } from './projectRepository'

const imageSources = (page: CardPage) => [
  page.backgroundImage,
  page.image,
  page.overlayImage?.src,
].filter((value): value is string => typeof value === 'string')

export class IndexedDbProjectRepository implements ProjectRepository {
  private readonly databaseName: string | undefined

  constructor(databaseName?: string) {
    this.databaseName = databaseName
  }

  private database() {
    return openDatabase(this.databaseName)
  }

  async getAllProjects(): Promise<Project[]> {
    const database = await this.database()
    const transaction = database.transaction([STORES.projects, STORES.pages, STORES.images], 'readonly')
    const projectRecordsPromise = requestToPromise(transaction.objectStore(STORES.projects).getAll()) as Promise<ProjectRecord[]>
    const pageRecordsPromise = requestToPromise(transaction.objectStore(STORES.pages).getAll()) as Promise<PageRecord[]>
    const imageRecordsPromise = requestToPromise(transaction.objectStore(STORES.images).getAll()) as Promise<ImageRecord[]>
    const [projectRecords, pageRecords, imageRecords] = await Promise.all([
      projectRecordsPromise,
      pageRecordsPromise,
      imageRecordsPromise,
      transactionDone(transaction),
    ]).then(([projects, pages, images]) => [projects, pages, images] as const)
    const images = new Map(imageRecords.map((record) => [record.id, record.blob]))
    const pagesByProject = new Map<string, PageRecord[]>()
    for (const page of pageRecords) {
      const list = pagesByProject.get(page.projectId) ?? []
      list.push(page)
      pagesByProject.set(page.projectId, list)
    }
    const projects = await Promise.all(projectRecords.map(async (record) => {
      const storedPages = (pagesByProject.get(record.id) ?? []).sort((left, right) => left.order - right.order)
      const pages = await Promise.all(storedPages.map((page) => this.hydratePage(page, images)))
      return normalizeProjectData({ ...record, pages })
    }))
    return projects.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  }

  async getProject(id: string): Promise<Project | null> {
    const projects = await this.getAllProjects()
    return projects.find((project) => project.id === id) ?? null
  }

  async saveProject(project: Project, options: SaveProjectOptions = {}): Promise<void> {
    const selectedIds = options.changedPageIds
    const selectedPages = selectedIds
      ? project.pages.filter((page) => selectedIds.has(page.id))
      : project.pages
    const preparedPages = await Promise.all(selectedPages.map(async (page, order) => {
      const actualOrder = project.pages.findIndex((candidate) => candidate.id === page.id)
      return this.preparePage(page, project.id, actualOrder < 0 ? order : actualOrder)
    }))
    const database = await this.database()
    const transaction = database.transaction([STORES.projects, STORES.pages], 'readwrite', { durability: 'strict' })
    const projects = transaction.objectStore(STORES.projects)
    const pages = transaction.objectStore(STORES.pages)
    const record: ProjectRecord = {
      id: project.id,
      schemaVersion: project.schemaVersion,
      name: project.name,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      canvasSize: project.canvasSize,
      pageIds: project.pages.map((page) => page.id),
    }
    projects.put(record)
    for (const page of preparedPages) pages.put(page)
    const existing = await requestToPromise(pages.index('projectId').getAllKeys(project.id))
    const currentIds = new Set(project.pages.map((page) => page.id))
    for (const key of existing) {
      if (!currentIds.has(String(key))) pages.delete(key)
    }
    await transactionDone(transaction)
  }

  async deleteProject(id: string, options: DeleteProjectOptions = {}): Promise<void> {
    const database = await this.database()
    const transaction = database.transaction([STORES.projects, STORES.pages], 'readwrite', { durability: 'strict' })
    transaction.objectStore(STORES.projects).delete(id)
    const pages = transaction.objectStore(STORES.pages)
    const keys = await requestToPromise(pages.index('projectId').getAllKeys(id))
    keys.forEach((key) => pages.delete(key))
    await transactionDone(transaction)
    await this.deleteUnusedImages(options.protectedImageSources)
  }

  async saveImage(blob: Blob): Promise<string> {
    const hash = await sha256(blob)
    const id = `sha256-${hash}`
    const database = await this.database()
    const transaction = database.transaction(STORES.images, 'readwrite')
    const store = transaction.objectStore(STORES.images)
    const existing = await requestToPromise(store.get(id)) as ImageRecord | undefined
    if (!existing) {
      const record: ImageRecord = {
        id,
        blob,
        hash,
        size: blob.size,
        type: blob.type,
        createdAt: nowIso(),
      }
      store.put(record)
    }
    await transactionDone(transaction)
    return id
  }

  async getImage(id: string): Promise<Blob | null> {
    const database = await this.database()
    const transaction = database.transaction(STORES.images, 'readonly')
    const record = await requestToPromise(transaction.objectStore(STORES.images).get(id)) as ImageRecord | undefined
    await transactionDone(transaction)
    return record?.blob ?? null
  }

  async deleteUnusedImages(protectedImageSources: Iterable<string> = []): Promise<number> {
    const protectedIds = new Set<string>()
    for (const source of protectedImageSources) {
      if (isStoredImageReference(source)) {
        protectedIds.add(imageIdFromReference(source))
        continue
      }
      const blob = await imageSourceToBlob(source)
      if (blob) protectedIds.add(`sha256-${await sha256(blob)}`)
    }
    const database = await this.database()
    const read = database.transaction([STORES.pages, STORES.images], 'readonly')
    const [pages, images] = await Promise.all([
      requestToPromise(read.objectStore(STORES.pages).getAll()) as Promise<PageRecord[]>,
      requestToPromise(read.objectStore(STORES.images).getAllKeys()),
      transactionDone(read),
    ]).then(([pageRecords, imageKeys]) => [pageRecords, imageKeys] as const)
    const used = new Set<string>()
    pages.flatMap(imageSources).forEach((source) => {
      if (isStoredImageReference(source)) used.add(imageIdFromReference(source))
    })
    protectedIds.forEach((id) => used.add(id))
    const unused = images.filter((key) => !used.has(String(key)))
    if (!unused.length) return 0
    const write = database.transaction(STORES.images, 'readwrite')
    unused.forEach((key) => write.objectStore(STORES.images).delete(key))
    await transactionDone(write)
    return unused.length
  }

  async getMeta<T>(key: string): Promise<T | null> {
    const database = await this.database()
    const transaction = database.transaction(STORES.meta, 'readonly')
    const record = await requestToPromise(transaction.objectStore(STORES.meta).get(key)) as MetaRecord<T> | undefined
    await transactionDone(transaction)
    return record?.value ?? null
  }

  async setMeta<T>(key: string, value: T): Promise<void> {
    const database = await this.database()
    const transaction = database.transaction(STORES.meta, 'readwrite')
    transaction.objectStore(STORES.meta).put({ key, value } satisfies MetaRecord<T>)
    await transactionDone(transaction)
  }

  async deleteMeta(key: string): Promise<void> {
    const database = await this.database()
    const transaction = database.transaction(STORES.meta, 'readwrite')
    transaction.objectStore(STORES.meta).delete(key)
    await transactionDone(transaction)
  }

  async getStorageEstimate(): Promise<StorageEstimate> {
    if (!navigator.storage?.estimate) return { usage: null, quota: null, ratio: null }
    const estimate = await navigator.storage.estimate()
    const usage = typeof estimate.usage === 'number' ? estimate.usage : null
    const quota = typeof estimate.quota === 'number' ? estimate.quota : null
    return { usage, quota, ratio: usage != null && quota ? usage / quota : null }
  }

  async clearAll(): Promise<void> {
    const database = await this.database()
    const transaction = database.transaction(Object.values(STORES), 'readwrite', { durability: 'strict' })
    Object.values(STORES).forEach((name) => transaction.objectStore(name).clear())
    await transactionDone(transaction)
  }

  private async prepareImage(source: string | null | undefined): Promise<string | null> {
    if (!source) return null
    if (isStoredImageReference(source)) return source
    const blob = await imageSourceToBlob(source)
    if (!blob) return source
    return imageReference(await this.saveImage(blob))
  }

  private async preparePage(page: CardPage, projectId: string, order: number): Promise<PageRecord> {
    const [backgroundImage, image, overlaySource] = await Promise.all([
      this.prepareImage(page.backgroundImage),
      this.prepareImage(page.image),
      this.prepareImage(page.overlayImage?.src),
    ])
    return {
      ...structuredClone(page),
      backgroundImage,
      image,
      overlayImage: page.overlayImage && overlaySource ? { ...page.overlayImage, src: overlaySource } : null,
      projectId,
      order,
    }
  }

  private async hydrateSource(source: string | null | undefined, images: Map<string, Blob>): Promise<string | null> {
    if (!source) return null
    if (!isStoredImageReference(source)) return source
    const blob = images.get(imageIdFromReference(source))
    return blob ? blobToDataUrl(blob) : null
  }

  private async hydratePage(page: PageRecord, images: Map<string, Blob>): Promise<CardPage> {
    const [backgroundImage, image, overlaySource] = await Promise.all([
      this.hydrateSource(page.backgroundImage, images),
      this.hydrateSource(page.image, images),
      this.hydrateSource(page.overlayImage?.src, images),
    ])
    const { projectId: _projectId, order: _order, ...cardPage } = page
    void _projectId
    void _order
    return {
      ...cardPage,
      backgroundImage,
      image,
      overlayImage: cardPage.overlayImage && overlaySource ? { ...cardPage.overlayImage, src: overlaySource } : null,
    }
  }
}
