/**
 * Browser storage for labels (T5.1, T5.2) in IndexedDB: the current label
 * (auto-saved) and named labels. Images are stored inline as data URLs, so
 * IndexedDB is used rather than localStorage (whose ~5 MB limit is too small).
 */
import { newId } from '../model/factory'
import { parseDoc } from '../model/serialize'
import type { LabelDoc } from '../model/types'

const DB_NAME = 'labelcraft'
const DB_VERSION = 1
const CURRENT = 'current'
const LABELS = 'labels'

/** The label being edited, restored on reload (R10.AC1). */
export type CurrentLabel = {
  doc: LabelDoc
  /** Named label this was opened from or saved as, if any. */
  labelId?: string
  name?: string
  /** Has changes not saved under its name. */
  dirty?: boolean
}

export type SavedLabelMeta = {
  id: string
  name: string
  /** ms since epoch */
  updatedAt: number
  /** Small PNG preview (data URL). */
  thumbnail?: string
}

export type SavedLabel = SavedLabelMeta & { doc: LabelDoc }

let dbPromise: Promise<IDBDatabase> | undefined

const request = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

const done = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'))
  })

export const openDb = (): Promise<IDBDatabase> => {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(CURRENT)) db.createObjectStore(CURRENT)
      if (!db.objectStoreNames.contains(LABELS)) {
        db.createObjectStore(LABELS, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      dbPromise = undefined
      reject(req.error)
    }
  })
  return dbPromise
}

export const loadCurrent = async (): Promise<CurrentLabel | undefined> => {
  const db = await openDb()
  const data = await request<CurrentLabel | undefined>(
    db.transaction(CURRENT).objectStore(CURRENT).get(CURRENT),
  )
  if (!data) return undefined
  try {
    return { ...data, doc: parseDoc(data.doc) }
  } catch {
    return undefined // unreadable: start fresh rather than crash
  }
}

export const saveCurrent = async (current: CurrentLabel): Promise<void> => {
  const db = await openDb()
  const tx = db.transaction(CURRENT, 'readwrite')
  tx.objectStore(CURRENT).put(current, CURRENT)
  await done(tx)
}

/** Saved labels, most recently changed first (without their documents). */
export const listLabels = async (): Promise<SavedLabelMeta[]> => {
  const db = await openDb()
  const all = await request<SavedLabel[]>(
    db.transaction(LABELS).objectStore(LABELS).getAll(),
  )
  return all
    .map(({ id, name, updatedAt, thumbnail }) => ({
      id,
      name,
      updatedAt,
      thumbnail,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export const getLabel = async (id: string): Promise<SavedLabel | undefined> => {
  const db = await openDb()
  const data = await request<SavedLabel | undefined>(
    db.transaction(LABELS).objectStore(LABELS).get(id),
  )
  return data && { ...data, doc: parseDoc(data.doc) }
}

/** Create (no id) or overwrite a named label; returns its id. */
export const saveLabel = async (label: {
  id?: string
  name: string
  doc: LabelDoc
  thumbnail?: string
}): Promise<string> => {
  const db = await openDb()
  const id = label.id ?? newId()
  const tx = db.transaction(LABELS, 'readwrite')
  tx.objectStore(LABELS).put({ ...label, id, updatedAt: Date.now() })
  await done(tx)
  return id
}

/** R10.AC5: rename a saved label, keeping its saved content. */
export const renameLabel = async (id: string, name: string): Promise<void> => {
  const db = await openDb()
  const tx = db.transaction(LABELS, 'readwrite')
  const store = tx.objectStore(LABELS)
  const saved = await request<SavedLabel | undefined>(store.get(id))
  if (saved) store.put({ ...saved, name })
  await done(tx)
}

export const deleteLabel = async (id: string): Promise<void> => {
  const db = await openDb()
  const tx = db.transaction(LABELS, 'readwrite')
  tx.objectStore(LABELS).delete(id)
  await done(tx)
}

/** Remove everything (used by tests). */
export const clearAll = async (): Promise<void> => {
  const db = await openDb()
  const tx = db.transaction([CURRENT, LABELS], 'readwrite')
  tx.objectStore(CURRENT).clear()
  tx.objectStore(LABELS).clear()
  await done(tx)
}
