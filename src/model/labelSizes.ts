/**
 * Official NIIMBOT label sizes (T6b.1, spec R12 and Appendix A).
 *
 * Sizes are roll width × length in mm, as NIIMBOT names them. Sources (read
 * 2026-11-24): NIIMBOT's store catalogue (niimbots.com) and NIIMBOT-brand
 * listings on Amazon.fr. Update this file to add sizes.
 */
import type { LabelSetup } from './types'

export type SizeFamily = 'D' | 'D101' | 'N1' | 'B' | 'B4' | 'K' | 'M'

export type SizeKind = 'round' | 'clear' | 'cable' | 'two across' | 'wristband'

export type LabelSize = {
  /** Stable id saved with labels, e.g. "D-12x40" or "B-50x50-round". */
  id: string
  family: SizeFamily
  /** Width of the roll, along the print head. */
  rollWidthMm: number
  /** Length of one label, along the paper feed. */
  lengthMm: number
  kind?: SizeKind
  /** Only these models take it (e.g. 300 dpi Pro rolls). */
  models?: string[]
}

export type PrintDirection = 'left' | 'top'

/** How a printer lays out a label: what the size → label conversion needs. */
export type HeadContext = {
  printDirection: PrintDirection
  /** Print head width in dots. */
  headDots: number
  dpi: number
}

type FamilyInfo = {
  name: string
  /** niimbluelib model names; `prefixes` also match their variants. */
  models: string[]
  prefixes?: string[]
  /** Sizes of another family this one also takes. */
  includes?: SizeFamily
  /** Used when no model is known: the smallest head in the family. */
  head: HeadContext
}

export const FAMILIES: Record<SizeFamily, FamilyInfo> = {
  D: {
    name: 'D series',
    models: ['D11', 'D11S', 'D11_H', 'D11_PRO', 'D110', 'D110_M', 'H1', 'H1S'],
    head: { printDirection: 'left', headDots: 96, dpi: 203 },
  },
  D101: {
    name: 'D101',
    models: ['D101'],
    includes: 'D',
    head: { printDirection: 'left', headDots: 192, dpi: 203 },
  },
  N1: {
    name: 'N1 / B18',
    models: ['N1', 'B18', 'B18S', 'B16'],
    head: { printDirection: 'left', headDots: 96, dpi: 203 },
  },
  B: {
    name: 'B series',
    models: [
      'B1',
      'B1_PRO',
      'B1_SE',
      'B2',
      'B2_PRO',
      'B31',
      'B203',
      'B50',
      'B50W',
    ],
    prefixes: ['B21', 'B3S'],
    head: { printDirection: 'top', headDots: 384, dpi: 203 },
  },
  B4: {
    name: 'B4',
    models: ['B4', 'B4_PRO'],
    includes: 'B',
    head: { printDirection: 'top', headDots: 832, dpi: 203 },
  },
  K: {
    name: 'K series',
    models: ['K2', 'K3', 'K3_ITD', 'K3_W', 'K4'],
    head: { printDirection: 'top', headDots: 448, dpi: 203 },
  },
  M: {
    name: 'M series',
    models: ['M2_H', 'M3'],
    head: { printDirection: 'top', headDots: 567, dpi: 300 },
  },
}

export const FAMILY_ORDER: SizeFamily[] = [
  'D',
  'D101',
  'N1',
  'B',
  'B4',
  'K',
  'M',
]

const PRO_300 = ['B1_PRO', 'B2_PRO', 'B21_PRO']

