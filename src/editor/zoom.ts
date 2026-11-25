/**
 * Zoom levels for the editor canvas (R4.AC1, AC8). Zoom is relative to the
 * label's real size: 1 = 100% = one millimetre of label per CSS millimetre.
 */
export const ZOOM_MIN = 0.1
export const ZOOM_MAX = 20
const ZOOM_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 20]
export const ZOOM_EPS = 0.001

/** The editor's zoom: a real-size factor, or fit to the canvas. */
export type Zoom = number | 'fit'

/** CSS px per inch, as browsers define it. */
const CSS_DPI = 96

/** Screen (CSS) px per printer dot at a zoom (R4.AC1). */
export const zoomToScale = (zoom: number, dpi: number): number =>
  (zoom * CSS_DPI) / dpi

/** The zoom that gives a scale (screen px per printer dot). */
export const scaleToZoom = (scale: number, dpi: number): number =>
  (scale * dpi) / CSS_DPI

export const clampZoom = (zoom: number): number =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom))

/** Next zoom step above (dir 1) or below (dir -1) the current zoom. */
export const zoomStep = (zoom: number, dir: 1 | -1): number =>
  dir > 0
    ? (ZOOM_STEPS.find((z) => z > zoom + ZOOM_EPS) ?? ZOOM_MAX)
    : ([...ZOOM_STEPS].reverse().find((z) => z < zoom - ZOOM_EPS) ?? ZOOM_MIN)

/** Parse a typed zoom ("250", "250%", "37,5 %"); undefined if invalid. */
export const parseZoomPercent = (text: string): number | undefined => {
  const n = Number(text.replace('%', '').replace(',', '.').trim())
  return Number.isFinite(n) && n > 0 ? clampZoom(n / 100) : undefined
}

export const formatZoom = (zoom: number): string => `${Math.round(zoom * 100)}%`
