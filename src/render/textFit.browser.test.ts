import { describe, expect, it } from 'vitest'
import { createObject, newDoc } from '../model/factory'
import type { TextObject } from '../model/types'
import { renderLabel } from './renderLabel'
import { drawFitted, fitFontPt, textFontPt } from './textFit'

const text = (patch: Partial<TextObject> = {}): TextObject => ({
  ...(createObject(
    'text',
    newDoc({ widthMm: 30, heightMm: 12 }).label,
  ) as TextObject),
  ...patch,
})

// R5.AC6
describe('fit to box', () => {
  it('grows with the box and stays in half points', () => {
    const o = text({ text: 'Hello' })
    const small = fitFontPt(o, 100, 40, 203)
    const big = fitFontPt(o, 200, 80, 203)
    expect(big).toBeGreaterThan(small)
    expect((small * 2) % 1).toBe(0) // shown in half points
  })

  it('is limited by height for short text, width for long text', () => {
    const short = fitFontPt(text({ text: 'A' }), 1000, 40, 203)
    const tall = fitFontPt(text({ text: 'A' }), 1000, 80, 203)
    expect(tall).toBeGreaterThan(short)
    const long = fitFontPt(text({ text: 'A long line of text' }), 100, 400, 203)
    const wider = fitFontPt(
      text({ text: 'A long line of text' }),
      200,
      400,
      203,
    )
    expect(wider).toBeGreaterThan(long)
  })

  it('more lines means a smaller size', () => {
    const one = fitFontPt(text({ text: 'Ab' }), 400, 80, 203)
    const two = fitFontPt(text({ text: 'Ab\nAb' }), 400, 80, 203)
    expect(two).toBeLessThan(one)
  })

  it('fills the box with ink: no padding on the limiting side', () => {
    for (const [t, w, h] of [
      ['Miaou', 400, 100],
      ['Miaou', 100, 400],
      ['Ab\nCd', 300, 300],
    ] as const) {
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      drawFitted(c.getContext('2d')!, text({ text: t }), w, h)
      const d = c.getContext('2d')!.getImageData(0, 0, w, h).data
      let x1: number = w,
        y1: number = h,
        x2 = -1,
        y2 = -1
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          if (d[(y * w + x) * 4 + 3] > 0) {
            x1 = Math.min(x1, x)
            x2 = Math.max(x2, x)
            y1 = Math.min(y1, y)
            y2 = Math.max(y2, y)
          }
      // Inside the box, and filling it along one side within ~2 %.
      expect(x1).toBeGreaterThanOrEqual(0)
      expect(y1).toBeGreaterThanOrEqual(0)
      const fillW = (x2 - x1 + 1) / w
      const fillH = (y2 - y1 + 1) / h
      expect(Math.max(fillW, fillH)).toBeGreaterThan(0.97)
      // Centred vertically, and horizontally for centred text.
      expect(Math.abs(y1 - (h - 1 - y2))).toBeLessThanOrEqual(3)
      expect(Math.abs(x1 - (w - 1 - x2))).toBeLessThanOrEqual(3)
    }
  })

  // R5.AC7
  it('letter width stretches the ink sideways only', () => {
    const inkBox = (stretch: number) => {
      const c = document.createElement('canvas')
      c.width = 800
      c.height = 100
      drawFitted(
        c.getContext('2d')!,
        text({ text: 'Miaou', stretch }),
        800,
        100,
      )
      const d = c.getContext('2d')!.getImageData(0, 0, 800, 100).data
      let x1 = 800
      let x2 = -1
      let rows = 0
      for (let y = 0; y < 100; y++) {
        let any = false
        for (let x = 0; x < 800; x++) {
          if (d[(y * 800 + x) * 4 + 3] > 0) {
            any = true
            x1 = Math.min(x1, x)
            x2 = Math.max(x2, x)
          }
        }
        if (any) rows++
      }
      return { width: x2 - x1 + 1, rows }
    }
    const normal = inkBox(1)
    const wide = inkBox(1.5)
    // Height-limited box: same height, 1.5 × the width.
    expect(wide.rows).toBe(normal.rows)
    expect(wide.width / normal.width).toBeCloseTo(1.5, 1)
  })

  it('uses its own size when off', () => {
    expect(
      textFontPt(text({ autoSize: false, fontSize: 9 }), 400, 80, 203),
    ).toBe(9)
  })

  it('new text fits its box, so nothing is outside the label', async () => {
    const doc = newDoc({ widthMm: 30, heightMm: 12 })
    const o = createObject('text', doc.label) as TextObject
    expect(o.autoSize).toBe(true)
    const r = await renderLabel({ ...doc, objects: [o] })
    expect(r.outside).toEqual([])
  })
})
