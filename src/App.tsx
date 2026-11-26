import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Editor } from './editor/Editor'
import { labelForRoll, sameSize } from './editor/labelSize'
import { EditorStore } from './editor/store'
import { EditorContext } from './editor/useEditor'
import { createObject, newDoc } from './model/factory'
import type { LabelDoc, LabelObject } from './model/types'
import type { LoadedRoll } from './printer/printerService'
import { useKnownModel, usePrinter } from './printer/usePrinter'
import { useAutosave } from './storage/useAutosave'
import { ConnectPanel } from './ui/ConnectPanel'
import { Button, Icon, type IconName } from './ui/icons'
import { NEXT_THEME, setTheme, useTheme, type ThemeChoice } from './ui/theme'
import { Modal } from './ui/Modal'
import { PrintDialog } from './ui/PrintDialog'

/** Starting 30 × 12 mm label (fits a D110_M) when nothing is saved yet. */
const sampleLabel = (): LabelDoc => {
  const doc = newDoc({ widthMm: 30, heightMm: 12 })
  doc.objects.push(
    {
      ...createObject('text', doc.label),
      x: 1,
      y: 1.5,
      width: 18,
      height: 9,
      text: 'Hello from labelcraft',
      fontSize: 9,
      bold: true,
    } as LabelObject,
    {
      ...createObject('qr', doc.label),
      x: 19,
      y: 1,
      width: 10,
      height: 10,
      content: 'https://anthonyda.github.io/labelcraft/',
    } as LabelObject,
  )
  return doc
}

const THEME_UI: Record<ThemeChoice, { icon: IconName; name: string }> = {
  auto: { icon: 'themeAuto', name: 'Auto (device)' },
  light: { icon: 'sun', name: 'Light' },
  dark: { icon: 'moon', name: 'Dark' },
}

/** R25.AC2: Auto → Light → Dark. */
function ThemeButton() {
  const theme = useTheme()
  const ui = THEME_UI[theme]
  return (
    <button
      type="button"
      className="theme-button"
      aria-label={`Theme: ${ui.name}`}
      title={`Theme: ${ui.name} (click to change)`}
      onClick={() => setTheme(NEXT_THEME[theme])}
    >
      <Icon name={ui.icon} />
    </button>
  )
}

/** R17.AC6: names the model and says if it is detected, chosen or emulated. */
function PrinterButton({ onClick }: { onClick: () => void }) {
  const printer = usePrinter()
  const model = useKnownModel()
  const connected =
    printer.status === 'connected' || printer.status === 'printing'
  const text =
    printer.status === 'connecting'
      ? 'Connecting…'
      : model
        ? model.model
        : connected
          ? (printer.deviceName ?? 'Connected')
          : 'Not connected'
  return (
    <button
      type="button"
      // R24.AC8: green when connected, red when not; plain for the emulator.
      className={`printer-button ${
        printer.status === 'connecting'
          ? ''
          : connected
            ? printer.transport === 'emulator'
              ? ''
              : 'is-connected'
            : 'is-disconnected'
      }`.trim()}
      onClick={onClick}
    >
      <Icon name="plug" />
      <span className="btn-text">Printer: {text}</span>
      {model?.source === 'chosen' && printer.status !== 'connecting' && (
        <span className="badge chosen">
          {connected ? 'chosen' : 'chosen, not connected'}
        </span>
      )}
      {connected && printer.transport === 'emulator' && (
        <span className="badge">Emulated</span>
      )}
    </button>
  )
}

const mmText = (n: number) => String(Math.round(n * 100) / 100)

/** R18.AC11: the loaded roll, in the header. */
function RollChip({ onClick }: { onClick: () => void }) {
  const printer = usePrinter()
  const roll = printer.roll
  if (printer.status !== 'connected' && printer.status !== 'printing') {
    return null
  }
  const size = roll?.size
    ? `${mmText(roll.size.widthMm)} × ${mmText(roll.size.lengthMm)} mm`
    : undefined
  const left = roll?.labelsLeft
  if (!size && left === undefined) return null
  const title =
    'Loaded roll' +
    (size ? `: ${size}` : '') +
    (roll?.sizeSource === 'remembered' ? ' (remembered)' : '') +
    (left !== undefined ? `, ${left} labels left` : '')
  return (
    <button
      type="button"
      className="roll-chip"
      onClick={onClick}
      title={title}
      aria-label={title}
      data-testid="roll-chip"
    >
      <Icon name="roll" />
      <span className="roll-chip-text">
        {size && (
          <span className={left !== undefined ? 'roll-chip-size' : undefined}>
            Roll {size}
          </span>
        )}
        {size && left !== undefined && (
          <span className="roll-chip-size"> · </span>
        )}
        {left !== undefined && (
          <span>
            {left}
            <span className="roll-chip-size"> left</span>
          </span>
        )}
      </span>
    </button>
  )
}

export default function App() {
  const [store] = useState(() => new EditorStore(sampleLabel()))
  const { history } = useSyncExternalStore(store.subscribe, store.getState)
  const [printOpen, setPrintOpen] = useState(false)
  const [printerOpen, setPrinterOpen] = useState(false)
  const autosave = useAutosave(store)
  const model = useKnownModel()
  const roll = usePrinter().roll

  // R3.AC2, R17.AC1–AC2: use the known printer's resolution.
  useEffect(() => {
    if (model && model.dpi !== store.doc.label.dpi) {
      store.setLabel({ dpi: model.dpi })
    }
  }, [model, store])

  // R18.AC3: an empty label takes the loaded roll's size automatically.
  const appliedRoll = useRef<LoadedRoll>(undefined)
  useEffect(() => {
    if (!roll?.size || appliedRoll.current === roll) return
    appliedRoll.current = roll
    if (store.doc.objects.length > 0) return
    const target = labelForRoll(roll.size, model, store.doc.label.turned)
    if (!sameSize(target, store.doc.label)) store.setLabel(target)
  }, [roll, model, store])

  return (
    <EditorContext value={store}>
      <Editor
        autosave={autosave}
        headerActions={
          <>
            <ThemeButton />
            <PrinterButton onClick={() => setPrinterOpen(true)} />
            <RollChip onClick={() => setPrinterOpen(true)} />
            <Button
              icon="printer"
              className="primary"
              onClick={() => setPrintOpen(true)}
            >
              <span className="btn-text">Print…</span>
            </Button>
          </>
        }
      />

      <Modal
        open={printerOpen}
        title="Printer"
        onClose={() => setPrinterOpen(false)}
      >
        <ConnectPanel />
        <div className="actions">
          <Button icon="check" onClick={() => setPrinterOpen(false)}>
            Done
          </Button>
        </div>
      </Modal>

      <PrintDialog
        doc={history.present}
        open={printOpen}
        onClose={() => setPrintOpen(false)}
      />
    </EditorContext>
  )
}
