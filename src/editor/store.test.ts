import { describe, expect, it } from 'vitest'
import { createObject, newDoc } from '../model/factory'
import type { LabelDoc, LabelObject } from '../model/types'
import { COPY_OFFSET_MM, EditorStore } from './store'

const rect = (id: string, x = 0, y = 0): LabelObject => ({
  ...createObject('rect', newDoc().label),
  id,
  x,
  y,
})

const store = (...objects: LabelObject[]) => {
  const doc: LabelDoc = { ...newDoc({ widthMm: 50, heightMm: 30 }), objects }
  return new EditorStore(doc)
}

const ids = (s: EditorStore) => s.doc.objects.map((o) => o.id)

describe('editor store', () => {
  it('notifies subscribers on change', () => {
    const s = store(rect('a'))
    let calls = 0
    s.subscribe(() => calls++)
    s.select(['a'])
    expect(calls).toBe(1)
  })

  describe('selection (R4.AC2)', () => {
    it('selects, toggles and clears', () => {
      const s = store(rect('a'), rect('b'))
      s.select(['a'])
      s.toggleSelected('b')
      expect(s.selection).toEqual(['a', 'b'])
      s.toggleSelected('a')
      expect(s.selection).toEqual(['b'])
      s.clearSelection()
      expect(s.selection).toEqual([])
    })

    it('ignores unknown ids and selects all', () => {
      const s = store(rect('a'), rect('b'))
      s.select(['a', 'zzz'])
      expect(s.selection).toEqual(['a'])
      s.selectAll()
      expect(s.selection).toEqual(['a', 'b'])
    })
  })

  // R4.AC2: arrow keys move by whole printer pixels.
  it('nudges the selection by printer pixels as one undo step', () => {
    const s = store(rect('a', 10, 10), rect('b', 20, 20))
    s.select(['a'])
    s.nudgeSelection(10, -10) // 10 px at 203 dpi = 1.2512 mm
    expect(s.doc.objects[0].x).toBeCloseTo(11.2512, 3)
    expect(s.doc.objects[0].y).toBeCloseTo(8.7488, 3)
    expect(s.doc.objects[1].x).toBe(20)
    s.undo()
    expect(s.doc.objects[0].x).toBe(10)
  })

  it('applies several object changes as one undo step', () => {
    const s = store(rect('a'), rect('b'))
    s.updateObjects([
      { id: 'a', patch: { x: 5 } },
      { id: 'b', patch: { rotation: 45 } },
    ])
    expect(s.doc.objects.map((o) => [o.x, o.rotation])).toEqual([
      [5, 0],
      [0, 45],
    ])
    s.undo()
    expect(s.doc.objects.map((o) => [o.x, o.rotation])).toEqual([
      [0, 0],
      [0, 0],
    ])
  })

  // R4.AC3
  it('deletes the selection and undo brings it back', () => {
    const s = store(rect('a'), rect('b'))
    s.select(['a'])
    s.deleteSelection()
    expect(ids(s)).toEqual(['b'])
    expect(s.selection).toEqual([])
    s.undo()
    expect(ids(s)).toEqual(['a', 'b'])
  })

  it('duplicates and selects the copies', () => {
    const s = store(rect('a', 1, 1))
    s.select(['a'])
    s.duplicateSelection()
    expect(s.doc.objects).toHaveLength(2)
    expect(s.selection).toEqual([s.doc.objects[1].id])
    expect(s.doc.objects[1].x).toBe(1 + COPY_OFFSET_MM)
  })

  it('copies and pastes with growing offsets', () => {
    const s = store(rect('a', 1, 1))
    s.select(['a'])
    s.copySelection()
    s.paste()
    s.paste()
    expect(s.doc.objects.map((o) => o.x)).toEqual([
      1,
      1 + COPY_OFFSET_MM,
      1 + 2 * COPY_OFFSET_MM,
    ])
    expect(new Set(ids(s)).size).toBe(3)
    expect(s.selection).toEqual([s.doc.objects[2].id])
  })

  it('does nothing without a selection', () => {
    const s = store(rect('a'))
    s.deleteSelection()
    s.duplicateSelection()
    s.paste()
    expect(ids(s)).toEqual(['a'])
    expect(s.canUndo).toBe(false)
  })

  // R4.AC4–AC5
  it('reorders and aligns the selection', () => {
    const s = store(rect('a', 7, 7), rect('b'))
    s.select(['a'])
    s.reorderSelection('front')
    expect(ids(s)).toEqual(['b', 'a'])
    s.alignSelection('left')
    expect(s.doc.objects[1].x).toBe(0)
  })

  // R4.AC6
  it('undoes and redoes, dropping vanished ids from the selection', () => {
    const s = store(rect('a'))
    s.select(['a'])
    s.duplicateSelection()
    const copy = s.selection[0]
    s.undo()
    expect(s.selection).toEqual([])
    expect(s.canRedo).toBe(true)
    s.redo()
    expect(ids(s)).toContain(copy)
  })

  // T4.1
  it('adds a new object centred and selects it', () => {
    const s = store(rect('a'))
    const id = s.addObject('qr')
    expect(s.doc.objects).toHaveLength(2)
    expect(s.selection).toEqual([id])
    const qr = s.doc.objects[1]
    expect(qr.type).toBe('qr')
    expect(qr.x + qr.width / 2).toBeCloseTo(25)
  })

  // R9.AC2: typing in a field is one undo step.
  it('merges consecutive edits with the same key into one undo step', () => {
    const s = store(rect('a'))
    s.updateObject('a', { x: 1 }, 'a:x')
    s.updateObject('a', { x: 12 }, 'a:x')
    s.updateObject('a', { x: 123 }, 'a:x')
    s.updateObject('a', { y: 4 }, 'a:y')
    expect(s.doc.objects[0]).toMatchObject({ x: 123, y: 4 })
    s.undo()
    expect(s.doc.objects[0]).toMatchObject({ x: 123, y: 0 })
    s.undo()
    expect(s.doc.objects[0]).toMatchObject({ x: 0, y: 0 })
  })

  it('does not merge across an undo', () => {
    const s = store(rect('a'))
    s.updateObject('a', { x: 1 }, 'a:x')
    s.undo()
    s.updateObject('a', { x: 2 }, 'a:x')
    s.undo()
    expect(s.doc.objects[0].x).toBe(0)
  })

  // R3
  it('changes the label setup keeping objects', () => {
    const s = store(rect('a', 3, 3))
    s.setLabel({ widthMm: 40, dpi: 300 })
    expect(s.doc.label).toMatchObject({ widthMm: 40, heightMm: 30, dpi: 300 })
    expect(s.doc.objects[0]).toMatchObject({ x: 3, y: 3 })
  })

  // T5: saved state tracking
  it('tracks unsaved changes against the last save', () => {
    const s = store(rect('a'))
    expect(s.isDirty).toBe(false)
    s.addObject('rect')
    expect(s.isDirty).toBe(true)
    s.markSaved('id1', 'Shelf A')
    expect(s.isDirty).toBe(false)
    expect(s.getState().file).toMatchObject({ labelId: 'id1', name: 'Shelf A' })
    s.undo()
    expect(s.isDirty).toBe(true)
    s.redo()
    expect(s.isDirty).toBe(false)
  })

  it('loads a document with file info, clearing history', () => {
    const s = store(rect('a'))
    s.addObject('rect')
    s.load(newDoc(), { labelId: 'x', name: 'X' })
    expect(s.doc.objects).toHaveLength(0)
    expect(s.canUndo).toBe(false)
    expect(s.isDirty).toBe(false)
    s.load(newDoc(), { name: 'imported' }, true)
    expect(s.isDirty).toBe(true)
  })

  it('forgets a deleted label but keeps the document', () => {
    const s = store(rect('a'))
    s.markSaved('id1', 'A')
    s.forgetLabel('id1')
    expect(s.getState().file.labelId).toBeUndefined()
    expect(s.isDirty).toBe(true)
    expect(s.doc.objects).toHaveLength(1)
  })
})

