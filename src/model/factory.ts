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
export const createObject = (
  type: ObjectType,
  label: LabelSetup,
): LabelObject => {
  const box = (width: number, height: number) => ({
    id: newId(),
    x: (label.widthMm - width) / 2,
    y: (label.heightMm - height) / 2,
    width,
    height,
    rotation: 0,
  })
  switch (type) {
    case 'text':
      return {
        ...box(Math.min(40, label.widthMm), 8),
        type,
        text: 'Text',
        fontFamily: 'Arial',
        fontSize: 14,
        bold: false,
        italic: false,
        underline: false,
        align: 'left',
        lineHeight: 1.2,
      }
    case 'image':
      return { ...box(15, 15), type, src: '', mode: 'dither', threshold: 128 }
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
