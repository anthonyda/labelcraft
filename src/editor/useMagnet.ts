/** Magnet on/off (R26.AC3): on by default, remembered. */
import { useSyncExternalStore } from 'react'
import { localSettings } from '../storage/settings'

const KEY = 'magnet'
const listeners = new Set<() => void>()
let on = localSettings.get(KEY) !== 'off'

export const setMagnet = (value: boolean): void => {
  on = value
  localSettings.set(KEY, value ? undefined : 'off')
  listeners.forEach((l) => l())
}

export const useMagnet = (): boolean =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => on,
  )
