/**
 * Magnet (spec R26): snap a dragged box's edges and centre to the label's
 * and other objects' edges and centres. Pure: all values in label dots.
 */
export type Rect = { x: number; y: number; width: number; height: number }

export type SnapResult = {
  /** Move to apply to the dragged box, in whole dots. */
  dx: number
  dy: number
  /** Guide lines to show: x of vertical lines, y of horizontal lines. */
  guidesX: number[]
  guidesY: number[]
}

const lines = (start: number, size: number) => [
  start,
  start + size / 2,
  start + size,
]

/** Best snap along one axis: the smallest move within `tolerance`. */
const axis = (
  mine: number[],
  targets: number[],
  tolerance: number,
): { d: number; at: number[] } => {
  let best: number | undefined
  for (const m of mine) {
    for (const t of targets) {
      const d = t - m
      if (
        Math.abs(d) <= tolerance &&
        (best === undefined || Math.abs(d) < Math.abs(best))
      ) {
        best = d
      }
    }
  }
  if (best === undefined) return { d: 0, at: [] }
  const d = best
  // Every line that lines up after the move gets a guide.
  const at = [
    ...new Set(
      mine
        .map((m) => m + d)
        .filter((p) => targets.some((t) => Math.abs(t - p) < 0.5)),
    ),
  ]
  return { d, at }
}

export const snapBox = (
  box: Rect,
  label: { width: number; height: number },
  others: Rect[],
  tolerance: number,
): SnapResult => {
  const tx = [
    ...lines(0, label.width),
    ...others.flatMap((o) => lines(o.x, o.width)),
  ]
  const ty = [
    ...lines(0, label.height),
    ...others.flatMap((o) => lines(o.y, o.height)),
  ]
  const x = axis(lines(box.x, box.width), tx, tolerance)
  const y = axis(lines(box.y, box.height), ty, tolerance)
  return {
    dx: Math.round(x.d),
    dy: Math.round(y.d),
    guidesX: x.at,
    guidesY: y.at,
  }
}
