/**
 * Auto-save (T5.1, R10.AC1): restores the last label on load, then saves the
 * current label to browser storage shortly after every change.
 */
import { useEffect, useState } from 'react'
import type { EditorStore } from '../editor/store'
import { loadCurrent, saveCurrent } from './db'

export type AutosaveStatus = 'loading' | 'saving' | 'saved' | 'error'

export const AUTOSAVE_DELAY_MS = 400

export const useAutosave = (store: EditorStore): AutosaveStatus => {
  const [status, setStatus] = useState<AutosaveStatus>('loading')

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let unsubscribe: (() => void) | undefined

    const save = () => {
      const { history, file } = store.getState()
      setStatus('saving')
      saveCurrent({
        doc: history.present,
        labelId: file.labelId,
        name: file.name,
        dirty: store.isDirty,
      })
        .then(() => !cancelled && setStatus('saved'))
        .catch(() => !cancelled && setStatus('error'))
    }

    loadCurrent()
      .catch(() => undefined)
      .then((current) => {
        if (cancelled) return
        if (current) {
          store.load(
            current.doc,
            { labelId: current.labelId, name: current.name },
            current.dirty,
          )
        }
        setStatus('saved')
        // Only start saving once the stored label has been restored.
        let last = store.getState()
        unsubscribe = store.subscribe(() => {
          const next = store.getState()
          const changed =
            next.history.present !== last.history.present ||
            next.file !== last.file
          last = next
          if (!changed) return
          clearTimeout(timer)
          setStatus('saving')
          timer = setTimeout(() => {
            timer = undefined
            save()
          }, AUTOSAVE_DELAY_MS)
        })
      })

    // R10.AC1: write a pending save at once when the page goes away
    // (installed apps are often closed right after an edit).
    const flush = () => {
      if (timer === undefined || cancelled) return
      clearTimeout(timer)
      timer = undefined
      save()
    }
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)

    return () => {
      cancelled = true
      clearTimeout(timer)
      unsubscribe?.()
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
    }
  }, [store])

  return status
}
