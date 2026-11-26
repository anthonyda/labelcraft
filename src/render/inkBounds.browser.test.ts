import { describe, expect, it } from 'vitest'
import { createObject, newDoc } from '../model/factory'
import type { LabelObject } from '../model/types'
import { inkOutsideBox } from './inkBounds'
import { renderLabel } from './renderLabel'

/** Bitmap with ink only in [x0, x1) × [y0, y1). */
const bitmap = (
  w: number,
  h: number,
  ink: { x0: number; y0: number; x1: number; y1: number },
) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(ink.x0, ink.y0, ink.x1 - ink.x0, ink.y1 - ink.y0)
  return c
}
const label = { width: 240, height: 96 }

// T6b.5 / R19.AC1, AC4
describe('ink outside the label', () => {
  it('ignores a box past the edge when its ink is inside', () => {
    // 100 × 100 box from y = -20; ink only in its lower half.
    const b = bitmap(100, 100, { x0: 10, y0: 40, x1: 90, y1: 90 })
    const box = { x: 10, y: -20, width: 100, height: 100 }
    expect(inkOutsideBox(b, box, 0, label)).toBe(false)
  })

  it('flags ink past the edge, with half a dot of slack', () => {
    const b = bitmap(100, 50, { x0: 0, y0: 0, x1: 100, y1: 50 })
    expect(
      inkOutsideBox(b, { x: 140, y: 0, width: 100, height: 50 }, 0, label),
    ).toBe(false)
    expect(
      inkOutsideBox(b, { x: 141, y: 0, width: 100, height: 50 }, 0, label),
    ).toBe(true)
    expect(
      inkOutsideBox(b, { x: 0, y: -1, width: 100, height: 50 }, 0, label),
    ).toBe(true)
  })

  it('uses the rotated ink', () => {
    // A 200 × 10 bar fits flat but not turned 90°.
    const b = bitmap(200, 10, { x0: 0, y0: 0, x1: 200, y1: 10 })
    const box = { x: 20, y: 40, width: 200, height: 10 }
    expect(inkOutsideBox(b, box, 0, label)).toBe(false)
    expect(inkOutsideBox(b, box, 90, label)).toBe(true)
  })

  it('never flags an empty bitmap', () => {
    const b = bitmap(50, 50, { x0: 0, y0: 0, x1: 0, y1: 0 })
    const box = { x: -100, y: -100, width: 50, height: 50 }
    expect(inkOutsideBox(b, box, 0, label)).toBe(false)
  })

  it('renderLabel reports objects by ink: big text box, small text', async () => {
    const doc = newDoc({ widthMm: 30, heightMm: 12 })
    const text = {
      ...createObject('text', doc.label),
      id: 'text',
      x: 1,
      y: 1, // box runs 18 mm past the bottom; the text sits at its top
      width: 20,
      height: 30,
      text: 'Hi',
      fontSize: 10,
      autoSize: false,
    } as LabelObject
    doc.objects.push(text)
    expect((await renderLabel(doc)).outside).toEqual([])
    doc.objects[0] = { ...text, y: -3 } as LabelObject
    expect((await renderLabel(doc)).outside).toEqual(['text'])
  })
})