// Bug fix: a barcode resized narrower than one dot per bar was blank.
describe('barcodes stay printable', () => {
  const barcode = (): LabelObject =>
    ({
      ...createObject('barcode', newDoc().label),
      id: 'b',
      x: 10,
      width: 35,
      content: '012345678901',
      format: 'CODE128',
    }) as LabelObject

  it('widens a too-narrow barcode to its printable width, keeping its centre', () => {
    const s = store(barcode())
    s.updateObjects([{ id: 'b', patch: { width: 5 } }])
    const o = s.doc.objects[0]
    // 101 modules at 203 dpi ≈ 12.64 mm
    expect(o.width).toBeGreaterThanOrEqual(12.6)
    expect(o.width).toBeLessThan(13)
    expect(o.x + o.width / 2).toBeCloseTo(10 + 5 / 2, 5)
    expect(Math.round((o.width * 203) / 25.4)).toBeGreaterThanOrEqual(101)
  })

  it('widens it when longer content needs more room', () => {
    const s = store({ ...barcode(), width: 13 } as LabelObject)
    s.updateObject('b', { content: '012345678901234567890123' })
    expect(s.doc.objects[0].width).toBeGreaterThan(13)
  })

  it('leaves wide and invalid barcodes alone', () => {
    const s = store(barcode())
    s.updateObject('b', { width: 20 })
    expect(s.doc.objects[0].width).toBe(20)
    s.updateObject('b', { format: 'EAN13', content: 'AB', width: 3 })
    expect(s.doc.objects[0].width).toBe(3)
  })
})
