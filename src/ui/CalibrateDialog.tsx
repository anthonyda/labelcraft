/** Calibrate actual size against a bank card (R4.AC9). */
import { useState } from 'react'
import { CARD_MM, calibrationStore, useScreenScale } from './calibration'
import { Button } from './icons'
import { Modal } from './Modal'

const MIN_PX = 120
const MAX_PX = 1200

export function CalibrateDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Modal open={open} title="Calibrate actual size" onClose={onClose}>
      {open && <CalibrateForm onClose={onClose} />}
    </Modal>
  )
}

function CalibrateForm({ onClose }: { onClose: () => void }) {
  const { pxPerMm, calibrated } = useScreenScale()
  const [width, setWidth] = useState(() => Math.round(pxPerMm * CARD_MM.width))
  const set = (w: number) =>
    setWidth(Math.min(MAX_PX, Math.max(MIN_PX, Math.round(w * 2) / 2)))
  const height = (width * CARD_MM.height) / CARD_MM.width

  return (
    <div className="calibrate">
      <p>
        Hold a bank card (or any ID card, 85.6 mm wide) against the screen and
        resize the outline until it matches the card exactly. Then 100% shows
        labels at their real size on this screen.
      </p>
      <div className="calibrate-stage">
        <div
          className="calibrate-card"
          data-testid="calibration-card"
          style={{ width, height }}
        />
      </div>
      <div className="calibrate-controls">
        <Button
          icon="minus"
          aria-label="Smaller"
          onClick={() => set(width - 1)}
        />
        <input
          type="range"
          aria-label="Card width on screen"
          min={MIN_PX}
          max={MAX_PX}
          step={0.5}
          value={width}
          onChange={(e) => set(Number(e.target.value))}
        />
        <Button icon="add" aria-label="Larger" onClick={() => set(width + 1)} />
      </div>
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
            calibrationStore.calibrate(width / CARD_MM.width)
            onClose()
          }}
        >
          Save
        </Button>
      </div>
    </div>
  )
}
