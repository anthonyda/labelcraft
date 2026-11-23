import { useState } from 'react'
import { createObject, newDoc } from './model/factory'
import type { LabelDoc, LabelObject } from './model/types'
import { ConnectPanel } from './ui/ConnectPanel'
import { PrintDialog } from './ui/PrintDialog'

/** Sample 30 × 12 mm label until the editor arrives (M3). */
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
  const [doc] = useState(sampleLabel)
  const [printOpen, setPrintOpen] = useState(false)

  return (
    <main>
      <h1>labelcraft</h1>
      <p>Design labels and print them from your browser. Work in progress.</p>

      <ConnectPanel />

      <section className="panel" aria-labelledby="label-title">
        <h2 id="label-title">Label</h2>
        <p>
          Sample {doc.label.widthMm} × {doc.label.heightMm} mm label. The editor
          comes next.
        </p>
        <button
          type="button"
          className="primary"
          onClick={() => setPrintOpen(true)}
        >
          Print…
        </button>
      </section>

      <PrintDialog
        doc={doc}
        open={printOpen}
        onClose={() => setPrintOpen(false)}
      />

      <p className="notice">
        Independent project, not affiliated with or endorsed by NIIMBOT.
      </p>
    </main>
  )
}
