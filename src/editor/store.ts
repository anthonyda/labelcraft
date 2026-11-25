/**
 * Editor state: the document with undo/redo history, the selection and an
 * internal clipboard. Plain TypeScript with subscribe/getState so React reads
 * it through useSyncExternalStore and tests run without a UI.
 */
import { createObject, newId } from '../model/factory'
import {
  canRedo,
  canUndo,
  commit,
  createHistory,
  redo,
  replacePresent,
  undo,
  type History,
} from '../model/history'
import {
  alignObjects,
  deleteObjects,
  duplicateObjects,
  reorderObjects,
  moveObject,
  setLabelSetup,
  turnLabel,
  updateObject,
  type AlignEdge,
  type ReorderDirection,
} from '../model/ops'
import type {
  LabelDoc,
  LabelObject,
  LabelSetup,
  ObjectType,
} from '../model/types'
import { pxToMm } from '../model/units'
import { minBarcodeWidthMm } from '../render/codes'

export type EditorState = {
  history: History
  /** Selected object ids, in selection order. */
  selection: string[]
  clipboard: LabelObject[]
  /** How many times the clipboard has been pasted (offsets each paste). */
  pasteCount: number
  file: FileInfo
  /** Increases each time a document is loaded (new, open, import, restore). */
  loads: number
  /** Latest notice to show (R8.AC5), until dismissed or replaced. */
  notice?: EditorNotice
}

/** Which named label is being edited, and the state it was last saved in. */
export type FileInfo = {
  labelId?: string
  name?: string
  /** Document as last saved/opened; differs from the present when edited. */
  savedDoc?: LabelDoc
}

export type ObjectPatch = { id: string; patch: Partial<LabelObject> }

/** Offset for duplicate and paste, in mm. */
export const COPY_OFFSET_MM = 2

/**
 * A barcode narrower than one printer dot per bar can't be drawn and showed
 * up blank. Widen it to its narrowest printable width, keeping its centre.
 */
const keepBarcodesPrintable = (
  doc: LabelDoc,
): { doc: LabelDoc; widenedTo?: number } => {
  let widenedTo: number | undefined
  const objects = doc.objects.map((o) => {
    if (o.type !== 'barcode') return o
    const min = minBarcodeWidthMm(o.content, o.format, doc.label.dpi)
    if (min === undefined || o.width >= min) return o
    widenedTo = min
    return { ...o, x: o.x - (min - o.width) / 2, width: min }
  })
  return widenedTo === undefined
    ? { doc }
    : { doc: { ...doc, objects }, widenedTo }
}

/** A short message for the user, e.g. why something changed by itself. */
export type EditorNotice = { id: number; message: string }

export class EditorStore {
  private state: EditorState
  /** Key of the last merged edit; consecutive edits with it share one undo step. */
  private mergeKey?: string
  private listeners = new Set<() => void>()

  constructor(doc: LabelDoc) {
    this.state = {
      history: createHistory(doc),
      selection: [],
      loads: 0,
      clipboard: [],
      pasteCount: 0,
      file: { savedDoc: doc },
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

  /**
   * Record a new document state (one undo step). With `mergeKey`, consecutive
   * edits with the same key (e.g. typing in one field) share a single step.
   */
  apply(
    doc: LabelDoc,
    selection = this.state.selection,
    mergeKey?: string,
  ): void {
    const kept = keepBarcodesPrintable(doc)
    doc = kept.doc
    const merge = mergeKey !== undefined && mergeKey === this.mergeKey
    this.mergeKey = mergeKey
    this.set({
      history: merge
        ? replacePresent(this.state.history, doc)
        : commit(this.state.history, doc),
      selection: this.validSelection(doc, selection),
      // R8.AC5: say why the barcode grew back by itself.
      ...(kept.widenedTo !== undefined && {
        notice: {
          id: (this.state.notice?.id ?? 0) + 1,
          message: `Barcode widened to ${kept.widenedTo.toFixed(1)} mm: each bar needs at least one printer dot, so it can't be narrower. Shorten its content to make it smaller.`,
        },
      }),
    })
  }

  /** Add a new object of `type` (or a prepared one), centred, and select it. */
  addObject(typeOrObject: ObjectType | LabelObject): string {
    const o =
      typeof typeOrObject === 'string'
        ? createObject(typeOrObject, this.doc.label)
        : typeOrObject
    this.apply({ ...this.doc, objects: [...this.doc.objects, o] }, [o.id])
    return o.id
  }

  /** Edit one object's properties (R9.AC2); repeated edits of a field merge. */
  updateObject(
    id: string,
    patch: Partial<LabelObject>,
    mergeKey?: string,
  ): void {
    this.apply(
      updateObject(this.doc, id, patch),
      this.state.selection,
      mergeKey,
    )
  }

  dismissNotice(): void {
    this.set({ notice: undefined })
  }

  /** R22: switch between landscape and portrait, turning the design. */
  turnLabel(): void {
    this.apply(turnLabel(this.doc))
  }

  /** Label size / dpi (R3); objects are kept unchanged (R3.AC4). */
  setLabel(label: Partial<LabelSetup>, mergeKey?: string): void {
    this.apply(setLabelSetup(this.doc, label), this.state.selection, mergeKey)
  }

  /** True when the label has changes not saved as a named label. */
  get isDirty(): boolean {
    return this.state.history.present !== this.state.file.savedDoc
  }

  /**
   * Replace the whole document, clearing history (new, open, import, restore).
   * `dirty` marks it as not saved under its name yet.
   */
  load(
    doc: LabelDoc,
    file: { labelId?: string; name?: string } = {},
    dirty = false,
  ): void {
    this.mergeKey = undefined
    this.set({
      history: createHistory(doc),
      selection: [],
      file: { ...file, savedDoc: dirty ? undefined : doc },
      loads: this.state.loads + 1,
    })
  }

  /** The present document was saved as the named label `labelId`. */
  markSaved(labelId: string, name: string): void {
    this.set({ file: { labelId, name, savedDoc: this.doc } })
  }

  /** R10.AC5: the label's name changed (saved state unchanged). */
  renameFile(name: string): void {
    this.set({ file: { ...this.state.file, name } })
  }

  /** The named label was deleted: keep editing, but it is no longer saved. */
  forgetLabel(labelId: string): void {
    if (this.state.file.labelId !== labelId) return
    this.set({ file: { name: this.state.file.name } })
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
    this.mergeKey = undefined
    const history = undo(this.state.history)
    this.set({
      history,
      selection: this.validSelection(history.present, this.state.selection),
    })
  }

  redo(): void {
    this.mergeKey = undefined
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

  /** R21.AC9: move a layer to a drawing index (0 = back); one undo step. */
  moveObject(id: string, index: number): void {
    const doc = moveObject(this.doc, id, index)
    if (doc !== this.doc) this.apply(doc)
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
