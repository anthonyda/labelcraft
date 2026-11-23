import { describe, expect, it } from 'vitest'
import { labelSizePx, mmToPx, ptToPx, pxToMm } from './units'

// T1.2 / R3.AC2: canvas px = mm × dpi / 25.4
describe('units', () => {
  it('converts mm to px at 203 dpi', () => {
    expect(mmToPx(25.4, 203)).toBeCloseTo(203)
    expect(mmToPx(50, 203)).toBeCloseTo(399.6, 1)
  })

  it('converts mm to px at 300 dpi', () => {
    expect(mmToPx(25.4, 300)).toBeCloseTo(300)
    expect(mmToPx(10, 300)).toBeCloseTo(118.11, 2)
  })

  it('round-trips px to mm', () => {
    expect(pxToMm(mmToPx(37.5, 203), 203)).toBeCloseTo(37.5)
  })

  it('converts font points to px', () => {
    expect(ptToPx(72, 203)).toBeCloseTo(203)
    expect(ptToPx(12, 300)).toBeCloseTo(50)
  })

  it('rounds label size to whole pixels', () => {
    expect(labelSizePx({ widthMm: 50, heightMm: 30, dpi: 203 })).toEqual({
      width: 400,
      height: 240,
    })
  })
})
