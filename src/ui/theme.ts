/** Theme choice (R25.AC2): follow the device, or force light or dark. */
import { useSyncExternalStore } from 'react'
import { localSettings } from '../storage/settings'

export type ThemeChoice = 'auto' | 'light' | 'dark'

const KEY = 'theme'
const listeners = new Set<() => void>()

const read = (): ThemeChoice => {
  const v = localSettings.get(KEY)
  return v === 'light' || v === 'dark' ? v : 'auto'
}

let current: ThemeChoice = read()

/** Put the choice on <html> (no attribute = follow the device). */
export const applyTheme = (choice: ThemeChoice = current): void => {
  const el = document.documentElement
  if (choice === 'auto') delete el.dataset.theme
  else el.dataset.theme = choice
}

export const setTheme = (choice: ThemeChoice): void => {
  current = choice
  localSettings.set(KEY, choice === 'auto' ? undefined : choice)
  applyTheme(choice)
  listeners.forEach((l) => l())
}

export const NEXT_THEME: Record<ThemeChoice, ThemeChoice> = {
  auto: 'light',
  light: 'dark',
  dark: 'auto',
}

export const useTheme = (): ThemeChoice =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
