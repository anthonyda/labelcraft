/**
 * Editor shell (M3, M6). Desktop (≥ 900 px): toolbar on top, canvas in the
 * middle, properties on the side. Phone: the canvas fills the screen and the
 * tools live in a bottom bar whose panels open as bottom sheets (R15).
 */
import { useEffect, useState, type ReactNode } from 'react'
import { pxToMm } from '../model/units'
import type { AutosaveStatus } from '../storage/useAutosave'
import { Icon, Logo, type IconName } from '../ui/icons'
import { Sheet } from '../ui/Sheet'
import { PHONE_QUERY, useMediaQuery } from '../ui/useMediaQuery'
import { AddMenu } from './AddMenu'
import { EditTools } from './EditTools'
import { EditorCanvas } from './EditorCanvas'
import { FileMenu, FileStatus } from './FileMenu'
import { LayersPanel } from './LayersPanel'
import { imageObjectFromFile, isImageFile } from './images'
import { PropertiesPanel } from './PropertiesPanel'
import { commandForKey, isTypingTarget, type Command } from './shortcuts'
import type { EditorStore } from './store'
import type { Zoom } from './zoom'
import { useEditorState, useEditorStore, useObjectsOutside } from './useEditor'

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

function StatusLine() {
  const { history, selection } = useEditorState()
  const doc = history.present
  const selected = doc.objects.filter((o) => selection.includes(o.id))
  const one = selected.length === 1 ? selected[0] : undefined
  const outside = useObjectsOutside(doc).length
  return (
    <div className="status-line">
      <span id="editor-title" className="label-size">
        {doc.label.widthMm} × {doc.label.heightMm} mm ·{' '}
        {fmt(pxToMm(1, doc.label.dpi) * 1000)} µm per dot
      </span>
      <p className="status" data-testid="editor-status" aria-live="polite">
        {outside > 0 && (
          <strong className="outside">{outside} outside the label · </strong>
        )}
        {doc.objects.length} objects · {selection.length} selected
        {one && (
          <>
            {' · '}
            {one.type} at {fmt(one.x)}, {fmt(one.y)} mm · {fmt(one.width)} ×{' '}
            {fmt(one.height)} mm · {Math.round(one.rotation)}°
          </>
        )}
      </p>
    </div>
  )
}

type Panel = 'labels' | 'add' | 'layers' | 'edit' | 'properties'

const PANELS: [Panel, string, IconName][] = [
  ['labels', 'Labels', 'labels'],
  ['add', 'Add', 'add'],
  ['layers', 'Layers', 'layers'],
  ['edit', 'Edit', 'edit'],
  ['properties', 'Properties', 'properties'],
]

export function Editor({
  autosave,
  headerActions,
}: {
  autosave: AutosaveStatus
  /** Printer and print buttons, shown in the header. */
  headerActions: ReactNode
}) {
  const store = useEditorStore()
  // R4.AC1, AC8: real-size zoom; a new or opened label starts at Fit.
  const [zoomSetting, setZoom] = useState<Zoom>('fit')
  const [fitZoom, setFitZoom] = useState(1)
  const zoom = zoomSetting === 'fit' ? fitZoom : zoomSetting
  const { loads } = useEditorState()
  const [seenLoads, setSeenLoads] = useState(loads)
  if (loads !== seenLoads) {
    setSeenLoads(loads)
    setZoom('fit')
  }
  const phone = useMediaQuery(PHONE_QUERY)
  const [panel, setPanel] = useState<Panel>()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      if (document.querySelector('dialog:modal')) return
      const command = commandForKey(e)
      if (!command) return
      e.preventDefault()
      run(store, command)
    }
    // T4.3 / R6.AC1: paste an image from the clipboard.
    const onPaste = (e: ClipboardEvent) => {
      if (isTypingTarget(e.target)) return
      if (document.querySelector('dialog:modal')) return
      const file = Array.from(e.clipboardData?.files ?? []).find(isImageFile)
      if (!file) return
      e.preventDefault()
      imageObjectFromFile(file, store.doc.label)
        .then((o) => store.addObject(o))
        .catch(() => undefined)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('paste', onPaste)
    }
  }, [store])

  const togglePanel = (p: Panel) =>
    setPanel((cur) => (cur === p ? undefined : p))

  return (
    <div className={`app ${phone ? 'phone' : 'desktop'}`}>
      <header className="app-header">
        <h1 className="brand">
          <Logo />
          labelcraft
        </h1>
        <FileStatus autosave={autosave} />
        <div className="header-actions">{headerActions}</div>
      </header>

      {!phone && (
        <div className="toolbar" role="toolbar" aria-label="Editor tools">
          <FileMenu />
          <AddMenu />
          <EditTools zoom={zoom} setZoom={setZoom} />
        </div>
      )}

      <div className="workspace">
        {!phone && (
          <aside className="layers" aria-labelledby="layers-title">
            <h2 id="layers-title">Layers</h2>
            <LayersPanel />
          </aside>
        )}
        <div className="editor-main">
          <EditorCanvas zoom={zoom} setZoom={setZoom} onFitZoom={setFitZoom} />
          <StatusLine />
        </div>
        {!phone && <PropertiesPanel />}
      </div>

      {phone && (
        <>
          <Sheet
            id="sheet-labels"
            title="Labels"
            open={panel === 'labels'}
            onClose={() => setPanel(undefined)}
          >
            <FileMenu />
          </Sheet>
          <Sheet
            id="sheet-add"
            title="Add"
            open={panel === 'add'}
            onClose={() => setPanel(undefined)}
          >
            <AddMenu onAdded={() => setPanel(undefined)} />
          </Sheet>
          <Sheet
            id="sheet-layers"
            title="Layers"
            open={panel === 'layers'}
            onClose={() => setPanel(undefined)}
          >
            <LayersPanel onPicked={() => setPanel(undefined)} />
          </Sheet>
          <Sheet
            id="sheet-edit"
            title="Edit"
            open={panel === 'edit'}
            onClose={() => setPanel(undefined)}
          >
            <div className="toolbar" role="toolbar" aria-label="Editor tools">
              <EditTools zoom={zoom} setZoom={setZoom} />
            </div>
          </Sheet>
          <Sheet
            id="sheet-properties"
            title="Properties"
            open={panel === 'properties'}
            onClose={() => setPanel(undefined)}
          >
            <PropertiesPanel />
          </Sheet>
          <nav className="bottom-bar" aria-label="Editor panels">
            {PANELS.map(([p, name, icon]) => (
              <button
                key={p}
                type="button"
                aria-expanded={panel === p}
                aria-controls={`sheet-${p}`}
                className={panel === p ? 'active' : undefined}
                onClick={() => togglePanel(p)}
              >
                <Icon name={icon} />
                {name}
              </button>
            ))}
          </nav>
        </>
      )}

      <p className="notice">
        Independent project, not affiliated with or endorsed by NIIMBOT. ·{' '}
        <a
          className="build"
          href={`https://github.com/anthonyda/labelcraft/commit/${__BUILD_COMMIT__}`}
          data-testid="build-commit"
        >
          Build {__BUILD_COMMIT__.slice(0, 7)}
        </a>
      </p>
    </div>
  )
}
