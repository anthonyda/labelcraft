/** Print dialog (T2.4, R11, R16.AC3–AC4). */
import {
  LabelType,
  printTaskNames,
  type PrintTaskName,
} from '@mmote/niimbluelib'
import { useEffect, useRef, useState } from 'react'
import type { LabelDoc } from '../model/types'
import { EmulatedD110MClient, receivedPageToCanvas } from '../printer/emulator'
import { PrintCancelledError } from '../printer/printerService'
import { printerService, usePrinter } from '../printer/usePrinter'
import { renderLabel, type RenderWarning } from '../render/renderLabel'
import { printLayout, turnCanvas } from '../render/turn'
import { labelForRoll, sameSize } from '../editor/labelSize'
import { Button } from './icons'

const mmText = (n: number) => String(Math.round(n * 100) / 100)

const LABEL_TYPES: [LabelType, string][] = [
  [LabelType.WithGaps, 'Labels with gaps'],
  [LabelType.Black, 'Black mark'],
  [LabelType.Continuous, 'Continuous roll'],
  [LabelType.Transparent, 'Transparent'],
]

/** Shows a copy of a 1-bit canvas (same size, so the copy is exact). */
function CanvasView({
  canvas,
  label,
  testId,
}: {
  canvas?: HTMLCanvasElement
  label: string
  testId: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const target = ref.current
    if (!target || !canvas) return
    target.width = canvas.width
    target.height = canvas.height
    target.getContext('2d')!.drawImage(canvas, 0, 0)
  }, [canvas])
  if (!canvas) return null
  return (
    <div className="bitmap">
      <canvas ref={ref} role="img" aria-label={label} data-testid={testId} />
    </div>
  )
}

const samePixels = (a: HTMLCanvasElement, b: HTMLCanvasElement): boolean => {
  if (a.width !== b.width || a.height !== b.height) return false
  const da = a.getContext('2d')!.getImageData(0, 0, a.width, a.height).data
  const db = b.getContext('2d')!.getImageData(0, 0, b.width, b.height).data
  return da.every((v, i) => v === db[i])
}

