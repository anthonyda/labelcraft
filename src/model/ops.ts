/**
 * Pure document operations (T1.3). Each returns a new document and never
 * mutates its input, so history (T1.4) can keep snapshots cheaply.
 */
import { newId } from './factory'
import type { LabelDoc, LabelObject, LabelSetup } from './types'

type Patch = Partial<Omit<LabelObject, 'id' | 'type'>>

export const addObject = (doc: LabelDoc, obj: LabelObject): LabelDoc => ({
  ...doc,
  objects: [...doc.objects, obj],
})

export const updateObject = (
  doc: LabelDoc,
  id: string,
  patch: Patch,
): LabelDoc => ({
  ...doc,
  objects: doc.objects.map((o) =>
    o.id === id ? ({ ...o, ...patch } as LabelObject) : o,
  ),
})

export const deleteObjects = (doc: LabelDoc, ids: string[]): LabelDoc => ({
  ...doc,
  objects: doc.objects.filter((o) => !ids.includes(o.id)),
})

/** Copies of the given objects, offset by `offsetMm`, placed on top. */
export const duplicateObjects = (
  doc: LabelDoc,
  ids: string[],
  offsetMm = 2,
): { doc: LabelDoc; newIds: string[] } => {
  const copies = doc.objects
    .filter((o) => ids.includes(o.id))
    .map((o) => ({
      ...o,
      id: newId(),
      x: o.x + offsetMm,
      y: o.y + offsetMm,
    }))
  return {
    doc: { ...doc, objects: [...doc.objects, ...copies] },
    newIds: copies.map((c) => c.id),
  }
}

export type ReorderDirection = 'forward' | 'backward' | 'front' | 'back'

export const reorderObjects = (
  doc: LabelDoc,
  ids: string[],
  direction: ReorderDirection,
): LabelDoc => {
  const objs = [...doc.objects]
  const selected = (o: LabelObject) => ids.includes(o.id)

  if (direction === 'front' || direction === 'back') {
    const picked = objs.filter(selected)
    const rest = objs.filter((o) => !selected(o))
    return {
      ...doc,
      objects:
        direction === 'front' ? [...rest, ...picked] : [...picked, ...rest],
    }
  }

  if (direction === 'forward') {
    for (let i = objs.length - 2; i >= 0; i--) {
      if (selected(objs[i]) && !selected(objs[i + 1])) {
        ;[objs[i], objs[i + 1]] = [objs[i + 1], objs[i]]
      }
    }
  } else {
    for (let i = 1; i < objs.length; i++) {
      if (selected(objs[i]) && !selected(objs[i - 1])) {
        ;[objs[i], objs[i - 1]] = [objs[i - 1], objs[i]]
      }
    }
  }
  return { ...doc, objects: objs }
}

export type Bounds = {
  left: number
  top: number
  right: number
  bottom: number
}

/** Axis-aligned bounds of an object after rotation around its centre. */
export const boundingBox = (o: LabelObject): Bounds => {
  const cx = o.x + o.width / 2
  const cy = o.y + o.height / 2
  const rad = (o.rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const halfW = (o.width * cos + o.height * sin) / 2
  const halfH = (o.width * sin + o.height * cos) / 2
  return {
    left: cx - halfW,
    top: cy - halfH,
    right: cx + halfW,
    bottom: cy + halfH,
  }
}

export type AlignEdge =
  'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'

/** Align each object to the label edge or centre by its visible bounds (R4.AC5). */
export const alignObjects = (
  doc: LabelDoc,
  ids: string[],
  edge: AlignEdge,
): LabelDoc => {
  const { widthMm: W, heightMm: H } = doc.label
  return {
    ...doc,
    objects: doc.objects.map((o) => {
      if (!ids.includes(o.id)) return o
      const b = boundingBox(o)
      switch (edge) {
        case 'left':
          return { ...o, x: o.x - b.left }
        case 'center':
          return { ...o, x: o.x + (W - (b.left + b.right)) / 2 }
        case 'right':
          return { ...o, x: o.x + (W - b.right) }
        case 'top':
          return { ...o, y: o.y - b.top }
        case 'middle':
          return { ...o, y: o.y + (H - (b.top + b.bottom)) / 2 }
        case 'bottom':
          return { ...o, y: o.y + (H - b.bottom) }
      }
    }),
  }
}

/** Change label size or dpi; objects keep their position and size (R3.AC4). */
export const setLabelSetup = (
  doc: LabelDoc,
  label: Partial<LabelSetup>,
): LabelDoc => ({ ...doc, label: { ...doc.label, ...label } })

/** Landscape (wider than tall, or square) or portrait (R22.AC1). */
export const orientationOf = (label: {
  widthMm: number
  heightMm: number
}): 'landscape' | 'portrait' =>
  label.widthMm >= label.heightMm ? 'landscape' : 'portrait'

const normalAngle = (deg: number) => ((deg % 360) + 360) % 360

/**
 * R22.AC2–AC3: turn the label and its whole design 90°: clockwise when it
 * becomes turned, counter-clockwise back. Turning twice restores the design.
 */
export const turnLabel = (doc: LabelDoc): LabelDoc => {
  const { widthMm: W, heightMm: H } = doc.label
  const clockwise = !doc.label.turned
  const objects = doc.objects.map((o) => {
    const cx = o.x + o.width / 2
    const cy = o.y + o.height / 2
    // Clockwise: (x, y) → (H − y, x). Counter-clockwise: (x, y) → (y, W − x).
    const nx = clockwise ? H - cy : cy
    const ny = clockwise ? cx : W - cx
    return {
      ...o,
      x: nx - o.width / 2,
      y: ny - o.height / 2,
      rotation: normalAngle(o.rotation + (clockwise ? 90 : -90)),
    }
  })
  return {
    ...doc,
    label: { ...doc.label, widthMm: H, heightMm: W, turned: clockwise },
    objects,
  }
}
