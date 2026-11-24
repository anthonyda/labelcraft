/**
 * Ink bounds (R19): where an object's black pixels land on the label, so
 * objects are only flagged as outside when ink would actually be cut off.
 */
import type { LabelObject } from '../model/types'
import { objectPixelBox } from './renderObject'

type Pt = { x: number; y: number }

/**
 * Outline points of the ink in a bitmap (black on transparent): the outer
 * corners of the leftmost and rightmost ink pixel of each row. Their convex
 * hull contains every ink pixel, so rotating them gives exact bounds.
 */
const outlineCache = new WeakMap<HTMLCanvasElement, Pt[]>()
export const inkOutline = (canvas: HTMLCanvasElement): Pt[] => {
  const cached = outlineCache.get(canvas)
  if (cached) return cached
  const { width, height } = canvas
  const points: Pt[] = []
  if (width > 0 && height > 0) {
    const d = canvas
      .getContext('2d', { willReadFrequently: true })!
      .getImageData(0, 0, width, height).data
    for (let y = 0; y < height; y++) {
      let min = -1
      let max = -1
      for (let x = 0; x < width; x++) {
        if (d[(y * width + x) * 4 + 3] > 0) {
          if (min < 0) min = x
          max = x
        }
      }
      if (min >= 0) {
        points.push(
          { x: min, y },
          { x: min, y: y + 1 },
          { x: max + 1, y },
          { x: max + 1, y: y + 1 },
        )
      }
    }
  }
  outlineCache.set(canvas, points)
  return points
}

export type PxBox = { x: number; y: number; width: number; height: number }

/**
 * True when ink drawn into `box` (label dots), rotated around its centre,
 * goes past the label by more than half a dot (R19.AC1).
 */
export const inkOutsideBox = (
  bitmap: HTMLCanvasElement,
  box: PxBox,
  rotation: number,
  label: { width: number; height: number },
): boolean => {
  const points = inkOutline(bitmap)
  if (points.length === 0 || bitmap.width === 0 || bitmap.height === 0) {
    return false
  }
  const sx = box.width / bitmap.width
  const sy = box.height / bitmap.height
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  const rad = (rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const tol = 0.5
  for (const p of points) {
    const lx = p.x * sx - box.width / 2
    const ly = p.y * sy - box.height / 2
    const x = cx + lx * cos - ly * sin
    const y = cy + lx * sin + ly * cos
    if (
      x < -tol ||
      y < -tol ||
      x > label.width + tol ||
      y > label.height + tol
    ) {
      return true
    }
  }
  return false
}

/** R19.AC4: whether an object's ink goes past the label edge. */
export const objectInkOutside = (
  o: LabelObject,
  bitmap: HTMLCanvasElement,
  dpi: number,
  label: { width: number; height: number },
): boolean => inkOutsideBox(bitmap, objectPixelBox(o, dpi), o.rotation, label)
