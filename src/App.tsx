import { useState, useSyncExternalStore } from 'react'
import { Editor } from './editor/Editor'
import { EditorStore } from './editor/store'
import { EditorContext } from './editor/useEditor'
import { createObject, newDoc } from './model/factory'
import type { LabelDoc, LabelObject } from './model/types'
import { ConnectPanel } from './ui/ConnectPanel'
import { PrintDialog } from './ui/PrintDialog'

/** Starting 30 × 12 mm label (fits a D110_M) until labels can be saved (M5). */
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

export default function App() {
  const [store] = useState(() => new EditorStore(sampleLabel()))
  const { history } = useSyncExternalStore(store.subscribe, store.getState)
  const [printOpen, setPrintOpen] = useState(false)

  return (
    <EditorContext value={store}>
      <main>
        <h1>labelcraft</h1>
        <p>Design labels and print them from your browser. Work in progress.</p>

        <Editor />

        <p>
          <button
            type="button"
            className="primary"
            onClick={() => setPrintOpen(true)}
          >
            Print…
          </button>
        </p>

        <ConnectPanel />

        <PrintDialog
          doc={history.present}
          open={printOpen}
          onClose={() => setPrintOpen(false)}
        />

        <p className="notice">
          Independent project, not affiliated with or endorsed by NIIMBOT.
        </p>
      </main>
    </EditorContext>
  )
}
