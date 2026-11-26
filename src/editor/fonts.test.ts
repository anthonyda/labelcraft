import { describe, expect, it } from 'vitest'
import { createObject, newDoc } from '../model/factory'
import { DEFAULT_FONT, FONT_FAMILIES, FONT_GROUPS } from './fonts'

// R31.AC1, AC3–AC4
describe('fonts', () => {
  it('lists 24 bundled fonts in 7 groups, then the system fonts', () => {
    const bundled = FONT_GROUPS.slice(0, -1)
    expect(bundled.map((g) => g.name)).toEqual([
      'Sans',
      'Condensed',
      'Serif',
      'Rounded and fun',
      'Handwriting',
      'Monospace',
      'Pixel',
    ])
    expect(bundled.flatMap((g) => g.fonts)).toHaveLength(24)
    expect(FONT_GROUPS.at(-1)?.fonts).toContain('Arial')
    expect(new Set(FONT_FAMILIES).size).toBe(FONT_FAMILIES.length)
  })

  it('new text uses Inter', () => {
    const t = createObject('text', newDoc({ widthMm: 30, heightMm: 12 }).label)
    expect(t.type === 'text' && t.fontFamily).toBe(DEFAULT_FONT)
  })
})
