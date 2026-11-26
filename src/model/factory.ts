import { DEFAULT_DPI } from './units'
import {
  DOC_VERSION,
  type LabelDoc,
  type LabelObject,
  type LabelSetup,
  type ObjectType,
} from './types'

let counter = 0

export const newId = (): string =>
  `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`

export const newDoc = (label?: Partial<LabelSetup>): LabelDoc => ({
  version: DOC_VERSION,
  label: { widthMm: 50, heightMm: 30, dpi: DEFAULT_DPI, ...label },
  objects: [],
})

/** New object of the given type with sensible defaults, centred on the label. */
/** Space kept between a new object and the label edge (R4.AC10). */
export const NEW_OBJECT_MARGIN_MM = 1

/** One typographic point in mm. */
const PT_MM = 25.4 / 72

const round2 = (n: number) => Math.round(n * 100) / 100

export const createObject = (
  type: ObjectType,
  label: LabelSetup,
): LabelObject => {
  // R4.AC10: fit inside the label with a 1 mm margin, scaled down (keeping
  // proportions) when the label is smaller, never up.
  const availW = Math.max(1, label.widthMm - 2 * NEW_OBJECT_MARGIN_MM)
  const availH = Math.max(1, label.heightMm - 2 * NEW_OBJECT_MARGIN_MM)
  const box = (w: number, h: number) => {
    const k = Math.min(1, availW / w, availH / h)
    const width = round2(w * k)
    const height = round2(h * k)
    return {
      id: newId(),
      x: round2((label.widthMm - width) / 2),
      y: round2((label.heightMm - height) / 2),
      width,
      height,
      rotation: 0,
    }
  }
  // Text: as wide as fits (up to 40 mm), font shrunk to its box's height.
  const textBox = () => {
    const b = box(Math.min(40, availW), 8)
    const fontSize = Math.max(
      4,
      Math.min(14, Math.floor((b.height / 1.2 / PT_MM) * 2) / 2),
    )
    return { ...b, fontSize }
  }
  switch (type) {
    case 'text':
      return {
        ...textBox(),
        type,
        text: 'Text',
        fontFamily: 'Arial',
        bold: false,
        italic: false,
        underline: false,
        align: 'left',
        lineHeight: 1.2,
      }
    case 'image':
      // R6.AC2: threshold mode by default, at the middle of 1–255.
      return {
        ...box(15, 15),
        type,
        src: '',
        mode: 'threshold',
        threshold: 128,
      }
    case 'rect':
    case 'ellipse':
      return { ...box(15, 10), type, strokeWidth: 0.5, filled: false }
    case 'line':
      return { ...box(20, 1), type, strokeWidth: 0.5 }
    case 'qr':
      return {
        ...box(15, 15),
        type,
        content: 'labelcraft',
        errorCorrection: 'M',
      }
    case 'barcode':
      return {
        ...box(35, 12),
        type,
        content: '012345678901',
        format: 'CODE128',
        showText: true,
      }
  }
}
