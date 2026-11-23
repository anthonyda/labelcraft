/** Editor: toolbar, canvas, keyboard shortcuts and status line (M3). */
import { useEffect, useState } from 'react'
import { pxToMm } from '../model/units'
import { EditorCanvas } from './EditorCanvas'
import { commandForKey, isTypingTarget, type Command } from './shortcuts'
import type { EditorStore } from './store'
import { useEditorState, useEditorStore } from './useEditor'

const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8]

const run = (store: EditorStore, c: Command) => {
  switch (c.type) {
    case 'nudge':
      return store.nudgeSelection(c.dx, c.dy)
    case 'delete':
      return store.deleteSelection()
    case 'duplicate':
      return store.duplicateSelection()
    case 'copy':
      return store.copySelection()
    case 'paste':
      return store.paste()
    case 'undo':
      return store.undo()
    case 'redo':
      return store.redo()
    case 'selectAll':
      return store.selectAll()
    case 'deselect':
      return store.clearSelection()
  }
}

const fmt = (n: number) => n.toFixed(1)

function Toolbar({
  zoom,
  setZoom,
}: {
  zoom: number
  setZoom: (z: number) => void
}) {
  const store = useEditorStore()
  useEditorState() // re-render on changes
  const none = store.selection.length === 0
  const zoomIndex = ZOOM_STEPS.indexOf(zoom)

  return (
    <div className="toolbar" role="toolbar" aria-label="Editor tools">
      <div className="group" role="group" aria-label="History">
        <button
          type="button"
          onClick={() => store.undo()}
          disabled={!store.canUndo}
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => store.redo()}
          disabled={!store.canRedo}
        >
          Redo
        </button>
      </div>
      <div className="group" role="group" aria-label="Selection">
        <button
          type="button"
          onClick={() => store.duplicateSelection()}
          disabled={none}
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={() => store.deleteSelection()}
          disabled={none}
        >
          Delete
        </button>
      </div>
      <div className="group" role="group" aria-label="Arrange">
        <button
          type="button"
          onClick={() => store.reorderSelection('front')}
          disabled={none}
        >
          To front
        </button>
        <button
          type="button"
          onClick={() => store.reorderSelection('forward')}
          disabled={none}
        >
          Forward
        </button>
        <button
          type="button"
          onClick={() => store.reorderSelection('backward')}
          disabled={none}
        >
          Backward
        </button>
        <button
          type="button"
          onClick={() => store.reorderSelection('back')}
          disabled={none}
        >
          To back
        </button>
      </div>
      <div className="group" role="group" aria-label="Align to label">
        {(
          [
            ['left', 'Align left'],
            ['center', 'Align centre'],
            ['right', 'Align right'],
            ['top', 'Align top'],
            ['middle', 'Align middle'],
            ['bottom', 'Align bottom'],
          ] as const
        ).map(([edge, name]) => (
          <button
            key={edge}
            type="button"
            onClick={() => store.alignSelection(edge)}
            disabled={none}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="group" role="group" aria-label="Zoom">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setZoom(ZOOM_STEPS[Math.max(0, zoomIndex - 1)])}
          disabled={zoomIndex <= 0}
        >
          −
        </button>
        <output aria-label="Zoom level">{Math.round(zoom * 100)}%</output>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() =>
            setZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, zoomIndex + 1)])
          }
          disabled={zoomIndex >= ZOOM_STEPS.length - 1}
        >
          +
        </button>
        <button type="button" onClick={() => setZoom(1)}>
          Fit
        </button>
      </div>
    </div>
  )
}

function StatusLine() {
  const { history, selection } = useEditorState()
  const doc = history.present
  const selected = doc.objects.filter((o) => selection.includes(o.id))
  const one = selected.length === 1 ? selected[0] : undefined
  return (
    <p className="status" data-testid="editor-status" aria-live="polite">
      {doc.objects.length} objects · {selection.length} selected
      {one && (
        <>
          {' · '}
          {one.type} at {fmt(one.x)}, {fmt(one.y)} mm · {fmt(one.width)} ×{' '}
          {fmt(one.height)} mm · {Math.round(one.rotation)}°
        </>
      )}
    </p>
  )
}

export function Editor() {
  const store = useEditorStore()
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      if (document.querySelector('dialog:modal')) return
      const command = commandForKey(e)
      if (!command) return
      e.preventDefault()
      run(store, command)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store])

  const doc = store.doc
  return (
    <section className="panel editor" aria-labelledby="editor-title">
      <h2 id="editor-title">
        Label{' '}
        <small>
          {doc.label.widthMm} × {doc.label.heightMm} mm ·{' '}
          {fmt(pxToMm(1, doc.label.dpi) * 1000)} µm per dot
        </small>
      </h2>
      <Toolbar zoom={zoom} setZoom={setZoom} />
      <EditorCanvas zoom={zoom} />
      <StatusLine />
    </section>
  )
}