export function PrintDialog({
  doc,
  open,
  onClose,
}: {
  doc: LabelDoc
  open: boolean
  onClose: () => void
}) {
  const state = usePrinter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [preview, setPreview] = useState<HTMLCanvasElement>()
  const [warnings, setWarnings] = useState<RenderWarning[]>([])
  const [outside, setOutside] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [density, setDensity] = useState<number>()
  // R18.AC5: the loaded roll's type is the default until the user picks one.
  const [labelTypeChoice, setLabelType] = useState<LabelType>()
  const [printTask, setPrintTask] = useState<PrintTaskName>('D110')
  const [output, setOutput] = useState<HTMLCanvasElement>()
  const [message, setMessage] = useState<string>()

  const model = state.model ?? state.chosen
  const rollType = state.roll?.labelType
  const labelType =
    labelTypeChoice ??
    (rollType && LABEL_TYPES.some(([t]) => t === rollType)
      ? rollType
      : LabelType.WithGaps)
  const densityValue = density ?? model?.densityDefault ?? 3
  const printing = state.status === 'printing'
  const connected = state.status === 'connected'

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // R11.AC1: preview is the exact 1-bit bitmap that will be printed.
  useEffect(() => {
    if (!open) return
    let current = true
    renderLabel(doc).then(({ canvas, warnings, outside }) => {
      if (!current) return
      setPreview(canvas)
      setWarnings(warnings)
      setOutside(outside.length)
    })
    return () => {
      current = false
    }
  }, [doc, open])

  // R3.AC3: the printhead covers label height for "left" printers, width otherwise.
  const rollSize = state.roll?.size
  const knownModel = model && {
    model: model.model,
    printDirection: model.printDirection,
    printheadPixels: model.printheadPixels,
    dpi: model.dpi,
  }
  const rollMismatch =
    !!rollSize &&
    !sameSize(labelForRoll(rollSize, knownModel, doc.label.turned), doc.label)
  const printheadOverflow =
    preview &&
    model &&
    ((model.printDirection === 'left') !== !!doc.label.turned
      ? preview.height
      : preview.width) > model.printheadPixels

  const print = async () => {
    if (!preview) return
    setOutput(undefined)
    setMessage(undefined)
    try {
      // R22.AC4: a turned design is sent in the printer's layout.
      await printerService.print(printLayout(preview, doc.label.turned), {
        quantity,
        density: densityValue,
        labelType,
        printTask: state.printTask ? undefined : printTask,
      })
      setMessage('Printed.')
      const client = printerService.getClient()
      if (client instanceof EmulatedD110MClient && model) {
        const page = client.receivedPages[0]
        if (page) {
          const received = receivedPageToCanvas(page, model.printDirection)
          setOutput(
            doc.label.turned ? turnCanvas(received, 'clockwise') : received,
          )
        }
      }
    } catch (e) {
      if (e instanceof PrintCancelledError) setMessage('Print cancelled.')
      // R11.AC6: shown here when the service couldn't (e.g. link lost).
      else if (!printerService.getState().error) {
        setMessage(
          `Print failed: ${e instanceof Error ? e.message : String(e)}`,
        )
      }
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="print-dialog"
      aria-labelledby="print-title"
      onClose={() => {
        // Start fresh next time the dialog opens.
        setOutput(undefined)
        setMessage(undefined)
        onClose()
      }}
    >
      <h1 id="print-title">Print</h1>

      <h2>Preview</h2>
      {/* R24.AC3: which size prints, and whether it fits the loaded roll. */}
      <p className="print-size" data-testid="print-size">
        {mmText(doc.label.widthMm)} × {mmText(doc.label.heightMm)} mm label
        {rollSize && (
          <>
            {' '}
            on a {mmText(rollSize.widthMm)} × {mmText(rollSize.lengthMm)} mm
            roll
          </>
        )}
      </p>
      {rollMismatch && (
        <p className="warning" role="note" data-testid="roll-mismatch">
          The loaded roll is a different size from this label. Check the label
          size, or use the loaded roll in the Printer dialog.
        </p>
      )}
      <CanvasView
        canvas={preview}
        label="Print preview"
        testId="print-preview"
      />
      {warnings.length > 0 && (
        <ul className="warning">
          {warnings.map((w) => (
            <li key={w.objectId + w.message}>{w.message}</li>
          ))}
        </ul>
      )}
      {outside > 0 && (
        <p className="warning" role="note" data-testid="outside-warning">
          {outside === 1
            ? '1 object goes past the label edge'
            : `${outside} objects go past the label edge`}
          ; the parts outside won't print.
        </p>
      )}
      {printheadOverflow && (
        <p className="warning" role="note">
          This label is larger than the {model.model}'s print head (
          {model.printheadPixels} px); the edge will be cut off.
        </p>
      )}

      <div className="fields">
        {/* R24.AC3: compact copies stepper. */}
        <div className="copies">
          <label htmlFor="print-copies">Copies</label>
          <div className="stepper">
            <Button
              icon="minus"
              aria-label="Fewer copies"
              disabled={quantity <= 1}
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            />
            <input
              id="print-copies"
              type="number"
              min={1}
              max={99}
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  Math.min(99, Math.max(1, Number(e.target.value) || 1)),
                )
              }
            />
            <Button
              icon="add"
              aria-label="More copies"
              disabled={quantity >= 99}
              onClick={() => setQuantity(Math.min(99, quantity + 1))}
            />
          </div>
        </div>
        <label>
          Darkness {densityValue}
          <input
            type="range"
            min={model?.densityMin ?? 1}
            max={model?.densityMax ?? 5}
            value={densityValue}
            onChange={(e) => setDensity(Number(e.target.value))}
          />
          <span className="scale-ends" aria-hidden="true">
            <span>Lighter</span>
            <span>Darker</span>
          </span>
        </label>
        <label>
          Paper
          <select
            value={labelType}
            onChange={(e) => setLabelType(Number(e.target.value))}
          >
            {LABEL_TYPES.map(([value, name]) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </select>
        </label>
        {connected && !state.printTask && (
          <label>
            Print mode (printer not recognised)
            <select
              value={printTask}
              onChange={(e) => setPrintTask(e.target.value as PrintTaskName)}
            >
              {printTaskNames.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {state.progress && (
        <label className="progress">
          {state.progress.phase === 'send' ? 'Sending' : 'Printing'}{' '}
          {state.progress.percent}%
          <progress max={100} value={state.progress.percent} />
        </label>
      )}
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      {message && (
        <p className="status" role="status">
          {message}
        </p>
      )}

      {output && preview && (
        <section aria-labelledby="output-title">
          <h2 id="output-title">
            Emulated printer output <span className="badge">Emulated</span>
          </h2>
          <CanvasView
            canvas={output}
            label="Bitmap received by the emulated printer"
            testId="emulator-output"
          />
          <p className="status">
            {samePixels(output, preview)
              ? 'Matches the preview pixel for pixel.'
              : 'Does not match the preview.'}
          </p>
        </section>
      )}

      <div className="actions">
        {printing ? (
          <Button icon="stop" onClick={() => printerService.cancelPrint()}>
            Cancel print
          </Button>
        ) : (
          <Button
            icon={connected ? 'printer' : 'plug'}
            className="primary"
            onClick={print}
            disabled={!connected || !preview}
            autoFocus
          >
            {connected ? 'Print' : 'Connect a printer first'}
          </Button>
        )}
        <form method="dialog">
          <Button icon="close" type="submit">
            Close
          </Button>
        </form>
      </div>
    </dialog>
  )
}
