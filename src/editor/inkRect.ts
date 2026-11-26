import type Konva from 'konva'
import { inkOutline } from '../render/inkBounds'

/**
 * R26.AC1: the box of an object's ink (black pixels, after rotation) in label
 * dots, or undefined when it has none.
 */
export const inkRect = (n: Konva.Node) => {
  const img = (n as Konva.Image).image?.() as HTMLCanvasElement | undefined
  if (!(img instanceof HTMLCanvasElement) || !img.width || !img.height) {
    return undefined
  }
  const points = inkOutline(img)
  if (!points.length) return undefined
  const kx = n.width() / img.width
  const ky = n.height() / img.height
  const t = n.getTransform()
  let x1 = Infinity
  let y1 = Infinity
  let x2 = -Infinity
  let y2 = -Infinity
  for (const p of points) {
    const q = t.point({ x: p.x * kx, y: p.y * ky })
    x1 = Math.min(x1, q.x)
    y1 = Math.min(y1, q.y)
    x2 = Math.max(x2, q.x)
    y2 = Math.max(y2, q.y)
  }
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
}
