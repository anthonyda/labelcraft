/**
 * Label frames (spec R23): drawn in whole printer dots as an ink bitmap
 * (black on transparent) the size of the label, on top of objects.
 */
import { frameFor, FRAMES } from '../model/frames'
import type { FrameDesign, LabelFrame, LabelSetup } from '../model/types'
import { labelSizePx, mmToPx } from '../model/units'
import { inkPixels } from './bitmap'

export { frameFor }

/** Kept for older imports: the designs and their names. */
export const FRAME_DESIGNS = FRAMES.map(({ design, name }) => ({
  design,
  name,
}))

type Geom = {
  ctx: CanvasRenderingContext2D
  /** Line thickness, whole dots. */
  t: number
  /** Frame rectangle (outer edge of the lines). */
  x0: number
  y0: number
  x1: number
  y1: number
  /** Dots per mm. */
  mm: number
}

const box = (
  g: Geom,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  t: number,
) => {
  const { ctx } = g
  const w = x1 - x0
  const h = y1 - y0
  if (w <= 0 || h <= 0) return
  ctx.fillRect(x0, y0, w, t)
  ctx.fillRect(x0, y1 - t, w, t)
  ctx.fillRect(x0, y0, t, h)
  ctx.fillRect(x1 - t, y0, t, h)
}

/** Stroke a path with its line inside the frame rectangle. */
const strokeInside = (
  g: Geom,
  path: (x0: number, y0: number, x1: number, y1: number) => void,
) => {
  const { ctx, t } = g
  ctx.lineWidth = t
  ctx.beginPath()
  path(g.x0 + t / 2, g.y0 + t / 2, g.x1 - t / 2, g.y1 - t / 2)
  ctx.stroke()
}

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
) => {
  const w = x1 - x0
  const h = y1 - y0
  ctx.roundRect(x0, y0, w, h, Math.max(0, Math.min(r, w / 2, h / 2)))
}

/** Evenly spaced points along each edge (corners once), clockwise. */
const alongEdges = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  spacing: number,
): { x: number; y: number }[] => {
  const pts: { x: number; y: number }[] = []
  const edge = (ax: number, ay: number, bx: number, by: number) => {
    const len = Math.hypot(bx - ax, by - ay)
    const n = Math.max(1, Math.round(len / spacing))
    for (let k = 0; k < n; k++) {
      pts.push({ x: ax + ((bx - ax) * k) / n, y: ay + ((by - ay) * k) / n })
    }
  }
  edge(x0, y0, x1, y0)
  edge(x1, y0, x1, y1)
  edge(x1, y1, x0, y1)
  edge(x0, y1, x0, y0)
  return pts
}

