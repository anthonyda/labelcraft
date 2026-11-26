/**
 * Fancy frames (spec R23.AC1): motifs (cats, flowers, …) at a fixed size in
 * millimetres; only the lines and spacing between them follow the label.
 */
import type { FrameDesign } from '../model/types'
import { drawMotif, type MotifName } from './motifs'

export type FrameGeom = {
  ctx: CanvasRenderingContext2D
  /** Line thickness, whole dots. */
  t: number
  x0: number
  y0: number
  x1: number
  y1: number
  /** Dots per mm. */
  mm: number
}

type Draw = (g: FrameGeom) => void

/** Thin rectangle of lines `t` wide. */
const rect = (g: FrameGeom, x0: number, y0: number, x1: number, y1: number) => {
  const { ctx, t } = g
  if (x1 - x0 <= 0 || y1 - y0 <= 0) return
  ctx.fillRect(x0, y0, x1 - x0, t)
  ctx.fillRect(x0, y1 - t, x1 - x0, t)
  ctx.fillRect(x0, y0, t, y1 - y0)
  ctx.fillRect(x1 - t, y0, t, y1 - y0)
}

const inset = (g: FrameGeom, d: number) =>
  rect(g, g.x0 + d, g.y0 + d, g.x1 - d, g.y1 - d)

const roundFrame = (
  g: FrameGeom,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
) => {
  const { ctx, t } = g
  const w = x1 - x0 - t
  const h = y1 - y0 - t
  if (w <= 0 || h <= 0) return
  ctx.lineWidth = t
  ctx.beginPath()
  ctx.roundRect(
    x0 + t / 2,
    y0 + t / 2,
    w,
    h,
    Math.max(0, Math.min(r, w / 2, h / 2)),
  )
  ctx.stroke()
}

/** Clear ink in a circle (so a motif sits on a clean background). */
const clear = (g: FrameGeom, cx: number, cy: number, r: number) => {
  const { ctx } = g
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, 2 * Math.PI)
  ctx.fill()
  ctx.restore()
}

/** Centres of evenly spread motifs between `from` and `to`. */
const spread = (from: number, to: number, spacing: number): number[] => {
  const len = to - from
  if (len <= 0) return []
  const n = Math.max(1, Math.floor(len / spacing))
  return Array.from({ length: n }, (_, k) => from + ((k + 0.5) * len) / n)
}

const motif = (
  g: FrameGeom,
  name: MotifName,
  cx: number,
  cy: number,
  sizeMm: number,
  rot = 0,
  clearR = 0,
) => {
  if (clearR) clear(g, cx, cy, clearR * g.mm)
  drawMotif(g.ctx, name, cx, cy, sizeMm * g.mm, rot)
}

/** Motifs along the top and bottom edges, alternating a few names. */
const rows = (
  g: FrameGeom,
  names: MotifName[],
  sizeMm: number,
  spacingMm: number,
  offsetMm: number,
  rot = [0],
  bottomEvery = 1,
) => {
  const m = g.mm
  const xs = spread(g.x0 + m, g.x1 - m, spacingMm * m)
  xs.forEach((x, k) => {
    const name = names[k % names.length]
    motif(g, name, x, g.y0 + offsetMm * m, sizeMm, rot[k % rot.length])
    if (k % bottomEvery === 0) {
      motif(g, name, x, g.y1 - offsetMm * m, sizeMm, rot[(k + 1) % rot.length])
    }
  })
}

/** Cubic bump outward from a straight edge (for clouds and lace). */
const bumps = (
  g: FrameGeom,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  segMm: number,
  height: (k: number, seg: number) => number,
  holes = false,
) => {
  const { ctx, t } = g
  ctx.lineWidth = t
  const holePts: { x: number; y: number }[] = []
  const edge = (ax: number, ay: number, bx: number, by: number) => {
    const len = Math.hypot(bx - ax, by - ay)
    const n = Math.max(2, Math.round(len / (segMm * g.mm)))
    const ux = (bx - ax) / len
    const uy = (by - ay) / len
    // Clockwise edges: outward normal is (uy, -ux).
    const nx = uy
    const ny = -ux
    const seg = len / n
    for (let k = 0; k < n; k++) {
      const sx = ax + ux * seg * k
      const sy = ay + uy * seg * k
      const ex = sx + ux * seg
      const ey = sy + uy * seg
      const h = height(k, seg) * 1.33
      ctx.moveTo(sx, sy)
      ctx.bezierCurveTo(
        sx + nx * h,
        sy + ny * h,
        ex + nx * h,
        ey + ny * h,
        ex,
        ey,
      )
      if (holes) {
        holePts.push({
          x: (sx + ex) / 2 + nx * h * 0.42,
          y: (sy + ey) / 2 + ny * h * 0.42,
        })
      }
    }
  }
  ctx.beginPath()
  edge(x0, y0, x1, y0)
  edge(x1, y0, x1, y1)
  edge(x1, y1, x0, y1)
  edge(x0, y1, x0, y0)
  ctx.stroke()
  if (holePts.length) {
    const r = Math.max(1, 0.22 * g.mm)
    ctx.beginPath()
    for (const p of holePts) {
      ctx.moveTo(p.x + r, p.y)
      ctx.arc(p.x, p.y, r, 0, 2 * Math.PI)
    }
    ctx.fill()
  }
}

