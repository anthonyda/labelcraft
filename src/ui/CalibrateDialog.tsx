/**
 * Calibrate actual size (R4.AC9): the user holds a real label of the current
 * size against the screen and resizes its outline until they match.
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { calibrationStore, useScreenScale } from './calibration'
import { Button } from './icons'
import { Modal } from './Modal'

/** Plausible CSS px per real mm (screens from ~40 to ~300 CSS px per inch). */
const MIN_PX_PER_MM = 1.5
const MAX_PX_PER_MM = 12
/** Tallest outline, so the dialog stays on screen. */
const MAX_OUTLINE_PX = 320

type LabelMm = { widthMm: number; heightMm: number }

const mm = (n: number) => String(Math.round(n * 100) / 100)

export function CalibrateDialog({
  open,
  onClose,
  label,
}: {
  open: boolean
  onClose: () => void
  /** The current label: the reference the user holds against the screen. */
  label: LabelMm
}) {
  return (
    <Modal
      open={open}
      title="Calibrate actual size"
      onClose={onClose}
      className="calibrate-dialog"
    >
      {open && <CalibrateForm onClose={onClose} label={label} />}
    </Modal>
  )
}

function CalibrateForm({
  onClose,
  label,
}: {
  onClose: () => void
  label: LabelMm
}) {
  const { pxPerMm, calibrated } = useScreenScale()
  const [value, setValue] = useState(pxPerMm)
  const stageRef = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState(0)

  // R4.AC9: the outline never gets bigger than the dialog.
  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => setAvailable(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const max = Math.max(
    MIN_PX_PER_MM,
    Math.min(
      MAX_PX_PER_MM,
      available ? (available - 4) / label.widthMm : MAX_PX_PER_MM,
      MAX_OUTLINE_PX / label.heightMm,
    ),
  )
  const shown = Math.min(max, Math.max(MIN_PX_PER_MM, value))
  const set = (v: number) =>
    setValue(Math.min(max, Math.max(MIN_PX_PER_MM, Math.round(v * 100) / 100)))
  const name = `${mm(label.widthMm)} × ${mm(label.heightMm)} mm`

  return (
    <div className="calibrate">
      <p>
        Hold a {name} label from your roll against the screen and resize the
        outline until it matches the label exactly. Then 100% shows labels at
        their real size on this screen.
      </p>
      <div className="calibrate-stage" ref={stageRef}>
        <div
          className="calibrate-label"
          data-testid="calibration-label"
          style={{
            width: label.widthMm * shown,
            height: label.heightMm * shown,
            borderRadius: 1.5 * shown,
          }}
        >
          {name}
        </div>
      </div>
      <div className="calibrate-controls">
        <Button
          icon="minus"
          aria-label="Smaller"
          onClick={() => set(shown - 0.02)}
        />
        <input
          type="range"
          aria-label="Outline size"
          min={MIN_PX_PER_MM}
          max={max}
          step={0.01}
          value={shown}
          onChange={(e) => set(Number(e.target.value))}
        />
        <Button
          icon="add"
          aria-label="Larger"
          onClick={() => set(shown + 0.02)}
        />
      </div>
      {shown >= max - 0.005 && max < MAX_PX_PER_MM && (
        <p className="warning" role="note">
          The outline can't get bigger in this window. Make the window wider, or
          calibrate with a smaller label.
        </p>
      )}
      <p className="status">
        {calibrated
          ? 'This screen is calibrated.'
          : 'Not calibrated yet: 100% uses the web default (96 px per inch).'}
      </p>
      <div className="actions">
        <Button
          icon="refresh"
          onClick={() => {
            calibrationStore.reset()
            onClose()
          }}
        >
          Reset to default
        </Button>
        <Button icon="close" onClick={onClose}>
          Cancel
        </Button>
        <Button
          icon="check"
          className="primary"
          onClick={() => {
            calibrationStore.calibrate(shown)
            onClose()
          }}
        >
          Save
        </Button>
      </div>
    </div>
  )
}
