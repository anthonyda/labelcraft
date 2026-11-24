/** Add-object menu (T4.1) incl. image file picker (T4.3). */
import { useRef, useState } from 'react'
import type { ObjectType } from '../model/types'
import { IMAGE_ACCEPT, imageObjectFromFile } from './images'
import { useEditorStore } from './useEditor'

const ITEMS: [Exclude<ObjectType, 'image'>, string][] = [
  ['text', 'Text'],
  ['rect', 'Rectangle'],
  ['ellipse', 'Ellipse'],
  ['line', 'Line'],
  ['qr', 'QR code'],
  ['barcode', 'Barcode'],
]

export function AddMenu({ onAdded }: { onAdded?: () => void } = {}) {
  const store = useEditorStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string>()

  const addImage = async (file: File | undefined) => {
    if (!file) return
    setError(undefined)
    try {
      store.addObject(await imageObjectFromFile(file, store.doc.label))
      onAdded?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="group" role="group" aria-label="Add">
      {ITEMS.map(([type, name]) => (
        <button
          key={type}
          type="button"
          onClick={() => {
            store.addObject(type)
            onAdded?.()
          }}
        >
          + {name}
        </button>
      ))}
      <button type="button" onClick={() => fileRef.current?.click()}>
        + Image
      </button>
      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_ACCEPT}
        hidden
        aria-label="Image file"
        data-testid="image-file"
        onChange={(e) => {
          void addImage(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
