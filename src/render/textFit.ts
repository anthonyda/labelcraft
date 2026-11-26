/**
 * Fit to box (spec R5.AC6): the largest font size, in half points, at which
 * each line of the text fits on one row inside the box.
 */
import Konva from 'konva'
import { ptToPx } from '../model/units'
import type { TextObject } from '../model/types'

export const FIT_MIN_PT = 1
export const FIT_MAX_PT = 200

/** Size measured at; text width and height scale with the font size. */
const PROBE_PX = 100

type FitInput = Pick<
  TextObject,
  | 'text'
  | 'fontFamily'
  | 'bold'
  | 'italic'
  | 'lineHeight'
  | 'autoSize'
  | 'fontSize'
>

const style = (o: FitInput) =>
  [o.bold && 'bold', o.italic && 'italic'].filter(Boolean).join(' ') || 'normal'

/** Largest size in pt for a box of w × h printer dots. */
export const fitFontPt = (
  o: FitInput,
  w: number,
  h: number,
  dpi: number,
): number => {
  const probe = new Konva.Text({
    text: o.text || ' ',
    fontFamily: o.fontFamily,
    fontSize: PROBE_PX,
    fontStyle: style(o),
    lineHeight: o.lineHeight,
    wrap: 'none',
  })
  const textW = probe.getTextWidth()
  const lines = Math.max(1, (o.text || ' ').split('\n').length)
  probe.destroy()
  const byWidth = textW > 0 ? (w * PROBE_PX) / textW : Infinity
  const byHeight = h / (lines * o.lineHeight)
  // A hair under the exact fit so rounding never wraps a line.
  const px = Math.min(byWidth, byHeight) * 0.995
  const pt = Math.floor((px / ptToPx(1, dpi)) * 2) / 2
  return Math.min(FIT_MAX_PT, Math.max(FIT_MIN_PT, pt))
}

/** The size the text is drawn at: fitted, or its own size (R5.AC6). */
export const textFontPt = (
  o: FitInput,
  w: number,
  h: number,
  dpi: number,
): number => (o.autoSize ? fitFontPt(o, w, h, dpi) : o.fontSize)
