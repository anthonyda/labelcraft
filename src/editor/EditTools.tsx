/** Editing tool groups shared by the desktop toolbar and the phone Edit sheet (T3.4). */
import { useScreenScale } from '../ui/calibration'
import { setMagnet, useMagnet } from './useMagnet'
import { CalibrateDialog } from '../ui/CalibrateDialog'
import { Button, Icon, type IconName } from '../ui/icons'
import { useEditorState, useEditorStore } from './useEditor'
import { useState, type ReactNode } from 'react'
import {
  ZOOM_EPS as EPS,
  ZOOM_MAX,
  ZOOM_MIN,
  formatZoom,
  parseZoomPercent,
  zoomStep,
  type Zoom,
} from './zoom'

export function EditTools({
  zoom,
  setZoom,
  afterFirstRow,
}: {
  /** Zoom in effect (real-size factor). */
  zoom: number
  setZoom: (z: Zoom) => void
  /** Shown between the first row (history, selection, zoom) and Arrange. */
  afterFirstRow?: ReactNode
}) {
  const store = useEditorStore()
  useEditorState() // re-render on changes
  const none = store.selection.length === 0
  const { calibrated } = useScreenScale()
  const magnet = useMagnet()
  const [calibrating, setCalibrating] = useState(false)
  const button = (
    name: string,
    icon: IconName,
    onClick: () => void,
    disabled = none,
    className?: string,
  ) => (
    <Button
      key={name}
      icon={icon}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {name}
    </Button>
  )

  return (
    <>
      {/* History, selection and zoom share one row. */}
      <div className="group-row">
        <span className="row-label" aria-hidden="true">
          Edit
        </span>
        <div className="group" role="group" aria-label="History">
          {button('Undo', 'undo', () => store.undo(), !store.canUndo)}
          {button('Redo', 'redo', () => store.redo(), !store.canRedo)}
        </div>
        <div className="group" role="group" aria-label="Selection">
          {button('Duplicate', 'duplicate', () => store.duplicateSelection())}
          {button(
            'Delete',
            'trash',
            () => store.deleteSelection(),
            none,
            'destructive',
          )}
        </div>
        {/* R26.AC3: snapping on or off. */}
        <div className="group" role="group" aria-label="Magnet">
          <Button
            icon="magnet"
            aria-pressed={magnet}
            className={magnet ? 'toggle-on' : undefined}
            title={
              magnet
                ? 'Magnet on: objects snap to edges and centres (hold Alt to move freely)'
                : 'Magnet off: objects move freely'
            }
            onClick={() => setMagnet(!magnet)}
          >
            Magnet
          </Button>
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
          <ZoomField zoom={zoom} setZoom={setZoom} />
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setZoom(zoomStep(zoom, 1))}
            disabled={zoom >= ZOOM_MAX - EPS}
          >
            <Icon name="zoomIn" />
          </button>
          <Button icon="fit" onClick={() => setZoom('fit')}>
            Fit
          </Button>
          {/* R4.AC8–AC9: 100%, the label's real size (exact once calibrated). */}
          <Button
            icon="actualSize"
            onClick={() => setZoom(1)}
            title={
              calibrated
                ? 'Show the label at its real size (100%)'
                : 'Approximate real size: calibrate this screen for an exact match'
            }
          >
            {calibrated ? 'Actual size' : 'Actual size (approx.)'}
          </Button>
          <Button icon="ruler" onClick={() => setCalibrating(true)}>
            Calibrate…
          </Button>
          <CalibrateDialog
            open={calibrating}
            onClose={() => setCalibrating(false)}
            label={store.doc.label}
          />
        </div>
      </div>
      {afterFirstRow}
      <div className="group" role="group" aria-label="Align to label">
        <span className="row-label" aria-hidden="true">
          Align
        </span>
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

/** R4.AC8: shows the zoom and takes any typed percentage (Enter or leave). */
function ZoomField({
  zoom,
  setZoom,
}: {
  zoom: number
  setZoom: (z: Zoom) => void
}) {
  const [draft, setDraft] = useState<string>()
  const commit = () => {
    if (draft === undefined) return
    const z = parseZoomPercent(draft)
    if (z !== undefined) setZoom(z)
    setDraft(undefined)
  }
  return (
    <input
      className="zoom-field"
      aria-label="Zoom level"
      inputMode="decimal"
      value={draft ?? formatZoom(zoom)}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setDraft(undefined)
      }}
    />
  )
}
