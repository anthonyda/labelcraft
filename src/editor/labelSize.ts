/** Label size from official sizes and loaded rolls (R12, R18). */
import {
  FAMILIES,
  familyOfModel,
  headFor,
  labelSizesFor,
  rollToLabel,
  sizeForRoll,
  type ModelInfo,
} from '../model/labelSizes'
import type { LabelSetup } from '../model/types'
import type { LoadedRoll } from '../printer/printerService'

/** R18.AC4: label setup for a loaded roll, on the known model. */
export const labelForRoll = (
  roll: NonNullable<LoadedRoll['size']>,
  model?: ModelInfo,
): Pick<LabelSetup, 'widthMm' | 'heightMm' | 'size'> => {
  const groups = labelSizesFor(model?.model)
  const entry = sizeForRoll(roll.widthMm, roll.lengthMm, groups)
  const family = entry?.family ?? familyOfModel(model?.model) ?? 'D'
  const head = model ? headFor(family, model) : FAMILIES[family].head
  return {
    ...rollToLabel(roll.widthMm, roll.lengthMm, head),
    size: entry?.id ?? 'custom',
  }
}

const same = (a: number, b: number) => Math.abs(a - b) < 0.01

export const sameSize = (
  a: Pick<LabelSetup, 'widthMm' | 'heightMm'>,
  b: Pick<LabelSetup, 'widthMm' | 'heightMm'>,
) => same(a.widthMm, b.widthMm) && same(a.heightMm, b.heightMm)
