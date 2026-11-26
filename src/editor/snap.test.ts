import { describe, expect, it } from 'vitest'
import { snapBox } from './snap'

const label = { width: 240, height: 96 }

// R26.AC1–AC2
describe('magnet', () => {
  it('snaps an edge to the label edge within the tolerance', () => {
    const r = snapBox({ x: 4, y: 30, width: 50, height: 20 }, label, [], 6)
    expect(r.dx).toBe(-4)
    expect(r.guidesX).toEqual([0])
  })

  it('leaves the box alone when nothing is close', () => {
    const r = snapBox({ x: 40, y: 20, width: 50, height: 20 }, label, [], 6)
    expect(r).toEqual({ dx: 0, dy: 0, guidesX: [], guidesY: [] })
  })

  it('snaps centres to the label centre', () => {
    // box centre 117 → label centre 120
    const r = snapBox({ x: 92, y: 10, width: 50, height: 20 }, label, [], 6)
    expect(r.dx).toBe(3)
    expect(r.guidesX).toContain(120)
  })

  it('snaps to other objects and picks the closest line', () => {
    const other = { x: 150, y: 10, width: 60, height: 40 }
    // right edge 148 → other's left 150 (2) beats nothing else
    const r = snapBox(
      { x: 98, y: 60, width: 50, height: 20 },
      label,
      [other],
      6,
    )
    expect(r.dx).toBe(2)
    expect(r.guidesX).toContain(150)
  })

  it('works on both axes at once, in whole dots', () => {
    const r = snapBox({ x: 1.6, y: 93, width: 30, height: 1 }, label, [], 6)
    expect(r.dx).toBe(-2)
    expect(r.dy).toBe(2) // bottom 94 → label bottom 96
  })
})
