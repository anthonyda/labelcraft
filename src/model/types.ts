/**
 * Label document model (T1.1). Plain JSON-serialisable data; the single source
 * of truth for the editor, renderer and storage.
 *
 * Geometry is in millimetres so a label keeps its physical size when the
 * printer dpi changes. (x, y) is the top-left corner of the unrotated box;
 * rotation is in degrees clockwise around the box centre.
 */

export const DOC_VERSION = 1

export type LabelSetup = {
  widthMm: number
  heightMm: number
  /** Printer resolution in dots per inch. */
  dpi: number
  /**
   * Official size entry the label was set from (R12.AC5), or "custom".
   * Missing in labels saved before sizes existed.
   */
  size?: string
  /**
   * The design is turned 90° from the printer's layout (R22): switching
   * between landscape and portrait. Printing turns it back.
   */
  turned?: boolean
  /** Frame around the label (R23); missing = none. */
  frame?: LabelFrame
}

export type FrameDesign =
  | 'none'
  | 'line'
  | 'thick'
  | 'double'
  | 'thickThin'
  | 'rounded'
  | 'roundedDouble'
  | 'dashed'
  | 'dotted'
  | 'dashDot'
  | 'stitched'
  | 'corners'
  | 'cornersRound'
  | 'cornerDots'
  | 'brackets'
  | 'ticket'
  | 'chamfer'
  | 'pill'
  | 'tag'
  | 'banner'
  | 'wavy'
  | 'zigzag'
  | 'scalloped'
  | 'stamp'
  | 'beads'
  | 'diamonds'

export type LabelFrame = {
  design: FrameDesign
  /** Line thickness in mm. */
  thicknessMm: number
  /** Distance from the label edge in mm. */
  insetMm: number
}

type ObjectBase = {
  id: string
  /** Name given by the user in the layers panel (R21.AC10); else automatic. */
  name?: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

export type TextAlign = 'left' | 'center' | 'right'

export type TextObject = ObjectBase & {
  type: 'text'
  text: string
  fontFamily: string
  /** Font size in points (1/72 inch). */
  fontSize: number
  bold: boolean
  italic: boolean
  underline: boolean
  align: TextAlign
  /** Line height as a multiple of font size. */
  lineHeight: number
}

export type ImageMode = 'threshold' | 'dither'

export type ImageObject = ObjectBase & {
  type: 'image'
  /** Image data URL (PNG, JPEG or SVG). */
  src: string
  mode: ImageMode
  /** 0–255; luminance below this is black (threshold mode). */
  threshold: number
}

export type ShapeObject = ObjectBase & {
  type: 'rect' | 'ellipse'
  /** Outline width in mm (ignored when filled). */
  strokeWidth: number
  filled: boolean
}

/** Horizontal line across the middle of its box, before rotation. */
export type LineObject = ObjectBase & {
  type: 'line'
  /** Line thickness in mm. */
  strokeWidth: number
}

export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H'

export type QrObject = ObjectBase & {
  type: 'qr'
  content: string
  errorCorrection: QrErrorCorrection
}

export type BarcodeFormat = 'EAN13' | 'CODE128'

export type BarcodeObject = ObjectBase & {
  type: 'barcode'
  content: string
  format: BarcodeFormat
  showText: boolean
}

export type LabelObject =
  TextObject | ImageObject | ShapeObject | LineObject | QrObject | BarcodeObject

export type ObjectType = LabelObject['type']

export const OBJECT_TYPES: readonly ObjectType[] = [
  'text',
  'image',
  'rect',
  'ellipse',
  'line',
  'qr',
  'barcode',
]

export type LabelDoc = {
  version: typeof DOC_VERSION
  label: LabelSetup
  /** Drawing order: first is at the back, last is in front. */
  objects: LabelObject[]
}
