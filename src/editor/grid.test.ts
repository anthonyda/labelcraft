import { describe, expect, it } from 'vitest'
import { gridLineMm, gridStepMm } from './grid'

// R29.AC2
describe('grid', () => {
  it('uses 1 mm, growing so dots stay 8 screen pixels apart', () => {
    expect(gridStepMm(20)).toBe(1)
    expect(gridStepMm(8)).toBe(1)
    expect(gridStepMm(7.9)).toBe(2)
    expect(gridStepMm(3)).toBe(5)
    expect(gridStepMm(1)).toBe(10)
    expect(gridStepMm(0.01)).toBe(50)
  })

  it('puts dots from the corner to the far edge', () => {
    expect(gridLineMm(3, 1)).toEqual([0, 1, 2, 3])
    expect(gridLineMm(12, 5)).toEqual([0, 5, 10])
  })
})
