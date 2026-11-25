/** Layers panel width (R24.AC5): resizable, remembered, narrow on small windows. */
import { useState } from 'react'
import { localSettings } from '../storage/settings'

export const LAYERS_MIN_REM = 10
export const LAYERS_MAX_REM = 28
const KEY = 'layersWidthRem'

const clampRem = (rem: number) =>
  Math.min(LAYERS_MAX_REM, Math.max(LAYERS_MIN_REM, rem))

const initialWidth = (): number => {
  const saved = Number(localSettings.get(KEY))
  if (Number.isFinite(saved) && saved > 0) return clampRem(saved)
  return typeof window !== 'undefined' && window.innerWidth < 1100
    ? LAYERS_MIN_REM
    : 14
}

export const useLayersWidth = (): [number, (rem: number) => void] => {
  const [rem, setRem] = useState(initialWidth)
  const set = (next: number) => {
    const r = Math.round(clampRem(next) * 4) / 4
    setRem(r)
    localSettings.set(KEY, String(r))
  }
  return [rem, set]
}
