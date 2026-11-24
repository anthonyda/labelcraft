import { describe, expect, it } from 'vitest'
import { ZOOM_MAX, ZOOM_MIN, zoomStep } from './zoom'

describe('zoomStep', () => {
  it('moves between steps', () => {
    expect(zoomStep(1, 1)).toBe(1.5)
    expect(zoomStep(1, -1)).toBe(0.75)
  })

  it('snaps a pinched zoom to the next step', () => {
    expect(zoomStep(1.23, 1)).toBe(1.5)
    expect(zoomStep(1.23, -1)).toBe(1)
  })

  it('stays within limits', () => {
    expect(zoomStep(ZOOM_MAX, 1)).toBe(ZOOM_MAX)
    expect(zoomStep(ZOOM_MIN, -1)).toBe(ZOOM_MIN)
  })
})
