/** Editing tool groups shared by the desktop toolbar and the phone Edit sheet (T3.4). */
import { Button, Icon, type IconName } from '../ui/icons'
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
  const button = (
    name: string,
    icon: IconName,
    onClick: () => void,
    disabled = none,
  ) => (
    <Button key={name} icon={icon} onClick={onClick} disabled={disabled}>
      {name}
    </Button>
  )

  return (
    <>
      {/* History, selection and zoom share one row. */}
      <div className="group-row">
        <div className="group" role="group" aria-label="History">
          {button('Undo', 'undo', () => store.undo(), !store.canUndo)}
          {button('Redo', 'redo', () => store.redo(), !store.canRedo)}
        </div>
        <div className="group" role="group" aria-label="Selection">
          {button('Duplicate', 'duplicate', () => store.duplicateSelection())}
          {button('Delete', 'trash', () => store.deleteSelection())}
        </div>
        <div className="group" role="group" aria-label="Zoom">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setZoom(zoomStep(zoom, -1))}
            disabled={zoom <= ZOOM_MIN + EPS}
          >
            <Icon name="zoomOut" />
          </button>
          <output aria-label="Zoom level">{Math.round(zoom * 100)}%</output>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setZoom(zoomStep(zoom, 1))}
            disabled={zoom >= ZOOM_MAX - EPS}
          >
            <Icon name="zoomIn" />
          </button>
          <Button icon="fit" onClick={() => setZoom(1)}>
            Fit
          </Button>
        </div>
      </div>
      <div className="group" role="group" aria-label="Arrange">
        {button('To front', 'toFront', () => store.reorderSelection('front'))}
        {button('Forward', 'forward', () => store.reorderSelection('forward'))}
        {button('Backward', 'backward', () =>
          store.reorderSelection('backward'),
        )}
        {button('To back', 'toBack', () => store.reorderSelection('back'))}
      </div>
      <div className="group" role="group" aria-label="Align to label">
        {button('Align left', 'alignLeft', () => store.alignSelection('left'))}
        {button('Align centre', 'alignCentre', () =>
          store.alignSelection('center'),
        )}
        {button('Align right', 'alignRight', () =>
          store.alignSelection('right'),
        )}
        {button('Align top', 'alignTop', () => store.alignSelection('top'))}
        {button('Align middle', 'alignMiddle', () =>
          store.alignSelection('middle'),
        )}
        {button('Align bottom', 'alignBottom', () =>
          store.alignSelection('bottom'),
        )}
      </div>
    </>
  )
}
