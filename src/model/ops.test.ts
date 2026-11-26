import { describe, expect, it } from 'vitest'
import { createObject, newDoc } from './factory'
import {
  addObject,
  alignObjects,
  boundingBox,
  deleteObjects,
  duplicateObjects,
  moveObject,
  orientationOf,
  reorderObjects,
  setLabelSetup,
  turnLabel,
  updateObject,
} from './ops'
import { OBJECT_TYPES, type LabelDoc, type LabelObject } from './types'

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

// T6e.1 / R22
describe('turnLabel', () => {
  const doc = () => {
    const d = newDoc({ widthMm: 40, heightMm: 12 })
    d.label.size = 'D-12x40'
    d.objects.push(
      {
        ...createObject('rect', d.label),
        id: 'a',
        x: 2,
        y: 1,
        width: 10,
        height: 4,
        rotation: 0,
      } as LabelObject,
      {
        ...createObject('text', d.label),
        id: 'b',
        x: 25,
        y: 4,
        width: 6,
        height: 2,
        rotation: 30,
      } as LabelObject,
    )
    return d
  }

  it('swaps width and height, keeps the size entry, turns objects clockwise', () => {
    const t = turnLabel(doc())
    expect(t.label).toMatchObject({
      widthMm: 12,
      heightMm: 40,
      turned: true,
      size: 'D-12x40',
    })
    expect(orientationOf(t.label)).toBe('portrait')
    const a = t.objects[0]
    // centre (7, 3) → (H − 3, 7) = (9, 7)
    expect(a.x + a.width / 2).toBeCloseTo(9)
    expect(a.y + a.height / 2).toBeCloseTo(7)
    expect(a.rotation).toBe(90)
    expect(t.objects[1].rotation).toBe(120)
  })

  it('keeps objects inside the label when they were inside', () => {
    const t = turnLabel(doc())
    for (const o of t.objects) {
      const b = boundingBox(o)
      expect(b.left).toBeGreaterThanOrEqual(-1e-9)
      expect(b.top).toBeGreaterThanOrEqual(-1e-9)
      expect(b.right).toBeLessThanOrEqual(t.label.widthMm + 1e-9)
      expect(b.bottom).toBeLessThanOrEqual(t.label.heightMm + 1e-9)
    }
  })

  it('turning back restores the design exactly', () => {
    const d = doc()
    const back = turnLabel(turnLabel(d))
    expect(back.label).toEqual({ ...d.label, turned: false })
    back.objects.forEach((o, i) => {
      const before = d.objects[i]
      expect(o.x).toBeCloseTo(before.x, 9)
      expect(o.y).toBeCloseTo(before.y, 9)
      expect(o.rotation).toBe(before.rotation)
    })
  })
})

// R21.AC9
describe('moveObject', () => {
  const ids = (d: LabelDoc) => d.objects.map((o) => o.id)
  const doc = () => {
    const d = newDoc()
    for (const id of ['a', 'b', 'c']) {
      d.objects.push({ ...createObject('rect', d.label), id } as LabelObject)
    }
    return d
  }
  it('moves one object to a drawing index', () => {
    expect(ids(moveObject(doc(), 'a', 2))).toEqual(['b', 'c', 'a'])
    expect(ids(moveObject(doc(), 'c', 0))).toEqual(['c', 'a', 'b'])
    expect(ids(moveObject(doc(), 'b', 99))).toEqual(['a', 'c', 'b'])
  })
  it('returns the same document when nothing moves', () => {
    const d = doc()
    expect(moveObject(d, 'b', 1)).toBe(d)
    expect(moveObject(d, 'x', 0)).toBe(d)
  })
})

// R4.AC10: new objects fit inside the label.
describe('createObject sizes', () => {
  const inside = (o: LabelObject, w: number, h: number) =>
    o.x >= 1 - 1e-9 &&
    o.y >= 1 - 1e-9 &&
    o.x + o.width <= w - 1 + 1e-9 &&
    o.y + o.height <= h - 1 + 1e-9

  it.each([
    [30, 12],
    [40, 12],
    [22, 12],
    [12, 40],
    [50, 30],
  ])('every type fits a %s × %s mm label with a 1 mm margin', (w, h) => {
    const label = newDoc({ widthMm: w, heightMm: h }).label
    for (const type of OBJECT_TYPES) {
      const o = createObject(type, label)
      expect(inside(o, w, h), `${type} on ${w}×${h}`).toBe(true)
    }
  })

  it('keeps proportions and never grows', () => {
    const big = newDoc({ widthMm: 100, heightMm: 100 }).label
    const qr = createObject('qr', big)
    expect([qr.width, qr.height]).toEqual([15, 15])
    const small = newDoc({ widthMm: 30, heightMm: 12 }).label
    const qr2 = createObject('qr', small)
    expect(qr2.width).toBe(qr2.height)
    expect(qr2.height).toBe(10)
    const bc = createObject('barcode', small)
    expect(bc.width / bc.height).toBeCloseTo(35 / 12, 1)
  })

  it('shrinks a new text with its box', () => {
    const tiny = newDoc({ widthMm: 20, heightMm: 5 }).label
    const t = createObject('text', tiny) as Extract<
      LabelObject,
      { type: 'text' }
    >
    expect(t.height).toBe(3)
    expect(t.fontSize * (25.4 / 72) * 1.2).toBeLessThanOrEqual(t.height + 1e-9)
  })
})
