/** Zoom levels for the editor canvas. */
export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 8
const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8]
export const ZOOM_EPS = 0.001

/** Next zoom step above (dir 1) or below (dir -1) the current, possibly pinched, zoom. */
export const zoomStep = (zoom: number, dir: 1 | -1): number =>
  dir > 0
    ? (ZOOM_STEPS.find((z) => z > zoom + ZOOM_EPS) ?? ZOOM_MAX)
    : ([...ZOOM_STEPS].reverse().find((z) => z < zoom - ZOOM_EPS) ?? ZOOM_MIN)
