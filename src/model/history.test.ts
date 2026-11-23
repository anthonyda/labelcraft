import { describe, expect, it } from 'vitest'
import { newDoc } from './factory'
import {
  HISTORY_LIMIT,
  canRedo,
  canUndo,
  commit,
  createHistory,
  redo,
  undo,
} from './history'
import { setLabelSetup } from './ops'

const docW = (w: number) => setLabelSetup(newDoc(), { widthMm: w })

// T1.4 / R4.AC6: undo/redo with at least 50 steps.
describe('history', () => {
  it('starts with nothing to undo or redo', () => {
    const h = createHistory(docW(1))
    expect(canUndo(h)).toBe(false)
    expect(canRedo(h)).toBe(false)
  })

  it('undoes and redoes', () => {
    let h = createHistory(docW(1))
    h = commit(h, docW(2))
    h = commit(h, docW(3))
    h = undo(h)
    expect(h.present.label.widthMm).toBe(2)
    h = undo(h)
    expect(h.present.label.widthMm).toBe(1)
    h = redo(h)
    expect(h.present.label.widthMm).toBe(2)
  })

  it('clears redo after a new change', () => {
    let h = createHistory(docW(1))
    h = commit(h, docW(2))
    h = undo(h)
    h = commit(h, docW(5))
    expect(canRedo(h)).toBe(false)
    expect(h.present.label.widthMm).toBe(5)
  })

  it('is a no-op when there is nothing to undo or redo', () => {
    const h = createHistory(docW(1))
    expect(undo(h)).toBe(h)
    expect(redo(h)).toBe(h)
  })

  it('ignores commits that do not change the document', () => {
    const h = createHistory(docW(1))
    expect(commit(h, h.present)).toBe(h)
  })

  it(`keeps at least ${HISTORY_LIMIT} undo steps and drops the oldest`, () => {
    expect(HISTORY_LIMIT).toBeGreaterThanOrEqual(50)
    let h = createHistory(docW(0))
    for (let i = 1; i <= HISTORY_LIMIT + 10; i++) h = commit(h, docW(i))
    let steps = 0
    while (canUndo(h)) {
      h = undo(h)
      steps++
    }
    expect(steps).toBe(HISTORY_LIMIT)
    expect(h.present.label.widthMm).toBe(10)
  })
})
