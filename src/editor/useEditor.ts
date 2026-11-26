import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react'
import type { LabelDoc, LabelObject } from '../model/types'
import { labelSizePx } from '../model/units'
import { objectInkOutside } from '../render/inkBounds'
import { renderObject, type ObjectBitmap } from '../render/renderObject'
import type { EditorState, EditorStore } from './store'

export const EditorContext = createContext<EditorStore | null>(null)

export const useEditorStore = (): EditorStore => {
  const store = useContext(EditorContext)
  if (!store) throw new Error('useEditorStore outside EditorContext')
  return store
}

export const useEditorState = (): EditorState => {
  const store = useEditorStore()
  return useSyncExternalStore(store.subscribe, store.getState)
}

/** Bitmaps depend on everything except position, rotation and id. */
const bitmapKey = (o: LabelObject, dpi: number): string =>
  JSON.stringify({ ...o, id: '', x: 0, y: 0, rotation: 0, dpi })

const CACHE_SIZE = 300
const cache = new Map<string, Promise<ObjectBitmap>>()

const cachedBitmap = (o: LabelObject, dpi: number): Promise<ObjectBitmap> => {
  const key = bitmapKey(o, dpi)
  let entry = cache.get(key)
  if (!entry) {
    entry = renderObject(o, dpi)
    cache.set(key, entry)
    // A failed render (e.g. an image that didn't load) is retried next time.
    entry.catch(() => cache.delete(key))
    if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!)
  }
  return entry
}

/** The object's print bitmap; the previous one stays until the new one is ready. */
export const useObjectBitmap = (
  o: LabelObject,
  dpi: number,
): ObjectBitmap | undefined => {
  const [bitmap, setBitmap] = useState<ObjectBitmap>()
  const key = bitmapKey(o, dpi)
  useEffect(() => {
    let current = true
    cachedBitmap(o, dpi).then((b) => current && setBitmap(b))
    return () => {
      current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key covers o
  }, [key])
  return bitmap
}

/**
 * R19: ids of objects whose ink goes past the label edge, from the same
 * bitmaps the editor shows. Keeps the last answer while bitmaps update.
 */
export const useObjectsOutside = (doc: LabelDoc): string[] => {
  const [outside, setOutside] = useState<string[]>([])
  useEffect(() => {
    let current = true
    const dpi = doc.label.dpi
    const label = labelSizePx(doc.label)
    Promise.all(doc.objects.map((o) => cachedBitmap(o, dpi))).then(
      (bitmaps) => {
        if (!current) return
        const ids = doc.objects
          .filter((o, i) => objectInkOutside(o, bitmaps[i].canvas, dpi, label))
          .map((o) => o.id)
        setOutside((prev) =>
          prev.length === ids.length && prev.every((id, i) => id === ids[i])
            ? prev
            : ids,
        )
      },
    )
    return () => {
      current = false
    }
  }, [doc])
  return outside
}