export const FANCY_DRAW: Partial<Record<FrameDesign, Draw>> = {
  catEars: (g) => {
    const { ctx, t, mm: m } = g
    const H = g.y1 - g.y0
    const W = g.x1 - g.x0
    const e = Math.min(4 * m, H * 0.3)
    const side = Math.min(1.6 * m, W / 10)
    const bx0 = g.x0 + side
    const bx1 = g.x1 - side
    const top = g.y0 + e
    roundFrame(g, bx0, top, bx1, g.y1, Math.min(3 * m, (g.y1 - top) / 2))
    const earW = Math.min(4.5 * m, W / 5)
    const off = Math.min(1.5 * m, W / 12)
    ctx.lineWidth = t
    ctx.lineJoin = 'round'
    ctx.beginPath()
    const a = bx0 + off
    ctx.moveTo(a, top + t / 2)
    ctx.lineTo(a + earW * 0.3, g.y0 + t / 2)
    ctx.lineTo(a + earW, top + t / 2)
    const b = bx1 - off
    ctx.moveTo(b, top + t / 2)
    ctx.lineTo(b - earW * 0.3, g.y0 + t / 2)
    ctx.lineTo(b - earW, top + t / 2)
    // Whiskers.
    const cy = (top + g.y1) / 2
    for (const dy of [-1.3 * m, 0, 1.3 * m]) {
      ctx.moveTo(g.x0, cy + dy * 1.25)
      ctx.lineTo(bx0 - 0.3 * m, cy + dy)
      ctx.moveTo(g.x1, cy + dy * 1.25)
      ctx.lineTo(bx1 + 0.3 * m, cy + dy)
    }
    ctx.lineWidth = Math.max(1, Math.round(t * 0.8))
    ctx.stroke()
  },
  pawPrints: (g) => {
    const H = g.y1 - g.y0
    inset(g, H > 8 * g.mm ? 2.4 * g.mm : 2 * g.mm)
    rows(g, ['paw'], 2.3, 5, 1.2, [-15, 15], 2)
  },
  sleepyCat: (g) => {
    const m = g.mm
    rect(g, g.x0, g.y0, g.x1, g.y1)
    const H = g.y1 - g.y0
    const hc = Math.min(0.55 * H, 9 * m)
    const wc = (hc * 58) / 36
    const cx = g.x1 - wc / 2 - 0.2 * m
    const cy = g.y1 - hc / 2 - 0.2 * m
    drawMotif(g.ctx, 'cat', cx, cy, wc)
  },
  dogBones: (g) => {
    inset(g, 2.4 * g.mm)
    rows(g, ['bone'], 3.2, 6, 1.2, [-10, 10])
  },
  fish: (g) => {
    inset(g, 2.4 * g.mm)
    rows(g, ['fish'], 3.4, 7, 1.2, [0, 180])
  },
  butterflies: (g) => {
    const m = g.mm
    inset(g, 2 * m)
    motif(g, 'butterfly', g.x0 + 2.4 * m, g.y0 + 2.4 * m, 5, -15, 2.4)
    motif(g, 'butterfly', g.x1 - 2.4 * m, g.y1 - 2.4 * m, 4, 15, 2)
    motif(g, 'butterfly', g.x1 - 2 * m, g.y0 + 2 * m, 2.6, 20, 1.4)
  },
  daisies: (g) => {
    const m = g.mm
    const d = 2 * m
    inset(g, d)
    const size = Math.min(5, ((g.y1 - g.y0) * 0.45) / m)
    for (const [x, y] of [
      [g.x0 + d, g.y0 + d],
      [g.x1 - d, g.y0 + d],
      [g.x0 + d, g.y1 - d],
      [g.x1 - d, g.y1 - d],
    ]) {
      motif(g, 'daisy', x, y, size)
    }
    if (g.x1 - g.x0 > 30 * m) {
      const cx = (g.x0 + g.x1) / 2
      motif(g, 'daisy', cx, g.y0 + d, size * 0.6)
      motif(g, 'daisy', cx, g.y1 - d, size * 0.6)
    }
  },
  leafyVine: (g) => {
    const { ctx, t, mm: m } = g
    const a = 0.7 * m
    const p = 12 * m
    const stem = (base: number, sign: number) => {
      ctx.lineWidth = t
      ctx.beginPath()
      for (let x = g.x0 + 0.5 * m; x <= g.x1 - 0.5 * m; x += 1) {
        const y = base + sign * a * Math.sin((2 * Math.PI * x) / p)
        if (x === g.x0 + 0.5 * m) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      spread(g.x0 + 2 * m, g.x1 - 2 * m, 6 * m).forEach((x, k) => {
        const y = base + sign * a * Math.sin((2 * Math.PI * x) / p)
        const up = k % 2 === 0 ? -1 : 1
        motif(g, 'leaf', x, y + up * 1.1 * m, 2.6, up * 30 * sign)
      })
    }
    stem(g.y0 + 1.6 * m, 1)
    stem(g.y1 - 1.6 * m, -1)
    for (const x of [g.x0 + 0.6 * m, g.x1 - 0.6 * m - t]) {
      for (let y = g.y0 + 3 * m; y < g.y1 - 3 * m; y += 1.5 * m) {
        ctx.fillRect(x, y, t, Math.min(0.6 * m, g.y1 - 3 * m - y))
      }
    }
  },
  tulips: (g) => {
    const { ctx, t, mm: m } = g
    const H = g.y1 - g.y0
    const h = Math.min(5.5 * m, H * 0.45)
    const side = g.y1 - h - 1 * m
    ctx.fillRect(g.x0, g.y0, g.x1 - g.x0, t)
    ctx.fillRect(g.x0, g.y0, t, side - g.y0)
    ctx.fillRect(g.x1 - t, g.y0, t, side - g.y0)
    ctx.fillRect(g.x0, g.y1 - t, g.x1 - g.x0, t)
    spread(g.x0 + 1.5 * m, g.x1 - 1.5 * m, 6 * m).forEach((x, k) => {
      const th = k % 2 === 0 ? h : h * 0.85
      drawMotif(ctx, 'tulip', x, g.y1 - t - th / 2, th)
    })
  },
  mushrooms: (g) => {
    const { ctx, t, mm: m } = g
    const H = g.y1 - g.y0
    const h = Math.min(3.6 * m, H * 0.35)
    const side = g.y1 - h - 1 * m
    ctx.fillRect(g.x0, g.y0, g.x1 - g.x0, t)
    ctx.fillRect(g.x0, g.y0, t, side - g.y0)
    ctx.fillRect(g.x1 - t, g.y0, t, side - g.y0)
    ctx.fillRect(g.x0, g.y1 - t, g.x1 - g.x0, t)
    spread(g.x0 + 1.5 * m, g.x1 - 1.5 * m, 6 * m).forEach((x, k) => {
      const s = k % 2 === 0 ? h : h * 0.8
      drawMotif(ctx, 'mushroom', x, g.y1 - t - (s * 16) / 18 / 2, s)
    })
  },
  fruit: (g) => {
    inset(g, 2.6 * g.mm)
    rows(g, ['apple', 'cherries'], 3.2, 6, 1.3, [0])
  },
  cloud: (g) => {
    const m = g.mm
    const d = 1.6 * m + g.t
    bumps(g, g.x0 + d, g.y0 + d, g.x1 - d, g.y1 - d, 3.4, (k, seg) =>
      Math.min(1.6 * m, (k % 2 ? 0.75 : 1) * (seg / 2)),
    )
  },
  lace: (g) => {
    const m = g.mm
    const d = 1.8 * m
    inset(g, d)
    bumps(
      g,
      g.x0 + d,
      g.y0 + d,
      g.x1 - d,
      g.y1 - d,
      1.8,
      (_k, seg) => seg / 2,
      true,
    )
  },
  crown: (g) => {
    const { ctx, mm: m } = g
    const cw = Math.min(6 * m, (g.x1 - g.x0) / 4)
    const ch = (cw * 23) / 36
    const top = g.y0 + ch * 0.55
    roundFrame(g, g.x0, top, g.x1, g.y1, 1.5 * m)
    const cx = (g.x0 + g.x1) / 2
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillRect(cx - cw / 2 - 0.4 * m, top - 1, cw + 0.8 * m, g.t + 2)
    ctx.restore()
    drawMotif(ctx, 'crown', cx, g.y0 + ch / 2, cw)
  },
  bow: (g) => {
    const { mm: m } = g
    const bw = Math.min(10 * m, (g.x1 - g.x0) / 3)
    const bh = (bw * 34) / 56
    roundFrame(g, g.x0, g.y0 + bh * 0.4, g.x1, g.y1, 1.5 * m)
    drawMotif(g.ctx, 'bow', (g.x0 + g.x1) / 2, g.y0 + bh / 2, bw)
  },
  moonStars: (g) => {
    const { ctx, t, mm: m } = g
    const r = Math.max(1, t * 0.6)
    const d = 1.6 * m
    ctx.beginPath()
    const dot = (x: number, y: number) => {
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, 2 * Math.PI)
    }
    for (const x of spread(g.x0 + d, g.x1 - d, 0.9 * m)) {
      dot(x, g.y0 + d)
      dot(x, g.y1 - d)
    }
    for (const y of spread(g.y0 + d, g.y1 - d, 0.9 * m)) {
      dot(g.x0 + d, y)
      dot(g.x1 - d, y)
    }
    ctx.fill()
    motif(g, 'crescent', g.x0 + 2.6 * m, g.y0 + 2.6 * m, 5, 0, 2.8)
    spread(g.x0 + 7 * m, g.x1 - 1.5 * m, 10 * m).forEach((x, k) =>
      motif(g, 'star', x, g.y0 + d, k % 2 ? 1.3 : 1.8, 0, 1.1),
    )
    spread(g.x0 + 2 * m, g.x1 - 2 * m, 11 * m).forEach((x, k) =>
      motif(g, 'star', x, g.y1 - d, k % 2 ? 1.8 : 1.3, 0, 1.1),
    )
  },
  sunshine: (g) => {
    const m = g.mm
    inset(g, 2 * m)
    motif(g, 'sun', g.x0 + 2.8 * m, g.y0 + 2.8 * m, 6, 0, 3.2)
  },
  snowflakes: (g) => {
    const m = g.mm
    inset(g, 2.6 * m)
    rows(g, ['snowflake'], 2.8, 6, 1.3, [0, 15])
  },
  sparkles: (g) => {
    const m = g.mm
    const d = 1.5 * m
    roundFrame(g, g.x0 + d, g.y0 + d, g.x1 - d, g.y1 - d, 2 * m)
    for (const [x, y] of [
      [g.x0 + d + 0.6 * m, g.y0 + d + 0.6 * m],
      [g.x1 - d - 0.6 * m, g.y0 + d + 0.6 * m],
      [g.x0 + d + 0.6 * m, g.y1 - d - 0.6 * m],
      [g.x1 - d - 0.6 * m, g.y1 - d - 0.6 * m],
    ]) {
      motif(g, 'sparkle', x, y, 3.2, 0, 1.8)
    }
    if (g.x1 - g.x0 > 24 * m) {
      const cx = (g.x0 + g.x1) / 2
      motif(g, 'sparkle', cx, g.y0 + d, 2, 0, 1.2)
      motif(g, 'sparkle', cx, g.y1 - d, 2, 0, 1.2)
    }
  },
  heartArrow: (g) => {
    const m = g.mm
    const d = 1 * m
    roundFrame(g, g.x0 + d, g.y0 + d, g.x1 - d, g.y1 - d, 1.5 * m)
    motif(g, 'heartArrow', g.x1 - 3.4 * m, g.y0 + 2.4 * m, 6.4, 0, 2.8)
    for (const [x, y] of [
      [g.x0 + d + 0.4 * m, g.y0 + d + 0.4 * m],
      [g.x0 + d + 0.4 * m, g.y1 - d - 0.4 * m],
      [g.x1 - d - 0.4 * m, g.y1 - d - 0.4 * m],
    ]) {
      motif(g, 'heart', x, y, 2, 0, 1.2)
    }
  },
  musicNotes: (g) => {
    inset(g, 2.4 * g.mm)
    rows(g, ['note'], 3, 5, 1.3, [-10, 10], 2)
  },
  balloons: (g) => {
    const m = g.mm
    inset(g, 2 * m)
    spread(g.x0 + 1 * m, g.x1 - 1 * m, 7 * m).forEach((x, k) =>
      motif(
        g,
        'balloon',
        x,
        g.y0 + 2.4 * m,
        k % 2 ? 4 : 4.6,
        k % 2 ? 8 : -8,
        1.6,
      ),
    )
  },
  bubbles: (g) => {
    const { ctx, t, mm: m } = g
    const radii = [1.3, 0.7, 1.0, 0.55, 1.2, 0.8]
    const d = 1.4 * m
    ctx.lineWidth = t
    ctx.beginPath()
    let k = 0
    const bubble = (x: number, y: number) => {
      const r = radii[k++ % radii.length] * m
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, 2 * Math.PI)
    }
    for (const x of spread(g.x0 + d, g.x1 - d, 3 * m)) {
      bubble(x, g.y0 + d)
      bubble(x, g.y1 - d)
    }
    for (const y of spread(g.y0 + 3.5 * m, g.y1 - 3.5 * m, 3 * m)) {
      bubble(g.x0 + d, y)
      bubble(g.x1 - d, y)
    }
    ctx.stroke()
  },
}
