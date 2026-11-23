import { describe, expect, it } from 'vitest'
import {
  blackRatio,
  inkPixels,
  ditherPixels,
  isMonochrome,
  luminance,
  thresholdPixels,
  type Pixels,
} from './bitmap'

/** Grey-level buffer: one RGBA pixel per value. */
const grey = (values: number[], width = values.length, alpha = 255): Pixels => {
  const data = new Uint8ClampedArray(values.length * 4)
  values.forEach((v, p) => data.set([v, v, v, alpha], p * 4))
  return { data, width, height: values.length / width }
}

// T1.6: everything sent to the printer is pure black or white.
describe('1-bit conversion', () => {
  it('treats transparent pixels as white paper', () => {
    expect(luminance(0, 0, 0, 0)).toBe(255)
    expect(luminance(0, 0, 0, 255)).toBe(0)
  })

  it('thresholds at 128 by default', () => {
    const px = grey([0, 100, 127, 128, 200, 255])
    thresholdPixels(px)
    expect(isMonochrome(px)).toBe(true)
    expect(Array.from({ length: 6 }, (_, p) => px.data[p * 4])).toEqual([
      0, 0, 0, 255, 255, 255,
    ])
  })

  it('uses a custom threshold', () => {
    const px = grey([100, 150, 200])
    thresholdPixels(px, 180)
    expect([px.data[0], px.data[4], px.data[8]]).toEqual([0, 0, 255])
  })

  it('makes transparent pixels white', () => {
    const px = grey([0, 0], 2, 0)
    thresholdPixels(px)
    expect(blackRatio(px)).toBe(0)
  })

  // R6.AC2: dithering keeps the average tone.
  it('dithers mid grey to about half black', () => {
    const px = grey(new Array(64 * 64).fill(128), 64)
    ditherPixels(px)
    expect(isMonochrome(px)).toBe(true)
    expect(blackRatio(px)).toBeGreaterThan(0.4)
    expect(blackRatio(px)).toBeLessThan(0.6)
  })

  it('dithers black and white unchanged', () => {
    const px = grey([0, 255, 0, 255])
    ditherPixels(px)
    expect([px.data[0], px.data[4], px.data[8], px.data[12]]).toEqual([
      0, 255, 0, 255,
    ])
  })

  it('turns dark pixels into opaque ink and the rest transparent', () => {
    const px = grey([0, 100, 200, 255])
    inkPixels(px)
    expect(Array.from(px.data)).toEqual([
      0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 0,
    ])
  })

  it('detects non-monochrome pixels', () => {
    expect(isMonochrome(grey([0, 255]))).toBe(true)
    expect(isMonochrome(grey([0, 128]))).toBe(false)
    expect(isMonochrome(grey([0], 1, 128))).toBe(false)
  })
})
