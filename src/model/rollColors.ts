/** Roll colours (spec R28): the paper's colour, shown in the editor only. */

export type RollColor = { id: string; name: string; value: string }

/** `clear` is drawn as a checkerboard (R28.AC2). */
export const CLEAR = 'clear'
export const WHITE = '#ffffff'

export const ROLL_COLORS: RollColor[] = [
  { id: 'white', name: 'White', value: WHITE },
  { id: 'cream', name: 'Cream', value: '#fff4d6' },
  { id: 'yellow', name: 'Yellow', value: '#ffe04a' },
  { id: 'orange', name: 'Orange', value: '#ffad5c' },
  { id: 'pink', name: 'Pink', value: '#ffb3cc' },
  { id: 'red', name: 'Red', value: '#ff6b6b' },
  { id: 'purple', name: 'Purple', value: '#c7a6ff' },
  { id: 'blue', name: 'Blue', value: '#8fd0ff' },
  { id: 'green', name: 'Green', value: '#9fe3a0' },
  { id: 'grey', name: 'Grey', value: '#d6d9de' },
  { id: 'clear', name: 'Clear', value: CLEAR },
]

const HEX = /^#[0-9a-f]{6}$/

/** R28.AC3: `#rrggbb` (lower case) or `clear`. */
export const isRollColor = (v: unknown): v is string =>
  typeof v === 'string' && (v === CLEAR || HEX.test(v))

/** The label's roll colour; missing = white. */
export const rollColorOf = (label: { color?: string }): string =>
  label.color ?? WHITE

/** The listed swatch for a colour, if any. */
export const rollColorSwatch = (color: string): RollColor | undefined =>
  ROLL_COLORS.find((c) => c.value === color.toLowerCase())
