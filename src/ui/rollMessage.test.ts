import { LabelType } from '@mmote/niimbluelib'
import { describe, expect, it } from 'vitest'
import { rollMessage } from './rollMessage'

// R18.AC2, AC6, AC8
describe('roll message', () => {
  it('shows the size, type and labels left', () => {
    expect(
      rollMessage(
        {
          size: { widthMm: 12, lengthMm: 40 },
          labelType: LabelType.WithGaps,
          labelsLeft: 145,
        },
        undefined,
      ).text,
    ).toBe('Loaded roll: 12 × 40 mm, labels with gaps · 145 labels left')
  })

  it('shows what the tag gave when the size is missing', () => {
    expect(
      rollMessage(
        { labelType: LabelType.WithGaps, labelsLeft: 145 },
        { lidOpen: false, tagRead: true },
      ),
    ).toEqual({
      text: "Roll tag read: labels with gaps · 145 labels left. The printer didn't report the label size.",
      hint: undefined,
    })
  })

  it('says nothing was reported, with the reason when known', () => {
    expect(rollMessage({}, undefined)).toEqual({
      text: "This printer didn't report the loaded roll.",
      hint: undefined,
    })
    expect(rollMessage({}, { lidOpen: true, tagRead: false }).hint).toBe(
      "Close the printer's lid, then press Read roll.",
    )
    expect(rollMessage({}, { lidOpen: false, tagRead: false }).hint).toMatch(
      /couldn't read the roll's tag/,
    )
  })
})
