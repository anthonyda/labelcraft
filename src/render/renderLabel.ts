/**
 * Renderer (T1.5): document model → 1-bit canvas at printer resolution.
 * Used for print preview, PNG export and printing, so what is previewed is
 * exactly what prints (C7). Each object is drawn from the same ink bitmap the
 * editor shows (see renderObject.ts).
 */
import Konva from 'konva'
import type { LabelDoc } from '../model/types'
import { labelSizePx } from '../model/units'
import { DEFAULT_THRESHOLD, thresholdPixels } from './bitmap'
import { renderFrame } from './frame'
import { objectInkOutside } from './inkBounds'
import { objectPixelBox, renderObject } from './renderObject'

export { textFontStyle } from './renderObject'

export type RenderWarning = { objectId: string; message: string }

export type RenderResult = {
  canvas: HTMLCanvasElement
  warnings: RenderWarning[]
  /** Ids of objects whose ink goes past the label edge (R19). */
  outside: string[]
}

export const renderLabel = async (
  doc: LabelDoc,
  options: { threshold?: number } = {},
): Promise<RenderResult> => {
  const { width, height } = labelSizePx(doc.label)
  const dpi = doc.label.dpi
  const threshold = options.threshold ?? DEFAULT_THRESHOLD
  const warnings: RenderWarning[] = []

  const bitmaps = await Promise.all(
    doc.objects.map((o) => renderObject(o, dpi, threshold)),
  )

  const stage = new Konva.Stage({
    container: document.createElement('div'),
    width,
    height,
  })
  try {
    const layer = new Konva.Layer({ imageSmoothingEnabled: false })
    stage.add(layer)
    layer.add(new Konva.Rect({ width, height, fill: '#fff' }))

    doc.objects.forEach((o, i) => {
      const box = objectPixelBox(o, dpi)
      bitmaps[i].warnings.forEach((message) =>
        warnings.push({ objectId: o.id, message }),
      )
      // Rotate around the box centre (see model/types.ts).
      layer.add(
        new Konva.Image({
          image: bitmaps[i].canvas,
          x: box.x + box.width / 2,
          y: box.y + box.height / 2,
          width: box.width,
          height: box.height,
          offsetX: box.width / 2,
          offsetY: box.height / 2,
          rotation: o.rotation,
        }),
      )
    })

    // R23.AC3: the frame is drawn on top of objects.
    const frame = renderFrame(doc.label)
    if (frame) layer.add(new Konva.Image({ image: frame, width, height }))

    const canvas = layer.toCanvas({ pixelRatio: 1, x: 0, y: 0, width, height })
    const ctx = canvas.getContext('2d')!
    const pixels = ctx.getImageData(0, 0, width, height)
    thresholdPixels(pixels, threshold)
    ctx.putImageData(pixels, 0, 0)
    const outside = doc.objects
      .filter((o, i) =>
        objectInkOutside(o, bitmaps[i].canvas, dpi, { width, height }),
      )
      .map((o) => o.id)
    return { canvas, warnings, outside }
  } finally {
    stage.destroy()
  }
}
