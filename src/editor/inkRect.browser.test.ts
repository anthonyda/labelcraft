import Konva from 'konva'
import { describe, expect, it } from 'vitest'
import { inkRect } from './inkRect'

/** A 20 × 10 bitmap with ink in columns 5–9 and rows 2–5. */
const bitmap = () => {
  const c = document.createElement('canvas')
  c.width = 20
  c.height = 10
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(5, 2, 5, 4)
  return c
}

// R26.AC1: the magnet uses the ink, not the box.
describe('inkRect', () => {
  it('is the ink box in label dots', () => {
    const n = new Konva.Image({
      image: bitmap(),
      x: 100,
      y: 50,
      width: 20,
      height: 10,
    })
    expect(inkRect(n)).toEqual({ x: 105, y: 52, width: 5, height: 4 })
  })

  it('follows the node size and rotation', () => {
    const n = new Konva.Image({
      image: bitmap(),
      x: 10,
      y: 5,
      width: 40,
      height: 20,
      offsetX: 20,
      offsetY: 10,
      rotation: 90,
    })
    const r = inkRect(n)!
    // Turned 90° around (10, 5): ink 10..20 × 4..12 (local) maps to x 3..-5.
    expect(r.width).toBeCloseTo(8)
    expect(r.height).toBeCloseTo(10)
  })

  it('is undefined without ink', () => {
    const c = document.createElement('canvas')
    c.width = c.height = 4
    expect(
      inkRect(new Konva.Image({ image: c, width: 4, height: 4 })),
    ).toBeUndefined()
  })
})
