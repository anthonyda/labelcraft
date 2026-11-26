import { describe, expect, it } from 'vitest'
import { createObject, newDoc } from '../model/factory'
import type { TextObject } from '../model/types'
import { renderLabel } from './renderLabel'
import { fitFontPt, textFontPt } from './textFit'

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
    expect((small * 2) % 1).toBe(0)
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
