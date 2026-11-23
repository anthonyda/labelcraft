/** Undo/redo over immutable document snapshots (T1.4, R4.AC6). */
import type { LabelDoc } from './types'

export const HISTORY_LIMIT = 100

export type History = {
  past: LabelDoc[]
  present: LabelDoc
  future: LabelDoc[]
}

export const createHistory = (doc: LabelDoc): History => ({
  past: [],
  present: doc,
  future: [],
})

export const canUndo = (h: History): boolean => h.past.length > 0
export const canRedo = (h: History): boolean => h.future.length > 0

/** Record a new document state. Clears the redo stack. */
export const commit = (h: History, doc: LabelDoc): History => {
  if (doc === h.present) return h
  return {
    past: [...h.past, h.present].slice(-HISTORY_LIMIT),
    present: doc,
    future: [],
  }
}

export const undo = (h: History): History => {
  if (!canUndo(h)) return h
  return {
    past: h.past.slice(0, -1),
    present: h.past[h.past.length - 1],
    future: [h.present, ...h.future],
  }
}

export const redo = (h: History): History => {
  if (!canRedo(h)) return h
  return {
    past: [...h.past, h.present],
    present: h.future[0],
    future: h.future.slice(1),
  }
}
