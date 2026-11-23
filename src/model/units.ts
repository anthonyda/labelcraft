import type { LabelSetup } from './types'

export const MM_PER_INCH = 25.4
export const PT_PER_INCH = 72
export const DEFAULT_DPI = 203

export const mmToPx = (mm: number, dpi: number): number =>
  (mm * dpi) / MM_PER_INCH

export const pxToMm = (px: number, dpi: number): number =>
  (px * MM_PER_INCH) / dpi

export const ptToPx = (pt: number, dpi: number): number =>
  (pt * dpi) / PT_PER_INCH

/** Label canvas size in whole printer pixels (R3.AC2). */
export const labelSizePx = (
  label: LabelSetup,
): { width: number; height: number } => ({
  width: Math.round(mmToPx(label.widthMm, label.dpi)),
  height: Math.round(mmToPx(label.heightMm, label.dpi)),
})
