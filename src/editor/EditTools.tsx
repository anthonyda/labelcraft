/** Editing tool groups shared by the desktop toolbar and the phone Edit sheet (T3.4). */
import { useEditorState, useEditorStore } from './useEditor'
import { ZOOM_EPS as EPS, ZOOM_MAX, ZOOM_MIN, zoomStep } from './zoom'

export function EditTools({
  zoom,
  setZoom,
}: {
  zoom: number
  setZoom: (z: number) => void
}) {
  const store = useEditorStore()
  useEditorState() // re-render on changes
  const none = store.selection.length === 0
  const button = (name: string, onClick: () => void, disabled = none) => (
    <button key={name} type="button" onClick={onClick} disabled={disabled}>
      {name}
    </button>
  )

  return (
    <>
      <div className="group" role="group" aria-label="History">
        {button('Undo', () => store.undo(), !store.canUndo)}
        {button('Redo', () => store.redo(), !store.canRedo)}
      </div>
      <div className="group" role="group" aria-label="Selection">
        {button('Duplicate', () => store.duplicateSelection())}
        {button('Delete', () => store.deleteSelection())}
      </div>
      <div className="group" role="group" aria-label="Arrange">
        {button('To front', () => store.reorderSelection('front'))}
        {button('Forward', () => store.reorderSelection('forward'))}
        {button('Backward', () => store.reorderSelection('backward'))}
        {button('To back', () => store.reorderSelection('back'))}
      </div>
      <div className="group" role="group" aria-label="Align to label">
        {button('Align left', () => store.alignSelection('left'))}
        {button('Align centre', () => store.alignSelection('center'))}
        {button('Align right', () => store.alignSelection('right'))}
        {button('Align top', () => store.alignSelection('top'))}
        {button('Align middle', () => store.alignSelection('middle'))}
        {button('Align bottom', () => store.alignSelection('bottom'))}
      </div>
      <div className="group" role="group" aria-label="Zoom">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setZoom(zoomStep(zoom, -1))}
          disabled={zoom <= ZOOM_MIN + EPS}
        >
          −
        </button>
        <output aria-label="Zoom level">{Math.round(zoom * 100)}%</output>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setZoom(zoomStep(zoom, 1))}
          disabled={zoom >= ZOOM_MAX - EPS}
        >
          +
        </button>
        <button type="button" onClick={() => setZoom(1)}>
          Fit
        </button>
      </div>
    </>
  )
}
