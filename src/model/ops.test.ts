import { describe, expect, it } from 'vitest'
import { createObject, newDoc } from './factory'
import {
  addObject,
  alignObjects,
  boundingBox,
  deleteObjects,
  duplicateObjects,
  reorderObjects,
  setLabelSetup,
  updateObject,
} from './ops'
import type { LabelDoc, LabelObject } from './types'

const rect = (id: string, x = 0, y = 0, w = 10, h = 10): LabelObject => ({
  ...(createObject('rect', newDoc().label) as LabelObject),
  id,
  x,
  y,
  width: w,
  height: h,
})

const docWith = (...objects: LabelObject[]): LabelDoc => ({
  ...newDoc({ widthMm: 50, heightMm: 30 }),
  objects,
})

const ids = (doc: LabelDoc) => doc.objects.map((o) => o.id)

describe('model operations (T1.3)', () => {
  it('adds an object on top without mutating the input', () => {
    const before = docWith(rect('a'))
    const after = addObject(before, rect('b'))
    expect(ids(after)).toEqual(['a', 'b'])
    expect(ids(before)).toEqual(['a'])
  })

  it('updates an object', () => {
    const doc = updateObject(docWith(rect('a')), 'a', { x: 5, rotation: 30 })
    expect(doc.objects[0]).toMatchObject({ x: 5, rotation: 30 })
  })

  // R4.AC3
  it('deletes selected objects', () => {
    const doc = deleteObjects(docWith(rect('a'), rect('b'), rect('c')), [
      'a',
      'c',
    ])
    expect(ids(doc)).toEqual(['b'])
  })

  it('duplicates objects with new ids, offset, on top', () => {
    const { doc, newIds } = duplicateObjects(
      docWith(rect('a', 1, 2), rect('b')),
      ['a'],
    )
    expect(doc.objects).toHaveLength(3)
    expect(newIds).toHaveLength(1)
    expect(newIds[0]).not.toBe('a')
    expect(doc.objects[2]).toMatchObject({ id: newIds[0], x: 3, y: 4 })
  })

  // R4.AC4
  describe('reorder', () => {
    const doc = docWith(rect('a'), rect('b'), rect('c'), rect('d'))
    it('brings forward one step', () => {
      expect(ids(reorderObjects(doc, ['b'], 'forward'))).toEqual([
        'a',
        'c',
        'b',
        'd',
      ])
    })
    it('sends backward one step', () => {
      expect(ids(reorderObjects(doc, ['c'], 'backward'))).toEqual([
        'a',
        'c',
        'b',
        'd',
      ])
    })
    it('brings to front keeping relative order', () => {
      expect(ids(reorderObjects(doc, ['a', 'c'], 'front'))).toEqual([
        'b',
        'd',
        'a',
        'c',
      ])
    })
    it('sends to back keeping relative order', () => {
      expect(ids(reorderObjects(doc, ['b', 'd'], 'back'))).toEqual([
        'b',
        'd',
        'a',
        'c',
      ])
    })
    it('does nothing when already at the edge', () => {
      expect(ids(reorderObjects(doc, ['d'], 'forward'))).toEqual(ids(doc))
      expect(ids(reorderObjects(doc, ['a'], 'backward'))).toEqual(ids(doc))
    })
  })

  describe('bounding box', () => {
    it('equals the box when not rotated', () => {
      expect(boundingBox(rect('a', 1, 2, 10, 4))).toEqual({
        left: 1,
        top: 2,
        right: 11,
        bottom: 6,
      })
    })
    it('swaps width and height at 90°', () => {
      const bb = boundingBox({ ...rect('a', 0, 0, 10, 4), rotation: 90 })
      expect(bb.left).toBeCloseTo(3)
      expect(bb.top).toBeCloseTo(-3)
      expect(bb.right).toBeCloseTo(7)
      expect(bb.bottom).toBeCloseTo(7)
    })
  })

  // R4.AC5: align to label edges/centre using the visible (rotated) bounds.
  describe('align to label (50 × 30 mm)', () => {
    const doc = docWith(rect('a', 7, 9, 10, 4))
    const cases = [
      ['left', { x: 0 }],
      ['center', { x: 20 }],
      ['right', { x: 40 }],
      ['top', { y: 0 }],
      ['middle', { y: 13 }],
      ['bottom', { y: 26 }],
    ] as const
    for (const [edge, expected] of cases) {
      it(edge, () => {
        expect(alignObjects(doc, ['a'], edge).objects[0]).toMatchObject(
          expected,
        )
      })
    }
    it('aligns a rotated object by its visible bounds', () => {
      const rotated = docWith({ ...rect('a', 7, 9, 10, 4), rotation: 90 })
      const aligned = alignObjects(rotated, ['a'], 'left').objects[0]
      expect(boundingBox(aligned).left).toBeCloseTo(0)
    })
  })

  // R3.AC4: resizing the label keeps objects unchanged.
  it('changes label size without touching objects', () => {
    const before = docWith(rect('a', 40, 20))
    const after = setLabelSetup(before, { widthMm: 20, heightMm: 10 })
    expect(after.label).toMatchObject({ widthMm: 20, heightMm: 10, dpi: 203 })
    expect(after.objects).toEqual(before.objects)
  })
})
