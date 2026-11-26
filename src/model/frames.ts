/** Frame catalogue (spec R23.AC1): designs, names, categories, defaults. */
import type { FrameDesign, LabelFrame } from './types'

export type FrameCategory =
  'basic' | 'lines' | 'corners' | 'shapes' | 'decorative' | 'fancy'

export const FRAME_CATEGORIES: { id: FrameCategory; name: string }[] = [
  { id: 'basic', name: 'Basic' },
  { id: 'lines', name: 'Lines' },
  { id: 'corners', name: 'Corners' },
  { id: 'shapes', name: 'Shapes' },
  { id: 'decorative', name: 'Decorative' },
  { id: 'fancy', name: 'Fancy' },
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
    design: 'triple',
    name: 'Triple line',
    category: 'basic',
    thicknessMm: 0.3,
  },
  {
    design: 'thickThin',
    name: 'Thick and thin',
    category: 'basic',
    thicknessMm: 0.3,
  },
  { design: 'shadow', name: 'Shadow', category: 'basic', thicknessMm: 0.3 },
  { design: 'rounded', name: 'Rounded', category: 'basic', thicknessMm: 0.4 },
  {
    design: 'roundedDouble',
    name: 'Rounded double',
    category: 'basic',
    thicknessMm: 0.3,
  },
  { design: 'dashed', name: 'Dashed', category: 'lines', thicknessMm: 0.4 },
  {
    design: 'longDash',
    name: 'Long dashes',
    category: 'lines',
    thicknessMm: 0.4,
  },
  {
    design: 'doubleDashed',
    name: 'Double dashed',
    category: 'lines',
    thicknessMm: 0.3,
  },
  { design: 'dotted', name: 'Dotted', category: 'lines', thicknessMm: 0.5 },
  {
    design: 'roundDots',
    name: 'Round dots',
    category: 'lines',
    thicknessMm: 0.5,
  },
  { design: 'dashDot', name: 'Dash-dot', category: 'lines', thicknessMm: 0.4 },
  { design: 'stitched', name: 'Stitched', category: 'lines', thicknessMm: 0.3 },
  { design: 'corners', name: 'Corners', category: 'corners', thicknessMm: 0.6 },
  {
    design: 'cornersDouble',
    name: 'Double corners',
    category: 'corners',
    thicknessMm: 0.4,
  },
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
    design: 'cornerTriangles',
    name: 'Corner triangles',
    category: 'corners',
    thicknessMm: 0.5,
  },
  {
    design: 'cornerSquares',
    name: 'Corner squares',
    category: 'corners',
    thicknessMm: 0.4,
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
  { design: 'oval', name: 'Oval', category: 'shapes', thicknessMm: 0.4 },
  { design: 'hexagon', name: 'Hexagon', category: 'shapes', thicknessMm: 0.4 },
  { design: 'arrow', name: 'Arrow', category: 'shapes', thicknessMm: 0.4 },
  { design: 'tag', name: 'Tag', category: 'shapes', thicknessMm: 0.4 },
  { design: 'banner', name: 'Banner', category: 'shapes', thicknessMm: 0.4 },
  {
    design: 'bubble',
    name: 'Speech bubble',
    category: 'shapes',
    thicknessMm: 0.4,
  },
  {
    design: 'starburst',
    name: 'Starburst',
    category: 'shapes',
    thicknessMm: 0.3,
  },
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
  { design: 'stars', name: 'Stars', category: 'decorative', thicknessMm: 0.4 },
  {
    design: 'hearts',
    name: 'Hearts',
    category: 'decorative',
    thicknessMm: 0.4,
  },
  {
    design: 'crosses',
    name: 'Crosses',
    category: 'decorative',
    thicknessMm: 0.4,
  },
  {
    design: 'checker',
    name: 'Checker',
    category: 'decorative',
    thicknessMm: 0.4,
  },
  {
    design: 'sawtooth',
    name: 'Sawtooth',
    category: 'decorative',
    thicknessMm: 0.4,
  },
  { design: 'catEars', name: 'Cat ears', category: 'fancy', thicknessMm: 0.3 },
  {
    design: 'pawPrints',
    name: 'Paw prints',
    category: 'fancy',
    thicknessMm: 0.3,
  },
  {
    design: 'sleepyCat',
    name: 'Sleepy cat',
    category: 'fancy',
    thicknessMm: 0.3,
  },
  {
    design: 'dogBones',
    name: 'Dog bones',
    category: 'fancy',
    thicknessMm: 0.3,
  },
  { design: 'fish', name: 'Fish', category: 'fancy', thicknessMm: 0.3 },
  {
    design: 'butterflies',
    name: 'Butterflies',
    category: 'fancy',
    thicknessMm: 0.3,
  },
  { design: 'daisies', name: 'Daisies', category: 'fancy', thicknessMm: 0.3 },
  {
    design: 'leafyVine',
    name: 'Leafy vine',
    category: 'fancy',
    thicknessMm: 0.3,
  },
  { design: 'tulips', name: 'Tulip row', category: 'fancy', thicknessMm: 0.3 },
  {
    design: 'mushrooms',
    name: 'Mushrooms',
    category: 'fancy',
    thicknessMm: 0.3,
  },
  { design: 'fruit', name: 'Fruit', category: 'fancy', thicknessMm: 0.3 },
  { design: 'cloud', name: 'Cloud', category: 'fancy', thicknessMm: 0.4 },
  { design: 'lace', name: 'Lace', category: 'fancy', thicknessMm: 0.3 },
  { design: 'crown', name: 'Crown', category: 'fancy', thicknessMm: 0.3 },
  { design: 'bow', name: 'Bow', category: 'fancy', thicknessMm: 0.3 },
  {
    design: 'moonStars',
    name: 'Moon and stars',
    category: 'fancy',
    thicknessMm: 0.3,
  },
  { design: 'sunshine', name: 'Sunshine', category: 'fancy', thicknessMm: 0.3 },
  {
    design: 'snowflakes',
    name: 'Snowflakes',
    category: 'fancy',
    thicknessMm: 0.3,
  },
  { design: 'sparkles', name: 'Sparkles', category: 'fancy', thicknessMm: 0.3 },
  {
    design: 'heartArrow',
    name: 'Heart and arrow',
    category: 'fancy',
    thicknessMm: 0.3,
  },
  {
    design: 'musicNotes',
    name: 'Music notes',
    category: 'fancy',
    thicknessMm: 0.3,
  },
  { design: 'balloons', name: 'Balloons', category: 'fancy', thicknessMm: 0.3 },
  { design: 'bubbles', name: 'Bubbles', category: 'fancy', thicknessMm: 0.3 },
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
