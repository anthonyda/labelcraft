/**
 * Fit to box (spec R5.AC6): text sized and placed by its ink, so the letters
 * fill the box with no padding.
 */
import { ptToPx } from '../model/units'
import type { TextObject } from '../model/types'

export const FIT_MIN_PT = 1
export const FIT_MAX_PT = 200

/** Size measured at; ink scales with the font size. */
const PROBE_PX = 100
/** Underline below the baseline and its thickness, in font sizes. */
const UNDERLINE_AT = 0.1
const UNDERLINE_THICK = 0.06

type FitInput = Pick<
  TextObject,
  | 'text'
  | 'fontFamily'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'align'
  | 'lineHeight'
  | 'autoSize'
  | 'fontSize'
  | 'stretch'
>

/** R5.AC7: horizontal scale of the letters. */
export const stretchOf = (o: { stretch?: number }): number =>
  o.stretch && o.stretch > 0 ? o.stretch : 1

const fontStyle = (o: FitInput) =>
  [o.italic && 'italic', o.bold && 'bold'].filter(Boolean).join(' ')

export const fontFor = (o: FitInput, px: number): string =>
  `${fontStyle(o)} ${px}px "${o.fontFamily}"`.trim()

let measureCtx: CanvasRenderingContext2D | undefined
const measurer = () =>
  (measureCtx ??= document.createElement('canvas').getContext('2d')!)

type LineInk = {
  text: string
  left: number
  right: number
  asc: number
  desc: number
}

/** Ink of each line at the probe size (empty lines have none). */
const probeLines = (o: FitInput): LineInk[] => {
  const ctx = measurer()
  ctx.font = fontFor(o, PROBE_PX)
  return o.text.split('\n').map((text) => {
    if (!text.trim()) return { text, left: 0, right: 0, asc: 0, desc: 0 }
    const m = ctx.measureText(text)
    let desc = m.actualBoundingBoxDescent
    if (o.underline) {
      desc = Math.max(desc, (UNDERLINE_AT + UNDERLINE_THICK) * PROBE_PX)
    }
    return {
      text,
      left: m.actualBoundingBoxLeft,
      right: m.actualBoundingBoxRight,
      asc: m.actualBoundingBoxAscent,
      desc,
    }
  })
}

export type FitLayout = {
  /** Font size in printer dots. */
  px: number
  lines: {
    text: string
    x: number
    baseline: number
    inkLeft: number
    inkRight: number
  }[]
}

/** R5.AC6: size and place the lines in a w × h dot box. */
export const fitLayout = (o: FitInput, w: number, h: number): FitLayout => {
  const lines = probeLines(o)
  const sx = stretchOf(o)
  const pitch = o.lineHeight * PROBE_PX
  let top = Infinity
  let bottom = -Infinity
  let widest = 0
  lines.forEach((l, i) => {
    if (!l.text.trim()) return
    top = Math.min(top, i * pitch - l.asc)
    bottom = Math.max(bottom, i * pitch + l.desc)
    widest = Math.max(widest, (l.left + l.right) * sx)
  })
  if (!(widest > 0) || !(bottom > top)) return { px: 0, lines: [] }
  // A hair under the exact fit so rounding never clips the ink.
  const k = Math.min(w / widest, h / (bottom - top)) * 0.995
  const offsetY = (h - (bottom - top) * k) / 2 - top * k
  return {
    px: PROBE_PX * k,
    lines: lines.map((l, i) => {
      const inkW = (l.left + l.right) * k * sx
      const inkLeft =
        o.align === 'left' ? 0 : o.align === 'right' ? w - inkW : (w - inkW) / 2
      return {
        text: l.text,
        x: inkLeft + l.left * k * sx,
        baseline: offsetY + i * pitch * k,
        inkLeft,
        inkRight: inkLeft + inkW,
      }
    }),
  }
}

/** Draw fitted text (black) into a w × h dot box. */
export const drawFitted = (
  ctx: CanvasRenderingContext2D,
  o: FitInput,
  w: number,
  h: number,
): void => {
  const layout = fitLayout(o, w, h)
  if (!layout.px) return
  ctx.save()
  ctx.font = fontFor(o, layout.px)
  ctx.fillStyle = '#000'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  for (const l of layout.lines) {
    if (!l.text.trim()) continue
    ctx.save()
    ctx.translate(l.x, l.baseline)
    ctx.scale(stretchOf(o), 1)
    ctx.fillText(l.text, 0, 0)
    ctx.restore()
    if (o.underline) {
      ctx.fillRect(
        l.inkLeft,
        l.baseline + UNDERLINE_AT * layout.px,
        l.inkRight - l.inkLeft,
        Math.max(1, UNDERLINE_THICK * layout.px),
      )
    }
  }
  ctx.restore()
}

/** Fitted size in pt, rounded to half points for display. */
export const fitFontPt = (
  o: FitInput,
  w: number,
  h: number,
  dpi: number,
): number => {
  const pt = fitLayout(o, w, h).px / ptToPx(1, dpi)
  return Math.min(FIT_MAX_PT, Math.max(FIT_MIN_PT, Math.round(pt * 2) / 2))
}

/** The size shown for the text: fitted, or its own size (R5.AC6). */
export const textFontPt = (
  o: FitInput,
  w: number,
  h: number,
  dpi: number,
): number => (o.autoSize ? fitFontPt(o, w, h, dpi) : o.fontSize)
