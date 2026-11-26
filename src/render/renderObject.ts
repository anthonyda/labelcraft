/**
 * One object → its own 1-bit "ink" bitmap at printer resolution: opaque black
 * where it prints, transparent elsewhere, in the object's unrotated box.
 *
 * Both the editor (on screen) and the label renderer (print) draw these same
 * bitmaps, so the editor shows exactly what will print (C7).
 */
import Konva from 'konva'
import { textFontPt } from './textFit'
import type { ImageObject, LabelObject, TextObject } from '../model/types'
import { mmToPx, ptToPx } from '../model/units'
import {
  DEFAULT_THRESHOLD,
  ditherPixels,
  inkPixels,
  thresholdPixels,
} from './bitmap'
import { drawBarcode, drawQr } from './codes'

/** Font size used for barcode human-readable text. */
const BARCODE_TEXT_PT = 8

export type ObjectBitmap = {
  /** width × height px, black ink on transparent. */
  canvas: HTMLCanvasElement
  warnings: string[]
}

/** Object box in whole printer pixels. (x, y) is the unrotated top-left. */
export const objectPixelBox = (o: LabelObject, dpi: number) => ({
  x: Math.round(mmToPx(o.x, dpi)),
  y: Math.round(mmToPx(o.y, dpi)),
  width: Math.max(1, Math.round(mmToPx(o.width, dpi))),
  height: Math.max(1, Math.round(mmToPx(o.height, dpi))),
})

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
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  const px = ctx.getImageData(0, 0, width, height)
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
      await document.fonts
        .load(`${textFontStyle(o)} 16px "${o.fontFamily}"`)
        .catch(() => [])
      return [
        new Konva.Text({
          width: w,
          text: o.text,
          fontFamily: o.fontFamily,
          fontSize: ptToPx(textFontPt(o, w, h, dpi), dpi),
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

export const renderObject = async (
  o: LabelObject,
  dpi: number,
  threshold = DEFAULT_THRESHOLD,
): Promise<ObjectBitmap> => {
  const { width, height } = objectPixelBox(o, dpi)
  const warnings: string[] = []
  const stage = new Konva.Stage({
    container: document.createElement('div'),
    width,
    height,
  })
  try {
    const layer = new Konva.Layer({ imageSmoothingEnabled: false })
    stage.add(layer)
    const nodes = await objectNodes(o, width, height, dpi, (m) =>
      warnings.push(m),
    )
    nodes.forEach((n) => layer.add(n))
    const canvas = layer.toCanvas({ pixelRatio: 1, x: 0, y: 0, width, height })
    const ctx = canvas.getContext('2d')!
    const pixels = ctx.getImageData(0, 0, width, height)
    inkPixels(pixels, threshold)
    ctx.putImageData(pixels, 0, 0)
    return { canvas, warnings }
  } finally {
    stage.destroy()
  }
}
