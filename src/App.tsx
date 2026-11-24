import { useEffect, useState, useSyncExternalStore } from 'react'
import { Editor } from './editor/Editor'
import { EditorStore } from './editor/store'
import { EditorContext } from './editor/useEditor'
import { createObject, newDoc } from './model/factory'
import type { LabelDoc, LabelObject } from './model/types'
import { usePrinter } from './printer/usePrinter'
import { useAutosave } from './storage/useAutosave'
import { ConnectPanel } from './ui/ConnectPanel'
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

function PrinterButton({ onClick }: { onClick: () => void }) {
  const printer = usePrinter()
  const connected =
    printer.status === 'connected' || printer.status === 'printing'
  const text = connected
    ? (printer.model?.model ?? printer.deviceName ?? 'Connected')
    : printer.status === 'connecting'
      ? 'Connecting…'
      : 'Not connected'
  return (
    <button type="button" className="printer-button" onClick={onClick}>
      Printer: {text}
      {connected && printer.transport === 'emulator' && (
        <span className="badge">Emulated</span>
      )}
    </button>
  )
}

export default function App() {
  const [store] = useState(() => new EditorStore(sampleLabel()))
  const { history } = useSyncExternalStore(store.subscribe, store.getState)
  const [printOpen, setPrintOpen] = useState(false)
  const [printerOpen, setPrinterOpen] = useState(false)
  const autosave = useAutosave(store)
  const printerDpi = usePrinter().model?.dpi

  // R3.AC2: use the connected printer's resolution.
  useEffect(() => {
    if (printerDpi && printerDpi !== store.doc.label.dpi) {
      store.setLabel({ dpi: printerDpi })
    }
  }, [printerDpi, store])

  return (
    <EditorContext value={store}>
      <Editor
        autosave={autosave}
        headerActions={
          <>
            <PrinterButton onClick={() => setPrinterOpen(true)} />
            <button
              type="button"
              className="primary"
              onClick={() => setPrintOpen(true)}
            >
              Print…
            </button>
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
          <button type="button" onClick={() => setPrinterOpen(false)}>
            Done
          </button>
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
