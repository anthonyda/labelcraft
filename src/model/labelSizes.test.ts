import { modelsLibrary } from '@mmote/niimbluelib'
import { describe, expect, it } from 'vitest'
import {
  FAMILIES,
  FAMILY_ORDER,
  LABEL_SIZES,
  familyOfModel,
  headFor,
  labelSizesFor,
  rollToLabel,
  selectedSizeId,
  sizeForRoll,
  sizeName,
  sizeToLabel,
  type ModelInfo,
} from './labelSizes'

const meta = (name: string): ModelInfo => {
  const m = modelsLibrary.find((x) => x.model === name)!
  return {
    model: m.model,
    printDirection: m.printDirection,
    printheadPixels: m.printheadPixels,
    dpi: m.dpi,
  }
}
const D110_M = meta('D110_M')
const B21 = meta('B21')
const ids = (groups: ReturnType<typeof labelSizesFor>) =>
  groups.flatMap((g) => g.sizes.map((s) => s.id))

// T6b.1 / R12, Appendix A
describe('label sizes', () => {
  it('has unique ids', () => {
    expect(new Set(LABEL_SIZES.map((s) => s.id)).size).toBe(LABEL_SIZES.length)
  })

  it('maps every family model to a niimbluelib model', () => {
    const names = modelsLibrary.map((m) => m.model as string)
    for (const f of FAMILY_ORDER) {
      for (const m of FAMILIES[f].models) expect(names).toContain(m)
    }
    expect(familyOfModel('B21_PRO')).toBe('B')
    expect(familyOfModel('B3S_P')).toBe('B')
    expect(familyOfModel('D110_M')).toBe('D')
    expect(familyOfModel('A8')).toBeUndefined()
  })

  it('family heads match the smallest head in each family (R12.AC8)', () => {
    for (const f of FAMILY_ORDER) {
      const heads = modelsLibrary
        .filter((m) => familyOfModel(m.model) === f)
        .map((m) => (m.printheadPixels / m.dpi) * 25.4)
      const head = FAMILIES[f].head
      expect((head.headDots / head.dpi) * 25.4).toBeCloseTo(
        Math.min(...heads),
        1,
      )
    }
  })

  // R12.AC3
  it('lists only the D sizes for a D110_M', () => {
    const groups = labelSizesFor('D110_M')
    expect(groups).toHaveLength(1)
    expect(ids(groups)).toContain('D-12x40')
    expect(ids(groups).every((id) => id.startsWith('D-'))).toBe(true)
  })

  it('lists D sizes and its own for a D101', () => {
    const list = ids(labelSizesFor('D101'))
    expect(list).toContain('D-12x40')
    expect(list).toContain('D101-25x50')
  })

  it('lists B sizes for a B21, without the 300 dpi Pro rolls', () => {
    const list = ids(labelSizesFor('B21'))
    expect(list).toContain('B-50x30')
    expect(list).not.toContain('B-54x80')
    expect(ids(labelSizesFor('B21_PRO'))).toContain('B-54x80')
  })

  it('lists every family for an unknown or missing model', () => {
    for (const model of [undefined, 'A8']) {
      const groups = labelSizesFor(model)
      expect(groups.map((g) => g.family)).toEqual(FAMILY_ORDER)
      expect(ids(groups)).toHaveLength(LABEL_SIZES.length)
    }
  })

  // R12.AC4, AC8
  it('lays sizes out along the print head and caps them at its width', () => {
    const d = (id: string) => LABEL_SIZES.find((s) => s.id === id)!
    expect(sizeToLabel(d('D-12x40'), headFor('D', D110_M))).toEqual({
      widthMm: 40,
      heightMm: 12,
    })
    expect(sizeToLabel(d('D-15x50'), headFor('D', D110_M))).toEqual({
      widthMm: 50,
      heightMm: 12.01,
    })
    expect(sizeToLabel(d('B-50x30'), headFor('B', B21))).toEqual({
      widthMm: 48.05,
      heightMm: 30,
    })
    expect(sizeName(d('D-15x50'), headFor('D', D110_M))).toBe(
      '15 × 50 mm, prints 12.0 mm',
    )
    expect(sizeName(d('D-14x28-round'), headFor('D', D110_M))).toBe(
      '14 × 28 mm round, prints 12.0 mm',
    )
    // A D101 (192 dots) prints a 15 mm roll in full.
    expect(sizeToLabel(d('D-15x50'), headFor('D', meta('D101')))).toEqual({
      widthMm: 50,
      heightMm: 15,
    })
  })

  it('capped sizes are exactly the head in printer dots', () => {
    const { heightMm } = rollToLabel(15, 50, headFor('D', D110_M))
    expect(Math.round((heightMm * 203) / 25.4)).toBe(96)
  })

  // R12.AC5, AC7
  it('every listed entry is found again from its label size', () => {
    for (const model of [D110_M, B21, meta('M3'), meta('K3')]) {
      const groups = labelSizesFor(model.model)
      for (const s of groups.flatMap((g) => g.sizes)) {
        const label = { ...sizeToLabel(s, headFor(s.family, model)), dpi: 203 }
        const found = selectedSizeId({ ...label, size: s.id }, groups, model)
        expect(found).toBe(s.id)
      }
    }
  })

  it('shows Custom for unlisted or changed sizes', () => {
    const groups = labelSizesFor('D110_M')
    const label = { widthMm: 40, heightMm: 12, dpi: 203 }
    expect(selectedSizeId(label, groups, D110_M)).toBe('D-12x40')
    expect(selectedSizeId({ ...label, size: 'custom' }, groups, D110_M)).toBe(
      'custom',
    )
    expect(selectedSizeId({ ...label, widthMm: 41 }, groups, D110_M)).toBe(
      'custom',
    )
    // A B size is not listed for a D110_M.
    const b = { widthMm: 48.05, heightMm: 30, dpi: 203, size: 'B-50x30' }
    expect(selectedSizeId(b, groups, D110_M)).toBe('custom')
  })

  // R18.AC4
  it('finds the entry for a loaded roll, preferring plain labels', () => {
    expect(sizeForRoll(14, 28, labelSizesFor('D110_M'))?.id).toBe('D-14x28')
    expect(sizeForRoll(12, 40, labelSizesFor('D110_M'))?.id).toBe('D-12x40')
    expect(sizeForRoll(17, 40, labelSizesFor('D110_M'))).toBeUndefined()
  })
})
