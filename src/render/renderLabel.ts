/**
 * Renderer (T1.5): document model → 1-bit canvas at printer resolution.
 * Used for print preview, PNG export and printing, so what is previewed is
 * exactly what prints (C7).
 */
import Konva from 'konva'
import type {
  ImageObject,
  LabelDoc,
  LabelObject,
  TextObject,
} from '../model/types'
import { labelSizePx, mmToPx, ptToPx } from '../model/units'
import { DEFAULT_THRESHOLD, ditherPixels, thresholdPixels } from './bitmap'
import { drawBarcode, drawQr } from './codes'

export type RenderWarning = { objectId: string; message: string }

export type RenderResult = {
  canvas: HTMLCanvasElement
  warnings: RenderWarning[]
}

/** Font size used for barcode human-readable text. */
const BARCODE_TEXT_PT = 8

export const textFontStyle = (o: TextObject): string =>
  [o.bold && 'bold', o.italic && 'italic'].filter(Boolean).join(' ') || 'normal'

const loadImage = async (src: string): Promise<HTMLImageElement> => {
  const img = new Image()
  img.src = src
  await img.decode()
  return img
}

/** Image scaled to the box and converted to 1-bit with its own mode (R6.AC2). */
const prepareImage = async (
  o: ImageObject,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> => {
  const img = await loadImage(o.src)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, width)
  canvas.height = Math.max(1, height)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height)
  if (o.mode === 'dither') ditherPixels(px)
  else thresholdPixels(px, o.threshold)
  ctx.putImageData(px, 0, 0)
  return canvas
}

/** Konva nodes for one object, drawn in a 0..w × 0..h box. */
const objectNodes = async (
  o: LabelObject,
  w: number,
  h: number,
  dpi: number,
  warn: (message: string) => void,
): Promise<Konva.Shape[]> => {
  const px = (mm: number) => Math.round(mmToPx(mm, dpi))
  switch (o.type) {
    case 'text':
      return [
        new Konva.Text({
          width: w,
          text: o.text,
          fontFamily: o.fontFamily,
          fontSize: ptToPx(o.fontSize, dpi),
          fontStyle: textFontStyle(o),
          textDecoration: o.underline ? 'underline' : '',
          align: o.align,
          lineHeight: o.lineHeight,
          wrap: 'word',
          fill: '#000',
        }),
      ]
    case 'rect':
    case 'ellipse': {
      const sw = o.filled ? 0 : Math.max(1, px(o.strokeWidth))
      const style = o.filled
        ? { fill: '#000' }
        : { stroke: '#000', strokeWidth: sw }
      return [
        o.type === 'rect'
          ? new Konva.Rect({
              x: sw / 2,
              y: sw / 2,
              width: w - sw,
              height: h - sw,
              ...style,
            })
          : new Konva.Ellipse({
              x: w / 2,
              y: h / 2,
              radiusX: Math.max(0, (w - sw) / 2),
              radiusY: Math.max(0, (h - sw) / 2),
              ...style,
            }),
      ]
    }
    case 'line': {
      const sw = Math.max(1, px(o.strokeWidth))
      return [
        new Konva.Rect({
          x: 0,
          y: Math.round((h - sw) / 2),
          width: w,
          height: sw,
          fill: '#000',
        }),
      ]
    }
    case 'image': {
      if (!o.src) {
        warn('Image has no picture.')
        return []
      }
      try {
        const image = await prepareImage(o, w, h)
        return [new Konva.Image({ image, width: w, height: h })]
      } catch {
        warn('Image could not be loaded.')
        return []
      }
    }
    case 'qr': {
      const { canvas, warning } = drawQr(o.content, o.errorCorrection, w, h)
      if (warning) warn(warning)
      return [new Konva.Image({ image: canvas, width: w, height: h })]
    }
    case 'barcode': {
      const { canvas, warning } = drawBarcode(
        o.content,
        o.format,
        o.showText,
        w,
        h,
        Math.round(ptToPx(BARCODE_TEXT_PT, dpi)),
      )
      if (warning) warn(warning)
      return [new Konva.Image({ image: canvas, width: w, height: h })]
    }
  }
}

/** Load web fonts used by text objects before drawing. */
const loadFonts = async (doc: LabelDoc): Promise<void> => {
  const texts = doc.objects.filter((o): o is TextObject => o.type === 'text')
  await Promise.all(
    texts.map((t) =>
      document.fonts
        .load(`${textFontStyle(t)} 16px "${t.fontFamily}"`)
        .catch(() => []),
    ),
  )
}

export const renderLabel = async (
  doc: LabelDoc,
  options: { threshold?: number } = {},
): Promise<RenderResult> => {
  const { width, height } = labelSizePx(doc.label)
  const dpi = doc.label.dpi
  const warnings: RenderWarning[] = []
  await loadFonts(doc)

  const stage = new Konva.Stage({
    container: document.createElement('div'),
    width,
    height,
  })
  try {
    const layer = new Konva.Layer({ imageSmoothingEnabled: false })
    stage.add(layer)
    layer.add(new Konva.Rect({ width, height, fill: '#fff' }))

    for (const o of doc.objects) {
      const x = Math.round(mmToPx(o.x, dpi))
      const y = Math.round(mmToPx(o.y, dpi))
      const w = Math.max(1, Math.round(mmToPx(o.width, dpi)))
      const h = Math.max(1, Math.round(mmToPx(o.height, dpi)))
      // Rotate around the box centre (see model/types.ts).
      const group = new Konva.Group({
        x: x + w / 2,
        y: y + h / 2,
        offsetX: w / 2,
        offsetY: h / 2,
        rotation: o.rotation,
      })
      const nodes = await objectNodes(o, w, h, dpi, (message) =>
        warnings.push({ objectId: o.id, message }),
      )
      nodes.forEach((n) => group.add(n))
      layer.add(group)
    }

    const canvas = layer.toCanvas({ pixelRatio: 1, x: 0, y: 0, width, height })
    const ctx = canvas.getContext('2d')!
    const pixels = ctx.getImageData(0, 0, width, height)
    thresholdPixels(pixels, options.threshold ?? DEFAULT_THRESHOLD)
    ctx.putImageData(pixels, 0, 0)
    return { canvas, warnings }
  } finally {
    stage.destroy()
  }
}