/** [roll width, length, kind?, models?] per family (Appendix A). */
type Row = [number, number, SizeKind?, string[]?]
const ROWS: Record<SizeFamily, Row[]> = {
  D: [
    [10, 20],
    [12, 22],
    [12, 30],
    [12, 40],
    [12, 75],
    [13, 35],
    [14, 25, 'clear'],
    [14, 28],
    [14, 28, 'round'],
    [14, 30],
    [14, 40],
    [14, 50],
    [15, 30],
    [15, 50],
    [12.5, 109, 'cable'],
  ],
  D101: [[25, 50]],
  N1: [
    [14, 28, 'round'],
    [14, 30],
    [14, 40],
    [14, 50],
    [12.5, 109, 'cable'],
  ],
  B: [
    [26, 26, 'round'],
    [28, 89],
    [31, 31, 'round'],
    [34, 34, 'round'],
    [40, 15, 'two across'],
    [40, 20],
    [40, 30],
    [40, 60, 'clear'],
    [40, 70],
    [40, 80],
    [41, 41, 'round'],
    [50, 15, 'two across'],
    [50, 25],
    [50, 30],
    [50, 50],
    [50, 50, 'round'],
    [50, 70],
    [50, 80],
    [50, 90],
    [50, 170],
    [51, 51, 'round', PRO_300],
    [54, 67, undefined, PRO_300],
    [54, 80, undefined, PRO_300],
    [54, 84, undefined, PRO_300],
  ],
  B4: [
    [100, 100],
    [100, 150],
  ],
  K: [
    [40, 20],
    [40, 30],
    [50, 30],
    [60, 40],
    [60, 80],
    [25, 254, 'wristband'],
  ],
  M: [
    [20, 20, 'round'],
    [24, 13],
    [24, 20, 'cable'],
    [25, 9.5],
    [28, 14, 'round'],
    [28, 15],
    [30, 20],
    [30, 70],
    [31, 14, 'round'],
    [31, 31, 'round'],
    [34, 17],
    [34, 25, 'cable'],
    [35.25, 50],
    [36.5, 9.5],
    [40, 20],
    [40, 40],
    [40, 60],
    [42, 30, 'cable'],
    [50, 30],
    [50, 70],
    [50, 80],
    [50, 90],
  ],
}

export const LABEL_SIZES: LabelSize[] = FAMILY_ORDER.flatMap((family) =>
  ROWS[family].map(([rollWidthMm, lengthMm, kind, models]) => ({
    id: `${family}-${rollWidthMm}x${lengthMm}${kind ? `-${kind.replace(' ', '-')}` : ''}`,
    family,
    rollWidthMm,
    lengthMm,
    ...(kind && { kind }),
    ...(models && { models }),
  })),
)

const byId = new Map(LABEL_SIZES.map((s) => [s.id, s]))
export const findSize = (id: string | undefined): LabelSize | undefined =>
  id === undefined ? undefined : byId.get(id)

/** The size family a niimbluelib model belongs to, if any. */
export const familyOfModel = (model?: string): SizeFamily | undefined => {
  if (!model) return undefined
  return FAMILY_ORDER.find(
    (f) =>
      FAMILIES[f].models.includes(model) ||
      FAMILIES[f].prefixes?.some((p) => model.startsWith(p)),
  )
}

/** A known printer model (detected or chosen, R17). */
export type ModelInfo = {
  model: string
  printDirection: PrintDirection
  printheadPixels: number
  dpi: number
}

export type SizeGroup = {
  family: SizeFamily
  label: string
  sizes: LabelSize[]
}

const sizesOf = (family: SizeFamily): LabelSize[] =>
  LABEL_SIZES.filter((s) => s.family === family)

/**
 * R12.AC1, AC3: the sizes to list, grouped by family. With a known model only
 * its family is listed (with included families' sizes); otherwise every
 * family, each with its own sizes.
 */
export const labelSizesFor = (model?: string): SizeGroup[] => {
  const family = familyOfModel(model)
  if (family) {
    const info = FAMILIES[family]
    const sizes = [
      ...(info.includes ? sizesOf(info.includes) : []),
      ...sizesOf(family),
    ].filter((s) => !s.models || s.models.includes(model!))
    return [{ family, label: info.name, sizes }]
  }
  return FAMILY_ORDER.map((f) => {
    const info = FAMILIES[f]
    return {
      family: f,
      label: info.includes
        ? `${info.name} (also ${FAMILIES[info.includes].name} sizes)`
        : info.name,
      sizes: sizesOf(f),
    }
  })
}