/** A wave along each edge (sine or zigzag), drawn inside the rectangle. */
const waveFrame = (g: Geom, kind: 'sine' | 'zigzag') => {
  const { ctx, t, mm } = g
  const a = Math.max(1.5 * t, 0.6 * mm)
  const x0 = g.x0 + a + t / 2
  const y0 = g.y0 + a + t / 2
  const x1 = g.x1 - a - t / 2
  const y1 = g.y1 - a - t / 2
  if (x1 <= x0 || y1 <= y0) return
  ctx.lineWidth = t
  ctx.lineJoin = 'round'
  const edge = (ax: number, ay: number, bx: number, by: number) => {
    const len = Math.hypot(bx - ax, by - ay)
    const n = Math.max(1, Math.round(len / (3 * mm)))
    // Normal pointing out of the rectangle.
    const nx = (by - ay) / len
    const ny = -(bx - ax) / len
    const steps = n * 16
    for (let s = 0; s <= steps; s++) {
      const u = s / steps
      const phase = u * n
      const f =
        kind === 'sine'
          ? Math.sin(phase * 2 * Math.PI)
          : 1 - 4 * Math.abs((phase % 1) - 0.5)
      const x = ax + (bx - ax) * u - nx * a * f
      const y = ay + (by - ay) * u - ny * a * f
      if (s === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
  }
  ctx.beginPath()
  edge(x0, y0, x1, y0)
  edge(x1, y0, x1, y1)
  edge(x1, y1, x0, y1)
  edge(x0, y1, x0, y0)
  ctx.stroke()
}

/** Dashes (and optional dots) along each edge, as filled bars. */
const dashFrame = (
  g: Geom,
  pattern: number[],
  x0 = g.x0,
  y0 = g.y0,
  x1 = g.x1,
  y1 = g.y1,
) => {
  const { ctx, t } = g
  const run = (
    horizontal: boolean,
    fixed: number,
    from: number,
    to: number,
  ) => {
    let pos = from
    let k = 0
    while (pos < to) {
      const len = Math.min(pattern[k % pattern.length], to - pos)
      if (k % 2 === 0) {
        if (horizontal) ctx.fillRect(pos, fixed, len, t)
        else ctx.fillRect(fixed, pos, t, len)
      }
      pos += pattern[k % pattern.length]
      k++
    }
  }
  run(true, y0, x0, x1)
  run(true, y1 - t, x0, x1)
  run(false, x0, y0, y1)
  run(false, x1 - t, y0, y1)
}

const DRAW: Record<Exclude<FrameDesign, 'none'>, (g: Geom) => void> = {
  line: (g) => box(g, g.x0, g.y0, g.x1, g.y1, g.t),
  thick: (g) => box(g, g.x0, g.y0, g.x1, g.y1, g.t),
  double: (g) => {
    box(g, g.x0, g.y0, g.x1, g.y1, g.t)
    box(g, g.x0 + 2 * g.t, g.y0 + 2 * g.t, g.x1 - 2 * g.t, g.y1 - 2 * g.t, g.t)
  },
  thickThin: (g) => {
    const thick = 3 * g.t
    box(g, g.x0, g.y0, g.x1, g.y1, thick)
    const d = thick + g.t
    box(g, g.x0 + d, g.y0 + d, g.x1 - d, g.y1 - d, g.t)
  },
  rounded: (g) =>
    strokeInside(g, (x0, y0, x1, y1) =>
      roundRect(g.ctx, x0, y0, x1, y1, 2 * g.mm + g.t),
    ),
  roundedDouble: (g) => {
    const r = 2 * g.mm + g.t
    strokeInside(g, (x0, y0, x1, y1) => roundRect(g.ctx, x0, y0, x1, y1, r))
    const d = 2 * g.t
    strokeInside(g, (x0, y0, x1, y1) =>
      roundRect(g.ctx, x0 + d, y0 + d, x1 - d, y1 - d, r - d),
    )
  },
  dashed: (g) => {
    const dash = Math.max(3 * g.t, Math.round(2 * g.mm))
    dashFrame(g, [dash, Math.max(g.t, Math.round(dash / 2))])
  },
  dotted: (g) => {
    const dot = Math.max(g.t, 2)
    dashFrame(g, [dot, dot])
  },
  dashDot: (g) => {
    const dash = Math.max(4 * g.t, Math.round(2.5 * g.mm))
    const gap = Math.max(g.t, Math.round(0.8 * g.mm))
    dashFrame(g, [dash, gap, Math.max(g.t, 2), gap])
  },
  stitched: (g) => {
    const d = Math.round(1 * g.mm)
    dashFrame(
      g,
      [Math.round(1.5 * g.mm), d],
      g.x0 + d,
      g.y0 + d,
      g.x1 - d,
      g.y1 - d,
    )
  },
  corners: (g) => {
    const { ctx, t, x0, y0, x1, y1 } = g
    const len = Math.max(
      2 * t,
      Math.min(
        Math.round(4 * g.mm),
        Math.floor((x1 - x0) / 3),
        Math.floor((y1 - y0) / 3),
      ),
    )
    for (const [x, y, dx, dy] of [
      [x0, y0, 1, 1],
      [x1, y0, -1, 1],
      [x0, y1, 1, -1],
      [x1, y1, -1, -1],
    ]) {
      ctx.fillRect(dx > 0 ? x : x - len, dy > 0 ? y : y - t, len, t)
      ctx.fillRect(dx > 0 ? x : x - t, dy > 0 ? y : y - len, t, len)
    }
  },
  cornersRound: (g) => {
    const { ctx, t } = g
    const r = Math.max(
      2 * t,
      Math.min(4 * g.mm, (g.x1 - g.x0) / 3, (g.y1 - g.y0) / 3),
    )
    ctx.lineWidth = t
    const x0 = g.x0 + t / 2
    const y0 = g.y0 + t / 2
    const x1 = g.x1 - t / 2
    const y1 = g.y1 - t / 2
    ctx.beginPath()
    ctx.moveTo(x0, y0 + r)
    ctx.arcTo(x0, y0, x0 + r, y0, r)
    ctx.moveTo(x1 - r, y0)
    ctx.arcTo(x1, y0, x1, y0 + r, r)
    ctx.moveTo(x1, y1 - r)
    ctx.arcTo(x1, y1, x1 - r, y1, r)
    ctx.moveTo(x0 + r, y1)
    ctx.arcTo(x0, y1, x0, y1 - r, r)
    ctx.stroke()
  },
  cornerDots: (g) => {
    const { ctx } = g
    const d = Math.max(3 * g.t, 1.5 * g.mm)
    const r = d / 2
    ctx.beginPath()
    for (const [x, y] of [
      [g.x0 + r, g.y0 + r],
      [g.x1 - r, g.y0 + r],
      [g.x0 + r, g.y1 - r],
      [g.x1 - r, g.y1 - r],
    ]) {
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, 2 * Math.PI)
    }
    ctx.fill()
  },
  brackets: (g) => {
    const { ctx, t, x0, y0, x1, y1 } = g
    const arm = Math.max(
      2 * t,
      Math.min(Math.round(3 * g.mm), Math.floor((x1 - x0) / 4)),
    )
    const h = y1 - y0
    ctx.fillRect(x0, y0, t, h)
    ctx.fillRect(x0, y0, arm, t)
    ctx.fillRect(x0, y1 - t, arm, t)
    ctx.fillRect(x1 - t, y0, t, h)
    ctx.fillRect(x1 - arm, y0, arm, t)
    ctx.fillRect(x1 - arm, y1 - t, arm, t)
  },
  ticket: (g) => {
    const r = 2 * g.mm
    strokeInside(g, (x0, y0, x1, y1) => {
      const { ctx } = g
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
    })
  },
  chamfer: (g) => {
    strokeInside(g, (x0, y0, x1, y1) => {
      const c = Math.min(2.5 * g.mm, (x1 - x0) / 4, (y1 - y0) / 4)
      const { ctx } = g
      ctx.moveTo(x0 + c, y0)
      ctx.lineTo(x1 - c, y0)
      ctx.lineTo(x1, y0 + c)
      ctx.lineTo(x1, y1 - c)
      ctx.lineTo(x1 - c, y1)
      ctx.lineTo(x0 + c, y1)
      ctx.lineTo(x0, y1 - c)
      ctx.lineTo(x0, y0 + c)
      ctx.closePath()
    })
  },
  pill: (g) =>
    strokeInside(g, (x0, y0, x1, y1) =>
      roundRect(g.ctx, x0, y0, x1, y1, Math.min(x1 - x0, y1 - y0) / 2),
    ),
  tag: (g) => {
    let hole = { x: 0, y: 0, r: 0 }
    strokeInside(g, (x0, y0, x1, y1) => {
      const cy = (y0 + y1) / 2
      const p = Math.min((y1 - y0) / 2, (x1 - x0) / 4)
      const { ctx } = g
      ctx.moveTo(x0 + p, y0)
      ctx.lineTo(x1, y0)
      ctx.lineTo(x1, y1)
      ctx.lineTo(x0 + p, y1)
      ctx.lineTo(x0, cy)
      ctx.closePath()
      hole = { x: x0 + p * 0.75, y: cy, r: Math.max(1.5 * g.t, 0.8 * g.mm) }
    })
    g.ctx.beginPath()
    g.ctx.arc(hole.x, hole.y, hole.r, 0, 2 * Math.PI)
    g.ctx.stroke()
  },
  banner: (g) => {
    strokeInside(g, (x0, y0, x1, y1) => {
      const cy = (y0 + y1) / 2
      const n = Math.min((y1 - y0) / 3, (x1 - x0) / 6)
      const { ctx } = g
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y0)
      ctx.lineTo(x1 - n, cy)
      ctx.lineTo(x1, y1)
      ctx.lineTo(x0, y1)
      ctx.lineTo(x0 + n, cy)
      ctx.closePath()
    })
  },
  wavy: (g) => waveFrame(g, 'sine'),
  zigzag: (g) => waveFrame(g, 'zigzag'),
  scalloped: (g) => {
    const { ctx, t, mm } = g
    ctx.lineWidth = t
    const x0 = g.x0 + t / 2
    const y0 = g.y0 + t / 2
    const x1 = g.x1 - t / 2
    const y1 = g.y1 - t / 2
    const bump = (ax: number, ay: number, bx: number, by: number) => {
      const len = Math.hypot(bx - ax, by - ay)
      const n = Math.max(1, Math.round(len / (2 * mm)))
      const r = len / n / 2
      const ux = (bx - ax) / len
      const uy = (by - ay) / len
      // Arcs bulge towards the outer edge; their base sits r inside it.
      const angle = Math.atan2(uy, ux)
      for (let k = 0; k < n; k++) {
        const cx = ax + ux * r * (2 * k + 1) - uy * r
        const cy = ay + uy * r * (2 * k + 1) + ux * r
        ctx.moveTo(cx - ux * r, cy - uy * r)
        ctx.arc(cx, cy, r, angle + Math.PI, angle, false)
      }
    }
    ctx.beginPath()
    bump(x0, y0, x1, y0)
    bump(x1, y0, x1, y1)
    bump(x1, y1, x0, y1)
    bump(x0, y1, x0, y0)
    ctx.stroke()
  },
  stamp: (g) => {
    const { ctx, mm } = g
    const band = Math.max(4 * g.t, Math.round(1.2 * mm))
    box(g, g.x0, g.y0, g.x1, g.y1, band)
    // Perforations: round bites out of the outer edge.
    const r = band * 0.45
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    for (const p of alongEdges(g.x0, g.y0, g.x1, g.y1, 2.4 * r)) {
      ctx.moveTo(p.x + r, p.y)
      ctx.arc(p.x, p.y, r, 0, 2 * Math.PI)
    }
    ctx.fill()
    ctx.restore()
  },
  beads: (g) => {
    const { ctx } = g
    const d = Math.max(2 * g.t, 0.9 * g.mm)
    const r = d / 2
    ctx.beginPath()
    for (const p of alongEdges(g.x0 + r, g.y0 + r, g.x1 - r, g.y1 - r, 2 * d)) {
      ctx.moveTo(p.x + r, p.y)
      ctx.arc(p.x, p.y, r, 0, 2 * Math.PI)
    }
    ctx.fill()
  },
  diamonds: (g) => {
    const { ctx } = g
    const s = Math.max(3 * g.t, 1.2 * g.mm) / 2
    ctx.beginPath()
    for (const p of alongEdges(
      g.x0 + s,
      g.y0 + s,
      g.x1 - s,
      g.y1 - s,
      3.2 * s,
    )) {
      ctx.moveTo(p.x, p.y - s)
      ctx.lineTo(p.x + s, p.y)
      ctx.lineTo(p.x, p.y + s)
      ctx.lineTo(p.x - s, p.y)
      ctx.closePath()
    }
    ctx.fill()
  },
}

/**
 * The frame's ink bitmap at printer resolution, or undefined for none
 * (R23.AC3, AC5).
 */
export const renderFrame = (
  label: LabelSetup,
): HTMLCanvasElement | undefined => {
  const frame: LabelFrame | undefined = label.frame
  if (!frame || frame.design === 'none') return undefined
  const draw = DRAW[frame.design]
  if (!draw) return undefined
  const { width: W, height: H } = labelSizePx(label)
  const dpi = label.dpi
  // R23.AC5: whole dots, at least one.
  const t = Math.max(1, Math.round(mmToPx(frame.thicknessMm, dpi)))
  const i = Math.max(0, Math.round(mmToPx(frame.insetMm, dpi)))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, W)
  canvas.height = Math.max(1, H)
  if (W - 2 * i <= 0 || H - 2 * i <= 0) return canvas
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.strokeStyle = '#000'
  draw({ ctx, t, x0: i, y0: i, x1: W - i, y1: H - i, mm: mmToPx(1, dpi) })
  // Crisp, whole-dot ink (curves are anti-aliased by the canvas).
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height)
  inkPixels(px)
  ctx.putImageData(px, 0, 0)
  return canvas
}
