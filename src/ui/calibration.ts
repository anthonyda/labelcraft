/**
 * Screen calibration (R4.AC9): how many CSS px make one real millimetre on
 * this screen. Browsers don't report a screen's density, so by default we
 * use the CSS definition (96 px per inch); the user can calibrate against a
 * bank card.
 */
import { useSyncExternalStore } from 'react'
import { localSettings, type SettingStore } from '../storage/settings'

/** CSS px per mm by definition (96 per inch). */
export const DEFAULT_PX_PER_MM = 96 / 25.4

/** ID-1 card (bank card) size in mm. */
export const CARD_MM = { width: 85.6, height: 53.98 }

const KEY = 'screenCalibration'

/** What was measured: CSS px per mm at the browser zoom of the moment. */
export type Calibration = { cssPxPerMm: number; devicePixelRatio: number }

export const parseCalibration = (
  text: string | undefined,
): Calibration | undefined => {
  if (!text) return undefined
  try {
    const c = JSON.parse(text) as Partial<Calibration>
    if (
      typeof c.cssPxPerMm === 'number' &&
      c.cssPxPerMm > 0 &&
      typeof c.devicePixelRatio === 'number' &&
      c.devicePixelRatio > 0
    ) {
      return { cssPxPerMm: c.cssPxPerMm, devicePixelRatio: c.devicePixelRatio }
    }
  } catch {
    // ignore a broken setting
  }
  return undefined
}

/**
 * CSS px per real mm now. Browser zoom changes the size of a CSS px and the
 * devicePixelRatio by the same factor, so scaling by the ratio keeps 100% at
 * real size after a browser-zoom change.
 */
export const pxPerMmNow = (
  calibration: Calibration | undefined,
  devicePixelRatio: number,
): number =>
  calibration
    ? (calibration.cssPxPerMm * calibration.devicePixelRatio) / devicePixelRatio
    : DEFAULT_PX_PER_MM

type State = { calibration?: Calibration; dpr: number }

export class CalibrationStore {
  private state: State
  private listeners = new Set<() => void>()
  private readonly settings: SettingStore

  constructor(settings: SettingStore = localSettings) {
    this.settings = settings
    this.state = {
      calibration: parseCalibration(settings.get(KEY)),
      dpr: currentDpr(),
    }
    watchDpr(() => this.set({ dpr: currentDpr() }))
  }

  getState = (): State => this.state

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }

  private set(patch: Partial<State>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l())
  }

  /** Save `cssPxPerMm` measured at the current browser zoom. */
  calibrate(cssPxPerMm: number): void {
    const calibration = { cssPxPerMm, devicePixelRatio: currentDpr() }
    this.settings.set(KEY, JSON.stringify(calibration))
    this.set({ calibration, dpr: calibration.devicePixelRatio })
  }

  reset(): void {
    this.settings.set(KEY, undefined)
    this.set({ calibration: undefined })
  }
}

const currentDpr = () =>
  typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1

/** Call `onChange` whenever the devicePixelRatio changes (browser zoom). */
const watchDpr = (onChange: () => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return
  const listen = () => {
    const mq = window.matchMedia(`(resolution: ${currentDpr()}dppx)`)
    mq.addEventListener(
      'change',
      () => {
        onChange()
        listen()
      },
      { once: true },
    )
  }
  listen()
}

export const calibrationStore = new CalibrationStore()

/** CSS px per real mm, and whether it was calibrated (R4.AC9). */
export const useScreenScale = (): {
  pxPerMm: number
  calibrated: boolean
} => {
  const s = useSyncExternalStore(
    calibrationStore.subscribe,
    calibrationStore.getState,
  )
  return {
    pxPerMm: pxPerMmNow(s.calibration, s.dpr),
    calibrated: !!s.calibration,
  }
}