/** The head to lay sizes out for: the known model's, else the family's. */
export const headFor = (family: SizeFamily, model?: ModelInfo): HeadContext => {
  const own = familyOfModel(model?.model)
  // A D101 lays out the D sizes it takes with its own head, and so on.
  if (model && own && (own === family || FAMILIES[own].includes === family)) {
    return {
      printDirection: model.printDirection,
      headDots: model.printheadPixels,
      dpi: model.dpi,
    }
  }
  return FAMILIES[family].head
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Print head width in mm. */
export const headMm = (head: HeadContext): number =>
  round2((head.headDots / head.dpi) * 25.4)

/**
 * R12.AC4, AC8: label size for a roll. The roll width runs along the print
 * head ("left" printers: label height; "top" printers: label width) and is
 * capped at the head width.
 */
export const rollToLabel = (
  rollWidthMm: number,
  lengthMm: number,
  head: HeadContext,
): { widthMm: number; heightMm: number } => {
  const across = Math.min(rollWidthMm, headMm(head))
  return head.printDirection === 'left'
    ? { widthMm: lengthMm, heightMm: across }
    : { widthMm: across, heightMm: lengthMm }
}

export const sizeToLabel = (size: LabelSize, head: HeadContext) =>
  rollToLabel(size.rollWidthMm, size.lengthMm, head)

/** R22: a turned label shows the printer layout's width and height swapped. */
export const oriented = (
  dims: { widthMm: number; heightMm: number },
  turned?: boolean,
): { widthMm: number; heightMm: number } =>
  turned ? { widthMm: dims.heightMm, heightMm: dims.widthMm } : dims

const fmt = (n: number) => String(round2(n))

/** Dropdown text, e.g. "15 × 50 mm, prints 12 mm" or "14 × 28 mm round". */
export const sizeName = (size: LabelSize, head: HeadContext): string => {
  const capped = size.rollWidthMm > headMm(head)
  return (
    `${fmt(size.rollWidthMm)} × ${fmt(size.lengthMm)} mm` +
    (size.kind ? ` ${size.kind}` : '') +
    (capped ? `, prints ${headMm(head).toFixed(1)} mm` : '')
  )
}

const same = (a: number, b: number) => Math.abs(a - b) < 0.01

/**
 * R12.AC5, AC7: the dropdown entry for a label: its saved entry when listed and
 * still the same size, else (older labels) a listed entry of the same size,
 * else "custom".
 */
export const selectedSizeId = (
  label: LabelSetup,
  groups: SizeGroup[],
  model?: ModelInfo,
): string => {
  if (label.size === 'custom') return 'custom'
  const fits = (s: LabelSize) => {
    const l = oriented(sizeToLabel(s, headFor(s.family, model)), label.turned)
    return same(l.widthMm, label.widthMm) && same(l.heightMm, label.heightMm)
  }
  const listed = groups.flatMap((g) => g.sizes)
  const saved = listed.find((s) => s.id === label.size)
  if (saved) return fits(saved) ? saved.id : 'custom'
  if (label.size !== undefined) return 'custom'
  return listed.find(fits)?.id ?? 'custom'
}

/** R18.AC4: the listed entry matching a loaded roll, if any. */
export const sizeForRoll = (
  rollWidthMm: number,
  lengthMm: number,
  groups: SizeGroup[],
): LabelSize | undefined => {
  const near = groups
    .flatMap((g) => g.sizes)
    .filter(
      (s) =>
        Math.abs(s.rollWidthMm - rollWidthMm) < 0.3 &&
        Math.abs(s.lengthMm - lengthMm) < 0.3,
    )
  // The printer can't tell round or clear labels apart: prefer the plain one.
  return near.find((s) => !s.kind) ?? near[0]
}
