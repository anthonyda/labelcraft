/** Grid layout (R29.AC2): an editor guide, never printed. */

/** Steps tried in order, in mm. */
export const GRID_STEPS_MM = [1, 2, 5, 10, 20, 50] as const

/** Smallest gap between dots, in screen pixels. */
export const GRID_MIN_GAP_PX = 8

/** The grid step for a zoom, given screen pixels per mm. */
export const gridStepMm = (screenPxPerMm: number): number =>
  GRID_STEPS_MM.find((s) => s * screenPxPerMm >= GRID_MIN_GAP_PX) ??
  GRID_STEPS_MM[GRID_STEPS_MM.length - 1]

/** Dot positions along one side, in mm from the top-left corner. */
export const gridLineMm = (lengthMm: number, stepMm: number): number[] => {
  const out: number[] = []
  // Small tolerance so an edge that is a whole number of steps gets a dot.
  for (let k = 0; k * stepMm <= lengthMm + 1e-6; k++) out.push(k * stepMm)
  return out
}
