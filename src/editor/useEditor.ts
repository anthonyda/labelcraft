import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react'
import type { LabelObject } from '../model/types'
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
