/**
 * Motifs for the Fancy frames (spec R23.AC1): small drawings in their own
 * coordinate box, drawn with Path2D from SVG path data. Black is ink; white
 * clears ink underneath (it becomes transparent when the frame is inked).
 */

type Part = {
  d: string
  fill?: '#000' | '#fff'
  /** Stroke width in the motif's own units. */
  stroke?: number
  strokeColor?: '#000' | '#fff'
}

export type Motif = {
  /** View box: x, y, width, height. */
  box: [number, number, number, number]
  parts: Part[]
}

const circ = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`

const ell = (cx: number, cy: number, rx: number, ry: number, rotDeg = 0) => {
  const a = (rotDeg * Math.PI) / 180
  const dx = Math.cos(a) * rx
  const dy = Math.sin(a) * rx
  return `M${cx - dx} ${cy - dy}A${rx} ${ry} ${rotDeg} 1 0 ${cx + dx} ${cy + dy}A${rx} ${ry} ${rotDeg} 1 0 ${cx - dx} ${cy - dy}Z`
}

/** Daisy petals: eight ellipses around the centre. */
const petals = (() => {
  let d = ''
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 - Math.PI / 2
    d += ell(Math.cos(a) * 5.6, Math.sin(a) * 5.6, 4.6, 2.4, (k * 180) / 4 - 90)
  }
  return d
})()

export const MOTIFS = {
  paw: {
    box: [-10, -10, 20, 20],
    parts: [
      {
        d:
          ell(0, 3.5, 5, 4.2) +
          circ(-6.3, -2.5, 2.3) +
          circ(-2.3, -6.8, 2.3) +
          circ(2.3, -6.8, 2.3) +
          circ(6.3, -2.5, 2.3),
        fill: '#000',
      },
    ],
  },
  daisy: {
    box: [-12, -12, 24, 24],
    parts: [
      { d: petals, fill: '#fff', stroke: 1.4 },
      { d: circ(0, 0, 3), fill: '#000' },
    ],
  },
  leaf: {
    box: [0, -4, 12, 8],
    parts: [{ d: 'M0 0C3 -4 9 -4 12 0C9 4 3 4 0 0Z', fill: '#000' }],
  },
  star: {
    box: [-5, -5, 10, 10],
    parts: [
      {
        d: 'M0 -5L1.2 -1.6L4.8 -1.5L1.9 0.6L2.9 4L0 2L-2.9 4L-1.9 0.6L-4.8 -1.5L-1.2 -1.6Z',
        fill: '#000',
      },
    ],
  },
  tulip: {
    box: [-6, -12, 12, 24],
    parts: [
      {
        d: 'M-4 -3L-4.5 -10L-1.8 -6.5L0 -11L1.8 -6.5L4.5 -10L4 -3Q0 1.5 -4 -3Z',
        fill: '#000',
      },
      { d: 'M0 -1V12', stroke: 1.2 },
      { d: 'M0 7C-2 4 -5 4 -6 3C-5 6 -2 7 0 8Z', fill: '#000' },
    ],
  },
  cat: {
    box: [142, 50, 58, 36],
    parts: [
      {
        d:
          ell(170, 74, 22, 11) +
          circ(152, 66, 8) +
          'M146 61L147 53L152 59Z M154 59L158 53L159 61Z',
        fill: '#000',
      },
      { d: 'M190 76C200 70 198 56 190 58', stroke: 3 },
      { d: 'M148 66q2 2 4 0 M154 66q2 2 4 0', stroke: 1, strokeColor: '#fff' },
    ],
  },
  crown: {
    box: [82, 0, 36, 23],
    parts: [
      {
        d:
          'M86 22L84 6L93 13L100 3L107 13L116 6L114 22Z' +
          circ(84, 5, 2) +
          circ(100, 2.5, 2) +
          circ(116, 5, 2),
        fill: '#000',
      },
    ],
  },
  bow: {
    box: [72, 3, 56, 34],
    parts: [
      {
        d: 'M100 16C88 2 72 6 76 16C78 24 92 22 100 16Z M100 16C112 2 128 6 124 16C122 24 108 22 100 16Z',
        fill: '#fff',
        stroke: 1.8,
      },
      {
        d: 'M96 12h8v8h-8z M98 20L90 34L95 32L97 36Z M102 20L110 34L105 32L103 36Z',
        fill: '#000',
      },
    ],
  },
  crescent: {
    box: [15, 5, 30, 30],
    parts: [{ d: 'M30 6A14 14 0 1 0 44 30A11 11 0 1 1 30 6Z', fill: '#000' }],
  },
  heart: {
    box: [-10, -9, 20, 18],
    parts: [{ d: 'M0 8C-12 0 -9 -10 0 -4C9 -10 12 0 0 8Z', fill: '#000' }],
  },
  bone: {
    box: [-12, -5.5, 24, 11],
    parts: [
      {
        d:
          circ(-9, -2.4, 2.6) +
          circ(-9, 2.4, 2.6) +
          circ(9, -2.4, 2.6) +
          circ(9, 2.4, 2.6) +
          'M-9 -2H9V2H-9Z',
        fill: '#000',
      },
    ],
  },
  fish: {
    box: [-12, -6, 24, 12],
    parts: [
      {
        d: 'M-8 0C-4 -6 6 -6 8 0C6 6 -4 6 -8 0Z M-7 0L-12 -5L-12 5Z',
        fill: '#000',
      },
      { d: circ(4, -1, 1), fill: '#fff' },
    ],
  },
  apple: {
    box: [-8, -10, 16, 20],
    parts: [
      {
        d: 'M0 -4C-3 -7 -8 -6 -8 0C-8 6 -4 10 0 8C4 10 8 6 8 0C8 -6 3 -7 0 -4Z',
        fill: '#000',
      },
      { d: 'M0 -4C0 -7 1 -9 2 -10', stroke: 1.2 },
      { d: 'M1 -7C3 -10 6 -9 6 -8C4 -6 2 -6 1 -7Z', fill: '#000' },
    ],
  },
  cherries: {
    box: [-10, -10, 20, 20],
    parts: [
      { d: circ(-4, 5, 4) + circ(5, 6, 4), fill: '#000' },
      { d: 'M-4 1C-2 -5 2 -8 4 -9 M5 2C5 -3 4 -7 4 -9', stroke: 1.2 },
      { d: 'M4 -9C7 -12 10 -9 9 -8C7 -7 5 -8 4 -9Z', fill: '#000' },
    ],
  },
  snowflake: {
    box: [-10, -10, 20, 20],
    parts: [
      {
        d:
          'M0 -9V9 M-7.8 -4.5L7.8 4.5 M-7.8 4.5L7.8 -4.5 M-2 -7.2L0 -5L2 -7.2 M-2 7.2L0 5L2 7.2' +
          ' M-7.2 -1.6L-4.3 -2.5L-5.2 -5.5 M7.2 1.6L4.3 2.5L5.2 5.5 M-5.2 5.5L-4.3 2.5L-7.2 1.6 M5.2 -5.5L4.3 -2.5L7.2 -1.6',
        stroke: 1.5,
      },
    ],
  },
  note: {
    box: [-8, -10, 16, 20],
    parts: [
      {
        d:
          ell(-1.6, 6, 3.4, 2.5, -20) +
          'M1.6 -9C4 -7 7 -6 6 -2C5 -4 3 -5 1.6 -5Z',
        fill: '#000',
      },
      { d: 'M1.6 5.5V-9', stroke: 1.4 },
    ],
  },
  butterfly: {
    box: [-10, -9, 20, 18],
    parts: [
      {
        d:
          'M0 0C-4 -9 -11 -8 -9 -2C-8 1 -4 1 0 0Z M0 0C4 -9 11 -8 9 -2C8 1 4 1 0 0Z' +
          ' M0 1C-3 7 -8 7 -7 3C-6 1 -3 1 0 1Z M0 1C3 7 8 7 7 3C6 1 3 1 0 1Z M-0.8 -4h1.6v9h-1.6z',
        fill: '#000',
      },
      { d: 'M-0.5 -4C-1 -7 -3 -8 -4 -8 M0.5 -4C1 -7 3 -8 4 -8', stroke: 0.8 },
    ],
  },
  sun: {
    box: [-10, -10, 20, 20],
    parts: [
      { d: circ(0, 0, 4.5), fill: '#000' },
      {
        d: 'M0 -6V-9 M0 6V9 M-6 0H-9 M6 0H9 M4.2 -4.2L6.4 -6.4 M-4.2 4.2L-6.4 6.4 M-4.2 -4.2L-6.4 -6.4 M4.2 4.2L6.4 6.4',
        stroke: 1.6,
      },
    ],
  },
  balloon: {
    box: [-6, -10, 12, 22],
    parts: [
      { d: ell(0, -4, 5, 6) + 'M-1 2L1 2L0 3.5Z', fill: '#000' },
      { d: 'M0 3.5C2 6 -2 8 0 12', stroke: 0.8 },
    ],
  },
  mushroom: {
    box: [-9, -8, 18, 16],
    parts: [
      { d: 'M-9 0C-9 -9 9 -9 9 0Z', fill: '#000' },
      { d: 'M-3 0H3L2.5 7H-2.5Z', fill: '#fff', stroke: 1.2 },
      {
        d: circ(-4, -3, 1.3) + circ(2, -5, 1.2) + circ(5, -2, 1),
        fill: '#fff',
      },
    ],
  },
  sparkle: {
    box: [-10, -10, 20, 20],
    parts: [
      {
        d: 'M0 -10C1 -2 2 -1 10 0C2 1 1 2 0 10C-1 2 -2 1 -10 0C-2 -1 -1 -2 0 -10Z',
        fill: '#000',
      },
    ],
  },
  heartArrow: {
    box: [-13, -10, 26, 20],
    parts: [
      { d: 'M0 7C-11 -1 -8 -10 0 -4C8 -10 11 -1 0 7Z', fill: '#000' },
      { d: 'M-12 7L11 -6 M-12 7L-12 4 M-12 7L-9 7', stroke: 1.4 },
      { d: 'M12.5 -7L8 -6.5L10.5 -3Z', fill: '#000' },
    ],
  },
} satisfies Record<string, Motif>

export type MotifName = keyof typeof MOTIFS

const pathCache = new Map<string, Path2D>()
const path = (d: string) => {
  let p = pathCache.get(d)
  if (!p) {
    p = new Path2D(d)
    pathCache.set(d, p)
  }
  return p
}

/**
 * Draw a motif centred on (cx, cy), its larger side `size` dots long,
 * turned by `rotDeg`.
 */
export const drawMotif = (
  ctx: CanvasRenderingContext2D,
  name: MotifName,
  cx: number,
  cy: number,
  size: number,
  rotDeg = 0,
): void => {
  const m: Motif = MOTIFS[name]
  const [bx, by, bw, bh] = m.box
  const k = size / Math.max(bw, bh)
  ctx.save()
  ctx.translate(cx, cy)
  if (rotDeg) ctx.rotate((rotDeg * Math.PI) / 180)
  ctx.scale(k, k)
  ctx.translate(-(bx + bw / 2), -(by + bh / 2))
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const part of m.parts) {
    const p = path(part.d)
    if (part.fill) {
      ctx.fillStyle = part.fill
      ctx.fill(p)
    }
    if (part.stroke) {
      ctx.strokeStyle = part.strokeColor ?? '#000'
      ctx.lineWidth = part.stroke
      ctx.stroke(p)
    }
  }
  ctx.restore()
}

/** Size in dots of a motif box side, for laying motifs out. */
export const motifAspect = (name: MotifName): number => {
  const [, , w, h] = MOTIFS[name].box
  return w / h
}
