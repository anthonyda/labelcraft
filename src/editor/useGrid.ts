/** Grid on/off (R29.AC1): off by default, remembered. */
import { useSyncExternalStore } from 'react'
import { localSettings } from '../storage/settings'

const KEY = 'grid'
const listeners = new Set<() => void>()
let on = localSettings.get(KEY) === 'on'

export const setGrid = (value: boolean): void => {
  on = value
  localSettings.set(KEY, value ? 'on' : undefined)
  listeners.forEach((l) => l())
}

export const useGrid = (): boolean =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => on,
  )
