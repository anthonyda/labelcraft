/**
 * Label frames (T6e.2, spec R23): drawn in whole printer dots as an ink
 * bitmap (black on transparent) the size of the label, on top of objects.
 */
import type { FrameDesign, LabelFrame, LabelSetup } from '../model/types'
import { labelSizePx, mmToPx } from '../model/units'
import { inkPixels } from './bitmap'

export const FRAME_DESIGNS: { design: FrameDesign; name: string }[] = [
  { design: 'none', name: 'None' },
  { design: 'line', name: 'Line' },
  { design: 'thick', name: 'Thick line' },
  { design: 'double', name: 'Double line' },
  { design: 'rounded', name: 'Rounded' },
  { design: 'dashed', name: 'Dashed' },
  { design: 'dotted', name: 'Dotted' },
  { design: 'corners', name: 'Corners' },
  { design: 'ticket', name: 'Ticket' },
]

/** Default thickness per design, in mm (R23.AC2). */
export const DEFAULT_THICKNESS: Record<FrameDesign, number> = {
  none: 0.3,
  line: 0.3,
  thick: 1,
  double: 0.3,
  rounded: 0.4,
  dashed: 0.4,
  dotted: 0.5,
  corners: 0.6,
  ticket: 0.4,
}

export const DEFAULT_INSET_MM = 0.5

export const frameFor = (design: FrameDesign): LabelFrame => ({
  design,
  thicknessMm: DEFAULT_THICKNESS[design],
  insetMm: DEFAULT_INSET_MM,
})

const roundRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)))
}

/** Rectangle whose corners are cut by concave quarter circles of radius r. */
const ticketPath = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
) => {
  ctx.beginPath()
  ctx.moveTo(x0 + r, y0)
  ctx.lineTo(x1 - r, y0)
  ctx.arc(x1, y0, r, Math.PI, Math.PI / 2, true)
  ctx.lineTo(x1, y1 - r)
  ctx.arc(x1, y1, r, (3 * Math.PI) / 2, Math.PI, true)
  ctx.lineTo(x0 + r, y1)
  ctx.arc(x0, y1, r, 0, (3 * Math.PI) / 2, true)
  ctx.lineTo(x0, y0 + r)
  ctx.arc(x0, y0, r, Math.PI / 2, 0, true)
  ctx.closePath()
}

/**
 * The frame's ink bitmap at printer resolution, or undefined for none
 * (R23.AC3, AC5).
 */
export const renderFrame = (
  label: LabelSetup,
): HTMLCanvasElement | undefined => {
  const frame = label.frame
  if (!frame || frame.design === 'none') return undefined
  const { width: W, height: H } = labelSizePx(label)
  const dpi = label.dpi
  // R23.AC5: whole dots, at least one.
  const t = Math.max(1, Math.round(mmToPx(frame.thicknessMm, dpi)))
  const i = Math.max(0, Math.round(mmToPx(frame.insetMm, dpi)))
  const w = W - 2 * i
  const h = H - 2 * i
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, W)
  canvas.height = Math.max(1, H)
  if (w <= 0 || h <= 0) return canvas
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.strokeStyle = '#000'
  const box = (x: number, y: number, bw: number, bh: number, th: number) => {
    ctx.fillRect(x, y, bw, th)
    ctx.fillRect(x, y + bh - th, bw, th)
    ctx.fillRect(x, y, th, bh)
    ctx.fillRect(x + bw - th, y, th, bh)
  }

  switch (frame.design) {
    case 'line':
    case 'thick':
      box(i, i, w, h, t)
      break
    case 'double':
      box(i, i, w, h, t)
      if (w > 4 * t && h > 4 * t)
        box(i + 2 * t, i + 2 * t, w - 4 * t, h - 4 * t, t)
      break
    case 'rounded':
      ctx.lineWidth = t
      roundRectPath(ctx, i + t / 2, i + t / 2, w - t, h - t, mmToPx(2, dpi) + t)
      ctx.stroke()
      break
    case 'ticket':
      ctx.lineWidth = t
      ticketPath(
        ctx,
        i + t / 2,
        i + t / 2,
        W - i - t / 2,
        H - i - t / 2,
        mmToPx(2, dpi),
      )
      ctx.stroke()
      break
    case 'dashed': {
      const dash = Math.max(3 * t, Math.round(mmToPx(2, dpi)))
      const gap = Math.max(t, Math.round(dash / 2))
      for (let x = i; x < i + w; x += dash + gap) {
        const len = Math.min(dash, i + w - x)
        ctx.fillRect(x, i, len, t)
        ctx.fillRect(x, i + h - t, len, t)
      }
      for (let y = i; y < i + h; y += dash + gap) {
        const len = Math.min(dash, i + h - y)
        ctx.fillRect(i, y, t, len)
        ctx.fillRect(i + w - t, y, t, len)
      }
      break
    }
    case 'dotted': {
      const dot = Math.max(t, 2)
      const step = 2 * dot
      for (let x = i; x <= i + w - dot; x += step) {
        ctx.fillRect(x, i, dot, dot)
        ctx.fillRect(x, i + h - dot, dot, dot)
      }
      for (let y = i; y <= i + h - dot; y += step) {
        ctx.fillRect(i, y, dot, dot)
        ctx.fillRect(i + w - dot, y, dot, dot)
      }
      break
    }
    case 'corners': {
      const len = Math.max(
        2 * t,
        Math.min(
          Math.round(mmToPx(4, dpi)),
          Math.floor(w / 3),
          Math.floor(h / 3),
        ),
      )
      for (const [x, y, dx, dy] of [
        [i, i, 1, 1],
        [i + w, i, -1, 1],
        [i, i + h, 1, -1],
        [i + w, i + h, -1, -1],
      ]) {
        ctx.fillRect(dx > 0 ? x : x - len, dy > 0 ? y : y - t, len, t)
        ctx.fillRect(dx > 0 ? x : x - t, dy > 0 ? y : y - len, t, len)
      }
      break
    }
  }

  // Crisp, whole-dot ink (curves are anti-aliased by the canvas).
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height)
  inkPixels(px)
  ctx.putImageData(px, 0, 0)
  return canvas
}
