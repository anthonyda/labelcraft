import { describe, expect, it } from 'vitest'
import { newDoc } from './factory'
import {
  ROLL_COLORS,
  isRollColor,
  rollColorOf,
  rollColorSwatch,
} from './rollColors'
import { fromJson, toJson } from './serialize'

// R28.AC1, AC3
describe('roll colours', () => {
  it('lists white first and clear last, with unique ids', () => {
    expect(ROLL_COLORS[0].name).toBe('White')
    expect(ROLL_COLORS.at(-1)?.name).toBe('Clear')
    expect(new Set(ROLL_COLORS.map((c) => c.id)).size).toBe(ROLL_COLORS.length)
    expect(ROLL_COLORS.every((c) => isRollColor(c.value))).toBe(true)
  })

  it('defaults to white and finds swatches', () => {
    expect(rollColorOf({})).toBe('#ffffff')
    expect(rollColorSwatch('#FFE04A')?.name).toBe('Yellow')
    expect(rollColorSwatch('#123456')).toBeUndefined()
  })

  it('accepts #rrggbb or clear only', () => {
    expect(isRollColor('#a1b2c3')).toBe(true)
    expect(isRollColor('clear')).toBe(true)
    for (const v of ['red', '#abc', '#ABCDEF', 1, null]) {
      expect(isRollColor(v)).toBe(false)
    }
  })

  it('is saved with the label and validated on load', () => {
    const doc = newDoc({ widthMm: 30, heightMm: 12 })
    const yellow = { ...doc, label: { ...doc.label, color: '#ffe04a' } }
    expect(fromJson(toJson(yellow)).label.color).toBe('#ffe04a')
    const bad = JSON.parse(toJson(yellow))
    bad.label.color = 'banana'
    expect(() => fromJson(JSON.stringify(bad))).toThrow(/not a labelcraft/)
  })
})
