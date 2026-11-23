/**
 * Editor state: the document with undo/redo history, the selection and an
 * internal clipboard. Plain TypeScript with subscribe/getState so React reads
 * it through useSyncExternalStore and tests run without a UI.
 */
import { newId } from '../model/factory'
import {
  canRedo,
  canUndo,
  commit,
  createHistory,
  redo,
  undo,
  type History,
} from '../model/history'
import {
  alignObjects,
  deleteObjects,
  duplicateObjects,
  reorderObjects,
  updateObject,
  type AlignEdge,
  type ReorderDirection,
} from '../model/ops'
import type { LabelDoc, LabelObject } from '../model/types'
import { pxToMm } from '../model/units'

export type EditorState = {
  history: History
  /** Selected object ids, in selection order. */
  selection: string[]
  clipboard: LabelObject[]
  /** How many times the clipboard has been pasted (offsets each paste). */
  pasteCount: number
}

export type ObjectPatch = { id: string; patch: Partial<LabelObject> }

/** Offset for duplicate and paste, in mm. */
export const COPY_OFFSET_MM = 2

export class EditorStore {
  private state: EditorState
  private listeners = new Set<() => void>()

  constructor(doc: LabelDoc) {
    this.state = {
      history: createHistory(doc),
      selection: [],
      clipboard: [],
      pasteCount: 0,
    }
  }

  getState = (): EditorState => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  get doc(): LabelDoc {
    return this.state.history.present
  }

  get selection(): string[] {
    return this.state.selection
  }

  get canUndo(): boolean {
    return canUndo(this.state.history)
  }

  get canRedo(): boolean {
    return canRedo(this.state.history)
  }

  private set(patch: Partial<EditorState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l())
  }

  /** Keep only ids that still exist in the document. */
  private validSelection(doc: LabelDoc, ids: string[]): string[] {
    const existing = new Set(doc.objects.map((o) => o.id))
    return ids.filter((id) => existing.has(id))
  }

  /** Record a new document state (one undo step). */
  apply(doc: LabelDoc, selection = this.state.selection): void {
    this.set({
      history: commit(this.state.history, doc),
      selection: this.validSelection(doc, selection),
    })
  }

  /** Replace the whole document, clearing history (e.g. opening a file). */
  load(doc: LabelDoc): void {
    this.set({ history: createHistory(doc), selection: [] })
  }

  select(ids: string[]): void {
    this.set({ selection: this.validSelection(this.doc, ids) })
  }

  toggleSelected(id: string): void {
    const sel = this.state.selection
    this.select(sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id])
  }

  selectAll(): void {
    this.select(this.doc.objects.map((o) => o.id))
  }

  clearSelection(): void {
    if (this.state.selection.length) this.set({ selection: [] })
  }

  undo(): void {
    const history = undo(this.state.history)
    this.set({
      history,
      selection: this.validSelection(history.present, this.state.selection),
    })
  }

  redo(): void {
    const history = redo(this.state.history)
    this.set({
      history,
      selection: this.validSelection(history.present, this.state.selection),
    })
  }

  /** Several object changes as one undo step (drag, transform). */
  updateObjects(patches: ObjectPatch[]): void {
    if (!patches.length) return
    let doc = this.doc
    for (const { id, patch } of patches) doc = updateObject(doc, id, patch)
    this.apply(doc)
  }

  /** Move the selection by whole printer pixels (R4.AC2 arrow keys). */
  nudgeSelection(dxPx: number, dyPx: number): void {
    const dpi = this.doc.label.dpi
    const dx = pxToMm(dxPx, dpi)
    const dy = pxToMm(dyPx, dpi)
    this.updateObjects(
      this.doc.objects
        .filter((o) => this.state.selection.includes(o.id))
        .map((o) => ({ id: o.id, patch: { x: o.x + dx, y: o.y + dy } })),
    )
  }

  deleteSelection(): void {
    if (!this.state.selection.length) return
    this.apply(deleteObjects(this.doc, this.state.selection), [])
  }

  duplicateSelection(): void {
    if (!this.state.selection.length) return
    const { doc, newIds } = duplicateObjects(
      this.doc,
      this.state.selection,
      COPY_OFFSET_MM,
    )
    this.apply(doc, newIds)
  }

  copySelection(): void {
    const clipboard = this.doc.objects.filter((o) =>
      this.state.selection.includes(o.id),
    )
    if (clipboard.length) this.set({ clipboard, pasteCount: 0 })
  }

  /** Paste copies on top, each paste offset a bit further. */
  paste(): void {
    const { clipboard } = this.state
    if (!clipboard.length) return
    const offset = COPY_OFFSET_MM * (this.state.pasteCount + 1)
    const copies = clipboard.map((o) => ({
      ...o,
      id: newId(),
      x: o.x + offset,
      y: o.y + offset,
    }))
    this.apply(
      { ...this.doc, objects: [...this.doc.objects, ...copies] },
      copies.map((c) => c.id),
    )
    this.set({ pasteCount: this.state.pasteCount + 1 })
  }

  reorderSelection(direction: ReorderDirection): void {
    if (!this.state.selection.length) return
    this.apply(reorderObjects(this.doc, this.state.selection, direction))
  }

  alignSelection(edge: AlignEdge): void {
    if (!this.state.selection.length) return
    this.apply(alignObjects(this.doc, this.state.selection, edge))
  }
}
