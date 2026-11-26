/** Printer dialog text about the loaded roll (R18.AC2, AC6, AC8). */
import { LabelType } from '@mmote/niimbluelib'
import type { LoadedRoll, RollSensor } from '../printer/printerService'

const LABEL_TYPE_NAMES: Partial<Record<LabelType, string>> = {
  [LabelType.WithGaps]: 'labels with gaps',
  [LabelType.Black]: 'black mark',
  [LabelType.Continuous]: 'continuous',
  [LabelType.Transparent]: 'transparent labels',
}

export const rollMessage = (
  roll: LoadedRoll | undefined,
  sensor: RollSensor | undefined,
): { text: string; hint?: string } => {
  const type = roll?.labelType && LABEL_TYPE_NAMES[roll.labelType]
  const left =
    roll?.labelsLeft !== undefined
      ? `${roll.labelsLeft} labels left`
      : undefined
  if (roll?.size) {
    return {
      text:
        `Loaded roll: ${roll.size.widthMm} × ${roll.size.lengthMm} mm` +
        (roll.sizeSource === 'remembered' ? ' (remembered)' : '') +
        (type ? `, ${type}` : '') +
        (left ? ` · ${left}` : ''),
    }
  }
  const hint = sensor?.lidOpen
    ? "Close the printer's lid, then press Read roll."
    : sensor?.tagRead === false
      ? "The printer couldn't read the roll's tag. Check that it's a NIIMBOT roll and that it sits properly."
      : undefined
  const tag = [type, left].filter(Boolean).join(' · ')
  if (tag) {
    return {
      text: `Roll tag read: ${tag}. The printer didn't report the label size.`,
      hint,
    }
  }
  return { text: "This printer didn't report the loaded roll.", hint }
}
