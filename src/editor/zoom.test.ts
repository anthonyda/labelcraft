import { describe, expect, it } from 'vitest'
import {
  ZOOM_MAX,
  ZOOM_MIN,
  clampZoom,
  formatZoom,
  parseZoomPercent,
  scaleToZoom,
  zoomStep,
  zoomToScale,
} from './zoom'

// T6e.3 / R4.AC1, AC8
describe('zoom', () => {
  it('100% is real size: printer dots shown at 96 CSS px per inch', () => {
    expect(zoomToScale(1, 203)).toBeCloseTo(96 / 203)
    // A 30 mm label (240 dots at 203 dpi) is 113 CSS px wide at 100%.
    expect(Math.round(240 * zoomToScale(1, 203))).toBe(113)
    expect(scaleToZoom(zoomToScale(2.5, 300), 300)).toBeCloseTo(2.5)
    // Calibrated screen (R4.AC9): 5 CSS px per real mm.
    expect(zoomToScale(1, 203, 5)).toBeCloseTo((5 * 25.4) / 203)
    expect(scaleToZoom(zoomToScale(1.5, 203, 5), 203, 5)).toBeCloseTo(1.5)
  })

  it('steps through the ladder from 10% to 2000%', () => {
    const up: string[] = []
    for (let z = ZOOM_MIN; z < ZOOM_MAX; z = zoomStep(z, 1)) {
      up.push(formatZoom(z))
    }
    expect(up).toEqual([
      '10%',
      '25%',
      '50%',
      '75%',
      '100%',
      '150%',
      '200%',
      '300%',
      '400%',
      '600%',
      '800%',
      '1200%',
      '1600%',
    ])
    expect(zoomStep(ZOOM_MAX, 1)).toBe(ZOOM_MAX)
    expect(zoomStep(ZOOM_MIN, -1)).toBe(ZOOM_MIN)
    // From an in-between value (fit, pinch) to the next step.
    expect(zoomStep(4.12, 1)).toBe(6)
    expect(zoomStep(4.12, -1)).toBe(4)
  })

  it('parses typed percentages and clamps them', () => {
    expect(parseZoomPercent('250')).toBe(2.5)
    expect(parseZoomPercent(' 37,5 % ')).toBe(0.375)
    expect(parseZoomPercent('5')).toBe(0.1)
    expect(parseZoomPercent('99999')).toBe(20)
    expect(parseZoomPercent('abc')).toBeUndefined()
    expect(parseZoomPercent('0')).toBeUndefined()
    expect(clampZoom(0.01)).toBe(0.1)
  })
})
