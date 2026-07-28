import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { createProjectData } from '../domain/project/projectOperations'
import { deleteDatabase, openDatabase, requestToPromise, STORES, transactionDone } from '../storage/database'
import { IndexedDbProjectRepository } from './indexedDbProjectRepository'

const databaseNames: string[] = []
const repository = () => {
  const name = `cardnews-test-${crypto.randomUUID()}`
  databaseNames.push(name)
  return { name, value: new IndexedDbProjectRepository(name) }
}

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map((name) => deleteDatabase(name)))
})

describe('IndexedDbProjectRepository', () => {
  it('프로젝트와 페이지를 CRUD하고 이미지를 Blob으로 분리·중복 제거한다', async () => {
    const { name, value } = repository()
    const project = createProjectData('저장소 테스트')
    const image = 'data:image/png;base64,iVBORw0KGgo='
    project.pages[0] = {
      ...project.pages[0],
      backgroundImage: image,
      image,
      overlayImage: { src: image, x: 50, y: 50, width: 42 },
    }
    await value.saveProject(project)
    const loaded = await value.getProject(project.id)
    expect(loaded?.pages[0].backgroundImage).toBe(image)
    expect(loaded?.pages[0].overlayImage?.src).toBe(image)

    const database = await openDatabase(name)
    const transaction = database.transaction([STORES.pages, STORES.images], 'readonly')
    const pages = await requestToPromise(transaction.objectStore(STORES.pages).getAll())
    const images = await requestToPromise(transaction.objectStore(STORES.images).getAll())
    await transactionDone(transaction)
    expect((pages[0] as { backgroundImage: string }).backgroundImage).toMatch(/^idb-image:/)
    expect((images[0] as { blob: Blob }).blob).toBeInstanceOf(Blob)
    expect(images).toHaveLength(1)

    await value.deleteProject(project.id)
    expect(await value.getProject(project.id)).toBeNull()
    expect(await value.deleteUnusedImages()).toBe(0)
    const imageTransaction = database.transaction(STORES.images, 'readonly')
    expect(await requestToPromise(imageTransaction.objectStore(STORES.images).count())).toBe(0)
    await transactionDone(imageTransaction)
  })

  it('pending 삭제가 참조하는 Data URL 이미지는 고아 정리에서 보호한다', async () => {
    const { name, value } = repository()
    const project = createProjectData('pending 이미지')
    const image = 'data:image/png;base64,iVBORw0KGgo='
    project.pages[0] = { ...project.pages[0], image }
    await value.saveProject(project)
    await value.saveProject({
      ...project,
      pages: [{ ...project.pages[0], image: null }],
    })
    expect(await value.deleteUnusedImages([image])).toBe(0)
    const database = await openDatabase(name)
    const protectedRead = database.transaction(STORES.images, 'readonly')
    expect(await requestToPromise(protectedRead.objectStore(STORES.images).count())).toBe(1)
    await transactionDone(protectedRead)
    expect(await value.deleteUnusedImages()).toBe(1)
  })
})
