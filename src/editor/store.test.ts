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
})
