/**
 * Install as an app (spec R30.AC4): catches the browser's install offer
 * (Chrome, Edge, Android) early, and knows when the app already runs
 * installed or is on an iPhone/iPad.
 */
import { useSyncExternalStore } from 'react'

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let offer: InstallPromptEvent | undefined
let installed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Keep it for the Install app button instead of the mini bar.
    e.preventDefault()
    offer = e as InstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    offer = undefined
    installed = true
    notify()
  })
}

/** Running as an installed app (any platform). */
export const isStandalone = (): boolean =>
  installed ||
  (typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true))

/** iPhone or iPad (iPadOS reports itself as a Mac with touch). */
export const isIos = (): boolean =>
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

export type InstallState = { canPrompt: boolean; standalone: boolean }

let snapshot: InstallState = { canPrompt: false, standalone: false }
const read = (): InstallState => {
  const next = { canPrompt: !!offer, standalone: isStandalone() }
  if (
    next.canPrompt !== snapshot.canPrompt ||
    next.standalone !== snapshot.standalone
  ) {
    snapshot = next
  }
  return snapshot
}

export const useInstall = (): InstallState =>
  useSyncExternalStore((l) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }, read)

/** Show the browser's install prompt; false when none is on offer. */
export const promptInstall = async (): Promise<boolean> => {
  const e = offer
  if (!e) return false
  offer = undefined
  notify()
  await e.prompt()
  await e.userChoice.catch(() => undefined)
  return true
}
