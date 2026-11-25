import { describe, expect, it } from 'vitest'
import { memorySettings } from '../storage/settings'
import {
  CalibrationStore,
  DEFAULT_PX_PER_MM,
  parseCalibration,
  pxPerMmNow,
} from './calibration'

// R4.AC9
describe('screen calibration', () => {
  it('defaults to the CSS definition, 96 px per inch', () => {
    expect(pxPerMmNow(undefined, 1)).toBeCloseTo(96 / 25.4)
    expect(pxPerMmNow(undefined, 2)).toBe(DEFAULT_PX_PER_MM)
  })

  it('keeps real size when the browser zoom changes', () => {
    const c = { cssPxPerMm: 5, devicePixelRatio: 1.25 }
    expect(pxPerMmNow(c, 1.25)).toBe(5)
    // Browser zoom 125% → 150%: CSS px get bigger, so fewer are needed.
    expect(pxPerMmNow(c, 1.5)).toBeCloseTo((5 * 1.25) / 1.5)
  })

  it('reads only valid saved settings', () => {
    expect(parseCalibration(undefined)).toBeUndefined()
    expect(parseCalibration('nope')).toBeUndefined()
    expect(
      parseCalibration('{"cssPxPerMm":-1,"devicePixelRatio":1}'),
    ).toBeUndefined()
    expect(parseCalibration('{"cssPxPerMm":4.2,"devicePixelRatio":1}')).toEqual(
      { cssPxPerMm: 4.2, devicePixelRatio: 1 },
    )
  })

  it('saves, reloads and resets', () => {
    const settings = memorySettings()
    const store = new CalibrationStore(settings)
    expect(store.getState().calibration).toBeUndefined()
    store.calibrate(4.5)
    expect(new CalibrationStore(settings).getState().calibration).toEqual({
      cssPxPerMm: 4.5,
      devicePixelRatio: 1,
    })
    store.reset()
    expect(
      new CalibrationStore(settings).getState().calibration,
    ).toBeUndefined()
  })
})
