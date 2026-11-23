import { beforeEach, describe, expect, it } from 'vitest'
import { createObject, newDoc } from '../model/factory'
import {
  clearAll,
  deleteLabel,
  getLabel,
  listLabels,
  loadCurrent,
  openDb,
  saveCurrent,
  saveLabel,
} from './db'

const docWithQr = () => {
  const doc = newDoc({ widthMm: 40 })
  doc.objects.push(createObject('qr', doc.label))
  return doc
}

beforeEach(async () => {
  await clearAll()
})

// T5.1 / R10.AC1
describe('current label', () => {
  it('is empty at first', async () => {
    expect(await loadCurrent()).toBeUndefined()
  })

  it('saves and restores the document with its name', async () => {
    const doc = docWithQr()
    await saveCurrent({ doc, labelId: 'abc', name: 'Shelf A' })
    expect(await loadCurrent()).toEqual({
      doc,
      labelId: 'abc',
      name: 'Shelf A',
    })
  })

  it('ignores unreadable stored data', async () => {
    const db = await openDb()
    const tx = db.transaction('current', 'readwrite')
    tx.objectStore('current').put({ doc: { version: 99 } }, 'current')
    await new Promise((r) => (tx.oncomplete = r))
    expect(await loadCurrent()).toBeUndefined()
  })
})

// T5.2 / R10.AC2
describe('named labels', () => {
  it('saves, lists newest first, opens and deletes', async () => {
    const a = await saveLabel({ name: 'A', doc: newDoc() })
    await new Promise((r) => setTimeout(r, 5))
    const b = await saveLabel({
      name: 'B',
      doc: docWithQr(),
      thumbnail: 'data:x',
    })

    const list = await listLabels()
    expect(list.map((l) => l.name)).toEqual(['B', 'A'])
    expect(list[0]).not.toHaveProperty('doc')
    expect(list[0].thumbnail).toBe('data:x')

    const opened = await getLabel(b)
    expect(opened?.doc.objects[0].type).toBe('qr')

    await deleteLabel(a)
    expect((await listLabels()).map((l) => l.id)).toEqual([b])
  })

  it('overwrites a label saved with the same id', async () => {
    const id = await saveLabel({ name: 'A', doc: newDoc() })
    await saveLabel({ id, name: 'A2', doc: docWithQr() })
    const list = await listLabels()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('A2')
  })

  it('returns undefined for an unknown id', async () => {
    expect(await getLabel('nope')).toBeUndefined()
  })
})
