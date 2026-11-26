/** Frame catalogue (spec R23.AC1): designs, names, categories, defaults. */
import type { FrameDesign, LabelFrame } from './types'

export type FrameCategory =
  'basic' | 'lines' | 'corners' | 'shapes' | 'decorative'

export const FRAME_CATEGORIES: { id: FrameCategory; name: string }[] = [
  { id: 'basic', name: 'Basic' },
  { id: 'lines', name: 'Lines' },
  { id: 'corners', name: 'Corners' },
  { id: 'shapes', name: 'Shapes' },
  { id: 'decorative', name: 'Decorative' },
]

export type FrameInfo = {
  design: FrameDesign
  name: string
  category: FrameCategory
  /** Default line thickness in mm (R23.AC2). */
  thicknessMm: number
}

export const FRAMES: FrameInfo[] = [
  { design: 'none', name: 'None', category: 'basic', thicknessMm: 0.3 },
  { design: 'line', name: 'Line', category: 'basic', thicknessMm: 0.3 },
  { design: 'thick', name: 'Thick line', category: 'basic', thicknessMm: 1 },
  {
    design: 'double',
    name: 'Double line',
    category: 'basic',
    thicknessMm: 0.3,
  },
  {
    design: 'thickThin',
    name: 'Thick and thin',
    category: 'basic',
    thicknessMm: 0.3,
  },
  { design: 'rounded', name: 'Rounded', category: 'basic', thicknessMm: 0.4 },
  {
    design: 'roundedDouble',
    name: 'Rounded double',
    category: 'basic',
    thicknessMm: 0.3,
  },
  { design: 'dashed', name: 'Dashed', category: 'lines', thicknessMm: 0.4 },
  { design: 'dotted', name: 'Dotted', category: 'lines', thicknessMm: 0.5 },
  { design: 'dashDot', name: 'Dash-dot', category: 'lines', thicknessMm: 0.4 },
  { design: 'stitched', name: 'Stitched', category: 'lines', thicknessMm: 0.3 },
  { design: 'corners', name: 'Corners', category: 'corners', thicknessMm: 0.6 },
  {
    design: 'cornersRound',
    name: 'Rounded corners',
    category: 'corners',
    thicknessMm: 0.5,
  },
  {
    design: 'cornerDots',
    name: 'Corner dots',
    category: 'corners',
    thicknessMm: 0.5,
  },
  {
    design: 'brackets',
    name: 'Brackets',
    category: 'corners',
    thicknessMm: 0.6,
  },
  { design: 'ticket', name: 'Ticket', category: 'shapes', thicknessMm: 0.4 },
  {
    design: 'chamfer',
    name: 'Cut corners',
    category: 'shapes',
    thicknessMm: 0.4,
  },
  { design: 'pill', name: 'Pill', category: 'shapes', thicknessMm: 0.4 },
  { design: 'tag', name: 'Tag', category: 'shapes', thicknessMm: 0.4 },
  { design: 'banner', name: 'Banner', category: 'shapes', thicknessMm: 0.4 },
  { design: 'wavy', name: 'Wavy', category: 'decorative', thicknessMm: 0.3 },
  {
    design: 'zigzag',
    name: 'Zigzag',
    category: 'decorative',
    thicknessMm: 0.3,
  },
  {
    design: 'scalloped',
    name: 'Scalloped',
    category: 'decorative',
    thicknessMm: 0.3,
  },
  { design: 'stamp', name: 'Stamp', category: 'decorative', thicknessMm: 0.3 },
  { design: 'beads', name: 'Beads', category: 'decorative', thicknessMm: 0.4 },
  {
    design: 'diamonds',
    name: 'Diamonds',
    category: 'decorative',
    thicknessMm: 0.4,
  },
]

export const FRAME_IDS: readonly FrameDesign[] = FRAMES.map((f) => f.design)

export const DEFAULT_INSET_MM = 0.5

export const frameInfo = (design: FrameDesign): FrameInfo =>
  FRAMES.find((f) => f.design === design) ?? FRAMES[0]

export const frameFor = (design: FrameDesign): LabelFrame => ({
  design,
  thicknessMm: frameInfo(design).thicknessMm,
  insetMm: DEFAULT_INSET_MM,
})
