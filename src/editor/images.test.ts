import { describe, expect, it } from 'vitest'
import { fitImageMm, withRatio } from './images'

const label = { widthMm: 50, heightMm: 30, dpi: 203 }

// T4.3: new images keep their aspect ratio and fit within 80% of the label.
describe('fitImageMm', () => {
  it('fits a wide image to the width', () => {
    const s = fitImageMm(400, 100, label)
    expect(s.width).toBeCloseTo(40)
    expect(s.height).toBeCloseTo(10)
  })

  it('fits a tall image to the height', () => {
    const s = fitImageMm(100, 400, label)
    expect(s.height).toBeCloseTo(24)
    expect(s.width).toBeCloseTo(6)
  })

  it('handles a zero-height image without dividing by zero', () => {
    const s = fitImageMm(10, 0, label)
    expect(Number.isFinite(s.width) && Number.isFinite(s.height)).toBe(true)
  })
})

// R6.AC3
describe('withRatio', () => {
  it('keeps width and centre, sets the height for the ratio', () => {
    const r = withRatio({ x: 2, y: 1, width: 20, height: 4 }, 2)
    expect(r).toEqual({ y: -2, height: 10 })
    // centre stays at y = 3
    expect(r.y + r.height / 2).toBe(3)
  })
})
